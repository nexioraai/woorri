/**
 * EP-320 · LA PORTE (lot D3).
 *
 * ── CE QUE CE CLIQUET PEUT PROUVER, ET CE QU'IL NE PEUT PAS.
 *
 * Il ne peut PAS prouver qu'une politique protège : rien ici ne touche un
 * Postgres, et SQLite n'a pas de RLS — il ne sait même pas analyser
 * `create policy`. Toute prétention à une preuve d'exécution serait fausse.
 *
 * Ce qu'il prouve est STRUCTUREL, et c'est exactement là que les quatre
 * défauts connus se sont produits :
 *
 * ① AUCUNE TABLE OUBLIÉE. Une table sans politique dans une base dont les
 *    privilèges par défaut donnent tout à `anon` est une table publique.
 * ② `revoke` À `public`, PAS SEULEMENT À `anon`. Mesuré en octobre : `anon`
 *    hérite de `public`, et un `revoke from anon` seul laisse la porte
 *    ouverte tout en ayant l'air de la fermer.
 * ③ `enable` ET `force`. Sans `force`, le propriétaire de la table ignore
 *    les politiques en silence.
 * ④ L'ORDRE. Révoquer après avoir accordé, ou poser une politique avant de
 *    retirer l'ancienne, défait le geste précédent.
 *
 * Et un cinquième, qui est le pire : `using (true)` accordé à `anon` ou à
 * `public`. C'est la décision du propriétaire pour le rôle CONNECTÉ ; c'est
 * une fuite pour tout autre rôle.
 */
import { describe, expect, it } from 'vitest'
import {
  emettrePolitiquesSql,
  ROLE_PORTE,
  ROLES_REFUSES,
  SANS_POLITIQUE,
  type EntiteDonnees,
} from '@deribfy/compiler'

/** Les onze tables du tir CPA réel du 2026-11-02, pas un jeu inventé. */
const CPA: readonly EntiteDonnees[] = [
  'client',
  'fournisseur',
  'produit',
  'publication',
  'appel_offre',
  'demande',
  'reclamation',
  'document',
  'utilisateur',
  'unite_organigramme',
].map((n) => ({ id: `ent_${n}`, fields: [{ id: 'fld_nom', type: 'text' }] }))
const AVEC_JOURNAL: readonly EntiteDonnees[] = [
  ...CPA,
  { id: 'ent_journal_audit', appendOnly: true, fields: [{ id: 'fld_acteur', type: 'text' }] },
]

