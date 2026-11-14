/**
 * V2 — LE GRAPHE DES ROUTES, DÉRIVÉ DE LA LECTURE, AVANT TOUT APPEL AU MODÈLE.
 *
 * Deribfy fixe la carte ; le modèle ne fera que remplir des écrans déjà placés.
 *   - une route par écran LU (nom du cahier → route courte, déterministe) ;
 *   - le socle : accueil, compte, et les trois sous-pages du compte (aide,
 *     contact, mentions légales) — un écran lu du même nom s'y fond ;
 *   - la tétrade de chaque table déclarée : liste, détail, créer, éditer
 *     (une table journal : liste et détail) — écrites par Deribfy, entières ;
 *   - le parcours lu, en routes ; la barre du bas (3 à 5 routes).
 * Puis le SQUELETTE DE SPEC : un écran par route, écrit par Deribfy, qui porte
 * déjà les entrées et les sorties du graphe. Le validateur couche 2 juge ce
 * squelette AVANT tout appel au modèle.
 *
 * Ce que V2 NE FIXE PAS, dit ici : le rôle de chaque écran lu (le plan du
 * modèle le choisit, en 3c) — dans le squelette, un écran lu est ouvert au
 * visiteur et ne lit aucune table ; le contenu de chaque écran lu.
 */
import { ROUTES_SOCLE } from './catalogue'
import type { Spec } from './catalogue'
import { COLONNE_SECRETE } from './validateur'
import type { Contexte, TableLue } from './validateur'

export type LectureGraphe = {
  readonly ecrans: readonly string[]
  readonly roles: readonly string[]
  readonly parcours?: readonly string[]
  readonly langues?: readonly string[]
  readonly devises?: readonly string[]
  readonly moyensPaiement?: readonly string[]
  readonly pays?: readonly string[]
}

export type RoutePlan = {
  readonly route: string
  readonly nom: string
  readonly origine: 'lecture' | 'socle' | 'tetrade' | 'gestion'
  readonly acces: string
  readonly tetrade?: { readonly table: string; readonly vue: 'liste' | 'detail' | 'creer' | 'editer' }
}

export type PlanGraphe = {
  readonly routes: readonly RoutePlan[]
  readonly parcours: readonly string[]
  readonly barre: readonly string[]
  readonly tables: readonly TableLue[]
  /** Les rôles lus, plus « Gestionnaire » quand aucun rôle lu ne gère. */
  readonly roles: readonly string[]
  readonly refus: readonly { readonly quoi: string; readonly motif: string }[]
}

/** Un nom du cahier → une route : minuscules ASCII et tirets. */
export function routeDe(nom: string): string {
  const s = nom.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '')
  return s === '' ? 'ecran' : s
}

/**
 * Le rôle de gestion : celui que la lecture nomme ainsi. Si aucun rôle lu ne le
 * dit, Deribfy CRÉE le rôle « Gestionnaire » et le consigne : la gestion des
 * tables ne retombe jamais sur un rôle de l'usager (pièces auto : « client »).
 */
export const ROLE_GESTIONNAIRE = 'Gestionnaire'
/** La route de l'espace de gestion : l'accueil y mène, elle mène aux tables. */
export const ROUTE_GESTION = 'gestion'
const ROLE_GESTION = /admin|gestion|g[ée]rant|direct|responsable|secr[ée]tariat|personnel/iu

const NOMS_SOCLE: Readonly<Record<string, string>> = { accueil: 'Accueil', compte: 'Compte', aide: 'Aide', contact: 'Contact', legal: 'Mentions légales' }

