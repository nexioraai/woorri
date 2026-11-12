// M2 — TYPOLOGIE DES ÉCHECS DE CONSTRUCTION (motif « La construction a échoué »).
//
// QUESTION : 3 types qui couvrent 15 cas, ou 20 types différents ? Et QUI
// en est l'auteur — le modèle, ou l'environnement d'assemblage de Deribfy ?
//
// RÈGLES DÉCLARÉES AVANT LA MESURE
//  · TYPE = la catégorie du message : le code entre crochets du compilateur
//    ([PARSE_ERROR]…), sinon « BINDING_NATIF_ROLLDOWN » (message « Cannot
//    find native binding »), sinon « PAQUET_NON_EMBARQUE ».
//  · SOUS-TYPE = le texte exact de l'erreur, sans numéro de ligne.
//  · AUTEUR (règle, pas impression) :
//      BINDING_NATIF_ROLLDOWN            → ENVIRONNEMENT : le binaire de
//          l'assembleur manque ; le message ne cite aucun fichier du modèle.
//      PAQUET_NON_EMBARQUE dont la liste contient un paquet NATIF
//          (react-native*, expo*)        → MODÈLE : il a écrit du code
//          natif dans une application web.
//      PAQUET_NON_EMBARQUE dont la liste ne contient QUE react / react-dom*
//                                        → CONTESTÉ : une application web
//          React DOIT importer React. Le script mesure ci-dessous si des
//          œuvres ACCEPTÉES importaient 'react' : si oui, l'environnement
//          le fournissait parfois, et l'échec tient à l'environnement.
//      PARSE_ERROR                       → MODÈLE (texte qui n'est pas du
//          code valide) ; le drapeau `tronquee` du tour dit si la réponse a
//          été COUPÉE par la limite de sortie (alors la cause est la coupe).
import { charger, ecrire, toursDe, classesDuMotif, sansAnsi } from './commun.mjs'

const { lignes, sha } = charger()
const NATIF = /^(react-native|expo)/u

