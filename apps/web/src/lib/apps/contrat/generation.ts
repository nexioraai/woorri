/**
 * V4 · BLOC 2 — LA GÉNÉRATION ASSEMBLÉE, DE LA LECTURE AUX JUGES.
 *
 *   lecture + entités
 *     → GRAPHE (V2, avant tout appel) → squelette de spec
 *     → PLAN FLASH (un appel léger, déjà payé en 3c) : par écran lu, son rôle,
 *       ses tables, son extrait cité et son ARCHÉTYPE parmi les treize — validé
 *       par `validerPlan`, sinon déduit par règle et consigné
 *     → les écrans lus en DEUX PASSES (bloc 1), quatre à la fois
 *     → les écrans de Deribfy, sans appel : l'accueil, le compte et ses trois
 *       pages (archétypes), la tétrade de chaque table (squelette V2)
 *     → LA COUTURE : Deribfy pose les passages que le graphe exige et qu'un
 *       archétype rempli ne porte pas (la suite du parcours, l'entrée des
 *       écrans lus au-delà de douze et des listes de tables)
 *     → TRADUCTION B3 (un appel par langue lue, réflexion coupée)
 *     → validation de l'APPLICATION ENTIÈRE (couches 1 et 2, graphe, traductions)
 *     → compilation V3 → assemblage → juges d'exécution et d'expérience.
 *
 * La ligne porte, par écran : archétype, origine du choix, tentatives A/B,
 * repli, jetons, coût ; par langue : jetons, coût, textes non traduits.
 *
 * DEUX MESURES DÉFINIES ICI, à juger par le propriétaire :
 *   · couverture = écrans LUS remplis sans repli / écrans lus (le graphe, lui,
 *     couvre 100 % des routes par construction — V2) ;
 *   · persistance = chaque table non journal est LUE par un écran (Lignes ou
 *     Fiche) ET ÉCRITE par un submit — la tétrade l'assure par construction ;
 *     le juge le vérifie sur la spec livrée.
 */
import { assembler } from '../bac-a-sable'
import { lecturePubliqueDe, nomColonne, nomTable, type EntiteDeclaree } from '../entites-declarees'
import { jugerExecution, type VerdictExecution } from '../juge-execution'
import { ATTENTE_SIMULATEUR_MS, SCRIPT_EXPERIENCE } from '../juge-experience'
import type { DefautPersistance } from '../juge-persistance'
import { planifierEcrans, ROLE_GESTION as ROLE_GESTION_PLAN, type AppelerLeger, type Plan, type PlanEcran } from '../plan-ecrans'
import { LANGUES_CONNUES } from '../squelette'
import { ARCHETYPES, carte, expanser, libellesDuGabarit, type DefArchetype, type Remplissage } from './archetypes'
import type { Spec } from './catalogue'
import { compilerApp } from './compiler'
import { remplirEcran, textesDuRepli, type AppelModele, type EcranRempli, type FicheEcran, type JetonsAppel, type PrixJetons, type Voisine } from './deux-passes'
import { contexteDuPlan, deriverPlan, routeDe, squeletteDeSpec, type LectureGraphe, type PlanGraphe } from './graphe'
import { SOURCES_MOTEUR } from './sources-moteur'
import { ENTREE_OEUVRE } from './entree-oeuvre'
import { traduire, type LigneLangue } from './traduction'
import { validerSpec, type Contexte, type Refus, type TableLue } from './validateur'
import type { AppCompilee, LangueApp } from './rendu/moteur'

export const PARALLELISME_V4 = 4
/**
 * Le plafond du juge d'exécution QUAND il porte le juge d'expérience de
 * l'application entière. MESURÉ (2026-11-14, simulateur) : Hayine 5b1c20bc,
 * 47 écrans, 138 contrôles → 32 s ; le plafond par défaut (15 s) l'arrêtait
 * avant la fin et rendait « ne se monte pas » sur une application qui se
 * monte en 3,7 s. Près de trois fois la mesure.
 */
export const PLAFOND_EXPERIENCE_MS = 90_000

