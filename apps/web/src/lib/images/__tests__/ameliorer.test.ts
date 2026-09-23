// ============================================================
// CLIQUET — L'AMÉLIORATION AMÉLIORE, ET ELLE NE TRAHIT PAS L'ARTICLE.
//
// Une chaîne d'embellissement est facile à écrire et difficile à juger : elle
// rend TOUJOURS une image, et cette image a TOUJOURS l'air différente. Sans
// mesure, « ça marche » ne veut rien dire.
//
// Ces tests mesurent donc les DEUX sens :
//   · une photo sous-exposée doit remonter VERS la cible ;
//   · une photo déjà correcte doit rester PROCHE d'elle-même — une correction
//     violente sur une bonne photo trahit l'article, et c'est pire que de ne
//     rien faire.
// ============================================================
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ameliorer, recadrer, statistiques } from '../ameliorer'

/** Photo de référence : contenu riche, exposition et couleurs correctes. */
async function correcte(): Promise<Buffer> {
  return sharp({
    create: {
      width: 900,
      height: 900,
      channels: 3,
      background: { r: 128, g: 126, b: 124 },
      noise: { type: 'gaussian', mean: 132, sigma: 38 },
    },
  })
    .jpeg({ quality: 92 })
    .toBuffer()
}

/** La même, abîmée comme le sont les photos prises en boutique. */
async function sousExposee(): Promise<Buffer> {
  return sharp(await correcte()).linear(0.45, 0).jpeg({ quality: 90 }).toBuffer()
}

/** La même, tirée vers le jaune — ampoule à incandescence ou néon. */
async function dominanteJaune(): Promise<Buffer> {
  return sharp(await correcte())
    .recomb([
      [1.25, 0, 0],
      [0, 1.1, 0],
      [0, 0, 0.6],
    ])
    .jpeg({ quality: 90 })
    .toBuffer()
}

describe('exposition', () => {
  it('une photo SOUS-EXPOSÉE remonte vers la cible', async () => {
    const avant = await sousExposee()
    const stAvant = await statistiques(avant)
    expect(stAvant.luminosite, 'le fixture doit être sombre').toBeLessThan(80)

    const { donnees, appliquees } = await ameliorer(avant)
    const stApres = await statistiques(donnees)

    expect(stApres.luminosite, 'la photo n’a pas été éclaircie').toBeGreaterThan(stAvant.luminosite)
    expect(appliquees).toContain('éclaircie')
  })

  it('une photo DÉJÀ CORRECTE n’est pas bouleversée', async () => {
    // LE TEST QUI COMPTE VRAIMENT. Une chaîne qui « améliore » tout, y compris
    // ce qui allait bien, dégrade la moitié du catalogue sans que personne ne
    // le voie — chaque photo prise isolément a l'air « retouchée », pas fausse.
    const avant = await correcte()
    const stAvant = await statistiques(avant)
    const { donnees } = await ameliorer(avant)
    const stApres = await statistiques(donnees)

    const derive = Math.abs(stApres.luminosite - stAvant.luminosite)
    expect(derive, `luminosité déplacée de ${derive.toFixed(0)} points`).toBeLessThan(25)
  })

  it('le gain est BORNÉ — une photo presque noire ne devient pas grise', async () => {
    // Sans borne, le gain calculé sur une image très sombre explose : le
    // résultat est une bouillie grise et bruitée, pas une photo claire.
    const tresSombre = await sharp(await correcte()).linear(0.08, 0).jpeg().toBuffer()
    const { donnees } = await ameliorer(tresSombre)
    const st = await statistiques(donnees)
    // Bornée à ×1,6 : elle remonte, sans prétendre retrouver ce qui n'a pas
    // été capté. Une information absente ne se fabrique pas.
    expect(st.luminosite).toBeLessThan(60)
  })
})

