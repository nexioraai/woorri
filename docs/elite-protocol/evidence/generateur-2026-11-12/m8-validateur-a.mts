// M8 (diagnostic) — l'arrêt de a) vient-il de MON validateur (`() => true`) ?
// Rejoue la réponse brute conservée du tour 1 de a) (brut/m8/a-tour1.txt.gz)
// dans la copie a), avec les deux validateurs. Aucun fournisseur appelé.
//   cd <copie a>/apps/web && npx tsx --tsconfig tsconfig.json <ce fichier>
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'
const { boucleEcriture } = await import('@/lib/apps/boucle-directe')
const { projectAirSchema } = await import('@deribfy/air-schema')
const schemaEntite = projectAirSchema.shape.entities.element
const reponse = gunzipSync(readFileSync(join(ICI, 'brut', 'm8', 'a-tour1.txt.gz'))).toString('utf8')
const declarations = [...reponse.matchAll(/===\s*([^=\n]+?)\s*===/gu)].map((m) => m[1]).filter((c) => /donnees|entit|declar/iu.test(c))
console.log('fichiers de déclaration dans la réponse :', declarations.join(', ') || 'aucun')
for (const [nom, valider] of [['() => true (mon instrument)', () => true], ['schemaEntite.safeParse (production)', (e: unknown) => schemaEntite.safeParse(e).success]] as const) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await boucleEcriture({ demande: 'diagnostic', configuration: { currency: 'XAF' }, entites: [], toursMax: 1, validerEntite: valider, appeler: async () => ({ texte: reponse, tronquee: false }) } as any)
    console.log(`${nom} → pas d'arrêt · livrée=${r.ok} · refus d'entités=${JSON.stringify((r as { refusEntites?: unknown }).refusEntites ?? null)?.slice(0, 200)}`)
  } catch (e) {
    console.log(`${nom} → ARRÊT : ${(e as Error).message}`)
  }
}
