/**
 * EP-227 · LE TÉLÉCHARGEMENT DOIT MARCHER SUR SAFARI, DONC SUR IPHONE.
 *
 * ── SIGNALÉ PAR LE PROPRIÉTAIRE : « j'arrive pas à télécharger, sur mon
 * iPhone ».
 *
 * Le code faisait, à la ligne :
 *
 *     a.click();
 *     URL.revokeObjectURL(url);
 *
 * Safari démarre le téléchargement de manière ASYNCHRONE. Révoquer à la
 * ligne suivante détruit l'objet AVANT qu'il ait commencé à être lu.
 * Chrome tolère — il a déjà saisi le blob —, Safari non. Sur iPhone : rien
 * ne se passait, et AUCUNE erreur n'était levée. Un `try/catch` ne pouvait
 * rien voir, et c'est pour ça que le défaut a survécu.
 *
 * Seconde cause, plus discrète : l'ancre n'était jamais insérée dans le
 * document. Chrome accepte un clic sur un élément détaché, Safari l'ignore.
 *
 * ── CE QUE CE CLIQUET TIENT, ET CE QU'IL NE PRÉTEND PAS TENIR.
 *
 * Il ne pilote pas un iPhone — aucun test de ce dépôt ne le fait. Il tient
 * la seule chose vérifiable sans appareil : que le code ne RETOMBE pas
 * dans les deux formes qui cassent Safari. Un test de rendu ne l'aurait
 * pas vu : jsdom ne télécharge rien, et le défaut est dans l'ORDRE des
 * instructions, pas dans ce qu'elles affichent.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const ECRAN = join(ICI, '..', 'ConversationApplication.tsx')
const source = readFileSync(ECRAN, 'utf8')

describe('EP-227 · le téléchargement survit à Safari', () => {
  it("ne révoque JAMAIS l objet dans la foulée du clic", () => {
    // La forme exacte qui cassait : les deux instructions collées.
    const lignes = source.split('\n')
    const fautives: string[] = []
    for (const [i, l] of lignes.entries()) {
      if (!/\.click\(\)/u.test(l)) continue
      // Les trois lignes qui suivent un clic ne doivent pas révoquer
      // DIRECTEMENT — seulement à l'intérieur d'un délai.
      for (const suivante of lignes.slice(i + 1, i + 4)) {
        if (/revokeObjectURL/u.test(suivante) && !/setTimeout/u.test(suivante)) {
          fautives.push(suivante.trim())
        }
      }
    }
    expect(
      fautives,
      'révoquer juste après le clic détruit le fichier avant que Safari ne le lise',
    ).toEqual([])
  })

  it("révoque quand même — un objet gardé à vie est une fuite", () => {
    // CONTRÔLE DE L'AUTRE CÔTÉ : supprimer la révocation ferait passer le
    // test précédent, et ferait fuir la mémoire à chaque téléchargement.
    expect(source, 'plus aucune révocation : le blob reste en mémoire').toMatch(
      /revokeObjectURL/u,
    )
    const differee = source
      .split('\n')
      .some((l) => /setTimeout/u.test(l) && /revokeObjectURL/u.test(l))
    expect(differee, 'la révocation doit être DIFFÉRÉE, pas supprimée').toBe(true)
  })

  it("insère l ancre dans le document avant de cliquer", () => {
    // Safari ignore un clic sur un élément détaché du document.
    expect(source, "l ancre n est jamais insérée : Safari ignorera le clic").toMatch(
      /appendChild\(a\)/u,
    )
    expect(source, "l ancre doit être retirée après usage").toMatch(/a\.remove\(\)/u)
  })

  it("une SEULE routine de téléchargement, partagée par les deux boutons", () => {
    // Le défaut existait en DEUX exemplaires — chemin synchrone et chemin
    // asynchrone — et corriger l'un aurait laissé l'autre. C'est ainsi que
    // le même bug revient six mois plus tard.
    const creations = (source.match(/createObjectURL/gu) ?? []).length
    expect(
      creations,
      `${String(creations)} créations d objet : la routine doit être unique`,
    ).toBe(1)
  })
})
