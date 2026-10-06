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
import { mesurerAplats } from '@/lib/images/qualiteLogo'
import { monogrammePng, sourceLogoAutorisee } from '@/lib/images/favicon'
import { supabase } from '@/lib/supabase'
import sharp from 'sharp'

// `sharp` est un binaire natif : exécution Node, jamais Edge.
export const runtime = 'nodejs'

/** Au-delà, on réduit : un en-tête n'a jamais besoin de plus. */
const COTE_MAX = 512

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // `sites_public` applique déjà `published = true AND archived_at IS NULL` :
  // une boutique retirée ne continue pas de servir son enseigne.
  const { data: site } = await supabase
    .from('sites_public')
    .select('name, primary_color, logo_url')
    .eq('slug', slug)
    .maybeSingle()
  if (!site) return new Response('Not found', { status: 404 })

  const s = site as { name: string | null; primary_color: string | null; logo_url: string | null }
  // Même garde que l'icône : on ne va chercher que nos propres images. Une
  // adresse venue d'ailleurs ferait de cette route un relais de requêtes.
  if (!sourceLogoAutorisee(s.logo_url, process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return new Response('Not found', { status: 404 })
  }

  const entetes = {
    'Content-Type': 'image/png',
    // Une heure, pas un jour. Un cache long a DÉJÀ fait croire à un marchand
    // que son nouveau logo n'était pas pris en compte — il regardait son
    // en-tête et voyait l'ancien. Voir le commentaire de `site-icon`.
    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
  }

  const rendre = async (): Promise<Buffer> => {
    const rep = await fetch(s.logo_url!)
    if (!rep.ok) throw new Error('logo injoignable')
    const brut = Buffer.from(await rep.arrayBuffer())

    const { dominante, couleurs } = await mesurerAplats(brut)
    if (couleurs > 90 || dominante < 0.3) {
      return monogrammePng(s.name, s.primary_color, 256)
    }

    // `trim` retire la bordure UNIFORME, celle qui fait flotter la marque au
    // milieu de son fond. Il échoue sur une image entièrement plate — d'où le
    // repli, qui n'est pas une précaution de style : une enseigne doit sortir.
    let serre: Buffer
    try {
      serre = await sharp(brut).trim().png().toBuffer()
    } catch {
      serre = await sharp(brut).png().toBuffer()
    }
    const m = await sharp(serre).metadata()
    if ((m.width ?? 0) > COTE_MAX || (m.height ?? 0) > COTE_MAX) {
      return sharp(serre).resize(COTE_MAX, COTE_MAX, { fit: 'inside' }).png().toBuffer()
    }
    return serre
  }

  try {
    return new Response(new Uint8Array(await rendre()), { headers: entetes })
  } catch {
    // Jamais d'en-tête cassé : à défaut de logo lisible, le monogramme.
    return new Response(new Uint8Array(await monogrammePng(s.name, s.primary_color, 256)), {
      headers: entetes,
    })
  }
}
