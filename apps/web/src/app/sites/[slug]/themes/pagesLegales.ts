import { supabase } from '@/lib/supabase'
import { PAGES_LEGALES } from './PiedLegal'

// LOT 17 — les pages légales que le site a RÉELLEMENT déclarées, dans
// l'ordre voulu, plus le plan du site (écran du moteur). Lu une fois ici,
// par la gabarit commun ET par l'accueil, pour que le bandeau et le pied de
// page du thème ne puissent pas lister deux choses différentes.
export type LienLegal = { href: string; titre: string }

const PLAN: Record<string, string> = { fr: 'Plan du site', en: 'Site map', ar: 'خريطة الموقع', es: 'Mapa del sitio' }

export async function lirePagesLegales(siteId: string, base: string, lang: string | null | undefined): Promise<LienLegal[]> {
  const { data } = await supabase
    .from('site_pages_public').select('chemin,titre').eq('site_id', siteId)
    .in('chemin', PAGES_LEGALES as unknown as string[])
  const lignes = (data as { chemin: string; titre: string }[] | null) ?? []
  const pages = PAGES_LEGALES
    .map((c) => lignes.find((p) => p.chemin === c))
    .filter((p): p is { chemin: string; titre: string } => !!p)
  // UN SITE SANS PAGE LÉGALE N'A RIEN : les autres sites ne changent pas.
  if (pages.length === 0) return []
  return [
    ...pages.map((p) => ({ href: `${base}/${p.chemin}`, titre: p.titre })),
    { href: `${base}/plan-du-site`, titre: PLAN[(lang ?? 'fr').slice(0, 2)] ?? PLAN.fr },
  ]
}
