/**
 * TIR · P2 — LA PORTE À DEUX RÉGIMES, SUR UNE VRAIE BASE.
 *
 * ── POURQUOI CE TIR DÉCIDE DU LOT, ET PAS LE CLIQUET.
 *
 * Rien dans `politiques-donnees.ts` n'a jamais touché un Postgres : SQLite
 * n'a pas de RLS et ne sait pas analyser `create policy`. Un cliquet peut
 * prouver la FORME du SQL émis — sa couverture, son ordre, l'absence de
 * porte ouverte. Il ne peut pas prouver qu'un visiteur SANS COMPTE lit, et
 * surtout qu'il n'écrit pas.
 *
 * P ouvre la lecture d'une base à des visiteurs anonymes. C'est le geste
 * où Lovable a exposé 303 points d'accès. Il ne se ferme pas sur une
 * lecture de source.
 *
 * ── CE QU'IL EXERCE, AVEC DE VRAIS JETONS.
 *
 *   ① une table DÉCLARÉE publique se LIT sans compte
 *   ② la MÊME table REFUSE l'écriture anonyme
 *   ③ une table NON déclarée refuse aussi la LECTURE
 *   ④ rendre une table publique dans l'œuvre A n'ouvre RIEN dans B
 *   ⑤ et redevenir privée REFERME — la politique orpheline est le piège
 *
 * ④ est le seul qui prouve que l'ouverture ne traverse pas l'isolation.
 * ⑤ est celui qu'on oublie : deux politiques permissives s'ADDITIONNENT
 * en RLS, donc une politique `anon` laissée en place rouvrirait la table
 * au premier `grant` suivant, en silence.
 *
 * ── IL NE DÉPENSE RIEN. Aucun appel de modèle : deux schémas jetables,
 * posés puis retirés. Pas de `exigerFeuVert()`.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { emettreSchemaSql, emettrePolitiquesSql } from '@deribfy/compiler'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { nomSchemaOeuvre, poserOeuvre } from '@/lib/apps/poser-oeuvre'

const marque = String(Date.now()).slice(-8)
const ID_A = `aaaaaaaa-0000-4000-8000-${marque}0001`
const ID_B = `bbbbbbbb-0000-4000-8000-${marque}0002`

const champ = { id: 'fld_titre', name: 'titre', type: 'text' as const, required: true }
/** `actualite` est DÉCLARÉE publique ; `soumission` ne l'est pas. */
const ENTITES = [
  { id: 'ent_actualite', name: 'actualite', lecturePublique: true, fields: [champ] },
  { id: 'ent_soumission', name: 'soumission', fields: [champ] },
]
/** L'œuvre B a les MÊMES noms de table, et AUCUNE n'est publique. */
const ENTITES_B = [
  { id: 'ent_actualite', name: 'actualite', fields: [champ] },
  { id: 'ent_soumission', name: 'soumission', fields: [champ] },
]

let nettoyer: (() => Promise<void>) | null = null
afterAll(async () => {
  if (nettoyer !== null) await nettoyer()
})

