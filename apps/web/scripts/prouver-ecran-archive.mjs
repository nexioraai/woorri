// Prouve l'ARCHIVE des consultations closes à l'adresse publique.
// Le point de départ est MESURÉ avant toute pose : à zéro archivé,
// /appels-offres/archive doit rendre 404 et l'index ne porter aucun lien.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const RACINE = 'https://cpa-tchad.deribfy.app'
const INDEX = `${RACINE}/appels-offres`
const ARCHIVE = `${INDEX}/archive`
const PREFIXE = 'TEMOIN-ARCHIVE-20261108'

let n = 0, ko = 0
const p = (t, a, o) => { n++; const k = String(a) === String(o); if (!k) ko++; console.log(`  ${k ? '🟢' : '🔴'} ${n}. ${t}`); if (!k) console.log(`       attendu « ${a} » · obtenu « ${o} »`) }
const page = async (u) => {
  const r = await fetch(u, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } })
  return { statut: r.status, html: (await r.text()).replace(/<script[\s\S]*?<\/script>/g, '') }
}
const vu = (html, ref) => (html.match(new RegExp(ref, 'g')) ?? []).length > 0
// REACT COUPE SON TEXTE AVEC DES MARQUEURS `<!-- -->`. Un compte rendu
// « (2) » arrive dans le HTML sous la forme `(<!-- -->2<!-- -->)`, et un
// motif `\(2\)` ne peut PAS y correspondre. Ma première sonde a compté un
// rouge sur un moteur correct — dixième erreur d'instrument du chantier,
// et toujours la même forme : un attendu qui ne décrit pas son outil.
const sansMarqueurs = (html) => html.replace(/<!--[\s\S]*?-->/g, '')

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
const net = () => srv.from('appels_offres').delete().eq('site_id', site.id).like('reference', `${PREFIXE}%`)
await net()

const an = new Date().getUTCFullYear()
const T = [
  { s: 'CETTE-ANNEE', etat: 'ouvert',   remise_le: `${an}-01-15T00:00:00Z`,     ou: 'index'   },
  { s: 'AN-DERNIER',  etat: 'ouvert',   remise_le: `${an - 1}-09-01T00:00:00Z`, ou: 'archive' },
  { s: 'IL-Y-A-DEUX', etat: 'attribue', remise_le: `${an - 2}-04-02T00:00:00Z`, ou: 'archive' },
]
const ref = (t) => `${PREFIXE}-${t.s}`

console.log('A. LE POINT DE DÉPART, MESURÉ AVANT TOUTE POSE')
const avant = await page(ARCHIVE)
p("à zéro archivé, l'archive rend 404", 404, avant.statut)
const idxAvant = await page(INDEX)
p("et l'index ne porte AUCUN lien vers elle", false, vu(idxAvant.html, 'appels-offres/archive'))

console.log('\nB. LES TROIS TÉMOINS SONT POSÉS')
for (const t of T) {
  const { error } = await srv.from('appels_offres').insert([{
    site_id: site.id, reference: ref(t), reference_slug: ref(t).toLowerCase(),
    etat: t.etat, objet: "Avis d'essai technique — à ignorer", remise_le: t.remise_le, publie: true,
    ...(t.etat === 'attribue' ? { attributaire: 'Société Témoin' } : {}),
  }]).select('id')
  p(`témoin ${t.s} (échéance ${t.remise_le.slice(0, 4)}) → ${t.ou}`, 'accordé', error ? error.code : 'accordé')
}

console.log("\nC. LA COUPURE SE VOIT À L'ÉCRAN")
const idx = await page(INDEX)
p("l'index répond", 200, idx.statut)
for (const t of T) p(`${t.s} ${t.ou === 'index' ? 'EST' : "n'est PAS"} sur l'index`, t.ou === 'index', vu(idx.html, ref(t)))
p("le lien vers l'archive paraît maintenant", true, vu(idx.html, 'appels-offres/archive'))
p("et il porte le compte (2)", true, /archive[\s\S]{0,400}\(2\)/.test(sansMarqueurs(idx.html)))

const arc = await page(ARCHIVE)
p("l'archive répond 200", 200, arc.statut)
for (const t of T) p(`${t.s} ${t.ou === 'archive' ? 'EST' : "n'est PAS"} dans l'archive`, t.ou === 'archive', vu(arc.html, ref(t)))

console.log("\nD. L'ARCHIVE SE PARCOURT PAR ANNÉE")
const a1 = await page(`${ARCHIVE}?annee=${an - 1}`)
p(`?annee=${an - 1} montre l'avis de ${an - 1}`, true, vu(a1.html, ref(T[1])))
p(`et CACHE celui de ${an - 2}`, false, vu(a1.html, ref(T[2])))
const a0 = await page(`${ARCHIVE}?annee=1999`)
p("une année inexistante retombe sur « toutes »", true, vu(a0.html, ref(T[1])) && vu(a0.html, ref(T[2])))
const az = await page(`${ARCHIVE}?annee=<script>`)
p("une année illisible ne casse rien", 200, az.statut)

console.log("\nE. LES TÉMOINS SONT RETIRÉS, ET L'ÉTAT D'AVANT EST RÉTABLI")
const { data: sup } = await net().select('reference')
p('suppression en base', 3, sup?.length ?? 0)
await new Promise((r) => setTimeout(r, 4000))
const apres = await page(ARCHIVE)
p("l'archive redevient 404", 404, apres.statut)
const idxApres = await page(INDEX)
for (const t of T) p(`plus aucune trace de ${t.s} sur l'index`, false, vu(idxApres.html, ref(t)))
p("et le lien vers l'archive a disparu", false, vu(idxApres.html, 'appels-offres/archive'))

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${n - ko}/${n}`)
process.exit(ko === 0 ? 0 : 1)
