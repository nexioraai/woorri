/**
 * L'ORCHESTRATEUR — génération ÉCRAN PAR ÉCRAN (3c, brique 6).
 *
 *   lecture (écrans, rôles, questions ouvertes) + entités + configuration
 *     → PLAN (un appel léger, revalidé : rien hors lecture)
 *     → SQUELETTE (écrit par Deribfy : index, types, etat, base, navigation,
 *        application, écrans « à compléter », PERIMETRE)
 *     → N ÉCRANS, 4 à la fois (mesuré : 8 appels simultanés passent), chacun
 *        écrit seul, jugé seul, repris une fois au plus (boucle-ecran)
 *     → ASSEMBLAGE de l'ensemble, puis les juges GLOBAUX : exécution (accueil
 *        et #gestion), couverture (sur les écrans réellement ouverts),
 *        persistance STRUCTURELLE (le plan dit qui lit et écrit quoi, le
 *        fichier le confirme), faces, vivacité, jetons.
 *
 * Il rend la MÊME forme que l'ancienne boucle (`Resultat`), plus `ecrans` et
 * `plan` : la route n'a presque rien à apprendre. Plus de règle du dernier
 * tour : un écran échoué ×2 est livré « À COMPLÉTER », visible et compté.
 */
import { assembler } from './bac-a-sable'
import { fichiersSysteme } from './bibliotheque-ui'
import { ecrireEcran, type AppelEcran, type EcranEcrit } from './boucle-ecran'
import type { Resultat, Tour } from './boucle-directe'
import type { EntiteDeclaree } from './entites-declarees'
import { ADRESSE_GESTION, nomTable } from './entites-declarees'
import { jugerCouverture } from './juge-couverture'
import { jugerExecution, type VerdictExecution } from './juge-execution'
import { jugerFaces, type VerdictFaces } from './juge-faces'
import { jugerJetons } from './juge-jetons'
import type { DefautPersistance } from './juge-persistance'
import { jugerVivacite } from './juge-vivacite'
import { planifierEcrans, ROLE_VISITEUR, type AppelerLeger, type Plan, type PlanEcran } from './plan-ecrans'
import { fichiersSquelette, sourceACompleter, sourceEcranDeribfy, sourcePerimetre } from './squelette'
import type { ContraintesFermees } from './consigne-ecran'
import { ATTENTE_SIMULATEUR_MS, SCRIPT_EXPERIENCE, type RefusExperience } from './juge-experience'

/** Mesuré (m15, 2026-11-13) : 4 et 8 appels flash simultanés passent, 0 refus. Quatre, avec repli séquentiel sur refus. */
export const PARALLELISME = 4

export type Lecture = {
  readonly ecrans: readonly string[]
  readonly roles: readonly string[]
  readonly questionsOuvertes: readonly string[]
  readonly parcours?: readonly string[]
  /** Contraintes fermées lues (3c-2). */
  readonly contraintes?: ContraintesFermees
}

type Ok = Extract<Resultat, { ok: true }>
export type ResultatEcrans =
  | (Ok & { readonly ecrans: readonly EcranEcrit[]; readonly plan: Plan; readonly experience: { readonly refus: readonly RefusExperience[]; readonly erreur?: string } | null })
  | (Extract<Resultat, { ok: false }> & { readonly ecrans: readonly EcranEcrit[]; readonly plan: Plan })

/**
 * LA PERSISTANCE, STRUCTURELLE : la table est LUE si un écran livré la lit
 * d'après le plan ET appelle `useTable('<table>')` ; ÉCRITE si un écran livré
 * l'écrit d'après le plan, l'appelle, et emploie ajouter / modifier / supprimer.
 * Rien à deviner dans le texte : `useTable` est à Deribfy.
 */
