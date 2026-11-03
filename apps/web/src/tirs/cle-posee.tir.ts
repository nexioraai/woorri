/**
 * TIR — LE DDL RÉELLEMENT POSÉ PORTE-T-IL LE DÉFAUT DE CLÉ ?
 *
 * ── LA QUESTION DU PROPRIÉTAIRE, ET POURQUOI ELLE VIENT AVANT ④.
 *
 * « Le schéma que la PUBLICATION pose aujourd'hui dans la base des œuvres —
 * celui que ④ va utiliser — porte-t-il `default gen_random_uuid()::text`
 * sur chaque clé primaire ? Montre-moi le DDL réellement posé, pas le
 * générateur. »
 *
 * Elle vient avant parce que si le défaut n'y est pas, ④ échoue à la
 * première inscription — et on l'aura appris en brûlant une génération.
 *
 * ── CE QUE LA LECTURE DU CODE DIT, ET POURQUOI ELLE NE SUFFIT PAS.
 *
 * `direct/route.ts:527` fait `emettreSchemaSql(entitesDeclarees)` sans
 * second argument, donc la variante `base`. Et `publier` ne ré-émet RIEN :
 * il pose `docPublie?.schema`, LA CHAÎNE STOCKÉE À LA GÉNÉRATION.
 *
 * Donc la lecture dit « oui pour une œuvre neuve ». Mais une lecture de
 * source ne dit pas ce que Postgres a retenu : c'est `column_default` dans
 * `information_schema` qui fait foi, et c'est lui qu'on lit.
 *
 * ── ET ON FAIT L'INSCRIPTION, pas seulement la lecture du catalogue.
 *
 * Un défaut présent dans le catalogue et une insertion qui réussit sans
 * identifiant sont deux faits différents. ④ a besoin du second.
 *
 * Ce tir ne dépense rien : aucun modèle n'est appelé.
 */
