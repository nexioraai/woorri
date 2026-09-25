// ============================================================
// CLIQUET — UNE BOUTIQUE NE PORTE JAMAIS L'ENSEIGNE DE SON FOURNISSEUR.
//
// LE DÉFAUT PAYÉ, mesuré en production le 2026-09-23 :
//
//     chanorfie.com/favicon.ico   -> 200, 25 931 octets
//     alloufshop.com/favicon.ico  -> 200, 25 931 octets
//
// 25 931 octets = le favicon de `create-next-app`. Les deux boutiques livrées
// servaient le triangle de Vercel, d'où l'icône générique dans Google.
//
// ET LE PIÈGE D'APRÈS, celui qu'on ne voit qu'en y pensant : la plateforme
// ayant désormais SON logo, la même faille aurait fait servir le « D » de
// Deribfy à ses clients. Un marchand marqué à l'enseigne de son fournisseur est
// un défaut PLUS GRAVE que l'absence d'icône — et il serait passé pour une
// amélioration.
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  construireIco,
  couleurDe,
  encreSur,
  faviconIcoDuSite,
  initialeDe,
  monogrammePng,
} from '../favicon'

describe('initiale du marchand', () => {
  it('prend la première lettre du nom', () => {
    expect(initialeDe('Chanorfie')).toBe('C')
    expect(initialeDe('alloufshop')).toBe('A')
  })

  it('déplie les diacritiques — un accent est un pâté à 16 pixels', () => {
    expect(initialeDe('Ébène Déco')).toBe('E')
    expect(initialeDe('Ångström')).toBe('A')
  })

  it('écarte ce qui n’est ni lettre ni chiffre', () => {
    // Une boutique nommée « ★Shop » doit montrer le S, pas l'étoile : à 16 px
    // un symbole décoratif ne se distingue pas d'un défaut de rendu.
    expect(initialeDe('★Shop')).toBe('S')
    expect(initialeDe('  🌟 Lumière')).toBe('L')
  })

  it('ne rend JAMAIS une chaîne vide — sinon l’icône est un carré muet', () => {
    for (const nom of [null, undefined, '', '   ', '★★★', '!!!']) {
      expect(initialeDe(nom), `nom : ${JSON.stringify(nom)}`).toHaveLength(1)
    }
  })
})

describe('couleur de marque', () => {
  it('accepte une couleur hexadécimale valide', () => {
    expect(couleurDe('#1B9E6B')).toBe('#1B9E6B')
  })

  it('refuse tout le reste — une couleur est une ENTRÉE de marchand', () => {
    // `couleurDe` alimente un attribut SVG : une valeur non validée y entrerait
    // telle quelle. Le repli n'est pas du confort, c'est la fermeture.
    for (const faux of ['rouge', '#GGG', 'red; }</style><script>', '#12345', null, undefined]) {
      expect(couleurDe(faux), `valeur : ${String(faux)}`).toBe('#FA5D1E')
    }
  })
})

describe('lisibilité — l’initiale doit se voir', () => {
  it('encre SOMBRE sur une marque claire, encre CLAIRE sur une marque sombre', () => {
    // Sans ce calcul, une boutique jaune ou beige obtenait une lettre blanche
    // sur fond clair : un carré de couleur sans information.
    expect(encreSur('#FFE000')).toBe('#111111')
    expect(encreSur('#FFFFFF')).toBe('#111111')
    expect(encreSur('#1B2A6B')).toBe('#FFFFFF')
    expect(encreSur('#000000')).toBe('#FFFFFF')
  })
})

describe('images produites', () => {
  it('le PNG est un vrai PNG, à la taille demandée', async () => {
    const png = await monogrammePng('AlloufShop', '#1B9E6B', 192)
    // Signature PNG : une image vide ou une erreur silencieuse ne la porte pas.
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
    // Largeur, gros-boutien, offset 16 du bloc IHDR.
    expect(png.readUInt32BE(16)).toBe(192)
  })

  it('le favicon est un ICO VALIDE portant les tailles que GOOGLE demande', async () => {
    // 16 et 32 sont pour les onglets ; 48, 96 et 144 sont pour Google, dont la
    // documentation exige un carré MULTIPLE de 48 px.
    //
    // L'ICO plafonnait à 48 — la plus petite valeur acceptable, donc la source
    // la plus pauvre qu'on pouvait lui donner. Ce n'était pas un défaut, c'était
    // une occasion manquée : le commerçant regarde cette icône dans sa ligne de
    // résultats, et elle y était reconstruite depuis 48 px.
    const ico = await faviconIcoDuSite('Chanorfie', '#8B2252')
    expect(ico.readUInt16LE(0), 'octets réservés').toBe(0)
    expect(ico.readUInt16LE(2), 'type ICO').toBe(1)

    const n = ico.readUInt16LE(4)
    const tailles = Array.from({ length: n }, (_, i) => ico[6 + i * 16] || 256)
    expect(tailles, 'les cinq tailles servies').toEqual([16, 32, 48, 96, 144])
    // AU MOINS UNE taille multiple de 48 : sans elle, Google écarte l'icône.
    expect(tailles.some((t) => t % 48 === 0 && t >= 48)).toBe(true)
  })

  it('DEUX marchands DIFFÉRENTS n’obtiennent pas la même icône', async () => {
    // Le cœur du cliquet. Si la dérivation se cassait — nom ignoré, couleur
    // ignorée — toutes les boutiques retomberaient sur une icône commune, et
    // le défaut d'origine serait de retour sous une autre forme.
    const a = await faviconIcoDuSite('AlloufShop', '#1B9E6B')
    const b = await faviconIcoDuSite('Chanorfie', '#8B2252')
    expect(a.equals(b)).toBe(false)
  })

  it('AUCUNE icône de marchand ne pèse 25 931 octets', async () => {
    // La taille EXACTE du favicon de `create-next-app` — celle que les deux
    // boutiques servaient. Assertion littérale, volontairement.
    const ico = await faviconIcoDuSite('Boutique', '#FA5D1E')
    expect(ico.length).not.toBe(25_931)
    expect(ico.length).toBeGreaterThan(200)
  })

  it('un nom HOSTILE ne casse pas le document SVG', async () => {
    // Le nom vient du marchand, qui l'écrit lui-même depuis son navigateur.
    // `initialeDe` ne garde qu'une lettre, et elle est échappée : deux
    // barrières, parce qu'une seule se perd au premier remaniement.
    const png = await monogrammePng('<script>alert(1)</script>', '#1B9E6B', 64)
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
  })
})

describe('conteneur ICO', () => {
  it('l’en-tête décrit exactement ce qu’il contient', () => {
    const faux = [
      { taille: 16, donnees: Buffer.alloc(10, 1) },
      { taille: 32, donnees: Buffer.alloc(20, 2) },
    ]
    const ico = construireIco(faux)
    expect(ico.readUInt16LE(4)).toBe(2)
    // Décalage de la première image = en-tête (6) + deux entrées (32).
    expect(ico.readUInt32LE(6 + 12)).toBe(38)
    expect(ico.readUInt32LE(6 + 8)).toBe(10)
    expect(ico.length).toBe(6 + 32 + 30)
  })
})
