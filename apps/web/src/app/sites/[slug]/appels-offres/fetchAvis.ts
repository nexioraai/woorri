import { supabase } from '@/lib/supabase'

// ============================================================
// A2 -- LECTURE PUBLIQUE DES AVIS DE MARCHE.
//
// JUMEAU DE `blog/fetchPosts.ts`, ET DELIBEREMENT. Le patron de la maison
// n'est pas recopie par gout : il porte un invariant que ce fichier ne sait
// pas tenir tout seul.
//
// CLE ANON, ET VUE UNIQUEMENT. Ce module n'importe JAMAIS `supabaseAdmin` et
// ne nomme JAMAIS la table `appels_offres` : depuis le 2026-11-06 la table ne
// rend AUCUN privilege a `anon` (mesure : 42501 sur les quatre verbes) et sa
// RLS est active SANS policy. Tout passe par `appels_offres_public`, vue en
// `security_invoker = false` jointe a `sites_public`.
//
// L'INVARIANT DE VISIBILITE N'EST PAS ECRIT ICI, ET C'EST VOULU. « avis
// publie ET site publie ET site non archive » vit dans la DEFINITION DE LA
// VUE -- verifie en base, 21 points sur 21 le 2026-11-06. Une regression de
// ce fichier ne peut donc pas exposer un avis en preparation ni le contenu
// d'un site archive : la base ne les rend pas.
//
// CE N'EST PAS UNE PRECAUTION THEORIQUE. La premiere redaction de ce lot
// donnait `grant select` a `anon` sur la TABLE avec une policy
// `using (publie = true)`. Quatorze controles la declaraient verte. Aucun ne
// regardait le SITE : un avis publie sur un site NON PUBLIE etait lisible par
// n'importe qui -- mesure du 2026-11-06, GEN-D031. Sur un portail d'Etat,
// c'est un motif d'annulation de procedure. Une policy se recopie, donc
// s'oublie ; une vue jointe a `sites_public` HERITE la clause, et comme
// `sites_public` n'expose ni `published` ni `archived_at`, il est
// syntaxiquement impossible de la reecrire en aval.
//
// RESOLUTION PAR LE COUPLE (site_id, reference_slug), JAMAIS PAR LA
// REFERENCE SEULE. L'unicite posee en base est `(site_id, reference_slug)` :
// deux acheteurs publics peuvent numeroter « 001-aono-2025 » la meme annee.
// Resoudre par la reference seule servirait l'avis d'un autre acheteur sur le
// domaine du premier -- et un avis de marche attribue au mauvais acheteur est
// pire qu'une page absente.
//
// `publie` N'EST PAS PROJETEE, ET N'EXISTE MEME PAS DANS LA VUE. Un lecteur
// qui refiltre finit par croire que c'est LUI qui protege.
// ============================================================

/** Le strict necessaire pour brander la page. Jamais d'email prive, jamais d'owner_id. */
/**
 * Une piece du dossier de consultation.
 *
 * `nom` et `url` sont EXIGES en base (CHECK `appels_offres_pieces_chk`) : un
 * lien mort annonce comme un dossier de consultation est pire qu'une absence,
 * parce que le fournisseur croit avoir le dossier et ne le reclame pas.
 */
export type PieceJointe = { nom: string; url: string; format?: string; poids?: string }

export type AvisSite = {
  id: string
  slug: string
  name: string
  slogan: string | null
  about: string | null
  primary_color: string | null
  lang: string | null
  custom_domain: string | null
  contact: { email?: string; phone?: string; address?: string } | null
}

/** LES QUATRE COLONNES DE LA LISTE, ET PAS UNE DE PLUS (loi du lot A2 ①). */
export type AvisCarte = {
  reference: string
  reference_slug: string
  objet: string
  remise_le: string | null
  etat: string
}

/** Les dix-neuf rubriques du detail. */
export type AvisDetail = AvisCarte & {
  description: string | null
  methode: string | null
  methode_detail: string | null
  valeur: number | null
  devise: string | null
  questions_avant: string | null
  ouverture_plis: string | null
  criteres_elim: string | null
  criteres_notes: string | null
  soumission: string | null
  allotissement: string | null
  local_prix_dossier: string | null
  local_caution: string | null
  local_validite_jours: number | null
  canal_officiel_url: string | null
  document_url: string | null
  /** LOT 5b — le dossier de consultation, plusieurs pieces. `[]` si aucune. */
  pieces: PieceJointe[]
  cree_le: string | null
}

// Colonnes reellement consommees -- jamais `select('*')`. Une projection
// large ferait transiter des champs que l'ecran n'affiche pas, et un champ
// qui transite sans etre affiche finit par etre affiche sans etre decide.
//
// UN SEUL GABARIT, JAMAIS UNE CONCATENATION PAR `+`. Le client Supabase type
// le retour depuis le TYPE LITTERAL de la chaine de projection ; une
// concatenation l'efface en `string` et `.select()` rend alors
// `GenericStringError` -- mesure du 2026-11-06, `TS2352`. Le confort de mise
// en page coutait le typage de la requete.
const COLS_LISTE = 'reference,reference_slug,objet,remise_le,etat'
const COLS_DETAIL = `${COLS_LISTE},description,methode,methode_detail,valeur,devise,questions_avant,ouverture_plis,criteres_elim,criteres_notes,soumission,allotissement,local_prix_dossier,local_caution,local_validite_jours,canal_officiel_url,document_url,cree_le,pieces`