import { describe, expect, it } from 'vitest'
import { appendFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { emettreSchemaSql, emettrePolitiquesSql } from '@deribfy/compiler'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { nomSchemaOeuvre, poserOeuvre } from '@/lib/apps/poser-oeuvre'

const ID = `tircle${String(Date.now()).slice(-8)}`
const trace = (l: string) => appendFileSync('/tmp/cle.txt', l + '\n')

/** Les entités telles qu'un cahier réel les déclarerait. */
const ENTITES = [
  {
    id: 'ent_membre',
    name: 'membre',
    fields: [
      { id: 'fld_nom', name: 'nom', type: 'text' as const, required: true },
      { id: 'fld_telephone', name: 'telephone', type: 'text' as const, required: true, unique: true },
    ],
  },
  {
    id: 'ent_cotisation',
    name: 'cotisation',
    appendOnly: true,
    fields: [{ id: 'fld_montant', name: 'montant', type: 'number' as const, required: true }],
  },
]

describe('tir · la clé réellement posée', () => {
  it('porte son défaut dans le catalogue, et l’inscription passe sans identifiant', async () => {
    const cfg = configBaseOeuvres(process.env)
    expect(cfg.ok, cfg.ok ? '' : `base des œuvres indisponible : ${JSON.stringify(cfg)}`).toBe(true)
    if (!cfg.ok) return
    const connexion = process.env.OEUVRES_DATABASE_URL_POOLER_SESSION ?? ''
    expect(connexion, 'pas de connexion pour poser le schéma').not.toBe('')

    const schema = nomSchemaOeuvre(ID)
    const admin = createClient(cfg.config.url, cfg.config.cleSecrete, {
      auth: { persistSession: false },
    })
    const adresse = `tir.cle.${ID}@apps.deribfy.app`
    const motDePasse = `K-${ID}-xZ`
    let idCompte = ''

    // ── EXACTEMENT CE QUE LA GÉNÉRATION STOCKE : même expression, même
    //    absence de second argument. Si `direct/route.ts` changeait d'avis,
    //    ce tir le dirait.
    const schemaStocke = emettreSchemaSql(ENTITES)
    const politiquesStockees = emettrePolitiquesSql(ENTITES, ID)

    try {
      trace('-- LE DDL QUE LA GÉNÉRATION STOCKE (lignes de clé primaire)')
      for (const l of schemaStocke.split('\n').filter((x) => x.includes('primary key'))) {
        trace(`     ${l.trim()}`)
      }

      // ── LA POSE, par le code de production, avec la chaîne stockée.
      const pose = await poserOeuvre({
        id: ID,
        schemaSql: schemaStocke,
        politiquesSql: politiquesStockees,
        connexion,
      })
      expect(pose.ok, pose.ok ? '' : `pose refusée : ${JSON.stringify(pose)}`).toBe(true)

      // ── CE QUE POSTGRES A RETENU — le catalogue, pas notre chaîne.
      const { Client } = (await import('pg')) as unknown as {
        Client: new (c: { connectionString: string }) => {
          connect: () => Promise<void>
          query: (q: string) => Promise<{ rows: Record<string, unknown>[] }>
          end: () => Promise<void>
        }
      }
      const pg = new Client({ connectionString: connexion })
      await pg.connect()
      const cols = await pg.query(`
        select table_name, column_name, data_type, column_default
          from information_schema.columns
         where table_schema = '${schema}' and column_name = 'id'
         order by table_name`)
      await pg.end()

      trace('-- CE QUE POSTGRESQL A RETENU (information_schema.columns)')
      for (const c of cols.rows) {
        trace(
          `     ${String(c.table_name).padEnd(12)} ${String(c.column_name)} ${String(c.data_type).padEnd(5)} default = ${String(c.column_default ?? 'AUCUN')}`,
        )
      }
      expect(cols.rows.length, 'aucune table posée : le tir ne mesure rien').toBe(ENTITES.length)
      for (const c of cols.rows) {
        expect(
          String(c.column_default ?? ''),
          `la clé de « ${String(c.table_name)} » n’a PAS de défaut : la première inscription échouera`,
        ).toContain('gen_random_uuid')
      }

      // ── ET L'INSCRIPTION, par le chemin de l'application générée.
      //
      // Un défaut au catalogue et une écriture qui réussit sont deux faits
      // différents. ④ a besoin du second.
      const cree = await admin.auth.admin.createUser({
        email: adresse,
        password: motDePasse,
        email_confirm: true,
        app_metadata: { oeuvre: ID },
      })
      expect(cree.error, `création du compte : ${cree.error?.message ?? ''}`).toBeNull()
      idCompte = cree.data.user?.id ?? ''

      const base = createClient(cfg.config.url, cfg.config.clePubliable, {
        db: { schema },
        auth: { persistSession: false },
      })
      const session = await base.auth.signInWithPassword({ email: adresse, password: motDePasse })
      expect(session.error, `connexion : ${session.error?.message ?? ''}`).toBeNull()

      // PostgREST relit son cache de schéma de façon asynchrone : on attend
      // qu'il réponde, borné, et on le dit.
      let prete = false
      for (let essai = 1; essai <= 10 && !prete; essai += 1) {
        const sonde = await base.from('membre').select('id').limit(1)
        prete = sonde.error === null || sonde.error.code !== 'PGRST002'
        if (!prete) await new Promise((r) => setTimeout(r, 1500))
      }
      expect(prete, 'PostgREST n’a pas rechargé son cache en 15 s').toBe(true)

      trace('-- L’INSCRIPTION, SANS ENVOYER D’IDENTIFIANT')
      const ins = await base
        .from('membre')
        .insert({ nom: 'Awa', telephone: '66000001' })
        .select('id, nom')
        .single()
      trace(
        `     insert membre {nom, telephone} -> ${ins.error === null ? `OK  id = ${String((ins.data as { id: string }).id)}` : `ECHEC ${ins.error.code ?? ''} ${ins.error.message}`}`,
      )
      expect(
        ins.error,
        `LA PREMIÈRE INSCRIPTION ÉCHOUE : ${ins.error?.message ?? ''} — ④ serait brûlé pour rien`,
      ).toBeNull()

      // ET ON RELIT, parce que « ça s'écrit » et « ça se relit » sont deux
      // faits, et que ④ repose sur le second.
      const relu = await base.from('membre').select('id, nom')
      trace(
        `     relecture -> ${String(relu.data?.length ?? 0)} ligne(s) · nom = ${String(relu.data?.[0]?.nom ?? '—')}`,
      )
      expect(relu.data?.length, 'la ligne ne se relit pas').toBe(1)
    } finally {
      const { Client } = (await import('pg')) as unknown as {
        Client: new (c: { connectionString: string }) => {
          connect: () => Promise<void>
          query: (q: string) => Promise<{ rows: { rolconfig: string[] | null }[] }>
          end: () => Promise<void>
        }
      }
      const c = new Client({ connectionString: connexion })
      await c.connect()
      await c.query(`drop schema if exists ${schema} cascade`)
      // SUPPRIMER NE SUFFIT PAS : un schéma absent de la base mais présent
      // dans la liste exposée fait échouer le cache de PostgREST EN ENTIER.
      const lu = await c.query(
        "select rolconfig from pg_roles where rolname = 'authenticator'",
      )
      const reste = (
        (lu.rows[0]?.rolconfig ?? []).find((x) => x.startsWith('pgrst.db_schemas=')) ?? ''
      )
        .replace('pgrst.db_schemas=', '')
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x !== '' && x !== schema)
      await c.query(`alter role authenticator set pgrst.db_schemas = '${reste.join(', ')}'`)
      await c.query("notify pgrst, 'reload config'")
      await c.query("notify pgrst, 'reload schema'")
      await c.end()
      if (idCompte !== '') await admin.auth.admin.deleteUser(idCompte)
      trace(`-- NETTOYÉ : schéma ${schema}, liste désexposée, compte de mesure`)
    }
  }, 120_000)
})
