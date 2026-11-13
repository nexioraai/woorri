// M16 — LA RÉFLEXION FACTURÉE ET NON LUE (3c, mesure b).
//
// Doc DeepSeek (api-docs.deepseek.com, lue le 2026-11-13) : sur chat/completions,
// la réflexion est ACTIVÉE PAR DÉFAUT (effort high) ; `message.reasoning_content`
// la porte ; `usage.completion_tokens_details.reasoning_tokens` la compte.
// La génération actuelle (`appelerFournisseur`) n'envoie aucun paramètre et ne
// lit que `content` : la réflexion est donc produite, facturée, jamais lue.
//
// Ici : UNE consigne d'écran réaliste (brouillon de consigne-ecran + signatures
// de la bibliothèque + l'écran « réservations » de Hayine : rôle, tables avec
// champs, extrait du cahier), envoyée deux fois à deepseek-v4-pro :
//   A. comme aujourd'hui (rien)            B. thinking: { type: 'disabled' }
// Mesuré : jetons de réflexion / sortie, durée, taille et forme de la réponse.
// PLAFOND 0,05 $ — pire cas vérifié avant le premier appel.
//   cd apps/web && GENERATEUR_FOURNISSEUR=deepseek TIR_PAYANT=oui npx tsx --env-file=.env.local ../../docs/elite-protocol/evidence/generateur-2026-11-12/m16-reflexion-ecran.mts
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'
import { CONFIGS, estPointe, tarifDe, tarifPlafond } from '@/lib/apps/fournisseur'
import { CONSIGNE_BIBLIOTHEQUE } from '@/lib/apps/bibliotheque-ui'

if (process.env.TIR_PAYANT !== 'oui') throw new Error('TIR_PAYANT=oui requis')
const CLE = process.env.DEEPSEEK_API_KEY ?? ''
if (CLE === '') throw new Error('DEEPSEEK_API_KEY absente')
const PLAFOND = 0.05
const MAX_SORTIE = 10_000

// ── La matière : l'écran « réservations » de Hayine, depuis des mesures hachées.
const ligne = JSON.parse(gunzipSync(readFileSync(join(ICI, 'brut', 'g30', '9cc16d10.json.gz'))).toString('utf8')) as { demande: string }
const lecture = JSON.parse(gunzipSync(readFileSync(join(ICI, 'brut', 'g30', 'decoupe-reponse.json.gz'))).toString('utf8')) as { reponse: { entites: { name: string; fields: { name: string; type: string; required?: boolean }[] }[] } }
const table = (n: string) => lecture.reponse.entites.find((e) => e.name === n)
const reservation = table('reservation'), paiement = table('paiement')
if (!reservation || !paiement) throw new Error('tables reservation/paiement absentes de la lecture')
const champs = (e: { fields: { name: string; type: string; required?: boolean }[] }) => e.fields.map((f) => `${f.name} (${f.type}${f.required ? ', requis' : ''})`).join(', ')
const i = ligne.demande.search(/réservation/iu)
const extrait = ligne.demande.slice(Math.max(0, i - 200), i + 900).replace(/\s+/gu, ' ')
const reglages = /RÉGLAGES EXACTS[\s\S]*?\n(?= {3}· \.\/systeme\/donnees)/u.exec(CONSIGNE_BIBLIOTHEQUE)?.[0] ?? ''

const CONSIGNE_ECRAN = `Tu écris UN SEUL écran d'une application web React + TypeScript déjà construite par Deribfy.
RENDS UNIQUEMENT ce fichier, dans ce format exact, sans rien avant ni après :
=== ecrans/reservations.tsx ===
<le code>

CONTRAT DE L'ÉCRAN — chaque règle vient d'un défaut réel :
1. \`export default function Ecran({ session }: { session: Session })\`. Rien d'autre n'est exporté.
2. LES DONNÉES passent par \`import { useTable } from '../systeme/base'\` :
   \`const r = useTable<Reservation>('reservation')\` rend { lignes, chargement, erreur, ajouter(valeurs), modifier(id, valeurs), supprimer(id) }.
   Les types viennent de \`../systeme/types\` (Reservation, Paiement, Session). Tu n'écris JAMAIS createClient, fetch, localStorage, ni de routeur : la navigation est à Deribfy.
3. L'INTERFACE vient de \`../systeme/ui\` (pièces ci-dessous, réglages exacts — un nom inventé est refusé) et de \`../systeme/argent\` (formaterMontant : tout montant passe par lui, jamais un symbole de monnaie écrit).
${reglages}
4. TROIS ÉTATS EXPLICITES, toujours : chargement, vide (EtatVide avec un message utile), erreur (le message, et quoi faire). Un chargement qui échoue ne ressemble jamais à une liste vide.
5. Les couleurs, rayons, tailles sont des variables CSS déjà déclarées (style={{ color: 'var(--muted-foreground)' }}). AUCUN className : il n'y a pas de feuille de style.
6. Français correct, libellés lisibles ; chaque bouton porte un texte visible. Pas de chiffre en dur : tout sort des lignes lues.
7. Tu couvres ce que le cahier dit de CET écran, entièrement, et rien de décoratif.`

