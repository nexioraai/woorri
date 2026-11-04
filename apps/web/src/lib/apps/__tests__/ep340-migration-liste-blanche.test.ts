/**
 * EP-340 · M2 — LA LISTE DES FORMES ÉMETTABLES EST BLANCHE, PAS NOIRE.
 *
 * ── J'AVAIS PROPOSÉ UNE LISTE NOIRE. LE PROPRIÉTAIRE L'A REFUSÉE.
 *
 * J'avais écrit : « un cliquet qui rend `drop`, `rename` et `alter type`
 * inécrivables ». Trois mots interdits. Sa réponse, avec les contre-cas :
 *
 *     delete from releve               efface des lignes
 *     truncate releve                  vide la table
 *     create or replace view …         change ce que l'application lit
 *     alter table … set not null       échoue ou verrouille sur des
 *                                      données réelles
 *
 *   « Une liste noire sur du SQL engendré par un modèle sera contournée
 *     un jour, et pas par malice — par une tournure à laquelle personne
 *     n'avait pensé. C'est exactement "une garde qui tient en pratique
 *     ne tient pas". »
 *
 * Aucun des quatre n'écrit `drop`, `rename` ni `alter type`. La liste
 * noire les laissait tous passer.
 *
 * ── CE QUE CE CLIQUET MESURE, ET CE QU'IL NE MESURE PAS.
 *
 * Il lit du SQL. Il ne connaît pas l'émetteur et n'a pas à le connaître :
 * un émetteur réécrit reste jugé par lui. C'est « un cliquet qui lit CE
 * QUI PART ne peut pas être trompé », appliqué au geste le plus risqué du
 * produit.
 */
import { describe, expect, it } from 'vitest'
import { emettrePolitiquesSql, emettreSchemaSql } from '@deribfy/compiler'
import {
  emettreMigrationSql,
  instructionsDe,
  verifierMigration,
} from '../migration-sql'
import { comparerDeclarations } from '../migration-oeuvre'
import type { EntiteDeclaree } from '../entites-declarees'

const OEUVRE = '11111111-2222-3333-4444-555555555555'
const RELEVE: EntiteDeclaree = {
  id: 'ent_releve',
  name: 'releve',
  fields: [
    { id: 'fld_date', name: 'date', type: 'date', required: true },
    { id: 'fld_index', name: 'index', type: 'number', required: true },
  ],
}