export function deriverPlan(l: LectureGraphe, tablesDeclarees: readonly TableLue[]): PlanGraphe {
  const refus: { quoi: string; motif: string }[] = []
  const routes: RoutePlan[] = []
  const vues = new Set<string>()
  const ajouter = (r: RoutePlan) => {
    let route = r.route
    for (let k = 2; vues.has(route); k += 1) route = `${r.route}-${String(k)}`
    if (route !== r.route) refus.push({ quoi: `route « ${r.route} »`, motif: `déjà prise : « ${r.nom} » devient « ${route} »` })
    vues.add(route)
    routes.push({ ...r, route })
  }
  // ── LE SOCLE, puis les écrans lus (un écran lu du nom d'une route du socle s'y fond).
  for (const r of ROUTES_SOCLE) ajouter({ route: r, nom: NOMS_SOCLE[r] ?? r, origine: 'socle', acces: 'visiteur' })
  const socle = new Set<string>(ROUTES_SOCLE)
  for (const nom of l.ecrans) {
    const r = routeDe(nom)
    if (socle.has(r)) { refus.push({ quoi: `écran lu « ${nom} »`, motif: `fondu dans la route « ${r} » du socle` }); continue }
    ajouter({ route: r, nom, origine: 'lecture', acces: 'visiteur' })
  }
  // ── LES TABLES : aucune colonne secrète n'entre dans un écran (la connexion la porte).
  const tables: TableLue[] = tablesDeclarees.map((t) => {
    const secretes = t.colonnes.filter((c) => COLONNE_SECRETE.test(c))
    if (secretes.length > 0) refus.push({ quoi: `table « ${t.nom} »`, motif: `colonne(s) secrète(s) ${secretes.join(', ')} retirée(s) des écrans : la connexion les porte (COLONNE_SECRETE)` })
    return { ...t, colonnes: t.colonnes.filter((c) => !COLONNE_SECRETE.test(c)) }
  })
  const lu = l.roles.find((r) => ROLE_GESTION.test(r))
  const gestion = lu ?? ROLE_GESTIONNAIRE
  const roles = lu !== undefined ? [...l.roles] : [...l.roles, ROLE_GESTIONNAIRE]
  if (lu === undefined) refus.push({ quoi: 'rôle de gestion', motif: `aucun rôle lu ne le dit : Deribfy crée le rôle « ${ROLE_GESTIONNAIRE} », qui gère les tables` })
  // ── LA GESTION : UNE entrée vers les tables (V4, bloc 3) — jamais une liste de tables à plat sur l'accueil.
  if (tables.length > 0) ajouter({ route: ROUTE_GESTION, nom: 'Gestion', origine: 'gestion', acces: gestion })
  for (const t of tables) {
    const lesVues = t.journal === true ? (['liste', 'detail'] as const) : (['liste', 'detail', 'creer', 'editer'] as const)
    for (const v of lesVues) ajouter({ route: `${routeDe(t.nom)}-${v}`, nom: `${t.nom} — ${v}`, origine: 'tetrade', acces: gestion, tetrade: { table: t.nom, vue: v } })
  }
  // ── LE PARCOURS LU, en routes ; un nom inconnu est consigné, pas inventé.
  const parcours: string[] = []
  for (const nom of l.parcours ?? []) {
    const r = routeDe(nom)
    if (vues.has(r)) parcours.push(r)
    else refus.push({ quoi: `parcours « ${nom} »`, motif: 'aucune route de ce nom' })
  }
  // ── LA BARRE : l'accueil, le premier écran du parcours, les écrans lus suivants, le compte (3 à 5).
  const lus = routes.filter((r) => r.origine === 'lecture').map((r) => r.route)
  const candidats = [...parcours.filter((r) => r !== 'accueil'), ...lus].filter((r, i, a) => a.indexOf(r) === i)
  const barre = ['accueil', ...candidats.slice(0, 3), 'compte']
  if (barre.length < 3) barre.splice(1, 0, 'aide')
  return { routes, parcours, barre, tables, roles, refus }
}

/** Le contexte de validation d'un plan : ses routes, ses rôles, ses tables, la lecture. */
export function contexteDuPlan(p: PlanGraphe, l: LectureGraphe): Contexte {
  return {
    routes: p.routes.filter((r) => r.origine !== 'tetrade').map((r) => r.route),
    roles: [...p.roles],
    tables: p.tables,
    langues: l.langues ?? [],
    devises: l.devises ?? [],
    moyensPaiement: l.moyensPaiement ?? [],
    pays: l.pays ?? [],
    parcours: p.parcours,
  }
}

