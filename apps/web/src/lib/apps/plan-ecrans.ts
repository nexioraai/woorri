/**
 * LE PLAN D'ÉCRANS — ce que Deribfy tient AVANT d'écrire un seul écran (3c).
 *
 * ── POURQUOI UN PLAN, MESURÉ.
 *
 * La lecture du cahier (lire-brief) rend les écrans NOMMÉS (16 pour Hayine),
 * les rôles (4) et les tables (7). La génération, elle, ne recevait rien de
 * tout cela (`direct` passe demande + configuration + entités) et livrait
 * 1 à 4 écrans distincts, 7 tables ni lues ni écrites, une couverture de
 * 0,38 (`9cc16d10`, `e9e1803f`). Le plan relie chaque écran lu à son rôle,
 * ses tables (lues / écrites) et ce que le cahier en dit — puis chaque écran
 * est écrit SEUL, à partir de sa ligne du plan.
 *
 * ── RIEN N'ENTRE QUI NE VIENNE DE LA LECTURE (condition du propriétaire).
 *
 * `validerPlan` est PURE : un écran que la lecture n'a pas nommé est refusé ;
 * une table qui n'est pas une entité déclarée est refusée ; un rôle que la
 * lecture n'a pas vu devient `visiteur` et le refus est consigné ; un extrait
 * qui ne CITE pas le cahier est vidé. Les écrans lus que le modèle a omis
 * sont ajoutés avec une ligne minimale, et le refus le dit : ils finiront
 * probablement « à compléter », et c'est la vérité qu'on veut voir.
 */
import type { EntiteDeclaree } from './entites-declarees'
import { cle } from './lecture-brief'

export type Navigation = 'public' | 'gestion'

export type PlanEcran = {
  /** Le nom exact tel que la lecture l'a rendu. */
  readonly nom: string
  /** Déterministe depuis le nom ; unique dans le plan ; c'est le nom du fichier `ecrans/<slug>.tsx` et de l'adresse `#/<slug>`. */
  readonly slug: string
  /** Un rôle lu, ou `visiteur` (écran public). */
  readonly role: string
  readonly navigation: Navigation
  readonly tables: { readonly lit: readonly string[]; readonly ecrit: readonly string[] }
  /** Passages du cahier, RECOPIÉS (vérifié) — vide si le modèle n'a pas cité. */
  readonly extrait: string
  /**
   * `deribfy` : écrit par Deribfy, jamais par le modèle (3c-2, correction 2) —
   * l'accueil (depuis le plan), le choix de langue (depuis la lecture), la
   * gestion de chaque table (depuis les entités). Absent : écrit par le modèle.
   */
  readonly origine?: 'deribfy'
  /** Pour un écran de gestion écrit par Deribfy : la table qu'il gère. */
  readonly gere?: string
}

export type RefusPlan = { readonly quoi: string; readonly motif: string }
export type Plan = {
  readonly ecrans: readonly PlanEcran[]
  readonly refuses: readonly RefusPlan[]
  /** Le parcours principal, en slugs du plan, dans l'ordre (lu dans le cahier). */
  readonly parcours?: readonly string[]
}

/** Un rôle de GESTION lu : administrateur, gestionnaire, gérant, direction, responsable, propriétaire. */
export const ROLE_GESTION = /admin|gestion|g[ée]rant|direction|responsable|propri[ée]taire/iu
const EST_ACCUEIL = /^(accueil|home|page d.accueil)$/iu
const EST_LANGUE = /langue/iu

export const ROLE_VISITEUR = 'visiteur'
const EXTRAIT_MAX = 600
const BORNES = { ecrans: 60, tablesParEcran: 12 } as const

/** `démarrage/langue` → `demarrage-langue`. Déterministe, ASCII, jamais vide. */
export function slugDe(nom: string): string {
  const s = cle(nom).replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '')
  return s === '' ? 'ecran' : s
}

const aplati = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/gu, ' ').trim()

