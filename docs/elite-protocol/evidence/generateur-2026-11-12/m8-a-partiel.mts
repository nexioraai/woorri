// M8 (partiel) — ce que l'état a) a produit avant l'interruption budgétaire.
// Rejoue les réponses brutes CONSERVÉES des tours 1 et 2 de la dernière
// exécution de a), dans la boucle de la copie a), validateur de production,
// toursMax = 2 : on obtient le verdict du tour 1 et le code du tour 2
// (livré PARCE QUE dernier ici — ce n'est pas un tour 3 réel). Aucun appel.
//   cd <copie a>/apps/web && npx tsx --tsconfig tsconfig.json <ce fichier>
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'
const { boucleEcriture } = await import('@/lib/apps/boucle-directe')
const { projectAirSchema } = await import('@deribfy/air-schema')
const schemaEntite = projectAirSchema.shape.entities.element
const reponses = [1, 2].map((n) => gunzipSync(readFileSync(join(ICI, 'brut', 'm8', `a-tour${n}.txt.gz`))).toString('utf8'))
let i = 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r: any = await boucleEcriture({ demande: readFileSync(join(ICI, 'brut', 'SHA256'), 'utf8') && (await import('./commun.mjs' as string)).charger().lignes.find((l: { id: string }) => l.id.startsWith('7be93be8')).demande.trim(), configuration: { currency: 'XAF' }, entites: [], toursMax: 2, validerEntite: (e: unknown) => schemaEntite.safeParse(e).success, appeler: async () => ({ texte: reponses[i++]!, tronquee: false }) } as any)
const tours = r.tours.map((t: { rang: number; ok: boolean; motif?: string }) => ({ rang: t.rang, ok: t.ok, motif: String(t.motif ?? '').split('\n\n').map((b) => b.split('\n')[0]!.slice(0, 120)) }))
console.log(JSON.stringify(tours))
if (r.ok) {
  const json = Buffer.from(JSON.stringify(Object.fromEntries(r.fichiers as Map<string, string>)))
  writeFileSync(join(ICI, 'brut', 'm8', 'a-tour2-rejoue.json.gz'), gzipSync(json, { level: 9 }))
  writeFileSync(join(ICI, 'sortie', 'm8-a-partiel.json'), JSON.stringify({ tours, fichiersSha256: createHash('sha256').update(json).digest('hex') }, null, 1) + '\n')
  console.log('code du tour 2 conservé')
}
