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
import { ARCHETYPES, ICONE_ARCHETYPE, carte, expanser, libellesDuGabarit, type DefArchetype, type Remplissage } from './archetypes'
import { NATURES_MEDIA, natureDeColonne, type Spec } from './catalogue'
import { compilerApp } from './compiler'
import { comptesDuCahier, indicatifDuPays } from './comptes-du-cahier'
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
  // ── LE GRAPHE (V2), avant tout appel. T2b : si le cahier demande des comptes individuels, la page
  //    « Créer un compte » est une route de Deribfy (écrite par lui, aux normes, jamais par le modèle).
  const comptesDemandes = comptesDuCahier(o.demande)
  const graphe0 = deriverPlan(lectureG, tables)
  const graphe: PlanGraphe = comptesDemandes.sorte === 'individuels' && !graphe0.routes.some((r) => r.route === ROUTE_INSCRIPTION)
    ? { ...graphe0, routes: [...graphe0.routes, { route: ROUTE_INSCRIPTION, nom: textesDuRepli(langueApp(lectureG.langues?.[0] ?? 'fr').code).creerCompte!, origine: 'socle', acces: 'visiteur' }] }
    : graphe0
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
  const comptesPourPage = comptesDemandes.sorte === 'individuels' ? { ...comptesDemandes, roleDeBase: graphe.roles.find((r) => !ROLE_GESTION_PLAN.test(r)) ?? graphe.roles[0] ?? 'utilisateur' } : null
  const ecrans = composerEcrans({
    graphe, squelette, principale, langues, nom: o.nom, comptes: comptesPourPage,
    lus: fiches.map((f, i) => ({ route: f.r.route, ecran: remplis[i]!.ecran, titre: titreDe(remplis[i]!.remplissage, f.r.nom), acces: f.fiche.acces, icone: ICONE_ARCHETYPE[remplis[i]!.archetype] ?? 'document' })),
  })
  const sansTraduction: Spec = { ecrans: ecrans as Spec['ecrans'], barre: [...graphe.barre] }

  // ── B3 : LA TRADUCTION, un appel par langue lue.
  const tr = await traduire({ ecrans, langues: langues.map((l) => l.code), appeler: o.appelerModele, prix: o.prix })
  const spec: Spec = { ...sansTraduction, ...(tr.traductions.length > 0 ? { traductions: tr.traductions } : {}) }
  const contrat = validerSpec(spec, ctx, { complet: true }).refus

  // ── LA COMPILATION, L'ASSEMBLAGE, LES JUGES.
  const kit = kitDuCahier(o.demande, o.nom)
  consignes.push({ quoi: 'kit de couleurs', motif: `${kit.kit} — ${kit.motif}` })
  // T2b : les comptes que le cahier demande (la demande de l'utilisateur prime ; le partage n'est qu'un repli).
  const { motif: motifComptes, ...comptesLus } = comptesDemandes
  // Une personne qui s'inscrit reçoit le premier rôle qui n'est pas de gestion ; l'indicatif est celui du pays lu.
  const indicatif = indicatifDuPays(o.lecture.pays)
  const comptes = comptesLus.sorte === 'partage' ? comptesLus : { ...comptesLus, roleDeBase: graphe.roles.find((r) => !ROLE_GESTION_PLAN.test(r)) ?? graphe.roles[0] ?? 'utilisateur', ...(indicatif !== undefined ? { indicatif } : {}) }
  consignes.push({ quoi: 'comptes', motif: comptesLus.sorte === 'partage' ? motifComptes : `${motifComptes} ; rôle de base « ${comptes.sorte === 'individuels' ? String(comptes.roleDeBase) : ''} »` })
  const app = compilerApp(spec, { nom: sur(o.nom) || g.accueil!, langues, devise: o.devise, kit: kit.kit, comptes })
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
  readonly lus: readonly { readonly route: string; readonly ecran: Record<string, unknown>; readonly titre: string; readonly acces: string; readonly icone?: string }[]
  /** T2b : les comptes individuels que le cahier demande — la page « Créer un compte » et son lien depuis la connexion. */
  readonly comptes?: (Exclude<ReturnType<typeof comptesDuCahier>, { sorte: 'partage' }> & { readonly roleDeBase: string }) | null
}): O[] {
  const g = libellesDuGabarit(o.principale)
  const rp = textesDuRepli(o.principale)
  const ex = (r: Remplissage) => expanser(r, { langue: o.principale, langues: o.langues })
  const cartes = o.lus.map((x) => ({ libelle: x.titre, route: x.route, ...(x.acces !== 'visiteur' ? { role: x.acces } : {}), ...(x.icone !== undefined ? { icone: x.icone } : {}) }))
  const gestion = o.graphe.routes.find((r) => r.origine === 'gestion')
  const parRoute = new Map<string, O>()
  for (const r of o.graphe.routes) {
    if (r.tetrade !== undefined || r.origine === 'gestion') parRoute.set(r.route, (o.squelette.ecrans as unknown as O[]).find((e) => e.route === r.route)!)
  }
  parRoute.set('accueil', accueilParEspace({ ...o, cartes, gestion, g, rp, inscription: o.comptes !== undefined && o.comptes !== null && o.graphe.routes.some((r) => r.route === ROUTE_INSCRIPTION) }))
  parRoute.set('compte', ex({ archetype: 'compte', route: 'compte', acces: 'visiteur', slots: { titre: rp.compte! } }))
  for (const p of ['aide', 'contact', 'legal'] as const) parRoute.set(p, ex({ archetype: 'pageDuCompte', route: p, acces: 'visiteur', slots: { titre: g[p]!, texte: rp[p]!, retour: 'compte' } }))
  for (const x of o.lus) parRoute.set(x.route, voirToutVersLaListe(x.ecran, o.graphe))
  if (o.comptes !== undefined && o.comptes !== null && o.graphe.routes.some((r) => r.route === ROUTE_INSCRIPTION)) {
    const connexion = o.lus.find((x) => emet(x.ecran, 'connexion'))
    const apres = o.lus.find((x) => x.acces === o.comptes!.roleDeBase && !emet(x.ecran, 'connexion'))?.route ?? 'accueil'
    parRoute.set(ROUTE_INSCRIPTION, ecranInscription({ comptes: o.comptes, profil: tableDuProfil(o.graphe.tables), apres, connexion: connexion?.route ?? null, rp, legal: g.legal! }))
    // L'identifiant de la connexion est CELUI QUE LE CAHIER FIXE (téléphone, courriel, l'un ou l'autre),
    // quoi qu'ait écrit le modèle (Conterak : « Adresse e-mail » seule, le cahier dit « téléphone OU e-mail »).
    if (connexion !== undefined) parRoute.set(connexion.route, identifiantDuCahier(parRoute.get(connexion.route)!, o.comptes, rp))
    // La connexion mène à l'inscription (norme : « Créer un compte » sous « Se connecter »).
    if (connexion !== undefined) { const e = parRoute.get(connexion.route)!; if (!ciblesDe(e).has(ROUTE_INSCRIPTION)) parRoute.set(connexion.route, coudre(e, [{ composant: 'Bouton', libelle: rp.creerCompte!, effets: [{ faire: 'navigate', route: ROUTE_INSCRIPTION }], genre: 'secondaire' }])) }
  }
  for (let i = 0; i + 1 < o.graphe.parcours.length; i += 1) {
    const a = o.graphe.parcours[i]!
    const b = o.graphe.parcours[i + 1]!
    const e = parRoute.get(a)
    if (e !== undefined && !ciblesDe(e).has(b)) parRoute.set(a, coudre(e, [bouton(rp.continuer!, b)]))
  }
  return o.graphe.routes.map((r) => parRoute.get(r.route)!)
}

