/**
 * LA LECTURE PUBLIQUE BORNÉE (2026-11-23) — un visiteur sans compte ne reçoit
 * que les colonnes et les lignes que la page publique affiche.
 *
 * Défauts mesurés : atitta (plaque et client de chaque véhicule envoyés au
 * navigateur) ; place de marché (produit « masqué » lisible par tous).
 * La preuve sur Postgres réel est à part (base jetable) ; ici, la chaîne :
 * contrat → fusion → émetteur → migrateur → juge → fenêtre « Publier ».
 */
import { describe, expect, it } from 'vitest'
import { emettrePolitiquesSql, lecturePubliqueEmise } from '@deribfy/compiler'
import { projectAirSchema } from '@deribfy/air-schema'
import { blocBase, lecturePubliqueLue, type EntiteDeclaree } from '../entites-declarees'
import { CONSIGNE_RETOUCHE } from '../retouche'
import { fermerCeQuiFuit, jugerLecturePublique, reprocheLecturePublique } from '../juge-lecture-publique'
import { verifierMigration } from '../migration-sql'
import { fusionnerEntites } from '../declaration-en-route'
import { listesPubliques, phraseListePublique } from '../contenu-public'
import { signaturePublique } from '../signature-publique'
import { motifTexte } from './motif-texte'
import { politiquesAPoser } from '../politiques-a-poser'

const champ = (n: string, type = 'text') => ({ id: `fld_${n}`, name: n, type, required: false })
const PRODUIT = (o: Partial<EntiteDeclaree> = {}): EntiteDeclaree => ({
  id: 'ent_produit',
  name: 'produit',
  lecturePublique: true,
  fields: [champ('nom'), champ('prix', 'decimal'), champ('whatsapp'), champ('masque', 'boolean')],
  ...o,
})
const VEHICULE = (o: Partial<EntiteDeclaree> = {}): EntiteDeclaree => ({
  id: 'ent_vehicule',
  name: 'vehicule',
  lecturePublique: true,
  fields: [champ('client'), champ('marque'), champ('immatriculation'), champ('etat')],
  ...o,
})
const ID = '11111111-2222-3333-4444-555555555555'
const code = (c: string) => new Map([['index.tsx', c]])

describe('① l’émetteur : colonnes nommées, lignes conditionnées, et rien sans déclaration', () => {
  it('accorde les seules colonnes publiques, et la condition de ligne', () => {
    const sql = emettrePolitiquesSql([PRODUIT({ champsPublics: ['nom', 'prix', 'whatsapp'], lignesPubliques: [{ champ: 'masque', vaut: false }] })], ID)
    expect(sql).toContain('grant select (id, nom, prix, whatsapp, masque) on produit to anon;')
    expect(sql).toContain('  using (masque = false);')
    expect(sql, 'jamais la table entière au visiteur').not.toMatch(/grant select on produit to anon/u)
    expect(sql).not.toContain('using (true)')
  })
  it('une table publique sans champsPublics n’ouvre RIEN (fail-closed)', () => {
    const sql = emettrePolitiquesSql([PRODUIT()], ID)
    expect(sql).toContain('-- LECTURE PUBLIQUE NON OUVERTE')
    expect(sql).not.toMatch(/to anon/u)
    expect(sql, 'la vieille politique tombe quand même').toContain('drop policy if exists produit_lecture_publique on produit;')
  })
  it('une colonne inconnue, une valeur dangereuse : refus, pas d’ouverture partielle', () => {
    expect(lecturePubliqueEmise(PRODUIT({ champsPublics: ['nom', 'mot_de_passe'] })).ok).toBe(false)
    const injection = PRODUIT({ champsPublics: ['nom'], lignesPubliques: [{ champ: 'nom', vaut: "x' or true --" }] })
    expect(lecturePubliqueEmise(injection).ok).toBe(false)
    expect(emettrePolitiquesSql([injection], ID)).not.toMatch(/to anon/u)
  })
  it('le contrat de données laisse passer les deux listes, et refuse une valeur dangereuse', () => {
    const valider = (e: unknown) => projectAirSchema.shape.entities.element.safeParse(e).success
    expect(valider(PRODUIT({ champsPublics: ['nom'], lignesPubliques: [{ champ: 'masque', vaut: false }] }))).toBe(true)
    expect(valider(PRODUIT({ champsPublics: ['nom'], lignesPubliques: [{ champ: 'masque', vaut: "x'" }] }))).toBe(false)
  })
})

