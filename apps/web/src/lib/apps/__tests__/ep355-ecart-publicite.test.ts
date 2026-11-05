/**
 * EP-355 · P4 — RENDRE UNE TABLE PUBLIQUE NE SE FAIT PAS EN SILENCE.
 *
 * ── CE QUE M1 VOYAIT, ET CE QU'IL NE VOYAIT PAS.
 *
 * `comparerDeclarations` comparait les tables, les champs, les types,
 * l'unicité, l'obligation et le régime de journal. Pas la publicité —
 * elle n'existait pas. Une modification pouvait donc ouvrir une table à
 * tous les visiteurs du web sans produire le moindre écart.
 *
 * ── ET LA PHRASE ÉTAIT MUETTE, CE QUI EST PIRE.
 *
 * MESURÉ AVANT D'ÉCRIRE : `phraseAvantMigration` ne lisait que
 * `plan.ajouts` et rendait `null` sans eux. Une modification qui n'aurait
 * fait qu'OUVRIR une table n'aurait donc produit AUCUNE phrase — le
 * changement le plus grave du lot, et le seul qui ne se disait pas.
 *
 * ── POURQUOI UN GENRE SÉPARÉ DE `porte-changee`.
 *
 * Mécaniquement les deux se ressemblent — rien à migrer, réappliquer les
 * politiques suffit. Mais `porte-changee` dit « ce journal accepte les
 * réécritures » ; celui-ci dit « n'importe qui, sans compte, peut lire
 * cette table ». Les ranger ensemble ferait disparaître un changement de
 * SÉCURITÉ dans une liste de changements de forme.
 */
import { describe, expect, it } from 'vitest'
import { comparerDeclarations, sortDe, type EcartMigration } from '../migration-oeuvre'
import { phraseAvantMigration } from '../phrase-migration'
import type { EntiteDeclaree } from '../entites-declarees'
import type { Instantane } from '../instantane-migration'

const t = (nom: string, x: Record<string, unknown> = {}): EntiteDeclaree =>
  ({
    id: `ent_${nom}`,
    name: nom,
    fields: [{ id: 'fld_titre', name: 'titre', type: 'text', required: true }],
    ...x,
  }) as EntiteDeclaree

const VIDE: Instantane = { lignes: {}, remplies: {}, comptes: 0 }
const AVEC: Instantane = { lignes: { actualite: 2 }, remplies: {}, comptes: 0 }