/**
 * L'ACCUEIL PAR ESPACE (2026-11-14, Conterak : « beaucoup de répétition »). Plus jamais une
 * carte par écran lu pour tout le monde :
 *   · le VISITEUR (`pourRole: 'visiteur'`) : le nom, une phrase, UN bouton principal (se
 *     connecter s'il y a un écran de connexion, sinon commencer), ses écrans publics (≤ 3),
 *     et une carte par espace — elle mène au premier écran de ce rôle, dont la garde demande
 *     le rôle ;
 *   · chaque RÔLE (`pourRole: rôle`) : six raccourcis, puis ses autres écrans en liens discrets (aucun écran lu sans entrée) ;
 *     l'entrée de la gestion dans l'espace du rôle de gestion.
 * Aucun chiffre ici : l'accueil est ouvert au visiteur, et `pourRole` cache, il ne protège pas
 * (DONNEE_PRIVEE_EXPOSEE l'a refusé) — les chiffres sont sur les tableaux de bord, derrière la garde.
 * Une application à un seul rôle n'a pas d'accueil visiteur : sa session porte le rôle.
 */
type CarteAccueil = { readonly libelle: string; readonly route: string; readonly role?: string; readonly icone?: string }
const RACCOURCIS_MAX = 6
const PUBLICS_MAX = 3
function accueilParEspace(o: {
  readonly nom: string; readonly graphe: PlanGraphe; readonly cartes: readonly CarteAccueil[]
  readonly lus: readonly { readonly route: string; readonly ecran: Record<string, unknown>; readonly acces: string }[]
  readonly gestion: PlanGraphe['routes'][number] | undefined
  readonly g: Readonly<Record<string, string>>; readonly rp: Readonly<Record<string, string>>
  /** T2b : la page « Créer un compte » existe — le visiteur y est mené depuis l'accueil. */
  readonly inscription?: boolean
}): O {
  const connexion = o.lus.find((x) => emet(x.ecran, 'connexion'))
  const publiques = o.cartes.filter((c) => c.role === undefined && c.route !== connexion?.route)
  const roles = [...new Set(o.cartes.flatMap((c) => (c.role !== undefined ? [c.role] : [])))]
  if (o.gestion !== undefined && o.gestion.acces !== 'visiteur' && !roles.includes(o.gestion.acces)) roles.push(o.gestion.acces)
  const titrePage: O = { composant: 'Titre', texte: sur(o.nom) || o.g.accueil!, niveau: 'page' }
  const section = (t: string): O => ({ composant: 'Titre', texte: t, niveau: 'section' })
  // Des cartes de même hauteur dans une rangée.
  const rangee = (enfants: O[]): O => ({ composant: 'Pile', sens: 'ligne', espace: 'm', aligner: 'etirer', enfants })
  const lien = (c: CarteAccueil): O => ({ composant: 'Bouton', libelle: c.libelle, effets: [{ faire: 'navigate', route: c.route }], genre: 'discret', ...(c.icone !== undefined ? { icone: c.icone } : {}) })
  const sansRole = (c: CarteAccueil) => carte({ libelle: c.libelle, route: c.route, ...(c.icone !== undefined ? { icone: c.icone } : {}) })
  const suite = o.graphe.parcours.find((r) => r !== 'accueil' && r !== connexion?.route)

  const espaceDe = (role: string): O => {
    const siennes = o.cartes.filter((c) => c.role === role)
    const gestion = o.gestion !== undefined && o.gestion.acces === role ? [{ libelle: o.rp.gestion!, route: o.gestion.route, icone: 'reglages' }] : []
    const raccourcis = [...siennes, ...gestion]
    return { composant: 'Pile', espace: 'l', pourRole: role, enfants: [
      ...(raccourcis.length > 0 ? [section(o.rp.raccourcis!), rangee(raccourcis.slice(0, RACCOURCIS_MAX).map(sansRole))] : []),
      ...(raccourcis.length > RACCOURCIS_MAX ? [section(o.rp.autres!), { composant: 'Pile', sens: 'ligne', espace: 's', enfants: raccourcis.slice(RACCOURCIS_MAX).map(lien) }] : []),
    ] }
  }
  const visiteur: O[] = [
    ...(roles.length > 1 ? [{ composant: 'Phrase', texte: o.rp.choisir! }] : []),
    ...(connexion !== undefined ? [{ composant: 'Bouton', libelle: o.g.seConnecter!, effets: [{ faire: 'navigate', route: connexion.route }], genre: 'principal', icone: 'utilisateur' }]
      : suite !== undefined && o.inscription !== true ? [{ composant: 'Bouton', libelle: o.rp.commencer!, effets: [{ faire: 'navigate', route: suite }], genre: 'principal', icone: 'suivant' }] : []),
    ...(o.inscription === true ? [{ composant: 'Bouton', libelle: o.rp.creerCompte!, effets: [{ faire: 'navigate', route: ROUTE_INSCRIPTION }], genre: connexion !== undefined ? 'secondaire' : 'principal', icone: 'ajouter' }] : []),
    // Le parcours du cahier reste ouvert (le juge le traverse) : sans écran de connexion, « Commencer » suit « Créer un compte ».
    ...(o.inscription === true && connexion === undefined && suite !== undefined ? [{ composant: 'Bouton', libelle: o.rp.commencer!, effets: [{ faire: 'navigate', route: suite }], genre: 'secondaire', icone: 'suivant' }] : []),
    ...(publiques.length > 0 ? [rangee(publiques.slice(0, PUBLICS_MAX).map(sansRole))] : []),
    ...(publiques.length > PUBLICS_MAX ? [{ composant: 'Pile', sens: 'ligne', espace: 's', enfants: publiques.slice(PUBLICS_MAX).map(lien) }] : []),
    ...(roles.length > 1 ? [section(o.rp.vosEspaces!), rangee(roles.map((r) => {
      const premier = o.cartes.find((c) => c.role === r)?.route ?? (o.gestion?.acces === r ? o.gestion.route : undefined)
      return premier === undefined ? null : carte({ libelle: o.rp.espace!.replace('{r}', r), route: premier, icone: 'utilisateur' })
    }).filter((x): x is O => x !== null))] : []),
  ]
  return { route: 'accueil', acces: 'visiteur', titre: titrePage.texte, corps: [
    titrePage,
    roles.length > 0 ? { composant: 'Pile', espace: 'l', pourRole: 'visiteur', enfants: visiteur } : { composant: 'Pile', espace: 'l', enfants: visiteur },
    ...roles.map(espaceDe),
  ] }
}
/** Le champ de l'identifiant d'une connexion, aligné sur les comptes que le cahier demande. */
function identifiantDuCahier(ecran: O, c: { readonly identifiant: string }, rp: Readonly<Record<string, string>>): O {
  const nature = c.identifiant === 'courriel' ? 'courriel' : c.identifiant === 'telephone' ? 'telephone' : 'texte'
  const libelle = c.identifiant === 'courriel' ? rp.idCourriel! : c.identifiant === 'telephone' ? rp.idTelephone! : rp.idLesDeux!
  const marcher = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(marcher)
    if (typeof x !== 'object' || x === null) return x
    const n = x as O
    if (n.composant === 'Champ' && (n.donnee as { $data?: string } | undefined)?.$data === 'etat.identifiant') return { ...n, nature, libelle }
    return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, marcher(v)]))
  }
  return marcher(ecran) as O
}
/** T2b : la route de la page d'inscription de Deribfy. */
export const ROUTE_INSCRIPTION = 'creer-un-compte'
/** La table du profil d'une personne, si le cahier en déclare une. */
const NOM_PROFIL = /^(profil|profile|profils|utilisateur|utilisateurs|user|users|membre|membres|client|clients|abonne|abonnes|compte|comptes)$/u
const PAS_DANS_LE_PROFIL = /^(id|created_at|updated_at|cree_le|modifie_le|owner_id|user_id|auth_id|statut|status|etat|role|roles)$|(^|_)(pin|mot_de_passe|motdepasse|password|secret|code_personnel|code_pin|hash)(_|$)/u
function tableDuProfil(tables: readonly { readonly nom: string; readonly colonnes: readonly string[] }[]): { readonly nom: string; readonly colonnes: readonly string[] } | null {
  const t = tables.find((x) => NOM_PROFIL.test(x.nom))
  if (t === undefined) return null
  const colonnes = t.colonnes.filter((c) => !PAS_DANS_LE_PROFIL.test(c)).slice(0, 10)
  return colonnes.length === 0 ? null : { nom: t.nom, colonnes }
}
/**
 * LA PAGE « CRÉER UN COMPTE » (T2b-3), aux normes : l'identifiant et le secret que le cahier
 * demande, la confirmation d'un mot de passe, les champs du profil, l'acceptation des conditions
 * (lien vers les mentions), et UN bouton qui enchaîne — créer le compte, se connecter, enregistrer
 * le profil, aller à son espace. Une étape qui échoue arrête la suite (T2).
 */
