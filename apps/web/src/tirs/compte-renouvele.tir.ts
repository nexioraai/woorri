/**
 * TIR — LE MOT DE PASSE REFAIT OUVRE-T-IL VRAIMENT LA PORTE ?
 *
 * ── CE QUE LE PROPRIÉTAIRE DEMANDE DE MESURER, 2026-11-04.
 *
 * Le panneau de l'atelier et sa route `/api/generateur/compte` ont été
 * bâtis le 2026-11-03 (bee9d32b, D4 ④). La question n'est donc pas de les
 * réécrire : c'est de savoir s'ils FONCTIONNENT en production.
 *
 *     « le panneau apparaît-il dans l'atelier, le bouton rend-il un
 *       nouveau mot de passe, et la connexion à l'application
 *       fonctionne-t-elle avec ? »
 *
 * ── ET LA DERNIÈRE ÉTAPE EST SA PREUVE FINALE, MÉCANISÉE.
 *
 * Se connecter ne suffit pas. Un compte peut s'authentifier et n'avoir le
 * droit de rien : la porte lit `app_metadata.oeuvre`, pas « connecté ».
 * Ce tir va donc jusqu'au bout — il ÉCRIT une ligne et la RELIT, avec le
 * mot de passe refait, par la clé publiable et les options que la page
 * reçoit. C'est exactement ce que le propriétaire fera à la main.
 *
 * ── CE QU'IL NE FAIT PAS.
 *
 * Il ne mesure pas l'AFFICHAGE du panneau : un tir HTTP ne clique pas.
 * C'est EP-324 ⑧ qui garde l'écran. Ici on mesure ce que l'écran APPELLE,
 * en production, et ce que ça rend.
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
  appendFileSync('/tmp/compte.txt', l + '\n')
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
export function App() { return <div>Consommation</div> }
createRoot(document.getElementById('racine')).render(<App />)`

describe('tir · le compte d’une œuvre, renouvelé en production', () => {
  it('le panneau répond, le bouton refait la clé, et la clé écrit', async () => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { persistSession: false } },
    )
    const marque = String(Date.now()).slice(-8)
    const adresseProprietaire = `tir.compte.${marque}@mesure.deribfy.app`
    const motDePasseProprietaire = `C-${marque}-xZ`
    const cree = await admin.auth.admin.createUser({
      email: adresseProprietaire,
      password: motDePasseProprietaire,
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
          demande: 'tir du compte renouvele',
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
      ).auth.signInWithPassword({
        email: adresseProprietaire,
        password: motDePasseProprietaire,
      })
      expect(sess.error, `connexion : ${sess.error?.message ?? ''}`).toBeNull()
      const jeton = sess.data.session?.access_token ?? ''
      const entete = { Authorization: `Bearer ${jeton}` }

      // ── ① LE PANNEAU AVANT PUBLICATION : il doit dire « non-publiee »,
      //    pas « actif ». Un panneau qui annonce un compte inexistant
      //    enverrait le propriétaire chercher un mot de passe qui n'est pas.
      const g0 = await fetch(`${SITE}/api/generateur/compte?id=${idOeuvre}`, { headers: entete })
      const e0 = (await g0.json()) as { etat?: string; adresse?: string }
      trace('-- ① LE PANNEAU AVANT PUBLICATION')
      trace(`   HTTP ${String(g0.status)} · etat : ${String(e0.etat ?? '(aucun)')}`)
      expect(e0.etat, 'avant publication le panneau annonce un compte').toBe('non-publiee')

      // ── ② LA PUBLICATION, par le site en ligne.
      const p = await fetch(`${SITE}/api/generateur/publier?id=${idOeuvre}`, {
        method: 'POST',
        headers: entete,
      })
      const cp = (await p.json()) as { lien?: string; error?: string; motif?: string }
      trace('')
      trace('-- ② PUBLICATION')
      trace(`   HTTP ${String(p.status)} · ${String(cp.lien ?? cp.error ?? '')}`)
      expect(p.status, `publication refusée : ${String(cp.error ?? '')} ${String(cp.motif ?? '')}`).toBe(200)

      // ── ③ LE PANNEAU APRÈS PUBLICATION : actif, avec son adresse.
      const g1 = await fetch(`${SITE}/api/generateur/compte?id=${idOeuvre}`, { headers: entete })
      const e1 = (await g1.json()) as { etat?: string; adresse?: string }
      trace('')
      trace('-- ③ LE PANNEAU APRÈS PUBLICATION')
      trace(`   HTTP ${String(g1.status)} · etat : ${String(e1.etat ?? '')}`)
      trace(`   adresse : ${String(e1.adresse ?? '(absente)')}`)
      expect(e1.etat, 'le panneau ne voit pas le compte de l’œuvre publiée').toBe('actif')
      expect(String(e1.adresse ?? ''), 'le panneau n’affiche aucune adresse').toContain('@')
      // LE MOT DE PASSE N'EST JAMAIS RELU : le GET ne doit pas le porter.
      expect(
        JSON.stringify(e1).includes('motDePasse'),
        'le GET relit un mot de passe — on ne relit pas un mot de passe',
      ).toBe(false)

      // ── ④ LE BOUTON « REFAIRE LE MOT DE PASSE ».
      const r = await fetch(`${SITE}/api/generateur/compte?id=${idOeuvre}`, {
        method: 'POST',
        headers: entete,
      })
      const cr = (await r.json()) as { adresse?: string; motDePasse?: string; error?: string }
      const neuf = String(cr.motDePasse ?? '')
      trace('')
      trace('-- ④ LE BOUTON « REFAIRE LE MOT DE PASSE »')
      trace(`   HTTP ${String(r.status)}`)
      trace(`   adresse     : ${String(cr.adresse ?? '')}`)
      trace(`   mot de passe: ${neuf === '' ? '(ABSENT)' : `${String(neuf.length)} signes`}`)
      expect(r.status, `le renouvellement a échoué : ${String(cr.error ?? '')}`).toBe(200)
      expect(neuf.length, 'le renouvellement ne rend aucun mot de passe').toBeGreaterThan(20)

      // ── ⑤ ET LA PORTE S'OUVRE-T-ELLE AVEC ? C'est la seule question.
      //
      // On emploie EXACTEMENT ce que la page reçoit : l'adresse du projet,
      // la clé publiable, et `options` — pas la clé secrète, pas d'en-tête
      // posé à la main.
      const page = await fetch(String(cp.lien ?? ''), { redirect: 'follow' })
      const html = await page.text()
      const m = /window\.DERIBFY_BASE\s*=\s*Object\.freeze\((\{[\s\S]*?\})\);/u.exec(html)
      expect(m, 'la page publiée ne porte aucune configuration').not.toBeNull()
      const b = JSON.parse(m?.[1] ?? '{}') as {
        url: string
        clePubliable: string
        schema: string
        options: Record<string, unknown>
      }
      trace('')
      trace('-- ⑤ LA PORTE, AVEC LE MOT DE PASSE REFAIT')
      trace(`   options servies : ${JSON.stringify(b.options)}`)
      expect(
        JSON.stringify(b.options),
        'les options servies ne dirigent pas l’écriture vers le schéma',
      ).toContain(b.schema)

      const appli = createClient(b.url, b.clePubliable, b.options)
      const co = await appli.auth.signInWithPassword({
        email: String(cr.adresse ?? ''),
        password: neuf,
      })
      trace(`   connexion : ${co.error === null ? 'OK' : `ÉCHEC — ${co.error.message}`}`)
      expect(co.error, `la connexion échoue avec le mot de passe refait : ${co.error?.message ?? ''}`).toBeNull()
      // LA REVENDICATION EST POSÉE PAR LE SERVEUR, et c'est elle que la
      // porte lit. Sans elle la connexion réussit et ne donne accès à rien.
      const revendication = (co.data.user?.app_metadata as { oeuvre?: string } | undefined)?.oeuvre
      trace(`   app_metadata.oeuvre : ${String(revendication ?? '(ABSENTE)')}`)
      expect(revendication, 'le compte ne porte pas la revendication de son œuvre').toBe(idOeuvre)

      // ── LA PREUVE FINALE, MÉCANISÉE : on écrit deux relevés, on relit.
      const dep = await appli.from('releve').insert([
        { index: 1240, date: '2026-11-01' },
        { index: 1298, date: '2026-11-04' },
      ])
      trace(`   écriture  : ${dep.error === null ? 'OK' : `ÉCHEC — ${dep.error.code ?? ''} ${dep.error.message}`}`)
      expect(dep.error, `l’écriture échoue : ${dep.error?.code ?? ''} ${dep.error?.message ?? ''}`).toBeNull()

      // RELECTURE PAR UNE AUTRE SESSION : c'est ce que fait un rechargement.
      // Relire par le même client prouverait un cache, pas une persistance.
      const apres = createClient(b.url, b.clePubliable, b.options)
      await apres.auth.signInWithPassword({
        email: String(cr.adresse ?? ''),
        password: neuf,
      })
      const lu = await apres.from('releve').select('index, date').order('index')
      trace(
        `   relecture : ${lu.error === null ? `${String(lu.data?.length ?? 0)} ligne(s) — ${JSON.stringify(lu.data)}` : `ÉCHEC — ${lu.error.message}`}`,
      )
      expect(lu.error, `la relecture échoue : ${lu.error?.message ?? ''}`).toBeNull()
      expect(lu.data?.length, 'les relevés n’ont pas été conservés').toBe(2)
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
      // LE COMPTE DE L'ŒUVRE vit dans le projet DES ŒUVRES, pas ici.
      try {
        // ── ON PASSE PAR LE MODULE UNIQUE, pas par `process.env`.
        //
        // EP-321 ⑥ exige qu'UN SEUL module lise les variables des œuvres :
        // deux lecteurs divergeraient, et c'est le second qui poserait les
        // tables au mauvais endroit. Un tir n'a aucune raison d'être
        // l'exception — il mesure la production, il ne redéfinit pas sa
        // configuration.
        const { configBaseOeuvres } = await import('@/lib/apps/base-oeuvres')
        const cfg = configBaseOeuvres(process.env)
        if (!cfg.ok) throw new Error(cfg.refus.motif)
        const oeuvres = createClient(cfg.config.url, cfg.config.cleSecrete, {
          auth: { persistSession: false },
        })
        const { adresseCompteOeuvre } = await import('@/lib/apps/compte-oeuvre')
        const vise = adresseCompteOeuvre(idOeuvre)
        const l = await oeuvres.auth.admin.listUsers({ page: 1, perPage: 200 })
        const t = l.data.users.find((u) => u.email === vise)
        if (t !== undefined) await oeuvres.auth.admin.deleteUser(t.id)
      } catch {
        /* idem */
      }
      if (idOeuvre !== '') await supabaseAdmin.from(TABLE_GENERATIONS).delete().eq('id', idOeuvre)
      if (proprietaire !== '') await admin.auth.admin.deleteUser(proprietaire)
      trace('')
      trace('-- NETTOYÉ : œuvre, schéma, liste désexposée, compte d’œuvre, compte de mesure')
    }
  }, 240_000)
})
