/**
 * LA PREUVE À L'ÉCRAN — trois témoins, dans les deux sens.
 *
 * ── CE QU'ELLE GARDE, ET QU'AUCUN CLIQUET NE PEUT GARDER.
 *
 * PRINCIPE P-01 (2026-11-06) : un cliquet qui lit le source garde la RÈGLE,
 * une sonde d'écran garde le RENDU, et aucun des deux ne fait le travail de
 * l'autre. Mesuré le même jour : muter le JSX de la liste en
 * `{false && <span>{ech.marque}</span>}` laisse les 53 tests VERTS. La règle
 * est juste, la fonction la rend, et l'écran ne l'affiche pas. Ce fichier est
 * le seul instrument qui voit cette dernière marche.
 *
 * ── LE TÉMOIN « EN PRÉPARATION » EST LA PIÈCE À REGARDER.
 *
 * Priorité posée par le propriétaire : « c'est le seul des trois dont le faux
 * vert serait invisible — les deux autres se voient à l'œil ». Un avis échu
 * affiché « Ouvert » saute aux yeux ; une marque « (prévisionnelle) » absente
 * ne se remarque que si on la cherche, et son absence fait organiser un
 * fournisseur sur une date qui bougera.
 *
 * ── DANS LES DEUX SENS, TOUJOURS.
 *
 * « L'avis paraît chez la CPA » ne prouve rien seul : une page affichant TOUS
 * les avis de TOUS les acheteurs passerait ce test. La mesure qui compte est
 * celle de l'ABSENCE, et c'est celle qu'on oublie.
 *
 * ── LES DEUX CHEMINS D'ACCÈS.
 *
 * Mesure du 2026-11-06 : `cosmopo-….deribfy.app` rend HTTP 000 — aucun
 * certificat n'a jamais été émis pour ce nom (GEN-D022). Les autres sites ne
 * sont atteignables que par l'ORIGINE PLATEFORME, `/sites/<slug>`. L'acheteur,
 * lui, se mesure à l'adresse que son public verra.
 *
 *   node scripts/prouver-ecran-appels-offres.mjs [urlAcheteur] [originePlateforme]
 *   local : (défauts) http://localhost:3001/sites/<slug> · http://localhost:3001
 *   servi : https://cpa-tchad.deribfy.app · https://www.deribfy.com
 *
 * ── TÉMOINS MANIFESTEMENT TECHNIQUES, ET RETRAIT VÉRIFIÉ DEPUIS L'ADRESSE
 *    PUBLIQUE. Conditions du propriétaire, inchangées depuis (c).
 */
import { clientAdmin } from './temoin-en-base.mjs'

const MARQUE_SLUG = 'temoin-jetable-'
const MARQUE_REF = 'TEMOIN-JETABLE-'
const FILTRE = `reference_slug.like.${MARQUE_SLUG}*,reference.like.${MARQUE_REF}*`
const H = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)
const OBJET = (q) =>
  `TEST TECHNIQUE ${q} — CECI N’EST PAS UN AVIS DE MARCHÉ. Ligne de contrôle ` +
  `automatique, retirée dans la minute. Aucune procédure n’est ouverte. Ne pas y répondre.`

const PASSE = '2020-03-01T10:00:00Z'
const AVENIR = '2099-03-01T10:00:00Z'

/** Les trois témoins. `cle` sert aux adresses, `attendu` à l'écran. */
const TEMOINS = [
  { cle: 'prep',  etat: 'preparation', remise_le: AVENIR, libelle: 'En préparation', groupe: 'enCours' },
  { cle: 'echu',  etat: 'ouvert',      remise_le: PASSE,  libelle: 'Clôturé',        groupe: 'clos' },
  { cle: 'attr',  etat: 'attribue',    remise_le: PASSE,  libelle: 'Attribué',       groupe: 'clos' },
]
const slugDe = (c) => `${MARQUE_SLUG}${H.toLowerCase()}-${c}`
const refDe = (c) => `${MARQUE_REF}${H}-${c.toUpperCase()}`

const sb = clientAdmin('.')
const hhmmss = () => new Date().toISOString().slice(11, 19)
const journal = (q, d) => console.log(`  [${hhmmss()}Z] ${q}${d ? ' — ' + d : ''}`)

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
const echec = (h) => h.startsWith('HTTP ') || h.startsWith('INJOIGNABLE')

/** UNE PAGE NON LUE NE REND JAMAIS « absent ». Confondre « rien à cet
 *  endroit » et « je n'ai rien pu lire » est la famille qu'on traque. */
