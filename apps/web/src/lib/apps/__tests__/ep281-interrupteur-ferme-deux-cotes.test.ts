/**
 * EP-281 — UN INTERRUPTEUR QUI NE FERME QU'UN CÔTÉ N'EST PAS UN INTERRUPTEUR.
 *
 * ── LA RÈGLE, POSÉE PAR LE PROPRIÉTAIRE LE 2026-10-18.
 *
 *   « il faut que un soit accessible depuis interface le temps tester
 *     ce qui est accessible l'autre ne doit pas etre accessible en meme
 *     temps »
 *
 * Elle n'est pas esthétique : treize tirs et 66 $ avaient déjà été dépensés
 * sans pouvoir attribuer un résultat à une architecture après coup.
 *
 * ── CE QUE J'AVAIS FAIT, ET CE QUE J'AVAIS MANQUÉ.
 *
 * J'ai fermé LA PORTE D'ENTRÉE : `/api/generateur/direct` refuse si
 * l'interrupteur n'est pas sur `direct`. J'ai cru l'interrupteur posé.
 *
 * MESURÉ LE 2026-10-19 : cinq routes de l'ancien moteur ne consultaient pas
 * l'interrupteur, et l'écran affichait toujours son panneau de suivi — avec
 * dessus un bouton « Relancer la génération » qui appelle
 * `travailleur.relancer(...)`. Coût mesuré d'une émission AIR : 8,46 $.
 *
 * Le bouton est resté joignable pendant tout l'essai de l'autre
 * architecture. C'est le défaut de la veille à l'identique — boucher UN
 * chemin et déclarer la chose close.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * Non pas que les quatre routes d'aujourd'hui soient gardées — ça, une
 * lecture le dit —, mais que TOUTE route qui dépense le soit. Il les
 * ÉNUMÈRE depuis le disque : une cinquième ajoutée demain sans garde fait
 * rougir, sans que personne ait à y penser.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const GEN = join(__dirname, '..', '..', '..', 'app', 'api', 'generateur')

/** Toutes les routes du générateur, telles qu'elles existent sur le disque. */
const routes = readdirSync(GEN, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(GEN, e.name, 'route.ts')))
  .map((e) => e.name)
  .sort()

const source = (r: string) => readFileSync(join(GEN, r, 'route.ts'), 'utf8')

/**
 * LES ROUTES QUI DÉPENSENT — celles qui lancent ou relancent une émission.
 *
 * Reconnues par ce qu'elles APPELLENT, jamais par une liste écrite à la
 * main : une liste se périme au premier ajout, et le défaut ne se verrait
 * qu'en production, une facture plus tard.
 */
