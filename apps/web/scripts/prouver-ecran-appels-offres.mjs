/**
 * LA PREUVE À L'ÉCRAN — un avis paraît chez SON acheteur, et sur AUCUN autre.
 *
 * ── POURQUOI DANS LES DEUX SENS.
 *
 * « L'avis paraît chez la CPA » ne prouve rien seul : une page qui afficherait
 * TOUS les avis de TOUS les acheteurs passerait ce test. La mesure qui compte
 * est celle de l'ABSENCE — et c'est celle qu'on oublie.
 *
 * ── CE QU'ELLE MESURE QUE LES 21 POINTS EN BASE NE MESURENT PAS.
 *
 * `mesurer-appels-offres.mjs` interroge la BASE. Celui-ci lit l'ÉCRAN. Une
 * base juste et une vue non branchée donneraient un site vide SANS AUCUNE
 * ERREUR. Seule une lecture de l'écran distingue « la base refuse » de « la
 * page n'affiche pas ».
 *
 * ── LES DEUX CHEMINS D'ACCÈS, ET POURQUOI ILS DIFFÈRENT.
 *
 * Mesure du 2026-11-06 : `cosmopo-….deribfy.app` rend HTTP 000 — aucun
 * certificat n'a jamais été émis pour ce nom (GEN-D022, un sous-domaine
 * jamais demandé n'en a pas). Les autres sites ne sont donc atteignables que
 * par l'ORIGINE PLATEFORME, `/sites/<slug>`. L'acheteur, lui, se mesure à
 * l'adresse que son public verra.
 *
 *   node scripts/prouver-ecran-appels-offres.mjs [urlAcheteur] [originePlateforme]
 *
 *   local  : (défauts)  http://localhost:3001/sites/<slug>  ·  http://localhost:3001
 *   servi  : https://cpa-tchad.deribfy.app  ·  https://www.deribfy.com
 *
 * ── LE TÉMOIN EST MANIFESTEMENT TECHNIQUE, ET C'EST UNE CONDITION.
 *
 * Arbitrage du propriétaire, 2026-11-06 : « un faux avis CRÉDIBLE de quelques
 * secondes sur le site d'un établissement public est un risque ; un témoin
 * manifestement technique n'en est pas un ». La référence porte
 * `TEMOIN-JETABLE-<horodatage>` et l'objet dit EN TOUTES LETTRES que ce n'est
 * pas un avis de marché. Même s'il survivait à un plantage, personne ne
 * pourrait le confondre avec une procédure réelle.
 *
 * ── LE RETRAIT SE VÉRIFIE DEPUIS L'ADRESSE PUBLIQUE.
 *
 * Pas depuis la base. Une ligne supprimée que la page affiche encore (cache,
 * rendu figé) resterait visible du public pendant que la base jurerait le
 * contraire. Et si le retrait échoue, on le DIT bruyamment et tout de suite
 * au lieu de passer à la suite.
 */
import { clientAdmin } from './temoin-en-base.mjs'

const MARQUE_SLUG = 'temoin-jetable-'
const MARQUE_REF = 'TEMOIN-JETABLE-'
const FILTRE = `reference_slug.like.${MARQUE_SLUG}*,reference.like.${MARQUE_REF}*`

const horodatage = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) // 20261106T210000
const REF = `${MARQUE_REF}${horodatage}`
const REF_SLUG = `${MARQUE_SLUG}${horodatage.toLowerCase()}`
const OBJET =
  'TEST TECHNIQUE — CECI N’EST PAS UN AVIS DE MARCHÉ. ' +
  'Ligne de contrôle automatique posée pour vérifier l’affichage, retirée ' +
  'dans la minute. Aucune procédure n’est ouverte. Ne pas y répondre.'

const sb = clientAdmin('.')
const hhmmss = () => new Date().toISOString().slice(11, 19)
const journal = (q, d) => console.log(`  [${hhmmss()}] ${q}${d ? ' — ' + d : ''}`)

let vus = 0, verts = 0
function point(n, libelle, obtenu, attendu) {
  vus += 1
  const ok = obtenu === attendu
  if (ok) verts += 1
  console.log(`  ${ok ? '🟢' : '🔴'} ${String(n).padStart(2)}. ${libelle}`)
  if (!ok) console.log(`        attendu « ${attendu} » · obtenu « ${obtenu} »`)
  return ok
}

async function page(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } })
    if (!r.ok) return `HTTP ${r.status}`
    return await r.text()
  } catch (e) {
    return `INJOIGNABLE ${String(e.message).slice(0, 40)}`
  }
}