function ecranInscription(o: { readonly comptes: { readonly identifiant: string; readonly secret: { readonly nature: string; readonly chiffres?: number } }; readonly profil: { readonly nom: string; readonly colonnes: readonly string[] } | null; readonly apres: string; readonly connexion: string | null; readonly rp: Readonly<Record<string, string>>; readonly legal: string }): O {
  const { rp } = o
  const d = (x: string) => ({ $data: x })
  const lisible = (c: string) => c.replace(/_/gu, ' ').replace(/^./u, (x) => x.toUpperCase())
  const mdp = o.comptes.secret.nature !== 'code'
  const natureId = o.comptes.identifiant === 'courriel' ? 'courriel' : o.comptes.identifiant === 'telephone' ? 'telephone' : 'texte'
  const libelleId = o.comptes.identifiant === 'courriel' ? rp.idCourriel! : o.comptes.identifiant === 'telephone' ? rp.idTelephone! : rp.idLesDeux!
  const profil = o.profil?.colonnes.filter((c) => !/^(email|courriel|e_mail|telephone|tel|phone|mobile)$/u.test(c)) ?? []
  return {
    route: ROUTE_INSCRIPTION, acces: 'visiteur', titre: rp.creerCompte!,
    etat: [{ nom: 'identifiant', nature: 'texte' }, { nom: 'secret', nature: 'texte' }, ...(mdp ? [{ nom: 'confirmation', nature: 'texte' }] : []), { nom: 'conditions', nature: 'booleen' }, ...profil.map((c) => ({ nom: `p_${c}`, nature: 'texte' }))],
    corps: [
      { composant: 'Titre', texte: rp.creerCompte!, niveau: 'page' },
      { composant: 'Phrase', texte: rp.introInscription! },
      { composant: 'Champ', libelle: libelleId, donnee: d('etat.identifiant'), nature: natureId, requis: true },
      { composant: 'Champ', libelle: mdp ? rp.motDePasse! : rp.code!.replace('{n}', String(o.comptes.secret.chiffres ?? 4)), donnee: d('etat.secret'), nature: 'secret', requis: true },
      ...(mdp ? [{ composant: 'Champ', libelle: rp.confirmation!, donnee: d('etat.confirmation'), nature: 'secret', requis: true }] : []),
      ...profil.map((c) => ({ composant: 'Champ', libelle: lisible(c), donnee: d(`etat.p_${c}`), nature: natureDeColonne(c, 'texte'), ...((NATURES_MEDIA as readonly string[]).includes(natureDeColonne(c, 'texte')) ? {} : { requis: true }) })),
      { composant: 'Champ', libelle: rp.conditions!, donnee: d('etat.conditions'), nature: 'case', requis: true },
      { composant: 'Bouton', libelle: o.legal, effets: [{ faire: 'navigate', route: 'legal' }], genre: 'discret' },
      { composant: 'Bouton', libelle: rp.creerMonCompte!, genre: 'principal', effets: [
        { faire: 'emit', evenement: 'inscription', charge: [{ champ: 'identifiant', depuis: d('etat.identifiant') }, { champ: 'secret', depuis: d('etat.secret') }, ...(mdp ? [{ champ: 'confirmation', depuis: d('etat.confirmation') }] : []), { champ: 'conditions', depuis: d('etat.conditions') }] },
        { faire: 'emit', evenement: 'connexion', charge: [{ champ: 'identifiant', depuis: d('etat.identifiant') }, { champ: 'secret', depuis: d('etat.secret') }] },
        ...(o.profil !== null && profil.length > 0 ? [{ faire: 'submit', table: o.profil.nom, ecriture: 'creer', valeurs: profil.map((c) => ({ champ: c, depuis: d(`etat.p_${c}`) })) }] : []),
        { faire: 'navigate', route: o.apres },
      ] },
      ...(o.connexion !== null ? [{ composant: 'Bouton', libelle: rp.dejaCompte!, effets: [{ faire: 'navigate', route: o.connexion }], genre: 'discret' }] : []),
    ],
  }
}