export function persistanceStructurelle(plan: Plan, ecrans: readonly EcranEcrit[], entites: readonly EntiteDeclaree[]): DefautPersistance[] {
  const fichiers = new Map(ecrans.filter((e) => e.resultat === 'ok' && e.fichier !== null).map((e) => [e.slug, e.fichier ?? '']))
  const parSlug = new Map(plan.ecrans.map((e) => [e.slug, e]))
  const emploie = (slug: string, table: string) => new RegExp(`useTable(?:<[^>]*>)?\\(\\s*['"\`]${table.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}['"\`]`, 'u').test(fichiers.get(slug) ?? '')
  const ecritQuelqueChose = (slug: string) => /\.(?:ajouter|modifier|supprimer)\s*\(/u.test(fichiers.get(slug) ?? '')
  const defauts: DefautPersistance[] = []
  for (const e of entites) {
    const t = nomTable(e)
    const livres = [...fichiers.keys()].map((s) => parSlug.get(s)).filter((p): p is PlanEcran => p !== undefined)
    // La gestion écrite par Deribfy (`GestionTable`) lit ET écrit sa table par construction ;
    // son fichier le dit : <GestionTable table="<table>" …>.
    const geree = livres.some((p) => p.gere !== undefined && (p.gere === e.name || p.gere === t) && new RegExp(`<GestionTable table=\\{?["']${t}["']`, 'u').test(fichiers.get(p.slug) ?? ''))
    const lue = geree || livres.some((p) => p.tables.lit.includes(t) && emploie(p.slug, t)) || livres.some((p) => p.tables.ecrit.includes(t) && emploie(p.slug, t))
    const ecrite = geree || livres.some((p) => p.tables.ecrit.includes(t) && emploie(p.slug, t) && ecritQuelqueChose(p.slug))
    if (!lue || !ecrite) defauts.push({ table: t, lue, ecrite })
  }
  return defauts
}

/** Exécute `taches` au plus `n` à la fois, dans l'ordre d'arrivée des résultats peu importe. */
export async function enParallele<T>(taches: readonly (() => Promise<T>)[], n: number): Promise<T[]> {
  const resultats: T[] = new Array<T>(taches.length)
  let suivant = 0
  const ouvrier = async () => {
    for (;;) {
      const i = suivant
      suivant += 1
      if (i >= taches.length) return
      resultats[i] = await taches[i]!()
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, taches.length)) }, ouvrier))
  return resultats
}

const fusionExecution = (accueil: VerdictExecution, gestion: VerdictExecution | null): VerdictExecution =>
  gestion === null || gestion.indisponible !== undefined
    ? accueil
    : {
        ...accueil,
        monteDansSimulateur: accueil.monteDansSimulateur && gestion.monteDansSimulateur,
        erreurs: [...accueil.erreurs, ...gestion.erreurs.map((e) => ({ ...e, quoi: `espace de gestion — ${e.quoi}` }))],
        ecransVisites: (accueil.ecransVisites ?? 0) + (gestion.ecransVisites ?? 0),
        ecransDecouverts: (accueil.ecransDecouverts ?? 0) + (gestion.ecransDecouverts ?? 0),
        ecransDistincts: (accueil.ecransDistincts ?? 0) + (gestion.ecransDistincts ?? 0),
        controlesMuets: [...(accueil.controlesMuets ?? []), ...(gestion.controlesMuets ?? [])],
        ecrans: [...(accueil.ecrans ?? []), ...(gestion.ecrans ?? [])],
        ms: accueil.ms + gestion.ms,
      }