type O = Record<string, unknown>
const d = (c: string) => ({ $data: c })
const nav = (route: string, avec?: string): O => ({ faire: 'navigate', route, ...(avec !== undefined ? { avec: d(avec) } : {}) })
const bouton = (libelle: string, effets: O[], genre = 'secondaire'): O => ({ composant: 'Bouton', libelle, effets, genre })
const lisible = (c: string) => c.replace(/_/gu, ' ').replace(/^./u, (x) => x.toUpperCase())

/** L'espace de gestion : une carte par table, vers sa liste. */
function ecranGestion(r: RoutePlan, listes: readonly RoutePlan[]): O {
  return { route: r.route, acces: r.acces, titre: 'Gestion', corps: [
    { composant: 'Titre', texte: 'Gestion', niveau: 'page' },
    { composant: 'Pile', espace: 's', enfants: listes.map((x) => ({ composant: 'Encart', effets: [nav(x.route)], enfants: [{ composant: 'Titre', texte: lisible(x.tetrade!.table), niveau: 'encart' }] })) },
    bouton('Accueil', [nav('accueil')], 'discret'),
  ] }
}

function ecranTetrade(r: RoutePlan, t: TableLue, journal: boolean): O {
  const base = routeDe(t.nom)
  const cols = t.colonnes
  const titre = `${lisible(t.nom)} — ${{ liste: 'liste', detail: 'détail', creer: 'nouveau', editer: 'modifier' }[r.tetrade!.vue]}`
  const commun = { route: r.route, acces: r.acces, titre, tetrade: r.tetrade }
  switch (r.tetrade!.vue) {
    case 'liste': return { ...commun, corps: [
      { composant: 'Lignes', donnee: d(`table.${t.nom}`), vide: 'Aucun enregistrement', modele: [
        { composant: 'Encart', effets: [nav(`${base}-detail`, 'ligne.id')], enfants: cols.map((c) => ({ composant: 'Valeur', libelle: lisible(c), donnee: d(`ligne.${c}`) })) },
      ] },
      ...(journal ? [] : [bouton('Ajouter', [nav(`${base}-creer`)], 'principal')]),
      bouton('Accueil', [nav('accueil')], 'discret'),
    ] }
    case 'detail': return { ...commun, corps: [
      ...cols.map((c) => ({ composant: 'Valeur', libelle: lisible(c), donnee: d(`ligne.${c}`) })),
      ...(journal ? [] : [
        bouton('Modifier', [nav(`${base}-editer`)]),
        bouton('Supprimer', [{ faire: 'submit', table: t.nom, ecriture: 'supprimer' }, nav(`${base}-liste`)], 'danger'),
      ]),
      bouton('Retour', [nav(`${base}-liste`)]),
    ] }
    case 'creer': return { ...commun, etat: cols.map((c) => ({ nom: c, nature: 'texte' })), corps: [
      ...cols.map((c) => ({ composant: 'Champ', libelle: lisible(c), donnee: d(`etat.${c}`), nature: 'texte' })),
      bouton('Enregistrer', [{ faire: 'submit', table: t.nom, ecriture: 'creer', valeurs: cols.map((c) => ({ champ: c, depuis: d(`etat.${c}`) })) }, nav(`${base}-liste`)], 'principal'),
      bouton('Retour', [nav(`${base}-liste`)]),
    ] }
    case 'editer': return { ...commun, corps: [
      ...cols.map((c) => ({ composant: 'Champ', libelle: lisible(c), donnee: d(`ligne.${c}`), nature: 'texte' })),
      bouton('Enregistrer', [{ faire: 'submit', table: t.nom, ecriture: 'modifier', valeurs: cols.map((c) => ({ champ: c, depuis: d(`ligne.${c}`) })) }, nav(`${base}-detail`)], 'principal'),
      bouton('Retour', [nav(`${base}-detail`)]),
    ] }
  }
}

