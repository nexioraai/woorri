import { lecteurDuSite } from '@/lib/lecteurDuSite'

// ============================================================
// LOT 6 — LE CATALOGUE PUBLIC.
//
// IL N'Y A NI PRIX NI STOCK, ET CE N'EST PAS UN OUBLI. La table
// `catalogue_produits` n'a AUCUNE colonne de prix ni de disponibilite :
// mesure, PostgREST rend PGRST204 si l'on tente d'en ecrire une. Sur un
// marche d'Etat un prix public ENGAGE, et un stock affiche faux declenche
// des commandes impossibles.
//
// ON NE NOMME JAMAIS LA TABLE, seulement la vue : elle joint
// `sites_public`, donc « produit publie d'un site publie » devient
// syntaxiquement irreproductible ici.
// ============================================================

export type ProduitCatalogue = {
  reference: string
  denomination: string
  famille: string | null
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  chaine_du_froid: boolean
  note: string | null
  maj_le: string | null
  /** CPA, 2026-11-19 — la fiche complète (colonnes de `catalogue_fiche.sql`). */
  description?: string | null
  photo?: string | null
  /** Un ÉTAT en mots (voir `disponibilite.ts`), jamais une quantité. */
  disponibilite?: string | null
}

const COLS_BASE = 'reference,denomination,famille,forme,dosage,conditionnement,chaine_du_froid,maj_le'
const COLS = `${COLS_BASE},photo,disponibilite`
const COLS_FICHE = `${COLS},note,description`

/** Lit avec les colonnes de la fiche complète ; sans elles (SQL pas encore
 *  appliqué), retombe sur les colonnes d'avant plutôt que de vider la page. */