/** Resout le site public. `sites_public` applique deja `published = true AND archived_at IS NULL`. */
async function fetchAvisSite(slug: string): Promise<AvisSite | null> {
  const { data } = await supabase
    .from('sites_public')
    .select('id,slug,name,slogan,about,primary_color,lang,custom_domain,contact')
    .eq('slug', slug)
    .maybeSingle()
  return (data as AvisSite) ?? null
}

/**
 * Index des avis d'un site. `null` = le site n'est pas une surface publique.
 *
 * ORDRE : echeance la plus PROCHE d'abord, les avis sans echeance en dernier.
 * Un portail de marches se lit pour repondre a « quand dois-je remettre ».
 * L'index `appels_offres_site_publie_remise_idx` porte exactement cet ordre.
 *
 * CE QUE CET ORDRE NE TRANCHE PAS : le sort des avis dont l'echeance est
 * PASSEE. Les descendre, les retirer, ou les laisser -- c'est le cycle de vie
 * visible, lot A2 (b). Ne pas le decider ici evite de poser deux fois la meme
 * regle a deux endroits.
 */
export async function fetchAvisIndex(
  slug: string
): Promise<{ site: AvisSite; avis: AvisCarte[] } | null> {
  const site = await fetchAvisSite(slug)
  if (!site) return null

  const { data } = await supabase
    .from('appels_offres_public')
    .select(COLS_LISTE)
    .eq('site_id', site.id)
    .order('remise_le', { ascending: true, nullsFirst: false })

  return { site, avis: (data as AvisCarte[]) ?? [] }
}

/**
 * Ne garde que les pieces REELLEMENT utilisables. Une piece a moitie formee
 * n'est pas affichee a moitie : elle est ecartee. Afficher un nom sans
 * adresse, c'est promettre un telechargement qui n'existe pas -- et le
 * fournisseur ne reclame pas un dossier qu'il croit avoir.
 *
 * La base a DEJA refuse les pieces mal formees (CHECK). Ce filtre existe
 * parce qu'une vue peut etre relue par un code plus recent que sa contrainte.
 */
export function lirePieces(brut: unknown): PieceJointe[] {
  if (!Array.isArray(brut)) return []
  const out: PieceJointe[] = []
  for (const e of brut) {
    if (!e || typeof e !== 'object') continue
    const o = e as Record<string, unknown>
    const nom = typeof o.nom === 'string' ? o.nom.trim() : ''
    const url = typeof o.url === 'string' ? o.url.trim() : ''
    if (!nom || !url) continue
    out.push({
      nom, url,
      ...(typeof o.format === 'string' && o.format.trim() ? { format: o.format.trim() } : {}),
      ...(typeof o.poids === 'string' && o.poids.trim() ? { poids: o.poids.trim() } : {}),
    })
  }
  return out
}

/**
 * Un avis. `null` couvre indistinctement : site absent, avis absent, avis
 * d'un AUTRE acheteur, avis en preparation, site archive.
 *
 * L'INDISTINCTION EST VOULUE. Distinguer « cet avis n'existe pas » de « cet
 * avis existe mais n'est pas encore public » dirait a un concurrent qu'une
 * procedure se prepare, et sous quelle reference. Une absence et un refus ne
 * doivent pas se ressembler POUR L'EXPLOITANT ; vis-a-vis du public ils
 * doivent etre indiscernables.
 */
export async function fetchAvis(
  slug: string,
  referenceSlug: string
): Promise<{ site: AvisSite; avis: AvisDetail } | null> {
  const site = await fetchAvisSite(slug)
  if (!site) return null

  const { data } = await supabase
    .from('appels_offres_public')
    .select(COLS_DETAIL)
    .eq('site_id', site.id)
    .eq('reference_slug', referenceSlug)
    .maybeSingle()

  if (!data) return null
  const brut = data as unknown as Record<string, unknown>
  return { site, avis: { ...(brut as unknown as AvisDetail), pieces: lirePieces(brut.pieces) } }
}

/**
 * Avis publies d'un site, pour les surfaces DERIVEES (sitemap, llms.txt).
 *
 * Meme vue, meme filtre `site_id`, meme invariant : ces surfaces ne peuvent
 * donc pas annoncer aux moteurs une adresse que la page publique refuserait
 * de servir -- le defaut « le sitemap publiait ce que la vitrine refuse
 * d'afficher », ferme par le LOT 2 du chantier catalogue.
 */
export async function fetchAvisEntries(
  siteId: string
): Promise<{ reference_slug: string; objet: string; cree_le: string | null }[]> {
  const { data } = await supabase
    .from('appels_offres_public')
    .select('reference_slug,objet,cree_le')
    .eq('site_id', siteId)
    .order('remise_le', { ascending: true, nullsFirst: false })
  return (data as { reference_slug: string; objet: string; cree_le: string | null }[]) ?? []
}