export type LectureV4 = {
  readonly ecrans: readonly string[]
  readonly roles: readonly string[]
  readonly parcours?: readonly string[]
  readonly langues: readonly string[]
  readonly devises: readonly string[]
  readonly moyensPaiement: readonly string[]
  readonly pays: readonly string[]
}

export type LigneEcran = {
  readonly route: string
  readonly nom: string
  readonly archetype: string
  /** `plan` : choisi par le plan flash ; `regle` : déduit par règle (consigné) ; `deribfy` : écrit par Deribfy. */
  readonly choix: 'plan' | 'regle' | 'deribfy'
  readonly tentativesA: number
  readonly tentativesB: number
  readonly repli: boolean
  readonly jetons: JetonsAppel
  readonly cout: number
  /** Les refus de la dernière passe B quand l'écran est en repli. */
  readonly refus: readonly string[]
  /** Le BRUT de chaque passe B refusée (4 000 signes au plus) : sans lui, on ne sait pas ce que le modèle a écrit. */
  readonly bruts: readonly string[]
}

export type ResultatGeneration = {
  readonly ok: boolean
  readonly motif: string | null
  readonly graphe: PlanGraphe
  readonly plan: Plan
  readonly spec: Spec
  readonly app: AppCompilee
  readonly fichiers: ReadonlyMap<string, string>
  readonly code: string | null
  readonly ecrans: readonly LigneEcran[]
  readonly langues: readonly LigneLangue[]
  /** Chaque appel au modèle (hors plan) : son écran ou sa langue, sa passe, son rang, ses refus. */
  readonly tours: readonly { readonly ou: string; readonly passe: 'A' | 'B' | 'T'; readonly rang: number; readonly ms: number; readonly tronquee: boolean; readonly ok: boolean; readonly motif?: string }[]
  /** Le validateur sur l'application entière : vide attendu. */
  readonly contrat: readonly Refus[]
  readonly execution: VerdictExecution | null
  readonly persistance: readonly DefautPersistance[]
  readonly couverture: { readonly lus: number; readonly remplis: number; readonly replis: readonly string[]; readonly taux: number | null }
  readonly consignes: readonly { readonly quoi: string; readonly motif: string }[]
  readonly jetons: JetonsAppel
  readonly cout: number
  readonly languesPage: readonly { readonly code: string; readonly dir: 'ltr' | 'rtl' }[]
  /** Le remplissage de chaque écran lu : une œuvre se recompile EXACTEMENT avec des gabarits corrigés. */
  readonly remplissages: Readonly<Record<string, Remplissage>>
}

type O = Record<string, unknown>
const RTL = new Set(['ar', 'he', 'fa', 'ur'])
const langueApp = (code: string): LangueApp => ({ code, dir: LANGUES_CONNUES[code]?.dir ?? (RTL.has(code) ? 'rtl' : 'ltr'), libelle: LANGUES_CONNUES[code]?.nom ?? code.toUpperCase() })
const cleNom = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase().replace(/\s+/gu, ' ').trim()
const sur = (t: string) => t.replace(/[<>]/gu, '').replace(/\s+/gu, ' ').trim().slice(0, 120)

/** Les tables telles que le contrat les lit, depuis les entités déclarées. */
export function tablesDesEntites(entites: readonly EntiteDeclaree[]): TableLue[] {
  return entites.map((e) => ({ nom: nomTable(e), colonnes: e.fields.map((f) => nomColonne(f)), ...(e.appendOnly === true ? { journal: true } : {}), ...(lecturePubliqueDe(e) ? { publique: true } : {}) }))
}

export async function enParallele<T>(taches: readonly (() => Promise<T>)[], n: number): Promise<T[]> {
  const r: T[] = new Array<T>(taches.length)
  let i = 0
  const ouvrier = async () => { for (;;) { const k = i; i += 1; if (k >= taches.length) return; r[k] = await taches[k]!() } }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, taches.length)) }, ouvrier))
  return r
}