describe('② la copie côté écran est ÉGALE à l’émetteur', () => {
  const serie: Partial<EntiteDeclaree>[] = [
    {},
    { champsPublics: [] },
    { champsPublics: ['nom'] },
    { champsPublics: ['fld_nom', 'prix', 'nom'] },
    { champsPublics: ['inconnu'] },
    { champsPublics: ['nom'], lignesPubliques: [{ champ: 'masque', vaut: false }] },
    { champsPublics: ['nom'], lignesPubliques: [{ champ: 'masque', vaut: 'ok val' }, { champ: 'prix', vaut: 3 }] },
    { champsPublics: ['nom'], lignesPubliques: [{ champ: 'nope', vaut: true }] },
    { champsPublics: 'nom' as unknown as string[] },
  ]
  it.each(serie.map((s, i) => [i, s] as const))('déclaration %i', (_i, s) => {
    const a = lecturePubliqueEmise(PRODUIT(s))
    const b = lecturePubliqueLue(PRODUIT(s))
    expect(b.ok).toBe(a.ok)
    if (a.ok && b.ok) expect(b.colonnes).toEqual(a.colonnes)
  })
})

describe('③ le migrateur : la colonne nommée passe, la table entière au visiteur non', () => {
  it('accepte grant select (colonnes) to anon', () => {
    expect(verifierMigration('grant select (id, nom) on produit to anon;').ok).toBe(true)
  })
  it('refuse grant select on t to anon, et toute autre forme vers anon', () => {
    expect(verifierMigration('grant select on produit to anon;').ok).toBe(false)
    expect(verifierMigration('grant insert (nom) on produit to anon;').ok).toBe(false)
    expect(verifierMigration('grant select (id, nom), insert on produit to anon;').ok).toBe(false)
  })
  it('les politiques émises passent ENTIÈRES le migrateur (la retouche les réapplique)', () => {
    const sql = emettrePolitiquesSql([PRODUIT({ champsPublics: ['nom'], lignesPubliques: [{ champ: 'masque', vaut: false }] })], ID)
    expect(verifierMigration(sql)).toMatchObject({ ok: true })
  })
})

describe('④ le juge : ce que le visiteur reçoit = ce que la page demande', () => {
  it('place de marché telle que livrée : lecture entière ET tri à l’écran', () => {
    const d = jugerLecturePublique(
      [PRODUIT({ champsPublics: ['nom', 'prix', 'whatsapp'] })],
      code("const { data } = await base.from('produit').select('*').order('id', { ascending: true })\nsetProduits(p.filter(x => !x.masque))"),
    )
    expect(d.map((x) => x.genre).sort()).toEqual(['lecture-entiere', 'tri-a-l-ecran'])
    expect(reprocheLecturePublique(d)).toMatch(/lignesPubliques/u)
  })
  it('place de marché corrigée : aucun défaut', () => {
    const d = jugerLecturePublique(
      [PRODUIT({ champsPublics: ['nom', 'prix', 'whatsapp'], lignesPubliques: [{ champ: 'masque', vaut: false }] })],
      code("const { data } = await base\n  .from('produit')\n  .select('id, nom, prix, whatsapp')\n  .order('id')\nconst v = p.filter(x => !x.masque)\nawait base.from('produit').select('*')"),
    )
    expect(d).toEqual([])
  })
  it('atitta : une colonne publique jamais demandée est une fuite', () => {
    const d = jugerLecturePublique(
      [VEHICULE({ champsPublics: ['immatriculation', 'etat', 'client'] })],
      code("base.from('vehicule').select('id, etat')"),
    )
    expect(d).toEqual([
      { genre: 'champ-non-lu', table: 'vehicule', champ: 'immatriculation' },
      { genre: 'champ-non-lu', table: 'vehicule', champ: 'client' },
    ])
  })
  it('un filtre sur une colonne non publique n’est pas une lecture bornée', () => {
    const d = jugerLecturePublique([VEHICULE({ champsPublics: ['etat'] })], code("base.from('vehicule').select('id, etat').eq('immatriculation', x)"))
    expect(d.map((x) => x.genre)).toContain('lecture-entiere')
  })
  it('sans champsPublics : défaut « sans-champs »', () => {
    expect(jugerLecturePublique([VEHICULE()], code("base.from('vehicule').select('*')"))[0]?.genre).toBe('sans-champs')
  })
  it('une table privée ne se juge pas', () => {
    expect(jugerLecturePublique([VEHICULE({ lecturePublique: false })], code("base.from('vehicule').select('*')"))).toEqual([])
  })
})

