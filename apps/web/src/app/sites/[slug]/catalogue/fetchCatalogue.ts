import { supabase } from '@/lib/supabase'

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
}

const COLS = 'reference,denomination,famille,forme,dosage,conditionnement,chaine_du_froid,maj_le'
const COLS_FICHE = `${COLS},note`

/** Le site public. Meme lecture legere que les autres surfaces. */
export async function fetchSiteCatalogue(slug: string) {
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
  const { data } = await supabase
    .from('catalogue_produits_public')
    .select(COLS)
    .eq('site_id', siteId)
    .order('ordre', { ascending: true })
    .order('denomination', { ascending: true })
  return (data as ProduitCatalogue[]) ?? []
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
  const { data } = await supabase
    .from('catalogue_produits_public')
    .select(COLS_FICHE)
    .eq('site_id', siteId)
    .eq('reference', reference)
    .maybeSingle()
  return (data as ProduitCatalogue) ?? null
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
  const t = terme.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
  if (!t) return produits
  const plat = (s: string | null) =>
    (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return produits.filter((p) =>
    plat(p.denomination).includes(t) || plat(p.reference).includes(t) || plat(p.forme).includes(t))
}
