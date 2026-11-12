// M5 — LES CAHIERS RICHES D'OCTOBRE, REJOUÉS SUR LE PIPELINE D'AUJOURD'HUI.
//
// QUESTION (du propriétaire, 2026-11-12) : M3 a montré que les applications
// livrées sont devenues petites AU MOMENT où les cahiers sont passés de
// 22 866 à 268 signes (médianes). Est-ce le PIPELINE d'après le 2026-11-04,
// ou les CAHIERS minuscules ?
//   · applications pleines → les cahiers courts étaient la cause ;
//   · applications vides   → régression du pipeline depuis le 2026-11-04.
//
// DEEPSEEK UNIQUEMENT — décision définitive du propriétaire. Le script
// s'ARRÊTE si le fournisseur résolu n'est pas deepseek (y compris pour la
// lecture du brief, qui suit GENERATEUR_FOURNISSEUR).
//
// ── RÈGLE DE SÉLECTION, DÉCLARÉE AVANT TOUT RÉSULTAT.
// Générations créées avant le 2026-11-01 (UTC), cahier de 5 000 signes ou
// plus. Un cahier = un texte de demande identique. Secteur = la catégorie
// du LEXIQUE ci-dessous qui compte le PLUS d'occurrences dans le cahier.
// On retient au plus un cahier par secteur, le plus récent, et 3 secteurs.
// Ordre de passage : coût DeepSeek médian observé en octobre, CROISSANT —
// pour que la garde de budget, si elle coupe, coupe le plus cher.
//
// ── LE PIPELINE D'AUJOURD'HUI, recopié du code (2026-11-12) :
//   ① lire-brief : clientIA().messages.create(MODELE_LEGER, 8000, CONSIGNE
//      de consigne-lire-brief, demande.slice(0, 24000)) → entités + déduites
//      (app/api/generateur/lire-brief/route.ts) ;
//   ② preVol(deduites) → configuration ; devise XAF par défaut
//      (ConversationApplication.tsx › deduireConfiguration) ;
//   ③ boucleEcriture(demande, configuration [chaînes seules], entites,
//      validerEntite, appeler = appelerFournisseur(deepseek, consignePour))
//      — sans `nom` : aucun chemin actuel du client n'en transmet.
//
// ── LA MESURE, IDENTIQUE À M3, ET SYMÉTRIQUE.
// Les écrans d'octobre ne sont PAS enregistrés (M3). On mesure donc le CODE
// LIVRÉ en octobre (document.fichiers) ET le code rejoué aujourd'hui avec
// LE MÊME INSTRUMENT, aujourd'hui : assembler() + jugerExecution(), monté
// sur l'accueil, puis sur #gestion si l'œuvre a des tables. Cette
// référence d'octobre est donc « le code d'octobre vu par l'instrument
// d'aujourd'hui », PAS « ce que l'écran montrait en octobre ».
//
// ── BUDGET : PLAFOND DUR 1,00 $ (accord du propriétaire).
// Avant CHAQUE appel payant, on calcule son coût MAXIMAL au tarif de pointe
// (tarifPlafond — « toujours le plus cher ») : entrée estimée à 1 jeton
// pour 2,5 signes + sortie maximale du fournisseur. Si dépensé + maximum
// > 1,00 $, l'appel N'A PAS LIEU et la génération est notée INTERROMPUE.
//
//   préparation + référence (gratuit) :
//     cd apps/web && npx tsx ../../docs/elite-protocol/evidence/generateur-2026-11-12/m5-cahiers-riches.mts
//   lancement (payant, accordé, plafond 1 $) :
//     cd apps/web && GENERATEUR_FOURNISSEUR=deepseek TIR_PAYANT=oui npx tsx --env-file=.env.local ../../docs/elite-protocol/evidence/generateur-2026-11-12/m5-cahiers-riches.mts --lancer
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { charger, toursDe, ICI } from './commun.mjs'

