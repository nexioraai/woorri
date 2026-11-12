// M5 — EXPÉRIENCE D'ISOLATION : PRÉPARÉE, PAS LANCÉE.
//
// QUESTION : les échecs du tour 1 tiennent-ils au MODÈLE (DeepSeek), ou au
// pipeline (consigne, bibliothèque, juges) ? On rejoue des cahiers RÉELS,
// avec le pipeline RÉEL de production (boucleEcriture + consignePour +
// appelerFournisseur + validateur d'entités de la route), en ne changeant
// QUE le fournisseur.
//
// ── LE PIÈGE DE PLAN, DIT AVANT DE LANCER.
// Le pipeline a CHANGÉ depuis ces générations (consigne, bibliothèque,
// juges ; juge-contrat ajouté le 2026-11-12). Comparer « Anthropic
// aujourd'hui » à « DeepSeek à l'époque » confondrait DEUX variables. Le
// plan a donc DEUX BRAS sur le pipeline d'AUJOURD'HUI :
//     A = anthropic (demandé)   ·   T = deepseek (témoin, même pipeline)
// Seule la différence A − T isole le modèle. Le bras A seul ne l'isole PAS.
//
// ── RÈGLE DE SÉLECTION, DÉCLARÉE AVANT TOUT RÉSULTAT.
// Les 3 générations les PLUS RÉCENTES dont : le tour 1 a été REFUSÉ ; le
// refus n'est pas une panne d'ENVIRONNEMENT (M2 : binding natif, react seul) ;
// le cahier, les entités et la configuration sont en base ; et dont le
// cahier est DISTINCT (60 premiers signes normalisés) des déjà retenus.
//
// ── CE QUE LE SCRIPT NE FAIT PAS SANS ACCORD.
// Sans `TIR_PAYANT=oui` ET l'argument `--lancer`, il n'appelle AUCUN
// fournisseur : il imprime la sélection, le plan et le coût estimé.
//
//   préparation (gratuit) :
//     cd apps/web && npx tsx ../../docs/elite-protocol/evidence/generateur-2026-11-12/m5-isolation.mts
//   lancement (PAYANT, sur accord) :
//     cd apps/web && TIR_PAYANT=oui npx tsx --env-file=.env.local ../../docs/elite-protocol/evidence/generateur-2026-11-12/m5-isolation.mts --lancer --bras=A,T
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { charger, toursDe, classesDuMotif, ICI } from './commun.mjs'
import { CONFIGS } from '@/lib/apps/fournisseur'

type Ligne = { id: string; created_at: string; demande: string; jetons_entree: number; jetons_sortie: number; cout_usd: number; document?: { entites?: unknown[] }; sections_acquises?: { configuration?: Record<string, string>; tours?: { rang: number; ok: boolean; motif?: string }[] } }
const { lignes, sha } = charger() as { lignes: Ligne[]; sha: string }

const ENVIRONNEMENT = (motif: string) => /Cannot find native binding/u.test(motif) || (/non embarqué/u.test(motif) && !/react-native|expo/u.test(motif))
const cleCahier = (d: string) => d.replace(/\s+/gu, ' ').trim().slice(0, 60).toLowerCase()

const retenues: Ligne[] = []
for (const l of [...lignes].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
  const t1 = toursDe(l).find((t: { rang: number }) => t.rang === 1)
  if (!t1 || t1.ok) continue
  if (ENVIRONNEMENT(String(t1.motif ?? ''))) continue
  if (!Array.isArray(l.document?.entites) || l.sections_acquises?.configuration === undefined || !l.demande) continue
  if (retenues.some((r) => cleCahier(r.demande) === cleCahier(l.demande))) continue
  retenues.push(l)
  if (retenues.length === 3) break
}

// ── COÛT ESTIMÉ.
// Base : les jetons RÉELLEMENT consommés par ces générations (DeepSeek), aux
// tarifs de fournisseur.ts. Les tokeniseurs diffèrent entre fournisseurs :
// le même texte ne fait pas le même nombre de jetons — facteur INCONNU, donc
// on donne aussi un PLAFOND DUR : 3 tours × sortie maximale du fournisseur,
// et l'entrée observée triplée.
const prix = (f: 'anthropic' | 'deepseek') => CONFIGS[f].prix.pointe
const plan = retenues.map((l) => {
  const pa = prix('anthropic'), pd = prix('deepseek')
  const central = (p: { entree: number; sortie: number }) => (l.jetons_entree * p.entree + l.jetons_sortie * p.sortie) / 1e6
  const plafond = (f: 'anthropic' | 'deepseek') => (3 * l.jetons_entree * prix(f).entree + 3 * CONFIGS[f].maxJetons * prix(f).sortie) / 1e6
  return {
    id: l.id, date: l.created_at.slice(0, 10), entites: l.document!.entites!.length,
    refusTour1: classesDuMotif(toursDe(l).find((t: { rang: number }) => t.rang === 1)!.motif).map((c: { cle: string }) => c.cle),
    observe: { entree: l.jetons_entree, sortie: l.jetons_sortie, coutDeepseekPaye: l.cout_usd },
    estimation: { A_anthropic_central: +central(pa).toFixed(3), A_anthropic_plafond: +plafond('anthropic').toFixed(2), T_deepseek_central: +central(pd).toFixed(3), T_deepseek_plafond: +plafond('deepseek').toFixed(2) },
    demande: l.demande,
  }
})
const somme = (k: keyof (typeof plan)[0]['estimation']) => +plan.reduce((a, p) => a + p.estimation[k], 0).toFixed(2)
const totaux = { A_central: somme('A_anthropic_central'), A_plafond: somme('A_anthropic_plafond'), T_central: somme('T_deepseek_central'), T_plafond: somme('T_deepseek_plafond') }

