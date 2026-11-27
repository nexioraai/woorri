/**
 * L'ENSEIGNE D'UNE BOUTIQUE, PRÊTE POUR UN EN-TÊTE.
 *
 * ── CE QUI SE PASSAIT AVANT, ET QUI SE VOYAIT.
 *
 * L'en-tête pointait `logo_url` directement. Mesuré sur les boutiques en
 * ligne le 2026-10-06, en-tête `bg-white/70` :
 *
 *   · `logonemoteurfils.com` — le « logo » déposé est UNE PHOTO DE LA
 *     DEVANTURE, 1504×688. À 36 px de haut, elle donne un timbre-poste de
 *     79×36 où l'on ne distingue rien.
 *   · `chanorfie.com` — logo doré sur fond NOIR, en JPEG. Dans un en-tête
 *     blanc, le visiteur voit un rectangle noir.
 *
 * ── CE QUE CETTE ROUTE REND.
 *
 *   · Pas de logo déposé  → 404, et l'en-tête affiche le NOM. C'est déjà le
 *     comportement d'`EnseigneDuSite`, et il est bon.
 *   · Le logo est une PHOTO → le monogramme. Une initiale nette vaut mieux
 *     qu'une photo illisible ; ce n'est pas écarter le choix du marchand,
 *     c'est refuser de le trahir à une taille où son image ne dit plus rien.
 *     L'éditeur le lui explique, par l'avis `semble_une_photo`.
 *   · Un vrai logo → le logo, DÉBARRASSÉ DE SA MARGE UNIFORME. Un badge
 *     serré se lit comme une marque ; le même badge avec deux centimètres de
 *     fond autour se lit comme un rectangle égaré.
 *
 * Les proportions sont préservées, à la différence de `site-icon` qui doit
 * rendre un carré : un logo en bandeau ne se force pas dans un carré.
 */
import { supabase } from '@/lib/supabase'
import { reponseEnseigne, type SiteEnseigne } from '@/lib/images/reponseEnseigne'

// `sharp` est un binaire natif : exécution Node, jamais Edge.
export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // `sites_public` applique déjà `published = true AND archived_at IS NULL` :
  // une boutique retirée ne continue pas de servir son enseigne. Lecture
  // ANONYME : la réponse est mise en cache publiquement. L'aperçu d'un site
  // non publié passe par `/sites/<slug>/enseigne.png` (lot 4c), jamais par ici.
  const { data: site } = await supabase
    .from('sites_public')
    .select('name, primary_color, logo_url')
    .eq('slug', slug)
    .maybeSingle()
  if (!site) return new Response('Not found', { status: 404 })
  return reponseEnseigne(site as SiteEnseigne, 'public')
}
