// LOT 13 — LE PARCOURS COMPLET, SUR L'ADRESSE PUBLIQUE.
//
// ── POURQUOI CETTE SONDE EXISTE.
//
// 56 contrôles unitaires tiennent la route des offres, et aucun n'a jamais
// vu une vraie requête HTTP sur un vrai avis. Mesuré le 2026-11-09 : la CPA
// a ZÉRO appel d'offres en base. Tout le circuit était en ligne et n'avait
// jamais rencontré une donnée réelle.
//
// ── CE QU'ELLE PROUVE, ET CE QU'ELLE NE PEUT PAS.
//
// Elle prouve le DÉPÔT par un vrai fournisseur authentifié, le
// CLOISONNEMENT (un second compte ne voit rien), et les REFUS. Elle ne peut
// PAS ouvrir l'écran de la Centrale : il faudrait la session du
// propriétaire du site, que cette sonde n'a pas. Dit plutôt que sous-entendu.
//
// ── LE TÉMOIN EST PUBLIÉ LE TEMPS DE LA MESURE, PUIS RETIRÉ.
//
// Arbitrage du propriétaire, 2026-11-09, option B. L'avis porte « TÉMOIN »
// dans son objet : si quelqu'un le voit pendant la fenêtre, il sait que ce
// n'est pas un marché. Le nettoyage est dans un `finally` — un témoin oublié
// sur le site d'une centrale d'achats publique serait pire que pas de test.
import { readFileSync } from 'node:fs'
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf-8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { createClient } = await import('@supabase/supabase-js')
const URL_SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const srv = createClient(URL_SUPA, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const SLUG = 'centrale-pharmaceutique-d-achats-cpa-1793979506814'
const BASE = 'https://cpa-tchad.deribfy.app'
const API = `${BASE}/api/sites/${SLUG}`
const T = Date.now().toString(36)

let n = 0, ko = 0
const p = (t, ok, d = '') => { n++; if (!ok) ko++; console.log(`  ${ok ? '🟢' : '🔴'} ${n}. ${t}${d ? `\n       ${d}` : ''}`) }

const aNettoyer = { avis: null, comptes: [], users: [], offres: [] }

async function compte(suffixe, etat) {
  const email = `sonde-${T}-${suffixe}@temoin.invalid`
  const motDePasse = `Sonde!${T}!${suffixe}`
  const { data: u, error: eu } = await srv.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (eu) throw new Error(`création utilisateur : ${eu.message}`)
  aNettoyer.users.push(u.user.id)
  const { data: c, error: ec } = await srv.from('site_comptes')
    .insert({ site_id: site.id, user_id: u.user.id, email, role: 'fournisseur', organisation: `Témoin ${suffixe}` })
    .select('id').single()
  if (ec) throw new Error(`création compte : ${ec.message}`)
  aNettoyer.comptes.push(c.id)
  if (etat !== 'en_attente') await srv.from('site_comptes').update({ etat }).eq('id', c.id)
  const lecteur = createClient(URL_SUPA, ANON, { auth: { persistSession: false } })
  const { data: s, error: es } = await lecteur.auth.signInWithPassword({ email, password: motDePasse })
  if (es) throw new Error(`connexion : ${es.message}`)
  return { id: c.id, jeton: s.session.access_token, email }
}

const { data: site } = await srv.from('sites').select('id').eq('slug', SLUG).maybeSingle()

try {
  // ── L'AVIS TÉMOIN, D'ABORD EN PRÉPARATION.
  const { data: avis, error: ea } = await srv.from('appels_offres').insert({
    site_id: site.id,
    reference: `TEMOIN-SONDE-${T}`, reference_slug: `temoin-sonde-${T}`,
    objet: 'TÉMOIN DE SONDE — ne pas répondre, cet avis est retiré dans la minute',
    etat: 'preparation', publie: false, portee: 'national',
    remise_le: new Date(Date.now() + 3600_000).toISOString(),
  }).select('id').single()
  if (ea) throw new Error(`création avis : ${ea.message}`)
  aNettoyer.avis = avis.id

  const fournisseur = await compte('actif', 'actif')
  const attente = await compte('attente', 'en_attente')

  const depot = async (jeton, avisId = avis.id) => {
    const f = new FormData()
    f.append('fichier', new File(['offre de sonde'], 'offre-temoin.pdf', { type: 'application/pdf' }))
    f.append('avis', avisId); f.append('nom', 'Sonde'); f.append('contact', 'sonde@temoin.invalid')
    f.append('prix', '1 234,50'); f.append('devise', 'XAF')
    const r = await fetch(`${API}/offres`, { method: 'POST', headers: { Authorization: `Bearer ${jeton}` }, body: f })
    return { statut: r.status, corps: await r.json().catch(() => ({})) }
  }

  // ① UN AVIS EN PRÉPARATION NE REÇOIT RIEN.
  let r = await depot(fournisseur.jeton)
  p('un avis en PRÉPARATION refuse le dépôt', r.statut === 409, `-> ${r.statut} ${r.corps.error ?? ''}`)

  // ── ON PUBLIE, LE TEMPS DE LA MESURE.
  await srv.from('appels_offres').update({ etat: 'ouvert', publie: true }).eq('id', avis.id)

  // ② UN COMPTE EN ATTENTE NE DÉPOSE PAS.
  r = await depot(attente.jeton)
  p('un compte EN ATTENTE est refusé', r.statut === 403, `-> ${r.statut}`)

  // ③ LE DÉPÔT RÉEL.
  r = await depot(fournisseur.jeton)
  p('un fournisseur ACTIF dépose son offre', r.statut === 201, `-> ${r.statut} ${r.corps.error ?? ''}`)
  if (r.corps?.offre?.id) aNettoyer.offres.push(r.corps.offre.id)

  // ON LIT L'ERREUR, PAS SEULEMENT LA DONNÉE. Premier jet : un
  // `.maybeSingle()` dont je ne destructurais que `data` — il a rendu `null`
  // et j'ai cru l'offre absente alors que le dépôt avait rendu 201. Une
  // lecture dont on ignore l'erreur ne mesure rien.
  const { data: lignes, error: eLecture } = await srv.from('offres')
        // PAS DE `sens` ICI : cette colonne appartient aux DOCUMENTS d'un compte,
    // qui circulent dans les deux sens. Une offre va toujours du fournisseur
    // vers la Centrale — je l'avais recopiée par réflexe, et PostgREST l'a
    // dit en 42703.
    .select('id,compte_id,etat,prix,devise,chemin,nom_fichier')
    .eq('avis_id', avis.id)
  if (eLecture) throw new Error(`relecture des offres : ${eLecture.code} ${eLecture.message}`)
  p('une offre, et une seule, est en base', (lignes ?? []).length === 1, `${(lignes ?? []).length} ligne(s)`)
  const enBase = (lignes ?? [])[0]
  if (!enBase) throw new Error('aucune offre relue alors que le dépôt a rendu 201')
  p('l’offre est EN BASE, rattachée au bon compte', enBase?.compte_id === fournisseur.id,
    `compte ${enBase?.compte_id?.slice(0, 8)} · état ${enBase?.etat} · prix ${enBase?.prix}`)
  p('le prix « 1 234,50 » est lu comme 1234.5', Number(enBase?.prix) === 1234.5)
  p('elle arrive en état « recue »', enBase?.etat === 'recue')

  // ④ LE FICHIER N'EST PAS LISIBLE PUBLIQUEMENT.
  const pub = await fetch(`${URL_SUPA}/storage/v1/object/public/offres/${enBase.chemin}`)
  p('le fichier déposé N’EST PAS lisible publiquement', pub.status !== 200, `-> ${pub.status}`)

  // ⑤ UN AUTRE FOURNISSEUR NE VOIT RIEN.
  const rival = await compte('rival', 'actif')
  const vueRival = await fetch(`${API}/offres`, { headers: { Authorization: `Bearer ${rival.jeton}` } })
  const dRival = await vueRival.json().catch(() => ({}))
  p('un AUTRE fournisseur actif ne voit aucune offre', (dRival.offres ?? []).length === 0,
    `${(dRival.offres ?? []).length} offre(s) visible(s)`)

  const sign = await fetch(`${API}/offres?telecharger=${enBase.id}`, { headers: { Authorization: `Bearer ${rival.jeton}` } })
  p('et il ne peut pas SIGNER le fichier du concurrent', sign.status === 403, `-> ${sign.status}`)

  // ⑥ LE DÉPOSANT, LUI, RETROUVE LA SIENNE.
  const vueSienne = await fetch(`${API}/offres`, { headers: { Authorization: `Bearer ${fournisseur.jeton}` } })
  const dSienne = await vueSienne.json().catch(() => ({}))
  p('le déposant retrouve SON offre, avec le titre de l’avis',
    (dSienne.offres ?? []).length === 1 && dSienne.offres[0].avis?.reference?.startsWith('TEMOIN'),
    JSON.stringify(dSienne.offres?.[0]?.avis ?? null))
  p('et `chemin` n’apparaît nulle part', !JSON.stringify(dSienne).includes('chemin'))

  // ⑦ APRÈS LA DATE LIMITE, PLUS RIEN.
  await srv.from('appels_offres').update({ remise_le: new Date(Date.now() - 1000).toISOString() }).eq('id', avis.id)
  r = await depot(fournisseur.jeton)
  p('après la DATE LIMITE, le dépôt est refusé', r.statut === 409, `-> ${r.statut} ${String(r.corps.error ?? '').slice(0, 60)}`)
} catch (e) {
  p(`la sonde s’est interrompue : ${e.message}`, false)
} finally {
  // ── NETTOYAGE, QUOI QU'IL ARRIVE.
  for (const id of aNettoyer.offres.length ? aNettoyer.offres : []) { /* supprimées avec l'avis */ void id }
  if (aNettoyer.avis) await srv.from('offres').delete().eq('avis_id', aNettoyer.avis)
  if (aNettoyer.avis) await srv.from('appels_offres').delete().eq('id', aNettoyer.avis)
  for (const id of aNettoyer.comptes) await srv.from('site_comptes').delete().eq('id', id)
  for (const id of aNettoyer.users) await srv.auth.admin.deleteUser(id)

  // ON VÉRIFIE LE RETRAIT. Un témoin oublié sur le site d'une centrale
  // publique serait pire que pas de test du tout.
  const { count: avisRestants } = await srv.from('appels_offres').select('*', { count: 'exact', head: true })
  const { count: comptesRestants } = await srv.from('site_comptes').select('*', { count: 'exact', head: true })
  const { count: offresRestantes } = await srv.from('offres').select('*', { count: 'exact', head: true })
  p('le témoin est retiré — avis, comptes et offres à zéro',
    avisRestants === 0 && comptesRestants === 0 && offresRestantes === 0,
    `avis ${avisRestants} · comptes ${comptesRestants} · offres ${offresRestantes}`)
}

console.log(`\n${n - ko}/${n}${ko ? ` — ${ko} ROUGE(S)` : ''}`)
process.exit(ko ? 1 : 0)
