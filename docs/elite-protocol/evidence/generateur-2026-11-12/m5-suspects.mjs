// M5 (suite) — LES COMMITS DU GÉNÉRATEUR ENTRE LE 2026-11-04 ET AUJOURD'HUI.
//
// Liste demandée par le propriétaire pour l'issue « régression » de M5 :
// des SUSPECTS, pas des coupables. Aucun n'est corrigé ni annulé ici.
//
// RÈGLE : commits touchant le générateur — `apps/web/src/lib/apps/`
// (hors `__tests__/`) et `apps/web/src/app/api/generateur/` — dont la date
// d'auteur est ≥ 2026-11-04T00:00:00Z. Pour chacun : les fichiers du
// générateur touchés, et les lignes ajoutées/retirées sur ces fichiers.
//   node docs/elite-protocol/evidence/generateur-2026-11-12/m5-suspects.mjs
import { execFileSync } from 'node:child_process'
import { ecrire } from './commun.mjs'

const CHEMINS = ['apps/web/src/lib/apps', 'apps/web/src/app/api/generateur']
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const brut = git('log', '--since=2026-11-04T00:00:00Z', '--format=@@%H|%aI|%s', '--numstat', '--', ...CHEMINS)
const commits = []
for (const bloc of brut.split('@@').filter((b) => b.trim())) {
  const [tete, ...lignes] = bloc.trim().split('\n')
  const [hash, date, ...sujet] = tete.split('|')
  const fichiers = lignes.filter(Boolean).map((l) => { const [a, r, f] = l.split('\t'); return { f, a: Number(a) || 0, r: Number(r) || 0 } })
    .filter((x) => !x.f.includes('/__tests__/') && CHEMINS.some((c) => x.f.startsWith(c)))
  if (fichiers.length === 0) continue
  commits.push({ hash: hash.slice(0, 8), date, sujet: sujet.join('|'), fichiers: fichiers.map((x) => x.f.replace('apps/web/src/', '')), ajouts: fichiers.reduce((s, x) => s + x.a, 0), retraits: fichiers.reduce((s, x) => s + x.r, 0) })
}
commits.reverse()
const parFichier = {}
for (const c of commits) for (const f of c.fichiers) parFichier[f] = (parFichier[f] ?? 0) + 1
ecrire('m5-suspects.json', { regle: 'voir en-tête', total: commits.length, parFichier, commits })
console.log(`${commits.length} commits du générateur depuis le 2026-11-04 (hors tests)\n`)
for (const c of commits) console.log(`${c.hash} ${c.date.slice(0, 16)} +${c.ajouts}/-${c.retraits} · ${c.sujet.slice(0, 90)}\n    ${c.fichiers.join(', ')}`)
console.log('\nFICHIERS LES PLUS TOUCHÉS :', JSON.stringify(Object.fromEntries(Object.entries(parFichier).sort((a, b) => b[1] - a[1]).slice(0, 12))))