/** Toutes les routes visées par un écran (navigate). */
function ciblesDe(x: unknown, acc: Set<string> = new Set()): Set<string> {
  if (Array.isArray(x)) for (const y of x) ciblesDe(y, acc)
  else if (typeof x === 'object' && x !== null) {
    const o = x as O
    if (o.faire === 'navigate' && typeof o.route === 'string') acc.add(o.route)
    for (const v of Object.values(o)) ciblesDe(v, acc)
  }
  return acc
}

const bouton = (libelle: string, route: string, genre = 'secondaire'): O => ({ composant: 'Bouton', libelle, effets: [{ faire: 'navigate', route }], genre })

/** Ajoute des nœuds avant la dernière commande « Accueil » de l'écran (ou à la fin). */
function coudre(ecran: O, noeuds: readonly O[]): O {
  if (noeuds.length === 0) return ecran
  const corps = [...(ecran.corps as O[])]
  const dernier = corps.at(-1)
  const finAccueil = dernier !== undefined && dernier.composant === 'Bouton' && ciblesDe(dernier).has('accueil') && ciblesDe(dernier).size === 1
  if (finAccueil) corps.splice(corps.length - 1, 0, ...noeuds)
  else corps.push(...noeuds)
  return { ...ecran, corps }
}

/** La persistance sur la spec : lue par Lignes / Fiche, écrite par un submit. */
export function persistanceDeLaSpec(spec: Spec, tables: readonly TableLue[]): DefautPersistance[] {
  const lues = new Set<string>()
  const ecrites = new Set<string>()
  const marcher = (x: unknown) => {
    if (Array.isArray(x)) { for (const y of x) marcher(y); return }
    if (typeof x !== 'object' || x === null) return
    const o = x as O
    if ((o.composant === 'Lignes' || o.composant === 'Fiche') && typeof (o.donnee as O | undefined)?.$data === 'string') {
      const m = /^table\.([a-zA-Z0-9_]+)$/u.exec((o.donnee as { $data: string }).$data)
      if (m !== null) lues.add(m[1]!)
    }
    if (o.faire === 'submit' && typeof o.table === 'string') ecrites.add(o.table)
    for (const v of Object.values(o)) marcher(v)
  }
  marcher(spec.ecrans)
  return tables.filter((t) => t.journal !== true).map((t) => ({ table: t.nom, lue: lues.has(t.nom), ecrite: ecrites.has(t.nom) })).filter((d) => !d.lue || !d.ecrite)
}

const EST_PAIEMENT = /paiement|payment|transaction|versement|reglement|r[èe]glement|commande/iu

