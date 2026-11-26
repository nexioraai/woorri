import 'server-only'
// CE QU'UN THÈME `institution` NE PEUT PAS LIRE SEUL (lot 4b, 2026-11-26).
// Un thème est synchrone : la route lui apporte les rubriques du menu (avec
// leurs sous-pages et leur photo), le bandeau défilant et les chiffres clés.
// Les deux réglages vivent dans des pages NON publiées (`accueil-bandeau`,
// `accueil-chiffres`) : lues avec le rôle de service, comme l'encre de marque.
import { supabaseAdmin } from '@/lib/supabase-admin'
import { jetonDApercu } from '@/lib/lecteurDuSite'
import { couleursRubriques } from '@/lib/sites/institutionVisuel'
import type { DonneesInstitution } from './types'

type Ligne = { chemin: string; parent: string | null; titre: string; chapeau: string | null; blocs: unknown; ordre: number; menu: boolean; publie: boolean }

const premiereImage = (blocs: unknown): string | null => {
  if (!Array.isArray(blocs)) return null
  const b = blocs.find((x) => (x as { type?: unknown })?.type === 'image' && typeof (x as { url?: unknown }).url === 'string')
  return b ? String((b as { url: string }).url) : null
}

export async function lireDonneesInstitution(siteId: string, primaire: string | null | undefined): Promise<DonneesInstitution> {
  const vide: DonneesInstitution = { rubriques: [], bandeau: [], chiffres: [], proprietaire: false }
  try {
    const { data, error } = await supabaseAdmin.from('site_pages').select('chemin,parent,titre,chapeau,blocs,ordre,menu,publie').eq('site_id', siteId)
    if (error !== null || !Array.isArray(data)) return vide
    const pages = data as Ligne[]
    const visibles = pages.filter((p) => p.publie && p.menu)
    const racines = visibles.filter((p) => p.parent === null).sort((a, b) => a.ordre - b.ordre || a.titre.localeCompare(b.titre))
    const couleurs = couleursRubriques(primaire, racines.length)
    const rubriques = racines.map((r, i) => {
      const enfants = visibles.filter((p) => p.parent === r.chemin).sort((a, b) => a.ordre - b.ordre)
      return {
        chemin: r.chemin, titre: r.titre, chapeau: r.chapeau, couleur: couleurs[i] ?? '#1e4d8c',
        image: premiereImage(r.blocs) ?? enfants.map((e) => premiereImage(e.blocs)).find((u) => u !== null) ?? null,
        enfants: enfants.map((e) => ({ chemin: e.chemin, titre: e.titre })),
      }
    })
    const reglage = (chemin: string) => {
      const p = pages.find((x) => x.chemin === chemin)
      return Array.isArray(p?.blocs) ? (p!.blocs as Record<string, unknown>[]) : []
    }
    const bandeau = reglage('accueil-bandeau').filter((b) => b.type === 'liste').flatMap((b) => (Array.isArray(b.items) ? b.items.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []))
    const chiffres = reglage('accueil-chiffres').filter((b) => b.type === 'chiffres').flatMap((b) => (Array.isArray(b.items) ? b.items : []))
      .map((x) => ({ valeur: String((x as { valeur?: unknown }).valeur ?? ''), libelle: String((x as { libelle?: unknown }).libelle ?? '') }))
      .filter((x) => x.libelle.trim() !== '')
    return { rubriques, bandeau, chiffres, proprietaire: (await jetonDApercu()) !== null }
  } catch {
    return vide
  }
}