describe('EP-355 · P4 · l’écart de publicité', () => {
  it('① OUVRIR UNE TABLE PRODUIT UN ÉCART, et il porte le SENS', () => {
    const p = comparerDeclarations([t('actualite')], [t('actualite', { lecturePublique: true })])
    const e = p.ecarts.find((x) => x.genre === 'publicite-changee')
    expect(e, 'ouvrir une table ne produit aucun écart').toBeDefined()
    expect(e?.table).toBe('actualite')
    expect(
      (e as { devientPublique: boolean }).devientPublique,
      'le sens du changement est perdu',
    ).toBe(true)
  })

  it('② ET LA REFERMER AUSSI — l’autre sens n’est pas muet', () => {
    // Des gens lisaient peut-être déjà cette page. Elle va cesser de
    // répondre, et le taire ferait chercher une panne.
    const p = comparerDeclarations([t('actualite', { lecturePublique: true })], [t('actualite')])
    const e = p.ecarts.find((x) => x.genre === 'publicite-changee')
    expect(e, 'refermer une table ne produit aucun écart').toBeDefined()
    expect((e as { devientPublique: boolean }).devientPublique).toBe(false)
  })

  it('③ IL N’ARRÊTE PAS LA MIGRATION, MAIS IL SE DIT', () => {
    // `sansEffet` veut dire « rien à faire en base » — les politiques font
    // `drop policy if exists` avant `create policy`, donc les réappliquer
    // suffit. Il ne veut PAS dire « sans importance ».
    const e: EcartMigration = { genre: 'publicite-changee', table: 'actualite', devientPublique: true }
    expect(sortDe(e), 'un changement de publicité arrête la migration').toBe('sansEffet')
    const p = comparerDeclarations([t('actualite')], [t('actualite', { lecturePublique: true })])
    expect(p.peutAvancer, 'une ouverture bloque la modification').toBe(true)
    expect(p.sansEffet.some((x) => x.genre === 'publicite-changee'), 'l’écart n’est pas rangé').toBe(
      true,
    )
  })

  it('④ LA PHRASE LE DIT, EN PREMIER, ET SANS AUCUN AUTRE GESTE', () => {
    // ── LE DÉFAUT MESURÉ : AUCUNE PHRASE DU TOUT.
    //
    // Sans ajout, `phraseAvantMigration` rendait `null`. Une modification
    // qui n'ouvrait qu'une table passait donc devant la personne sans un
    // mot.
    const seule = comparerDeclarations(
      [t('actualite')],
      [t('actualite', { lecturePublique: true })],
    )
    const phrase = phraseAvantMigration(seule, VIDE)
    expect(phrase, 'une ouverture seule ne dit toujours rien').not.toBeNull()
    expect(phrase, 'la phrase ne prévient pas').toMatch(/ATTENTION/u)
    expect(phrase, 'la phrase n’est pas compréhensible sans nous').toMatch(
      /lisible PAR TOUT LE MONDE, sans compte/u,
    )
    expect(phrase, 'la table n’est pas nommée').toMatch(/« actualite »/u)
    // ── ET ELLE DIT CE QUI RESTE FERMÉ : sans ça, « publique » se lit
    //    comme « ouverte », et la personne croit son site réécrivable.
    expect(phrase, 'la phrase laisse croire que l’écriture s’ouvre aussi').toMatch(
      /Personne ne pourra y écrire/u,
    )

    // ── ET DEVANT LES AUTRES GESTES. Qui lit « ajoutera une colonne » et
    //    s'arrête là a déjà décidé.
    const melange = comparerDeclarations(
      [t('actualite')],
      [t('actualite', { lecturePublique: true }), t('document')],
    )
    const m = phraseAvantMigration(melange, AVEC) ?? ''
    expect(m.indexOf('ATTENTION'), 'l’avertissement a disparu du mélange').toBeGreaterThanOrEqual(0)
    expect(
      m.indexOf('ATTENTION'),
      'l’avertissement passe APRÈS la liste des ajouts',
    ).toBeLessThan(m.indexOf('ajoutera'))
    // Les deux sont dits : l'un ne chasse pas l'autre.
    expect(m, 'les ajouts ont disparu').toMatch(/nouvelle liste « document »/u)
    expect(m, 'les lignes existantes ne sont plus comptées').toMatch(/2 actualites/u)
  })

  it('⑤ REFERMER SE DIT AUSSI, et pas avec les mots de l’ouverture', () => {
    const p = comparerDeclarations([t('actualite', { lecturePublique: true })], [t('actualite')])
    const phrase = phraseAvantMigration(p, VIDE) ?? ''
    expect(phrase, 'la fermeture ne se dit pas').toMatch(/cessera d’être lisible/u)
    expect(phrase, 'une fermeture est annoncée comme une ouverture').not.toMatch(/ATTENTION/u)
    expect(phrase, 'la conséquence visible n’est pas dite').toMatch(/deviendra vide/u)
  })

  it('⑥ ET RIEN N’EST COMPARÉ SUR UNE ŒUVRE RELUE — sinon N faux écarts', () => {
    // ── LE DÉFAUT DÉJÀ PAYÉ SUR `required`, LE 2026-11-04.
    //
    // `lecturePublique` ne vit PAS dans le schéma : il vit dans les
    // POLITIQUES. Une déclaration reconstruite depuis un SQL de schéma ne
    // le connaît pas. La comparer produirait « cette table devient
    // privée » sur CHAQUE table de CHAQUE œuvre d'avant P1 — un
    // avertissement de sécurité faux, répété, donc bientôt ignoré.
    const relue = comparerDeclarations(
      [t('actualite', { publiciteInconnue: true })],
      [t('actualite', { lecturePublique: true })],
    )
    expect(
      relue.ecarts.filter((x) => x.genre === 'publicite-changee'),
      'une œuvre relue produit un écart de publicité faux',
    ).toEqual([])
    // ── ET L'EXCLUSION SE DIT UNE FOIS. Taire serait cacher ; déclarer
    //    non comparable, c'est dire ce qu'on sait.
    const dit = relue.ecarts.find(
      (x) => x.genre === 'non-comparable' && x.propriete === 'lecture publique',
    )
    expect(dit, 'l’exclusion de la publicité n’est pas déclarée').toBeDefined()
    expect((dit as { raison: string }).raison, 'la raison ne dit pas où vit la propriété').toMatch(
      /politiques/u,
    )
  })
})