const contient = (h, a) => (echec(h) ? h : h.includes(a) ? 'présent' : 'absent')

/** `a` apparaît-il AVANT `b` ? Sert à prouver l'ORDRE des sections. */
function ordre(h, a, b) {
  if (echec(h)) return h
  const ia = h.indexOf(a), ib = h.indexOf(b)
  if (ia < 0) return `« ${a.slice(0, 20)} » absent`
  if (ib < 0) return `« ${b.slice(0, 20)} » absent`
  return ia < ib ? 'avant' : 'après'
}

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
console.log(`autres      ${autres.length} site(s) servi(s), TOUS mesurés — aucun échantillon`)
console.log(`témoins     ${TEMOINS.map((t) => refDe(t.cle)).join('  ·  ')}\n`)

await sb.from('appels_offres').delete().or(FILTRE)
let poses = false

try {
  // ── A. LE COMPTE À ZÉRO NE MENT PAS ───────────────────────────────
  console.log('  A. AVANT TOUT AVIS\n')
  const vide = await page(`${ACHETEUR}/appels-offres`)
  point(1, 'la page des avis se sert', echec(vide) ? vide : 'servie', 'servie')
  point(2, 'elle dit qu’aucun avis n’est publié', contient(vide, 'Aucun avis'), 'présent')
  point(3, 'elle n’invente AUCUN canal officiel', contient(vide, 'journal-officiel'), 'absent')
  point(4, 'aucune section vide ne s’affiche', contient(vide, 'Avis clôturés'), 'absent')

  // ── B. TROIS TÉMOINS, TROIS ÉTATS ─────────────────────────────────
  console.log('\n  B. TROIS AVIS PUBLIÉS — un par état visible\n')
  for (const t of TEMOINS) {
    const r = await sb.from('appels_offres').insert({
      site_id: cpa.id, reference: refDe(t.cle), reference_slug: slugDe(t.cle),
      etat: t.etat, objet: OBJET(t.cle.toUpperCase()), remise_le: t.remise_le,
      publie: true, local_caution: '3 000 000 XAF',
    }).select('id').maybeSingle()
    if (r.error) throw new Error(`témoin ${t.cle} non posé : ${r.error.code} ${r.error.message}`)
  }
  poses = true
  journal('POSÉS', `${TEMOINS.length} témoins sur ${cpa.slug.slice(0, 42)}`)

  const liste = await page(`${ACHETEUR}/appels-offres`)
  point(5, 'les DEUX sections paraissent', 
    `${contient(liste, 'Avis en cours')}/${contient(liste, 'Avis clôturés')}`, 'présent/présent')
  point(6, '« en cours » passe AVANT « clôturés »', ordre(liste, 'Avis en cours', 'Avis clôturés'), 'avant')
  for (const [i, t] of TEMOINS.entries()) {
    point(7 + i, `l’état « ${t.libelle} » paraît pour ${t.cle}`, contient(liste, t.libelle), 'présent')
  }
  point(10, 'un avis ÉCHU n’est JAMAIS rendu « Ouvert »',
    echec(liste) ? liste : (liste.match(/>Ouvert</g) ?? []).length === 0 ? 'aucun' : 'PRÉSENT', 'aucun')
  point(11, 'le témoin clôturé est APRÈS le titre « Avis clôturés »',
    ordre(liste, 'Avis clôturés', refDe('echu')), 'avant')

  // ── C. LA PIÈCE À REGARDER — LE TÉMOIN EN PRÉPARATION ─────────────
  console.log('\n  C. LE TÉMOIN EN PRÉPARATION — le seul dont le faux vert serait invisible\n')
  point(12, 'sa date porte « (prévisionnelle) » DANS LA LISTE SERVIE',
    contient(liste, '(prévisionnelle)'), 'présent')
  const dPrep = await page(`${ACHETEUR}/appels-offres/${slugDe('prep')}`)
  point(13, 'son détail se sert', echec(dPrep) ? dPrep : 'servi', 'servi')
  point(14, 'le BANDEAU dit qu’aucune offre n’est encore recevable',
    contient(dPrep, 'aucune offre'), 'présent')
  point(15, 'le libellé devient « Date de remise prévisionnelle »',
    contient(dPrep, 'Date de remise prévisionnelle'), 'présent')
  point(16, 'et le libellé trompeur « Date et heure limite de remise » a DISPARU',
    contient(dPrep, 'Date et heure limite de remise'), 'absent')

  const dEchu = await page(`${ACHETEUR}/appels-offres/${slugDe('echu')}`)
  point(17, 'un avis ÉCHU, lui, garde le libellé « limite » — la marque ne déborde pas',
    contient(dEchu, 'Date et heure limite de remise'), 'présent')
  point(18, 'et son détail ne porte NI bandeau NI marque prévisionnelle',
    `${contient(dEchu, 'aucune offre')}/${contient(dEchu, '(prévisionnelle)')}`, 'absent/absent')

  // ── D. ET SUR AUCUN AUTRE SITE SERVI ──────────────────────────────
  console.log(`\n  D. LE SENS QU’ON OUBLIE — sur AUCUN des ${autres.length} autres sites servis\n`)
  const fuites = [], illisibles = []
  for (const s of autres) {
    const h = await page(`${ORIGINE}/sites/${s.slug}/appels-offres`)
    if (echec(h)) { illisibles.push(`${s.slug.slice(0, 22)} (${h.slice(0, 14)})`); continue }
    if (TEMOINS.some((t) => h.includes(refDe(t.cle))) || h.includes('CECI N’EST PAS UN AVIS')) fuites.push(s.slug)
  }
  point(19, `aucune fuite sur les ${autres.length - illisibles.length} sites RÉELLEMENT lus`,
    fuites.length ? `FUITE : ${fuites.join(', ')}` : 'aucune', 'aucune')
  // UNE PAGE ILLISIBLE N'EST PAS UNE PAGE SANS FUITE.
  point(20, 'tous les autres sites ont pu être LUS',
    illisibles.length ? `${illisibles.length} illisible(s) : ${illisibles.slice(0, 3).join(' · ')}` : 'tous lus', 'tous lus')
  const ailleurs = autres[0]
    ? await page(`${ORIGINE}/sites/${autres[0].slug}/appels-offres/${slugDe('prep')}`)
    : 'HTTP 404'
  point(21, 'la MÊME adresse chez un autre acheteur rend 404',
    ailleurs.startsWith('HTTP 404') ? 'HTTP 404' : ailleurs.slice(0, 26), 'HTTP 404')
} finally {
  // ── E. LE RETRAIT, VÉRIFIÉ DEPUIS L'ADRESSE PUBLIQUE ──────────────
  console.log('\n  E. LE RETRAIT — vérifié DEPUIS L’ADRESSE PUBLIQUE\n')
  const del = await sb.from('appels_offres').delete().or(FILTRE).select('id')
  const reste = await sb.from('appels_offres').select('id,reference').or(FILTRE)
  const enBase = del.error ? `ÉCHEC SUPPRESSION ${del.error.code}`
               : reste.error ? `RELECTURE IMPOSSIBLE ${reste.error.code}`
               : `${reste.data.length} ligne(s)`
  journal('retiré en base', enBase)

  const apres = await page(`${ACHETEUR}/appels-offres`)
  const ok1 = point(22, 'la liste PUBLIQUE ne montre plus aucun témoin',
    echec(apres) ? apres : TEMOINS.some((t) => apres.includes(refDe(t.cle))) ? 'PRÉSENT' : 'absent', 'absent')
  let ok2 = true
  for (const [i, t] of TEMOINS.entries()) {
    const d = await page(`${ACHETEUR}/appels-offres/${slugDe(t.cle)}`)
    ok2 = point(23 + i, `l’adresse publique de ${t.cle} rend 404`,
      d.startsWith('HTTP 404') ? 'HTTP 404' : d.slice(0, 24), 'HTTP 404') && ok2
  }
  const ok3 = point(26, 'plus aucune ligne témoin en base', enBase, '0 ligne(s)')

  if (poses && !(ok1 && ok2 && ok3)) {
    console.log('\n' + '█'.repeat(68))
    console.log('█  RETRAIT NON CONFIRMÉ — UN TÉMOIN PEUT ÊTRE ENCORE PUBLIC.')
    for (const t of TEMOINS) console.log(`█  ${refDe(t.cle)}  →  ${ACHETEUR}/appels-offres/${slugDe(t.cle)}`)
    console.log('█  RETIRER À LA MAIN AVANT TOUTE AUTRE CHOSE.')
    console.log('█'.repeat(68) + '\n')
  }
}

console.log(`\n═══ ${verts} / ${vus} ═══`)
process.exit(verts === vus ? 0 : 1)