/** Un écran émet-il cet événement (la connexion : c'est l'écran de connexion) ? */
function emet(x: unknown, evenement: string): boolean {
  if (Array.isArray(x)) return x.some((y) => emet(y, evenement))
  if (typeof x !== 'object' || x === null) return false
  const n = x as O
  if (n.faire === 'emit' && n.evenement === evenement) return true
  return Object.values(n).some((v) => emet(v, evenement))
}

/** « Voir tout » d'une liste de derniers ajouts : la LISTE de sa table (tétrade), jamais un détail. */
function voirToutVersLaListe(ecran: Record<string, unknown>, graphe: PlanGraphe): Record<string, unknown> {
  const marcher = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(marcher)
    if (typeof x !== 'object' || x === null) return x
    const n = x as O
    const suite = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, marcher(v)]))
    if (n.composant === 'Lignes' && n.disposition === 'recents' && n.voirTout === undefined) {
      const table = String((n.donnee as { $data?: string } | undefined)?.$data ?? '').split('.')[1]
      const liste = graphe.routes.find((r) => r.tetrade?.table === table && r.tetrade.vue === 'liste')
      if (liste !== undefined) return { ...suite, voirTout: [{ faire: 'navigate', route: liste.route }] }
    }
    return suite
  }
  return marcher(ecran) as Record<string, unknown>
}

