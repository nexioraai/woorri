/**
 * EP-332 · L'ALERTE ÉCRIT D'ABORD, POUSSE ENSUITE.
 *
 * ── LA DEMANDE, DANS LES MOTS DU PROPRIÉTAIRE.
 *
 * « Je dois automatiquement être au courant quand ça ne génère pas. » Il
 * venait de découvrir que son produit était mort EN ESSAYANT DE S'EN
 * SERVIR, le 2026-11-03.
 *
 * Et son addition : « l'alerte ÉCRIT D'ABORD UNE LIGNE, puis pousse la
 * notification. La ligne est la trace, la poussée est le signal. Si
 * Telegram est injoignable — et au Tchad l'accès aux réseaux sociaux a déjà
 * été restreint — rien n'est perdu, et une alerte non remise se voit. »
 *
 * ── POURQUOI CET ORDRE EST LA GARANTIE.
 *
 * L'ordre inverse perdrait l'alerte chaque fois que l'écriture échoue,
 * c'est-à-dire quand la base va mal — le moment où l'on a le plus besoin
 * de savoir.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { texteAlerte } from '../../alertes'
import { lireSource } from './lire-source'

const SRC = lireSource(join(__dirname, '..', '..', 'alertes.ts'))
const SQL = lireSource(join(__dirname, '..', '..', '..', '..', 'supabase', 'sql', 'alertes_generation.sql'))

describe('EP-332 · la ligne d’abord', () => {
  it('① L’ÉCRITURE PRÉCÈDE LA POUSSÉE, dans cet ordre et pas l’autre', () => {
    const iEcrit = SRC.indexOf(".from('alertes_generation').insert")
    const iPousse = SRC.indexOf('api.telegram.org')
    expect(iEcrit, 'l’alerte n’écrit aucune ligne').toBeGreaterThan(0)
    expect(iPousse, 'l’alerte ne pousse rien').toBeGreaterThan(0)
    expect(
      iEcrit < iPousse,
      'la poussée précède l’écriture : une base indisponible perdrait l’alerte',
    ).toBe(true)
  })

  it('② UNE ALERTE NON REMISE SE VOIT — avec son motif', () => {
    expect(SRC, 'la remise n’est pas notée').toMatch(/remise_erreur/u)
    // LE CANAL ABSENT EST UN MOTIF, pas un silence : sans variables, la
    // ligne existe quand même et dit pourquoi elle n'est pas partie.
    expect(SRC, 'un canal non configuré passe sous silence').toMatch(/canal non configuré/u)
    // ET LA TABLE SAIT LES RETROUVER D'UN COUP D'ŒIL.
    expect(SQL, 'aucun index sur les non remises').toMatch(/where remise = false/u)
  })

  it('③ ELLE NE LÈVE JAMAIS — un incident ne doit pas en faire deux', () => {
    // `supabaseAdmin` ne lève PAS sur une erreur d'écriture : il faut lire
    // `error`, sinon l'échec de journalisation serait lui-même invisible.
    expect(SRC, 'le retour d’insertion n’est pas lu').toMatch(/ecrit\.error !== null/u)
    expect((SRC.match(/catch/gu) ?? []).length, 'des chemins peuvent lever').toBeGreaterThanOrEqual(3)
    // UNE ALERTE QUI BLOQUE EST UNE ALERTE QUI AGGRAVE.
    expect(SRC, 'la poussée peut bloquer indéfiniment').toMatch(/AbortSignal\.timeout/u)
  })

  it('④ LE TEXTE POUSSÉ PORTE DE QUOI AGIR', () => {
    const t = texteAlerte({
      sujet: 'boutique',
      sujetId: 'la-boutika-123',
      ownerEmail: 'client@exemple.td',
      motif: 'travail terminé mais réponse jamais remise',
      etape: 'reponse-perdue',
      coutUsd: 0.0162,
    })
    expect(t, 'l’étape manque').toMatch(/reponse-perdue/u)
    expect(t, 'l’identifiant manque').toMatch(/la-boutika-123/u)
    expect(t, 'le client manque').toMatch(/client@exemple\.td/u)
    // ── CE QUI A COÛTÉ DE L'ARGENT SE DIT.
    //
    // Un échec APRÈS paiement et un échec avant ne sont pas la même chose :
    // le premier laisse une boutique orpheline, écrite et facturée.
    expect(t, 'le coût n’est pas dit').toMatch(/0\.0162 \$/u)
    // Et rien n'est dit qu'on n'a pas : un champ absent ne produit pas de
    // ligne vide qu'on prendrait pour une donnée manquante.
    const court = texteAlerte({ sujet: 'oeuvre', motif: 'x', etape: 'modele' })
    expect(court.split('\n').length, 'des lignes vides sont poussées').toBe(2)
  })

  it('⑤ « RÉUSSI MAIS JAMAIS RÉCUPÉRÉ » EST ALERTÉ — le cas du 2026-11-03', () => {
    // ── CELUI QU'UNE ALERTE NAÏVE RATE.
    //
    // La boutique a été écrite à 15:18:45 et facturée à 15:18:46 pendant que
    // l'écran montrait « Load failed ». Rien n'avait « échoué » côté
    // serveur : une alerte qui ne guette que les échecs serait restée muette
    // sur le cas qui a fait découvrir la panne.
    const route = lireSource(
      join(__dirname, '..', '..', '..', 'app', 'api', 'chat', 'route.ts'),
    )
    expect(route, 'le départ du client n’est pas détecté').toMatch(/reponse-perdue/u)
    expect(route, 'aucune alerte depuis la route').toMatch(/alerter\(\{/u)
    // ET L'ÉTAPE EST UN MOT NOMMÉ, pas une phrase : on veut pouvoir COMPTER
    // combien de fois ce cas se produit.
    expect(SRC, 'les étapes ne sont pas énumérées').toMatch(/EtapeAlerte/u)
  })
})