async function avecRepli<T>(lire: (cols: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>, cols: string, repli: string): Promise<T | null> {
  const r = await lire(cols)
  if (r.error && /description|photo|disponibilite/.test(r.error.message ?? '')) return ((await lire(repli)).data as T) ?? null
  return (r.data as T) ?? null
}

/** Le site public. Meme lecture legere que les autres surfaces. */
export async function fetchSiteCatalogue(slug: string) {
  const supabase = await lecteurDuSite()
  const { data } = await supabase
    .from('sites_public')
    .select('id,slug,name,primary_color,lang,custom_domain')
    .eq('slug', slug)
    .maybeSingle()
  return data as { id: string; slug: string; name: string; primary_color: string | null; lang: string | null; custom_domain: string | null } | null
}

/**
 * Le catalogue d'un site, deja ordonne.
 *
 * ORDRE DETERMINISTE : `ordre` puis `denomination`. Un catalogue qui change
 * d'ordre entre deux chargements ne se memorise pas, et l'index
 * `catalogue_site_publie_idx` porte exactement ce tri.
 *
 * Rend `[]` sur une lecture ratee comme sur une absence -- assume : un
 * catalogue partiel vaut mieux qu'une page en erreur, et la section vide
 * le DIT.
 */
export async function fetchCatalogue(siteId: string): Promise<ProduitCatalogue[]> {
  const supabase = await lecteurDuSite()
  const lire = (cols: string) => supabase
    .from('catalogue_produits_public')
    .select(cols)
    .eq('site_id', siteId)
    .order('ordre', { ascending: true })
    .order('denomination', { ascending: true })
  return (await avecRepli<ProduitCatalogue[]>(lire, COLS, COLS_BASE)) ?? []
}

/**
 * Une fiche, par sa reference.
 *
 * `null` couvre INDISTINCTEMENT : site absent, reference absente, produit
 * d'un AUTRE site, produit non publie. L'indistinction est voulue --
 * distinguer « cette reference n'existe pas » de « elle existe mais n'est
 * pas publiee » revelerait un produit en preparation par son code de retour.
 */
export async function fetchFicheProduit(
  siteId: string,
  reference: string,
): Promise<ProduitCatalogue | null> {
  const supabase = await lecteurDuSite()
  const lire = (cols: string) => supabase
    .from('catalogue_produits_public')
    .select(cols)
    .eq('site_id', siteId)
    .eq('reference', reference)
    .maybeSingle()
  return avecRepli<ProduitCatalogue>(lire, COLS_FICHE, `${COLS_BASE},note`)
}

/**
 * Les familles REELLEMENT employees, de la plus fournie a la moins fournie,
 * puis alphabetique pour que deux chargements rendent le MEME ordre.
 *
 * Elles se DEDUISENT, comme la legende des types de marche : une liste de
 * familles ecrite en dur afficherait des rubriques vides, et une rubrique
 * vide est une promesse non tenue.
 */
export function famillesPresentes(produits: ProduitCatalogue[]): { nom: string; nombre: number }[] {
  const n = new Map<string, number>()
  for (const p of produits) {
    const f = (p.famille ?? '').trim()
    if (!f) continue
    n.set(f, (n.get(f) ?? 0) + 1)
  }
  return [...n.entries()]
    .map(([nom, nombre]) => ({ nom, nombre }))
    .sort((a, b) => (b.nombre - a.nombre) || a.nom.localeCompare(b.nom))
}

/** Les produits d'une famille. `null` rend tout le catalogue. */
export function parFamille(produits: ProduitCatalogue[], famille: string | null): ProduitCatalogue[] {
  if (famille === null) return produits
  return produits.filter((p) => (p.famille ?? '').trim() === famille)
}

/** Lit la famille demandee dans l'adresse. Inconnue -> `null`, jamais vide. */
export function lireFamille(brut: unknown, disponibles: string[]): string | null {
  const v = typeof brut === 'string' ? brut : Array.isArray(brut) ? brut[0] : undefined
  return v && disponibles.includes(v) ? v : null
}

/**
 * Cherche dans la denomination, la reference et la forme.
 *
 * INSENSIBLE A LA CASSE ET AUX ACCENTS : « parACETAMOL » et « paracetamol »
 * trouvent « Paracétamol ». Un catalogue qu'on ne trouve qu'en tapant les
 * accents justes n'est pas cherchable dans un pays ou l'on tape vite.
 */
export function chercher(produits: ProduitCatalogue[], terme: string): ProduitCatalogue[] {
  // CPA, 2026-11-19 — une recherche qui PARDONNE (Baymard, secteur médical) :
  // sans accents ni casse, mot par mot, dans la dénomination, la référence,
  // la forme, le dosage et la famille ; et une faute de frappe par mot de
  // cinq lettres ou plus (« paracetemol » trouve « Paracétamol »).
  const plat = (s: string | null | undefined) =>
    (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const mots = plat(terme).split(/[^a-z0-9]+/).filter(Boolean)
  if (mots.length === 0) return produits
  return produits.filter((p) => {
    const champs = plat([p.denomination, p.reference, p.forme, p.dosage, p.famille].join(' '))
    const sesMots = champs.split(/[^a-z0-9]+/).filter(Boolean)
    return mots.every((m) => champs.includes(m) || (m.length >= 5 && sesMots.some((x) => procheDUneLettre(m, x))))
  })
}

/** Les AUTRES présentations de la même molécule (même dénomination, autre
 *  référence) : « les autres dosages », comme les catalogues de référence. */
export function variantesDe(tous: ProduitCatalogue[], p: ProduitCatalogue): ProduitCatalogue[] {
  const cle = (x: ProduitCatalogue) => x.denomination.trim().toLowerCase()
  return tous.filter((x) => x.reference !== p.reference && cle(x) === cle(p))
}

/** Les produits de la MÊME famille (pour « dans la même famille »), au plus `n`. */
export function memeFamille(tous: ProduitCatalogue[], p: ProduitCatalogue, n = 4): ProduitCatalogue[] {
  if (!p.famille) return []
  return tous.filter((x) => x.reference !== p.reference && x.famille === p.famille).slice(0, n)
}

/** Vrai si `a` devient un préfixe de `b` (ou `b` lui-même) en changeant,
 *  ajoutant ou retirant au plus UNE lettre. */
export function procheDUneLettre(a: string, b: string): boolean {
  const cible = b.slice(0, a.length + 1)
  for (const c of [cible, cible.slice(0, a.length), cible.slice(0, Math.max(0, a.length - 1))]) {
    if (distance(a, c) <= 1) return true
  }
  return false
}

function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  }
  return d[a.length][b.length]
}
