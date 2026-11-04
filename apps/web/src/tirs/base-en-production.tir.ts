/**
 * TIR — LA PAGE PUBLIÉE REÇOIT-ELLE SA BASE, EN PRODUCTION ?
 *
 * ── CE QUI DISTINGUE CE TIR DU PRÉCÉDENT, et c'est tout.
 *
 * `bandeau-apres-publication` importe la route et l'exécute DANS CE
 * PROCESSUS, avec `.env.local`. Il prouvait donc le code, jamais la
 * production — et le 2026-11-04 il est passé au vert pendant que
 * `window.DERIBFY_BASE.url` était vide chez Vercel, faute des variables
 * `OEUVRES_*`.
 *
 * Celui-ci appelle `https://www.deribfy.com` PAR HTTP. Tout ce qu'il
 * mesure vient du serveur en ligne.
 *
 * ── LES QUATRE MESURES, DANS L'ORDRE DEMANDÉ.
 *
 * ① la configuration de la base des œuvres est-elle acceptée là-bas ?
 *    On ne devine pas : si elle refuse, la route rend 503 avec son motif,
 *    et c'est ce motif qu'on imprime.
 * ② une œuvre AVEC données obtient-elle son schéma et son compte ?
 * ③ la page servie porte-t-elle une vraie adresse et une vraie clé ?
 * ④ le bandeau est-il là AVANT et absent APRÈS ?
 *
 * IL NE DÉPENSE RIEN AU MODÈLE : les fichiers de l'œuvre sont écrits à la
 * main. On ne mesure pas la génération, on mesure ce qui est SERVI.
 */