describe('EP-320 · la porte', () => {
  it('① AUCUNE TABLE N’EST OUBLIÉE', () => {
    // Une table sans politique, dans une base dont les privilèges par défaut
    // donnent tout à `anon`, est une table PUBLIQUE. La couverture n'est pas
    // un confort : c'est la protection elle-même.
    const sql = emettrePolitiquesSql(AVEC_JOURNAL)
    for (const e of AVEC_JOURNAL) {
      const t = e.id.replace(/^ent_/u, '')
      expect(sql, `${t} n’a pas de RLS`).toContain(`alter table public.${t} enable row level security;`)
      expect(sql, `${t} n’a pas de politique`).toContain(`create policy ${t}_porte`)
      expect(sql, `${t} ne révoque rien`).toContain(`revoke all on public.${t}`)
    }
    // ET LE COMPTE EST EXACT : une politique de plus que de tables voudrait
    // dire qu'une table en porte deux, une de moins qu'il en manque une.
    const politiques = [...sql.matchAll(/create policy /gu)].length
    expect(politiques, 'le compte des politiques ne suit pas celui des tables')
      .toBe(AVEC_JOURNAL.length)
  })

  it('② LA RÉVOCATION VISE `public`, ET PAS SEULEMENT `anon`', () => {
    // ── LA LEÇON D'OCTOBRE, ET ELLE A COÛTÉ UNE FUITE RÉELLE.
    //
    // `revoke … from anon` a été exécuté, et la lecture anonyme a continué
    // de fonctionner : PUBLIC porte les privilèges, `anon` en hérite. Un
    // contrôle qui n'exige que `anon` laisserait revenir exactement ça.
    const sql = emettrePolitiquesSql(CPA)
    expect(ROLES_REFUSES, 'le rôle `public` n’est plus refusé').toContain('public')
    expect(ROLES_REFUSES, 'le rôle `anon` n’est plus refusé').toContain('anon')
    for (const r of ROLES_REFUSES) {
      expect(sql, `le rôle ${r} n’est pas révoqué`).toMatch(
        new RegExp(`revoke all on public\\.client from [^;]*\\b${r}\\b`, 'u'),
      )
    }
  })

  it('③ `enable` ET `force` — sinon le propriétaire contourne tout', () => {
    const sql = emettrePolitiquesSql(CPA)
    const enable = [...sql.matchAll(/enable row level security/gu)].length
    const force = [...sql.matchAll(/force row level security/gu)].length
    expect(enable, 'RLS n’est pas activée partout').toBe(CPA.length)
    expect(force, 'RLS n’est pas FORCÉE partout : le propriétaire passe outre')
      .toBe(CPA.length)
  })

  it('④ L’ORDRE DES GESTES — chacun défait le précédent s’il est inversé', () => {
    const sql = emettrePolitiquesSql([CPA[0]])
    // ── CE CONTRÔLE PASSAIT QUAND LE GESTE MANQUAIT, et c'est le pire
    // comportement possible pour un contrôle d'ordre.
    //
    // `indexOf` rend -1 sur une absence, et -1 est plus petit que TOUT :
    // « le revoke vient avant le grant » était donc vrai quand il n'y avait
    // plus de revoke du tout. Deux mutations l'ont montré — retirer la
    // révocation, retirer l'activation de la RLS — et les deux laissaient
    // le cliquet vert.
    //
    // Un rang se LIT maintenant, et une absence ARRÊTE.
    const rang = (motif: string): number => {
      const i = sql.indexOf(motif)
      expect(i, `« ${motif} » a disparu du script`).toBeGreaterThan(-1)
      return i
    }
    // Révoquer AVANT d'accorder : l'inverse retirerait ce qu'on vient de donner.
    expect(rang('revoke all'), 'le revoke passe après le grant')
      .toBeLessThan(rang('grant select'))
    // Activer la RLS avant de poser la politique : une politique sur une
    // table sans RLS ne s'applique à personne.
    expect(rang('enable row level security'), 'la politique précède l’activation')
      .toBeLessThan(rang('create policy'))
    // Retirer l'ancienne politique avant d'en poser une : sans ça, le second
    // passage du script échoue sur un doublon — et un script qu'on ne peut
    // pas rejouer est une intervention manuelle.
    expect(rang('drop policy if exists'), 'le drop passe après le create')
      .toBeLessThan(rang('create policy'))
  })

  it('⑤ `using (true)` N’EST JAMAIS DONNÉ À `anon` NI À `public`', () => {
    // ── LA DÉCISION ET LA FUITE SE RESSEMBLENT À UN MOT PRÈS.
    //
    // Pour le rôle CONNECTÉ, `using (true)` EST la décision du propriétaire :
    // une seule porte, aucun droit fin. Pour tout autre rôle, c'est une base
    // de données publiée en écriture.
    const sql = emettrePolitiquesSql(AVEC_JOURNAL)
    // ── MON PREMIER CONTRÔLE CONFONDAIT DEUX CHOSES QUI S'ÉCRIVENT PAREIL.
    //
    // Il cherchait le mot `public` dans la ligne entière. Or `public` est
    // AUSSI le nom du schéma : `grant … on public.client to authenticated`
    // contient le mot sans accorder quoi que ce soit à ce rôle. Le contrôle
    // accusait une ligne juste.
    //
    // On ne juge donc que la LISTE DES RÔLES — ce qui suit « to ».
    const rolesDe = (ligne: string): string =>
      ligne.slice(ligne.lastIndexOf(' to ') + 4).replace(/;.*$/u, '')

    const politiques = sql.split('\n').filter((x) => x.startsWith('create policy'))
    expect(politiques.length, 'aucune politique lue : le contrôle ne mesure rien')
      .toBe(AVEC_JOURNAL.length)
    for (const ligne of politiques) {
      const roles = rolesDe(ligne.slice(0, ligne.indexOf(' using ')))
      expect(roles, 'une politique ne nomme pas le rôle de la porte').toContain(ROLE_PORTE)
      for (const r of ROLES_REFUSES) {
        expect(roles, `une politique est accordée à ${r}`).not.toMatch(
          new RegExp(`\\b${r}\\b`, 'u'),
        )
      }
    }
    // Et aucun `grant` ne part vers un rôle refusé.
    const grants = sql.split('\n').filter((x) => x.startsWith('grant '))
    expect(grants.length, 'aucun grant lu : le contrôle ne mesure rien').toBeGreaterThan(0)
    for (const ligne of grants) {
      const roles = rolesDe(ligne)
      for (const r of ROLES_REFUSES) {
        expect(roles, `un grant part vers ${r}`).not.toMatch(new RegExp(`\\b${r}\\b`, 'u'))
      }
    }
  })

  it('⑥ AUCUNE DONNÉE DÉCLARÉE : LE FICHIER LE DIT', () => {
    // Même discipline que `schema.sql` : un fichier vide laisserait croire à
    // une base sans protection, un fichier absent à un oubli.
    const sql = emettrePolitiquesSql([])
    expect(sql).toBe(SANS_POLITIQUE)
    expect(sql, 'le fichier ne dit pas pourquoi il est vide').toMatch(/AUCUNE DONNÉE DÉCLARÉE/u)
    expect(sql, 'il contient une politique alors qu’il n’y a pas de table')
      .not.toContain('create policy')
  })

  it('⑦ CE CLIQUET NE PRÉTEND PAS À UNE PREUVE D’EXÉCUTION', () => {
    // ── UN CONTRÔLE QUI SE CROIT PLUS FORT QU'IL N'EST EST UN DANGER.
    //
    // Rien ici n'a touché un Postgres. SQLite ne peut pas aider : pas de
    // RLS, et `create policy` ne s'analyse même pas. Ce fichier mesure une
    // STRUCTURE ; la porte ne sera prouvée qu'au lot D4, en exerçant une
    // lecture anonyme sur une vraie base et en lisant `42501` dans le corps.
    //
    // Cette assertion existe pour que personne — moi compris — ne cite
    // EP-320 comme preuve que la porte tient.
    const sql = emettrePolitiquesSql(CPA)
    expect(sql, 'ce n’est que du texte : aucune base ne l’a exécuté').toContain('create policy')
    expect(
      sql.includes('create policy') && typeof sql === 'string',
      'EP-320 prouve une structure, jamais une protection',
    ).toBe(true)
  })
})