const PLAFOND_USD = 1.0
const LEXIQUE: Record<string, RegExp> = {
  'énergie / compteurs': /\b(kwh|compteurs?|relevés?|index|électricité|sne)\b/giu,
  'institution / marchés publics': /\b(appels? d['’]offres|institutionnel(?:le)?|cpa|marchés? publics?|soumission)\b/giu,
  'réservation / tourisme': /\b(réservations?|hôtels?|voyages?|tourisme|séjours?)\b/giu,
}
const VIDE = /\b(aucun|aucune|pas encore|vide|rien à|no data|empty)\b/iu
const NAV = /section inconnue|introuvable|page non trouvée|not found/iu

type Ligne = { id: string; created_at: string; demande: string; cout_usd: number; document?: { fichiers?: Record<string, string> | [string, string][] }; sections_acquises?: { tours?: { rang: number; ok: boolean }[] } }
const { lignes, sha } = charger() as { lignes: Ligne[]; sha: string }

// ── SÉLECTION
const hashCahier = (d: string) => createHash('sha256').update(d).digest('hex').slice(0, 12)
const groupes = new Map<string, Ligne[]>()
for (const l of lignes) {
  if (l.created_at >= '2026-11-01' || (l.demande ?? '').length < 5000) continue
  const h = hashCahier(l.demande)
  groupes.set(h, [...(groupes.get(h) ?? []), l])
}
const secteurDe = (d: string) => {
  const scores = Object.entries(LEXIQUE).map(([s, re]) => [s, (d.match(re) ?? []).length] as const).sort((a, b) => b[1] - a[1])
  return { secteur: scores[0]![1] > 0 ? scores[0]![0] : 'autre', scores: Object.fromEntries(scores) }
}
const mediane = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0 }
const cahiers = [...groupes.entries()].map(([h, ls]) => {
  const plusRecente = [...ls].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]!
  return { hash: h, demande: plusRecente.demande, signes: plusRecente.demande.length, ...secteurDe(plusRecente.demande), essaisOctobre: ls, plusRecente: plusRecente.created_at, coutMedianOctobre: mediane(ls.map((l) => Number(l.cout_usd ?? 0))) }
})
const retenus: typeof cahiers = []
for (const c of [...cahiers].sort((a, b) => Date.parse(b.plusRecente) - Date.parse(a.plusRecente))) {
  if (c.secteur === 'autre' || retenus.some((r) => r.secteur === c.secteur)) continue
  retenus.push(c)
  if (retenus.length === 3) break
}
retenus.sort((a, b) => a.coutMedianOctobre - b.coutMedianOctobre)

// ── L'INSTRUMENT (identique pour octobre et pour aujourd'hui)
const { assembler } = await import('@/lib/apps/bac-a-sable')
const { jugerExecution } = await import('@/lib/apps/juge-execution')
const { ADRESSE_GESTION } = await import('@/lib/apps/entites-declarees')
type Mesure = { assemble: boolean; erreurAssemblage?: string; accueil?: unknown; gestion?: unknown }
const resumer = (v: { monteDansSimulateur: boolean; erreurs: unknown[]; ecrans?: { texte: string }[]; ecransDistincts?: number; ecransVisites?: number }) => {
  const e = v.ecrans ?? []
  return {
    monte: v.monteDansSimulateur, erreurs: v.erreurs.length, ecransDistincts: v.ecransDistincts ?? null, ecransVisites: v.ecransVisites ?? null,
    ecransEnregistres: e.length, signesAccueil: e[0] ? e[0].texte.length : null,
    ecransSectionInconnue: e.filter((x) => NAV.test(x.texte)).length, ecransVides: e.filter((x) => VIDE.test(x.texte)).length,
    debutAccueil: (e[0]?.texte ?? '').replace(/\s+/gu, ' ').slice(0, 160),
  }
}
async function mesurer(fichiers: Map<string, string>, avecTables: boolean): Promise<Mesure> {
  const v = await assembler(fichiers)
  if (!v.ok) return { assemble: false, erreurAssemblage: String(v.erreur).slice(0, 300) }
  const accueil = resumer(await jugerExecution(v.code))
  const gestion = avecTables ? resumer(await jugerExecution(v.code, { adresse: ADRESSE_GESTION })) : undefined
  return { assemble: true, accueil, gestion }
}
const carteDe = (f: NonNullable<Ligne['document']>['fichiers']) => new Map<string, string>((Array.isArray(f) ? f : Object.entries(f ?? {})).map(([c, s]) => [c, String(s)]))