/** Vrai quand `page()` a rendu une ERREUR au lieu d'un document. */
const echec = (h) => h.startsWith('HTTP ') || h.startsWith('INJOIGNABLE')

/**
 * UNE PAGE NON LUE NE REND JAMAIS « absent ».
 *
 * DÉFAUT MESURÉ DE CE FICHIER MÊME, 2026-11-06. Un point testait une
 * expression régulière DIRECTEMENT sur le texte rendu : serveur injoignable,
 * il annonçait « absent ». Son attendu était « présent », il a rougi par
 * chance. Mais QUATRE autres points ATTENDENT « absent » — le même raccourci
 * les aurait rendus VERTS sur une page jamais servie. Confondre « rien à cet
 * endroit » et « je n'ai rien pu lire » est exactement la famille qu'on
 * traque.
 */
const contient = (h, a) => (echec(h) ? h : h.includes(a) ? 'présent' : 'absent')
const correspond = (h, m) => (echec(h) ? h : m.test(h) ? 'présent' : 'absent')

// ── LES SITES, DÉCOUVERTS ───────────────────────────────────────────
const { data: sites, error: eS } = await sb
  .from('sites').select('id,slug,name,published,archived_at').limit(2000)
if (eS) { console.error('lecture des sites impossible :', eS.message); process.exit(1) }

const servis = sites.filter((s) => s.published === true && s.archived_at === null)
const cpa = servis.find((s) => /pharmaceutique/i.test(s.name ?? ''))
if (!cpa) { console.error('site de la CPA introuvable parmi les sites servis'); process.exit(1) }

const ORIGINE = process.argv[3] ?? 'http://localhost:3001'
const ACHETEUR = process.argv[2] ?? `${ORIGINE}/sites/${cpa.slug}`
const autres = servis.filter((s) => s.id !== cpa.id)

console.log(`\nacheteur    ${ACHETEUR}`)
console.log(`plateforme  ${ORIGINE}`)
console.log(`autres      ${autres.length} site(s) servi(s), TOUS mesurés — aucun échantillon\n`)
console.log(`témoin      ${REF}`)
console.log(`            « ${OBJET.slice(0, 62)}… »\n`)

await sb.from('appels_offres').delete().or(FILTRE)
let pose = false

