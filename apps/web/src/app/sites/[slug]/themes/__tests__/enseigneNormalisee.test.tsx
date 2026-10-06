// ============================================================
// CLIQUET — L'EN-TÊTE NE MONTRE PLUS LE FICHIER BRUT.
//
// MESURÉ LE 2026-10-06 sur deux boutiques en ligne, en-tête `bg-white/70` :
//
//   · `logonemoteurfils.com` affichait UNE PHOTO DE SA DEVANTURE (1504×688)
//     réduite à 79×36 — un timbre-poste où l'on ne distingue rien ;
//   · `chanorfie.com` affichait un logo doré sur fond NOIR, en JPEG, soit un
//     rectangle noir posé dans un en-tête blanc.
//
// L'enseigne passe désormais par `/api/internal/site-logo/<slug>`, qui serre
// la marge uniforme et substitue le monogramme quand le fichier déposé est
// une photo. Ces tests tiennent le CHEMIN, pas le rendu de l'image : le choix
// entre logo et monogramme est mesuré et testé dans `qualiteLogo.test.ts`.
// ============================================================
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import EnseigneDuSite from '../EnseigneDuSite'

describe('CLIQUET — l’enseigne passe par la route normalisée', () => {
  it('avec un slug, la source est la route — jamais le fichier déposé', () => {
    const html = renderToStaticMarkup(
      <EnseigneDuSite nom="Chanorfie" logo="https://stockage.test/logo.jpg" slug="chanorfie-179" />,
    )
    expect(html).toContain('src="/api/internal/site-logo/chanorfie-179"')
    expect(html).not.toContain('stockage.test')
  })

  it('SANS logo déposé, on garde le NOM — on n’appelle pas la route pour rien', () => {
    // 24 boutiques sur 27 sont dans ce cas : pour elles le nom est la bonne
    // réponse, et un appel réseau par page serait payé pour rien.
    const html = renderToStaticMarkup(<EnseigneDuSite nom="Biyamin Chine" slug="biyaminchine-179" />)
    expect(html).not.toContain('site-logo')
    expect(html).toContain('Biyamin Chine')
  })

  it('sans slug, le comportement d’avant survit — aucun appel existant cassé', () => {
    const html = renderToStaticMarkup(
      <EnseigneDuSite nom="Chanorfie" logo="https://stockage.test/logo.jpg" />,
    )
    expect(html).toContain('src="https://stockage.test/logo.jpg"')
  })

  it('le NOM reste l’alternative textuelle — le référencement ne se paie pas', () => {
    const html = renderToStaticMarkup(
      <EnseigneDuSite nom="Chanorfie" logo="https://stockage.test/logo.jpg" slug="chanorfie-179" />,
    )
    expect(html).toContain('alt="Chanorfie"')
  })
})
