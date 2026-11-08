// Prouve le CATALOGUE à l'adresse publique.
// Le coeur : AUCUN prix, AUCUN stock, nulle part — et un produit non publié
// rend 404 sans révéler qu'il existe.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const B = 'https://cpa-tchad.deribfy.app/catalogue'
const P = 'TEMOIN-CAT'

let n = 0, ko = 0
const p = (t, a, o) => { n++; const k = String(a) === String(o); if (!k) ko++; console.log(`  ${k ? '🟢' : '🔴'} ${n}. ${t}`); if (!k) console.log(`       attendu « ${a} » · obtenu « ${o} »`) }
const page = async (q = '') => {
  const r = await fetch(B + q, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } })
  return { statut: r.status, html: (await r.text()).replace(/<!--[\s\S]*?-->/g, '') }
}

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
const net = () => srv.from('catalogue_produits').delete().eq('site_id', site.id).like('reference', `${P}%`)
await net()

const T = [
  { s: 'A', reference: `${P}-A`, denomination: 'Paracétamol témoin', famille: 'Antalgiques', forme: 'Comprimé', dosage: '500 mg', conditionnement: 'Boîte de 100', publie: true },
  { s: 'B', reference: `${P}-B`, denomination: 'Vaccin témoin', famille: 'Chaîne du froid', chaine_du_froid: true, publie: true },
  { s: 'C', reference: `${P}-C`, denomination: 'Brouillon témoin', famille: 'Antalgiques', publie: false },
]

console.log("① L'ÉTAT DE DÉPART")
const z = await page()
p('la page répond', 200, z.statut)
p("elle dit que le catalogue n'est pas publié", true, /n’est pas encore publié/.test(z.html))

console.log('\n② LES TÉMOINS SONT POSÉS')
for (const t of T) {
  const { s, ...champs } = t
  const { error } = await srv.from('catalogue_produits').insert([{ site_id: site.id, ...champs }]).select('id')
  p(`témoin ${s} (${champs.publie ? 'publié' : 'BROUILLON'})`, 'accordé', error ? error.code : 'accordé')
}

console.log('\n③ LE PUBLIÉ PARAÎT, LE BROUILLON NON')
const h = await page()
p('le témoin A paraît', true, h.html.includes('Paracétamol témoin'))
p('le témoin B paraît', true, h.html.includes('Vaccin témoin'))
p('le BROUILLON ne paraît PAS', false, h.html.includes('Brouillon témoin'))
p('la chaîne du froid est signalée', true, h.html.includes('2–8 °C'))

console.log('\n④ AUCUN PRIX, AUCUN STOCK — NULLE PART')
for (const mot of ['prix', 'price', 'stock', 'panier', 'Ajouter au panier', 'FCFA', '€'])
  p(`« ${mot} » absent de la liste`, false, h.html.toLowerCase().includes(mot.toLowerCase()))

console.log('\n⑤ LA RECHERCHE TROUVE SANS ACCENTS')
const r1 = await page('?q=paracetamol')
p('« paracetamol » trouve « Paracétamol »', true, r1.html.includes('Paracétamol témoin'))
const r2 = await page('?famille=' + encodeURIComponent('Chaîne du froid'))
p('le filtre par famille ne montre que les siens', true, r2.html.includes('Vaccin témoin') && !r2.html.includes('Paracétamol témoin'))
const r3 = await page('?famille=Inexistante')
p('une famille inconnue retombe sur « toutes »', true, r3.html.includes('Paracétamol témoin'))

console.log('\n⑥ LA FICHE, ET LE BROUILLON QUI NE FUITE PAS')
const fA = await fetch(`${B}/${P}-A`, { cache: 'no-store' })
p('la fiche du publié répond 200', 200, fA.status)
const htmlA = await fA.text()
p('elle porte le conditionnement', true, htmlA.includes('Boîte de 100'))
p('aucun prix sur la fiche', false, /prix|price|FCFA/i.test(htmlA))
const fC = await fetch(`${B}/${P}-C`, { cache: 'no-store' })
p('la fiche du BROUILLON rend 404', 404, fC.status)
const fX = await fetch(`${B}/${P}-INEXISTANT`, { cache: 'no-store' })
p('une référence inexistante rend le MÊME 404', fC.status, fX.status)

console.log("\n⑦ TOUT EST RETIRÉ")
const { data: sup } = await net().select('reference')
p('suppression', 3, sup?.length ?? 0)
await new Promise((r) => setTimeout(r, 4000))
const apres = await page()
p("le catalogue redit qu'il n'est pas publié", true, /n’est pas encore publié/.test(apres.html))

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${n - ko}/${n}`)
process.exit(ko === 0 ? 0 : 1)
