/**
 * EP-300 — « S'INSTALLE SUR LE TÉLÉPHONE » EST VRAI, OU NE SE DIT PAS.
 *
 * N2 de l'arbitrage du 2026-10-31. N3 a retiré la promesse native fausse ;
 * ce cliquet tient la promesse VRAIE : toute page publiée porte un manifeste
 * PWA cuit (data:, aucune requête externe — la page reste autonome), ses
 * icônes embarquées, l'affichage standalone et les balises Apple. Et la CSP
 * de publication l'AUTORISE : mesuré bloquant sous default-src 'none'.
 */
import { describe, expect, it } from 'vitest'
import { pageAutonome } from '../boucle-directe'
import { CSP_PAGE_PUBLIEE } from '../publication'

describe('EP-300 · la page publiée est installable', () => {
  const page = pageAutonome('export const a = 1', 'CPA Tchad')

  it('① LE MANIFESTE EST CUIT, STANDALONE, ET PORTE LE NOM DE L’ŒUVRE', () => {
    const m = /<link rel="manifest" href="data:application\/manifest\+json,([^"]+)"/u.exec(page)
    expect(m, 'aucun manifeste cuit dans la page').not.toBeNull()
    const manifeste = JSON.parse(decodeURIComponent(m![1]!)) as {
      name?: string
      display?: string
      icons?: { src?: string; sizes?: string }[]
    }
    expect(manifeste.name).toBe('CPA Tchad')
    expect(manifeste.display).toBe('standalone')
    const tailles = (manifeste.icons ?? []).map((i) => i.sizes)
    expect(tailles).toContain('192x192')
    expect(tailles).toContain('512x512')
    for (const icone of manifeste.icons ?? []) {
      expect(icone.src, 'une icône sortirait de la page — elle doit être embarquée').toMatch(
        /^data:image\/png;base64,/u,
      )
    }
  })

  it('② LES BALISES APPLE SONT LÀ — iOS n’a pas de manifeste', () => {
    expect(page).toContain('apple-mobile-web-app-capable')
    expect(page).toContain('apple-touch-icon')
    expect(page).toContain('<meta name="theme-color"')
  })

  it('③ LA CSP DE PUBLICATION AUTORISE LE MANIFESTE CUIT', () => {
    // default-src 'none' couvre manifest-src quand il n'est pas déclaré :
    // sans cette ligne, le navigateur jette le manifeste et rien ne
    // s'installe — en silence.
    expect(CSP_PAGE_PUBLIEE).toContain('manifest-src data:')
  })

  it('④ LA PAGE NE SORT TOUJOURS PAS SUR LE RÉSEAU — contrôle négatif', () => {
    const chargements = [...page.matchAll(/(?:src|href)="(https?:[^"]+)"/gu)]
    expect(chargements, 'une ressource externe est entrée avec N2').toEqual([])
  })
})