/** Ne garde de l'extrait que les phrases qui se LISENT dans le cahier. */
export function extraitCite(brut: unknown, cahier: string): string {
  if (typeof brut !== 'string') return ''
  const texte = aplati(cahier)
  const gardees: string[] = []
  for (const phrase of brut.replace(/\s+/gu, ' ').split(/(?<=[.!?…;])\s+/u)) {
    const p = phrase.trim()
    if (p.length < 12) continue
    if (texte.includes(aplati(p))) gardees.push(p)
  }
  return gardees.join(' ').slice(0, EXTRAIT_MAX)
}

const chaines = (brut: unknown, max: number): string[] =>
  Array.isArray(brut) ? brut.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()).slice(0, max) : []

/**
 * Compose le plan à partir de ce que le modèle a rendu (ou de rien), SANS
 * jamais laisser entrer un nom que la lecture ou les entités ne portent pas.
 */
export function validerPlan(
  brut: unknown,
  lecture: { readonly ecrans: readonly string[]; readonly roles: readonly string[]; readonly parcours?: readonly string[] },
  entites: readonly EntiteDeclaree[],
  cahier: string,
): Plan {
  const refuses: RefusPlan[] = []
  const rolesLus = new Map(lecture.roles.map((r) => [cle(r), r.trim()]))
  const tablesLues = new Map(entites.map((e) => [cle(e.name), e.name]))
  const ecransLus = lecture.ecrans.map((e) => e.trim()).filter((e) => e !== '').slice(0, BORNES.ecrans)

  const o = typeof brut === 'object' && brut !== null ? (brut as Record<string, unknown>) : null
  const proposes = Array.isArray(o?.ECRANS) ? (o.ECRANS as unknown[]) : []
  if (o === null || !Array.isArray(o.ECRANS)) refuses.push({ quoi: 'plan', motif: 'illisible : aucun tableau ECRANS — chaque écran lu part avec une ligne minimale' })

  const parNom = new Map<string, Record<string, unknown>>()
  for (const p of proposes) {
    if (typeof p !== 'object' || p === null) continue
    const e = p as Record<string, unknown>
    const nom = typeof e.nom === 'string' ? e.nom.trim() : ''
    if (nom === '') continue
    const k = cle(nom)
    if (!ecransLus.some((x) => cle(x) === k)) { refuses.push({ quoi: `écran « ${nom} »`, motif: 'hors lecture : la lecture du cahier ne nomme pas cet écran' }); continue }
    if (!parNom.has(k)) parNom.set(k, e)
  }

  const slugs = new Set<string>()
  const ecrans: PlanEcran[] = []
  for (const nom of ecransLus) {
    const e = parNom.get(cle(nom))
    let slug = slugDe(nom)
    for (let n = 2; slugs.has(slug); n += 1) slug = `${slugDe(nom)}-${String(n)}`
    slugs.add(slug)
    if (e === undefined) {
      refuses.push({ quoi: `écran « ${nom} »`, motif: 'non planifié par le modèle : ligne minimale (visiteur, public, sans table)' })
      ecrans.push({ nom, slug, role: ROLE_VISITEUR, navigation: 'public', tables: { lit: [], ecrit: [] }, extrait: '' })
      continue
    }
    // Le rôle : un rôle LU, ou visiteur.
    const roleBrut = typeof e.role === 'string' ? e.role.trim() : ''
    let role = ROLE_VISITEUR
    if (roleBrut !== '' && !/^(visiteur|public|anonyme|tous)$/iu.test(roleBrut)) {
      const lu = rolesLus.get(cle(roleBrut))
      if (lu === undefined) refuses.push({ quoi: `écran « ${nom} », rôle « ${roleBrut} »`, motif: 'hors lecture : rôle inconnu → visiteur' })
      else role = lu
    }
    // Les tables : des entités DÉCLARÉES, sinon rien.
    const tables = (quoi: 'lit' | 'ecrit'): string[] => {
      const res: string[] = []
      for (const t of chaines(e[quoi], BORNES.tablesParEcran)) {
        const connue = tablesLues.get(cle(t))
        if (connue === undefined) refuses.push({ quoi: `écran « ${nom} », table « ${t} »`, motif: `hors entités : aucune table déclarée de ce nom (${quoi})` })
        else if (!res.includes(connue)) res.push(connue)
      }
      return res
    }
    const lit = tables('lit')
    const ecrit = tables('ecrit')
    // La navigation : dite, sinon déduite du rôle.
    const navBrut = typeof e.navigation === 'string' ? e.navigation.trim().toLowerCase() : ''
    const navigation: Navigation = navBrut === 'gestion' || navBrut === 'public' ? navBrut : /admin|gestion|gerant|gérant|direction/iu.test(role) ? 'gestion' : 'public'
    if (navBrut !== '' && navBrut !== navigation) refuses.push({ quoi: `écran « ${nom} », navigation « ${navBrut} »`, motif: `inconnue → ${navigation}` })
    const extrait = extraitCite(e.extrait, cahier)
    if (typeof e.extrait === 'string' && e.extrait.trim() !== '' && extrait === '') refuses.push({ quoi: `écran « ${nom} », extrait`, motif: 'ne cite pas le cahier : vidé' })
    ecrans.push({ nom, slug, role, navigation, tables: { lit, ecrit: ecrit.filter((t) => t !== '') }, extrait })
  }
  return completerParConstruction({ ecrans, refuses }, lecture, entites, slugs)
}

