// M12 — « Unexpected token 'export' » : fichier, ligne, auteur, et pourquoi le juge ne l'a pas vu.
//
// Trois œuvres livrées le 2026-11-13, mesurées avec le même instrument :
//   · 4b8b1d20 — pièces auto, plante dans l'aperçu (« Unexpected token 'export' ») ;
//   · f29323f6 — pièces auto, même cahier, s'affiche ;
//   · 44ca6bbe — couture (étape 1), plante sur `process` (M9).
// Pour chacune, GRATUITEMENT : les exports de tête de module écrits par le
// modèle dans index.tsx ; les lignes `export` qui SURVIVENT dans le paquet
// assemblé (assembler, inchangé) ; la page reconstruite EXACTEMENT comme le
// GET de l'atelier (pageAutonome(code, 'Votre application', undefined,
// 'apercu')) — écrite dans un dossier de travail passé en argument, pour que
// m12-navigateur.mjs la charge dans de vrais navigateurs ; et le verdict du
// juge d'exécution sur le paquet NU, tel que la boucle le juge.
//
//   cd apps/web && npx tsx <ce fichier> <dossier-de-travail>
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'
import { assembler } from '@/lib/apps/bac-a-sable'
import { jugerExecution } from '@/lib/apps/juge-execution'
import { pageAutonome } from '@/lib/apps/boucle-directe'

const DOSSIER = process.argv[2]
if (!DOSSIER) throw new Error('dossier de travail requis')
mkdirSync(DOSSIER, { recursive: true })
const CAS = [
  ['4b8b1d20', join(ICI, 'brut', 'm12', '4b8b1d20.json.gz')],
  ['f29323f6', join(ICI, 'brut', 'm12', 'f29323f6.json.gz')],
  ['44ca6bbe', join(ICI, 'brut', 'm9', '44ca6bbe.json.gz')],
] as const

const region = (lignes: string[], n: number) => { for (let k = n - 1; k >= 0; k--) { const m = lignes[k]!.match(/^\/\/#region (.+)$/u); if (m) return m[1]! } return '(hors région)' }
const sortie = []
for (const [id, chemin] of CAS) {
  const brut = gunzipSync(readFileSync(chemin))
  const f = JSON.parse(brut.toString('utf8')) as Record<string, string> | [string, string][]
  const fichiers = new Map<string, string>(Array.isArray(f) ? f : Object.entries(f))
  const idx = fichiers.get('index.tsx') ?? ''
  const exportsEntree = idx.split('\n').map((l, i) => ({ ligne: i + 1, code: l.trim() })).filter((x) => /^export\b/u.test(x.code))
  const v = await assembler(fichiers)
  if (!v.ok) { sortie.push({ id, assemble: false, erreur: String(v.erreur).slice(0, 200) }); continue }
  const lp = v.code.split('\n')
  const exportsPaquet = lp.map((l, i) => ({ ligne: i + 1, region: region(lp, i + 1), code: l.trim() })).filter((x) => /^export\b/u.test(x.code))
  const importsWs = lp.filter((l) => /^\s*import\s.*from\s*["']ws["']/u.test(l)).length
  const page = pageAutonome(v.code, 'Votre application', undefined, 'apercu')
  writeFileSync(join(DOSSIER, `page-${id}.html`), page)
  const ex = await jugerExecution(v.code)
  sortie.push({
    id, fichiersSha256: createHash('sha256').update(brut).digest('hex').slice(0, 16), indexLignes: idx.split('\n').length, exportsEntree,
    exportsPaquet, importsWsSurvivants: importsWs,
    enveloppeDeLaPage: page.includes('<script type="module">try{\n') ? 'try{ … }catch dans <script type="module">' : 'INCONNUE',
    juge: { monte: ex.monteDansSimulateur, erreurs: ex.erreurs.map((e) => `${e.quoi}: ${e.message.slice(0, 100)}`), ecransDistincts: ex.ecransDistincts ?? null },
  })
}
writeFileSync(join(ICI, 'sortie', 'm12-syntaxe-export.json'), JSON.stringify({ sortie }, null, 1) + '\n')
for (const s of sortie) console.log(JSON.stringify(s))