const echecs = []
for (const l of lignes) for (const t of toursDe(l)) {
  if (t.ok) continue
  for (const c of classesDuMotif(t.motif)) {
    if (c.cle !== 'CONSTRUCTION') continue
    const m = sansAnsi(c.texte)
    const type = m.match(/\[([A-Z_]+)\]/u)?.[1] ?? (m.includes('Cannot find native binding') ? 'BINDING_NATIF_ROLLDOWN' : m.includes('non embarqué') ? 'PAQUET_NON_EMBARQUE' : 'AUTRE')
    const fichier = m.match(/╭─\[\s*([^:\]]+)/u)?.[1]?.trim() ?? null
    const paquets = (m.match(/non embarqué\(s\) dans le bundle : ([^—]+)/u)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    let sousType = type
    if (type === 'PARSE_ERROR') sousType = m.match(/\[PARSE_ERROR\]\s*([^\n]+)/u)?.[1]?.trim()
    if (type === 'PAQUET_NON_EMBARQUE') sousType = paquets.some((p) => NATIF.test(p)) ? 'contient un paquet natif' : 'react / react-dom seulement'
    let auteur
    if (type === 'BINDING_NATIF_ROLLDOWN') auteur = 'ENVIRONNEMENT'
    else if (type === 'PAQUET_NON_EMBARQUE') auteur = paquets.some((p) => NATIF.test(p)) ? 'MODÈLE (natif)' : 'CONTESTÉ (react seul)'
    else if (type === 'PARSE_ERROR') auteur = t.tronquee === true ? 'COUPE DE SORTIE (tronquée)' : 'MODÈLE (syntaxe)'
    else auteur = 'INCONNU'
    echecs.push({ id: l.id, date: l.created_at.slice(0, 10), tour: t.rang, tronquee: t.tronquee ?? null, type, sousType, fichier, paquets, auteur, message: m.split('\n').slice(0, 8).join('\n') })
  }
}

// ── LA CONTRE-MESURE DU CAS « CONTESTÉ » : des œuvres acceptées importaient-elles 'react' ?
const importeReact = (src) => /from\s+['"]react['"]|from\s+['"]react-dom(\/client)?['"]/u.test(src)
const acceptees = []
for (const l of lignes) {
  if (!toursDe(l).some((t) => t.ok)) continue
  const f = l.document?.fichiers
  const entrees = f ? (Array.isArray(f) ? f : Object.entries(f)) : []
  const code = entrees.map((e) => (Array.isArray(e) ? e[1] : e?.contenu ?? '')).join('\n')
  acceptees.push({ id: l.id, date: l.created_at.slice(0, 10), fichiersEnBase: entrees.length, importeReact: entrees.length ? importeReact(code) : null })
}

// ── LES CAUSES DOCUMENTÉES DANS LE CODE, CROISÉES AVEC L'HEURE DE CHAQUE ÉCHEC.
// Les dates des commits sont LUES dans git ici, pas recopiées.
//   c6040924 « L'assemblage ne dépend plus du disque de la fonction (EP-294) »
//            — cause documentée : react absent du disque de la fonction
//            (apps/web/src/lib/apps/react-embarque.ts, en-tête).
//   8eef0e6e « Le modèle décorait sa sortie, et le lecteur gardait la
//            décoration » — cause documentée de b21cf508 : clôtures markdown
//            gardées par le lecteur (apps/web/src/lib/apps/ecriture-directe.ts).
// Ces causes sont DOCUMENTÉES, pas re-mesurées par ce script.
import { execFileSync } from 'node:child_process'
const dateCommit = (h) => execFileSync('git', ['show', '-s', '--format=%aI', h], { encoding: 'utf8' }).trim()
const CORRECTIFS = { disque_react: { commit: 'c6040924', date: dateCommit('c6040924') }, cloture_markdown: { commit: '8eef0e6e', date: dateCommit('8eef0e6e') } }
for (const e of echecs) {
  const t = Date.parse(lignes.find((l) => l.id === e.id).created_at)
  e.avant_correctif_disque_react = t < Date.parse(CORRECTIFS.disque_react.date)
  e.avant_correctif_cloture_markdown = t < Date.parse(CORRECTIFS.cloture_markdown.date)
}
const accepteeAvantDisque = acceptees.filter((a) => a.importeReact && Date.parse(lignes.find((l) => l.id === a.id).created_at) < Date.parse(CORRECTIFS.disque_react.date))

const grouper = (cle) => { const m = new Map(); for (const e of echecs) m.set(e[cle], (m.get(e[cle]) ?? 0) + 1); return Object.fromEntries([...m].sort((a, b) => b[1] - a[1])) }
const sortie = { instantane_sha256: sha, correctifs: CORRECTIFS, accepteesImportantReactAvantCorrectifDisque: accepteeAvantDisque.map((a) => a.id), total: echecs.length, generationsTouchees: new Set(echecs.map((e) => e.id)).size, parType: grouper('type'), parSousType: grouper('sousType'), parAuteur: grouper('auteur'), echecs, contreMesureReact: acceptees }
ecrire('m2-builds.json', sortie)

console.log(`instantané ${sha.slice(0, 12)} · ${echecs.length} échecs de construction · ${sortie.generationsTouchees} générations\n`)
console.log('PAR TYPE      :', JSON.stringify(sortie.parType))
console.log('PAR SOUS-TYPE :', JSON.stringify(sortie.parSousType, null, 1))
console.log('PAR AUTEUR    :', JSON.stringify(sortie.parAuteur))
console.log('\nDÉTAIL :')
for (const e of echecs) console.log(`  ${e.id.slice(0, 8)} ${e.date} T${e.tour} tronquée=${e.tronquee} · ${e.type} · ${e.sousType}${e.fichier ? ' @ ' + e.fichier : ''}${e.paquets.length ? ' [' + e.paquets.join(', ') + ']' : ''} → ${e.auteur}`)
console.log('\nCROISEMENT AVEC LES CORRECTIFS DOCUMENTÉS :', JSON.stringify(CORRECTIFS))
for (const e of echecs.filter((x) => x.type === 'PAQUET_NON_EMBARQUE' || x.sousType === 'Unterminated string')) console.log(`  ${e.id.slice(0, 8)} T${e.tour} ${e.sousType} · avant correctif disque-react=${e.avant_correctif_disque_react} · avant correctif clôture-markdown=${e.avant_correctif_cloture_markdown}`)
console.log('  œuvres ACCEPTÉES important react AVANT le correctif disque-react :', accepteeAvantDisque.map((a) => a.id.slice(0, 8)).join(', ') || 'aucune')
console.log('\nCONTRE-MESURE — œuvres ACCEPTÉES : importent-elles react ?')
for (const a of acceptees) console.log(`  ${a.id.slice(0, 8)} ${a.date} fichiers en base=${a.fichiersEnBase} importe react=${a.importeReact}`)