/**
 * LE KIT D'UNE APPLICATION (V4.3d) — jamais le même pour toutes : une couleur NOMMÉE dans le
 * cahier d'abord, puis le secteur, puis une répartition stable sur le nom. Le motif est consigné.
 */
const KIT_PAR_COULEUR: readonly [RegExp, string][] = [
  [/\b(vert|verte|green|nature)\b/iu, 'savane'], [/\b(bleu|bleue|blue|azur|marine)\b/iu, 'azur'],
  [/\b(orange|terracotta|terre cuite|ocre|rouge|brique|cuivre)\b/iu, 'terracotta'], [/\b(noir|noire|sombre|dark|nuit)\b/iu, 'nuit'],
]
const KIT_PAR_SECTEUR: readonly [RegExp, string][] = [
  [/agricult|élevage|elevage|environnement|santé|sante|clinique|hôpital|hopital|école|ecole|scolaire|éducation|education|pharmac/iu, 'savane'],
  [/tourisme|voyage|hôtel|hotel|réservation|reservation|restaurant|artisan|couture|boutique|marché|marche/iu, 'terracotta'],
  [/banque|finance|assurance|comptab|administration|ministère|ministere|mairie|institution|juridique|avocat/iu, 'azur'],
  [/luxe|premium|intelligence artificielle|\bIA\b|logiciel|technologie|jeu|musique|événementiel|evenementiel/iu, 'nuit'],
]
export const KITS_ORDRE = ['azur', 'terracotta', 'nuit', 'savane'] as const
export function kitDuCahier(cahier: string, nom: string): { readonly kit: string; readonly motif: string } {
  const couleurs = /couleur|palette|charte|teinte|thème|theme/iu
  for (const phrase of cahier.split(/[.\n]/u).filter((p) => couleurs.test(p))) {
    for (const [r, kit] of KIT_PAR_COULEUR) { const m = r.exec(phrase); if (m !== null) return { kit, motif: `couleur nommée dans le cahier : « ${m[0]} »` } }
  }
  const scores = KIT_PAR_SECTEUR.map(([r, kit]) => ({ kit, n: (cahier.match(new RegExp(r.source, 'giu')) ?? []).length })).sort((a, b) => b.n - a.n)
  if (scores[0]!.n > 0) return { kit: scores[0]!.kit, motif: `secteur du cahier (${String(scores[0]!.n)} mention(s))` }
  let h = 0
  for (const c of nom) h = (h * 31 + c.codePointAt(0)!) >>> 0
  return { kit: KITS_ORDRE[h % KITS_ORDRE.length]!, motif: 'ni couleur ni secteur lus : répartition stable sur le nom' }
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
