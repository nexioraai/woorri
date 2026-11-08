// Prouve le bloc « articles » à l'adresse publique.
// Le point ④ est le plus important : un article ORDINAIRE ne doit apparaître
// sur aucune page d'actualités MAIS rester sur /blog — sinon on aurait
// branché la CPA en cassant le blog des 41 autres sites.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const R = 'https://cpa-tchad.deribfy.app'
const COM = `${R}/actualites/communiques`
const EVE = `${R}/actualites/evenements`
const BLOG = `${R}/blog`
const P = 'temoin-actu-20261108'

let n = 0, ko = 0
const p = (t, a, o) => { n++; const k = String(a) === String(o); if (!k) ko++; console.log(`  ${k ? '🟢' : '🔴'} ${n}. ${t}`); if (!k) console.log(`       attendu « ${a} » · obtenu « ${o} »`) }
const page = async (u) => {
  const r = await fetch(u, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } })
  // React coupe son texte avec des marqueurs : on les retire (GEN-D048).
  return { statut: r.status, html: (await r.text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '') }
}
const vu = (h, t) => h.includes(t)

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
const net = () => srv.from('site_blog_posts').delete().eq('site_id', site.id).like('slug', `${P}%`)
await net()

const T = [
  { s: 'com', categorie: 'communique', title: 'Rappel de lot — essai technique' },
  { s: 'eve', categorie: 'evenement',  title: 'Rencontre fournisseurs — essai technique' },
  { s: 'art', categorie: 'article',    title: 'Article ordinaire — essai technique' },
]
const slug = (t) => `${P}-${t.s}`

console.log("A. L'ÉTAT DE DÉPART, MESURÉ AVANT TOUTE POSE")
const c0 = await page(COM); const e0 = await page(EVE); const b0 = await page(BLOG)
p('la page des communiqués répond', 200, c0.statut)
p('elle dit qu’il n’y a rien, au lieu de se taire', true, vu(c0.html, 'Aucune publication'))
p('idem pour les événements', true, vu(e0.html, 'Aucune publication'))
const articlesAvant = (b0.html.match(/\/blog\/[a-z0-9-]+"/g) ?? []).length
console.log(`     articles déjà sur /blog : ${articlesAvant}`)

console.log('\nB. LES TROIS TÉMOINS SONT POSÉS')
for (const t of T) {
  const { error } = await srv.from('site_blog_posts').insert([{
    site_id: site.id, slug: slug(t), title: t.title, content: 'Contenu d’essai, à ignorer.',
    excerpt: 'Essai technique.', categorie: t.categorie, published: true,
    published_at: new Date(Date.now() - 3600000).toISOString(),
  }]).select('id')
  p(`témoin « ${t.categorie} »`, 'accordé', error ? error.code : 'accordé')
}

console.log('\nC. CHAQUE PAGE NE MONTRE QUE SA CATÉGORIE')
const c1 = await page(COM); const e1 = await page(EVE)
p('le communiqué EST sur /actualites/communiques', true, vu(c1.html, T[0].title))
p("l'événement n'y est PAS", false, vu(c1.html, T[1].title))
p("l'article ordinaire n'y est PAS", false, vu(c1.html, T[2].title))
p("l'événement EST sur /actualites/evenements", true, vu(e1.html, T[1].title))
p("le communiqué n'y est PAS", false, vu(e1.html, T[0].title))

console.log('\nD. LE BLOG DES AUTRES SITES NE PERD RIEN')
const b1 = await page(BLOG)
for (const t of T) p(`« ${t.categorie} » est TOUJOURS sur /blog`, true, vu(b1.html, t.title))

console.log('\nE. CHAQUE CARTE PORTE SON LIEN ET SA DATE')
p('le lien pointe vers l’article', true, vu(c1.html, `/blog/${slug(T[0])}`))
p('la date est affichée', true, /\b20\d\d\b/.test(c1.html.slice(c1.html.indexOf(T[0].title) - 400, c1.html.indexOf(T[0].title))))
p('le titre du bloc est servi', true, vu(c1.html, 'Derniers communiqués'))

console.log("\nF. LES TÉMOINS SONT RETIRÉS, L'ÉTAT D'AVANT EST RÉTABLI")
const { data: sup } = await net().select('slug')
p('suppression en base', 3, sup?.length ?? 0)
await new Promise((r) => setTimeout(r, 4000))
const c2 = await page(COM); const e2 = await page(EVE); const b2 = await page(BLOG)
p('les communiqués redisent « Aucune publication »', true, vu(c2.html, 'Aucune publication'))
p('les événements aussi', true, vu(e2.html, 'Aucune publication'))
p('/blog retrouve son compte d’avant', articlesAvant, (b2.html.match(/\/blog\/[a-z0-9-]+"/g) ?? []).length)

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${n - ko}/${n}`)
process.exit(ko === 0 ? 0 : 1)
