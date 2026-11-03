/**
 * EP-318bis · QUI REMPLIT LA CLÉ PRIMAIRE — exécuté sur les deux piles.
 *
 * ── TROIS MESURES, ET LES DEUX PREMIÈRES ÉTAIENT DES ÉCHECS INSTRUCTIFS.
 *
 * ① Sur la base des œuvres (PostgreSQL 17.6), sans défaut de clé :
 *      insert into membre (nom) values ('Awa')
 *      → null value in column "id" violates not-null constraint
 *    L'application générée écrit DIRECTEMENT par PostgREST : personne ne
 *    s'interpose. La PREMIÈRE inscription de chaque œuvre échouait.
 *
 * ② J'ai posé `default gen_random_uuid()::text`. La gate est tombée deux
 *    fois, chaque fois en disant la vérité :
 *      ERR_SQLITE_ERROR  near "(": syntax error     (pile sqlite)
 *      42883  No function matches the given name    (pile postgres)
 *    Le serveur Fastify émis tourne sur DEUX piles. Aucun dialecte ne les
 *    couvre : chercher la fonction portable était la mauvaise question.
 *
 * ③ Le serveur FABRIQUE DÉJÀ l'identifiant (`randomUUID()` dans
 *    emit-fastify). Il n'a jamais eu besoin d'un défaut — c'est pour ça que
 *    ce schéma marchait. La question n'est donc pas « quel dialecte » mais
 *    QUI REMPLIT.
 *
 * ── ET CE CLIQUET EXÉCUTE, parce que la lecture était verte les deux fois.
 *
 * Un `toContain('randomblob')` aurait été vert sur du SQL invalide. Trois
 * cliquets de lecture l'étaient quand la gate est tombée.
 */
import { describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { emettreSchemaSql } from '../src/schema-donnees.ts'

const ENTITES = [
  {
    id: 'ent_membre',
    name: 'membre',
    fields: [
      { id: 'fld_nom', name: 'nom', type: 'text' as const, required: true },
      { id: 'fld_montant', name: 'montant', type: 'number' as const, required: false },
    ],
  },
]

describe('EP-318bis · qui remplit la clé', () => {
  it('① LA VARIANTE DU SERVEUR EST PORTABLE — elle s’exécute sur SQLite', () => {
    // ── PORTABLE VEUT DIRE « AUCUN DÉFAUT », et c'est mesurable ici.
    //
    // Le serveur émis tourne sur sqlite ET sur postgres. Tout défaut
    // fabriqué par une fonction fait tomber au moins une des deux piles :
    // `randomblob` sur postgres, `gen_random_uuid` sur sqlite.
    const sql = emettreSchemaSql(ENTITES, 'serveur')
    expect(sql, 'un défaut de clé est revenu : une des deux piles tombera').not.toMatch(
      /primary key default/u,
    )
    const base = new DatabaseSync(':memory:')
    base.exec(sql)
    // Le serveur fournit l'identifiant — c'est son travail, et il le fait.
    base.exec("insert into membre (id, nom, montant) values ('u-1', 'Awa', 5000)")
    const lu = base.prepare('select id, nom from membre').all() as unknown as { id: string }[]
    expect(lu.length).toBe(1)
    expect(lu[0]?.id).toBe('u-1')
    // ── ET UN FAIT MESURÉ QU'ON N'AFFIRME PAS AUTREMENT.
    //
    // J'ai d'abord écrit ici « une écriture sans identifiant REFUSE ». C'est
    // faux : SQLite accepte un NULL dans une `text primary key` — une
    // tolérance historique qu'il garde par compatibilité. Mesuré, pas
    // supposé, et c'est la raison pour laquelle cette ligne est un
    // commentaire et non une assertion : affirmer l'inverse de ce qu'on
    // vient de mesurer serait pire que de ne rien dire.
    //
    // Ça ne met rien en danger ICI (le serveur fournit toujours
    // l'identifiant), mais c'est consigné : sur la pile sqlite, un serveur
    // qui l'oublierait écrirait NULL en silence.
    base.exec("insert into membre (nom) values ('Binta')")
    const sansId = base.prepare('select id from membre').all() as unknown as { id: string | null }[]
    expect(sansId.some((x) => x.id === null), 'SQLite a cessé de tolérer une clé nulle').toBe(true)
    base.close()
  })

  it('② LA VARIANTE DE LA BASE REMPLIT TOUTE SEULE — et c’est du PostgreSQL', () => {
    const sql = emettreSchemaSql(ENTITES, 'base')
    expect(sql, 'la base ne remplit plus la clé : la première inscription échouera').toContain(
      'default gen_random_uuid()::text',
    )
    // CONTRÔLE NÉGATIF : cette variante NE DOIT PAS passer sur SQLite. Sans
    // lui, un émetteur qui rendrait la variante portable dans les deux cas
    // serait vert — et l'œuvre publiée retomberait sur le défaut ①.
    const base = new DatabaseSync(':memory:')
    expect(() => {
      base.exec(sql)
    }, 'la variante de la base passe sur SQLite : les deux variantes sont confondues').toThrow()
    base.close()
  })

  it('③ LE DÉFAUT PAR DÉFAUT EST « BASE »', () => {
    // Un oubli d'argument doit donner la variante de Supabase : c'est elle
    // qui part dans le zip et sur la base des œuvres. L'inverse livrerait
    // une œuvre dont la première écriture échoue.
    expect(emettreSchemaSql(ENTITES)).toBe(emettreSchemaSql(ENTITES, 'base'))
  })

  /**
   * ── CE QU'ON NE CONTRÔLE PAS ICI, ET POURQUOI.
   *
   * J'ai voulu juger le DDL rendu par `enveloppeFastify`. Deux tentatives,
   * deux échecs de ma fixture : un AIR fabriqué à la main manque `app.slug`,
   * et l'œuvre du corpus rend `{"files":{}}` — l'enveloppe ne porte pas le
   * DDL sous cette forme.
   *
   * Je n'ai pas insisté, parce que la garde existe déjà et qu'elle est
   * MEILLEURE : la gate `backend_vivant` MONTE le serveur émis sur ses deux
   * piles, sqlite et PostgreSQL réel, et lui parle en HTTP. C'est elle qui
   * a attrapé les deux défauts de clé — `near "(": syntax error` puis
   * `42883` — pendant que trois cliquets de lecture étaient verts.
   *
   * Y ajouter un contrôle de source qui lit `"serveur"` dans l'appel
   * n'aurait rien mesuré de plus, et aurait pu être satisfait par un
   * commentaire. L'argument lui-même est gardé par EP-318 ⑥, côté
   * `apps/web`.
   */
})
