/**
 * TIR — « JOURNAL » EST-IL UNE RÈGLE OU UNE ÉTIQUETTE ?
 *
 * ── CE QUE LE DIFF DU 2026-11-03 A TROUVÉ.
 *
 * Trois endroits promettaient qu'un journal ne se réécrit pas :
 *
 * · la consigne : « cotisation (journal) — montant » ;
 * · le schéma émis : « -- JOURNAL : rien ne s'y réécrit ni s'y efface » ;
 * · le commentaire des politiques : « -- ── cotisation · journal ».
 *
 * Et la politique était `for all`. L'application générée pouvait réécrire et
 * effacer tout un journal de cotisations. C'est « vérité écran vs moteur » :
 * trois affirmations, aucun moteur derrière.
 *
 * ── CE TIR NE DÉPENSE RIEN.
 *
 * Aucun modèle n'est appelé. Il pose un schéma jetable sur la base des
 * œuvres, crée un compte jetable, et exerce les QUATRE verbes par PostgREST
 * — le chemin exact de l'application générée. Puis il nettoie tout.
 *
 * ── ET IL MESURE L'AVANT.
 *
 * Montrer que le journal refuse ne vaut que si l'on montre d'abord qu'il
 * laissait passer. La table normale sert de témoin dans le même tir : même
 * schéma, même compte, même jeton — seule la déclaration diffère.
 */