/** La fiche d'un écran lu, depuis le graphe et la ligne du plan flash. */
function ficheDe(o: {
  readonly route: string
  readonly ligne: PlanEcran
  readonly graphe: PlanGraphe
  readonly tables: readonly TableLue[]
  readonly nomTableDe: (nom: string) => string | undefined
  readonly lecture: LectureV4
  readonly principale: string
  readonly devise: string | null
  readonly voisinesLues: readonly Voisine[]
  readonly roleGestion: string
  readonly consignes: { quoi: string; motif: string }[]
}): FicheEcran {
  const { ligne: l } = o
  const archetype = l.archetype ?? 'onboarding'
  const def = (ARCHETYPES as Readonly<Record<string, DefArchetype>>)[archetype]!
  const parNom = (n: string) => o.tables.find((t) => t.nom === o.nomTableDe(n))
  const lit = l.tables.lit.map(parNom).filter((t): t is TableLue => t !== undefined)
  const ecrit = l.tables.ecrit.map(parNom).filter((t): t is TableLue => t !== undefined)
  let table: TableLue | undefined
  let tablePaiement: TableLue | undefined
  if ('table' in def.slots) {
    if (archetype === 'formulaire') table = ecrit[0] ?? lit[0]
    else if (archetype === 'checkout') { tablePaiement = ecrit.find((t) => EST_PAIEMENT.test(t.nom)) ?? ecrit[0]; table = lit.find((t) => t !== tablePaiement) ?? lit[0] ?? tablePaiement }
    else table = lit[0] ?? ecrit[0]
  }
  let acces = archetype === 'dashboard' || archetype === 'tableAdmin' ? o.roleGestion : l.role
  if (acces !== 'visiteur' && !o.graphe.roles.includes(acces)) acces = 'visiteur'
  if (acces === 'visiteur' && table !== undefined && table.publique !== true && def.donnees !== 'aucune') {
    const r = o.lecture.roles.find((x) => !ROLE_GESTION_PLAN.test(x)) ?? o.graphe.roles[0] ?? o.roleGestion
    o.consignes.push({ quoi: `écran « ${l.nom} »`, motif: `ouvert au visiteur, il lit ${table.nom}, table privée : réservé à « ${r} »` })
    acces = r
  }
  const tetrade = o.graphe.routes.filter((r) => r.tetrade !== undefined && (r.tetrade.table === table?.nom || r.tetrade.table === tablePaiement?.nom))
    .map((r): Voisine => ({ route: r.route, nom: r.nom, archetype: { liste: 'liste', detail: 'detail', creer: 'formulaire', editer: 'formulaire' }[r.tetrade!.vue], table: r.tetrade!.table }))
  return {
    route: o.route, nom: l.nom, archetype, acces,
    ...(table !== undefined ? { table } : {}),
    ...(tablePaiement !== undefined ? { tablePaiement } : {}),
    voisines: [...o.voisinesLues.filter((v) => v.route !== o.route), ...tetrade],
    langue: o.principale, langues: (o.lecture.langues.length > 0 ? o.lecture.langues : [o.principale]).map(langueApp),
    devise: o.devise, moyensPaiement: o.lecture.moyensPaiement, extrait: l.extrait,
  }
}

