import 'server-only'
/**
 * L'ICÔNE D'UNE APPLI : son INITIALE, en blanc, sur SA couleur (2026-11-22).
 *
 * Aucun service externe : `next/og` (livré avec Next) dessine le PNG à la
 * demande, avec sa police intégrée. La couleur vient de l'apparence de
 * l'appli, déjà refusée si le blanc n'y est pas lisible (contraste ≥ 4,5:1,
 * apparence.ts) — l'initiale blanche reste donc lisible.
 *
 *   · 192 et 512 « any » : carré aux coins arrondis, initiale grande ;
 *   · 512 « maskable » : fond PLEIN jusqu'aux bords (le téléphone découpe
 *     sa forme), initiale dans la zone sûre — le cercle central de 40 % du
 *     côté (spécification W3C des icônes maskable).
 */
import { ImageResponse } from 'next/og'
import { createElement } from 'react'
import type { FormeIcone, IdentitePwa } from './pwa'

/** Le côté, en pixels, et la taille de l'initiale, en part du côté. */
export function geometrieIcone(forme: FormeIcone): { readonly cote: number; readonly lettre: number; readonly arrondi: number } {
  if (forme === 'maskable') return { cote: 512, lettre: 0.34, arrondi: 0 }
  return { cote: forme, lettre: 0.56, arrondi: 0.22 }
}

export function iconeAppli(id: IdentitePwa, forme: FormeIcone): ImageResponse {
  const g = geometrieIcone(forme)
  return new ImageResponse(
    createElement('div', {
      style: {
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: id.couleur, color: '#ffffff', fontSize: Math.round(g.cote * g.lettre), fontWeight: 700,
        borderRadius: Math.round(g.cote * g.arrondi),
      },
    }, id.initiale),
    // Une couleur changée se voit dans l'heure ; l'icône n'est pas un secret.
    { width: g.cote, height: g.cote, headers: { 'Cache-Control': 'public, max-age=3600' } },
  )
}
