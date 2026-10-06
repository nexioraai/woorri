// ============================================================
// CLIQUET — LE MONOGRAMME PORTE SA PROPRE POLICE.
//
// ── LE DÉFAUT, MESURÉ EN PRODUCTION LE 2026-10-06.
//
// `monogrammeSvg` demandait `font-family="Helvetica,Arial,sans-serif"`. Sur un
// poste de développement ces polices existent, et la lettre sortait. DANS LE
// CONTENEUR VERCEL, AUCUNE POLICE N'EST INSTALLÉE : librsvg dessinait un
// `tofu`, le rectangle vide des glyphes manquants.
//
// Preuve relevée en ligne : les icônes de `biyaminchine.com` et
// `alloufshop.com` faisaient 1695 octets CHACUNE — et c'étaient LES MÊMES
// OCTETS. Vingt-quatre boutiques sur vingt-sept n'ont aucun logo déposé :
// toutes servaient ce carré vide dans l'onglet et à Google.
//
// Le vrai « logo bizarre » n'était pas celui des marchands. C'était le nôtre.
//
// Ce défaut est INVISIBLE en local — c'est pourquoi il a vécu. Ces tests ne
// vérifient donc pas « une lettre apparaît » (vrai partout, y compris avec le
// défaut) mais que LE DOCUMENT NE DÉPEND D'AUCUNE POLICE DU SYSTÈME.
// ============================================================
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { monogrammeSvg, monogrammePng } from '../favicon'

const POLICE = join(process.cwd(), 'public', 'polices', 'monogramme.ttf')

describe('CLIQUET — le monogramme ne dépend d’aucune police installée', () => {
  it('la police est VERSIONNÉE, avec sa licence', () => {
    expect(existsSync(POLICE), 'public/polices/monogramme.ttf').toBe(true)
    expect(readFileSync(POLICE).length).toBeGreaterThan(10_000)
    expect(
      existsSync(join(process.cwd(), 'public', 'polices', 'LICENCE-OFL.txt')),
      'la licence OFL accompagne la police',
    ).toBe(true)
  })

  it('le SVG EMBARQUE la police, au lieu de la demander au système', () => {
    const svg = monogrammeSvg('B', '#C41E3A').toString()
    expect(svg).toContain('@font-face')
    expect(svg).toContain('data:font/ttf;base64,')
    // La famille demandée doit être CELLE QU'ON FOURNIT. Si le document
    // nommait encore Helvetica, il dépendrait de nouveau du système.
    expect(svg).toMatch(/font-family="DeribfyMonogramme"/)
    expect(svg).not.toContain('Helvetica')
  })

  it('DEUX BOUTIQUES DE MÊME COULEUR N’ONT PLUS LA MÊME ICÔNE', () => {
    // C'est la mesure qui a révélé le défaut : `biyaminchine` et `alloufshop`
    // partagent `#C41E3A`, et leurs icônes étaient octet pour octet
    // identiques — parce qu'aucune des deux initiales ne se dessinait.
    const b = monogrammeSvg('B', '#C41E3A').toString()
    const a = monogrammeSvg('A', '#C41E3A').toString()
    expect(b).not.toBe(a)
  })

  it('le rendu produit bien de l’encre, pas un aplat de couleur', async () => {
    const png = await monogrammePng('Biyaminchine', '#C41E3A', 192)
    const { channels } = await sharp(png).greyscale().stats()
    // Un carré uni — le cas du `tofu` sur fond plein — reste sous 10.
    expect(channels[0]!.stdev).toBeGreaterThan(20)
  })

  it('deux initiales différentes rendent des images différentes', async () => {
    const [b, a] = await Promise.all([
      monogrammePng('Biyaminchine', '#C41E3A', 192),
      monogrammePng('AlloufShop', '#C41E3A', 192),
    ])
    expect(Buffer.compare(b, a)).not.toBe(0)
  })
})