export async function genererApplication(o: {
  readonly demande: string
  readonly nom: string
  readonly lecture: LectureV4
  readonly entites: readonly EntiteDeclaree[]
  readonly devise: string | null
  /** La configuration du client ; le nom et la devise y sont déjà imposés par Deribfy. */
  readonly configuration?: Readonly<Record<string, string>>
  readonly appelerModele: AppelModele
  readonly appelerLeger: AppelerLeger
  readonly prix: PrixJetons
  readonly parallelisme?: number
  readonly juger?: typeof jugerExecution
}): Promise<ResultatGeneration> {
  const tables = tablesDesEntites(o.entites)
  const nomTableDe = (n: string) => { const e = o.entites.find((x) => x.name === n || nomTable(x) === n); return e === undefined ? undefined : nomTable(e) }
  const lectureG: LectureGraphe = { ecrans: o.lecture.ecrans, roles: o.lecture.roles, parcours: o.lecture.parcours ?? [], langues: o.lecture.langues, devises: o.lecture.devises, moyensPaiement: o.lecture.moyensPaiement, pays: o.lecture.pays }
  // ── LE GRAPHE (V2), avant tout appel.
  const graphe = deriverPlan(lectureG, tables)
  const ctx: Contexte = contexteDuPlan(graphe, lectureG)
  // Un écran seul doit pouvoir viser les routes de tétrade : elles sont du plan.
  const ctxEcran: Contexte = { ...ctx, routes: graphe.routes.map((r) => r.route) }
  const squelette = squeletteDeSpec(graphe)
  const principale = ctx.langues[0] ?? 'fr'
  const roleGestion = graphe.routes.find((r) => r.origine === 'tetrade')?.acces ?? graphe.roles[0] ?? 'visiteur'
  const consignes: { quoi: string; motif: string }[] = [...graphe.refus]

  // ── LE PLAN FLASH : rôle, tables, extrait et archétype de chaque écran lu.
  const plan = await planifierEcrans(o.appelerLeger, { ecrans: o.lecture.ecrans, roles: o.lecture.roles, parcours: o.lecture.parcours }, o.entites, o.demande, { archetypes: true })
  consignes.push(...plan.refuses)
  const lus = graphe.routes.filter((r) => r.origine === 'lecture')
  const ligneDe = (nom: string) => plan.ecrans.find((e) => cleNom(e.nom) === cleNom(nom))

  const voisinesLues: Voisine[] = [
    { route: 'accueil', nom: libellesDuGabarit(principale).accueil!, archetype: 'accueil' },
    { route: 'compte', nom: textesDuRepli(principale).compte!, archetype: 'compte' },
    ...lus.map((r) => ({ route: r.route, nom: r.nom, ...(ligneDe(r.nom)?.archetype !== undefined ? { archetype: ligneDe(r.nom)!.archetype! } : {}) })),
  ]

  // ── LES ÉCRANS LUS, EN DEUX PASSES, quatre à la fois.
  const configuration = texteDeConfigurationV4(o.configuration ?? {})
  const fiches = lus.map((r) => {
    const ligne = ligneDe(r.nom) ?? { nom: r.nom, slug: r.route, role: 'visiteur', navigation: 'public' as const, tables: { lit: [], ecrit: [] }, extrait: '', archetype: 'onboarding' as const, origineArchetype: 'regle' as const }
    const fiche = ficheDe({ route: r.route, ligne, graphe, tables, nomTableDe, lecture: o.lecture, principale, devise: o.devise, voisinesLues, roleGestion, consignes })
    return { r, ligne, fiche: configuration === '' ? fiche : { ...fiche, configuration } }
  })
  const remplis: EcranRempli[] = await enParallele(fiches.map((f) => () => remplirEcran({ fiche: f.fiche, ctx: ctxEcran, appeler: o.appelerModele, prix: o.prix })), o.parallelisme ?? PARALLELISME_V4)

  // ── LES ÉCRANS DE DERIBFY, sans appel ; la composition (cartes d'accueil, gestion, couture).
  const g = libellesDuGabarit(principale)
  const langues = (ctx.langues.length > 0 ? ctx.langues : [principale]).map(langueApp)
  const ecrans = composerEcrans({
    graphe, squelette, principale, langues, nom: o.nom,
    lus: fiches.map((f, i) => ({ route: f.r.route, ecran: remplis[i]!.ecran, titre: titreDe(remplis[i]!.remplissage, f.r.nom), acces: f.fiche.acces })),
  })
  const sansTraduction: Spec = { ecrans: ecrans as Spec['ecrans'], barre: [...graphe.barre] }

  // ── B3 : LA TRADUCTION, un appel par langue lue.
  const tr = await traduire({ ecrans, langues: langues.map((l) => l.code), appeler: o.appelerModele, prix: o.prix })
  const spec: Spec = { ...sansTraduction, ...(tr.traductions.length > 0 ? { traductions: tr.traductions } : {}) }
  const contrat = validerSpec(spec, ctx, { complet: true }).refus

  // ── LA COMPILATION, L'ASSEMBLAGE, LES JUGES.
  const app = compilerApp(spec, { nom: sur(o.nom) || g.accueil!, langues, devise: o.devise })
  const fichiers = fichiersDeLOeuvre(app, tables.map((t) => t.nom))
  const v = await assembler(new Map(fichiers))
  let execution: VerdictExecution | null = null
  if (v.ok) {
    const args = { ecrans: ecrans.map((e) => ({ nom: String(e.route), slug: String(e.route), role: e.acces === 'visiteur' ? '' : String(e.acces) })), langues: langues.map((l) => ({ code: l.code, dir: l.dir, libelles: [l.libelle] })), parcours: graphe.parcours, mode: 'application', attenteMs: ATTENTE_SIMULATEUR_MS, controlesMax: 300 }
    execution = await (o.juger ?? jugerExecution)(v.code, { plafondMs: PLAFOND_EXPERIENCE_MS, experience: { script: SCRIPT_EXPERIENCE, args } })
  }

  // ── LA LIGNE.
  const lignes: LigneEcran[] = graphe.routes.map((r) => {
    const i = fiches.findIndex((f) => f.r.route === r.route)
    if (i < 0) {
      const archetype = r.tetrade !== undefined ? `tetrade:${r.tetrade.vue}` : r.origine === 'gestion' ? 'gestion' : r.route === 'accueil' ? 'accueil' : r.route === 'compte' ? 'compte' : 'pageDuCompte'
      return { route: r.route, nom: r.nom, archetype, choix: 'deribfy', tentativesA: 0, tentativesB: 0, repli: false, jetons: { entree: 0, sortie: 0, reflexion: 0 }, cout: 0, refus: [], bruts: [] }
    }
    const e = remplis[i]!
    return {
      route: r.route, nom: r.nom, archetype: e.archetype, choix: fiches[i]!.ligne.origineArchetype ?? 'regle',
      tentativesA: e.tentatives.filter((t) => t.passe === 'A').length, tentativesB: e.tentatives.filter((t) => t.passe === 'B').length,
      repli: e.repli, jetons: e.jetons, cout: e.cout, refus: e.refusAvantRepli.map((x) => `${x.classe} · ${x.ou} · ${x.quoi}`.slice(0, 400)),
      bruts: e.tentatives.filter((t) => t.passe === 'B' && t.brut !== undefined).map((t) => t.brut!),
    }
  })
  const somme = (xs: readonly JetonsAppel[]) => xs.reduce((a, b) => ({ entree: a.entree + b.entree, sortie: a.sortie + b.sortie, reflexion: a.reflexion + b.reflexion }), { entree: 0, sortie: 0, reflexion: 0 })
  const jetons = somme([...remplis.map((e) => e.jetons), ...tr.lignes.map((l) => l.jetons)])
  const cout = remplis.reduce((a, e) => a + e.cout, 0) + tr.lignes.reduce((a, l) => a + l.cout, 0)
  const replis = remplis.filter((e) => e.repli).map((e) => e.route)
  return {
    ok: v.ok, motif: v.ok ? null : `La construction a échoué :\n${v.erreur}`,
    graphe, plan, spec, app, fichiers, code: v.ok ? v.code : null,
    ecrans: lignes, langues: tr.lignes, contrat, execution,
    tours: [
      ...remplis.flatMap((e) => e.tentatives.map((t) => ({ ou: e.route, passe: t.passe, rang: t.rang, ms: t.ms, tronquee: t.tronquee, ok: t.refus.length === 0, ...(t.refus.length > 0 ? { motif: `[${e.route}] ${t.refus.map((x) => `${x.classe} · ${x.quoi}`).join(' ; ').slice(0, 600)}` } : {}) }))),
      ...tr.lignes.map((l) => ({ ou: l.langue, passe: 'T' as const, rang: 1, ms: 0, tronquee: l.tronquee, ok: l.nonTraduits.length === 0, ...(l.nonTraduits.length > 0 ? { motif: `[${l.langue}] ${String(l.nonTraduits.length)} non traduit(s)` } : {}) })),
    ],
    persistance: persistanceDeLaSpec(spec, tables),
    couverture: { lus: lus.length, remplis: lus.length - replis.length, replis, taux: lus.length === 0 ? null : (lus.length - replis.length) / lus.length },
    consignes, jetons, cout, languesPage: langues.map((l) => ({ code: l.code, dir: l.dir })),
    remplissages: Object.fromEntries(remplis.map((e) => [e.route, e.remplissage])),
  }
}

