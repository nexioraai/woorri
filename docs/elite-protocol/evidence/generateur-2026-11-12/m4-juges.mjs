// M4 — INVENTAIRE DES JUGES : ce que chacun vérifie, combien de fois il a
// refusé, s'il en recouvre un autre.
//
// RÈGLES DÉCLARÉES AVANT LA MESURE
//  · UN JUGE = un fichier `apps/web/src/lib/apps/juge-*.ts`, plus les deux
//    contrôles qui refusent sans fichier propre : l'ASSEMBLAGE (« La
//    construction a échoué ») et les juges dont le reproche est écrit dans
//    boucle-directe.ts.
//  · RATTACHEMENT D'UN INTITULÉ DE REFUS À SON JUGE : on cherche l'intitulé
//    dans les sources ; s'il est écrit dans boucle-directe.ts, on remonte à
//    la condition `if (…)` qui le précède et on l'IMPRIME — le lecteur voit
//    la variable (donc le juge) sans croire le script sur parole.
//  · EXPOSITION : un intitulé ne peut refuser que les générations créées
//    APRÈS son entrée dans le dépôt (`git log -S <intitulé> --reverse`,
//    premier commit). Date de COMMIT, pas de mise en production : borne basse.
//  · « BRANCHÉ » : la fonction du juge est appelée dans boucle-directe.ts.
//  · RECOUVREMENT MESURÉ : deux intitulés dans le MÊME tour refusé
//    (co-occurrence). Le recouvrement de NATURE (deux juges qui observent le
//    même montage) est rapporté à part, depuis le code, et dit comme tel.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { charger, ecrire, toursDe, classesDuMotif } from './commun.mjs'

const RACINE = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const APPS = join(RACINE, 'apps/web/src/lib/apps')
const BOUCLE = readFileSync(join(APPS, 'boucle-directe.ts'), 'utf8')
const { lignes, sha } = charger()
const git = (...a) => execFileSync('git', a, { cwd: RACINE, encoding: 'utf8' }).trim()

// ── LES FICHIERS DE JUGES
const juges = readdirSync(APPS).filter((f) => /^juge-.*\.ts$/u.test(f)).map((f) => {
  const src = readFileSync(join(APPS, f), 'utf8')
  const fonctions = [...src.matchAll(/export (?:async )?function (juger\w+)/gu)].map((m) => m[1])
  const titre = src.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/u)?.[1]?.trim() ?? ''
  const cree = git('log', '--diff-filter=A', '--format=%aI', '--', join('apps/web/src/lib/apps', f)).split('\n').pop()
  const branche = fonctions.some((fn) => new RegExp(`\\b${fn}\\b\\s*\\)?\\s*\\(|\\?\\?\\s*${fn}\\)`, 'u').test(BOUCLE))
  return { fichier: f, fonctions, titre, cree, brancheDansLaBoucle: branche }
})

// ── LES INTITULÉS DE REFUS OBSERVÉS, rattachés
const normCle = (c) => c.replace(/^DERNIER TOUR\.\s*/u, '')
const comptes = new Map(), generationsParCle = new Map(), coOcc = new Map()
let toursRefuses = 0
for (const l of lignes) for (const t of toursDe(l)) {
  if (t.ok) continue
  toursRefuses++
  const cles = [...new Set(classesDuMotif(t.motif).map((c) => normCle(c.cle)))]
  for (const k of cles) {
    comptes.set(k, (comptes.get(k) ?? 0) + 1)
    if (!generationsParCle.has(k)) generationsParCle.set(k, new Set())
    generationsParCle.get(k).add(l.id)
  }
  for (let i = 0; i < cles.length; i++) for (let j = i + 1; j < cles.length; j++) {
    const p = [cles[i], cles[j]].sort().join(' ⟷ ')
    coOcc.set(p, (coOcc.get(p) ?? 0) + 1)
  }
}

const SOURCES = execFileSync('git', ['ls-files', 'apps/web/src/lib/apps', 'apps/web/src/app/api/generateur'], { cwd: RACINE, encoding: 'utf8' }).split('\n').filter((f) => /\.ts$/u.test(f) && !f.includes('__tests__'))
const textes = SOURCES.map((f) => ({ f, s: readFileSync(join(RACINE, f), 'utf8') }))
const intitules = [...comptes.keys()].map((k) => {
  const aiguille = k === 'CONSTRUCTION' ? 'La construction a échoué' : k.slice(0, 22)
  const ou = textes.filter((x) => x.s.includes(aiguille)).map((x) => x.f.replace('apps/web/src/', ''))
  let condition = null
  const i = BOUCLE.indexOf(aiguille)
  if (k === 'CONSTRUCTION') {
    // Ce message part de la branche « sinon » de `if (v.ok)`, juste après
    // `const v = await assembler(carte)`. Vérifié ici, pas affirmé :
    const iAssemble = BOUCLE.indexOf('const v = await assembler(carte)')
    const iSinon = BOUCLE.lastIndexOf('} else {', i)
    if (iAssemble === -1 || iSinon === -1 || iSinon < iAssemble) throw new Error('rattachement CONSTRUCTION non vérifiable')
    condition = 'branche « sinon » de if (v.ok), après const v = await assembler(carte)'
  } else if (i !== -1) {
    const avant = BOUCLE.slice(0, i).split('\n')
    condition = [...avant].reverse().find((ligne) => /^\s*(?:if|\} else if) \(/u.test(ligne))?.trim() ?? null
  }
  let introduit = null
  try { introduit = git('log', '-S', aiguille, '--reverse', '--format=%aI %h', '--', 'apps/web/src/lib/apps').split('\n')[0] || null } catch { introduit = null }
  const dateIntro = introduit ? Date.parse(introduit.split(' ')[0]) : null
  const exposees = dateIntro === null ? null : lignes.filter((l) => Date.parse(l.created_at) >= dateIntro && toursDe(l).length > 0).length
  return { intitule: k, toursRefuses: comptes.get(k), generations: generationsParCle.get(k).size, exposees, ecritDans: ou, conditionDansLaBoucle: condition, introduit }
}).sort((a, b) => b.toursRefuses - a.toursRefuses)

