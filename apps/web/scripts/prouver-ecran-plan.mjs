// Prouve le PLAN DU SITE à l'adresse publique.
// Le coeur : une page en BROUILLON ne doit apparaître nulle part dedans.
// Sinon le plan devient la fuite que fetchPage et le catalogue referment.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const U = 'https://cpa-tchad.deribfy.app/plan-du-site'

let n = 0, ko = 0
const p = (t, a, o) => { n++; const k = String(a) === String(o); if (!k) ko++; console.log(`  ${k ? '🟢' : '🔴'} ${n}. ${t}`); if (!k) console.log(`       attendu « ${a} » · obtenu « ${o} »`) }
const page = async () => {
  const r = await fetch(U, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } })
  return { statut: r.status, html: (await r.text()).replace(/<!--[\s\S]*?-->/g, '') }
}

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
const CH = 'temoin-brouillon-plan'
const net = () => srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH)
const netCat = () => srv.from('catalogue_produits').delete().eq('site_id', site.id).like('reference', 'TEMOIN-PLAN%')
await net(); await netCat()

console.log('① LE PLAN EST CONSTRUIT DEPUIS LES PAGES RÉELLES')
const h = await page()
p('la page répond', 200, h.statut)
for (const m of ['Qui sommes-nous', 'Nos activités', 'Espace fournisseurs', 'Accueil'])
  p(`« ${m} » y figure`, true, h.html.includes(m))
p('les sous-pages aussi', true, h.html.includes('Notre histoire'))
p('chaque entrée montre son chemin', true, h.html.includes('/qui-sommes-nous/histoire'))

console.log('② UNE ADRESSE SANS CONTENU N’EST PAS ANNONCÉE')
p('le catalogue est ABSENT (zéro produit publié)', false, /\/catalogue<|>Catalogue</.test(h.html))
p("les appels d'offres sont là (le site le DÉCLARE)", true, h.html.includes('Appels d’offres'))
p('le suivi d’une demande est là', true, h.html.includes('Suivre une demande'))

console.log('③ LE BROUILLON NE FUITE PAS — le point qui compte')
const { error: eB } = await srv.from('site_pages').insert([{
  site_id: site.id, chemin: CH, titre: 'PAGE TÉMOIN NON PUBLIÉE',
  ordre: 99, menu: true, publie: false,
}]).select('id')
p('la page brouillon est posée', 'accordé', eB ? eB.code : 'accordé')
await new Promise((r) => setTimeout(r, 3000))
const h2 = await page()
p('son TITRE n’apparaît PAS dans le plan', false, h2.html.includes('PAGE TÉMOIN NON PUBLIÉE'))
p('son CHEMIN non plus', false, h2.html.includes(CH))

console.log('④ PUBLIÉE, ELLE APPARAÎT')
await srv.from('site_pages').update({ publie: true }).eq('site_id', site.id).eq('chemin', CH)
await new Promise((r) => setTimeout(r, 3000))
const h3 = await page()
p('le plan la montre maintenant', true, h3.html.includes('PAGE TÉMOIN NON PUBLIÉE'))

console.log('⑤ UN PRODUIT PUBLIÉ FAIT APPARAÎTRE LE CATALOGUE')
await srv.from('catalogue_produits').insert([{
  site_id: site.id, reference: 'TEMOIN-PLAN-1', denomination: 'Produit témoin', publie: true,
}])
await new Promise((r) => setTimeout(r, 3000))
const h4 = await page()
p('le catalogue est annoncé', true, h4.html.includes('>Catalogue<'))

console.log('⑥ TOUT EST RETIRÉ, L’ÉTAT D’AVANT EST RÉTABLI')
p('page retirée', 1, (await net().select('chemin')).data?.length ?? 0)
p('produit retiré', 1, (await netCat().select('reference')).data?.length ?? 0)
await new Promise((r) => setTimeout(r, 4000))
const h5 = await page()
p('plus de page témoin', false, h5.html.includes('PAGE TÉMOIN NON PUBLIÉE'))
p('le catalogue redisparaît', false, /\/catalogue<|>Catalogue</.test(h5.html))

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${n - ko}/${n}`)
process.exit(ko === 0 ? 0 : 1)