/**
 * LE SQUELETTE DE SPEC : un écran par route, écrit par Deribfy. Les écrans
 * lus n'ont encore que leur titre et leurs passages (suite du parcours,
 * retour à l'accueil) : leur contenu viendra du modèle.
 */
export function squeletteDeSpec(p: PlanGraphe): Spec {
  const tables = new Map(p.tables.map((t) => [t.nom, t]))
  const lus = p.routes.filter((r) => r.origine === 'lecture')
  const listes = p.routes.filter((r) => r.tetrade?.vue === 'liste')
  const gestion = p.routes.find((r) => r.origine === 'gestion')
  const suivant = (route: string) => { const i = p.parcours.indexOf(route); return i >= 0 && i + 1 < p.parcours.length ? p.parcours[i + 1]! : null }
  const ecrans: O[] = p.routes.map((r): O => {
    if (r.tetrade !== undefined) { const t = tables.get(r.tetrade.table)!; return ecranTetrade(r, t, t.journal === true) }
    if (r.origine === 'gestion') return ecranGestion(r, listes)
    const s = suivant(r.route)
    switch (r.route) {
      case 'accueil': return { route: 'accueil', acces: 'visiteur', titre: 'Accueil', corps: [
        { composant: 'Pile', espace: 's', enfants: lus.map((x) => ({ composant: 'Encart', effets: [nav(x.route)], enfants: [{ composant: 'Phrase', texte: x.nom }] })) },
        ...(gestion !== undefined ? [{ composant: 'Encart', effets: [nav(gestion.route)], enfants: [{ composant: 'Titre', texte: 'Gestion', niveau: 'encart' }], pourRole: gestion.acces }] : []),
        ...(s !== null && !lus.some((x) => x.route === s) ? [bouton('Commencer', [nav(s)], 'principal')] : []),
      ] }
      case 'compte': return { route: 'compte', acces: 'visiteur', titre: 'Compte', corps: [
        bouton('Aide', [nav('aide')]), bouton('Contact', [nav('contact')]), bouton('Mentions légales', [nav('legal')]),
        bouton('Se déconnecter', [{ faire: 'emit', evenement: 'deconnexion' }, nav('accueil')], 'danger'),
      ] }
      case 'aide': case 'contact': case 'legal': return { route: r.route, acces: 'visiteur', titre: r.nom, corps: [
        { composant: 'Titre', texte: r.nom, niveau: 'page' }, bouton('Retour au compte', [nav('compte')]),
        ...(s !== null ? [bouton('Continuer', [nav(s)], 'principal')] : []),
      ] }
      default: return { route: r.route, acces: r.acces, titre: r.nom, corps: [
        { composant: 'Titre', texte: r.nom, niveau: 'page' },
        ...(s !== null ? [bouton('Continuer', [nav(s)], 'principal')] : []),
        bouton('Accueil', [nav('accueil')], 'discret'),
      ] }
    }
  })
  return { ecrans: ecrans as Spec['ecrans'], barre: [...p.barre] }
}

/** Les deux mesures de la preuve V2, sur un plan et son squelette. */
export function mesurerPlan(p: PlanGraphe, s: Spec): { tables: number; tablesCompletes: number; routes: number; routesCouvertes: number } {
  const ecrans = s.ecrans as unknown as O[]
  const routesEcrites = new Set(ecrans.map((e) => String(e.route)))
  const vuesPar = (t: string) => new Set(ecrans.filter((e) => (e.tetrade as O | undefined)?.table === t).map((e) => String((e.tetrade as O).vue)))
  const tablesCompletes = p.tables.filter((t) => vuesPar(t.nom).size === (t.journal === true ? 2 : 4)).length
  return { tables: p.tables.length, tablesCompletes, routes: p.routes.length, routesCouvertes: p.routes.filter((r) => routesEcrites.has(r.route)).length }
}
