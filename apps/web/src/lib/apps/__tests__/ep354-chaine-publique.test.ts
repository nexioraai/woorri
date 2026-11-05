/**
 * EP-354 · P3 — LE DRAPEAU TRAVERSE SA CHAÎNE, OU IL N'EXISTE PAS.
 *
 * ── CE QUE CE CLIQUET A ÉVITÉ, ET IL L'A ÉVITÉ UNE FOIS DÉJÀ.
 *
 * P1 posait la déclaration. P2 émettait les politiques. Les deux étaient
 * prouvés, chacun de son côté, par des cliquets qui mordaient. Et tout
 * était INERTE, parce que le maillon du milieu refusait de passer :
 *
 *     lecturePublique: true  →  safeParse accepté = FALSE
 *
 * `projectAirSchema` est STRICT. Une entité portant une clé qu'il ne
 * connaît pas est refusée EN ENTIER — « forme refusée par le contrat de
 * données ». Déclarer le drapeau ne rendait donc pas la table publique :
 * il SUPPRIMAIT la table de l'œuvre.
 *
 * Mesuré avant d'écrire la ligne qui le corrige, et c'est tout l'objet de
 * ce fichier : un champ qui ne traverse pas son contrat n'existe pas,
 * quel que soit le soin mis à ce qu'il y a des deux côtés.
 *
 * ── LA CHAÎNE, DANS L'ORDRE OÙ ELLE TOURNE.
 *
 *   le modèle écrit DONNEES.json
 *     → `projectAirSchema.shape.entities.element` valide
 *       → `lireEntites` garde l'objet ORIGINAL (pas la sortie de Zod)
 *         → `emettrePolitiquesSql` émet la politique `anon`
 *
 * Chaque maillon est exercé ici, et le dernier est comparé au premier.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { projectAirSchema } from '@deribfy/air-schema'
import { emettrePolitiquesSql } from '@deribfy/compiler'
import { lireSource } from './lire-source'
import { lireEntites } from '../entites-declarees'

const SRC = join(__dirname, '..', '..', '..')
const ID = '11111111-2222-3333-4444-555555555555'
const ELEMENT = projectAirSchema.shape.entities.element
const valider = (e: unknown): boolean => ELEMENT.safeParse(e).success
const brute = (x: Record<string, unknown> = {}) => ({
  id: 'ent_actualite',
  name: 'actualite',
  fields: [{ id: 'fld_titre', name: 'titre', type: 'text', required: true }],
  ...x,
})

/** La chaîne entière, du JSON du modèle au SQL émis. */
const chaine = (x: Record<string, unknown> = {}) => {
  const lu = lireEntites([brute(x)], valider)
  return { ...lu, sql: emettrePolitiquesSql(lu.entites, ID) }
}

describe('EP-354 · P3 · la chaîne de la lecture publique', () => {
  it('① LE CONTRAT ACCEPTE LE DRAPEAU — le maillon qui était rompu', () => {
    expect(valider(brute()), 'une entité ordinaire est refusée : le témoin est cassé').toBe(true)
    expect(
      valider(brute({ lecturePublique: true })),
      'le contrat refuse le drapeau : déclarer « public » SUPPRIMERAIT la table',
    ).toBe(true)
    expect(valider(brute({ lecturePublique: false }))).toBe(true)
    // ── ET IL RESTE STRICT POUR TOUT LE RESTE.
    //
    // Élargir le contrat pour laisser passer un champ, c'est le laisser
    // passer TOUS les champs — et une clé inventée par le modèle entrerait
    // alors sans que rien ne la lise.
    expect(valider(brute({ nImporteQuoi: true })), 'le contrat a cessé d’être strict').toBe(false)
  })

  it('② LE DRAPEAU SURVIT À LA LECTURE — Zod le dépouillerait', () => {
    // `lireEntites` garde l'objet ORIGINAL (`brut as EntiteDeclaree`), pas
    // la sortie de `safeParse`. Si un jour il rendait la sortie de Zod, le
    // drapeau survivrait quand même — mais seulement parce que le contrat
    // le connaît maintenant. Les deux conditions comptent.
    const lu = lireEntites([brute({ lecturePublique: true })], valider)
    expect(lu.refus, `l’entité a été refusée : ${JSON.stringify(lu.refus)}`).toEqual([])
    expect(lu.entites.length, 'l’entité n’est pas passée').toBe(1)
    expect(lu.entites[0]?.lecturePublique, 'le drapeau a été dépouillé en route').toBe(true)
  })

  it('③ ET IL ARRIVE JUSQU’AU SQL — « c’est écrit » et « ça arrive »', () => {
    const avec = chaine({ lecturePublique: true })
    expect(avec.sql, 'la politique anonyme n’arrive pas au bout de la chaîne').toMatch(
      /create policy actualite_lecture_publique on actualite for select to anon/u,
    )
    expect(avec.sql, 'le privilège anonyme n’arrive pas au bout de la chaîne').toMatch(
      /grant select on actualite to anon;/u,
    )
  })

  it('④ SANS DÉCLARATION, RIEN NE S’OUVRE AU BOUT DE LA CHAÎNE', () => {
    const sans = chaine()
    expect(sans.entites.length, 'l’entité ordinaire ne passe plus').toBe(1)
    expect(sans.sql, 'une table non déclarée s’ouvre quand même').not.toMatch(/to anon\b/u)
  })

  it('⑤ UNE VALEUR MAL ÉCRITE EST REFUSÉE, ET LE REFUS SE DIT', () => {
    // ── DEUX BARRIÈRES, ET LA PREMIÈRE EST LE CONTRAT.
    //
    // `'oui'` et `1` sont refusés par `projectAirSchema` lui-même, donc la
    // table entière tombe — comme pour `appendOnly: 'oui'`, et c'est la
    // cohérence du dépôt. La lecture stricte (`=== true`) reste la seconde
    // barrière, pour le jour où une entité arriverait sans passer par là.
    //
    // CE QUI COMPTE : le refus n'est pas SILENCIEUX. Une table disparue
    // sans motif enverrait chercher un défaut dans le code du modèle.
    for (const mauvais of ['oui', 'non', 1, 0, 'true', []]) {
      const r = chaine({ lecturePublique: mauvais })
      expect(r.entites, `« ${JSON.stringify(mauvais)} » a produit une entité`).toEqual([])
      expect(r.refus.length, `« ${JSON.stringify(mauvais)} » disparaît sans motif`).toBe(1)
      expect(r.refus[0]?.quoi, 'le refus ne nomme pas la table').toBe('actualite')
      expect(r.refus[0]?.motif, 'le refus ne dit pas pourquoi').toMatch(/contrat de données/u)
      expect(r.sql, `« ${JSON.stringify(mauvais)} » a ouvert une porte anonyme`).not.toMatch(
        /to anon\b/u,
      )
    }
  })

  it('⑥ ET LA ROUTE EMPLOIE CE CONTRAT-LÀ, pas un second', () => {
    // Deux validateurs divergeraient, et la divergence se découvrirait en
    // production sur une table refusée ici et acceptée là — ou l'inverse,
    // qui est pire. C'est la discipline déjà écrite dans la route.
    const src = lireSource(join(SRC, 'app', 'api', 'generateur', 'direct', 'route.ts'))
    expect(src, 'la route n’emploie plus le contrat de données').toMatch(
      /projectAirSchema\.shape\.entities\.element/u,
    )
    expect(src, 'la route valide avec autre chose que ce contrat').toMatch(
      /schemaEntite\.safeParse\(e\)\.success/u,
    )
  })
})
