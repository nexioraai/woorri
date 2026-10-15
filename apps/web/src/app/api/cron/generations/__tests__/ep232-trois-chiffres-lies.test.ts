/**
 * EP-232 · LES TROIS CHIFFRES DU DÉCOUPAGE SONT LIÉS, ET RIEN NE LE DISAIT.
 *
 * ── CE QUE J'AI FAILLI REFAIRE.
 *
 * En portant la durée de 800 s à 1 800 s, j'ai d'abord changé `maxDuration`
 * et `budgetTrancheMs` — et laissé `battementPerimeMs` à 900 s.
 *
 * Conséquence : le chien de garde serait devenu PLUS COURT qu'une tranche.
 * Un travailleur parfaitement vivant, en plein appel de 20 minutes, aurait
 * été déclaré mort au bout de 15 — et sa ligne volée par un autre, qui
 * serait reparti de zéro. C'est EXACTEMENT la boucle à vide du 2026-10-15,
 * sauf qu'elle aurait été fabriquée par la correction elle-même.
 *
 * Le fichier portait déjà l'avertissement, écrit par une session
 * précédente : « Il valait 600 s. Avec une tranche qui peut désormais
 * travailler 740 s, il aurait réclamé une tranche VIVANTE en pleine
 * écriture — et j'aurais introduit un défaut pire que celui que je
 * corrige. »
 *
 * Le même piège, deux fois, à deux mois d'intervalle. Un commentaire ne
 * tient pas un invariant : il le raconte. Celui-ci le TIENT.
 *
 * ── L'INVARIANT.
 *
 *   0 < budgetTranche < maxDuration        (on n'ouvre pas un appel qu'on
 *                                           ne pourra pas finir)
 *   battementPerime > budgetTranche        (on ne déclare pas mort un
 *                                           travailleur qui travaille)
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const SOURCE = readFileSync(join(ICI, '..', 'route.ts'), 'utf8')

/** Lit un nombre écrit en JS (`1_700_000`, `800`) dans la source. */
const nombre = (motif: RegExp): number => {
  const m = SOURCE.match(motif)
  if (m?.[1] === undefined) return Number.NaN
  return Number(m[1].replace(/_/gu, ''))
}

const MAX_DURATION_S = nombre(/export const maxDuration = (\d[\d_]*)/u)
const BUDGET_MS = nombre(/budgetTrancheMs:\s*(\d[\d_]*)/u)
const BATTEMENT_MS = nombre(/battementPerimeMs:\s*(\d[\d_]*)/u)

describe('EP-232 · le découpage ne peut plus se contredire', () => {
  it('les trois chiffres sont lisibles dans la route', () => {
    // Si l'un disparaît ou change de forme, ce fichier doit le dire tout de
    // suite — un invariant qu'on ne sait plus lire ne protège plus rien.
    expect(MAX_DURATION_S, 'maxDuration introuvable').toBeGreaterThan(0)
    expect(BUDGET_MS, 'budgetTrancheMs introuvable').toBeGreaterThan(0)
    expect(BATTEMENT_MS, 'battementPerimeMs introuvable').toBeGreaterThan(0)
  })

  it("le budget d une tranche tient DANS la durée de la fonction", () => {
    // Sinon on ouvre un appel que l'hôte tuera avant la fin — et c'est la
    // panne mesurée quatre fois le 2026-10-15.
    expect(
      BUDGET_MS,
      `budget ${String(BUDGET_MS / 1000)} s >= maxDuration ${String(MAX_DURATION_S)} s : ` +
        'la fonction sera tuée en plein appel',
    ).toBeLessThan(MAX_DURATION_S * 1000)
  })

  it('il reste une marge RÉELLE pour écrire avant la coupure', () => {
    // Rendre la main pile à l'échéance ne suffit pas : l'écriture en base
    // vit APRÈS l'appel. Au moins 60 s.
    expect(
      MAX_DURATION_S * 1000 - BUDGET_MS,
      'moins de 60 s entre la fin du budget et la coupure de l hôte',
    ).toBeGreaterThanOrEqual(60_000)
  })

  it("LE CHIEN DE GARDE NE VOLE PAS une tranche vivante", () => {
    // LE CONTRÔLE QUI COMPTE, et le piège que j'ai failli refaire.
    expect(
      BATTEMENT_MS,
      `battement ${String(BATTEMENT_MS / 1000)} s <= budget ${String(BUDGET_MS / 1000)} s : ` +
        'un travailleur VIVANT serait declare mort et sa ligne volee',
    ).toBeGreaterThan(BUDGET_MS)
  })

  it('CONTRÔLE NÉGATIF — l invariant sait reconnaître une configuration fautive', () => {
    // Sans ceci, les contrôles ci-dessus pourraient passer sur n'importe
    // quels nombres et ne rien prouver du tout.
    const fautif = { max: 800_000, budget: 740_000, battement: 900_000 }
    expect(fautif.battement > fautif.budget, 'la config d hier était saine').toBe(true)
    const casse = { max: 1_800_000, budget: 1_700_000, battement: 900_000 }
    expect(
      casse.battement > casse.budget,
      'une config où le battement est plus court que le budget DOIT être vue comme fautive',
    ).toBe(false)
  })
})