// ── RÉFÉRENCE D'OCTOBRE (gratuite) : chaque essai d'octobre de ces cahiers.
const reference = []
for (const c of retenus) for (const l of c.essaisOctobre) {
  const livree = toursDe(l).some((t: { ok: boolean }) => t.ok) && l.document?.fichiers !== undefined
  reference.push({ cahier: c.hash, secteur: c.secteur, generation: l.id, date: l.created_at.slice(0, 16), livree, mesure: livree ? await mesurer(carteDe(l.document!.fichiers), false) : null })
}

mkdirSync(join(ICI, 'sortie'), { recursive: true })
const preparation = { instantane_sha256: sha, regle: 'voir en-tête', cahiers: cahiers.map(({ essaisOctobre, demande, ...r }) => ({ ...r, essais: essaisOctobre.map((l) => l.id) })), retenus: retenus.map((r) => ({ hash: r.hash, secteur: r.secteur, signes: r.signes, coutMedianOctobre: r.coutMedianOctobre })), reference }
writeFileSync(join(ICI, 'sortie', 'm5-reference-octobre.json'), JSON.stringify(preparation, null, 1) + '\n')

console.log(`instantané ${sha.slice(0, 12)} · cahiers d'octobre ≥ 5 000 signes : ${cahiers.length}`)
for (const c of cahiers) console.log(`  ${c.hash} · ${c.signes} signes · secteur « ${c.secteur} » ${JSON.stringify(c.scores)} · ${c.essaisOctobre.length} essais · coût médian ${c.coutMedianOctobre} $`)
console.log(`RETENUS (ordre de passage) : ${retenus.map((r) => r.secteur).join(' → ')}\n`)
console.log('RÉFÉRENCE — le code livré en octobre, mesuré aujourd’hui :')
for (const r of reference) console.log(`  ${r.secteur.padEnd(30)} ${r.generation.slice(0, 8)} ${r.date} · ${r.livree ? JSON.stringify((r.mesure as Mesure).accueil ?? (r.mesure as Mesure).erreurAssemblage) : 'NON LIVRÉE en octobre'}`)