export async function boucleEcrans(o: {
  readonly demande: string
  readonly configuration?: { readonly [cle: string]: unknown }
  readonly entites: readonly EntiteDeclaree[]
  readonly lecture: Lecture
  readonly nom: string
  readonly appelerEcran: AppelEcran
  readonly appelerLeger: AppelerLeger
  readonly parallelisme?: number
  readonly style?: string | null
  readonly juger?: typeof jugerExecution
  readonly jugerFaces?: typeof jugerFaces
}): Promise<ResultatEcrans> {
  const devise = typeof o.configuration?.currency === 'string' ? o.configuration.currency : undefined
  const juger = o.juger ?? jugerExecution

  // ── LE PLAN. Sans écran lu, une ligne par table (gestion) et un accueil : déterministe, et dit.
  const ecransLus = o.lecture.ecrans.length > 0 ? o.lecture.ecrans : ['accueil', ...o.entites.map((e) => nomTable(e))]
  const plan = await planifierEcrans(o.appelerLeger, { ecrans: ecransLus, roles: o.lecture.roles, parcours: o.lecture.parcours }, o.entites, o.demande)
  const planFinal: Plan = o.lecture.ecrans.length > 0 ? plan : { ...plan, refuses: [{ quoi: 'lecture', motif: 'aucun écran lu : un écran par table, en gestion, plus un accueil' }, ...plan.refuses] }

  // ── LES ÉCRANS, QUATRE À LA FOIS.
  // Les écrans de Deribfy (accueil, langue, gestion) ne partent PAS au modèle : ils sont écrits ici.
  const parDeribfy = (ecran: PlanEcran): EcranEcrit => ({ nom: ecran.nom, slug: ecran.slug, resultat: 'ok', fichier: sourceEcranDeribfy(ecran, planFinal, o.entites), tentatives: [], ms: 0, jetons: { entree: 0, sortie: 0, reflexion: 0 }, reproches: [], dernierTexte: null, origine: 'deribfy' })
  const ecrans = await enParallele(
    planFinal.ecrans.map((ecran) => async () => (ecran.origine === 'deribfy' ? parDeribfy(ecran) : ecrireEcran({ ecran, plan: planFinal, entites: o.entites, devise, nom: o.nom, roles: o.lecture.roles, style: o.style, appeler: o.appelerEcran, juger, contraintes: o.lecture.contraintes }))),
    o.parallelisme ?? PARALLELISME,
  )
  const tours: Tour[] = ecrans.flatMap((e) => e.tentatives.map((t) => ({ rang: t.rang, fichiers: 1, ok: t.reproches.length === 0, ...(t.reproches.length === 0 ? {} : { motif: `[${e.nom}] ${t.reproches.join('\n\n')}` }), ms: t.ms, tronquee: t.tronquee })))

  // ── L'ASSEMBLAGE : squelette + bibliothèque + écrans livrés, « à compléter » pour les autres.
  const bibliotheque = fichiersSysteme(devise)
  const carte = new Map<string, string>([...fichiersSquelette({ plan: planFinal, entites: o.entites, nom: o.nom, roles: o.lecture.roles, style: o.style, langues: o.lecture.contraintes?.langues }), ...bibliotheque])
  for (const e of ecrans) {
    const p = planFinal.ecrans.find((x) => x.slug === e.slug)
    if (p === undefined) continue
    carte.set(`ecrans/${e.slug}.tsx`, e.resultat === 'ok' && e.fichier !== null ? e.fichier : sourceACompleter(p, e.reproches))
  }
  carte.set('PERIMETRE.md', sourcePerimetre(planFinal, ecrans.map((e) => ({ nom: e.nom, slug: e.slug, resultat: e.resultat, reproches: e.reproches })), o.lecture.questionsOuvertes))
  const v = await assembler(carte)
  if (!v.ok) {
    return { ok: false, motif: `La construction a échoué :\n${v.erreur}`, tours, dernierTexte: '', ecrans, plan: planFinal }
  }

  // ── LES JUGES GLOBAUX, sur l'application entière.
  // Le juge d'exécution sur l'accueil porte aussi le JUGE D'EXPÉRIENCE de l'application
  // entière (3c-2) : dans le simulateur, faute de Chromium dans la fonction — la preuve,
  // elle, le rejoue dans Chromium sur la page servie.
  const langues = (o.lecture.contraintes?.langues ?? []).map((c) => ({ code: c, dir: (c === 'ar' || c === 'he' || c === 'fa' || c === 'ur' ? 'rtl' : 'ltr') as 'ltr' | 'rtl', libelles: [] }))
  const argsXp = { ecrans: planFinal.ecrans.map((x) => ({ nom: x.nom, slug: x.slug, role: x.role === ROLE_VISITEUR ? '' : x.role })), langues, parcours: planFinal.parcours ?? [], mode: 'application', attenteMs: ATTENTE_SIMULATEUR_MS, controlesMax: 300 }
  const accueil = await juger(v.code, { experience: { script: SCRIPT_EXPERIENCE, args: argsXp } })
  const gestion = planFinal.ecrans.some((e) => e.navigation === 'gestion') ? await juger(v.code, { adresse: ADRESSE_GESTION }) : null
  const execution = fusionExecution(accueil, gestion)
  const carteModele = new Map([...carte].filter(([c]) => !c.startsWith('systeme/') && c !== 'index.tsx'))
  const systeme = new Map([...carte].filter(([c]) => c.startsWith('systeme/')))
  const couverture = jugerCouverture(o.demande, carteModele, execution.ecrans ?? [])
  const persistance = persistanceStructurelle(planFinal, ecrans, o.entites)
  const faces: VerdictFaces | null = o.entites.length === 0 ? null : await (o.jugerFaces ?? jugerFaces)(v.code, o.entites)
  const fichiersOk = new Map([...carteModele].filter(([c]) => c.startsWith('ecrans/')))
  return {
    ok: true,
    code: v.code,
    fichiers: new Map([...carte].filter(([c]) => !c.startsWith('systeme/') || true)),
    tours,
    jetons: jugerJetons(fichiersOk, systeme),
    execution,
    vivacite: jugerVivacite(fichiersOk),
    couverture,
    faces,
    persistance,
    entites: o.entites,
    refusEntites: [],
    ecrans,
    plan: planFinal,
    experience: accueil.experience ?? null,
  }
}

export { ROLE_VISITEUR }