const DEPENSIERES = /travailleur\.|poursuivreEmission|demarrerEmission|appelerFournisseur|relancer\(/u

describe('EP-281 · l’interrupteur ferme les deux côtés', () => {
  it('① L’ÉNUMÉRATION EST RÉELLE — une liste vide passerait aussi', () => {
    expect(routes.length, 'plus aucune route de générateur trouvée').toBeGreaterThanOrEqual(6)
    // Les quatre que le défaut a révélées doivent être vues, sinon ce
    // contrôle ne regarde pas où ça s'est passé.
    for (const r of ['deposer', 'produire', 'comprendre', 'reprendre', 'direct']) {
      expect(routes, `la route « ${r} » n’est plus énumérée`).toContain(r)
    }
  })

  it('② TOUTE ROUTE QUI DÉPENSE CONSULTE L’INTERRUPTEUR', () => {
    // ── CE QUI SE PASSE SANS CELA.
    //
    // La route accepte, appelle, et facture — sur le moteur qu'on a éteint.
    // Le propriétaire paie une architecture qu'il ne testait pas, et le
    // résultat devient inattribuable : exactement ce que l'interrupteur
    // existait pour empêcher.
    const nues = routes.filter((r) => {
      const brut = source(r)
      const code = brut.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
      if (!DEPENSIERES.test(code)) return false
      return !/refusSiPasAir|moteurChoisi/u.test(code)
    })
    expect(
      nues,
      'ces routes lancent une émission sans consulter l’interrupteur : ' +
        'un bouton resté à l’écran suffit à payer le moteur qu’on a éteint',
    ).toEqual([])
  })

  it('③ LE DÉNOMINATEUR EST RÉEL — les dépensières CONNUES sont reconnues', () => {
    // ── UN SEUIL CHIFFRÉ AURAIT ÉTÉ UN MENSONGE COMMODE.
    //
    // Ma première version exigeait « au moins quatre routes dépensières ».
    // La mesure en a trouvé TROIS, et la tentation était d'élargir le motif
    // jusqu'à ce que le compte tombe juste. C'est l'inverse qu'il faut faire :
    // nommer les routes dont on SAIT qu'elles dépensent, et exiger que le
    // motif continue de les voir.
    //
    //   · `deposer`   — `emettreApplication`, `poursuivreEmission`
    //   · `reprendre` — `travailleur.relancer` (émission complète : 8,46 $)
    //   · `direct`    — `appelerFournisseur`
    //
    // Si le motif cesse d'en reconnaître une, le contrôle ② passerait au vert
    // contre du vide. C'est la leçon de « Vert qui ne mesure rien ».
    for (const r of ['deposer', 'reprendre', 'direct']) {
      expect(
        DEPENSIERES.test(source(r)),
        `le motif ne reconnaît plus « ${r} » comme dépensière : le contrôle ② ` +
          'ne mesure plus ce qu’il prétend',
      ).toBe(true)
    }
  })

  it('④ LES ROUTES DE L’ANCIEN MOTEUR SONT GARDÉES, dépense prouvée ou non', () => {
    // ── UNE PRUDENCE ASSUMÉE, ET DITE.
    //
    // `comprendre` et `produire` passent par `premiereIntention`, qui charge
    // `creerIntention` depuis la chaîne AIR. Je ne peux pas PROUVER par la
    // lecture qu'ils appellent un modèle — et je ne l'affirme donc pas.
    //
    // Ils sont gardés quand même : ils appartiennent à l'ancien moteur, et
    // l'interrupteur dit quel MOTEUR sert, pas quelle route facture. Se
    // tromper dans ce sens coûte un refus ; se tromper dans l'autre a déjà
    // coûté 8,46 $ de bouton laissé à l'écran.
    for (const r of ['deposer', 'produire', 'comprendre', 'reprendre']) {
      expect(source(r), `« ${r} » ne consulte pas l’interrupteur`).toContain('refusSiPasAir')
    }
  })

  it('⑤ LE REFUS EST UN 409, ET IL S’EXPLIQUE', () => {
    // Un refus muet renverrait la personne au même « Lecture impossible »
    // qui a déjà coûté deux nuits. Il doit DIRE pourquoi.
    const i = readFileSync(join(__dirname, '..', 'interrupteur-moteur.ts'), 'utf8')
    expect(i, 'le refus symétrique n’existe pas').toContain('export function refusSiPasAir')
    expect(i, 'le refus ne s’explique pas à la personne').toMatch(/n’est pas active|pas active/u)
    for (const r of ['deposer', 'produire', 'comprendre', 'reprendre']) {
      expect(source(r), `« ${r} » ne rend pas un 409`).toMatch(/refusSiPasAir[\s\S]{0,400}409/u)
    }
  })

  it('⑥ L’ÉCRAN NE SUIT PLUS UNE GÉNÉRATION QUI N’EXISTE PAS', () => {
    // ── LE PANNEAU LUI-MÊME ÉTAIT LE PORTEUR DU BOUTON.
    //
    // Fermer les routes empêche la dépense ; ne plus afficher le panneau
    // empêche la personne de croire qu'une génération est en cours alors
    // qu'elle est arrêtée depuis des heures. Les deux sont nécessaires.
    const ecran = readFileSync(
      join(__dirname, '..', '..', '..', 'components', 'onboarding', 'ConversationApplication.tsx'),
      'utf8',
    )
    const code = ecran.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
    const i = code.indexOf('const ASYNC')
    expect(i, 'le drapeau du suivi asynchrone a disparu').toBeGreaterThan(-1)
    // ── LA FENÊTRE S'ARRÊTE AU POINT-VIRGULE, et c'est une correction.
    //
    // Ma première version lisait 260 caractères à partir de `const ASYNC`.
    // La mutation M140 — retirer le moteur de ce calcul — n'a PAS fait
    // rougir : la fenêtre débordait sur la déclaration voisine, qui contient
    // `moteurChoisi` pour une tout autre raison. Le contrôle mesurait le
    // voisinage, pas l'affectation.
    const affectation = code.slice(i, code.indexOf(';', i))
    expect(
      affectation,
      'le suivi asynchrone ne regarde pas quel moteur sert : le panneau de ' +
        'l’ancien moteur reviendra, et son bouton « Relancer » avec lui',
    ).toContain('moteurChoisi')
  })
})