import { describe, expect, it } from 'vitest'
import { appendFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { emettreSchemaSql, emettrePolitiquesSql } from '@deribfy/compiler'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { nomSchemaOeuvre, poserOeuvre } from '@/lib/apps/poser-oeuvre'

const ID = `tirjournal${String(Date.now()).slice(-8)}`

const ENTITES = [
  {
    id: 'ent_membre',
    name: 'membre',
    fields: [{ id: 'fld_nom', name: 'nom', type: 'text' as const, required: true }],
  },
  {
    id: 'ent_cotisation',
    name: 'cotisation',
    appendOnly: true,
    fields: [{ id: 'fld_montant', name: 'montant', type: 'number' as const, required: true }],
  },
]

describe('tir · le journal appliqué', () => {
  it('ajoute, lit, et REFUSE de réécrire — par le chemin de l’application', async () => {
    const cfg = configBaseOeuvres(process.env)
    expect(cfg.ok, cfg.ok ? '' : `base des œuvres indisponible : ${JSON.stringify(cfg)}`).toBe(true)
    if (!cfg.ok) return
    const connexion = process.env.OEUVRES_DATABASE_URL_POOLER_SESSION ?? ''
    expect(connexion, 'pas de connexion pour poser le schéma').not.toBe('')

    const schema = nomSchemaOeuvre(ID)
    const admin = createClient(cfg.config.url, cfg.config.cleSecrete, {
      auth: { persistSession: false },
    })
    const adresse = `tir.journal.${ID}@apps.deribfy.app`
    const motDePasse = `J-${ID}-xZ`
    let idCompte = ''

    try {
      // ── LA POSE, par le code de production.
      const pose = await poserOeuvre({
        id: ID,
        schemaSql: emettreSchemaSql(ENTITES),
        politiquesSql: emettrePolitiquesSql(ENTITES, ID),
        connexion,
      })
      expect(pose.ok, pose.ok ? '' : `pose refusée : ${JSON.stringify(pose)}`).toBe(true)

      // ── LE COMPTE PORTE LA REVENDICATION, posée PAR LE SERVEUR.
      const cree = await admin.auth.admin.createUser({
        email: adresse,
        password: motDePasse,
        email_confirm: true,
        app_metadata: { oeuvre: ID },
      })
      expect(cree.error, `création du compte : ${cree.error?.message ?? ''}`).toBeNull()
      idCompte = cree.data.user?.id ?? ''

      // ── ET ON ENTRE COMME L'APPLICATION ENTRE : clé publiable + options.
      const base = createClient(cfg.config.url, cfg.config.clePubliable, {
        db: { schema },
        auth: { persistSession: false },
      })
      const session = await base.auth.signInWithPassword({ email: adresse, password: motDePasse })
      expect(session.error, `connexion : ${session.error?.message ?? ''}`).toBeNull()

      const trace = (l: string) => appendFileSync('/tmp/journal.txt', l + '\n')
      const dire = (quoi: string, e: { message: string; code?: string } | null) =>
        trace(`  ${quoi.padEnd(40)}${e === null ? 'PASSE' : `REFUSE  ${e.code ?? ''} ${e.message.slice(0, 64)}`}`)

      // ── POSTGREST RELIT SON CACHE DE SCHÉMA DE FAÇON ASYNCHRONE.
      //
      // Mesuré le 2026-11-03 : la première exécution est passée, la seconde a
      // rendu `PGRST002 Could not query the database for the schema cache.
      // Retrying.` — une COURSE DE TEMPS, pas un refus de droits. Le
      // `notify pgrst` de la pose est un signal, pas une barrière.
      //
      // On attend donc que le schéma réponde, borné. Et on le DIT : une
      // attente muette ferait passer un futur vrai refus pour de la lenteur.
      let prete = false
      for (let essai = 1; essai <= 10 && !prete; essai += 1) {
        const sonde = await base.from('membre').select('id').limit(1)
        prete = sonde.error === null || sonde.error.code !== 'PGRST002'
        if (!prete) await new Promise((r) => setTimeout(r, 1500))
      }
      expect(prete, 'PostgREST n’a pas rechargé son cache en 15 s').toBe(true)

      trace(`-- SCHÉMA ${schema}`)
      trace('-- TÉMOIN : une table NORMALE, même schéma, même jeton')
      const mIns = await base.from('membre').insert({ nom: 'Awa' }).select('id').single()
      dire('membre · ajout (sans id)', mIns.error)
      // ── LA CLÉ SE REMPLIT TOUTE SEULE, et c'est le second défaut du diff.
      expect(mIns.error, `ajout sans id refusé : ${mIns.error?.message ?? ''}`).toBeNull()
      expect(typeof mIns.data?.id, 'la base n’a pas rempli la clé').toBe('string')
      const idMembre = (mIns.data as { id: string }).id
      const mUpd = await base.from('membre').update({ nom: 'Awa B.' }).eq('id', idMembre)
      dire('membre · réécriture', mUpd.error)
      const mDel = await base.from('membre').delete().eq('id', idMembre)
      dire('membre · suppression', mDel.error)
      expect(mUpd.error, 'une table normale refuse la réécriture : le témoin ne vaut rien').toBeNull()
      expect(mDel.error, 'une table normale refuse la suppression : le témoin ne vaut rien').toBeNull()

      trace('-- LE JOURNAL : même tout, sauf la déclaration')
      const cIns = await base.from('cotisation').insert({ montant: 5000 }).select('id').single()
      dire('cotisation · ajout', cIns.error)
      expect(cIns.error, `le journal refuse l’ajout : ${cIns.error?.message ?? ''}`).toBeNull()
      const idCot = (cIns.data as { id: string }).id

      const cLue = await base.from('cotisation').select('montant')
      dire('cotisation · lecture', cLue.error)
      expect(cLue.error).toBeNull()
      expect(cLue.data?.length, 'le journal ne se relit pas').toBe(1)

      // ── CE QUI COMPTE : LES DEUX REFUS.
      const cUpd = await base.from('cotisation').update({ montant: 1 }).eq('id', idCot)
      dire('cotisation · réécriture', cUpd.error)
      const cDel = await base.from('cotisation').delete().eq('id', idCot)
      dire('cotisation · suppression', cDel.error)
      expect(
        cUpd.error,
        'UN JOURNAL SE RÉÉCRIT : la consigne, le schéma et les politiques le promettaient tous les trois',
      ).not.toBeNull()
      expect(cDel.error, 'UN JOURNAL S’EFFACE : la promesse est fausse').not.toBeNull()

      // Et la ligne est TOUJOURS LÀ, intacte — un refus qui laisse la donnée
      // modifiée serait pire qu'une absence de refus.
      const apres = await base.from('cotisation').select('montant')
      expect(apres.data?.[0]?.montant, 'la ligne du journal a bougé malgré le refus').toBe(5000)
      trace('  cotisation · montant après les deux refus : 5000 (intact)')
    } finally {
      const { Client } = (await import('pg')) as unknown as {
        Client: new (c: { connectionString: string }) => {
          connect: () => Promise<void>
          query: (q: string) => Promise<unknown>
          end: () => Promise<void>
        }
      }
      const c = new Client({ connectionString: connexion })
      await c.connect()
      await c.query(`drop schema if exists ${schema} cascade`)
      // ── SUPPRIMER NE SUFFIT PAS : un schéma absent de la base mais
      //    présent dans la liste exposée fait échouer le cache de PostgREST
      //    EN ENTIER — toutes les œuvres publiées cessent de répondre.
      //
      // `poserOeuvre` élague désormais à chaque pose, mais la convergence
      // n'arrive qu'à la publication SUIVANTE. Un tir qui laisse un mort
      // derrière lui casse la base jusque-là. Il remet donc l'état qu'il a
      // trouvé.
      const lu = await c.query(
        "select rolconfig from pg_roles where rolname = 'authenticator'",
      ) as { rows: { rolconfig: string[] | null }[] }
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
      appendFileSync('/tmp/journal.txt', `-- NETTOYÉ : schéma ${schema}, liste désexposée, compte de mesure\n`)
    }
  }, 120_000)
})