describe('balance des blancs', () => {
  it('une dominante de couleur est RÉDUITE', async () => {
    const avant = await dominanteJaune()
    const stAvant = await statistiques(avant)
    const ecartAvant =
      Math.max(stAvant.canaux.r, stAvant.canaux.v, stAvant.canaux.b) -
      Math.min(stAvant.canaux.r, stAvant.canaux.v, stAvant.canaux.b)
    expect(ecartAvant, 'le fixture doit être déséquilibré').toBeGreaterThan(20)

    const { donnees, appliquees } = await ameliorer(avant)
    const stApres = await statistiques(donnees)
    const ecartApres =
      Math.max(stApres.canaux.r, stApres.canaux.v, stApres.canaux.b) -
      Math.min(stApres.canaux.r, stApres.canaux.v, stApres.canaux.b)

    expect(appliquees).toContain('couleurs rééquilibrées')
    expect(ecartApres, 'la dominante n’a pas diminué').toBeLessThan(ecartAvant)
  })

  it('une photo ÉQUILIBRÉE ne subit aucun rééquilibrage', async () => {
    const { appliquees } = await ameliorer(await correcte())
    expect(appliquees).not.toContain('couleurs rééquilibrées')
  })
})

describe('ce que la chaîne RAPPORTE', () => {
  it('elle dit ce qu’elle a fait — jamais une boîte noire', async () => {
    // Le marchand doit pouvoir comprendre pourquoi son image a changé. Sans
    // cela, il ne peut ni faire confiance, ni mieux photographier la prochaine.
    const { appliquees } = await ameliorer(await sousExposee())
    expect(appliquees.length).toBeGreaterThan(0)
    expect(appliquees).toContain('netteté légère')
  })

  it('elle rend une image VALIDE et non vide', async () => {
    const { donnees } = await ameliorer(await sousExposee())
    const m = await sharp(donnees).metadata()
    expect(m.format).toBe('jpeg')
    expect(m.width).toBe(900)
    expect(donnees.length).toBeGreaterThan(1000)
  })

  it('l’ORIGINAL n’est pas modifié', async () => {
    // Toute la promesse faite au marchand tient à cette ligne.
    const avant = await sousExposee()
    const copie = Buffer.from(avant)
    await ameliorer(avant)
    expect(avant.equals(copie)).toBe(true)
  })
})

describe('recadrage intelligent', () => {
  it('rend un CARRÉ, avec des marges autour du sujet', async () => {
    const carre = await recadrer(await correcte(), 800, 0.06)
    const m = await sharp(carre).metadata()
    expect([m.width, m.height]).toEqual([800, 800])
  })

  it('les bords sont BLANCS — c’est la marge, pas du sujet coupé', async () => {
    // Vérifie que la marge existe VRAIMENT : sans elle, ce recadrage ne serait
    // qu'un `object-cover` de plus, c'est-à-dire le défaut qu'on vient de
    // retirer de sept fichiers.
    //
    // ── `extract()` PUIS `toBuffer()`, ET C'EST INDISPENSABLE.
    // `stats()` de `sharp` se calcule sur l'image D'ENTRÉE, pas au bout du
    // pipeline : enchaîner `.extract().stats()` rend les statistiques de
    // l'image ENTIÈRE. Ma première version faisait exactement cela et lisait
    // 168 partout — la moyenne du tout, marge blanche comprise. Le recadrage
    // était correct ; c'est l'INSTRUMENT qui mesurait autre chose.
    const carre = await recadrer(await correcte(), 800, 0.08)
    const coinSeul = await sharp(carre).extract({ left: 2, top: 2, width: 8, height: 8 }).toBuffer()
    const coin = await sharp(coinSeul).stats()
    for (const c of coin.channels) {
      expect(c.mean, 'le coin devrait être blanc — la marge manque').toBeGreaterThan(240)
    }

    // ET LE CENTRE NE DOIT PAS L'ÊTRE : sans cette seconde moitié, une image
    // entièrement blanche passerait le test.
    const centreSeul = await sharp(carre).extract({ left: 380, top: 380, width: 40, height: 40 }).toBuffer()
    const centre = await sharp(centreSeul).stats()
    expect(centre.channels[0]!.mean, 'le centre est blanc : le sujet a disparu').toBeLessThan(220)
  })
})
