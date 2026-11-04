/**
 * EP-339 · M1 — CE QU'UNE MODIFICATION N'A PAS LE DROIT DE FAIRE.
 *
 * ── LE CHANTIER, ET CE QU'IL MET EN JEU.
 *
 * Une modification doit pouvoir ajouter un écran, changer une règle de
 * calcul, ajouter une table — sur une œuvre qui porte les VRAIES données
 * de quelqu'un, et qui garde son adresse. C'est le geste le plus risqué
 * de ce produit : une migration ratée efface le travail d'un client.
 *
 * ── LE PIRE CAS, ET IL N'EST PAS CELUI QU'ON SURVEILLE D'ABORD.
 *
 * J'avais proposé comme garde principale un comptage de lignes avant et
 * après la migration, en écrivant « c'est la garde qui compte ». Le
 * propriétaire a déroulé le contre-exemple :
 *
 *     `releve` porte 2 lignes. Le modèle déclare `releves`.
 *     La migration émet `create table if not exists releves`.
 *     releve → 2 lignes · releves → 0 ligne · TOTAL → 2.
 *     AUCUNE BAISSE. Le comptage est VERT.
 *
 * Et l'utilisateur voit ses relevés disparaître. Ils sont là, invisibles,
 * dans une table que plus personne ne lit.
 *
 *   « Ta garde 4 constate les effacements. Elle est aveugle aux
 *     abandons. »
 *
 * C'est donc CE contrôle-ci qui porte le cas, et il doit être étanche.
 *
 * ── ET SA PREMIÈRE FORMULATION AVAIT UN TROU.
 *
 * J'avais écrit « une table disparaît ET une table apparaît ». Un
 * renommage accompagné d'un ajout légitime serait passé entre les deux
 * conditions. La disparition suffit, seule, sans rien regarder d'autre.
 */
import { describe, expect, it } from 'vitest'
import { comparerDeclarations, phraseArret, sortDe } from '../migration-oeuvre'
import type { EntiteDeclaree } from '../entites-declarees'

const RELEVE: EntiteDeclaree = {
  id: 'ent_releve',
  name: 'releve',
  fields: [
    { id: 'fld_date', name: 'date', type: 'date', required: true },
    { id: 'fld_index', name: 'index', type: 'number', required: true },
  ],
}
const NOTE: EntiteDeclaree = {
  id: 'ent_note',
  name: 'note',
  fields: [{ id: 'fld_texte', name: 'texte', type: 'text', required: false }],
}

