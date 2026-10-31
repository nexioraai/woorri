/**
 * EP-305 — LE FAIL-SAFE POINTE VERS LE MOTEUR VIVANT, PAS VERS LE MORT.
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI LA RÈGLE DOIT SUIVRE.
 *
 * L'interrupteur a été écrit le 2026-10-18 avec une règle juste : « le
 * défaut par défaut est le CONNU ». À cette date, le connu était `air` —
 * l'architecture par document, en service depuis août.
 *
 * MESURÉ LE 2026-10-31 : `air` est éteint depuis le 2026-10-30, son dernier
 * tir a ÉCHOUÉ, et toute la production tourne sur `direct` (preuve de
 * comportement : la route directe rend 409 si l'interrupteur n'est pas sur
 * `direct`, et elle a rendu 200). Les cinq juges d'acceptation construits
 * depuis ne vivent QUE sur le chemin direct.
 *
 * La règle n'a pas changé — les FAITS ont changé. « Vers le connu » veut
 * désormais dire « vers direct ». Mesuré avant correction : variable
 * absente, vide, « DIRECT », « dirct » — les quatre tombaient sur le moteur
 * mort. Une faute de casse chez Vercel aurait suffi à renvoyer la
 * production vers une architecture dont le dernier tir a échoué.
 *
 * ── ET L'OPTION 2 N'EST PAS SUPPRIMÉE POUR AUTANT.
 *
 * Consigne du propriétaire : elle reste en place, inerte. Seule la valeur
 * exacte `air` l'atteint — c'est désormais ELLE qui demande une intention
 * explicite, et c'est le sens de cette bascule.
 */
import { describe, expect, it } from 'vitest'
import { moteurChoisi } from '../interrupteur-moteur'

describe('EP-305 · le défaut tombe sur le moteur vivant', () => {
  it('① LES QUATRE FAUTES MESURÉES TOMBENT SUR « direct »', () => {
    for (const fautif of [undefined, '', '   ', 'DIRECT', 'dirct', 'v3', 'true']) {
      expect(moteurChoisi(fautif), `« ${String(fautif)} » renvoie encore au moteur mort`).toBe(
        'direct',
      )
    }
  })

  it('② L’OPTION 2 RESTE ATTEIGNABLE, mais sur intention EXACTE', () => {
    // Elle n'est pas supprimée : on remet l'interrupteur et rien n'a bougé.
    expect(moteurChoisi('air')).toBe('air')
    expect(moteurChoisi('AIR'), 'une casse approximative ne doit pas y mener').toBe('direct')
  })

  it('③ LA VALEUR EXPLICITE « direct » CONTINUE DE MARCHER', () => {
    expect(moteurChoisi('direct')).toBe('direct')
  })
})
