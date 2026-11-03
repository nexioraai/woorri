/**
 * TIR — LA PUBLICATION POSE-T-ELLE VRAIMENT LE SCHÉMA ET LE COMPTE ?
 *
 * ── CE QU'AUCUNE GATE NE PEUT DIRE.
 *
 * Les modules `poserOeuvre` et `assurerCompteOeuvre` étaient écrits, prouvés
 * sur la vraie base, et N'AVAIENT AUCUN APPELANT. C'est l'état dans lequel
 * du code peut rester des semaines sans que personne s'en aperçoive — le
 * dépôt l'a déjà vécu avec `extraction-exigences`.
 *
 * Ce tir appelle LA VRAIE ROUTE de publication et mesure la base AVANT et
 * APRÈS. Il ne dépense rien : aucun modèle n'est appelé.
 *
 * ── POURQUOI IL VIT DANS `src/tirs/` ET PAS DANS `lib/apps/__tests__`.
 *
 * `travailleur-isolation` interdit la séquence de suppression PARTOUT dans
 * `lib/apps`, sauf dans le banc jumelle. Il a refusé ce fichier, et il avait
 * raison : son nettoyage supprime des lignes, et un cliquet ne peut pas
 * distinguer « un tir qui range derrière lui » de « du code qui efface ».
 *
 * Élargir son exception aurait affaibli une garde réelle pour la commodité
 * d'un essai. Les tirs vivent donc à part — ce qui dit aussi ce qu'ils sont.
 *
 * ── IL NE TOURNE PAS DANS LA GATE.
 *
 * Il écrit dans deux bases réelles et nettoie derrière lui. La liste
 * `include` de la gate ne nomme pas `*.tir.ts` — voir `vitest.tir.config.ts`.
 */
import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import { emettrePolitiquesSql, emettreSchemaSql } from '@deribfy/compiler'
import { nomSchemaOeuvre } from '@/lib/apps/poser-oeuvre'
import { adresseCompteOeuvre } from '@/lib/apps/compte-oeuvre'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { POST } from '@/app/api/generateur/publier/route'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'

const ID = 'fa0ede2c-3d3d-4d3d-8d3d-3d3d3d3d3d3d'
const ENTITES = [{ id: 'ent_membre', fields: [{ id: 'fld_nom', type: 'text' }] }]