describe('tir · P2 · la porte à deux régimes', () => {
  it(
    'un visiteur sans compte LIT le public, et RIEN d’autre',
    async () => {
      const cfg = configBaseOeuvres(process.env)
      expect(cfg.ok, cfg.ok ? '' : `base indisponible : ${JSON.stringify(cfg)}`).toBe(true)
      if (!cfg.ok) return
      const connexion = process.env.OEUVRES_DATABASE_URL_POOLER_SESSION ?? ''
      expect(connexion, 'pas de connexion pour poser le schéma').not.toBe('')

      const schemaA = nomSchemaOeuvre(ID_A)
      const schemaB = nomSchemaOeuvre(ID_B)
      nettoyer = async () => {
        const c = new Client({ connectionString: connexion, ssl: { rejectUnauthorized: false } })
        await c.connect()
        for (const s of [schemaA, schemaB]) await c.query(`drop schema if exists ${s} cascade`)
        // LA LISTE EXPOSÉE SE NETTOIE AUSSI : un schéma retiré qui y reste
        // ferait grossir une valeur unique à chaque tir.
        const lu = await c.query<{ rolconfig: string[] | null }>(
          "select rolconfig from pg_roles where rolname = 'authenticator'",
        )
        const ligne = (lu.rows[0]?.rolconfig ?? []).find((x) => x.startsWith('pgrst.db_schemas='))
        if (ligne !== undefined) {
          const reste = ligne
            .slice('pgrst.db_schemas='.length)
            .split(',')
            .map((x) => x.trim())
            .filter((x) => x !== '' && x !== schemaA && x !== schemaB)
          await c.query(`alter role authenticator set pgrst.db_schemas = '${reste.join(',')}'`)
          await c.query("notify pgrst, 'reload config'")
        }
        await c.end()
      }

      for (const [id, ents] of [
        [ID_A, ENTITES],
        [ID_B, ENTITES_B],
      ] as const) {
        const pose = await poserOeuvre({
          id,
          schemaSql: emettreSchemaSql(ents),
          politiquesSql: emettrePolitiquesSql(ents, id),
          connexion,
        })
        expect(pose.ok, pose.ok ? '' : `pose ratée : ${JSON.stringify(pose)}`).toBe(true)
      }
      // PostgREST recharge sa configuration ; sans ce répit, les premières
      // requêtes rendraient PGRST106 sur un schéma pourtant exposé.
      await new Promise((r) => setTimeout(r, 4000))

      const anonA = createClient(cfg.config.url, cfg.config.clePubliable, {
        db: { schema: schemaA },
        auth: { persistSession: false },
      })
      const anonB = createClient(cfg.config.url, cfg.config.clePubliable, {
        db: { schema: schemaB },
        auth: { persistSession: false },
      })

      // ── ON SÈME PAR LA CONNEXION DIRECTE, et c'est une mesure qui
      //    m'a corrigé.
      //
      // Mon premier jet semait par la clé SECRÈTE via PostgREST et recevait
      // `42501 permission denied for schema`. `poserOeuvre` accorde
      // `usage on schema … to anon, authenticated` — PAS à `service_role`.
      // C'est juste : l'administration d'une œuvre passe par le SQL, pas
      // par sa porte publique.
      //
      // Et semer IMPORTE : lire zéro ligne d'une table VIDE ne distingue
      // pas « autorisé » de « refusé ». Un ① vert sur une table vide ne
      // prouverait rien du tout.
      const sql = new Client({ connectionString: connexion, ssl: { rejectUnauthorized: false } })
      await sql.connect()
      await sql.query(`set search_path to ${schemaA}, extensions`)
      for (const t of ['actualite', 'soumission']) {
        await sql.query(`insert into ${t} (titre) values ($1)`, [`graine ${t}`])
      }

      // ① LA TABLE PUBLIQUE SE LIT SANS COMPTE.
      const lu = await anonA.from('actualite').select('titre')
      expect(lu.error, `la table publique ne se lit pas : ${lu.error?.message ?? ''}`).toBeNull()
      expect(lu.data?.length ?? 0, 'la lecture publique rend zéro ligne').toBeGreaterThan(0)

      // ② ET ELLE REFUSE L'ÉCRITURE ANONYME. C'est la propriété qui compte :
      //    sans elle, n'importe qui publierait une actualité sur le portail.
      for (const [quoi, f] of [
        ['insert', () => anonA.from('actualite').insert({ titre: 'intrus' })],
        ['update', () => anonA.from('actualite').update({ titre: 'intrus' }).neq('titre', '')],
        ['delete', () => anonA.from('actualite').delete().neq('titre', '')],
      ] as const) {
        const r = await f()
        expect(r.error, `un visiteur sans compte a pu faire un ${quoi}`).not.toBeNull()
      }
      // ET RIEN N'A BOUGÉ : un refus qui écrirait quand même serait pire
      // qu'un refus absent. On relit par le SQL, pas par la porte — la
      // porte est l'objet du contrôle, elle ne peut pas en être le témoin.
      const apres = await sql.query<{ titre: string }>('select titre from actualite order by titre')
      expect(
        apres.rows.map((x) => x.titre),
        'une écriture anonyme a laissé une trace',
      ).toEqual(['graine actualite'])

      // ── LES DEUX BARRIÈRES SE MESURENT SÉPARÉMENT, ET C'EST UNE
      //    MUTATION QUI ME L'A APPRIS.
      //
      // Trois mutations n'ont PAS mordu : retirer le `grant`, l'élargir à
      // `insert`, ou passer la politique en `for all` — l'écriture restait
      // refusée à chaque fois, parce que L'AUTRE barrière tenait.
      //
      // C'est exactement la défense en profondeur qu'on voulait. Mais un
      // contrôle qui ne voit que le RÉSULTAT ne peut pas dire laquelle des
      // deux a tenu : le jour où l'une tombe, il resterait vert, et on
      // n'aurait plus qu'un mur sans le savoir.
      //
      // On mesure donc l'ÉTAT DE LA BASE, barrière par barrière.
      const privileges = await sql.query<{ table_name: string; privilege_type: string }>(
        `select table_name, privilege_type from information_schema.role_table_grants
         where table_schema = $1 and grantee = 'anon' order by table_name, privilege_type`,
        [schemaA],
      )
      expect(
        privileges.rows.map((r) => `${r.table_name}:${r.privilege_type}`),
        'les privilèges d’anon ne sont pas EXACTEMENT « lire actualite »',
      ).toEqual(['actualite:SELECT'])

      const politiques = await sql.query<{ tablename: string; policyname: string; cmd: string; roles: string }>(
        `select tablename, policyname, cmd, roles::text as roles from pg_policies
         where schemaname = $1 and roles::text like '%anon%' order by policyname`,
        [schemaA],
      )
      expect(
        politiques.rows.map((r) => `${r.tablename}:${r.cmd}`),
        'les politiques ouvertes à anon ne sont pas EXACTEMENT « lire actualite »',
      ).toEqual(['actualite:SELECT'])

      // ③ UNE TABLE NON DÉCLARÉE REFUSE AUSSI LA LECTURE.
      const prive = await anonA.from('soumission').select('titre')
      expect(prive.error, 'une table non déclarée se lit sans compte').not.toBeNull()
      expect(prive.data ?? [], 'une table non déclarée rend des lignes').toEqual([])

      // ④ ET L'OUVERTURE NE TRAVERSE PAS L'ISOLATION.
      //
      // `actualite` existe dans les DEUX œuvres, publique dans A seulement.
      // Si l'ouverture passait par le nom de la table plutôt que par son
      // schéma, B s'ouvrirait aussi — et chaque client ouvrirait les autres.
      const chezB = await anonB.from('actualite').select('titre')
      expect(chezB.error, 'rendre une table publique dans A a ouvert B').not.toBeNull()

      // ⑤ ET REDEVENIR PRIVÉE REFERME POUR DE BON.
      //
      // On rejoue les politiques de A avec la MÊME déclaration, drapeau
      // retiré. Sans le `drop policy if exists … _lecture_publique`
      // inconditionnel, la politique `anon` survivrait et la table
      // resterait lisible — en silence.
      await sql.query(emettrePolitiquesSql(ENTITES_B, ID_A))
      await sql.end()
      await new Promise((r) => setTimeout(r, 1500))
      const refermee = await anonA.from('actualite').select('titre')
      expect(refermee.error, 'une table redevenue privée reste lisible').not.toBeNull()

      // ── ET LES DEUX BARRIÈRES SONT RETIRÉES, PAS SEULEMENT UNE.
      //
      // Le refus ci-dessus est satisfait par le seul `revoke`. La
      // POLITIQUE, elle, peut survivre — et une politique orpheline
      // redeviendrait vivante au premier `grant select` suivant, en
      // silence. C'est le piège que le `drop … _lecture_publique`
      // inconditionnel ferme, et sans cette mesure rien ne le prouverait.
      const apresFermeture = new Client({
        connectionString: connexion,
        ssl: { rejectUnauthorized: false },
      })
      await apresFermeture.connect()
      const restes = await apresFermeture.query<{ policyname: string }>(
        `select policyname from pg_policies where schemaname = $1 and roles::text like '%anon%'`,
        [schemaA],
      )
      const grants = await apresFermeture.query<{ privilege_type: string }>(
        `select privilege_type from information_schema.role_table_grants
         where table_schema = $1 and grantee = 'anon'`,
        [schemaA],
      )
      await apresFermeture.end()
      expect(
        restes.rows.map((r) => r.policyname),
        'une politique ouverte à anon a survécu à la fermeture',
      ).toEqual([])
      expect(
        grants.rows.map((r) => r.privilege_type),
        'un privilège d’anon a survécu à la fermeture',
      ).toEqual([])
    },
    10 * 60_000,
  )
})
