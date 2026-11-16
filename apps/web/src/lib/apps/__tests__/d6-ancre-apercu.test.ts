/**
 * D6 (2026-11-16) — UN LIEN #ancre RESTE DANS L'APPLICATION, MÊME DANS L'APERÇU.
 *
 * L'aperçu montre l'œuvre dans une iframe srcdoc : son URL de base est celle
 * de la page Deribfy. `href="#gestion"` visait deribfy.com/…#gestion, que le
 * cadre ne peut pas charger (X-Frame-Options) — « This page couldn't load ».
 *
 * PREUVE NAVIGATEUR (WebKit + Chromium, page réelle de `pageAutonome`) :
 * docs/elite-protocol/evidence/ancre-apercu/preuve-page.mjs.txt — aller et
 * retour verts avec le correctif, rouges sans. Elle tourne hors de la gate
 * (un navigateur coûte ~7 s, plafond de marge 1,67 s) : ce cliquet-ci garde
 * que le correctif est ÉMIS, pas qu'il marche — la preuve le fait.
 */
import { describe, expect, it } from 'vitest'
import { pageAutonome } from '../boucle-directe'
import { motifTexte } from './motif-texte'

describe('D6 · l’ancre dans l’aperçu', () => {
  const page = pageAutonome('document.getElementById("racine").textContent = "x"', 'T')

  it('① la page émise ramène un clic sur un lien #ancre dans le document', () => {
    expect(page).toMatch(motifTexte('closest(\'a[href^="#"]\')'))
    expect(page).toMatch(motifTexte('location.hash=h'))
  })

  it('② seulement dans un cadre srcdoc : une page publiée garde le comportement du navigateur', () => {
    expect(page).toMatch(motifTexte('if(location.protocol!=="about:"'))
  })

  it('③ un lien que l’application gère elle-même (preventDefault) n’est pas repris', () => {
    expect(page).toMatch(motifTexte('e.defaultPrevented'))
  })
})