try {
  // ── A. LE COMPTE À ZÉRO NE MENT PAS ───────────────────────────────
  console.log('  A. AVANT TOUT AVIS — le compte à zéro\n')
  const vide = await page(`${ACHETEUR}/appels-offres`)
  point(1, 'la page des avis se sert', echec(vide) ? vide : 'servie', 'servie')
  point(2, 'elle dit qu’aucun avis n’est publié', contient(vide, 'Aucun avis'), 'présent')
  point(3, 'elle n’invente AUCUN canal officiel', contient(vide, 'journal-officiel'), 'absent')
  point(4, 'elle donne le contact réellement déclaré', contient(vide, 'contact@cpa.td'), 'présent')

  // ── B. L'AVIS PARAÎT CHEZ SON ACHETEUR ────────────────────────────
  console.log('\n  B. UN AVIS PUBLIÉ — chez son acheteur\n')
  const ins = await sb.from('appels_offres').insert({
    site_id: cpa.id, reference: REF, reference_slug: REF_SLUG, etat: 'ouvert',
    objet: OBJET, remise_le: '2026-12-01T10:00:00Z', publie: true,
    local_caution: '3 000 000 XAF', methode: 'TEST TECHNIQUE',
  }).select('id').maybeSingle()
  if (ins.error) throw new Error(`témoin non posé : ${ins.error.code} ${ins.error.message}`)
  pose = true
  journal('POSÉ', `${REF} sur ${cpa.slug.slice(0, 44)}`)

  const chezLui = await page(`${ACHETEUR}/appels-offres`)
  point(5, 'la référence paraît dans la liste', contient(chezLui, REF), 'présent')
  point(6, 'l’objet paraît', contient(chezLui, 'CECI N’EST PAS UN AVIS'), 'présent')
  point(7, 'l’échéance porte l’HEURE, pas seulement la date', correspond(chezLui, /\d{1,2}:\d{2}/), 'présent')
  point(8, 'l’état est rendu lisible, jamais la valeur brute', contient(chezLui, 'Ouvert'), 'présent')
  point(9, 'l’adresse du détail porte la RÉFÉRENCE', contient(chezLui, `/appels-offres/${REF_SLUG}`), 'présent')

  const detail = await page(`${ACHETEUR}/appels-offres/${REF_SLUG}`)
  point(10, 'le détail se sert', echec(detail) ? detail : 'servi', 'servi')
  point(11, 'il porte une rubrique que la liste n’affiche pas', contient(detail, '3 000 000 XAF'), 'présent')
  point(12, 'il n’affiche PAS les rubriques non renseignées', contient(detail, 'Critères de notation'), 'absent')
  point(13, 'il DIT que les rubriques absentes ne l’ont pas été', contient(detail, 'n’ont pas été renseignées'), 'présent')

  // ── C. ET SUR AUCUN AUTRE SITE SERVI ──────────────────────────────
  console.log(`\n  C. LE SENS QU’ON OUBLIE — sur AUCUN des ${autres.length} autres sites servis\n`)
  const fuites = []
  const illisibles = []
  for (const s of autres) {
    const h = await page(`${ORIGINE}/sites/${s.slug}/appels-offres`)
    if (echec(h)) { illisibles.push(`${s.slug} (${h.slice(0, 18)})`); continue }
    if (h.includes(REF) || h.includes('CECI N’EST PAS UN AVIS')) fuites.push(s.slug)
  }
  point(14, `aucune fuite sur les ${autres.length - illisibles.length} sites RÉELLEMENT lus`,
    fuites.length ? `FUITE : ${fuites.join(', ')}` : 'aucune', 'aucune')
  // UNE PAGE ILLISIBLE N'EST PAS UNE PAGE SANS FUITE. Les compter à part est
  // la seule façon de ne pas transformer un échec de lecture en preuve.
  point(15, 'tous les autres sites ont pu être LUS',
    illisibles.length ? `${illisibles.length} illisible(s) : ${illisibles.slice(0, 3).join(' · ')}` : 'tous lus', 'tous lus')

  const detailAilleurs = autres[0]
    ? await page(`${ORIGINE}/sites/${autres[0].slug}/appels-offres/${REF_SLUG}`)
    : 'HTTP 404'
  point(16, 'la MÊME adresse chez un autre acheteur rend 404',
    detailAilleurs.startsWith('HTTP 404') ? 'HTTP 404' : detailAilleurs.slice(0, 26), 'HTTP 404')
} finally {
  // ── LE RETRAIT, PUIS SA VÉRIFICATION DEPUIS L'ADRESSE PUBLIQUE ────
  console.log('\n  D. LE RETRAIT — vérifié DEPUIS L’ADRESSE PUBLIQUE\n')
  const del = await sb.from('appels_offres').delete().or(FILTRE).select('id')
  const reste = await sb.from('appels_offres').select('id,reference').or(FILTRE)
  // MÊME PIÈGE, DANS CE FICHIER MÊME. Si la SUPPRESSION réussit mais que la
  // RELECTURE échoue, `reste.data` vaut `null`, le repli rend 0, et le point
  // 19 annonce « plus aucune ligne témoin » sans avoir rien relu — sur la
  // vérification d'un retrait, c'est le pire endroit possible pour un faux
  // vert. Les deux erreurs sont donc nommées séparément.
  const enBase = del.error ? `ÉCHEC SUPPRESSION ${del.error.code}`
               : reste.error ? `RELECTURE IMPOSSIBLE ${reste.error.code}`
               : `${reste.data.length} ligne(s)`
  journal('retiré en base', enBase)

  const listeApres = await page(`${ACHETEUR}/appels-offres`)
  const detailApres = await page(`${ACHETEUR}/appels-offres/${REF_SLUG}`)
  const ok1 = point(17, 'la liste PUBLIQUE ne le montre plus', contient(listeApres, REF), 'absent')
  const ok2 = point(18, 'son adresse PUBLIQUE rend 404',
    detailApres.startsWith('HTTP 404') ? 'HTTP 404' : detailApres.slice(0, 26), 'HTTP 404')
  const ok3 = point(19, 'plus aucune ligne témoin en base', enBase, '0 ligne(s)')

  if (pose && !(ok1 && ok2 && ok3)) {
    console.log('\n' + '█'.repeat(66))
    console.log('█  RETRAIT NON CONFIRMÉ — UN TÉMOIN PEUT ÊTRE ENCORE PUBLIC.')
    console.log(`█  référence : ${REF}`)
    console.log(`█  adresse   : ${ACHETEUR}/appels-offres/${REF_SLUG}`)
    console.log('█  RETIRER À LA MAIN AVANT TOUTE AUTRE CHOSE.')
    console.log('█'.repeat(66) + '\n')
  }
}

console.log(`\n═══ ${verts} / ${vus} ═══`)
process.exit(verts === vus ? 0 : 1)
