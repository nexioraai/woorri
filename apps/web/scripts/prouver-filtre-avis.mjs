// Prouve le FILTRE des appels d'offres à l'adresse publique.
// Trois témoins inconfondables, posés, mesurés, retirés — et le retrait
// vérifié DEPUIS L'ADRESSE PUBLIQUE, jamais depuis la base.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const B = 'https://cpa-tchad.deribfy.app/appels-offres'
const PREFIXE = 'TEMOIN-ESSAI-20261108'

let n = 0, ko = 0
const p = (t, a, o) => { n++; const k = String(a) === String(o); if (!k) ko++; console.log(`  ${k ? '🟢' : '🔴'} ${n}. ${t}`); if (!k) console.log(`       attendu « ${a} » · obtenu « ${o} »`) }
const page = async (q) => { const r = await fetch(B + q, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } }); return { statut: r.status, html: (await r.text()).replace(/<script[\s\S]*?<\/script>/g, '') } }
const compteDansTableau = (html, ref) => (html.match(new RegExp(ref, 'g')) ?? []).length

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
const jour = 86400000
const TEMOINS = [
  { s: 'A', etat: 'ouvert',   remise_le: new Date(Date.now() + jour).toISOString(), attendu: 'ouvert' },
  { s: 'B', etat: 'ouvert',   remise_le: new Date(Date.now() - jour).toISOString(), attendu: 'clos' },
  { s: 'C', etat: 'attribue', remise_le: new Date(Date.now() - jour).toISOString(), attendu: 'attribue' },
]
const ref = (t) => `${PREFIXE}-${t.s}`

const nettoyer = () => srv.from('appels_offres').delete().eq('site_id', site.id).like('reference', `${PREFIXE}%`)
await nettoyer()

console.log('A. LES TROIS TÉMOINS SONT POSÉS')
for (const t of TEMOINS) {
  const { data, error } = await srv.from('appels_offres').insert([{
    site_id: site.id, reference: ref(t), reference_slug: ref(t).toLowerCase(),
    etat: t.etat, objet: "Avis d'essai technique — à ignorer", remise_le: t.remise_le, publie: true,
  }]).select('reference')
  p(`témoin ${t.s} (${t.etat}, échéance ${t.s === 'A' ? 'à venir' : 'passée'})`, 'accordé', error ? error.code : (data?.length ? 'accordé' : 'aucune ligne'))
}

console.log('\nB. LA BARRE DE FILTRE PARAÎT, AVEC SES COMPTES')
const sans = await page('')
p('la page répond', 200, sans.statut)
p('la barre est servie (elle était masquée à zéro avis)', true, sans.html.includes('etat=ouvert'))
for (const t of TEMOINS) p(`le témoin ${t.s} paraît sans filtre`, true, compteDansTableau(sans.html, ref(t)) > 0)

console.log('\nC. CHAQUE FILTRE NE MONTRE QUE LES SIENS')
for (const f of ['ouvert', 'clos', 'attribue']) {
  const { html } = await page(`?etat=${f}`)
  for (const t of TEMOINS) {
    const doit = t.attendu === f
    p(`« ${f} » ${doit ? 'MONTRE' : 'cache'} le témoin ${t.s}`, doit, compteDansTableau(html, ref(t)) > 0)
  }
}

console.log("\nD. LE CAS QUI COMPTE — « ouvert » EN BASE, CLOS À L'ÉCRAN")
const o = await page('?etat=ouvert')
p('le témoin B (ouvert en base, échéance passée) est ABSENT de « En cours »', false, compteDansTableau(o.html, ref(TEMOINS[1])) > 0)
const c = await page('?etat=clos')
p('et il est PRÉSENT dans « Clos »', true, compteDansTableau(c.html, ref(TEMOINS[1])) > 0)

console.log('\nE. UN FILTRE INVENTÉ NE CASSE RIEN')
const z = await page('?etat=zzz-inexistant')
p('la page répond quand même', 200, z.statut)
for (const t of TEMOINS) p(`et montre tout — témoin ${t.s}`, true, compteDansTableau(z.html, ref(t)) > 0)

console.log("\nF. LES TÉMOINS SONT RETIRÉS, ET LE RETRAIT EST VÉRIFIÉ DEPUIS L'ADRESSE PUBLIQUE")
const { data: sup, error: eS } = await nettoyer().select('reference')
p('suppression en base', 3, eS ? `erreur ${eS.code}` : (sup?.length ?? 0))
await new Promise((r) => setTimeout(r, 4000))
const apres = await page('')
for (const t of TEMOINS) p(`plus aucune trace du témoin ${t.s} à l'adresse publique`, 0, compteDansTableau(apres.html, ref(t)))
p('la barre est de nouveau masquée (retour à zéro avis)', false, apres.html.includes('etat=ouvert'))

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${n - ko}/${n}`)
process.exit(ko === 0 ? 0 : 1)