const LIBELLES_CONFIGURATION: Readonly<Record<string, string>> = { market: 'MARCHÉ VISÉ', collector_msisdn: 'NUMÉRO D’ENCAISSEMENT', logistics: 'LOGISTIQUE' }
/** Le titre lisible d'un écran lu : celui que la passe A a rédigé (ou le repli), sinon le nom lu. */
export function titreDe(r: Remplissage, nom: string): string {
  return sur(typeof r.slots.titre === 'string' ? r.slots.titre : '') || sur(nom) || nom
}

/**
 * LA COMPOSITION DE L'APPLICATION, PURE — celle de la génération ET de la recompilation
 * d'une œuvre livrée (le re-jugement à 0 $ rejoue ce code-ci, pas une copie).
 *   · l'accueil : une carte par écran lu, son titre lisible, réservée à son rôle ; UNE carte
 *     « Gestion » (au rôle de gestion) — jamais une liste de tables à plat ;
 *   · le compte et ses trois pages ; l'espace de gestion et les tétrades (squelette V2) ;
 *   · la couture : la suite du parcours quand un écran ne la porte pas.
 */
export function composerEcrans(o: {
  readonly graphe: PlanGraphe
  readonly squelette: Spec
  readonly principale: string
  readonly langues: readonly LangueApp[]
  readonly nom: string
  readonly lus: readonly { readonly route: string; readonly ecran: Record<string, unknown>; readonly titre: string; readonly acces: string }[]
}): O[] {
  const g = libellesDuGabarit(o.principale)
  const rp = textesDuRepli(o.principale)
  const ex = (r: Remplissage) => expanser(r, { langue: o.principale, langues: o.langues })
  const cartes = o.lus.map((x) => ({ libelle: x.titre, route: x.route, ...(x.acces !== 'visiteur' ? { role: x.acces } : {}) }))
  const gestion = o.graphe.routes.find((r) => r.origine === 'gestion')
  const parRoute = new Map<string, O>()
  for (const r of o.graphe.routes) {
    if (r.tetrade !== undefined || r.origine === 'gestion') parRoute.set(r.route, (o.squelette.ecrans as unknown as O[]).find((e) => e.route === r.route)!)
  }
  parRoute.set('accueil', ex({ archetype: 'accueil', route: 'accueil', acces: 'visiteur', slots: { titre: sur(o.nom) || g.accueil!, raccourcis: cartes.length > 0 ? cartes.slice(0, 12) : [{ libelle: g.aide!, route: 'aide' }] } }))
  parRoute.set('compte', ex({ archetype: 'compte', route: 'compte', acces: 'visiteur', slots: { titre: rp.compte! } }))
  for (const p of ['aide', 'contact', 'legal'] as const) parRoute.set(p, ex({ archetype: 'pageDuCompte', route: p, acces: 'visiteur', slots: { titre: g[p]!, texte: rp[p]!, retour: 'compte' } }))
  for (const x of o.lus) parRoute.set(x.route, x.ecran)
  // ── LA COUTURE : au-delà de douze, les cartes suivantes ; puis l'entrée de la gestion.
  parRoute.set('accueil', coudre(parRoute.get('accueil')!, [
    ...(cartes.length > 12 ? [{ composant: 'Pile', espace: 's', enfants: cartes.slice(12).map(carte) }] : []),
    ...(gestion !== undefined ? [carte({ libelle: rp.gestion!, route: gestion.route, role: gestion.acces })] : []),
  ]))
  for (let i = 0; i + 1 < o.graphe.parcours.length; i += 1) {
    const a = o.graphe.parcours[i]!
    const b = o.graphe.parcours[i + 1]!
    const e = parRoute.get(a)
    if (e !== undefined && !ciblesDe(e).has(b)) parRoute.set(a, coudre(e, [bouton(rp.continuer!, b)]))
  }
  return o.graphe.routes.map((r) => parRoute.get(r.route)!)
}

/** La configuration du client pour la fiche : ce que Deribfy n'impose pas déjà (le nom, la devise). */
export function texteDeConfigurationV4(c: Readonly<Record<string, string>>): string {
  return Object.entries(c).filter(([k, v]) => k !== 'nom_produit' && k !== 'currency' && v.trim() !== '').map(([k, v]) => `- ${LIBELLES_CONFIGURATION[k] ?? k.toUpperCase()} : ${sur(v)}`).join('\n')
}

/** Les fichiers de l'œuvre : le moteur (texte), l'application compilée, l'entrée. */
export function fichiersDeLOeuvre(app: AppCompilee, tables: readonly string[]): Map<string, string> {
  return new Map<string, string>([
    ...Object.entries(SOURCES_MOTEUR),
    ['app.ts', `export const APP = ${JSON.stringify(app)}\nexport const TABLES: readonly string[] = ${JSON.stringify(tables)}\n`],
    ['index.tsx', ENTREE_OEUVRE],
  ])
}

export { routeDe }
