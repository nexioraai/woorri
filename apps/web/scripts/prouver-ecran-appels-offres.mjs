/**
 * LA PREUVE À L'ÉCRAN — un avis apparaît sur le site de SON acheteur, et sur
 * AUCUN autre. Dans les deux sens.
 *
 * ── POURQUOI DANS LES DEUX SENS.
 *
 * « L'avis apparaît chez la CPA » ne prouve rien tout seul : une page qui
 * afficherait TOUS les avis de TOUS les acheteurs passerait ce test. La
 * mesure qui compte est celle de l'ABSENCE — et c'est celle qu'on oublie.
 *
 * ── CE QU'ELLE MESURE QUE LES 21 POINTS NE MESURENT PAS.
 *
 * `mesurer-appels-offres.mjs` interroge la BASE. Celui-ci lit l'ÉCRAN. Une
 * base juste et une vue non branchée donneraient un site vide SANS AUCUNE
 * ERREUR — le silence que ce projet traque. Seule une lecture de l'écran
 * distingue « la base refuse » de « la page n'affiche pas ».
 *
 * ── LES QUATRE RÈGLES DU TÉMOIN (`temoin-en-base.mjs`), TENUES ICI.
 *
 * ① marque réservée sur DEUX colonnes · ② retrait garanti par `finally`
 * PUIS VÉRIFIÉ par relecture · ③ journalisé · ④ balayage d'ouverture.
 *
 * ── AVERTISSEMENT POUR UN TIR EN PRODUCTION.
 *
 * Le témoin est posé `publie = true` : pendant la mesure, il est RÉELLEMENT
 * visible sur la page publique de l'acheteur. En local c'est sans portée. Sur
 * le domaine servi, c'est une publication de quelques secondes sur le site
 * d'un établissement public — elle ne se fait pas sans accord explicite.
 *
 * Usage : node scripts/prouver-ecran-appels-offres.mjs [base]
 *   base par défaut : http://localhost:3000
 */
import { clientAdmin } from './temoin-en-base.mjs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const MARQUE = 'temoin-jetable-'
const MARQUE_REF = 'TÉMOIN JETABLE'
const FILTRE = `reference_slug.like.${MARQUE}*,reference.like.${MARQUE_REF}*`
const REF_SLUG = `${MARQUE}ecran`

const sb = clientAdmin('.')
const horodate = () => new Date().toISOString().slice(11, 19)
const journal = (q, d) => console.log(`  [${horodate()}] ${q}${d ? ' — ' + d : ''}`)

let vus = 0, verts = 0
function point(n, libelle, obtenu, attendu) {
  vus += 1
  const ok = obtenu === attendu
  if (ok) verts += 1
  console.log(`  ${ok ? '🟢' : '🔴'} ${String(n).padStart(2)}. ${libelle}`)
  if (!ok) console.log(`        attendu « ${attendu} » · obtenu « ${obtenu} »`)
}

/** Rend le HTML, ou `HTTP <code>` si la page ne se sert pas. */
async function page(chemin) {
  try {
    const r = await fetch(`${BASE}${chemin}`, { redirect: 'follow' })
    if (!r.ok) return `HTTP ${r.status}`
    return await r.text()
  } catch (e) {
    return `INJOIGNABLE ${String(e.message).slice(0, 40)}`
  }
}
/** Vrai quand `page()` a rendu une ERREUR au lieu d'un document. */
const echec = (html) => html.startsWith('HTTP ') || html.startsWith('INJOIGNABLE')

/**
 * UNE PAGE NON LUE NE REND JAMAIS « absent ».
 *
 * DÉFAUT MESURÉ DE CE FICHIER MÊME, 2026-11-06 : le point 7 testait une
 * expression régulière DIRECTEMENT sur le texte rendu. Serveur injoignable,
 * `page()` rend « INJOIGNABLE … », la regex ne trouve rien, et le point
 * annonçait « absent ». Il se trouve que son attendu était « présent », donc
 * il a rougi — par chance. Les points 12, 14, 15 et 17, eux, ATTENDENT
 * « absent » : le même raccourci les aurait rendus VERTS sur une page jamais
 * servie. Une absence constatée et une absence faute de lecture ne doivent
 * pas se ressembler.
 */
const contient = (html, aiguille) =>
  echec(html) ? html : (html.includes(aiguille) ? 'présent' : 'absent')
const correspond = (html, motif) =>
  echec(html) ? html : (motif.test(html) ? 'présent' : 'absent')

// ── LES DEUX SITES, DÉCOUVERTS ──────────────────────────────────────
const { data: sites } = await sb
  .from('sites').select('id,slug,name,published,archived_at').limit(2000)
const cpa = sites.find((s) => /pharmaceutique/i.test(s.name ?? '') && s.published && !s.archived_at)
const autre = sites.find((s) => s.published && !s.archived_at && s.id !== cpa?.id)
if (!cpa || !autre) { console.error('deux sites publiés sont nécessaires'); process.exit(1) }

console.log(`\nbase       ${BASE}`)
console.log(`acheteur   ${cpa.slug.slice(0, 54)}`)
console.log(`témoin     ${autre.slug.slice(0, 54)}  (l'autre site, qui ne doit RIEN voir)\n`)

await sb.from('appels_offres').delete().or(FILTRE)

const REF = `${MARQUE_REF} 004/AONO/CENAME/2025`
const OBJET = 'Témoin jetable — fourniture de médicaments essentiels'

