import 'server-only'
// CE QU'UN THÈME `institution` NE PEUT PAS LIRE SEUL (lot 4b, 4c — 2026-11-26).
// Un thème est synchrone : la route lui apporte les rubriques du menu (avec
// leurs sous-pages et leur photo), le bandeau défilant, les chiffres clés,
// l'index de la recherche interne et les programmes en cours. Les réglages
// vivent dans des pages NON publiées (`accueil-bandeau`, `accueil-chiffres`) :
// lues avec le rôle de service, comme l'encre de marque.
//
// LOT 4c — LE PROPRIÉTAIRE EST VÉRIFIÉ, pas supposé. Un cookie d'aperçu ne
// suffit plus : son jeton doit appartenir au PROPRIÉTAIRE du site (lu par le
// service d'authentification). Un visiteur qui poserait son propre jeton ne
// verrait pas les cases « À compléter » d'un autre.
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estProprietaireDuSite } from '@/lib/sites/proprietaireDuSite'
import { jetonDApercu } from '@/lib/lecteurDuSite'
import { couleursRubriques } from '@/lib/sites/institutionVisuel'
import { blocsPourVisiteur, ficheProgramme, nonRempli, videPourVisiteur } from '@/lib/sites/institutionVisiteur'
import { CHEMIN_PROJETS } from '@/lib/sites/squeletteInstitution'
import type { DonneesInstitution, EntreeRecherche, ProgrammeInstitution } from './types'

type Ligne = { chemin: string; parent: string | null; titre: string; chapeau: string | null; corps: string | null; blocs: unknown; ordre: number; menu: boolean; publie: boolean }

const blocsDe = (blocs: unknown): Record<string, unknown>[] => (Array.isArray(blocs) ? (blocs as Record<string, unknown>[]) : [])

const premiereImage = (blocs: unknown): string | null => {
  const b = blocsDe(blocs).find((x) => x?.type === 'image' && typeof x.url === 'string')
  return b ? String(b.url) : null
}

/** Le texte lisible d'une page, pour la recherche : chapeau, corps et chaînes de ses blocs réels. */
function texteDe(p: Ligne): string {
  const morceaux: string[] = [p.chapeau ?? '', p.corps ?? '']
  const visiter = (v: unknown, cle = ''): void => {
    if (typeof v === 'string') { if (!['type', 'url', 'chemin', 'cle', 'parent', 'lien', 'couleur', 'logo', 'photo', 'image', 'ton', 'affichage'].includes(cle)) morceaux.push(v); return }
    if (Array.isArray(v)) { v.forEach((x) => visiter(x)); return }
    if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => visiter(x, k))
  }
  visiter(blocsPourVisiteur(blocsDe(p.blocs)))
  return morceaux.filter((m) => !nonRempli(m)).join(' ').replace(/\s+/gu, ' ').trim().slice(0, 2000)
}

export async function lireDonneesInstitution(siteId: string, primaire: string | null | undefined): Promise<DonneesInstitution> {
  const vide: DonneesInstitution = { rubriques: [], bandeau: [], chiffres: [], proprietaire: false, recherche: [], programmes: [] }
  try {
    const [{ data, error }, proprietaire, jeton] = await Promise.all([
      supabaseAdmin.from('site_pages').select('chemin,parent,titre,chapeau,corps,blocs,ordre,menu,publie').eq('site_id', siteId),
      estProprietaireDuSite(siteId),
      jetonDApercu(),
    ])
    if (error !== null || !Array.isArray(data)) return { ...vide, proprietaire, apercu: jeton !== null }
    const pages = data as Ligne[]
    // UNE PAGE SANS RIEN DE RÉEL N'EST PAS DANS LE MENU DES VISITEURS ;
    // le propriétaire la voit (c'est là qu'il doit écrire).
    const montrable = (p: Ligne) => proprietaire || !videPourVisiteur({ chapeau: p.chapeau, corps: p.corps, blocs: blocsDe(p.blocs) }) || pages.some((e) => e.parent === p.chemin && e.publie && e.menu && !videPourVisiteur({ chapeau: e.chapeau, corps: e.corps, blocs: blocsDe(e.blocs) }))
    const visibles = pages.filter((p) => p.publie && p.menu && montrable(p))
    const racines = visibles.filter((p) => p.parent === null).sort((a, b) => a.ordre - b.ordre || a.titre.localeCompare(b.titre))
    const couleurs = couleursRubriques(primaire, racines.length)
    const rubriques = racines.map((r, i) => {
      const enfants = visibles.filter((p) => p.parent === r.chemin).sort((a, b) => a.ordre - b.ordre)
      return {
        chemin: r.chemin, titre: r.titre, chapeau: nonRempli(r.chapeau) ? null : r.chapeau, couleur: couleurs[i] ?? '#1e4d8c',
        image: premiereImage(r.blocs) ?? enfants.map((e) => premiereImage(e.blocs)).find((u) => u !== null) ?? null,
        enfants: enfants.map((e) => ({ chemin: e.chemin, titre: e.titre })),
      }
    })
    const reglagePage = (chemin: string) => blocsDe(pages.find((x) => x.chemin === chemin)?.blocs)
    const bandeau = reglagePage('accueil-bandeau').filter((b) => b.type === 'liste').flatMap((b) => (Array.isArray(b.items) ? b.items.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []))
    const chiffres = reglagePage('accueil-chiffres').filter((b) => b.type === 'chiffres').flatMap((b) => (Array.isArray(b.items) ? b.items : []))
      .map((x) => ({ valeur: String((x as { valeur?: unknown }).valeur ?? ''), libelle: String((x as { libelle?: unknown }).libelle ?? '') }))
      .filter((x) => x.libelle.trim() !== '')
    // LA RECHERCHE NE TROUVE QUE CE QU'UN VISITEUR PEUT LIRE : pages publiées, texte réel.
    const recherche: EntreeRecherche[] = pages.filter((p) => p.publie && (proprietaire || !videPourVisiteur({ chapeau: p.chapeau, corps: p.corps, blocs: blocsDe(p.blocs) })))
      .map((p) => ({ chemin: p.chemin, titre: p.titre, texte: texteDe(p) }))
    // LES PROGRAMMES EN COURS : les sous-pages PUBLIÉES de « Projets ». Le modèle n'est pas publié.
    const programmes: ProgrammeInstitution[] = pages.filter((p) => p.parent === CHEMIN_PROJETS && p.publie)
      .sort((a, b) => a.ordre - b.ordre || a.titre.localeCompare(b.titre))
      .map((p) => ({ chemin: p.chemin, titre: p.titre, description: nonRempli(p.chapeau) ? null : p.chapeau, image: premiereImage(p.blocs), ...ficheProgramme(blocsDe(p.blocs)) }))
    return { rubriques, bandeau, chiffres, proprietaire, apercu: jeton !== null, recherche, programmes }
  } catch {
    return vide
  }
}