describe('⑤ à la livraison, ce qui fuit encore se FERME', () => {
  it('retire la colonne jamais lue, et la lecture d’une table triée à l’écran', () => {
    const v = VEHICULE({ champsPublics: ['immatriculation', 'etat'] })
    const p = PRODUIT({ champsPublics: ['nom'] })
    const r = fermerCeQuiFuit([v, p], [
      { genre: 'champ-non-lu', table: 'vehicule', champ: 'immatriculation' },
      { genre: 'tri-a-l-ecran', table: 'produit', champ: 'masque' },
    ])
    expect(r.entites[0]?.champsPublics).toEqual(['etat'])
    expect(r.entites[1]?.lecturePublique).toBe(false)
    expect(r.fermes).toHaveLength(2)
  })
  it('une page qui lit la table entière : la lecture publique tombe', () => {
    const r = fermerCeQuiFuit([PRODUIT({ champsPublics: ['nom'] })], [{ genre: 'lecture-entiere', table: 'produit' }])
    expect(r.entites[0]?.lecturePublique).toBe(false)
  })
})

describe('⑥ la fusion garde ce que le constructeur dit du visiteur', () => {
  it('champsPublics et lignesPubliques traversent', () => {
    const f = fusionnerEntites([PRODUIT()], [PRODUIT({ champsPublics: ['nom'], lignesPubliques: [{ champ: 'masque', vaut: false }] })])
    expect(f.entites[0]?.champsPublics).toEqual(['nom'])
    expect(f.entites[0]?.lignesPubliques).toEqual([{ champ: 'masque', vaut: false }])
  })
  it('à défaut, ceux d’avant restent', () => {
    const f = fusionnerEntites([PRODUIT({ champsPublics: ['prix'] })], [PRODUIT()])
    expect(f.entites[0]?.champsPublics).toEqual(['prix'])
  })
})

describe('⑦ la fenêtre « Publier » dit exactement ce qui sera visible', () => {
  it('seulement les colonnes publiques, et la condition de ligne', () => {
    const [l] = listesPubliques([PRODUIT({ champsPublics: ['nom', 'prix'], lignesPubliques: [{ champ: 'masque', vaut: false }] })])
    expect(l?.champs).toEqual(['nom', 'prix'])
    const phrase = phraseListePublique(l!)
    expect(phrase).toContain('nom, prix')
    expect(phrase).toContain('« masque » vaut non')
    expect(phrase).not.toContain('whatsapp')
  })
  it('rien d’accordé : la phrase dit « visible par personne »', () => {
    const [l] = listesPubliques([PRODUIT()])
    expect(phraseListePublique(l!)).toMatch(/visible par personne/u)
  })
})

describe('⑧ la porte se réécrit quand ce que voit le visiteur change', () => {
  it('la signature change avec les colonnes ou les lignes, pas avec un champ privé', () => {
    const a = signaturePublique([PRODUIT({ champsPublics: ['nom'] })])
    expect(signaturePublique([PRODUIT({ champsPublics: ['nom', 'prix'] })])).not.toBe(a)
    expect(signaturePublique([PRODUIT({ champsPublics: ['nom'], lignesPubliques: [{ champ: 'masque', vaut: false }] })])).not.toBe(a)
    expect(signaturePublique([PRODUIT({ champsPublics: ['nom'], fields: [...PRODUIT().fields, champ('note')] })])).toBe(a)
    const masques = (vaut: boolean) => signaturePublique([PRODUIT({ champsPublics: ['nom'], lignesPubliques: [{ champ: 'masque', vaut }] })])
    expect(masques(true), 'montrer les masqués au lieu des visibles est un changement de porte').not.toBe(masques(false))
  })
  it('la publication réémet depuis la déclaration, pas depuis le texte stocké', () => {
    const vieux = "grant select on produit to anon;"
    const sql = politiquesAPoser({ politiques: vieux, entites: [PRODUIT({ champsPublics: ['nom'] })] }, ID)
    expect(sql).not.toContain(vieux)
    expect(sql).toContain('grant select (id, nom) on produit to anon;')
    expect(politiquesAPoser({ politiques: vieux }, ID), 'sans déclaration : le texte stocké').toBe(vieux)
  })
})

describe('⑨ la consigne le dit, à la création ET à la modification', () => {
  it.each([
    ['création', () => blocBase([PRODUIT()])],
    ['modification', () => CONSIGNE_RETOUCHE],
  ])('%s : les deux listes, jamais « * », pas de .filter pour cacher', (_n, texte) => {
    const consigne = texte()
    for (const clause of ['"champsPublics"', '"lignesPubliques"', 'jamais « * »', 'Ne cache jamais des lignes par un `.filter`', 'le visiteur ne reçoit RIEN']) {
      expect(consigne, clause).toMatch(motifTexte(clause))
    }
  })
})
