'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// ============================================================================
// LE CADRE D'UN ORGANIGRAMME EN BOÎTES.
//
// Un organigramme réel est souvent PLUS LARGE que l'écran. Deux gestes, et rien
// d'autre :
//   1. il se RÉDUIT pour tenir, mais jamais sous ZOOM_MIN : en dessous, le
//      texte des boîtes ne se lit plus ; on préfère alors faire glisser ;
//   2. s'il reste plus large que le cadre, il s'OUVRE CENTRÉ : le sommet
//      (conseil, direction) est au milieu, c'est par là qu'on lit.
//
// SANS JAVASCRIPT, le schéma s'affiche quand même, à taille réelle, et se fait
// glisser dans son cadre : ce composant ne fait qu'améliorer.
// ============================================================================

export const ZOOM_MIN = 0.75

export default function CadreAjuste({ children }: { children: ReactNode }) {
  const cadre = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const c = cadre.current
    const contenu = c?.firstElementChild as HTMLElement | null
    if (!c || !contenu) return
    const ajuster = () => {
      contenu.style.zoom = '1'
      const naturel = contenu.scrollWidth
      const dispo = c.clientWidth
      const z = naturel > 0 ? Math.max(ZOOM_MIN, Math.min(1, dispo / naturel)) : 1
      contenu.style.zoom = String(z)
      c.scrollLeft = Math.max(0, (c.scrollWidth - c.clientWidth) / 2)
    }
    ajuster()
    const obs = new ResizeObserver(ajuster)
    obs.observe(c)
    return () => obs.disconnect()
  }, [])

  return <div ref={cadre} className="cadreOrg">{children}</div>
}
