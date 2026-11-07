/**
 * LE LIEN DE MENU SUIT LA CAPACITÉ DÉCLARÉE — preuve à l'écran servi.
 *
 * ── CE QU'ELLE PROUVE, ET QUE RIEN D'AUTRE NE PROUVE.
 *
 * `publishes_tenders` dit ce que l'organisation FAIT ; les avis disent ce
 * qu'elle a PUBLIÉ. Le lien de menu doit suivre la PREMIÈRE — sinon la page
 * redevient inatteignable dès qu'il n'y a plus d'avis, et c'est le défaut du
 * matin reproduit.
 *
 * L'assertion centrale est donc : LE LIEN EST LÀ ALORS QUE `appels_offres`
 * EST VIDE. Mesurer le lien avec des avis en base ne prouverait rien — les
 * deux règles donneraient le même écran.
 *
 * ── DANS LES DEUX SENS, SANS RIEN MUTER.
 *
 * La preuve inverse se fait par COMPARAISON ENTRE SITES, pas en basculant la
 * colonne d'un site réel : les déclarants ont le lien, les non-déclarants ne
 * l'ont pas. Basculer un vrai site pour une mesure risquerait de lui laisser
 * l'état de test si la restauration échouait.
 *
 * ── ON MESURE LE LIEN, PAS LE MOT.
 *
 * Défaut mesuré le 2026-11-06 sur ma propre sonde : chercher « appels
 * d'offres » dans le HTML attrapait le BOUTON DU HÉROS, dont le libellé est
 * « Consulter les appels d'offres ». Un texte n'est pas une destination. On
 * cherche donc un `href` vers `/appels-offres`.
 *
 * Usage : node scripts/prouver-ecran-lien-menu.mjs [originePlateforme]
 */
import { clientAdmin } from './temoin-en-base.mjs'

const ORIGINE = process.argv[2] ?? 'https://www.deribfy.com'
const ADRESSE_CPA = 'https://cpa-tchad.deribfy.app'
const sb = clientAdmin('.')

let vus = 0, verts = 0
const point = (n, l, o, a) => {
  vus += 1; const ok = o === a; if (ok) verts += 1
  console.log(`  ${ok ? '🟢' : '🔴'} ${String(n).padStart(2)}. ${l}`)
  if (!ok) console.log(`        attendu « ${a} » · obtenu « ${o} »`)
  return ok
}
async function page(u) {
  try { const r = await fetch(u, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } })
        return r.ok ? await r.text() : `HTTP ${r.status}` }
  catch (e) { return `INJOIGNABLE ${String(e.message).slice(0, 36)}` }
}
const echec = (h) => h.startsWith('HTTP ') || h.startsWith('INJOIGNABLE')
/** Le LIEN, pas le mot. Une page non lue ne rend jamais « absent ». */
const lien = (h) => echec(h) ? h : (/href="[^"]*\/appels-offres"/.test(h) ? 'présent' : 'absent')

const { data: sites, error } = await sb
  .from('sites').select('id,slug,name,published,archived_at,publishes_tenders').limit(2000)
if (error) { console.error('lecture des sites impossible :', error.code); process.exit(1) }
const servis = sites.filter((s) => s.published === true && s.archived_at === null)
const declarants = servis.filter((s) => s.publishes_tenders === true)
const muets = servis.filter((s) => s.publishes_tenders !== true)
const cpa = servis.find((s) => /pharmaceutique/i.test(s.name ?? ''))

const { count: nAvis, error: eAvis } = await sb
  .from('appels_offres').select('id', { count: 'exact', head: true })

console.log(`\nsites servis   ${servis.length}`)
console.log(`déclarants     ${declarants.length}${declarants.length ? ' — ' + declarants.map((s) => s.slug.slice(0, 32)).join(', ') : ''}`)
console.log(`avis en base   ${eAvis ? 'LECTURE RATÉE ' + eAvis.code : nAvis}`)
console.log(`\n═══ ÉTAT ${declarants.length ? 'APRÈS déclaration' : 'AVANT déclaration'} ═══\n`)

// ── A. CE QUE LA BASE DIT ─────────────────────────────────────────
point(1, 'la colonne se lit', error ? 'LECTURE RATÉE' : 'oui', 'oui')
point(2, 'les avis sont à ZÉRO — c’est la condition qui rend la mesure probante',
  eAvis ? `LECTURE RATÉE ${eAvis.code}` : String(nAvis), '0')

// ── B. LE SITE DE L'ACHETEUR, À SON ADRESSE PUBLIQUE ──────────────
const hCpa = await page(`${ADRESSE_CPA}/`)
const attenduCpa = cpa?.publishes_tenders === true ? 'présent' : 'absent'
point(3, `le lien de menu chez la CPA (déclarée : ${cpa?.publishes_tenders === true ? 'OUI' : 'non'})`,
  lien(hCpa), attenduCpa)
point(4, 'la page des avis répond, déclarée ou non',
  echec(await page(`${ADRESSE_CPA}/appels-offres`)) ? 'injoignable' : 'servie', 'servie')

// ── C. LE SENS QU'ON OUBLIE — les sites MUETS ─────────────────────
console.log(`\n  — les ${muets.length} sites servis qui NE déclarent PAS\n`)
const fuites = [], illisibles = []
for (const s of muets) {
  const h = await page(`${ORIGINE}/sites/${s.slug}`)
  if (echec(h)) { illisibles.push(`${s.slug.slice(0, 22)} (${h.slice(0, 12)})`); continue }
  if (lien(h) === 'présent') fuites.push(s.slug)
}
point(5, `aucun lien sur les ${muets.length - illisibles.length} sites muets RÉELLEMENT lus`,
  fuites.length ? `FUITE : ${fuites.join(', ')}` : 'aucun', 'aucun')
// Une page illisible n'est pas une page sans lien.
point(6, 'tous les sites muets ont pu être LUS',
  illisibles.length ? `${illisibles.length} illisible(s) : ${illisibles.slice(0, 3).join(' · ')}` : 'tous lus', 'tous lus')

console.log(`\n═══ ${verts} / ${vus} ═══`)
process.exit(verts === vus ? 0 : 1)
