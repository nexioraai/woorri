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
const LOT_XAF = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_lot_xaf.sql'), 'utf8')
const CARTE = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_abonnement_carte.sql'), 'utf8')
const MOBILE = readFileSync(join(ICI, '..', 'supabase', 'sql', 'mobile_money_interrupteur.sql'), 'utf8')
const MOYENS = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_moyens_paiement.sql'), 'utf8')
const FRAIS = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_frais_mobile_money.sql'), 'utf8')
const FRAIS_VALEURS = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_frais_mobile_money_valeurs.sql'), 'utf8')
const FRAIS_VERIF = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_frais_mobile_money_verification.sql'), 'utf8')
const FRAIS_ANNUL = readFileSync(join(ICI, '..', 'supabase', 'sql', 'quota_frais_mobile_money_annulation.sql'), 'utf8')
const PAIEMENTS_FRAIS = readFileSync(join(ICI, '..', 'supabase', 'sql', 'paiements_frais.sql'), 'utf8')
const PAIEMENTS_FRAIS_VERIF = readFileSync(join(ICI, '..', 'supabase', 'sql', 'paiements_frais_verification.sql'), 'utf8')
const PAIEMENTS_FRAIS_ANNUL = readFileSync(join(ICI, '..', 'supabase', 'sql', 'paiements_frais_annulation.sql'), 'utf8')
const CYCLE = readFileSync(join(ICI, '..', 'supabase', 'sql', 'stripe_cycle_de_vie.sql'), 'utf8')
const CYCLE_VERIF = readFileSync(join(ICI, '..', 'supabase', 'sql', 'stripe_cycle_de_vie_verification.sql'), 'utf8')
const CYCLE_ANNUL = readFileSync(join(ICI, '..', 'supabase', 'sql', 'stripe_cycle_de_vie_annulation.sql'), 'utf8')
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
    -- Supabase donne tous les droits de table à service_role ; la dépublication en a besoin (2026-11-22).
    grant update (publication_jeton) on public.app_generations to service_role;
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
  await admin.query(LOT_XAF)
  await admin.query(LOT_XAF)
  await admin.query(CARTE)
  await admin.query(CARTE)
  const carte = await admin.query(`select valeur from public.quota_reglages where cle = 'abonnement_carte'`)
  verdict(carte.rows[0]?.valeur === '', 'abonnement_carte posé VIDE : le paiement par carte reste éteint')
  await admin.query(`select public.regler_quota('abonnement_carte', 'essai@exemple.com', 'proprietaire')`)
  const hist = await admin.query(`select avant, apres, par from public.quota_reglages_historique where cle = 'abonnement_carte'`)
  verdict(hist.rows.length === 1 && hist.rows[0].avant === '' && hist.rows[0].apres === 'essai@exemple.com' && hist.rows[0].par === 'proprietaire', 'allumer pour un compte d’essai passe par regler_quota, historisé à son nom')
  await admin.query(CARTE)
  const garde = await admin.query(`select valeur from public.quota_reglages where cle = 'abonnement_carte'`)
  verdict(garde.rows[0]?.valeur === 'essai@exemple.com', 'réappliquer le fichier n’écrase pas la valeur réglée')
  await admin.query(`select public.regler_quota('abonnement_carte', '', 'proprietaire')`)
  // mobile_money APRÈS abonnement_carte : sa contrainte inclut toutes les clés précédentes.
  await admin.query(MOBILE)
  await admin.query(MOBILE)
  const reg = await admin.query('select count(*)::int n from public.quota_reglages')
  verdict(reg.rows[0].n === 12, 'appliqué deux fois : 12 réglages (dont lot_prix_xaf, abonnement_carte, mobile_money), pas 24 (idempotent)')
  const mm = await admin.query(`select valeur from public.quota_reglages where cle = 'mobile_money'`)
  verdict(mm.rows[0]?.valeur === '', 'mobile_money posé VIDE : le paiement mobile money reste éteint')
  await admin.query(`select public.regler_quota('mobile_money', 'essai@exemple.com', 'proprietaire')`)
  await admin.query(MOBILE)
  const mm2 = await admin.query(`select valeur from public.quota_reglages where cle = 'mobile_money'`)
  verdict(mm2.rows[0]?.valeur === 'essai@exemple.com', 'mobile_money : réglable par regler_quota, et réappliquer ne l’écrase pas')
  await admin.query(`select public.regler_quota('mobile_money', '', 'proprietaire')`)
  // moyens_paiement_manuel APRÈS mobile_money : sa contrainte reprend toutes les clés.
  await admin.query(MOYENS)
  await admin.query(MOYENS)
  const mp = await admin.query(`select valeur from public.quota_reglages where cle = 'moyens_paiement_manuel'`)
  verdict(mp.rows[0]?.valeur === 'espèces', 'moyens_paiement_manuel posé à « espèces » seulement')
  const reg13 = await admin.query('select count(*)::int n from public.quota_reglages')
  verdict(reg13.rows[0].n === 13, 'appliqué deux fois : 13 réglages, pas 26 (idempotent)')
  await admin.query(`select public.regler_quota('moyens_paiement_manuel', 'espèces, Airtel Money', 'proprietaire')`)
  await admin.query(MOYENS)
  const mp2 = await admin.query(`select valeur from public.quota_reglages where cle = 'moyens_paiement_manuel'`)
  verdict(mp2.rows[0]?.valeur === 'espèces, Airtel Money', 'remettre « Airtel Money » passe par regler_quota, et réappliquer ne l’écrase pas')

  // ── LES FRAIS MOBILE MONEY (2026-11-21) : quatre réglages vides, une forme gardée.
  const CLES_FRAIS = ['arrondi_frais_xaf', 'frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct', 'frais_reversement_pct']
  await admin.query(FRAIS)
  await admin.query(FRAIS)
  const fr = await admin.query(`select cle, valeur from public.quota_reglages where cle = any($1) order by cle`, [CLES_FRAIS])
  verdict(fr.rows.length === 4 && fr.rows.every((l) => l.valeur === ''), 'frais : quatre réglages posés VIDES (le code ne propose rien tant qu’un seul est vide)')
  const reg17 = await admin.query('select count(*)::int n from public.quota_reglages')
  verdict(reg17.rows[0].n === 17, 'frais appliqué deux fois : 17 réglages (idempotent)')
  for (const [cle, mauvaise] of [['frais_encaissement_airtel_pct', 'abc'], ['frais_encaissement_moov_pct', '100'], ['frais_reversement_pct', '3.555'], ['frais_reversement_pct', '3,5'], ['arrondi_frais_xaf', '0'], ['arrondi_frais_xaf', '10001'], ['arrondi_frais_xaf', '1.5']]) {
    verdict(await refuse(admin, 'select public.regler_quota($1, $2, $3)', [cle, mauvaise, 'proprietaire'], 'quota_reglages_frais_check'), `frais : ${cle} = « ${mauvaise} » refusé par la contrainte`)
  }
  verdict(await refuse(admin, `update public.quota_reglages set valeur = 'x' where cle = 'frais_reversement_pct'`, [], 'quota_reglages_frais_check'), 'frais : une écriture DIRECTE (hors regler_quota) est refusée aussi')
  await admin.query(FRAIS_VALEURS)
  const fv = await admin.query(`select cle, valeur, modifie_par from public.quota_reglages where cle = any($1) order by cle`, [CLES_FRAIS])
  verdict(fv.rows.map((l) => `${l.cle}=${l.valeur}/${l.modifie_par}`).join(' ') === 'arrondi_frais_xaf=100/Youssouf frais_encaissement_airtel_pct=7/Youssouf frais_encaissement_moov_pct=5/Youssouf frais_reversement_pct=3.5/Youssouf', `frais : valeurs posées par _valeurs.sql, signées (${fv.rows.map((l) => `${l.cle}=${l.valeur}`).join(', ')})`)
  const fh = await admin.query(`select cle, avant, apres, par from public.quota_reglages_historique where cle = any($1) order by cle`, [CLES_FRAIS])
  verdict(fh.rows.length === 4 && fh.rows.every((l) => l.avant === '' && l.par === 'Youssouf'), 'frais : chaque valeur a SA ligne d’historique (avant vide, par Youssouf)')
  await admin.query(FRAIS)
  const fr2 = await admin.query(`select valeur from public.quota_reglages where cle = 'frais_reversement_pct'`)
  verdict(fr2.rows[0]?.valeur === '3.5', 'frais : réappliquer le fichier n’écrase pas une valeur réglée')
  // La vérification livrée au propriétaire : ① lit, ② se termine par VERIFICATION_OK et n'écrit rien.
  const avantVerif = await admin.query('select count(*)::int n from public.quota_reglages_historique')
  let messageVerif = ''
  try { await admin.query(FRAIS_VERIF) } catch (e) { messageVerif = String(e.message) }
  const apresVerif = await admin.query('select count(*)::int n from public.quota_reglages_historique')
  verdict(messageVerif.startsWith('VERIFICATION_OK : 9 refus sur 9'), `frais : la vérification livrée répond « ${messageVerif} »`)
  verdict(apresVerif.rows[0].n === avantVerif.rows[0].n, 'frais : la vérification n’a laissé AUCUNE ligne d’historique')
  // L'annulation : plus de clés de frais, la contrainte des clés d'avant, l'historique gardé.
  await admin.query(FRAIS_ANNUL)
  const fa = await admin.query('select count(*)::int n from public.quota_reglages')
  const fah = await admin.query(`select count(*)::int n from public.quota_reglages_historique where cle = any($1)`, [CLES_FRAIS])
  verdict(fa.rows[0].n === 13 && fah.rows[0].n === 4, 'frais : l’annulation retire les 4 réglages, garde leur historique')
  verdict(await refuse(admin, `insert into public.quota_reglages (cle, valeur) values ('frais_reversement_pct', '3.5')`, [], 'quota_reglages_cle_check'), 'frais : après annulation, la clé est de nouveau inconnue')
  await admin.query(FRAIS)

  // ── LA COLONNE FRAIS DU REGISTRE (2026-11-21). Appliquée ICI, avant tous les
  // paiements ci-dessous : Stripe, espèces, lots passent ensuite par la
  // NOUVELLE fonction, sans p_frais — c'est la preuve que rien ne change pour eux.
  const signatures = async () => (await admin.query(`select pg_get_function_identity_arguments(p.oid) a from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'enregistrer_paiement'`)).rows.map((l) => l.a)
  await admin.query(PAIEMENTS_FRAIS)
  await admin.query(PAIEMENTS_FRAIS)
  const sig = await signatures()
  verdict(sig.length === 1 && sig[0].endsWith('p_saisi_par text, p_frais numeric'), `colonne frais : appliqué deux fois, UNE seule signature d’enregistrer_paiement (${sig.join(' | ')})`)
  const colFrais = await admin.query(`select data_type, numeric_precision, numeric_scale, is_nullable, column_default from information_schema.columns where table_name = 'app_paiements' and column_name = 'frais'`)
  verdict(colFrais.rows.length === 1 && colFrais.rows[0].is_nullable === 'NO' && colFrais.rows[0].column_default === '0' && colFrais.rows[0].numeric_scale === 2, 'colonne frais : numeric(12,2), non nulle, 0 par défaut')
  const anciennes = await admin.query(`select count(*)::int n, count(*) filter (where frais = 0)::int zero from public.app_paiements`)
  verdict(anciennes.rows[0].n >= 1 && anciennes.rows[0].zero === anciennes.rows[0].n, `colonne frais : les ${anciennes.rows[0].n} ligne(s) déjà là prennent 0, sans être réécrites (le déclencheur d’ajout seul n’a rien dit)`)
  const droitsFrais = await admin.query(`select has_function_privilege('anon', 'public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text, numeric)', 'execute') anon, has_function_privilege('service_role', 'public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text, numeric)', 'execute') svc`)
  verdict(droitsFrais.rows[0].anon === false && droitsFrais.rows[0].svc === true, 'colonne frais : la nouvelle signature n’est appelable que par la clé de service')
  // L'annulation, tant qu'aucune ligne ne porte de frais : acceptée, la fonction d'avant revient.
  await admin.query(PAIEMENTS_FRAIS_ANNUL)
  const sigAvant = await signatures()
  const colApres = await admin.query(`select count(*)::int n from information_schema.columns where table_name = 'app_paiements' and column_name = 'frais'`)
  verdict(sigAvant.length === 1 && sigAvant[0].endsWith('p_saisi_par text') && colApres.rows[0].n === 0, 'colonne frais : l’annulation (sans frais en base) rend la fonction à 10 arguments et retire la colonne')
  await admin.query(PAIEMENTS_FRAIS)

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
  // Le LOT en FCFA vérifie le prix du LOT : vide → refusé, même si le mois est réglé.
  verdict(await refuse(svc, `select public.enregistrer_paiement('manuelle','airtel','TX-777',$1,$2,'lot',3000,'XAF',null,'admin')`, [A, PROPRIO], 'lot_prix_xaf'), 'lot en FCFA alors que le prix du LOT est vide : refusé (le prix mensuel ne suffit pas)')
  await svc.query(`select public.regler_quota('lot_prix_xaf', '3000', 'admin')`)
  await svc.query(`select public.enregistrer_paiement('manuelle','airtel','TX-778',$1,$2,'lot',3000,'XAF',null,'admin')`, [A, PROPRIO])
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

  // ── DOUBLE PAIEMENT (2026-11-21) : deux débits MoneRails validés pour la même
  // appli (deux références) = deux lignes, DEUX mois : le second prolonge le premier.
  const avantDouble = (await svc.query('select paye_jusqu_au from public.app_compteurs where app_id = $1', [A])).rows[0].paye_jusqu_au
  await svc.query(`select public.enregistrer_paiement('automatique','monerails','col_double_1',$1,$2,'abonnement',13400,'XAF',null,'monerails',1400)`, [A, PROPRIO])
  await svc.query(`select public.enregistrer_paiement('automatique','monerails','col_double_2',$1,$2,'abonnement',13400,'XAF',null,'monerails',1400)`, [A, PROPRIO])
  const apresDouble = (await svc.query('select paye_jusqu_au from public.app_compteurs where app_id = $1', [A])).rows[0].paye_jusqu_au
  const nDouble = (await svc.query(`select count(*)::int n from public.app_paiements where reference like 'col_double_%'`)).rows[0].n
  const joursDouble = Math.round((apresDouble - avantDouble) / 86400000)
  verdict(nDouble === 2 && joursDouble === 60, `double paiement : deux débits validés → 2 lignes, +${joursDouble} jours (deux mois, aucun jour perdu)`)

  // ── LA PART FRAIS au registre.
  const lignesFrais = await svc.query(`select reference, montant::int m, frais::int f from public.app_paiements where reference in ('col_double_1', 'recu-0003', 'in_1') order by reference`)
  verdict(lignesFrais.rows.map((l) => `${l.reference}:${l.m}/${l.f}`).join(' ') === 'col_double_1:13400/1400 in_1:20/0 recu-0003:12000/0', `colonne frais : mobile money 13 400 dont 1 400 ; Stripe et espèces (sans p_frais) à 0 (${lignesFrais.rows.map((l) => `${l.reference}:${l.m}/${l.f}`).join(' ')})`)
  verdict(await refuse(svc, `select public.enregistrer_paiement('automatique','monerails','col_neg',$1,$2,'abonnement',13400,'XAF',null,'monerails',-1)`, [A, PROPRIO], 'PAIEMENT_FRAIS'), 'colonne frais : des frais négatifs sont refusés')
  verdict(await refuse(svc, `select public.enregistrer_paiement('automatique','monerails','col_trop',$1,$2,'abonnement',13400,'XAF',null,'monerails',13401)`, [A, PROPRIO], 'PAIEMENT_FRAIS'), 'colonne frais : des frais plus grands que le montant sont refusés')
  verdict(await refuse(admin, `insert into public.app_paiements (owner_id, app_id, source, fournisseur, reference, objet, montant, devise, saisi_par, frais) values ($1, $2, 'manuelle', 'especes', 'direct-frais', 'abonnement', 100, 'XAF', 'x', 101)`, [PROPRIO, A], 'app_paiements_frais_check'), 'colonne frais : une écriture DIRECTE au-delà du montant est refusée par la contrainte')
  // La vérification livrée au propriétaire : ③ se termine par VERIFICATION_OK et ne garde rien.
  const avantVerifFrais = (await admin.query('select count(*)::int n from public.app_paiements')).rows[0].n
  const compteurAvant = (await admin.query('select paye_jusqu_au from public.app_compteurs where app_id = $1', [A])).rows[0].paye_jusqu_au
  let messageVerifFrais = ''
  try { await admin.query(PAIEMENTS_FRAIS_VERIF) } catch (e) { messageVerifFrais = String(e.message) }
  const apresVerifFrais = (await admin.query('select count(*)::int n from public.app_paiements')).rows[0].n
  const compteurApres = (await admin.query('select paye_jusqu_au from public.app_compteurs where app_id = $1', [A])).rows[0].paye_jusqu_au
  verdict(messageVerifFrais === 'VERIFICATION_OK : sans p_frais → 0, avec p_frais → 1400, 2 refus sur 2 — rien n’est gardé'.replace('’', "'"), `colonne frais : la vérification livrée répond « ${messageVerifFrais} »`)
  verdict(apresVerifFrais === avantVerifFrais && compteurApres.getTime() === compteurAvant.getTime(), 'colonne frais : la vérification n’a gardé AUCUNE ligne et n’a pas bougé le compteur')
  // Des frais en base : l'annulation refuse, et ne change rien.
  // L'APPEL PAR NOMS, comme PostgREST le fait pour supabase.rpc (Stripe, activation
  // manuelle) : 10 arguments nommés, SANS p_frais → la fonction à 11 arguments, frais = 0.
  const parNoms = `select public.enregistrer_paiement(p_source => 'automatique', p_fournisseur => 'stripe', p_reference => $3, p_app => $1, p_owner => $2, p_objet => 'abonnement', p_montant => 20, p_devise => 'USD', p_jusqu_au => now() + interval '30 days', p_saisi_par => 'stripe') r`
  const rNoms = (await svc.query(parNoms, [A, PROPRIO, 'in_par_noms'])).rows[0].r
  const lNoms = (await svc.query(`select frais::int f from public.app_paiements where reference = 'in_par_noms'`)).rows
  verdict(rNoms.statut === 'enregistre' && lNoms.length === 1 && lNoms[0].f === 0, 'colonne frais : l’appel PAR NOMS de Stripe (10 arguments, sans p_frais) passe, frais = 0')
  // LE PIÈGE : rejouer un ancien fichier recréerait la version à 10 arguments → ambiguïté.
  for (const [nom, texte] of [['quota_lot_xaf.sql', LOT_XAF], ['quota_modifications.sql', SQL]]) {
    verdict(await refuse(admin, texte, [], 'FICHIER_DEPASSE'), `colonne frais : rejouer ${nom} après paiements_frais.sql est REFUSÉ`)
    await admin.query('rollback')
  }
  verdict((await signatures()).length === 1, 'colonne frais : après ces refus, toujours UNE seule signature')
  // Ce que la garde empêche, mesuré : deux versions → l'appel par noms échoue.
  const a = LOT_XAF.indexOf('create or replace function public.enregistrer_paiement(')
  await admin.query(LOT_XAF.slice(a, LOT_XAF.indexOf('end $$;', a) + 7))
  verdict(await refuse(svc, parNoms, [A, PROPRIO, 'in_ambigu'], 'is not unique'), 'colonne frais : SANS la garde, deux versions rendent l’appel de Stripe ambigu (« is not unique ») — c’est ce que la garde empêche')
  await admin.query('drop function public.enregistrer_paiement(text, text, text, uuid, uuid, text, numeric, text, timestamptz, text)')
  verdict(await refuse(admin, PAIEMENTS_FRAIS_ANNUL, [], 'ANNULATION_REFUSEE'), 'colonne frais : annulation REFUSÉE dès qu’une ligne porte des frais')
  await admin.query('rollback') // le fichier ouvre sa transaction (begin) : le refus la laisse avortée
  const sigGardee = await signatures()
  verdict(sigGardee.length === 1 && sigGardee[0].endsWith('p_frais numeric'), 'colonne frais : après le refus, la fonction à 11 arguments est toujours là')

  // ════ LE CYCLE DE VIE STRIPE (2026-11-22) : remboursement total, litige, doublons ════
  await admin.query(CYCLE)
  await admin.query(CYCLE)
  const CV = '55555555-5555-4555-8555-555555555555', CV2 = '66666666-6666-4666-8666-666666666666'
  // Un compte À PART : ses applis remboursées ne doivent pas changer les règles de création de PROPRIO.
  const PROPRIO_CV = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  await admin.query(`insert into public.app_generations values ($1, $3, 'livree', 'jeton-cv'), ($2, $3, 'livree', 'jeton-cv2')`, [CV, CV2, PROPRIO_CV])
  await svc.query(`select public.enregistrer_paiement('automatique','stripe','in_cv1',$1,$2,'abonnement',20,'USD',now() + interval '30 days','stripe')`, [CV, PROPRIO_CV])
  const a1 = (await svc.query(`select public.annuler_paiement_stripe('in_cv1', 'remboursement', 20) r`)).rows[0].r
  const g1 = (await svc.query('select publication_jeton from public.app_generations where id = $1', [CV])).rows[0]
  const c1cv = (await svc.query('select paye_jusqu_au <= now() echu from public.app_compteurs where app_id = $1', [CV])).rows[0]
  const l1 = (await svc.query(`select p.objet, p.montant::int m, p.devise, p.saisi_par, p.annule = (select id from public.app_paiements where reference = 'in_cv1') lie from public.app_paiements p where reference = 'annulation:in_cv1'`)).rows
  verdict(a1.statut === 'annule' && a1.derniere === true, `cycle : remboursement total de la dernière facture → « annule », dernière (${JSON.stringify(a1)})`)
  verdict(g1.publication_jeton === null, 'cycle : l’appli est DÉPUBLIÉE (jeton vidé : son adresse répond 404)')
  verdict(c1cv.echu === true, 'cycle : la période payée est ramenée à maintenant (modifications arrêtées, « Publier » refusé)')
  verdict(l1.length === 1 && l1[0].objet === 'annulation' && l1[0].m === 20 && l1[0].devise === 'USD' && l1[0].saisi_par === 'stripe:remboursement:derniere' && l1[0].lie === true, 'cycle : UNE ligne d’annulation, 20 USD, qui renvoie à la ligne payée')
  verdict((await svc.query('select public.reserver_modification($1, $2) r', [CV, PROPRIO_CV])).rows[0].r === null, 'cycle : après le remboursement, une modification est refusée')
  const a2 = (await svc.query(`select public.annuler_paiement_stripe('in_cv1', 'litige', 20) r`)).rows[0].r
  const n2 = (await svc.query(`select count(*)::int n from public.app_paiements where reference = 'annulation:in_cv1'`)).rows[0].n
  verdict(a2.statut === 'deja_annule' && a2.derniere === true && n2 === 1, 'cycle : remboursement PUIS litige de la même facture (ou avis reçu deux fois) → « deja_annule », toujours une seule ligne')
  verdict((await svc.query(`select public.annuler_paiement_stripe('in_jamais_vu', 'remboursement', 20) r`)).rows[0].r.statut === 'paiement_inconnu', 'cycle : facture pas encore enregistrée (avis dans le désordre) → « paiement_inconnu », rien n’est écrit')
  // Une facture PLUS ANCIENNE : la ligne seulement, rien ne se coupe.
  await svc.query(`select public.enregistrer_paiement('automatique','stripe','in_cv2a',$1,$2,'abonnement',20,'USD',now() + interval '30 days','stripe')`, [CV2, PROPRIO_CV])
  await svc.query(`select public.enregistrer_paiement('automatique','stripe','in_cv2b',$1,$2,'abonnement',20,'USD',now() + interval '60 days','stripe')`, [CV2, PROPRIO_CV])
  const a3 = (await svc.query(`select public.annuler_paiement_stripe('in_cv2a', 'remboursement', 20) r`)).rows[0].r
  const g3 = (await svc.query('select publication_jeton from public.app_generations where id = $1', [CV2])).rows[0]
  const c3cv = (await svc.query(`select round(extract(epoch from (paye_jusqu_au - now())) / 86400) j from public.app_compteurs where app_id = $1`, [CV2])).rows[0]
  verdict(a3.statut === 'annule' && a3.derniere === false && g3.publication_jeton === 'jeton-cv2' && Number(c3cv.j) === 60, 'cycle : une facture PLUS ANCIENNE remboursée → la ligne seulement ; l’appli reste publiée, payée encore 60 jours')
  verdict(await refuse(svc, `select public.annuler_paiement_stripe('in_cv2b', 'cadeau', 20)`, [], 'ANNULATION_MOTIF'), 'cycle : un motif inconnu est refusé')
  verdict(await refuse(svc, `select public.annuler_paiement_stripe('in_cv2b', 'remboursement', -1)`, [], 'ANNULATION_MONTANT'), 'cycle : un montant négatif est refusé')
  // Le journal des avis : un identifiant une seule fois.
  await svc.query(`insert into public.stripe_avis_traites (evenement, type) values ('evt_essai1', 'charge.refunded')`)
  verdict(await refuse(svc, `insert into public.stripe_avis_traites (evenement, type) values ('evt_essai1', 'charge.refunded')`, [], 'duplicate key'), 'cycle : le même avis ne se note qu’une fois au journal')
  verdict(await refuse(svc, `insert into public.stripe_avis_traites (evenement, type) values ('pas_un_evt', 'x')`, [], 'stripe_avis_traites_evenement_check'), 'cycle : le journal n’accepte que des identifiants d’avis Stripe (evt_…)')
  // La vérification livrée au propriétaire : VERIFICATION_OK, et rien n'est gardé.
  const avantCv = (await admin.query('select count(*)::int n from public.app_paiements')).rows[0].n
  let msgCv = ''
  try { await admin.query(CYCLE_VERIF) } catch (e) { msgCv = String(e.message) }
  const apresCv = (await admin.query('select count(*)::int n from public.app_paiements')).rows[0].n
  const publiees = (await admin.query(`select count(*)::int n from public.app_generations where publication_jeton is not null`)).rows[0].n
  verdict(msgCv.startsWith('VERIFICATION_OK : annulée, dépubliée'), `cycle : la vérification livrée répond « ${msgCv} »`)
  verdict(apresCv === avantCv && publiees >= 2, 'cycle : la vérification n’a gardé AUCUNE ligne et n’a dépublié personne')
  // L'annulation du fichier, puis réapplication.
  await admin.query(CYCLE_ANNUL)
  verdict(await refuse(svc, `select public.annuler_paiement_stripe('in_cv2b', 'remboursement', 20)`, [], 'does not exist'), 'cycle : après l’annulation du fichier, la fonction n’existe plus (les lignes écrites restent)')
  verdict((await admin.query(`select count(*)::int n from public.app_paiements where objet = 'annulation'`)).rows[0].n === 2, 'cycle : l’annulation du fichier garde les 2 lignes d’annulation du registre')
  await admin.query(CYCLE)

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
  verdict(await refuse(anon, `select public.annuler_paiement_stripe('in_cv2b', 'remboursement', 20)`, [], 'permission denied'), 'anon n’appelle pas l’annulation d’un paiement')
  verdict(await refuse(anon, 'select * from public.stripe_avis_traites', [], 'permission denied'), 'anon ne lit pas le journal des avis Stripe')
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
