// ============================================================
// CLIQUET — CHAQUE BOUTIQUE DÉCLARE UN LOGO DE MARQUE.
//
// MESURÉ LE 2026-10-06 sur les cinq boutiques réellement en ligne : la
// propriété `image` du JSON-LD était présente sur les cinq, `logo` sur
// AUCUNE. Google ne confond pas les deux — `image` illustre la page, `logo`
// identifie l'entreprise. Une entité sans `logo` n'a pas de marque.
//
// Pire : pour trois des cinq, cette `image` était une PHOTO PEXELS. La seule
// chose que les moteurs et les aperçus de partage associaient à la boutique
// était donc une banque d'images. C'est ce que le propriétaire décrivait en
// disant que le hero et le logo semblaient liés — ils l'étaient, par
// l'absence du second.
//
// Ces tests tiennent les DEUX cas, parce que 24 sites sur 27 n'avaient aucun
// logo déposé : celui qui en a un, et celui qui n'en a pas.
// ============================================================
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import JsonLd from '../JsonLd'
import type { Site } from '../shared'

const URL_SITE = 'https://chanorfie.com'

const siteDe = (p: Partial<Site> = {}): Site =>
  ({
    id: 'x',
    slug: 'chanorfie-1789998512799',
    name: 'Chanorfie',
    type: 'boutique',
    hero_image: 'https://images.pexels.com/photos/10541665/pexels-photo.jpeg',
    ...p,
  }) as Site

/** Le JSON-LD réellement rendu, relu comme le ferait un moteur. */
const lire = (site: Site): Record<string, unknown> => {
  const html = renderToStaticMarkup(<JsonLd site={site} url={URL_SITE} />)
  const corps = html.replace(/^[\s\S]*?>/u, '').replace(/<\/script>[\s\S]*$/u, '')
  return JSON.parse(corps.replace(/\\u003c/gu, '<')) as Record<string, unknown>
}

describe('CLIQUET — le logo de marque est déclaré', () => {
  it('CONTRÔLE : le hero reste bien dans `image`, il n’a pas été déplacé', () => {
    const d = lire(siteDe())
    expect(d.image).toBe('https://images.pexels.com/photos/10541665/pexels-photo.jpeg')
  })

  it('le logo déposé par le marchand devient le `logo` de la marque', () => {
    const d = lire(siteDe({ logo_url: 'https://exemple.test/logo.png' }))
    expect(d.logo).toBe('https://exemple.test/logo.png')
  })

  it('SANS logo déposé, la marque pointe le monogramme — jamais rien', () => {
    // 24 sites sur 27 étaient dans ce cas : le générateur ne fabrique aucun
    // logo. Un monogramme cohérent vaut mieux que pas de marque du tout.
    const d = lire(siteDe())
    expect(d.logo).toBe(
      'https://chanorfie.com/api/internal/site-icon/chanorfie-1789998512799?t=512&f=png',
    )
  })

  it('LE LOGO N’EST JAMAIS LE HERO — c’était tout le défaut', () => {
    for (const site of [siteDe(), siteDe({ logo_url: 'https://exemple.test/logo.png' })]) {
      const d = lire(site)
      expect(d.logo).not.toBe(d.image)
    }
  })

  it('une URL de site terminée par une barre ne produit pas de double barre', () => {
    const html = renderToStaticMarkup(<JsonLd site={siteDe()} url="https://chanorfie.com/" />)
    expect(html).not.toContain('com//api')
  })
})
