// Prouve la page des appels d'offres ENRICHIE, à l'adresse publique.
// Deux pièges volontaires : ⑤ la légende ne doit PAS montrer « ICB », le
// sigle d'EPSS que j'aurais pu recopier ; ⑥ un bloc mal positionné doit
// s'afficher au-dessus, pas disparaître.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const U = 'https://cpa-tchad.deribfy.app/appels-offres'
const P = 'TEMOIN-5BIS-20261108'
const CH = 'appels-offres'

let n = 0, ko = 0
const p = (t, a, o) => { n++; const k = String(a) === String(o); if (!k) ko++; console.log(`  ${k ? '🟢' : '🔴'} ${n}. ${t}`); if (!k) console.log(`       attendu « ${a} » · obtenu « ${o} »`) }
const page = async (q = '') => {
  const r = await fetch(U + q, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } })
  // React coupe son texte avec des marqueurs — on les retire (GEN-D048).
  return (await r.text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
}
const compteur = (html, libelle) => {
  const i = html.indexOf(libelle)
  if (i < 0) return 'libellé absent'
  const avant = html.slice(Math.max(0, i - 420), i)
  const m = [...avant.matchAll(/>(\d+)<\/div>/g)]
  return m.length ? m[m.length - 1][1] : 'illisible'
}

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
const an = new Date().getUTCFullYear()
const netAvis = () => srv.from('appels_offres').delete().eq('site_id', site.id).like('reference', `${P}%`)
// LA PAGE DES TEXTES N'EXISTE PEUT-ÊTRE PAS. Ma première sonde faisait un
// `update` sur ce chemin sans vérifier qu'il touchait une ligne : zéro ligne
// modifiée, trois rouges, et j'ai failli accuser le moteur. Une mutation dont
// on ne vérifie pas l'effet est un non-événement lu comme un verdict.
const { data: pageAvant } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', CH).maybeSingle()
const pageCreee = !pageAvant
await netAvis()

const T = [
  { s: 'A', etat: 'ouvert', remise_le: new Date(Date.now() + 30 * 86400000).toISOString(), methode: 'AOI' },
  { s: 'B', etat: 'ouvert', remise_le: new Date(Date.now() + 3 * 86400000).toISOString(), methode: 'AOI' },
  { s: 'C', etat: 'preparation', remise_le: new Date(Date.now() + 60 * 86400000).toISOString(), methode: 'AON' },
  { s: 'D', etat: 'attribue', remise_le: `${an - 1}-05-01T00:00:00Z`, methode: 'AON' },
]

console.log('① L’ÉTAT DE DÉPART, MESURÉ AVANT TOUTE POSE')
const h0 = await page()
for (const l of ['Appels d’offres actifs', 'Ouverts aux offres', 'Clôture prochaine', 'Archivés'])
  p(`« ${l} » affiche 0`, '0', compteur(h0, l))
p('aucune légende de types de marché', false, h0.includes('Types de marché'))

console.log('\n② LES TÉMOINS SONT POSÉS')
for (const t of T) {
  const { error } = await srv.from('appels_offres').insert([{
    site_id: site.id, reference: `${P}-${t.s}`, reference_slug: `${P}-${t.s}`.toLowerCase(),
    etat: t.etat, objet: `Avis d'essai ${t.s} — à ignorer`, remise_le: t.remise_le,
    methode: t.methode, publie: true,
    ...(t.etat === 'attribue' ? { attributaire: 'Société Témoin' } : {}),
  }]).select('id')
  p(`témoin ${t.s} (${t.etat}, ${t.methode})`, 'accordé', error ? error.code : 'accordé')
}

console.log('\n③ LES COMPTEURS SUIVENT LES AVIS RÉELS')
const h1 = await page()
p('actifs = 3 (A, B, C — pas l’attribué)', '3', compteur(h1, 'Appels d’offres actifs'))
p('ouverts = 2 (la préparation n’y est PAS)', '2', compteur(h1, 'Ouverts aux offres'))
p('clôture prochaine = 1 (B, à 3 jours)', '1', compteur(h1, 'Clôture prochaine'))
p('archivés = 1 (D, année précédente)', '1', compteur(h1, 'Archivés'))

console.log('\n④ LE COMPTE À REBOURS ET L’URGENCE')
p('un compte à rebours est affiché', true, /\d+ jours restants/.test(h1))
p('AUCUNE décimale — pas de « 32.406850914144 »', false, /\d+\.\d{3,}/.test(h1))
p('la pastille d’urgence paraît (B à 3 jours)', true, h1.includes('#fdf0e1'))

console.log('\n⑤ LA LÉGENDE NE MONTRE QUE CE QUI EXISTE — le piège')
p('la légende paraît maintenant', true, h1.includes('Types de marché'))
p('« AOI » y est', true, h1.includes('AOI'))
p('« AON » y est', true, h1.includes('AON'))
p('« ICB » — le sigle d’EPSS — n’y est PAS', false, h1.includes('ICB'))

console.log('\n⑥ UN BLOC MAL POSITIONNÉ NE DISPARAÎT PAS — le second piège')
const BLOCS_TEMOINS = [
  { type: 'texte', texte: 'Bloc au-dessus, témoin technique.' },
  { type: 'encadre', titre: 'Besoin d’aide ?', texte: 'Témoin de colonne latérale.', position: 'cote' },
  { type: 'texte', texte: 'Bloc mal positionné, témoin technique.', position: 'bas-gauche' },
]
if (pageCreee) {
  const { error } = await srv.from('site_pages').insert([{
    site_id: site.id, chemin: CH, titre: 'Appels d’offres', ordre: 99, menu: false,
    publie: true, blocs: BLOCS_TEMOINS,
  }]).select('id')
  p('la page des textes est CRÉÉE', 'accordé', error ? error.code : 'accordé')
} else {
  const { data } = await srv.from('site_pages').update({ blocs: BLOCS_TEMOINS })
    .eq('site_id', site.id).eq('chemin', CH).select('chemin')
  p('la page des textes est MODIFIÉE', 1, data?.length ?? 0)
}
const h2 = await page()
p('le bloc « cote » est servi', true, h2.includes('Témoin de colonne latérale'))
p('le bloc mal positionné est servi AUSSI', true, h2.includes('Bloc mal positionné'))
p('et le bloc normal aussi', true, h2.includes('Bloc au-dessus'))

console.log('\n⑦ TOUT EST RETIRÉ, L’ÉTAT D’AVANT EST RÉTABLI')
const { data: sup } = await netAvis().select('reference')
p('suppression des avis', 4, sup?.length ?? 0)
if (pageCreee) {
  const { data } = await srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH).select('chemin')
  p('la page des textes est RETIRÉE', 1, data?.length ?? 0)
} else {
  await srv.from('site_pages').update({ blocs: pageAvant?.blocs ?? [] }).eq('site_id', site.id).eq('chemin', CH)
}
await new Promise((r) => setTimeout(r, 4000))
const h3 = await page()
for (const l of ['Appels d’offres actifs', 'Archivés']) p(`« ${l} » revient à 0`, '0', compteur(h3, l))
p('la légende a disparu', false, h3.includes('Types de marché'))
p('la colonne latérale a disparu', false, h3.includes('Témoin de colonne latérale'))

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${n - ko}/${n}`)
process.exit(ko === 0 ? 0 : 1)