describe('EP-339 · M1, l’arrêt avant la migration', () => {
  it('① UNE TABLE QUI S’EN VA ARRÊTE TOUT — même accompagnée d’un ajout', () => {
    // ── LE TROU DE MA PREMIÈRE FORMULATION.
    //
    // `releve` devient `releves` ET une table `note` apparaît par
    // ailleurs. Une règle qui exigeait « une disparition ET une
    // apparition » aurait pu lire l'apparition comme celle de `note` et
    // laisser passer le renommage.
    const releves: EntiteDeclaree = { ...RELEVE, id: 'ent_releves', name: 'releves' }
    const plan = comparerDeclarations([RELEVE], [releves, NOTE])
    expect(plan.peutAvancer, 'un renommage masqué par un ajout légitime passe').toBe(false)
    expect(
      plan.arrets.some((e) => e.genre === 'table-abandonnee' && e.table === 'releve'),
      'la table abandonnée n’est pas nommée',
    ).toBe(true)
  })

  it('② ET SANS AUCUN AJOUT, c’est le même arrêt', () => {
    expect(comparerDeclarations([RELEVE], []).peutAvancer).toBe(false)
    expect(comparerDeclarations([RELEVE, NOTE], [NOTE]).peutAvancer).toBe(false)
  })

  it('③ UN CHAMP ABANDONNÉ ARRÊTE AUSSI — les versions gardent le code, pas les lignes', () => {
    const ampute: EntiteDeclaree = { ...RELEVE, fields: [RELEVE.fields[0]!] }
    const plan = comparerDeclarations([RELEVE], [ampute])
    expect(plan.peutAvancer, 'une colonne peut disparaître sans qu’on demande').toBe(false)
    expect(plan.arrets[0]).toMatchObject({ genre: 'champ-abandonne', champ: 'index' })
  })

  it('④ UN TYPE OU UNE UNICITÉ QUI CHANGE ARRÊTE', () => {
    // `alter column type` peut échouer ou tronquer ; un index unique posé
    // sur des données réelles échoue précisément quand des doublons
    // existent déjà — donc au pire moment.
    const retype: EntiteDeclaree = {
      ...RELEVE,
      fields: [RELEVE.fields[0]!, { ...RELEVE.fields[1]!, type: 'text' }],
    }
    expect(comparerDeclarations([RELEVE], [retype]).peutAvancer).toBe(false)
    const unique: EntiteDeclaree = {
      ...RELEVE,
      fields: [{ ...RELEVE.fields[0]!, unique: true }, RELEVE.fields[1]!],
    }
    expect(comparerDeclarations([RELEVE], [unique]).peutAvancer).toBe(false)
  })

  it('⑤ CE QUI EST VRAIMENT ADDITIF PASSE — sinon le produit est inutilisable', () => {
    // Une garde qui refuse le cas normal se fait désarmer dans la semaine.
    const enrichi: EntiteDeclaree = {
      ...RELEVE,
      fields: [...RELEVE.fields, { id: 'fld_tranche', name: 'tranche', type: 'text', required: false }],
    }
    const plan = comparerDeclarations([RELEVE], [enrichi, NOTE])
    expect(plan.peutAvancer, 'un ajout pur est refusé').toBe(true)
    expect(plan.ajouts.map((e) => e.genre).sort()).toEqual(['champ-ajoute', 'table-ajoutee'])
  })

  it('⑥ L’IDENTITÉ EST L’IDENTIFIANT, PAS LE LIBELLÉ', () => {
    // ── SINON ON ARRÊTE UNE MODIFICATION PARFAITEMENT SÛRE.
    //
    // Le SQL nomme ses tables depuis `id`. Renommer l'AFFICHAGE — « relevé »
    // devient « Relevé mensuel » — ne touche à aucune table. Comparer les
    // noms affichés ferait de chaque changement de libellé un abandon.
    const relabel: EntiteDeclaree = { ...RELEVE, name: 'Relevé mensuel' }
    expect(
      comparerDeclarations([RELEVE], [relabel]).peutAvancer,
      'un simple changement de libellé arrête la migration',
    ).toBe(true)
  })

  it('⑦ OBLIGATION ET PORTE NE PRODUISENT AUCUN SQL — mais se disent', () => {
    // On n'ajoute JAMAIS `not null` à une colonne posée sur des lignes
    // existantes : l'obligation vit dans l'écran. Et les politiques font
    // `drop policy if exists` avant `create policy` — les réappliquer
    // suffit. Rien à migrer, et un écart tu est un écart qu'on croira
    // appliqué.
    const change: EntiteDeclaree = {
      ...RELEVE,
      appendOnly: true,
      fields: [{ ...RELEVE.fields[0]!, required: false }, RELEVE.fields[1]!],
    }
    const plan = comparerDeclarations([RELEVE], [change])
    expect(plan.peutAvancer).toBe(true)
    expect(plan.ajouts, 'un changement sans effet produirait du SQL').toEqual([])
    expect(plan.sansEffet.map((e) => e.genre).sort()).toEqual([
      'obligation-changee',
      'porte-changee',
    ])
  })

  it('⑧ UN SEUL ARRÊT SUFFIT — jamais « en grande partie sûr »', () => {
    const plan = comparerDeclarations([RELEVE, NOTE], [{ ...RELEVE }])
    expect(plan.ajouts).toEqual([])
    expect(plan.peutAvancer).toBe(false)
    // ET TOUS LES GENRES SONT CLASSÉS : un genre neuf qui tomberait dans
    // aucun des trois sorts serait silencieusement ignoré.
    for (const e of plan.ecarts) expect(['ajout', 'arret', 'sansEffet']).toContain(sortDe(e))
  })

  it('⑨ ET LA PERSONNE COMPREND CE QUI A FAILLI ARRIVER À SES DONNÉES', () => {
    // Un arrêt qu'on ne comprend pas est un arrêt qu'on contourne.
    const t = phraseArret(comparerDeclarations([RELEVE], [NOTE])) ?? ''
    expect(t, 'l’arrêt ne nomme pas la table concernée').toContain('releve')
    expect(t, 'l’arrêt ne rassure pas sur l’état des données').toContain('intactes')
    expect(t, 'l’arrêt ne propose pas le geste du renommage').toMatch(/RENOMMER/u)
    expect(phraseArret(comparerDeclarations([RELEVE], [RELEVE])), 'un plan sûr parle').toBeNull()
  })
})