console.log(`instantané ${sha.slice(0, 12)} · modèles : anthropic=${CONFIGS.anthropic.modele} · deepseek=${CONFIGS.deepseek.modele}`)
console.log(`tarifs ($/M jetons) : anthropic ${JSON.stringify(prix('anthropic'))} · deepseek ${JSON.stringify(prix('deepseek'))}\n`)
for (const p of plan) console.log(`${p.id.slice(0, 8)} ${p.date} · ${p.entites} tables · refus T1 : ${p.refusTour1.join(' + ')}\n   observé (DeepSeek) : ${p.observe.entree} jetons entrée / ${p.observe.sortie} sortie · payé ${p.observe.coutDeepseekPaye} $\n   estimé : A anthropic ≈ ${p.estimation.A_anthropic_central} $ (plafond ${p.estimation.A_anthropic_plafond} $) · T deepseek ≈ ${p.estimation.T_deepseek_central} $ (plafond ${p.estimation.T_deepseek_plafond} $)\n   cahier : « ${p.demande.replace(/\s+/gu, ' ').slice(0, 140)}… »`)
console.log(`\nTOTAL bras A (anthropic) ≈ ${totaux.A_central} $ · plafond ${totaux.A_plafond} $`)
console.log(`TOTAL bras T (deepseek)  ≈ ${totaux.T_central} $ · plafond ${totaux.T_plafond} $`)

const lancer = process.argv.includes('--lancer') && process.env.TIR_PAYANT === 'oui'
if (!lancer) {
  mkdirSync(join(ICI, 'sortie'), { recursive: true })
  writeFileSync(join(ICI, 'sortie', 'm5-plan.json'), JSON.stringify({ instantane_sha256: sha, plan, totaux }, null, 1) + '\n')
  console.log('\nPRÉPARÉ, NON LANCÉ — aucun fournisseur appelé. (sortie/m5-plan.json)')
} else {
  // ── LE LANCEMENT — même pipeline que app/api/generateur/direct/route.ts.
  const bras = (process.argv.find((a) => a.startsWith('--bras='))?.slice(7) ?? 'A').split(',')
  const { boucleEcriture, consignePour } = await import('@/lib/apps/boucle-directe')
  const { appelerFournisseur, tarifDe } = await import('@/lib/apps/fournisseur')
  const { projectAirSchema } = await import('@deribfy/air-schema')
  const schemaEntite = projectAirSchema.shape.entities.element
  const resultats: unknown[] = []
  for (const l of retenues) for (const b of bras) {
    const f = b === 'A' ? 'anthropic' : 'deepseek'
    const cle = f === 'anthropic' ? process.env.ANTHROPIC_API_KEY ?? '' : process.env.DEEPSEEK_API_KEY ?? ''
    if (cle === '') throw new Error(`aucune clef pour ${f}`)
    const entites = l.document!.entites as Parameters<typeof consignePour>[0]
    let entree = 0, sortie = 0
    const t0 = Date.now()
    const r = await boucleEcriture({
      demande: l.demande, configuration: l.sections_acquises!.configuration!, entites,
      validerEntite: (e: unknown) => schemaEntite.safeParse(e).success,
      appeler: async (messages) => { const x = await appelerFournisseur(f, cle, consignePour(entites), messages); entree += x.usage.entree; sortie += x.usage.sortie; return { texte: x.texte, tronquee: x.tronquee } },
    })
    const t = tarifDe(CONFIGS[f].prix, new Date())
    resultats.push({ cahier: l.id, bras: b, fournisseur: f, ok: r.ok, ms: Date.now() - t0, entree, sortie, usd: (entree * t.entree + sortie * t.sortie) / 1e6, tours: r.tours.map((x) => ({ rang: x.rang, ok: x.ok, classes: classesDuMotif(x.motif ?? '').map((c: { cle: string }) => c.cle) })), erreursExecution: r.ok ? r.execution?.erreurs ?? [] : null })
    writeFileSync(join(ICI, 'sortie', 'm5-resultats.json'), JSON.stringify({ instantane_sha256: sha, resultats }, null, 1) + '\n')
  }
  console.log('\nLANCÉ — résultats : sortie/m5-resultats.json')
}
