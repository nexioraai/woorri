/**
 * EP-361 · UN JUGE QUI N'EST APPELÉ NULLE PART N'EXISTE PAS.
 *
 * ── CINQ FOIS CETTE SEMAINE, ET LA CINQUIÈME EST LA MIENNE.
 *
 *   `extraction-exigences`  prouvé, jamais appelé
 *   `poserOeuvre`           prouvé, jamais appelé
 *   l'injection de la base  prouvée, jamais appelée
 *   `assurerCompteOeuvre`   prouvé, jamais appelé
 *   `jugerBandeau`          prouvé par 8 mutations, appelé 0 fois
 *
 * Le dernier, je l'ai écrit, prouvé, commité et jamais branché. Les
 * quatre premiers ont été trouvés un par un, par accident, en cherchant
 * autre chose. Ce fichier existe pour qu'il n'y ait pas de sixième.
 *
 * ── CE QU'IL MESURE, ET CE QU'IL PERMET.
 *
 * Tout `juge-*.ts` qui exporte un `jugerXxx` est appelé dans la boucle —
 * ou figure ci-dessous AVEC SA RAISON, et cette raison est écrite DANS
 * son propre fichier, en tête.
 *
 * La seconde moitié compte autant que la première. « Un module qui a
 * l'air prouvé et qui ne protège rien est un piège pour celui qui le
 * lira dans trois mois » : une exemption qui ne vit que dans ce test ne
 * prévient personne. Elle doit être là où on ouvre le fichier.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lireSource } from './lire-source'

const APPS = join(__dirname, '..')
const MARQUE = 'NON BRANCHÉ DANS LA BOUCLE'

/**
 * LES JUGES QUI NE TOURNENT PAS DANS LA BOUCLE, ET POURQUOI.
 *
 * Ajouter une entrée ici est une DÉCISION : elle retire un juge du
 * chemin qui livre. Elle se justifie, et sa justification se lit dans le
 * fichier du juge, pas seulement ici.
 */
const HORS_BOUCLE: Readonly<Record<string, string>> = {
  // ~4,2 s par lancement, plus du double du plafond de marge de la gate.
  // Il tourne dans une étape de CI dédiée et dans un tir à la main.
  'juge-navigateur.ts': 'coût d’un vrai navigateur · tourne en CI et en tir',
  // Limité par construction : il reconnaît les formulations qu'il
  // connaît. Mesuré le 2026-11-05 sur une vraie génération — il n'a pas
  // vu « Mode démonstration — les données ne sont pas persistées ».
  // Le remplaçant est le montage double (avec base / sans base), qui ne
  // nomme aucun mot. Le brancher d'ici là coûterait une heure pour un
  // juge qu'on retire.
  'juge-bandeau.ts': 'limité aux formulations connues · remplacé par le montage double',
}

const juges = (): { fichier: string; fonctions: string[] }[] =>
  readdirSync(APPS)
    .filter((n) => /^juge-[a-z-]+\.ts$/u.test(n))
    .map((fichier) => ({
      fichier,
      fonctions: [
        ...new Set(
          [...readFileSync(join(APPS, fichier), 'utf8').matchAll(
            /^export (?:async )?function (juger[A-Za-z]+)/gmu,
          )].map((m) => m[1] ?? ''),
        ),
      ].filter((f) => f !== ''),
    }))
    .filter((j) => j.fonctions.length > 0)

describe('EP-361 · aucun juge sans appelant', () => {
  /**
   * LE CORPS DE LA BOUCLE, SANS SES IMPORTS — et les deux précautions
   * comptent.
   *
   * SANS COMMENTAIRES : une assertion satisfaite par de la prose est la
   * famille des neuf faux verts du 2026-11-02.
   *
   * SANS IMPORTS : sinon la ligne `import { jugerBandeau } …` suffirait
   * à déclarer le juge « appelé », et ce test dirait l'inverse de ce
   * qu'il mesure.
   */
  const boucle = (): string =>
    lireSource(join(APPS, 'boucle-directe.ts')).replace(/^import [\s\S]*?from '[^']+'$/gmu, '')

  it('① L’INSTRUMENT TROUVE DES JUGES — sinon il ne garde rien', () => {
    // « Vert qui ne mesure rien » : une liste vide passerait tout.
    const l = juges()
    expect(l.length, 'aucun juge trouvé : le balayage est cassé').toBeGreaterThanOrEqual(7)
  })

  it('② CHAQUE JUGE EST APPELÉ DANS LA BOUCLE, OU EXEMPTÉ AVEC SA RAISON', () => {
    const src = boucle()
    for (const { fichier, fonctions } of juges()) {
      const raison = HORS_BOUCLE[fichier]
      // ── ON CHERCHE L'IDENTIFIANT, PAS « nom( ».
      //
      // FAUX ROUGE DE MON PREMIER JET : la boucle écrit
      // `(o.juger ?? jugerExecution)(v.code)` — le juge est injectable,
      // donc son nom n'est pas collé à une parenthèse. Mon motif le
      // déclarait « jamais appelé » sur du code juste.
      const appele = fonctions.some((f) => new RegExp(`\\b${f}\\b`, 'u').test(src))
      if (raison !== undefined) {
        expect(
          appele,
          `« ${fichier} » est exempté ET appelé : retirez-le de HORS_BOUCLE`,
        ).toBe(false)
        continue
      }
      expect(
        appele,
        `« ${fichier} » exporte ${fonctions.join(', ')} et n’est appelé NULLE PART ` +
          'dans la boucle. Branchez-le, ou inscrivez-le dans HORS_BOUCLE avec sa raison.',
      ).toBe(true)
    }
  })

  it('③ UNE EXEMPTION SE LIT DANS LE FICHIER DU JUGE, pas seulement ici', () => {
    // ── LA MOITIÉ QUI COMPTE.
    //
    // Une exemption qui ne vit que dans ce test ne prévient personne.
    // Celui qui ouvre `juge-bandeau.ts` dans trois mois doit voir, en
    // tête, qu'il ne protège rien aujourd'hui.
    for (const [fichier, raison] of Object.entries(HORS_BOUCLE)) {
      expect(raison.trim().length, `« ${fichier} » est exempté sans raison`).toBeGreaterThan(20)
      const brut = readFileSync(join(APPS, fichier), 'utf8')
      expect(
        brut,
        `« ${fichier} » ne prévient pas son lecteur : il manque « ${MARQUE} » en tête`,
      ).toContain(MARQUE)
    }
  })

  it('④ ET L’EXEMPTION NE COUVRE QUE CE QUI EXISTE', () => {
    // Une entrée qui ne désigne plus aucun fichier laisserait croire
    // qu'on a pensé à un cas qui n'existe plus.
    const presents = new Set(juges().map((j) => j.fichier))
    for (const fichier of Object.keys(HORS_BOUCLE)) {
      expect(presents.has(fichier), `« ${fichier} » est exempté et n’existe plus`).toBe(true)
    }
  })
})