// ── LANCEMENT
if (!(process.argv.includes('--lancer') && process.env.TIR_PAYANT === 'oui')) {
  console.log('\nPRÉPARÉ — aucun fournisseur appelé. (sortie/m5-reference-octobre.json)')
} else {
  const { CONFIGS, fournisseurChoisi, appelerFournisseur, tarifPlafond, tarifDe } = await import('@/lib/apps/fournisseur')
  if (fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR) !== 'deepseek') throw new Error('ARRÊT : le fournisseur résolu n’est pas deepseek')
  const { clientIA, MODELE_LEGER } = await import('@/lib/ia/client')
  if (MODELE_LEGER !== CONFIGS.deepseek.modeleLeger) throw new Error(`ARRÊT : modèle léger ${MODELE_LEGER} ≠ deepseek`)
  const { CONSIGNE: CONSIGNE_BRIEF } = await import('@/lib/apps/consigne-lire-brief')
  const { racineDepot } = await import('@/lib/apps/racine')
  const { lireEntites } = await import('@/lib/apps/entites-declarees')
  const { preVol } = await import('@/lib/apps/avant-de-depenser')
  const { boucleEcriture, consignePour } = await import('@/lib/apps/boucle-directe')
  const { projectAirSchema } = await import('@deribfy/air-schema')
  const schemaEntite = projectAirSchema.shape.entities.element
  const cle = process.env.DEEPSEEK_API_KEY ?? ''
  if (cle === '') throw new Error('aucune clef deepseek')
  const P = tarifPlafond(CONFIGS.deepseek.prix), PL = tarifPlafond(CONFIGS.deepseek.prixLeger)
  // REPRISE D'UN SEUL CAHIER (--seulement=<hash>) : la dépense déjà engagée
  // est LUE dans m5-rejeu.json et compte dans le plafond ; les lignes
  // précédentes sont CONSERVÉES, la nouvelle s'ajoute avec son numéro.
  const seulement = process.argv.find((a) => a.startsWith('--seulement='))?.slice(12)
  const { existsSync, readFileSync } = await import('node:fs')
  const fichierRejeu = join(ICI, 'sortie', 'm5-rejeu.json')
  const precedent = seulement && existsSync(fichierRejeu) ? JSON.parse(readFileSync(fichierRejeu, 'utf8')) as { depense: number; rejeu: Record<string, unknown>[] } : null
  let depense = precedent?.depense ?? 0
  const garde = (signesEntree: number, maxSortie: number, p: { entree: number; sortie: number }, quoi: string) => {
    const pire = ((signesEntree / 2.5) * p.entree + maxSortie * p.sortie) / 1e6
    if (depense + pire > PLAFOND_USD) throw Object.assign(new Error(`INTERROMPU — budget : ${depense.toFixed(3)} $ dépensés + ${pire.toFixed(3)} $ au pire pour « ${quoi} » > ${PLAFOND_USD} $`), { budget: true })
  }
  const RACINE_SORTIE = join(ICI, 'brut', 'm5-rejeu')
  mkdirSync(RACINE_SORTIE, { recursive: true })
  const rejeu: Record<string, unknown>[] = (precedent?.rejeu ?? []).map((l) => ({ tentative: 1, ...l }))
  for (const c of retenus) {
    if (seulement && c.hash !== seulement) continue
    const t0 = Date.now()
    const ligne: Record<string, unknown> = { tentative: seulement ? 2 : 1, cahier: c.hash, secteur: c.secteur, debut: new Date().toISOString() }
    try {
      // ① lire-brief
      const demande = c.demande.trim()
      garde(CONSIGNE_BRIEF.length + Math.min(demande.length, 24_000), 8000, PL, 'lire-brief')
      const r = await clientIA().messages.create({ model: MODELE_LEGER, max_tokens: 8000, system: CONSIGNE_BRIEF, messages: [{ role: 'user', content: demande.slice(0, 24_000) }] })
      const tl = tarifDe(CONFIGS.deepseek.prixLeger, new Date())
      depense += (r.usage.input_tokens * tl.entree + r.usage.output_tokens * tl.sortie) / 1e6
      const brut = r.content.map((b: { type: string; text?: string }) => (b.type === 'text' ? b.text ?? '' : '')).join('')
      const d = brut.indexOf('{'), f = brut.lastIndexOf('}')
      // FIDÉLITÉ À LA ROUTE (corrigé après la 1re exécution, 2026-11-12) :
      // lire-brief/route.ts ATTRAPE une réponse illisible ou un JSON mal
      // formé et rend `{ deduites: {} }` — la génération part quand même,
      // sans table, en XAF. La 1re version de ce script jetait ici, et le
      // cahier CPA n'a jamais été généré (« tentative 1 » dans m5-rejeu.json).
      let lu: Record<string, unknown> = {}
      let jsonIllisible = false
      if (d !== -1 && f > d) { try { lu = JSON.parse(brut.slice(d, f + 1)) as Record<string, unknown> } catch { jsonIllisible = true; lu = {} } }
      const { QUESTIONS_DE_CONFIGURATION } = (await import(`${racineDepot()}/benchmarks/air-emission/elicitation.mjs`)) as { QUESTIONS_DE_CONFIGURATION: Record<string, { choix?: { valeur: string }[] }> }
      const deduites: Record<string, string> = {}
      for (const [code, valeur] of Object.entries(lu)) {
        const q = QUESTIONS_DE_CONFIGURATION[code]
        if (q === undefined || typeof valeur !== 'string' || valeur.trim() === '') continue
        if (q.choix !== undefined && !q.choix.some((x) => x.valeur === valeur)) continue
        deduites[code] = valeur
      }
      const entites = lireEntites(lu.ENTITES, (e: unknown) => schemaEntite.safeParse(e).success).entites
      // ② preVol + devise par défaut
      const pv = await preVol(deduites)
      const cfg = { ...(pv.configuration as Record<string, unknown>) }
      if (cfg.currency === undefined) cfg.currency = 'XAF'
      const configuration: Record<string, string> = {}
      for (const [k, v] of Object.entries(cfg)) if (typeof v === 'string' && v.trim() !== '' && k.length <= 40) configuration[k] = v.trim().slice(0, 200)
      ligne.lireBrief = { illisible: d === -1 || f <= d || jsonIllisible, jsonMalForme: jsonIllisible, entites: entites.map((e: { name: string }) => e.name), configuration }
      // ③ la boucle
      const consigne = consignePour(entites)
      const res = await boucleEcriture({
        demande, configuration, entites,
        validerEntite: (e: unknown) => schemaEntite.safeParse(e).success,
        appeler: async (messages: readonly { role: 'user' | 'assistant'; content: string }[]) => {
          garde(consigne.length + messages.reduce((a, m) => a + m.content.length, 0), CONFIGS.deepseek.maxJetons, P, 'tour de génération')
          const x = await appelerFournisseur('deepseek', cle, consigne, messages)
          const t = tarifDe(CONFIGS.deepseek.prix, new Date())
          depense += (x.usage.entree * t.entree + x.usage.sortie * t.sortie) / 1e6
          return { texte: x.texte, tronquee: x.tronquee }
        },
      })
      ligne.tours = res.tours.map((t: { rang: number; ok: boolean; motif?: string }) => ({ rang: t.rang, ok: t.ok, motif: (t.motif ?? '').split('\n')[0]!.slice(0, 160) }))
      ligne.livree = res.ok
      if (res.ok) {
        const fichiers = res.fichiers as Map<string, string>
        const json = Buffer.from(JSON.stringify(Object.fromEntries(fichiers)))
        writeFileSync(join(RACINE_SORTIE, `${c.hash}.json.gz`), gzipSync(json, { level: 9 }))
        ligne.fichiersSha256 = createHash('sha256').update(json).digest('hex')
        ligne.mesure = await mesurer(fichiers, entites.length > 0)
      }
    } catch (e) {
      ligne.livree = false
      ligne.interrompu = (e as { budget?: boolean }).budget === true
      ligne.erreur = String((e as Error).message).slice(0, 400)
    }
    ligne.ms = Date.now() - t0
    ligne.depenseCumulee = +depense.toFixed(4)
    rejeu.push(ligne)
    writeFileSync(join(ICI, 'sortie', 'm5-rejeu.json'), JSON.stringify({ instantane_sha256: sha, plafond: PLAFOND_USD, depense: +depense.toFixed(4), rejeu }, null, 1) + '\n')
    console.log(`\n${c.secteur} · livrée=${ligne.livree}${ligne.interrompu ? ' · INTERROMPUE' : ''} · ${Math.round((ligne.ms as number) / 1000)} s · dépensé ${depense.toFixed(3)} $\n  ${JSON.stringify(ligne.mesure ?? ligne.erreur)}`)
  }
  console.log(`\nDÉPENSE TOTALE : ${depense.toFixed(4)} $ (plafond ${PLAFOND_USD} $)`)
}
