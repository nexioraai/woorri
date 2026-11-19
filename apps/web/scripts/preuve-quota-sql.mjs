#!/usr/bin/env node
/**
 * PREUVE DE L'ÉTAPE ① DU QUOTA — sur un Postgres 17 JETABLE, jamais la production.
 *
 *   node scripts/preuve-quota-sql.mjs
 *
 * Crée une base dans un dossier temporaire, y pose le strict nécessaire de ce
 * que Supabase fournit (rôles anon / authenticated / service_role, une table
 * app_generations réduite à ses colonnes lues), applique
 * supabase/sql/quota_modifications.sql DEUX FOIS (idempotence), puis vérifie
 * chaque règle. Chaque ligne dit ce qu'elle prouve ; une seule fausse → code 1.
 * La base est détruite à la fin.
 *
 * Il exige `initdb` et `pg_ctl` (Postgres 17) dans le PATH.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const ICI = dirname(fileURLToPath(import.meta.url))
const SQL = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_modifications.sql'), 'utf8')
const ANNULATION = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_modifications_annulation.sql'), 'utf8')
const CREATIONS = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_creations.sql'), 'utf8')
const PORT = 54000 + Math.floor(Math.random() * 900)
const DOSSIER = mkdtempSync(join(tmpdir(), 'preuve-quota-'))
const URL = `postgresql://postgres@127.0.0.1:${PORT}/postgres`

let echecs = 0
const verdict = (ok, quoi) => { if (!ok) echecs += 1; console.log(`${ok ? '✓' : '✗'} ${quoi}`) }
const refuse = async (c, sql, params, motif) => {
  try { await c.query(sql, params); return false } catch (e) { return motif === undefined || String(e.message).includes(motif) }
}

execFileSync('initdb', ['-D', DOSSIER, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' })
execFileSync('pg_ctl', ['-D', DOSSIER, '-o', `-p ${PORT} -k ${DOSSIER}`, '-l', join(DOSSIER, 'journal'), '-w', 'start'], { stdio: 'ignore' })

const admin = new pg.Client({ connectionString: URL })
try {
  await admin.connect()
  // Ce que Supabase fournit, réduit au nécessaire.
  await admin.query(`
    create role anon nologin; create role authenticated nologin;
    create role service_role nologin bypassrls;
    create role testeur_service login bypassrls in role service_role;
    create role testeur_anon login in role anon;
    grant usage on schema public to anon, authenticated, service_role;
    create table public.app_generations (id uuid primary key, owner_id uuid, statut text not null, publication_jeton text);
    grant select on public.app_generations to service_role;
  `)
  const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222'
  const PROPRIO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', AUTRE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const PUBLIEE = '33333333-3333-4333-8333-333333333333', SUPPRIMEE = '44444444-4444-4444-8444-444444444444'
  await admin.query(`insert into public.app_generations values
    ($1, $5, 'livree', null), ($2, $6, 'livree', null), ($3, $5, 'livree', 'jeton'), ($4, $5, 'supprimee', 'jeton')`,
    [A, B, PUBLIEE, SUPPRIMEE, PROPRIO, AUTRE])

  // ── Appliqué deux fois : idempotent.
  await admin.query(SQL)
  await admin.query(SQL)
  await admin.query(CREATIONS)
  await admin.query(CREATIONS)
  const reg = await admin.query('select count(*)::int n from public.quota_reglages')
  verdict(reg.rows[0].n === 9, 'appliqué deux fois : 9 réglages, pas 18 (idempotent)')

  // ── Les applis publiées : offertes jusqu'au 31 décembre, une ligne chacune.
  const off = await admin.query(`select app_id, jusqu_au from public.app_paiements where fournisseur = 'offert'`)
  verdict(off.rows.length === 1 && off.rows[0].app_id === PUBLIEE, 'appli publiée : une ligne « offert », même après deux passages ; la supprimée n’en a pas')
  verdict(off.rows[0]?.jusqu_au.toISOString() === '2026-12-31T23:59:59.000Z', 'payée jusqu’au 2026-12-31 23:59:59 UTC')

  // Le reste se joue avec la clé de service, comme Deribfy.
  const svc = new pg.Client({ connectionString: `postgresql://testeur_service@127.0.0.1:${PORT}/postgres` })
  await svc.connect()

  // ── Concurrence : 12 clics simultanés sur une appli gratuite (limite 3).
  const clics = await Promise.all(Array.from({ length: 12 }, async () => {
    const c = new pg.Client({ connectionString: `postgresql://testeur_service@127.0.0.1:${PORT}/postgres` })
    await c.connect()
    const r = await c.query('select public.reserver_modification($1, $2) r', [A, PROPRIO])
    await c.end()
    return r.rows[0].r
  }))
  const passes = clics.filter((r) => r !== null).sort()
  verdict(passes.length === 3 && passes.join(',') === '0,1,2', `12 clics simultanés, appli gratuite : 3 passent (restantes ${passes.join(', ')}), 9 refusés`)

  // ── Une modification refusée ne compte pas.
  await svc.query('select public.liberer_modification($1, $2)', [A, PROPRIO])
  const apres = await svc.query('select public.reserver_modification($1, $2) r', [A, PROPRIO])
  verdict(apres.rows[0].r === 0, 'une refusée libérée : une réservation repasse')

  // ── Une appli d'un autre compte : refus nommé.
  verdict(await refuse(svc, 'select public.reserver_modification($1, $2)', [B, PROPRIO], 'QUOTA_APPLI_ETRANGERE'), 'réserver pour l’appli d’un autre compte : refusé')
  verdict(await refuse(svc, `select public.enregistrer_paiement('automatique','stripe','in_x',$1,$2,'abonnement',20,'USD',null,'webhook')`, [B, PROPRIO], 'PAIEMENT_APPLI_ETRANGERE'), 'payer pour l’appli d’un autre compte : refusé')

  // ── Paiement Stripe : abonnée, compteur à zéro, limite figée à 50.
  const p1 = await svc.query(`select public.enregistrer_paiement('automatique','stripe','in_1',$1,$2,'abonnement',20,'USD',now() + interval '30 days','webhook') r`, [A, PROPRIO])
  const c1 = await svc.query('select statut, limite, utilisees from public.app_compteurs where app_id = $1', [A])
  verdict(p1.rows[0].r.statut === 'enregistre' && c1.rows[0].statut === 'abonnee' && c1.rows[0].limite === 50 && c1.rows[0].utilisees === 0, 'paiement Stripe : abonnée, limite 50, compteur à zéro')

  // ── La même facture reçue deux fois : une seule ligne.
  const p2 = await svc.query(`select public.enregistrer_paiement('automatique','stripe','in_1',$1,$2,'abonnement',20,'USD',now() + interval '30 days','webhook') r`, [A, PROPRIO])
  const n1 = await svc.query(`select count(*)::int n from public.app_paiements where reference = 'in_1'`)
  verdict(p2.rows[0].r.statut === 'deja_enregistre' && n1.rows[0].n === 1, 'la même facture Stripe reçue deux fois : « déjà enregistré », une seule ligne')

  // ── Cinq webhooks SIMULTANÉS pour une même facture : une ligne, une prolongation.
  const avantJ = (await svc.query('select paye_jusqu_au from public.app_compteurs where app_id = $1', [A])).rows[0].paye_jusqu_au
  const simultanes = await Promise.all(Array.from({ length: 5 }, async () => {
    const c = new pg.Client({ connectionString: `postgresql://testeur_service@127.0.0.1:${PORT}/postgres` })
    await c.connect()
    try { return (await c.query(`select public.enregistrer_paiement('automatique','stripe','in_simul',$1,$2,'abonnement',20,'USD',null,'webhook') r`, [A, PROPRIO])).rows[0].r.statut }
    catch (e) { return 'erreur:' + String(e.message).slice(0, 40) } finally { await c.end() }
  }))
  const nSimul = (await svc.query(`select count(*)::int n from public.app_paiements where reference = 'in_simul'`)).rows[0].n
  const apresJ = (await svc.query('select paye_jusqu_au from public.app_compteurs where app_id = $1', [A])).rows[0].paye_jusqu_au
  const prolonge = Math.round((apresJ - avantJ) / 86400000)
  verdict(nSimul === 1 && simultanes.filter((x) => x === 'enregistre').length === 1 && simultanes.filter((x) => x === 'deja_enregistre').length === 4 && prolonge === 30,
    `5 webhooks simultanés, même facture : 1 « enregistré », 4 « déjà enregistré », 1 ligne, prolongé une fois (+${prolonge} j)`)

  // ── Un réglage changé s'applique à la période SUIVANTE.
  await svc.query(`select public.regler_quota('modifications_incluses', '40', 'issayamiyoussouf@gmail.com')`)
  const c2 = await svc.query('select limite from public.app_compteurs where app_id = $1', [A])
  verdict(c2.rows[0].limite === 50, 'réglage passé à 40 : la période en cours garde 50')
  const h = await svc.query(`select avant, apres, par from public.quota_reglages_historique where cle = 'modifications_incluses'`)
  verdict(h.rows.length === 1 && h.rows[0].avant === '50' && h.rows[0].apres === '40', 'le changement est historisé : 50 → 40, et qui')

  // ── Un paiement en FCFA sans prix réglé : refusé (vide ≠ zéro).
  verdict(await refuse(svc, `select public.enregistrer_paiement('manuelle','especes','recu-0002',$1,$2,'abonnement',12000,'XAF',null,'admin')`, [A, PROPRIO], 'QUOTA_REGLAGE_ABSENT'), 'espèces en FCFA alors que le prix FCFA est vide : refusé')
  await svc.query(`select public.regler_quota('prix_mensuel_xaf', '12000', 'admin')`)
  const p3 = await svc.query(`select public.enregistrer_paiement('manuelle','especes','recu-0002',$1,$2,'abonnement',12000,'XAF',null,'admin') r`, [A, PROPRIO])
  const c3 = await svc.query('select limite, utilisees from public.app_compteurs where app_id = $1', [A])
  verdict(p3.rows[0].r.statut === 'enregistre' && c3.rows[0].limite === 40, 'prix réglé : espèces acceptées ; la NOUVELLE période prend 40')

  // ── Réglages invalides : refusés.
  verdict(await refuse(svc, `select public.regler_quota('duree_jours', '0', 'admin')`, [], 'QUOTA_REGLAGE_INVALIDE'), 'durée à 0 : refusée')
  verdict(await refuse(svc, `select public.regler_quota('modifications_incluses', 'beaucoup', 'admin')`, [], 'QUOTA_REGLAGE_INVALIDE'), 'un réglage non numérique : refusé')

  // ── Le plafond : 40 passent, la 41e est refusée ; un lot en ajoute 50.
  let derniere
  for (let i = 0; i < 40; i++) derniere = (await svc.query('select public.reserver_modification($1, $2) r', [A, PROPRIO])).rows[0].r
  const refus41 = (await svc.query('select public.reserver_modification($1, $2) r', [A, PROPRIO])).rows[0].r
  verdict(derniere === 0 && refus41 === null, '40 modifications passent, la 41e est refusée')
  await svc.query(`select public.enregistrer_paiement('manuelle','airtel','TX-778',$1,$2,'lot',2500,'XAF',null,'admin')`, [A, PROPRIO])
  const apresLot = (await svc.query('select public.reserver_modification($1, $2) r', [A, PROPRIO])).rows[0].r
  verdict(apresLot === 49, 'un lot payé : 50 de plus (49 restantes après celle-ci)')

  // ── Abonnement échu : les modifications s'arrêtent.
  await admin.query(`update public.app_compteurs set paye_jusqu_au = now() - interval '1 day' where app_id = $1`, [A])
  const echu = (await svc.query('select public.reserver_modification($1, $2) r', [A, PROPRIO])).rows[0].r
  verdict(echu === null, 'abonnement échu : réservation refusée (l’appli, elle, reste en ligne)')
  verdict(await refuse(svc, `select public.enregistrer_paiement('manuelle','moov','TX-9',$1,$2,'lot',2500,'XAF',null,'admin')`, [A, PROPRIO], 'PAIEMENT_LOT_SANS_ABONNEMENT'), 'un lot sur un abonnement échu : refusé')

  // ── Payer en avance ne fait perdre aucun jour.
  await admin.query(`update public.app_compteurs set paye_jusqu_au = now() + interval '10 days' where app_id = $1`, [A])
  await svc.query(`select public.enregistrer_paiement('manuelle','especes','recu-0003',$1,$2,'abonnement',12000,'XAF',null,'admin')`, [A, PROPRIO])
  const jours = (await svc.query(`select extract(epoch from (paye_jusqu_au - now())) / 86400 j from public.app_compteurs where app_id = $1`, [A])).rows[0].j
  verdict(jours > 39.9 && jours < 40.1, `payé 10 jours avant l’échéance : ${Number(jours).toFixed(1)} jours devant (10 + 30)`)

  // ── Ajout seul : le registre et l'historique refusent update et delete.
  verdict(await refuse(svc, `update public.app_paiements set montant = 0`, [], ''), 'registre : un update est refusé')
  verdict(await refuse(admin, `delete from public.app_paiements`, [], 'AJOUT_SEUL'), 'registre : un delete est refusé, même au propriétaire de la base')
  verdict(await refuse(admin, `update public.quota_reglages_historique set apres = 'x'`, [], 'AJOUT_SEUL'), 'historique des réglages : un update est refusé')

  // ════ LES CRÉATIONS : une appli gratuite par compte ════
  const NOUVEAU = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  // Six créations SIMULTANÉES d'un compte neuf : une seule réservation.
  const creations = await Promise.all(Array.from({ length: 6 }, async () => {
    const c = new pg.Client({ connectionString: `postgresql://testeur_service@127.0.0.1:${PORT}/postgres` })
    await c.connect()
    try { return (await c.query('select public.reserver_creation($1) r', [NOUVEAU])).rows[0].r } finally { await c.end() }
  }))
  const accordees = creations.filter((x) => x !== null)
  verdict(accordees.length === 1, `6 créations simultanées d’un compte neuf : ${accordees.length} accordée(s), ${6 - accordees.length} refusée(s)`)
  // Libérée (la création a échoué) : la place revient.
  const solde1 = (await svc.query(`select public.solder_creation($1, $2, 'liberee', null) r`, [accordees[0], NOUVEAU])).rows[0].r
  const solde2 = (await svc.query(`select public.solder_creation($1, $2, 'livree', null) r`, [accordees[0], NOUVEAU])).rows[0].r
  verdict(solde1 === true && solde2 === false, 'une réservation se solde une seule fois')
  const encore = (await svc.query('select public.reserver_creation($1) r', [NOUVEAU])).rows[0].r
  verdict(encore !== null, 'création échouée, libérée : la place revient')
  // Le compte AUTRE a une appli livrée non payée (B) : refusé.
  verdict((await svc.query('select public.reserver_creation($1) r', [AUTRE])).rows[0].r === null, 'un compte avec une appli livrée NON payée : nouvelle création refusée')
  // Le compte PROPRIO : toutes ses applis livrées sont payées (A abonnée, la publiée offerte) → permis.
  verdict((await svc.query('select public.reserver_creation($1) r', [PROPRIO])).rows[0].r !== null, 'un compte dont les applis sont payées : nouvelle création permise')

  // ── Personne d'autre que la clé de service.
  const anon = new pg.Client({ connectionString: `postgresql://testeur_anon@127.0.0.1:${PORT}/postgres` })
  await anon.connect()
  verdict(await refuse(anon, 'select * from public.app_paiements', [], 'permission denied'), 'anon ne lit pas le registre')
  verdict(await refuse(anon, 'select * from public.quota_reglages', [], 'permission denied'), 'anon ne lit pas les réglages')
  verdict(await refuse(anon, 'select public.reserver_modification($1, $2)', [A, PROPRIO], 'permission denied'), 'anon n’appelle pas la réservation')
  verdict(await refuse(anon, `select public.regler_quota('modifications_incluses', '999', 'pirate')`, [], 'permission denied'), 'anon ne change pas un réglage')
  verdict(await refuse(anon, 'select public.reserver_creation($1)', [PROPRIO], 'permission denied'), 'anon ne réserve pas une création')
  verdict(await refuse(anon, 'select * from public.app_creations_reservees', [], 'permission denied'), 'anon ne lit pas les créations réservées')
  await anon.end()
  await svc.end()

  // ── L'annulation refuse de s'exécuter quand des paiements réels existent.
  verdict(await refuse(admin, ANNULATION, [], 'ANNULATION_REFUSEE'), 'annulation : refusée, des paiements réels sont enregistrés')
} catch (e) {
  echecs += 1
  console.log('✗ la preuve s’est arrêtée :', e.message)
} finally {
  await admin.end().catch(() => {})
  execFileSync('pg_ctl', ['-D', DOSSIER, '-m', 'immediate', 'stop'], { stdio: 'ignore' })
  rmSync(DOSSIER, { recursive: true, force: true })
}
console.log(echecs === 0 ? '\nTOUT EST PROUVÉ sur un Postgres 17 jetable.' : `\n${echecs} règle(s) non tenue(s).`)
process.exit(echecs === 0 ? 0 : 1)
