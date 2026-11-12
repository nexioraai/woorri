// M8 (diagnostic) — pourquoi l'état a) s'est arrêté sans livrer : la pile, GRATUITE.
// Rejoue la boucle de la copie a) avec, à la place du modèle, une réponse
// DÉJÀ CONNUE (les fichiers de l'état b), au format « === chemin === »). Aucun
// fournisseur appelé. À lancer DANS la copie a) :
//   cd <copie a>/apps/web && npx tsx --tsconfig tsconfig.json <ce fichier>
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'
const { boucleEcriture } = await import('@/lib/apps/boucle-directe')
const fichiers = JSON.parse(gunzipSync(readFileSync(join(ICI, 'brut', 'm8', 'b.json.gz'))).toString('utf8')) as Record<string, string>
const reponse = Object.entries(fichiers).filter(([c]) => !c.startsWith('systeme/')).map(([c, s]) => `=== ${c} ===\n${s}`).join('\n\n')
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await boucleEcriture({ demande: 'diagnostic', configuration: { currency: 'XAF' }, entites: [], toursMax: 1, validerEntite: () => true, appeler: async () => ({ texte: reponse, tronquee: false }) } as any)
  console.log('PAS DE PLANTAGE · livrée', r.ok)
} catch (e) {
  console.log('PLANTAGE :', (e as Error).message)
  console.log(String((e as Error).stack).split('\n').slice(0, 8).join('\n'))
}