try {
  // ── A. LE COMPTE À ZÉRO NE MENT PAS ───────────────────────────────
  console.log('  A. AVANT TOUT AVIS — le compte à zéro\n')
  const vide = await page(`/sites/${cpa.slug}/appels-offres`)
  point(1, 'la page des avis se sert (elle existe)', vide.startsWith('HTTP') || vide.startsWith('INJ') ? vide : 'servie', 'servie')
  point(2, 'elle dit qu’aucun avis n’est publié', contient(vide, 'Aucun avis'), 'présent')
  point(3, 'elle n’invente AUCUN canal officiel', contient(vide, 'journal-officiel'), 'absent')
  point(4, 'elle donne le contact que l’acheteur a réellement déclaré', contient(vide, 'contact@cpa.td'), 'présent')

  // ── B. L'AVIS PARAÎT CHEZ SON ACHETEUR ────────────────────────────
  console.log('\n  B. UN AVIS PUBLIÉ — chez son acheteur\n')
  const ins = await sb.from('appels_offres').insert({
    site_id: cpa.id, reference: REF, reference_slug: REF_SLUG, etat: 'ouvert',
    objet: OBJET, remise_le: '2026-12-01T10:00:00Z', publie: true,
    local_caution: '3 000 000 XAF', methode: "Appel d'offres national ouvert",
  }).select('id').maybeSingle()
  if (ins.error) throw new Error(`témoin non posé : ${ins.error.code} ${ins.error.message}`)
  journal('posé', `${REF_SLUG} (publie=true) sur ${cpa.slug.slice(0, 40)}`)

  const chezLui = await page(`/sites/${cpa.slug}/appels-offres`)
  point(5, 'la référence apparaît dans la liste', contient(chezLui, REF), 'présent')
  point(6, 'l’objet apparaît', contient(chezLui, OBJET), 'présent')
  point(7, 'l’échéance porte l’HEURE, pas seulement la date', correspond(chezLui, /\d{1,2}:\d{2}/), 'présent')
  point(8, 'l’état est rendu lisible, jamais la valeur brute', contient(chezLui, 'Ouvert'), 'présent')
  point(9, 'l’adresse du détail porte la RÉFÉRENCE', contient(chezLui, `/appels-offres/${REF_SLUG}`), 'présent')

  const detail = await page(`/sites/${cpa.slug}/appels-offres/${REF_SLUG}`)
  point(10, 'le détail se sert', detail.startsWith('HTTP') || detail.startsWith('INJ') ? detail : 'servi', 'servi')
  point(11, 'il porte une rubrique que la liste n’affiche pas', contient(detail, '3 000 000 XAF'), 'présent')
  point(12, 'il n’affiche PAS les rubriques non renseignées', contient(detail, 'Critères de notation'), 'absent')
  point(13, 'il DIT que les rubriques absentes n’ont pas été renseignées', contient(detail, 'n’ont pas été renseignées'), 'présent')

  // ── C. ET SUR AUCUN AUTRE SITE ────────────────────────────────────
  console.log('\n  C. LE SENS QU’ON OUBLIE — sur aucun autre site\n')
  const ailleurs = await page(`/sites/${autre.slug}/appels-offres`)
  point(14, 'la référence n’apparaît PAS chez l’autre acheteur', contient(ailleurs, REF), 'absent')
  point(15, 'l’objet n’y apparaît pas non plus', contient(ailleurs, OBJET), 'absent')
  const detailAilleurs = await page(`/sites/${autre.slug}/appels-offres/${REF_SLUG}`)
  point(16, 'la MÊME adresse chez l’autre acheteur rend 404', detailAilleurs.startsWith('HTTP 404') ? 'HTTP 404' : detailAilleurs.slice(0, 24), 'HTTP 404')

  // ── D. DÉPUBLIER LE FAIT DISPARAÎTRE ──────────────────────────────
  console.log('\n  D. DÉPUBLIER — l’écran suit la base\n')
  await sb.from('appels_offres').update({ publie: false }).eq('reference_slug', REF_SLUG)
  journal('dépublié', REF_SLUG)
  const apres = await page(`/sites/${cpa.slug}/appels-offres`)
  point(17, 'la référence disparaît de la liste', contient(apres, REF), 'absent')
  point(18, 'la page redit qu’aucun avis n’est publié', contient(apres, 'Aucun avis'), 'présent')
  const detailApres = await page(`/sites/${cpa.slug}/appels-offres/${REF_SLUG}`)
  point(19, 'son détail rend 404, chez son propre acheteur', detailApres.startsWith('HTTP 404') ? 'HTTP 404' : detailApres.slice(0, 24), 'HTTP 404')
} finally {
  console.log('')
  const del = await sb.from('appels_offres').delete().or(FILTRE).select('id')
  const reste = await sb.from('appels_offres').select('id,reference,reference_slug').or(FILTRE)
  if (del.error || (reste.data ?? []).length) {
    journal('⚠ RETRAIT RATÉ — LIGNES SURVIVANTES',
      del.error?.message ?? (reste.data ?? []).map((r) => `« ${r.reference} »`).join(' · '))
  } else {
    journal('retiré', `${(del.data ?? []).length} témoin(s)`)
  }
}

console.log(`\n═══ ${verts} / ${vus} ═══`)
process.exit(verts === vus ? 0 : 1)
