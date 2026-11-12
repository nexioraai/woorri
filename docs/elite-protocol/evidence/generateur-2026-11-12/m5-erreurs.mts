// M5 (suite) — LES MESSAGES EXACTS DES ERREURS D'EXÉCUTION, octobre et aujourd'hui.
//
// Gratuit : remonte le code CONSERVÉ (octobre : document.fichiers de
// l'instantané ; aujourd'hui : brut/m5-rejeu/<cahier>.json.gz, haché dans
// sortie/m5-rejeu.json) avec le même instrument (assembler + jugerExecution),
// et imprime chaque erreur : quoi, message, indice. Aucun modèle appelé.
//   cd apps/web && npx tsx ../../docs/elite-protocol/evidence/generateur-2026-11-12/m5-erreurs.mts
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { charger, ICI } from './commun.mjs'
import { assembler } from '@/lib/apps/bac-a-sable'
import { jugerExecution } from '@/lib/apps/juge-execution'

const { lignes, sha } = charger() as { lignes: { id: string; document?: { fichiers?: Record<string, string> } }[]; sha: string }
const rejeu = JSON.parse(readFileSync(join(ICI, 'sortie', 'm5-rejeu.json'), 'utf8')) as { rejeu: { cahier: string; secteur: string; livree: boolean; fichiersSha256?: string; tentative: number }[] }

const cibles: { quand: string; secteur: string; id: string; fichiers: Map<string, string> }[] = []
for (const id of ['7be93be8', 'cbf1cb34', '4a6e160d', 'eb7b62b5', '88c94164']) {
  const l = lignes.find((x) => x.id.startsWith(id))!
  cibles.push({ quand: 'octobre', secteur: id, id, fichiers: new Map(Object.entries(l.document!.fichiers!)) })
}
for (const r of rejeu.rejeu.filter((x) => x.livree)) {
  const brut = gunzipSync(readFileSync(join(ICI, 'brut', 'm5-rejeu', `${r.cahier}.json.gz`)))
  const h = createHash('sha256').update(brut).digest('hex')
  if (h !== r.fichiersSha256) throw new Error(`fichiers rejoués altérés : ${r.cahier}`)
  cibles.push({ quand: 'aujourd’hui', secteur: r.secteur, id: r.cahier, fichiers: new Map(Object.entries(JSON.parse(brut.toString('utf8')) as Record<string, string>)) })
}

const sortie = []
for (const c of cibles) {
  const v = await assembler(c.fichiers)
  if (!v.ok) { sortie.push({ ...c, fichiers: undefined, assemble: false, erreur: String(v.erreur).slice(0, 300) }); continue }
  const ex = await jugerExecution(v.code)
  const systeme = [...c.fichiers.keys()].some((k) => k.startsWith('systeme/'))
  sortie.push({ quand: c.quand, secteur: c.secteur, id: c.id, bibliothequeFournie: systeme, monte: ex.monteDansSimulateur, erreurs: ex.erreurs.map((e) => ({ quoi: e.quoi, message: e.message.slice(0, 220), indice: e.indice.slice(0, 160) })) })
}
writeFileSync(join(ICI, 'sortie', 'm5-erreurs.json'), JSON.stringify({ instantane_sha256: sha, sortie }, null, 1) + '\n')
for (const s of sortie) {
  console.log(`\n${s.quand} · ${s.secteur} · ${s.id} · bibliothèque fournie=${(s as { bibliothequeFournie?: boolean }).bibliothequeFournie} · monte=${(s as { monte?: boolean }).monte}`)
  for (const e of ((s as { erreurs?: { quoi: string; message: string; indice: string }[] }).erreurs ?? [])) console.log(`   - ${e.quoi} : ${e.message}${e.indice ? ' (' + e.indice + ')' : ''}`)
}