const SPEC = `ÉCRAN : réservations · RÔLE : particulier (session.role === 'particulier') · NAVIGATION : public
TABLES :
- reservation (lit, écrit) : ${champs(reservation)}
- paiement (lit) : ${champs(paiement)}
CE QUE LE CAHIER DIT DE CET ÉCRAN :
« ${extrait} »`

const prix = CONFIGS.deepseek.prix
const maintenant = new Date()
const t = estPointe(maintenant) || estPointe(new Date(maintenant.getTime() + 20 * 60_000)) ? tarifPlafond(prix) : tarifDe(prix, maintenant)
const entreeEstimee = (CONSIGNE_ECRAN.length + SPEC.length) / 2.5
const pireCas = 2 * (entreeEstimee * t.entree + MAX_SORTIE * t.sortie) / 1e6
console.log(`consigne ${String(CONSIGNE_ECRAN.length)} signes · spec ${String(SPEC.length)} signes · pire cas ${pireCas.toFixed(4)} $ (plafond ${String(PLAFOND)} $)`)
if (pireCas > PLAFOND) throw new Error('ARRÊT AVANT APPEL : pire cas au-dessus du plafond')

type Mesure = { variante: string; ms: number; finish: string | null; jetons: { entree: number; sortie: number; reflexion: number | null }; partReflexion: number | null; signesReflexion: number; signesTexte: number; formeTenue: boolean; usd: number }
const mesures: Mesure[] = []
let depense = 0
for (const v of [{ nom: 'A-defaut', extra: {} }, { nom: 'B-thinking-disabled', extra: { thinking: { type: 'disabled' } } }]) {
  const debut = Date.now()
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLE}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: CONFIGS.deepseek.modele, max_tokens: MAX_SORTIE, messages: [{ role: 'system', content: CONSIGNE_ECRAN }, { role: 'user', content: SPEC }], ...v.extra }),
  })
  if (!r.ok) throw new Error(`${String(r.status)} ${(await r.text()).slice(0, 300)}`)
  const d = (await r.json()) as { choices?: { message?: { content?: string; reasoning_content?: string }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } } }
  const ms = Date.now() - debut
  const texte = d.choices?.[0]?.message?.content ?? ''
  const reflexion = d.choices?.[0]?.message?.reasoning_content ?? ''
  const u = d.usage ?? {}
  const sortie = u.completion_tokens ?? 0
  const reflexionJ = u.completion_tokens_details?.reasoning_tokens ?? null
  const usd = ((u.prompt_tokens ?? 0) * t.entree + sortie * t.sortie) / 1e6
  depense += usd
  writeFileSync(join(ICI, 'brut', 'etape3', `m16-${v.nom}.json.gz`), gzipSync(Buffer.from(JSON.stringify({ usage: u, finish: d.choices?.[0]?.finish_reason, reasoning_content: reflexion, content: texte })), { level: 9 }))
  const m: Mesure = { variante: v.nom, ms, finish: d.choices?.[0]?.finish_reason ?? null, jetons: { entree: u.prompt_tokens ?? 0, sortie, reflexion: reflexionJ }, partReflexion: reflexionJ === null || sortie === 0 ? null : Number((reflexionJ / sortie).toFixed(3)), signesReflexion: reflexion.length, signesTexte: texte.length, formeTenue: /^\s*=== ecrans\/reservations\.tsx ===/u.test(texte), usd: Number(usd.toFixed(5)) }
  mesures.push(m)
  console.log(JSON.stringify(m))
}
writeFileSync(join(ICI, 'sortie', 'm16-reflexion-ecran.json'), JSON.stringify({ quand: new Date().toISOString(), modele: CONFIGS.deepseek.modele, tarif: t, consigneSignes: CONSIGNE_ECRAN.length, specSignes: SPEC.length, depenseUsd: Number(depense.toFixed(5)), mesures }, null, 1) + '\n')
console.log(`DÉPENSE ${depense.toFixed(5)} $`)
