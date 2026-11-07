import { lireBlocs, type Bloc } from './blocs'
import { supabase } from '@/lib/supabase'

// ============================================================
// LOT 1 -- LA RESOLUTION D'UNE ADRESSE.
//
// Jusqu'ici `[...rest]/page.tsx` contenait `notFound()` : TOUT chemin inconnu
// mourait, et le moteur ne servait que SIX formes d'adresse. Ce module est ce
// qui lui permet d'en servir autant qu'un site en declare.
//
// CLE ANON, ET VUE UNIQUEMENT. `site_pages` ne rend AUCUN privilege a `anon`
// (mesure : 42501) et sa RLS est active sans policy. Tout passe par
// `site_pages_public`, vue en `security_invoker = false` jointe a
// `sites_public`.
//
// L'INVARIANT N'EST PAS ECRIT ICI, ET C'EST VOULU. « page publiee ET site
// publie ET site non archive » vit dans la DEFINITION DE LA VUE. Une
// regression de ce fichier ne peut donc pas servir un brouillon ni la page
// d'un site archive : la base ne les rend pas.
//
// RESOLUTION PAR LE COUPLE (site_id, chemin), JAMAIS PAR LE CHEMIN SEUL.
// L'unicite posee en base est `(site_id, chemin)` : deux acheteurs peuvent
// publier « nos-missions ». Resoudre par le chemin seul servirait la page
// d'un autre locataire sur le domaine du premier.
// ============================================================

/** Ce qu'une page porte. `publie` n'existe pas dans la vue : toute ligne
 *  rendue est publiee par construction. */
export type PageSite = {
  chemin: string
  parent: string | null
  titre: string
  chapeau: string | null
  corps: string | null
  maj_le: string | null
  /** LOT 4 — le corps STRUCTURE. `[]` tant que la colonne n'est pas posee. */
  blocs: Bloc[]
}

/** Le strict necessaire pour le menu -- jamais le corps des pages. */
export type EntreeMenu = {
  chemin: string
  parent: string | null
  titre: string
  ordre: number
}

// Colonnes reellement consommees -- jamais `select('*')`. Une projection large
// ferait transiter des champs que l'ecran n'affiche pas, et un champ qui
// transite sans etre affiche finit par etre affiche sans etre decide.
const COLS_SANS_BLOCS = 'chemin,parent,titre,chapeau,corps,maj_le'
const COLS_PAGE = `${COLS_SANS_BLOCS},blocs`
const COLS_MENU = 'chemin,parent,titre,ordre'

/**
 * Une page, par son chemin. `null` couvre INDISTINCTEMENT : site absent,
 * chemin absent, page d'un AUTRE site, page non publiee, site archive.
 *
 * L'indistinction est voulue : distinguer « cette page n'existe pas » de
 * « elle existe mais n'est pas publiee » revelerait un brouillon par son
 * code de retour.
 */
export async function fetchPage(siteId: string, chemin: string): Promise<PageSite | null> {
  const lire = (cols: string) =>
    supabase
      .from('site_pages_public')
      .select(cols)
      .eq('site_id', siteId)
      .eq('chemin', chemin)
      .maybeSingle()

  let { data, error } = await lire(COLS_PAGE)

  // LOT 4 — LE REPLI EST ETROIT ET IL EST BRUYANT.
  //
  // `42703` = la colonne `blocs` n'est pas (encore) dans la vue. C'est le seul
  // code qui declenche une seconde lecture, et elle rend une page SANS corps
  // structure plutot qu'une page absente. Tout autre code remonte tel quel :
  // un repli large transformerait une panne de lecture en preuve d'absence
  // (GEN-D037), ce qu'on a deja paye une fois.
  //
  // Ce repli disparait quand `site_pages_blocs.sql` est applique partout.
  if (error?.code === '42703') {
    console.warn('[site_pages] colonne `blocs` absente de la vue — page servie sans corps structure')
    ;({ data } = await lire(COLS_SANS_BLOCS))
  }

  if (!data) return null
  const brut = data as unknown as Record<string, unknown>
  return { ...(brut as unknown as PageSite), blocs: lireBlocs(brut.blocs) }
}

/**
 * Les entrees de menu d'un site, deja ordonnees.
 *
 * ORDRE DETERMINISTE : `ordre` puis `titre`. Un menu qui change d'ordre entre
 * deux chargements est un menu qu'on ne peut pas memoriser -- et l'index
 * `site_pages_menu_idx` porte exactement ce tri.
 *
 * Rend `[]` sur une lecture ratee comme sur une absence : c'est assume, et
 * fail-closed -- une panne masque le menu au lieu d'en afficher un faux.
 */
export async function fetchMenu(siteId: string): Promise<EntreeMenu[]> {
  const { data } = await supabase
    .from('site_pages_public')
    .select(COLS_MENU)
    .eq('site_id', siteId)
    .eq('menu', true)
    .order('ordre', { ascending: true })
    .order('titre', { ascending: true })
  return (data as EntreeMenu[]) ?? []
}

/**
 * Le fil d'Ariane d'un chemin, du premier niveau jusqu'au parent direct.
 *
 * IL SE DERIVE DU CHEMIN, PAS D'UNE JOINTURE RECURSIVE. « a/b/c » a pour
 * ancetres « a » et « a/b ». On ne retient que ceux qui existent REELLEMENT
 * et sont publies : un ancetre non publie ne doit pas apparaitre dans un fil
 * d'Ariane public, et surtout pas y devenir un lien mort.
 */
export async function fetchFilDAriane(siteId: string, chemin: string): Promise<EntreeMenu[]> {
  const segments = chemin.split('/')
  if (segments.length < 2) return []
  const ancetres = segments.slice(0, -1).map((_, i) => segments.slice(0, i + 1).join('/'))

  const { data } = await supabase
    .from('site_pages_public')
    .select(COLS_MENU)
    .eq('site_id', siteId)
    .in('chemin', ancetres)
  const trouves = (data as EntreeMenu[]) ?? []
  // L'ordre du fil est celui du CHEMIN, pas celui de la base.
  return ancetres.map((a) => trouves.find((p) => p.chemin === a)).filter(Boolean) as EntreeMenu[]
}

/** Les enfants directs d'une page, pour les cartes d'une page d'entree. */
export async function fetchEnfants(siteId: string, chemin: string): Promise<EntreeMenu[]> {
  const { data } = await supabase
    .from('site_pages_public')
    .select(COLS_MENU)
    .eq('site_id', siteId)
    .eq('parent', chemin)
    .order('ordre', { ascending: true })
    .order('titre', { ascending: true })
  return (data as EntreeMenu[]) ?? []
}