describe('TIR · la publication câble les données', () => {
  it('on publie une œuvre, et elle a son schéma et son compte', async () => {
    const S = nomSchemaOeuvre(ID)
    const D = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { persistSession: false } },
    )
    // ── LE TIR PASSE PAR LE LECTEUR UNIQUE, comme le produit.
    //
    // EP-321 ⑥ exige qu'UN SEUL module lise les variables de la base des
    // œuvres : deux lecteurs divergeraient, et c'est le second qui poserait
    // les tables au mauvais endroit. Il a refusé ce tir, et il avait raison —
    // exempter un fichier de mesure aurait ouvert la porte au suivant.
    //
    // Et c'est MIEUX pour le tir : il exerce désormais la garde d'égalité du
    // produit. Si la configuration désignait la base de Deribfy, il
    // échouerait ici au lieu de poser un schéma d'œuvre à côté de
    // `app_generations`.
    const cfg = configBaseOeuvres(process.env)
    expect(cfg.ok, `base des œuvres mal configurée : ${cfg.ok ? '' : cfg.refus.motif}`).toBe(true)
    if (!cfg.ok) return
    const admin = createClient(cfg.config.url, cfg.config.cleSecrete, {
      auth: { persistSession: false },
    })
    const c = new pg.Client({
      connectionString: process.env.OEUVRES_DATABASE_URL_POOLER_TRANSACTION,
      connectionTimeoutMillis: 15_000,
      ssl: { rejectUnauthorized: false },
    })
    await c.connect()
    const compte = async () =>
      (await admin.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find(
        (u) => u.email === adresseCompteOeuvre(ID),
      )
    const schemaExiste = async () =>
      (await c.query('select count(*) n from information_schema.schemata where schema_name=$1', [S]))
        .rows[0].n !== '0'

    try {
      await D.from(TABLE_GENERATIONS).delete().eq('id', ID)

      // ── UN COMPTE JETABLE, PLUTÔT QU'UNE VOIE D'OPÉRATEUR SUR LA ROUTE.
      //
      // `publier` exige une session, et elle a raison. Lui ajouter une porte
      // `CRON_SECRET` pour la commodité d'un tir élargirait l'atteignabilité
      // d'une route qui publie — pour un confort de mesure. On crée donc un
      // compte de mesure, on lui donne l'œuvre, et on le supprime après.
      //
      // Pas d'usurpation du propriétaire : son compte n'est pas touché.
      const compteTir = await D.auth.admin.createUser({
        email: `tir-cablage-${ID.slice(0, 8)}@mesure.deribfy.app`,
        password: 'tir-de-mesure-jetable-0000',
        email_confirm: true,
      })
      expect(compteTir.error, `compte de mesure non cree : ${String(compteTir.error?.message)}`)
        .toBeNull()
      const proprio = compteTir.data.user?.id as string
      const session = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        { auth: { persistSession: false } },
      ).auth.signInWithPassword({
        email: `tir-cablage-${ID.slice(0, 8)}@mesure.deribfy.app`,
        password: 'tir-de-mesure-jetable-0000',
      })
      expect(session.error, `session de mesure non obtenue : ${String(session.error?.message)}`)
        .toBeNull()
      const jetonTir = session.data.session?.access_token ?? ''
      await D.from(TABLE_GENERATIONS).insert({
        id: ID,
        owner_id: proprio,
        demande: 'tontine de mesure',
        nom: 'Tontine mesure',
        moteur: 'direct',
        statut: 'livree',
        ok: true,
        document: {
          fichiers: { 'index.tsx': 'x' },
          schema: emettreSchemaSql(ENTITES),
          politiques: emettrePolitiquesSql(ENTITES, ID),
        },
      })

      console.log('-- AVANT : schéma %s · compte %s',
        (await schemaExiste()) ? 'présent' : 'absent',
        (await compte()) ? 'présent' : 'absent')

      const rep = await POST(
        new Request(`https://www.deribfy.com/api/generateur/publier?id=${ID}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${jetonTir}` },
        }),
      )
      const corps = (await rep.json()) as {
        lien?: string
        compte?: { adresse: string; motDePasse: string | null } | null
        error?: string
        motif?: string
      }
      console.log('-- LA ROUTE : HTTP %d · %s', rep.status,
        corps.error !== undefined
          ? `${corps.error} — ${String(corps.motif)}`
          : `lien ${String(corps.lien).slice(0, 44)}… · compte ${String(corps.compte?.adresse)} · mot de passe ${String(corps.compte?.motDePasse?.length)} signes`)

      const tables = await c.query(
        'select table_name from information_schema.tables where table_schema=$1', [S])
      const pol = await c.query('select policyname from pg_policies where schemaname=$1', [S])
      const expose = await c.query("select rolconfig from pg_roles where rolname='authenticator'")
      const u = await compte()
      console.log('-- APRÈS : schéma %s · tables [%s] · politiques [%s] · exposé %s',
        (await schemaExiste()) ? 'présent' : 'ABSENT',
        tables.rows.map((r: { table_name: string }) => r.table_name).join(', '),
        pol.rows.map((r: { policyname: string }) => r.policyname).join(', '),
        JSON.stringify(expose.rows[0].rolconfig).includes(S) ? 'oui' : 'NON')
      console.log('-- COMPTE : %s · oeuvre=%s',
        u?.email ?? 'ABSENT', JSON.stringify(u?.app_metadata?.oeuvre ?? null))

      expect(rep.status, `la publication a échoué : ${String(corps.error)}`).toBe(200)
      expect(await schemaExiste(), 'le schéma n’a pas été posé').toBe(true)
      expect(tables.rows.length, 'aucune table dans le schéma').toBeGreaterThan(0)
      expect(pol.rows.length, 'aucune politique : la porte n’est pas posée').toBeGreaterThan(0)
      expect(u, 'le compte n’a pas été créé').toBeDefined()
      expect(u?.app_metadata?.oeuvre, 'le compte ne porte pas la revendication').toBe(ID)
      expect(corps.compte?.motDePasse, 'le mot de passe n’est pas rendu une fois').toBeTruthy()
    } finally {
      await D.from(TABLE_GENERATIONS).delete().eq('id', ID)
      await c.query('begin')
      await c.query('select pg_advisory_xact_lock(827311002)')
      await c.query('alter role authenticator reset pgrst.db_schemas')
      await c.query("notify pgrst, 'reload config'")
      await c.query('commit')
      await c.query(`drop schema if exists ${S} cascade`)
      await c.query("notify pgrst, 'reload schema'")
      const u = await compte()
      if (u !== undefined) await admin.auth.admin.deleteUser(u.id)
      // LE COMPTE DE MESURE PART AUSSI : un compte jetable qu'on oublie n'est
      // plus jetable, c'est une surface.
      const tir = (await D.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find(
        (x) => x.email === `tir-cablage-${ID.slice(0, 8)}@mesure.deribfy.app`,
      )
      if (tir !== undefined) await D.auth.admin.deleteUser(tir.id)
      console.log('-- NETTOYÉ : œuvre, schéma, inscription, compte d’œuvre, compte de mesure')
      await c.end()
    }
  })
})