describe('EP-340 · M2, la liste blanche', () => {
  it('① LES QUATRE DESTRUCTEURS SANS MOT INTERDIT SONT REFUSÉS', () => {
    // Aucun des quatre n'écrit `drop`, `rename` ni `alter type` : ils
    // sont LA raison pour laquelle la liste est blanche.
    for (const sql of [
      'delete from releve;',
      'truncate releve;',
      'create or replace view releve as select 1;',
      'alter table releve alter column date set not null;',
    ]) {
      expect(verifierMigration(sql).ok, `« ${sql} » est émettable`).toBe(false)
    }
  })

  it('② ET LES TROIS QUE LA LISTE NOIRE AURAIT ATTRAPÉS AUSSI', () => {
    for (const sql of [
      'drop table releve;',
      'alter table releve rename to releves;',
      'alter table releve drop column date;',
      'alter table releve alter column date type numeric;',
    ]) {
      expect(verifierMigration(sql).ok, `« ${sql} » est émettable`).toBe(false)
    }
  })

  it('③ UN INDEX UNIQUE EST REFUSÉ, un index simple non', () => {
    // C'est l'arrêt de M1 qui le dit : un index unique posé sur une table
    // qui a déjà des doublons échoue — donc précisément sur des données
    // réelles, donc au pire moment.
    expect(verifierMigration('create unique index if not exists i on releve (date);').ok).toBe(
      false,
    )
    expect(verifierMigration('create index if not exists i on releve (date);').ok).toBe(true)
  })

  it('④ LES MOTIFS SONT ANCRÉS AUX DEUX BOUTS', () => {
    // ── SANS ANCRE, UNE FORME PERMISE SERT DE LAISSEZ-PASSER.
    //
    // `create table if not exists x (…) <n’importe quoi>` satisferait un
    // motif non ancré à droite. Le découpage par instruction protège
    // déjà du `;`, mais une tournure sans `;` passerait.
    expect(
      verifierMigration('create table if not exists x ( id text ) with (autovacuum_enabled=false)')
        .ok,
      'une queue libre après une forme permise passe',
    ).toBe(false)
    expect(
      verifierMigration('vacuum full; create table if not exists x ( id text );').ok,
      'une instruction interdite avant une permise passe',
    ).toBe(false)
  })

  it('⑤ LE DÉCOUPAGE RESPECTE CHAÎNES ET COMMENTAIRES', () => {
    // ── POURQUOI PAS `split(';')`.
    //
    // Un `;` dans une chaîne couperait au mauvais endroit, et la moitié
    // obtenue ne ressemblerait à aucune forme : la garde refuserait du
    // SQL juste. Pire, recoller deux moitiés peut produire une forme qui
    // passe.
    const avecPointVirgule = `create policy p on t for all to authenticated using (x = 'a;b')`
    expect(instructionsDe(`${avecPointVirgule};`), 'une chaîne a été coupée').toHaveLength(1)
    // ET UN COMMENTAIRE NE CACHE RIEN : il est retiré, donc ce qui le
    // suit est jugé.
    expect(
      verifierMigration('-- rien à voir\ndelete from releve;').ok,
      'une instruction cachée derrière un commentaire passe',
    ).toBe(false)
    expect(
      instructionsDe('-- un commentaire; avec un point-virgule\ncreate index if not exists i on t (a);'),
      'un `;` de commentaire a coupé',
    ).toHaveLength(1)
  })

  it('⑥ LE SQL RÉELLEMENT ÉMIS PAR LE DÉPÔT PASSE', () => {
    // ── UNE GARDE ÉTANCHE QUI REFUSE TOUT EST INUTILE.
    //
    // Si le schéma et les politiques du dépôt ne passaient pas leur
    // propre liste, aucune migration ne serait jamais émise — et on ne
    // s'en apercevrait qu'à la première modification réelle.
    const E: EntiteDeclaree[] = [
      RELEVE,
      { id: 'ent_note', name: 'note', appendOnly: true, fields: [{ id: 'fld_t', name: 't', type: 'text', required: false }] },
    ]
    const sql = `${emettreSchemaSql(E)}\n${emettrePolitiquesSql(E, OEUVRE)}`
    const v = verifierMigration(sql)
    expect(v.refus.map((r) => r.instruction), 'le SQL du dépôt est refusé par sa propre liste')
      .toEqual([])
    expect(instructionsDe(sql).length, 'le découpage ne lit plus rien').toBeGreaterThan(10)
  })

  it('⑦ L’ÉMETTEUR SE JUGE LUI-MÊME — fail-closed', () => {
    const enrichi: EntiteDeclaree = {
      ...RELEVE,
      fields: [
        ...RELEVE.fields,
        { id: 'fld_tranche', name: 'tranche', type: 'text', required: true },
      ],
    }
    const plan = comparerDeclarations([RELEVE], [enrichi])
    const m = emettreMigrationSql(plan, [enrichi], OEUVRE)
    expect(m.refus, 'l’émetteur refuse sa propre sortie').toEqual([])
    expect(m.sql, 'la colonne n’est pas ajoutée').toContain(
      'alter table releve add column if not exists tranche',
    )
    // ── JAMAIS `not null`, QUOI QUE LA DÉCLARATION DISE.
    //
    // Le champ ci-dessus est `required: true`. Une colonne obligatoire
    // posée sur des lignes qui existent déjà échoue, ou se remplit d'un
    // défaut que personne n'a choisi.
    expect(m.sql, 'une colonne obligatoire est posée sur des lignes existantes').not.toMatch(
      /not null/u,
    )
    // ET SA PROPRE SORTIE PASSE SA PROPRE LISTE.
    expect(verifierMigration(m.sql).ok).toBe(true)
  })

  it('⑧ UN PLAN QUI S’ARRÊTE N’ÉMET RIEN DU TOUT', () => {
    // M1 arrête, M2 n'émet pas. Émettre « la partie sûre » d'un plan
    // arrêté appliquerait la moitié d'une modification que personne n'a
    // validée.
    const plan = comparerDeclarations([RELEVE], [])
    const m = emettreMigrationSql(plan, [], OEUVRE)
    expect(m.sql, 'un plan arrêté produit quand même du SQL').toBe('')
    expect(m.refus.length, 'un plan arrêté se tait').toBeGreaterThan(0)
  })

  it('⑩ L’AUTO-JUGEMENT SE PROUVE SUR UNE SORTIE QU’IL DOIT REFUSER', () => {
    // ── MON TEST ⑦ NE MORDAIT PAS, ET LA MUTATION L'A DIT.
    //
    // Retirer l'auto-jugement laissait ⑦ VERT : avec un émetteur juste,
    // la vérification ne change rien d'observable. Un contrôle qui ne
    // s'exerce que sur le chemin heureux ne prouve pas une garde — il
    // prouve qu'il n'y avait rien à garder ce jour-là.
    //
    // Le fail-closed protège contre un émetteur FUTUR qui déraperait. On
    // l'exerce donc avec une déclaration malformée — un identifiant qui
    // ne peut pas produire une forme permise.
    const tordu: EntiteDeclaree = {
      id: 'ent_releve',
      name: 'releve',
      fields: [
        { id: 'fld_date', name: 'date', type: 'date', required: true },
        { id: 'fld_a=b', name: 'a=b', type: 'text', required: false },
      ],
    }
    const sain: EntiteDeclaree = { ...tordu, fields: [tordu.fields[0]!] }
    const m = emettreMigrationSql(comparerDeclarations([sain], [tordu]), [tordu], OEUVRE)
    expect(m.sql, 'un SQL que la liste refuse est quand même rendu').toBe('')
    expect(m.refus.length, 'l’émetteur rend une sortie refusée sans le dire').toBeGreaterThan(0)
  })

  it('⑨ ET AUCUNE FORME PERMISE N’EST DESTRUCTRICE, par construction', () => {
    // ── LE CONTRÔLE QUI GARDE LA LISTE ELLE-MÊME.
    //
    // Les huit tests précédents jugent du SQL. Celui-ci juge la LISTE :
    // si quelqu'un y ajoute une forme un jour, ces quatre instructions
    // doivent continuer d'être refusées. C'est le seul contrôle qui
    // survit à l'ajout d'une neuvième forme.
    for (const sql of [
      'delete from t;',
      'truncate t;',
      'drop table t;',
      'update t set a = 1;',
      'alter table t alter column a set not null;',
      'create or replace function f() returns void as $$ begin end $$ language plpgsql;',
      // ── CELUI-CI EST PASSÉ, et c'est ce test qui l'a trouvé.
      //
      // `to <identifiant>` acceptait n'importe quel rôle. `grant all on t
      // to anon` OUVRE la table aux visiteurs non connectés : la forme
      // était « permise » et elle détruisait la porte de l'œuvre. Le rôle
      // est nommé maintenant.
      'grant all on t to anon;',
      'grant select on t to public;',
      'revoke all on t from authenticated;',
    ]) {
      expect(verifierMigration(sql).ok, `une forme permise accepte « ${sql} »`).toBe(false)
    }
  })
})
