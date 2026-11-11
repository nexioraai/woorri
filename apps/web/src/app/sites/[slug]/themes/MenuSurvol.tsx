'use client'

import { useEffect } from 'react'

// ============================================================================
// LE SOUS-MENU S'OUVRE AU SURVOL (demande CPA, 2026-11-11, sur le modèle
// d'anie.td) — sans retirer ce qui marche déjà.
//
// Le menu reste fait de `<details>` natifs (MenuDeclare) : il s'ouvre au clic,
// au clavier, sans JavaScript. Ce composant AJOUTE seulement, et seulement
// sur un appareil qui survole vraiment (souris : `hover: hover` + `pointer:
// fine`) :
//   · survoler une entrée ouvre son sous-menu et referme les autres ;
//   · la quitter le referme après DELAI_MS, le temps de glisser jusqu'au
//     panneau sans qu'il disparaisse sous le curseur ;
//   · un clic de souris sur une entrée déjà ouverte par le survol la laisse
//     ouverte (sinon le clic, réflexe, refermerait ce que le survol a ouvert).
//     Le clavier (Entrée, Espace : `detail === 0`) garde son comportement.
// Sur téléphone et tablette tactile, rien ne change.
// ============================================================================

export const ATTRIBUT_SURVOL = 'data-menu-survol'
const DELAI_MS = 220

export default function MenuSurvol() {
  useEffect(() => {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return
    const menus = [...document.querySelectorAll<HTMLDetailsElement>(`details[${ATTRIBUT_SURVOL}]`)]
      .filter((d) => !d.dataset.survolBranche)
    const nettoyages: (() => void)[] = []
    for (const d of menus) {
      d.dataset.survolBranche = '1'
      let minuteur: ReturnType<typeof setTimeout> | undefined
      const entrer = () => {
        clearTimeout(minuteur)
        document.querySelectorAll<HTMLDetailsElement>(`details[${ATTRIBUT_SURVOL}][open]`).forEach((o) => { if (o !== d) o.open = false })
        d.open = true
      }
      const sortir = () => { clearTimeout(minuteur); minuteur = setTimeout(() => { d.open = false }, DELAI_MS) }
      const resume = d.querySelector('summary')
      const cliquer = (ev: MouseEvent) => { if (ev.detail > 0 && d.open) ev.preventDefault() }
      d.addEventListener('mouseenter', entrer)
      d.addEventListener('mouseleave', sortir)
      resume?.addEventListener('click', cliquer)
      nettoyages.push(() => {
        clearTimeout(minuteur)
        d.removeEventListener('mouseenter', entrer)
        d.removeEventListener('mouseleave', sortir)
        resume?.removeEventListener('click', cliquer)
        delete d.dataset.survolBranche
      })
    }
    return () => nettoyages.forEach((f) => f())
  }, [])
  return null
}
