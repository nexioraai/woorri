// LA RÉPONSE « ENSEIGNE » D'UN SITE — partagée par deux routes (lot 4c, 2026-11-26).
//
//   · `/api/internal/site-logo/<slug>` : lecture ANONYME, cache PUBLIC.
//   · `/sites/<slug>/enseigne.png`    : lecture avec le cookie d'aperçu (son
//     chemin est celui du cookie), pour que le PROPRIÉTAIRE voie le logo de son
//     site NON publié. Cache PRIVÉ, jamais partagé : une réponse lue avec son
//     jeton ne doit jamais être resservie à un visiteur par le CDN.
// Le pourquoi du rendu (photo → monogramme, marge serrée) est dans la première.
import { mesurerAplats } from '@/lib/images/qualiteLogo'
import { monogrammePng, sourceLogoAutorisee } from '@/lib/images/favicon'
import sharp from 'sharp'

export type SiteEnseigne = { name: string | null; primary_color: string | null; logo_url: string | null }

/** L'en-tête de cache selon la lecture : public (anonyme) ou privé (aperçu). */
export function cacheEnseigne(portee: 'public' | 'prive'): string {
  return portee === 'public'
    // Une heure, pas un jour. Un cache long a DÉJÀ fait croire à un marchand
    // que son nouveau logo n'était pas pris en compte — voir `site-icon`.
    ? 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    : 'private, no-store'
}

/** Au-delà, on réduit : un en-tête n'a jamais besoin de plus. */
const COTE_MAX = 512

export async function reponseEnseigne(s: SiteEnseigne, portee: 'public' | 'prive'): Promise<Response> {
  // Même garde que l'icône : on ne va chercher que nos propres images. Une
  // adresse venue d'ailleurs ferait de cette route un relais de requêtes.
  if (!sourceLogoAutorisee(s.logo_url, process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return new Response('Not found', { status: 404 })
  }

  const entetes = { 'Content-Type': 'image/png', 'Cache-Control': cacheEnseigne(portee) }

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
