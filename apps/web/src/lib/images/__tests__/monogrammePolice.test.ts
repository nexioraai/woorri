// ============================================================
// CLIQUET — LE MONOGRAMME NE REND AUCUN TEXTE.
//
// ── TROIS ÉTATS, DEUX CORRECTIONS RATÉES, UNE LEÇON.
//
// Le monogramme demandait `font-family="Helvetica,Arial"`. AUCUNE police n'est
// installée dans le conteneur de production : librsvg dessinait un `tofu`, le
// rectangle vide des glyphes manquants. Mesure en ligne : les icônes de
// `biyaminchine.com` et `alloufshop.com` faisaient 1695 octets CHACUNE, et
// c'étaient LES MÊMES OCTETS. Vingt-quatre boutiques sur vingt-sept n'ont
// aucun logo déposé : toutes servaient ce carré vide.
//
//   ① Police dans `public/`, lue par `process.cwd()`, avec un traçage VÉRIFIÉ
//      dans `route.js.nft.json` → en ligne : toujours 1695 octets.
//   ② Police embarquée en base64 dans le SVG, PROUVÉE localement avec un nom
//      de famille inexistant sur le système → en ligne : toujours 1695 octets.
//
// La seconde preuve était vraie et SANS VALEUR : faite sur macOS, dont le
// librsvg n'est pas celui du conteneur. Un rendu de TEXTE dépend de la pile de
// polices de l'hôte, et aucune astuce ne supprime cette dépendance.
//
// D'où la règle que ces tests tiennent : on ne rend plus de texte du tout. Les
// glyphes sont rastérisés d'avance et COMPOSÉS — de l'image, que `sharp` fait
// partout pareil.
//
// Ces tests ne vérifient donc pas « une lettre apparaît » : c'était vrai en
// local AVEC le défaut, et c'est pour ça qu'il a vécu.
// ============================================================
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { monogrammeSvg, monogrammePng } from '../favicon'
import { GLYPHES } from '../glyphes-monogramme'

describe('CLIQUET — aucune dépendance au rendu de texte', () => {
  it('LE SVG NE CONTIENT NI TEXTE NI NOM DE POLICE', () => {
    const svg = monogrammeSvg('B', '#C41E3A').toString()
    expect(svg).not.toContain('<text')
    expect(svg).not.toContain('font-family')
    expect(svg).not.toContain('@font-face')
  })

  it('le chemin du monogramme ne lit ni disque ni police', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'lib', 'images', 'favicon.ts'), 'utf8')
    expect(source).not.toMatch(/readFileSync|process\.cwd/u)
    // Si quelqu'un rétablit un `<text>` ici, ce test tombe — et c'est le but.
    expect(source).not.toMatch(/<text\s/u)
  })

  it('les 36 glyphes sont embarqués, A–Z et 0–9', () => {
    for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
      expect(GLYPHES[c], `glyphe ${c}`).toBeDefined()
    }
  })

  it('DEUX BOUTIQUES DE MÊME COULEUR N’ONT PLUS LA MÊME ICÔNE', async () => {
    // La mesure qui a révélé le défaut : `biyaminchine` et `alloufshop`
    // partagent `#C41E3A`, et leurs icônes étaient octet pour octet
    // identiques — aucune des deux initiales ne se dessinait.
    const [b, a] = await Promise.all([
      monogrammePng('Biyaminchine', '#C41E3A', 192),
      monogrammePng('AlloufShop', '#C41E3A', 192),
    ])
    expect(Buffer.compare(b, a)).not.toBe(0)
  })

  it('le rendu porte de l’encre, pas un aplat de couleur', async () => {
    const png = await monogrammePng('Biyaminchine', '#C41E3A', 192)
    const { channels } = await sharp(png).greyscale().stats()
    // Un carré uni — le cas du `tofu` — reste sous 10.
    expect(channels[0]!.stdev).toBeGreaterThan(20)
  })

  it('une initiale hors A–Z/0–9 retombe sur un glyphe, jamais sur du vide', async () => {
    const png = await monogrammePng('العربية', '#C41E3A', 192)
    const { channels } = await sharp(png).greyscale().stats()
    expect(channels[0]!.stdev).toBeGreaterThan(20)
  })

  it('la police source et sa licence restent versionnées', () => {
    // La provenance d'une dépendance ne se cache pas dans une chaîne base64.
    expect(readFileSync(join(process.cwd(), 'public', 'polices', 'monogramme.ttf')).length)
      .toBeGreaterThan(10_000)
    expect(readFileSync(join(process.cwd(), 'public', 'polices', 'LICENCE-OFL.txt'), 'utf8'))
      .toContain('SIL Open Font License')
  })
})
