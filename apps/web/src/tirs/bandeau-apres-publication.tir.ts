/**
 * TIR — APRÈS PUBLICATION, LE BANDEAU DISPARAÎT-IL ?
 *
 * ── LA QUESTION DU PROPRIÉTAIRE, 2026-11-04.
 *
 * L'aperçu affiche « Cette application n'est pas encore reliée à une
 * base ». Il ne demande pas une correction de texte : il demande si c'est
 * VRAI — et surtout si, une fois l'œuvre publiée et son schéma posé, le
 * bandeau s'en va.
 *
 * « Si le bandeau reste alors que le schéma existe, il ment — et c'est un
 *   défaut, pas une formulation. »
 *
 * ── CE QUE CE TIR FAIT, ET IL NE DÉPENSE RIEN.
 *
 * Il écrit une œuvre d'essai AVEC des tables, la publie par la VRAIE
 * route, puis récupère la page servie par `/p/<jeton>` — publique, aucune
 * authentification — et regarde ce qu'elle contient.
 *
 * Aucun modèle n'est appelé : les fichiers de l'œuvre sont écrits à la
 * main, et c'est suffisant — on ne mesure pas la génération, on mesure ce
 * que la page SERVIE porte.
 */
import { describe, expect, it } from 'vitest'
import { appendFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { emettreSchemaSql, emettrePolitiquesSql } from '@deribfy/compiler'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { nomSchemaOeuvre } from '@/lib/apps/poser-oeuvre'
import { POST } from '@/app/api/generateur/publier/route'

const trace = (l: string) => {
  appendFileSync('/tmp/bandeau.txt', l + '\n')
}

const ENTITES = [
  {
    id: 'ent_releve',
    name: 'releve',
    fields: [
      { id: 'fld_index', name: 'index', type: 'number' as const, required: true },
      { id: 'fld_date', name: 'date', type: 'date' as const, required: true },
    ],
  },
]

const CODE = `import { createRoot } from 'react-dom/client'
export function App() { return <div>Calcul de consommation</div> }
createRoot(document.getElementById('racine')).render(<App />)`

describe('tir · le bandeau après publication', () => {
  it('dit-il encore « pas reliée à une base » une fois le schéma posé ?', async () => {
    const cfg = configBaseOeuvres(process.env)
    expect(cfg.ok, 'base des œuvres indisponible').toBe(true)
    if (!cfg.ok) return

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { persistSession: false } },
    )
    const adresse = `tir.bandeau.${String(Date.now()).slice(-8)}@mesure.deribfy.app`
    const motDePasse = `B-${String(Date.now())}-xZ`
    const cree = await admin.auth.admin.createUser({
      email: adresse,
      password: motDePasse,
      email_confirm: true,
    })
    expect(cree.error, `compte de mesure : ${cree.error?.message ?? ''}`).toBeNull()
    const proprietaire = cree.data.user?.id ?? ''

    let idOeuvre = ''
    let schema = ''
    try {
      const ecrit = await supabaseAdmin
        .from(TABLE_GENERATIONS)
        .insert({
          owner_id: proprietaire,
          demande: 'tir du bandeau',
          moteur: 'direct',
          ok: true,
          statut: 'livree',
          document: {
            fichiers: { 'index.tsx': CODE },
            schema: emettreSchemaSql(ENTITES),
            politiques: '',
          },
        })
        .select('id')
        .single()
      expect(ecrit.error, `écriture de l’œuvre : ${ecrit.error?.message ?? ''}`).toBeNull()
      idOeuvre = String(ecrit.data?.id ?? '')
      schema = nomSchemaOeuvre(idOeuvre)
      // Les politiques CUISENT l'identifiant : on les pose une fois connu.
      await supabaseAdmin
        .from(TABLE_GENERATIONS)
        .update({
          document: {
            fichiers: { 'index.tsx': CODE },
            schema: emettreSchemaSql(ENTITES),
            politiques: emettrePolitiquesSql(ENTITES, idOeuvre),
          },
        })
        .eq('id', idOeuvre)

      const session = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        { auth: { persistSession: false } },
      ).auth.signInWithPassword({ email: adresse, password: motDePasse })
      expect(session.error, `connexion : ${session.error?.message ?? ''}`).toBeNull()

      const rep = await POST(
        new Request(`https://www.deribfy.com/api/generateur/publier?id=${idOeuvre}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.data.session?.access_token ?? ''}` },
        }),
      )
      const corps = (await rep.json()) as { lien?: string; error?: string; compte?: unknown }
      trace(`-- PUBLICATION : HTTP ${String(rep.status)}`)
      trace(`   lien   : ${String(corps.lien ?? corps.error ?? '')}`)
      trace(`   compte : ${corps.compte === undefined ? 'absent' : 'créé'}`)
      expect(rep.status, `publication refusée : ${String(corps.error ?? '')}`).toBe(200)

      // ── LE SCHÉMA EXISTE-T-IL VRAIMENT ? on interroge la base, on ne déduit pas.
      const { Client } = (await import('pg')) as unknown as {
        Client: new (c: { connectionString: string }) => {
          connect: () => Promise<void>
          query: (q: string) => Promise<{ rows: Record<string, unknown>[] }>
          end: () => Promise<void>
        }
      }
      const pg = new Client({
        connectionString: process.env.OEUVRES_DATABASE_URL_POOLER_SESSION ?? '',
      })
      await pg.connect()
      const t = await pg.query(
        `select table_name from information_schema.tables where table_schema = '${schema}'`,
      )
      trace(`-- SCHÉMA ${schema} : ${String(t.rows.length)} table(s) — ${t.rows.map((x) => String(x.table_name)).join(', ')}`)
      await pg.end()
      expect(t.rows.length, 'le schéma n’a pas été posé : le tir ne mesure rien').toBeGreaterThan(0)

      // ── ET LA PAGE SERVIE ? Publique, aucune authentification.
      const lien = String(corps.lien ?? '')
      const r = await fetch(lien, { redirect: 'follow' })
      const page = await r.text()
      const bandeau = page.includes('n’est pas encore reliée à une base')
      const m = /window\.DERIBFY_BASE\s*=\s*Object\.freeze\((\{[\s\S]*?\})\);/u.exec(page)
      const injecte = m === null ? null : (JSON.parse(m[1]) as Record<string, unknown>)
      trace('')
      trace(`-- PAGE SERVIE : ${lien}`)
      trace(`   HTTP ${String(r.status)} · ${String(page.length)} signes`)
      trace(`   window.DERIBFY_BASE.url    : ${String(injecte?.url ?? '(pas de bloc)')}`)
      trace(`   window.DERIBFY_BASE.schema : ${String(injecte?.schema ?? '(pas de bloc)')}`)
      trace(`   BANDEAU « pas reliée »     : ${bandeau ? 'PRÉSENT' : 'absent'}`)

      // ── LA QUESTION QUI COMPTE, ET ELLE N'EST PAS LE TEXTE.
      //
      // FAUX VERT DU 2026-11-04 : la premiere forme de ce tir ne cherchait
      // que l'ancienne phrase. Apres correction elle a disparu — remplacee
      // par celle de l'apercu — et le tir est passe au VERT alors que
      // `window.DERIBFY_BASE.url` etait TOUJOURS VIDE.
      //
      // Le bandeau est une CONSEQUENCE. Ce qui compte est l'injection :
      // une page sans adresse ne peut pas atteindre sa base, quel que soit
      // le texte qu'elle affiche.
      expect(
        String(injecte?.url ?? ''),
        'LA PAGE PUBLIEE NE RECOIT PAS SA BASE : le schema existe, le compte ' +
          'existe, et window.DERIBFY_BASE.url est vide',
      ).not.toBe('')
      expect(
        String(injecte?.schema ?? ''),
        'la page ne recoit pas le schema de SON oeuvre',
      ).toContain('oeuvre_')
      expect(
        bandeau,
        'LE BANDEAU MENT : le schéma existe, l’œuvre est publiée, et la page ' +
          'affiche encore « pas encore reliée à une base »',
      ).toBe(false)
    } finally {
      if (schema !== '') {
        try {
          const { Client } = (await import('pg')) as unknown as {
            Client: new (c: { connectionString: string }) => {
              connect: () => Promise<void>
              query: (q: string) => Promise<unknown>
              end: () => Promise<void>
            }
          }
          const c = new Client({
            connectionString: process.env.OEUVRES_DATABASE_URL_POOLER_SESSION ?? '',
          })
          await c.connect()
          await c.query(`drop schema if exists ${schema} cascade`)
          const lu = (await c.query(
            "select rolconfig from pg_roles where rolname = 'authenticator'",
          )) as { rows: { rolconfig: string[] | null }[] }
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
        } catch {
          /* le nettoyage ne doit rien emporter */
        }
      }
      if (idOeuvre !== '') await supabaseAdmin.from(TABLE_GENERATIONS).delete().eq('id', idOeuvre)
      if (proprietaire !== '') await admin.auth.admin.deleteUser(proprietaire)
      trace('-- NETTOYÉ : œuvre, schéma, liste désexposée, compte de mesure')
    }
  }, 180_000)
})
