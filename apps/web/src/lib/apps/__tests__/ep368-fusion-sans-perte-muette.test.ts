/**
 * EP-368 · UNE FUSION QUI PERD UN CHAMP DÉCLARÉ DOIT LE DIRE.
 *
 * ── CE QUE `fusionnerEntites` JETAIT EN SILENCE, MESURÉ LE 2026-11-06.
 *
 * Elle ne gardait du constructeur que les tables au nom NEUF. Sur un nom
 * déjà vu, elle jetait l'entité ENTIÈRE, et sa signature n'avait aucun
 * canal pour le dire. Éprouvé sur le cas réel d'`asso` :
 *
 *   lecturePublique: true           JETÉ
 *   appendOnly: true  (journal)     JETÉ
 *   UN CHAMP EN PLUS (telephone)    JETÉ — 1 champ au lieu de 2
 *   required passé à false          JETÉ
 *   unique sur un champ             JETÉ
 *
 * ── POURQUOI CE N'EST PAS « UN DÉFAUT DE PLUS ».
 *
 * `asso.deribfy.app` a servi une page publique morte. Deux causes
 * EMPILÉES : la consigne ne demandait pas de déclarer la table publique,
 * ET cette fonction aurait jeté la déclaration si le modèle l'avait faite.
 * Écrire la loi dans la consigne n'aurait donc rien réparé — on aurait
 * déménagé le défaut en croyant le supprimer.
 *
 * ── ET LE PIRE N'EST PAS LA PUBLICITÉ.
 *
 * C'est le champ en plus. Le modèle comprend qu'il lui manque une colonne,
 * la redéclare, la colonne n'existe jamais, et l'application écrit dedans.
 * Aucun juge ne pouvait le voir : la déclaration disparaissait avant eux.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fusionnerEntites } from '../declaration-en-route'
import { lecturePubliqueDe, type EntiteDeclaree } from '../entites-declarees'
import { motifTexte } from './motif-texte'

const champ = (n: string, extra: Record<string, unknown> = {}) =>
  ({ id: `f_${n}`, name: n, type: 'text' as const, required: true, ...extra }) as never

const table = (nom: string, champs: unknown[], extra: Record<string, unknown> = {}) =>
  ({ id: `ent_${nom}`, name: nom, fields: champs, ...extra }) as unknown as EntiteDeclaree

describe('EP-368 · aucune perte muette dans la fusion', () => {
  it('① UN CHAMP EN PLUS EST AJOUTÉ — la colonne existera', () => {
    // La perte la plus grave de l'ancienne forme : 1 champ au lieu de 2.
    const f = fusionnerEntites(
      [table('membre', [champ('nom')])],
      [table('membre', [champ('nom'), champ('telephone')])],
    )
    expect(f.entites[0]?.fields.map((c) => c.name)).toEqual(['nom', 'telephone'])
    expect(f.pertes, 'ajouter un champ n’est pas un conflit').toEqual([])
  })

  it('② LA PUBLICITÉ EST POSABLE là où le cahier se taît — le cas d’asso', () => {
    const f = fusionnerEntites(
      [table('annonce', [champ('titre')])],
      [table('annonce', [champ('titre')], { lecturePublique: true })],
    )
    expect(lecturePubliqueDe(f.entites[0] as EntiteDeclaree), 'asso a échoué sur ça').toBe(true)
    expect(f.pertes).toEqual([])
  })

  it('③ ET LE JOURNAL AUSSI — même silence, même famille', () => {
    const f = fusionnerEntites(
      [table('mouvement', [champ('somme')])],
      [table('mouvement', [champ('somme')], { appendOnly: true })],
    )
    expect(f.entites[0]?.appendOnly).toBe(true)
  })

  it('④ LE CAHIER L’EMPORTE QUAND IL A PARLÉ, et la perte se DIT', () => {
    // ── LE SILENCE N'EST PAS UNE PAROLE, MAIS UNE PAROLE EN EST UNE.
    //
    // Si le cahier a dit « privée », le constructeur ne la rend pas
    // publique au passage — la personne a demandé le contraire. Mais on ne
    // l'avale pas : elle part par le canal des refus.
    const f = fusionnerEntites(
      [table('soumission', [champ('montant')], { lecturePublique: false })],
      [table('soumission', [champ('montant')], { lecturePublique: true })],
    )
    expect(lecturePubliqueDe(f.entites[0] as EntiteDeclaree)).toBe(false)
    expect(f.pertes.length).toBe(1)
    expect(f.pertes[0]?.table).toBe('soumission')
    expect(f.pertes[0]?.quoi).toMatch(motifTexte('lecturePublique: true'))
  })

  it('⑤ UN TYPE, UNE OBLIGATION, UNE UNICITÉ CHANGÉS SE DISENT TOUS', () => {
    const f = fusionnerEntites(
      [table('membre', [champ('nom'), champ('age')])],
      [
        table('membre', [
          champ('nom', { required: false, unique: true }),
          champ('age', { type: 'number' }),
        ]),
      ],
    )
    const quoi = f.pertes.map((p) => p.quoi).join(' | ')
    expect(quoi, 'l’obligation changée').toMatch(motifTexte('nom facultatif'))
    expect(quoi, 'l’unicité ajoutée après coup').toMatch(motifTexte('nom unique'))
    expect(quoi, 'le type changé').toMatch(motifTexte('age: number'))
    // Et rien n'a bougé dans le résultat : le cahier reste l'autorité.
    expect(f.entites[0]?.fields[0]?.required).toBe(true)
    expect(f.entites[0]?.fields[1]?.type).toBe('text')
  })

  it('⑥ UNE TABLE AU NOM NEUF PASSE ENTIÈRE — rien n’a régressé', () => {
    const f = fusionnerEntites(
      [table('membre', [champ('nom')])],
      [table('note', [champ('texte')], { lecturePublique: true })],
    )
    expect(f.entites.map((e) => e.name)).toEqual(['membre', 'note'])
    expect(lecturePubliqueDe(f.entites[1] as EntiteDeclaree)).toBe(true)
  })

  it('⑦ LA CASSE DU NOM NE FAIT PAS DEUX TABLES', () => {
    // ── LA QUESTION QUE LE PROPRIÉTAIRE M'A DEMANDÉ DE ME POSER AVANT.
    //
    // « Quelles syntaxes valides mon motif ne voit-il pas ? » Ici le
    // rapprochement se fait sur un NOM, pas sur un motif — et un nom a des
    // variantes licites. `Membre` et `membre` nomment la même table en
    // SQL. Les traiter comme deux en créerait une seconde, vide.
    const f = fusionnerEntites(
      [table('membre', [champ('nom')])],
      [table('Membre', [champ('nom'), champ('telephone')])],
    )
    expect(f.entites.length, 'la casse a créé une table fantôme').toBe(1)
    expect(f.entites[0]?.fields.map((c) => c.name)).toEqual(['nom', 'telephone'])
  })

  it('⑧ ET LA CASSE D’UN CHAMP NON PLUS', () => {
    const f = fusionnerEntites(
      [table('membre', [champ('nom')])],
      [table('membre', [champ('Nom'), champ('telephone')])],
    )
    expect(f.entites[0]?.fields.map((c) => c.name), 'un champ dupliqué par la casse').toEqual([
      'nom',
      'telephone',
    ])
  })

  it('⑧bis UN CONFLIT SUR UN CHAMP À LA CASSE DIFFÉRENTE SE DIT QUAND MÊME', () => {
    // ── UNE MUTATION QUI NE MORD PAS NOMME LE CAS QUI MANQUE.
    //
    // J'ai retiré le repli de casse du RAPPROCHEMENT champ-à-champ, et
    // aucun cas n'a rougi : ⑧ n'éprouvait que les champs AJOUTÉS. Sans ce
    // cas-ci, un conflit déclaré sur `Nom` contre `nom` repartirait muet —
    // exactement le silence que ce fichier existe pour fermer.
    const f = fusionnerEntites(
      [table('membre', [champ('nom')])],
      [table('membre', [champ('Nom', { required: false })])],
    )
    expect(f.entites[0]?.fields.length, 'la casse a dupliqué le champ').toBe(1)
    expect(f.entites[0]?.fields[0]?.required, 'le cahier reste l’autorité').toBe(true)
    expect(f.pertes.map((pe) => pe.quoi).join(' '), 'le conflit est parti muet').toContain(
      'facultatif',
    )
  })

  it('⑨ LE CANAL EXISTE DANS LA BOUCLE — sinon la perte reste muette', () => {
    // La leçon des 26 modules sans appelant : un canal que personne ne lit
    // est un silence avec plus d'étapes.
    const boucle = readFileSync(join(__dirname, '..', 'boucle-directe.ts'), 'utf8')
    expect(boucle).toContain('fusion.pertes')
    expect(boucle).toContain('refusEnRoute')
  })
})