/**
 * CE QUE DERIBFY ÉCRIT LUI-MÊME, PAR CONSTRUCTION (3c-2, correction 2).
 *
 * MESURÉ sur 94cf0489 : l'accueil « à compléter » (le propriétaire : « Accueil
 * mène à une page vide »), le choix de langue sans effet, et 3 tables sur 7
 * jamais écrites — aucun écran de gestion, aucun administrateur servi.
 *   · l'ACCUEIL : visiteur, écrit depuis le plan ; ajouté s'il manque ;
 *   · le CHOIX DE LANGUE : écrit depuis la lecture ;
 *   · la GESTION : pour chaque table qu'aucun écran de gestion n'écrit, un
 *     écran « gestion — <table> » (lister, ajouter, modifier, retirer), au
 *     rôle de gestion lu. Sans rôle de gestion lu, le premier rôle lu, et
 *     c'est consigné ; sans rôle du tout, visiteur, consigné aussi.
 */
function completerParConstruction(
  p: { ecrans: PlanEcran[]; refuses: RefusPlan[] },
  lecture: { readonly ecrans: readonly string[]; readonly roles: readonly string[]; readonly parcours?: readonly string[] },
  entites: readonly EntiteDeclaree[],
  slugs: Set<string>,
): Plan {
  const ecrans: PlanEcran[] = p.ecrans.map((e) =>
    EST_ACCUEIL.test(e.nom.trim()) ? { ...e, role: ROLE_VISITEUR, navigation: 'public' as const, tables: { lit: [], ecrit: [] }, origine: 'deribfy' as const }
      : EST_LANGUE.test(e.nom) ? { ...e, role: ROLE_VISITEUR, navigation: 'public' as const, tables: { lit: [], ecrit: [] }, origine: 'deribfy' as const }
        : e,
  )
  const refuses = [...p.refuses]
  if (!ecrans.some((e) => EST_ACCUEIL.test(e.nom.trim()))) {
    let slug = 'accueil'
    for (let n = 2; slugs.has(slug); n += 1) slug = `accueil-${String(n)}`
    slugs.add(slug)
    ecrans.unshift({ nom: 'accueil', slug, role: ROLE_VISITEUR, navigation: 'public', tables: { lit: [], ecrit: [] }, extrait: '', origine: 'deribfy' })
  }
  const roleGestion = lecture.roles.find((r) => ROLE_GESTION.test(r)) ?? lecture.roles[0] ?? ROLE_VISITEUR
  if (entites.length > 0 && !lecture.roles.some((r) => ROLE_GESTION.test(r))) {
    refuses.push({ quoi: 'gestion', motif: `aucun rôle de gestion lu : les écrans de gestion vont au rôle « ${roleGestion} »` })
  }
  for (const e of entites) {
    const t = e.name
    if (ecrans.some((x) => x.navigation === 'gestion' && x.tables.ecrit.includes(t))) continue
    let slug = `gestion-${slugDe(t)}`
    for (let n = 2; slugs.has(slug); n += 1) slug = `gestion-${slugDe(t)}-${String(n)}`
    slugs.add(slug)
    ecrans.push({ nom: `gestion — ${t}`, slug, role: roleGestion, navigation: 'gestion', tables: { lit: [t], ecrit: [t] }, extrait: '', origine: 'deribfy', gere: t })
  }
  const parSlugOuNom = (n: string) => ecrans.find((e) => cle(e.nom) === cle(n) || e.slug === slugDe(n))?.slug
  const parcours = [...new Set((lecture.parcours ?? []).map(parSlugOuNom).filter((s): s is string => s !== undefined))]
  return { ecrans, refuses, parcours }
}

