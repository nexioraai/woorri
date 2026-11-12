// M8 (mesure) — octobre / a / b, avec l'instrument de M5, depuis la branche de travail.
//
// Gratuit. Lit brut/m8/<état>.json.gz (vérifié contre son hachage dans
// sortie/m8-generations.json), remonte avec assembler + jugerExecution de la
// BRANCHE (jamais ceux des copies), et mesure comme M5 : démarre, erreurs,
// écrans distincts, signes de l'accueil, « Section inconnue », écrans vides.
// Octobre = 7be93be8 (même cahier), même instrument. Puis, pour chaque état,
// les messages d'erreur exacts.
//   cd apps/web && npx tsx ../../docs/elite-protocol/evidence/generateur-2026-11-12/m8-mesurer.mts
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { charger, ICI } from './commun.mjs'
import { assembler } from '@/lib/apps/bac-a-sable'
import { jugerExecution } from '@/lib/apps/juge-execution'

const VIDE = /\b(aucun|aucune|pas encore|vide|rien à|no data|empty)\b/iu
const NAV = /section inconnue|introuvable|page non trouvée|not found/iu
const { lignes, sha } = charger() as { lignes: { id: string; document?: { fichiers?: Record<string, string> } }[]; sha: string }
const gen = JSON.parse(readFileSync(join(ICI, 'sortie', 'm8-generations.json'), 'utf8')) as { depense: number; generations: { etat: string; livree: boolean; interrompu?: boolean; fichiersSha256?: string; tours?: unknown; erreur?: string }[] }

const lignesTableau: Record<string, unknown>[] = []
async function mesurer(nom: string, fichiers: Map<string, string> | null, extra: Record<string, unknown>) {
  if (fichiers === null) { lignesTableau.push({ nom, ...extra }); return }
  const v = await assembler(fichiers)
  if (!v.ok) { lignesTableau.push({ nom, ...extra, assemble: false, erreur: String(v.erreur).slice(0, 200) }); return }
  const ex = await jugerExecution(v.code)
  const e = ex.ecrans ?? []
  lignesTableau.push({
    nom, ...extra, demarre: ex.monteDansSimulateur, erreurs: ex.erreurs.length, ecransDistincts: ex.ecransDistincts ?? null,
    signesAccueil: e[0] ? e[0].texte.length : null, sectionInconnue: e.filter((x) => NAV.test(x.texte)).length, ecransVides: e.filter((x) => VIDE.test(x.texte)).length,
    messages: ex.erreurs.map((x) => `${x.quoi} : ${x.message.slice(0, 140)}`),
  })
}

await mesurer('octobre (7be93be8)', new Map(Object.entries(lignes.find((l) => l.id.startsWith('7be93be8'))!.document!.fichiers!)), {})
for (const etat of ['a', 'b']) {
  // La DERNIÈRE tentative de l'état (a) a été relancée ; la 1re reste dans le JSON).
  const g = [...gen.generations].reverse().find((x) => x.etat === etat)
  if (!g) { await mesurer(`${etat})`, null, { statut: 'PAS LANCÉ' }); continue }
  if (!g.livree) { await mesurer(`${etat})`, null, { statut: g.interrompu ? 'INTERROMPU (budget)' : 'NON LIVRÉ', tours: g.tours, erreur: g.erreur }); continue }
  const f = join(ICI, 'brut', 'm8', `${etat}.json.gz`)
  if (!existsSync(f)) throw new Error(`fichiers absents : ${etat}`)
  const brut = gunzipSync(readFileSync(f))
  if (createHash('sha256').update(brut).digest('hex') !== g.fichiersSha256) throw new Error(`fichiers altérés : ${etat}`)
  await mesurer(`${etat})`, new Map(Object.entries(JSON.parse(brut.toString('utf8')) as Record<string, string>)), { statut: 'livré', tours: g.tours })
}
writeFileSync(join(ICI, 'sortie', 'm8-mesure.json'), JSON.stringify({ instantane_sha256: sha, depense: gen.depense, lignes: lignesTableau }, null, 1) + '\n')
console.log(`dépense M8 : ${gen.depense} $`)
for (const l of lignesTableau) console.log(JSON.stringify(l))
