/**
 * TIR · LA GARDE D'EXPOSITION — « tenter n'est pas réussir ».
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-05 SUR `snenak`.
 *
 *   le schéma oeuvre_15158240_… EXISTE, avec sa table `releve`
 *   la publication a RÉUSSI, la page est SERVIE, elle DÉMARRE
 *   et le schéma N'EST PAS dans la liste exposée à PostgREST
 *
 *   anon         → PGRST106 — Invalid schema: oeuvre_15158240_…
 *   service_role → PGRST106 — le MÊME
 *   témoin public → PGRST205 (erreur différente) : l'instrument est bon
 *
 * L'application affiche son écran de connexion et ne pourra JAMAIS lire
 * une ligne. Rien, nulle part, ne l'a dit.
 *
 * ── CE QUE LA MESURE A ÉCARTÉ, ET CE QU'ELLE N'A PAS TROUVÉ.
 *
 * Écarté : le code d'exposition manquait (il date du 11-02, l'œuvre du
 * 11-04) ; deux poses successives s'évincent (reproduit : A reste, B
 * s'ajoute) ; l'œuvre n'avait pas de table (elle porte `create table` ×1,
 * donc `poserOeuvre` a bien été appelé).
 *
 * NON TROUVÉ : la cause exacte. L'état d'alors a été réécrit depuis, et
 * je ne la devinerai pas. Ce tir ne prétend donc pas fermer la cause — il
 * ferme la CLASSE : quelle qu'elle soit, une exposition qui n'aboutit pas
 * cesse de passer pour un succès.
 *
 * ── IL NE DÉPENSE RIEN : deux schémas jetables, aucun appel de modèle.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { emettreSchemaSql, emettrePolitiquesSql } from '@deribfy/compiler'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { nomSchemaOeuvre, poserOeuvre } from '@/lib/apps/poser-oeuvre'

const marque = String(Date.now()).slice(-8)
const ID = `cccccccc-0000-4000-8000-${marque}0003`
const ENTITES = [
  { id: 'ent_piece', name: 'piece', fields: [{ id: 'fld_titre', name: 'titre', type: 'text' as const, required: true }] },
]

const connexionSession = (): string => process.env.OEUVRES_DATABASE_URL_POOLER_SESSION ?? ''

async function listeExposee(): Promise<readonly string[]> {
  const c = new Client({ connectionString: connexionSession(), ssl: { rejectUnauthorized: false } })
  await c.connect()
  const r = await c.query<{ rolconfig: string[] | null }>(
    "select rolconfig from pg_roles where rolname = 'authenticator'",
  )
  await c.end()
  const l = (r.rows[0]?.rolconfig ?? []).find((x) => x.startsWith('pgrst.db_schemas='))
  return (l === undefined ? '' : l.slice('pgrst.db_schemas='.length))
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '')
}

let nettoyer: (() => Promise<void>) | null = null
afterAll(async () => {
  if (nettoyer !== null) await nettoyer()
})

describe('tir · la garde d’exposition', () => {
  it(
    'une pose qui réussit a VÉRIFIÉ que le schéma est exposé',
    async () => {
      const cfg = configBaseOeuvres(process.env)
      expect(cfg.ok, cfg.ok ? '' : `base indisponible : ${JSON.stringify(cfg)}`).toBe(true)
      if (!cfg.ok) return
      const cx = process.env.OEUVRES_DATABASE_URL_POOLER_TRANSACTION ?? ''
      expect(cx, 'pas de connexion pour poser').not.toBe('')

      const schema = nomSchemaOeuvre(ID)
      nettoyer = async () => {
        const c = new Client({ connectionString: connexionSession(), ssl: { rejectUnauthorized: false } })
        await c.connect()
        await c.query(`drop schema if exists ${schema} cascade`)
        const reste = (await listeExposee()).filter((x) => x !== schema)
        await c.query(`alter role authenticator set pgrst.db_schemas = '${reste.join(',')}'`)
        await c.query("notify pgrst, 'reload config'")
        await c.end()
      }

      const avant = await listeExposee()
      expect(avant, 'le schéma d’essai existe déjà').not.toContain(schema)

      const pose = await poserOeuvre({
        id: ID,
        schemaSql: emettreSchemaSql(ENTITES),
        politiquesSql: emettrePolitiquesSql(ENTITES, ID),
        connexion: cx,
      })
      expect(pose.ok, pose.ok ? '' : `pose ratée : ${JSON.stringify(pose)}`).toBe(true)

      // ── CE QUE LA GARDE PROMET : un `ok` VÉRIFIÉ, pas espéré.
      //
      // C'est exactement ce que `snenak` n'a pas eu : un succès rendu sans
      // que personne n'ait relu la liste.
      const apres = await listeExposee()
      expect(apres, 'la pose a réussi et le schéma n’est pas exposé').toContain(schema)

      // ── ET LE SCHÉMA RÉPOND VRAIMENT, pas seulement « il est dans la
      //    liste ». « C'est écrit » et « ça arrive » sont deux choses :
      //    la liste pourrait porter le nom et PostgREST ne pas l'avoir
      //    rechargée.
      await new Promise((r) => setTimeout(r, 4000))
      const anon = createClient(cfg.config.url, cfg.config.clePubliable, {
        db: { schema },
        auth: { persistSession: false },
      })
      // ── `select('*')` ET PAS UN NOM DE COLONNE.
      //
      // Mon premier jet demandait `titre` et recevait `42703`
      // (colonne inconnue) : le nom d'une colonne vient de l'IDENTIFIANT
      // du champ moins son préfixe, jamais du nom affiché. L'erreur
      // prouvait déjà que PostgREST voyait le schéma — mais elle le
      // prouvait par accident, et un contrôle qui réussit par accident
      // échouera par accident.
      const r = await anon.from('piece').select('*').limit(1)
      // La table est PRIVÉE, donc le refus attendu est un PRIVILÈGE
      // (42501), jamais un SCHÉMA (PGRST106). C'est cette distinction qui
      // sépare « fermé » de « inatteignable ».
      expect(
        r.error?.code,
        `PostgREST ne voit pas le schéma : ${r.error?.message ?? '(aucune erreur)'}`,
      ).not.toBe('PGRST106')
      expect(r.error?.code, 'la table privée est devenue lisible').toBe('42501')

      // ── REPOSER EST IDEMPOTENT, ET VÉRIFIE ENCORE.
      //
      // Le second passage prend le chemin « rien à écrire » — celui qui
      // rendait `expose: false` sans rien relire. C'est le chemin le plus
      // silencieux des deux, donc celui qu'il faut exercer.
      const seconde = await poserOeuvre({
        id: ID,
        schemaSql: emettreSchemaSql(ENTITES),
        politiquesSql: emettrePolitiquesSql(ENTITES, ID),
        connexion: cx,
      })
      expect(seconde.ok, seconde.ok ? '' : `seconde pose ratée : ${JSON.stringify(seconde)}`).toBe(
        true,
      )
      expect(await listeExposee(), 'la seconde pose a perdu le schéma').toContain(schema)
    },
    10 * 60_000,
  )
})