/** La consigne du plan — courte : des listes fermées et une forme. */
export function consignePlan(
  lecture: { readonly ecrans: readonly string[]; readonly roles: readonly string[] },
  entites: readonly EntiteDeclaree[],
): string {
  return [
    'Tu lis un cahier des charges et tu rends UN PLAN D’ÉCRANS, en JSON strict, sans autre texte :',
    '{ "ECRANS": [ { "nom": "…", "role": "…", "navigation": "public" | "gestion", "lit": ["…"], "ecrit": ["…"], "extrait": "…" } ] }',
    '',
    'RÈGLES — des listes FERMÉES, tu n’inventes aucun nom :',
    `· nom : EXACTEMENT un de ces écrans, chacun une fois : ${lecture.ecrans.join(' · ')}.`,
    `· role : qui voit cet écran — un de : ${[...lecture.roles, ROLE_VISITEUR].join(' · ')} (visiteur = sans compte).`,
    '· navigation : "public" si on y arrive sans compte ou depuis la barre publique ; "gestion" si c’est un écran d’administration (espace de gestion).',
    `· lit / ecrit : les tables que cet écran AFFICHE / MODIFIE, parmi : ${entites.map((e) => e.name).join(' · ')}. Un écran sans table a des listes vides.`,
    '· extrait : les phrases du cahier qui parlent de CET écran, RECOPIÉES mot pour mot (600 signes au plus). Si le cahier n’en dit rien, "".',
    'Le texte peut être une tranche d’un document plus long : décris ce que tu vois.',
  ].join('\n')
}

/** Lit le JSON du modèle (premier `{` … dernier `}`) ; `null` si rien d'exploitable. */
export function lireJsonDuPlan(texte: string): unknown {
  const d = texte.indexOf('{')
  const f = texte.lastIndexOf('}')
  if (d === -1 || f <= d) return null
  try {
    return JSON.parse(texte.slice(d, f + 1)) as unknown
  } catch {
    return null
  }
}

/** Un appel LÉGER au modèle : la consigne, le texte, la réponse brute. Branché par la route (flash, réflexion coupée). */
export type AppelerLeger = (system: string, texte: string) => Promise<string>

export async function planifierEcrans(
  appeler: AppelerLeger,
  lecture: { readonly ecrans: readonly string[]; readonly roles: readonly string[]; readonly parcours?: readonly string[] },
  entites: readonly EntiteDeclaree[],
  cahier: string,
): Promise<Plan> {
  const texte = await appeler(consignePlan(lecture, entites), cahier)
  return validerPlan(lireJsonDuPlan(texte), lecture, entites, cahier)
}
