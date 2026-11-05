/**
 * EP-353 · P2 — LE SECOND RÉGIME, ET CE QU'IL N'OUVRE JAMAIS.
 *
 * ── CE QUE CE CLIQUET PEUT PROUVER, ET CE QU'IL NE PEUT PAS.
 *
 * Rien de ce paquet n'a jamais touché un Postgres : SQLite n'a pas de RLS
 * et ne sait pas analyser `create policy`. Ce qui se prouve ici est la
 * FORME du SQL émis. L'EXERCICE vit dans `src/tirs/porte-deux-regimes.tir.ts`,
 * sur une vraie base, avec de vrais jetons.
 *
 * Les deux sont nécessaires, et une mesure l'a montré : trois mutations
 * sur le tir n'ont PAS mordu, parce que les deux barrières — le privilège
 * et la politique — se couvrent l'une l'autre. Un contrôle qui ne voit que
 * le RÉSULTAT ne dit pas laquelle a tenu.
 */
import { describe, expect, it } from 'vitest'
import { emettrePolitiquesSql, litPublique } from '../src/politiques-donnees.ts'

const ID = '11111111-2222-3333-4444-555555555555'
const champ = { id: 'fld_t', name: 'titre', type: 'text' as const, required: true }
const e = (name: string, x: Record<string, unknown> = {}) => ({
  id: `ent_${name}`,
  name,
  fields: [champ],
  ...x,
})
const sql = (x: Record<string, unknown> = {}) => emettrePolitiquesSql([e('actualite', x)], ID)

describe('EP-353 · P2 · la lecture publique', () => {
  it('① SANS DÉCLARATION, AUCUNE PORTE ANONYME — l’oubli va vers le sûr', () => {
    const s = sql()
    expect(s, 'une table non déclarée reçoit une politique anonyme').not.toMatch(/to anon\b/u)
    expect(s, 'une table non déclarée reçoit un privilège anonyme').not.toMatch(
      /grant[^;]*\bto anon\b/u,
    )
    // ET LA RÉVOCATION TIENT TOUJOURS : c'est elle qui ferme les privilèges
    // par défaut d'un projet Supabase, qui ré-ouvrent toute table neuve.
    expect(s, 'la révocation a disparu').toMatch(/revoke all on actualite from anon, public;/u)
  })

  it('② DÉCLARÉE, ELLE N’OUVRE QUE `select` — jamais autre chose', () => {
    const s = sql({ lecturePublique: true })
    expect(s, 'la politique publique est absente').toMatch(
      /create policy actualite_lecture_publique on actualite for select to anon/u,
    )
    // ── `for all` SERAIT L'ÉCRITURE OUVERTE SANS QUE LE MOT APPARAISSE.
    expect(s, 'la politique publique dépasse la lecture').not.toMatch(
      /actualite_lecture_publique[^;]*for (all|insert|update|delete)/u,
    )
    // ── ET PAS DE `with check` : une politique de lecture n'en prend pas,
    //    et en ajouter une ouvrirait l'écriture en silence.
    const bloc = s.slice(s.indexOf('actualite_lecture_publique on'))
    expect(bloc.slice(0, bloc.indexOf(';')), 'la politique publique porte un `with check`').not.toMatch(
      /with check/u,
    )
    // ── LE PRIVILÈGE SUIT LA POLITIQUE, et seulement `select`.
    expect(s, 'le privilège anonyme n’est pas exactement `select`').toMatch(
      /grant select on actualite to anon;/u,
    )
    expect(s, 'le privilège anonyme dépasse la lecture').not.toMatch(
      /grant[^;]*(insert|update|delete)[^;]*to anon/u,
    )
  })

  it('③ L’ORDRE EST LA GARDE : on révoque AVANT d’accorder', () => {
    // Accorder puis révoquer refermerait ce qu'on vient d'ouvrir — et la
    // table publique ne serait plus lisible, sans que rien ne rougisse.
    const s = sql({ lecturePublique: true })
    expect(s.indexOf('revoke all on actualite'), 'la révocation a disparu').toBeGreaterThan(-1)
    expect(s.indexOf('revoke all on actualite')).toBeLessThan(s.indexOf('grant select on actualite to anon'))
  })

  it('④ LE RETRAIT DE LA POLITIQUE EST INCONDITIONNEL — et c’est le piège', () => {
    // ── UNE TABLE QUI REDEVIENT PRIVÉE DOIT SE REFERMER POUR DE BON.
    //
    // Deux politiques permissives s'ADDITIONNENT en RLS. Une politique
    // `anon` laissée en place après le retrait du drapeau redeviendrait
    // vivante au premier `grant select` suivant — en silence, et sans
    // qu'aucune déclaration ne le dise.
    //
    // MESURÉ sur la vraie base : sans ce `drop`, la lecture reste refusée
    // (le `revoke` tient), mais `pg_policies` garde la politique. Le tir
    // interroge donc `pg_policies`, pas seulement le résultat.
    for (const x of [{}, { lecturePublique: true }, { appendOnly: true }]) {
      expect(
        sql(x),
        `le retrait du régime public manque pour ${JSON.stringify(x)}`,
      ).toMatch(/drop policy if exists actualite_lecture_publique on actualite;/u)
    }
  })

  it('⑤ UNE VALEUR MAL ÉCRITE LAISSE LA TABLE PRIVÉE', () => {
    // `'non'` est VRAI par coercition en JavaScript, et c'est exactement ce
    // qu'un modèle écrit quand on lui demande un booléen en français.
    for (const mauvais of ['oui', 'non', 'true', 'public', 1, -1, [], {}, [true], ' ']) {
      expect(litPublique({ lecturePublique: mauvais }), `« ${JSON.stringify(mauvais)} » a ouvert`).toBe(
        false,
      )
      expect(
        sql({ lecturePublique: mauvais }),
        `« ${JSON.stringify(mauvais)} » a produit une porte anonyme`,
      ).not.toMatch(/to anon\b/u)
    }
    expect(litPublique({ lecturePublique: true }), 'la déclaration juste n’ouvre plus').toBe(true)
  })

  it('⑥ ET LE JOURNAL RESTE UN JOURNAL quand il est public', () => {
    // ── LES DEUX RÉGIMES SE COMPOSENT SANS SE CONTREDIRE.
    //
    // Un journal public — un registre d'actes publiés, par exemple — se
    // lit par tous et ne se réécrit par personne. Si le régime public
    // rendait `update` possible, « journal » cesserait d'être une étiquette
    // une seconde fois.
    const s = emettrePolitiquesSql([e('registre', { appendOnly: true, lecturePublique: true })], ID)
    expect(s, 'le journal public perd sa lecture publique').toMatch(
      /create policy registre_lecture_publique on registre for select to anon/u,
    )
    expect(s, 'le journal public a gagné une politique d’écriture').not.toMatch(
      /create policy registre[^;]*for (all|update|delete)/u,
    )
    expect(s, 'le journal public accepte update ou delete').not.toMatch(
      /grant[^;]*(update|delete)[^;]*on registre/u,
    )
  })
})