// ── RATTACHEMENT INTITULÉ → FICHIER DE JUGE.
// Écrit dans un juge-*.ts : ce fichier. Écrit dans boucle-directe.ts : la
// VARIABLE de sa condition, dont la déclaration doit appeler le juge — c'est
// VÉRIFIÉ ci-dessous (le script s'arrête sinon).
const VARIABLE_VERS_JUGE = { couverture: ['juge-couverture.ts', 'jugerCouverture'], jetons: ['juge-jetons.ts', 'jugerJetons'], vivacite: ['juge-vivacite.ts', 'jugerVivacite'], execution: ['juge-execution.ts', 'jugerExecution'] }
for (const [v, [, fn]] of Object.entries(VARIABLE_VERS_JUGE)) {
  const decl = v === 'execution' ? 'const accueil' : `const ${v} =`
  const j = BOUCLE.indexOf(decl)
  if (j === -1 || !BOUCLE.slice(j, j + 200).includes(fn)) throw new Error(`rattachement non vérifiable : ${v} → ${fn}`)
}
for (const r of intitules) {
  const direct = r.ecritDans.find((f) => /juge-[\w-]+\.ts$/u.test(f))
  if (r.intitule === 'CONSTRUCTION') r.juge = 'ASSEMBLAGE (bac-a-sable.ts › assembler)'
  else if (direct) r.juge = direct.split('/').pop()
  else {
    const v = r.conditionDansLaBoucle?.match(/\(\(?\s*([a-z]+)/u)?.[1]
    r.juge = VARIABLE_VERS_JUGE[v]?.[0] ?? 'INCONNU'
  }
}
for (const j of juges) {
  const t = Date.parse(j.cree)
  j.generationsExposees = j.brancheDansLaBoucle ? lignes.filter((l) => Date.parse(l.created_at) >= t && toursDe(l).length > 0).length : 0
  j.toursRefusesAttribues = intitules.filter((r) => r.juge === j.fichier).reduce((a, r) => a + r.toursRefuses, 0)
  j.intitulesObserves = intitules.filter((r) => r.juge === j.fichier).map((r) => r.intitule)
}

// ── UN ANGLE QU'AUCUN JUGE NE COUVRE, MESURÉ : des écrans d'ERREUR DE
// NAVIGATION rendus par l'œuvre livrée et enregistrés par le juge
// d'exécution, sans refus. Motif déclaré : « section inconnue »,
// « introuvable », « page non trouvée », « not found ».
const NAV = /section inconnue|introuvable|page non trouvée|not found/iu
const ecransNavigation = lignes.map((l) => {
  const ecrans = l.sections_acquises?.execution?.ecrans ?? []
  return { id: l.id, livree: toursDe(l).some((t) => t.ok), ecrans: ecrans.length, ecransErreurNavigation: ecrans.filter((e) => NAV.test(e.texte ?? '')).length }
}).filter((x) => x.ecransErreurNavigation > 0)

const sortie = { instantane_sha256: sha, ecransNavigation, toursRefuses, juges, intitules, coOccurrences: Object.fromEntries([...coOcc].sort((a, b) => b[1] - a[1])) }
ecrire('m4-juges.json', sortie)

console.log(`instantané ${sha.slice(0, 12)} · ${toursRefuses} tours refusés\n`)
console.log('FICHIERS DE JUGES :')
for (const j of juges) console.log(`  ${j.fichier.padEnd(22)} créé ${j.cree.slice(0, 10)} · branché=${j.brancheDansLaBoucle} · exposé à ${j.generationsExposees} générations · ${j.toursRefusesAttribues} tours refusés\n      « ${j.titre} »`)
console.log('\nINTITULÉS DE REFUS OBSERVÉS :')
for (const r of intitules) console.log(`  ${String(r.toursRefuses).padStart(2)} tours · ${r.generations} générations / ${r.exposees ?? '?'} exposées · ${r.intitule}\n      écrit dans: ${r.ecritDans.join(', ')}\n      juge: ${r.juge} · condition: ${r.conditionDansLaBoucle ?? '(hors boucle-directe)'}\n      introduit: ${r.introduit ?? 'INCONNU'}`)
console.log('\nÉCRANS D’ERREUR DE NAVIGATION ENREGISTRÉS SANS REFUS :', JSON.stringify(ecransNavigation))
console.log('\nCO-OCCURRENCES (même tour refusé) :')
for (const [p, n] of Object.entries(sortie.coOccurrences)) console.log(`  ${n} × ${p}`)