import { describe, expect, it } from 'vitest'
import { appendFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { emettreSchemaSql, emettrePolitiquesSql } from '@deribfy/compiler'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { nomSchemaOeuvre } from '@/lib/apps/poser-oeuvre'

const SITE = 'https://www.deribfy.com'
const trace = (l: string) => {
  appendFileSync('/tmp/prod.txt', l + '\n')
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
export function App() { return <div>Relevés</div> }
createRoot(document.getElementById('racine')).render(<App />)`

/** Ce que la page porte réellement, lu dans le document servi. */
function injectionDe(page: string): { url: string; schema: string } | null {
  const m = /window\.DERIBFY_BASE\s*=\s*Object\.freeze\((\{[\s\S]*?\})\);/u.exec(page)
  if (m === null) return null
  const o = JSON.parse(m[1] ?? '{}') as { url?: string; schema?: string }
  return { url: o.url ?? '', schema: o.schema ?? '' }
}

describe('tir · la base en production', () => {
  it('schéma posé, base injectée, bandeau avant et après', async () => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { persistSession: false } },
    )
    const marque = String(Date.now()).slice(-8)
    const adresse = `tir.prod.${marque}@mesure.deribfy.app`
    const motDePasse = `P-${marque}-xZ`
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
      const doc = (id: string) => ({
        fichiers: { 'index.tsx': CODE },
        schema: emettreSchemaSql(ENTITES),
        politiques: id === '' ? '' : emettrePolitiquesSql(ENTITES, id),
      })
      const ecrit = await supabaseAdmin
        .from(TABLE_GENERATIONS)
        .insert({
          owner_id: proprietaire,
          demande: 'tir production',
          moteur: 'direct',
          ok: true,
          statut: 'livree',
          document: doc(''),
        })
        .select('id')
        .single()
      expect(ecrit.error, `écriture : ${ecrit.error?.message ?? ''}`).toBeNull()
      idOeuvre = String(ecrit.data?.id ?? '')
      schema = nomSchemaOeuvre(idOeuvre)
      await supabaseAdmin
        .from(TABLE_GENERATIONS)
        .update({ document: doc(idOeuvre) })
        .eq('id', idOeuvre)

      const sess = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        { auth: { persistSession: false } },
      ).auth.signInWithPassword({ email: adresse, password: motDePasse })
      expect(sess.error, `connexion : ${sess.error?.message ?? ''}`).toBeNull()
      const jeton = sess.data.session?.access_token ?? ''

      // ── ④a LE BANDEAU AVANT PUBLICATION, sur l'aperçu servi en ligne.
      const avant = await fetch(`${SITE}/api/generateur/direct/${idOeuvre}`, {
        headers: { Authorization: `Bearer ${jeton}` },
      })
      const pageAvant = await avant.text()
      const injAvant = injectionDe(pageAvant)
      trace('-- ④a AVANT PUBLICATION (aperçu servi en ligne)')
      trace(`   HTTP ${String(avant.status)}`)
      trace(`   url injectée  : ${injAvant === null ? '(pas de bloc)' : injAvant.url === '' ? '(vide)' : injAvant.url}`)
      trace(`   bandeau aperçu : ${pageAvant.includes('sera créée à la publication') ? 'PRÉSENT' : 'absent'}`)

      // ── ①② LA PUBLICATION, PAR LE SITE EN LIGNE.
      const rep = await fetch(`${SITE}/api/generateur/publier?id=${idOeuvre}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jeton}` },
      })
      const corps = (await rep.json()) as {
        lien?: string
        error?: string
        motif?: string
        quoiFaire?: string
        compte?: { adresse?: string; etat?: string }
      }
      trace('')
      trace('-- ①② PUBLICATION PAR LE SITE EN LIGNE')
      trace(`   HTTP ${String(rep.status)}`)
      if (rep.status !== 200) {
        // LE MOTIF DU REFUS, LU — pas deviné. C'est `configBaseOeuvres` qui
        // le rédige quand une variable manque ou est mal formée.
        trace(`   error     : ${String(corps.error ?? '')}`)
        trace(`   motif     : ${String(corps.motif ?? '(aucun)')}`)
        trace(`   quoiFaire : ${String(corps.quoiFaire ?? '(aucun)')}`)
      } else {
        trace(`   lien   : ${String(corps.lien ?? '')}`)
        trace(`   compte : ${String(corps.compte?.adresse ?? '(absent)')}`)
      }
      expect(
        rep.status,
        `la publication a été refusée en production : ${String(corps.error ?? '')} — ${String(corps.motif ?? '')}`,
      ).toBe(200)

      // ── ② LE SCHÉMA EXISTE-T-IL VRAIMENT ? On interroge la base.
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
      await pg.end()
      trace(`   schéma : ${schema} — ${String(t.rows.length)} table(s) : ${t.rows.map((x) => String(x.table_name)).join(', ')}`)
      expect(t.rows.length, 'le schéma n’a pas été posé par la production').toBeGreaterThan(0)

      // ── ③④b LA PAGE PUBLIÉE, servie publiquement.
      const r = await fetch(String(corps.lien ?? ''), { redirect: 'follow' })
      const page = await r.text()
      const inj = injectionDe(page)
      trace('')
      trace('-- ③④b LA PAGE PUBLIÉE')
      trace(`   HTTP ${String(r.status)} · ${String(page.length)} signes`)
      trace(`   url injectée    : ${inj === null ? '(pas de bloc)' : inj.url === '' ? '(VIDE)' : inj.url}`)
      trace(`   schéma injecté  : ${inj === null ? '(pas de bloc)' : inj.schema === '' ? '(VIDE)' : inj.schema}`)
      trace(`   clé publiable   : ${page.includes('sb_publishable_') ? 'présente' : 'ABSENTE'}`)
      trace(`   bandeau         : ${/sera créée à la publication|n’est pas encore reliée/u.test(page) ? 'PRÉSENT' : 'absent'}`)

      // ③ CE QUI COMPTE EST L'INJECTION, pas le texte.
      expect(inj?.url ?? '', 'la page publiée ne reçoit pas l’adresse de sa base').not.toBe('')
      expect(inj?.schema ?? '', 'la page ne reçoit pas le schéma de SON œuvre').toBe(schema)
      expect(page.includes('sb_publishable_'), 'la clé publiable n’est pas injectée').toBe(true)
      // ④ ET LE BANDEAU S'EN VA.
      expect(
        /sera créée à la publication|n’est pas encore reliée/u.test(page),
        'le bandeau reste alors que la base est injectée',
      ).toBe(false)
      // ④a il était bien là AVANT : sans ça, son absence ne prouve rien.
      expect(
        pageAvant.includes('sera créée à la publication'),
        'l’aperçu n’annonçait pas que la base viendrait : le contrôle ne mesure rien',
      ).toBe(true)
    } finally {
      try {
        const { Client } = (await import('pg')) as unknown as {
          Client: new (c: { connectionString: string }) => {
            connect: () => Promise<void>
            query: (q: string) => Promise<{ rows: { rolconfig: string[] | null }[] }>
            end: () => Promise<void>
          }
        }
        const c = new Client({
          connectionString: process.env.OEUVRES_DATABASE_URL_POOLER_SESSION ?? '',
        })
        await c.connect()
        if (schema !== '') await c.query(`drop schema if exists ${schema} cascade`)
        const lu = await c.query("select rolconfig from pg_roles where rolname = 'authenticator'")
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
      if (idOeuvre !== '') await supabaseAdmin.from(TABLE_GENERATIONS).delete().eq('id', idOeuvre)
      if (proprietaire !== '') await admin.auth.admin.deleteUser(proprietaire)
      trace('')
      trace('-- NETTOYÉ : œuvre, schéma, liste désexposée, compte de mesure')
    }
  }, 180_000)
})
