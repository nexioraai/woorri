// M10 — LA LECTURE DU BRIEF TRONQUÉE : la réflexion mange-t-elle la limite ?
//
// QUESTION (du propriétaire, 2026-11-13) : la ligne 44ca6bbe (étape 1) porte
// `lectureBrief.resultat = tronquee` sur un cahier de 1 709 signes — l'entrée
// tenait sous les 24 000 signes, c'est la SORTIE qui a atteint 8 000 jetons.
// Le code documente (mesure du 2026-10-30) que ce fournisseur rend deux blocs
// [thinking, text] et COMPTE la réflexion dans `max_tokens`. La route ne
// conserve ni la longueur de la réflexion ni celle du texte : on rejoue.
//
// CE QUI EST REJOUÉ : l'appel EXACT de app/api/generateur/lire-brief/route.ts —
//   clientIA().messages.create({ model: MODELE_LEGER, max_tokens, system: CONSIGNE,
//                                messages: [{ role: 'user', content: demande.slice(0, 24_000) }] })
// sur le cahier de 44ca6bbe (brut/m10/cahier-44ca6bbe.txt, haché ci-dessous).
// 3 rejeux à 8 000 (la limite de la route — variance) et 1 rejeu à 20 000
// (sous les 21 312 au-delà desquels le SDK exige le flux). Pour chacun :
// stop_reason, chaque bloc (type, longueur), usage, coût ; et ce que la route
// AURAIT enregistré (reussie / illisible / json_casse / tronquee, tables).
//
// DEEPSEEK SEULEMENT (le script s'arrête sinon). PLAFOND DUR 0,10 $ : garde
// au tarif de pointe avant chaque appel ; un appel qui pourrait dépasser n'a
// pas lieu. Les réponses brutes sont conservées (brut/m10/reponses/) pour se
// relire sans repayer.
//
//   cd apps/web && GENERATEUR_FOURNISSEUR=deepseek TIR_PAYANT=oui npx tsx --env-file=.env.local ../../docs/elite-protocol/evidence/generateur-2026-11-12/m10-lecture-tronquee.mts
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'
import { CONFIGS, tarifPlafond, tarifDe } from '@/lib/apps/fournisseur'
import { clientIA, MODELE_LEGER, FOURNISSEUR } from '@/lib/ia/client'
import { CONSIGNE } from '@/lib/apps/consigne-lire-brief'
import { lireEntites } from '@/lib/apps/entites-declarees'
import { projectAirSchema } from '@deribfy/air-schema'

const PLAFOND = 0.1
if (process.env.TIR_PAYANT !== 'oui') throw new Error('TIR_PAYANT=oui requis : ce script appelle le fournisseur')
if (FOURNISSEUR !== 'deepseek') throw new Error(`ARRÊT : fournisseur ${FOURNISSEUR} ≠ deepseek`)
if (MODELE_LEGER !== CONFIGS.deepseek.modeleLeger) throw new Error(`ARRÊT : modèle léger ${MODELE_LEGER}`)

const cahier = readFileSync(join(ICI, 'brut', 'm10', 'cahier-44ca6bbe.txt'), 'utf8').trim()
const shaCahier = createHash('sha256').update(cahier).digest('hex')
const schemaEntite = projectAirSchema.shape.entities.element
const P = tarifPlafond(CONFIGS.deepseek.prixLeger)
const estimeEntree = (CONSIGNE.length + Math.min(cahier.length, 24_000)) / 2.5
let depense = 0
mkdirSync(join(ICI, 'brut', 'm10', 'reponses'), { recursive: true })

const rejeux = []
for (const [rang, maxJetons] of [[1, 8000], [2, 8000], [3, 8000], [4, 20000]] as const) {
  const pire = (estimeEntree * P.entree + maxJetons * P.sortie) / 1e6
  if (depense + pire > PLAFOND) { rejeux.push({ rang, maxJetons, interrompu: true, motif: `${depense.toFixed(4)} + ${pire.toFixed(4)} > ${PLAFOND}` }); continue }
  const t0 = Date.now()
  const r = await clientIA().messages.create({ model: MODELE_LEGER, max_tokens: maxJetons, system: CONSIGNE, messages: [{ role: 'user', content: cahier.slice(0, 24_000) }] })
  const t = tarifDe(CONFIGS.deepseek.prixLeger, new Date())
  // CONSTATÉ APRÈS LA 1re EXÉCUTION (non relancée) : `input_tokens` = 251 ne
  // compte que la part NON cachée ; `cache_read_input_tokens` = 1 920 par
  // appel (consigne + cahier = 2 171 jetons). Ce coût les ignore : écart
  // ≈ 0,00001 $ par appel au tarif cache. Les objets `usage` complets sont
  // dans brut/m10/reponses/.
  const usd = (r.usage.input_tokens * t.entree + r.usage.output_tokens * t.sortie) / 1e6
  depense += usd
  const blocs = r.content.map((b) => {
    const o = b as { type: string; text?: string; thinking?: string }
    return { type: o.type, signes: (o.type === 'thinking' ? o.thinking ?? '' : o.text ?? '').length }
  })
  const texte = r.content.map((b) => ((b as { type: string; text?: string }).type === 'text' ? (b as { text?: string }).text ?? '' : '')).join('')
  const reflexion = r.content.map((b) => ((b as { type: string; thinking?: string }).type === 'thinking' ? (b as { thinking?: string }).thinking ?? '' : '')).join('')
  // Ce que la route aurait enregistré, avec SA logique (lire-brief/route.ts).
  const d = texte.indexOf('{'), f = texte.lastIndexOf('}')
  let resultat: string, tables = 0
  if (d === -1 || f <= d) resultat = r.stop_reason === 'max_tokens' ? 'tronquee' : 'illisible'
  else {
    try {
      const lu = JSON.parse(texte.slice(d, f + 1)) as Record<string, unknown>
      tables = lireEntites(lu.ENTITES, (e: unknown) => schemaEntite.safeParse(e).success).entites.length
      resultat = 'reussie'
    } catch { resultat = r.stop_reason === 'max_tokens' ? 'tronquee' : 'json_casse' }
  }
  writeFileSync(join(ICI, 'brut', 'm10', 'reponses', `rejeu-${String(rang)}.json.gz`), gzipSync(Buffer.from(JSON.stringify({ stop_reason: r.stop_reason, usage: r.usage, reflexion, texte })), { level: 9 }))
  rejeux.push({ rang, maxJetons, stop_reason: r.stop_reason, jetonsEntree: r.usage.input_tokens, jetonsSortie: r.usage.output_tokens, blocs, signesReflexion: reflexion.length, signesTexte: texte.length, resultatRoute: resultat, tables, ms: Date.now() - t0, usd: +usd.toFixed(5) })
  console.log(JSON.stringify(rejeux.at(-1)))
}
const sortie = { cahierSha256: shaCahier, cahierSignes: cahier.length, consigneSignes: CONSIGNE.length, modele: MODELE_LEGER, plafond: PLAFOND, depense: +depense.toFixed(4), rejeux }
writeFileSync(join(ICI, 'sortie', 'm10-lecture-tronquee.json'), JSON.stringify(sortie, null, 1) + '\n')
console.log(`\ncahier ${shaCahier.slice(0, 12)} · ${cahier.length} signes · consigne ${CONSIGNE.length} · DÉPENSE ${depense.toFixed(4)} $ (plafond ${PLAFOND} $)`)
