// ÉTAPE 2 (2026-11-13) — LA CONFIGURATION CALCULÉE VOYAGE, PAS L'ÉTAT REACT.
//
// MESURÉ (M6, docs/elite-protocol/evidence/generateur-2026-11-12) : la
// configuration reçue par le générateur valait `{}` pour 16 générations sur
// 16 depuis le 2026-11-01. Le corps de la requête `direct` envoyait l'état
// React `configuration`, que plus rien n'écrit depuis 83a7261e (2026-11-04).
//
// Ce que ce fichier verrouille :
//   ① le corps `direct` envoie `opts.config`, jamais l'état nu ;
//   ② L'INVENTAIRE EXÉCUTABLE : chaque champ du corps `direct` vient d'un
//      ARGUMENT de `construire` (ou d'un argument avec repli sur l'état,
//      écrit comme tel). Un champ ajouté sans passer par un argument fait
//      rougir ce test — c'est la classe de défaut des tables (2026-11-04)
//      et de la configuration (2026-11-01), fermée par cliquet.
// Ce que ces cliquets NE VOIENT PAS : la valeur réellement reçue par la
// route. Celle-là se prouve par une génération (rapport, étape 2).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { motifTexte } from './motif-texte'

const ECRAN = readFileSync(join(__dirname, '..', '..', '..', 'components', 'onboarding', 'ConversationApplication.tsx'), 'utf8')

/** Les champs du corps envoyé à /api/generateur/direct, lus dans la source. */
function champsDuCorpsDirect(): Record<string, string> {
  const debut = ECRAN.indexOf("fetch('/api/generateur/direct'")
  expect(debut, 'l’appel à /api/generateur/direct est introuvable').toBeGreaterThan(0)
  const fin = ECRAN.indexOf('signal: avorteur.signal', debut)
  const corps = ECRAN.slice(ECRAN.indexOf('body: JSON.stringify({', debut), fin)
  const champs: Record<string, string> = {}
  for (const ligne of corps.split('\n')) {
    const m = /^\s*([a-zA-Z]+):\s*(.+?),\s*$/u.exec(ligne)
    if (m !== null && !ligne.trim().startsWith('//')) champs[m[1]!] = m[2]!
  }
  return champs
}

describe('étape 2 — la configuration calculée voyage jusqu’au générateur', () => {
  it('① le corps direct envoie opts.config, jamais l’état React nu', () => {
    expect(ECRAN).toMatch(motifTexte('configuration: opts.config ?? {},'))
    // L'ancienne ligne — l'état nu dans le corps — ne doit pas revenir.
    expect(champsDuCorpsDirect().configuration).not.toBe('configuration')
  })

  it('② INVENTAIRE : chaque champ du corps direct vient d’un argument de construire', () => {
    expect(champsDuCorpsDirect()).toEqual({
      demande: 'texte',
      configuration: 'opts.config ?? {}',
      nom: "opts.nom ?? ''",
      // Repli sur l'état ASSUMÉ et écrit : les entités sont passées par tous
      // les appelants vivants (2026-11-04) ; le repli ne sert qu'au chemin
      // des questions, qui ne se déclenche plus.
      entites: 'opts.entites ?? entites',
      lectureBrief: 'opts.lecture',
    })
  })
})
