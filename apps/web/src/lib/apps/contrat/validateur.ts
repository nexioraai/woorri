/**
 * LE VALIDATEUR DU CONTRAT — couches 1 et 2, en millisecondes, sans appel.
 *
 *   COUCHE 1 — le SCHÉMA : la forme seule, contre le catalogue. Chaque faute
 *     reçoit une CLASSE nommée et le nom valide le plus proche. Le schéma Zod
 *     dérivé du même catalogue tourne à côté : les deux doivent toujours
 *     s'accorder (un cliquet le vérifie sur chaque spec de preuve).
 *   COUCHE 2 — le CONTEXTE lu (tables, colonnes, rôles, langues, devises,
 *     moyens de paiement, pays) puis le GRAPHE (chaque route a un écran,
 *     chaque table sa tétrade, chaque écran une entrée et une sortie, le
 *     compte et ses pages, la barre du bas, le parcours).
 *
 * Du moins cher au plus cher : par défaut on s'arrête à la première couche
 * qui refuse (une forme fausse rend le reste illisible). `complet: true`
 * fait tourner les deux, pour le diagnostic.
 *
 * Ce que ce validateur NE PEUT PAS voir, et qui reste aux couches 3 à 5 :
 * un bouton dont l'effet dépend d'une condition à l'exécution (la recherche
 * de 94cf0489 ne faisait rien champs vides), un rendu illisible, un
 * débordement, un contraste. Il juge des règles, pas un écran.
 */
import {
  ACTIONS, CHAMPS_DE_CHARGE, CHARGES, COMPOSANTS, EVENEMENTS, FAIRE, ICONES, JETONS, MOTIF, NATURES_ETAT, PROPS_COMMUNES, PROPS_ECRAN,
  PROPS_SPEC, ROUTES_SOCLE, SOURCES, SchemaFragment, SchemaSpec, VUES_TETRADE, chargeConforme, type DefProp, type Genre,
} from './catalogue'
import { textesDe } from './textes'
import { horsLecture, languesPermises, type Lecture } from './contraintes'
import { lePlusProche, normaliser } from './proche'

export const CLASSES = {
  // ── couche 1 : la forme
  TYPE_INVALIDE: 1, PROP_INCONNUE: 1, ATTRIBUT_DOM: 1, PROP_MANQUANTE: 1, COMPOSANT_INCONNU: 1, FORMULAIRE_NATIF: 1,
  VARIANTE_INCONNUE: 1, JETON_INCONNU: 1, ICONE_INCONNUE: 1, LIAISON_HORS_CONTRAT: 1,
  ACTION_INCONNUE: 1, ACTION_MANQUANTE: 1, EVENEMENT_INCONNU: 1, VALEUR_INVALIDE: 1, HTML_DANS_TEXTE: 1, CHARGE_INVALIDE: 1,
  // ── couche 2 : le contexte lu
  TABLE_INCONNUE: 2, CHAMP_INCONNU: 2, ROLE_INCONNU: 2, LANGUE_HORS_LECTURE: 2, DEVISE_HORS_LECTURE: 2,
  PAIEMENT_HORS_LECTURE: 2, PAYS_HORS_LECTURE: 2, TRADUCTION_MANQUANTE: 2, ETAT_INCONNU: 2, ECRITURE_HORS_ETAT: 2,
  ACTION_SANS_EFFET: 2, CHAMP_SANS_EFFET: 2, LIAISON_HORS_PORTEE: 2,
  // ── couche 2 : quatre défauts du jeu aveugle (A1) qui reviennent au contrat
  COLONNE_SECRETE: 2, DONNEE_PRIVEE_EXPOSEE: 2, SUBMIT_SANS_LIGNE: 2, MENTION_DEMO: 2, MONTANT_EN_DUR: 2,
  // ── couche 2 : le graphe
  ROUTE_SANS_ECRAN: 2, ROUTE_DOUBLE: 2, ROUTE_HORS_PLAN: 2, ECRAN_SANS_ENTREE: 2, ECRAN_SANS_SORTIE: 2,
  TETRADE_INCOMPLETE: 2, COMPTE_INCOMPLET: 2, BARRE_HORS_BORNES: 2, PARCOURS_ROMPU: 2,
} as const
export type Classe = keyof typeof CLASSES

export type Refus = {
  readonly classe: Classe
  readonly couche: 1 | 2
  readonly chemin: string
  readonly quoi: string
  readonly proche: string | null
}

/**
 * Une table telle que la lecture la déclare. `publique` vient de
 * `lecturePublique` (entites-declarees) : ABSENT ⇒ PRIVÉE, l'oubli va vers le sûr.
 */
export type TableLue = { readonly nom: string; readonly colonnes: readonly string[]; readonly journal?: boolean; readonly publique?: boolean }
export type Contexte = Lecture & {
  readonly routes: readonly string[]
  readonly roles: readonly string[]
  readonly tables: readonly TableLue[]
  readonly parcours?: readonly string[]
}

export type Verdict = {
  readonly ok: boolean
  readonly refus: readonly Refus[]
  /** Le schéma Zod, dérivé du même catalogue : il doit refuser exactement quand la couche 1 refuse. */
  readonly zodOk: boolean
  /** La couche qui a refusé la première, ou null. */
  readonly couche: 1 | 2 | null
}

/**
 * Les attributs DOM, gestionnaires d'événements et propriétés CSS qu'un
 * modèle écrit par habitude. Les trouver dans une spec, c'est le web qui
 * fuit dans le contrat — classe ATTRIBUT_DOM, plus parlante que PROP_INCONNUE.
 */
const ATTRIBUTS_DOM = new Set([
  'className', 'class', 'style', 'id', 'href', 'src', 'alt', 'title', 'htmlFor', 'for', 'tabIndex', 'role', 'type', 'name',
  'value', 'placeholder', 'disabled', 'checked', 'hidden', 'dir', 'lang', 'key', 'ref', 'children', 'action', 'method', 'target',
  'width', 'height', 'padding', 'margin', 'color', 'background', 'backgroundColor', 'fontSize', 'fontWeight', 'display', 'flex',
  'flexDirection', 'gap', 'border', 'borderRadius', 'textAlign', 'left', 'right', 'top', 'bottom', 'justifyContent', 'alignItems',
  'label', 'variant', 'size', 'icon', 'text', 'content', 'data', 'props', 'sx', 'testID',
])
const estAttributDom = (k: string) => ATTRIBUTS_DOM.has(k) || /^on[A-Z]/u.test(k) || /^(aria|data)-/u.test(k)
const DOM_VERS: Readonly<Record<string, string>> = {
  onClick: 'effets', onPress: 'effets', onSubmit: 'effets', action: 'effets', children: 'enfants', role: 'acces', title: 'titre',
  label: 'libelle', value: 'valeur', name: 'nom', type: 'nature', text: 'texte', content: 'texte', icon: 'icone', variant: 'genre',
  data: 'donnee', color: 'couleur', background: 'fond', backgroundColor: 'fond', gap: 'espace', padding: 'espace', margin: 'espace',
  borderRadius: 'rayon', fontSize: 'taille', flexDirection: 'sens', alignItems: 'aligner', textAlign: 'aligner',
}

const LONGUEUR_LIAISON: Readonly<Record<string, number>> = { table: 1, ligne: 1, parcours: 2, etat: 1, session: 1 }
const SESSION = ['role', 'utilisateur']

/** La portée d'un modèle de Lignes dont la table est inconnue (déjà refusée). */
const INCONNUE = '\u0000inconnue'
const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const dire = (x: unknown) => (typeof x === 'string' ? `« ${x} »` : JSON.stringify(x)?.slice(0, 60) ?? String(x))
const slug = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '')

// ════════════════════════════════════════════════════════════════════════
// COUCHE 1 — LA FORME
// ════════════════════════════════════════════════════════════════════════
class Collecte {
  readonly refus: Refus[] = []
  private vus = new Set<string>()
  noter(classe: Classe, chemin: string, quoi: string, proche: string | null = null) {
    const k = `${classe}|${chemin}|${quoi}`
    if (this.vus.has(k)) return
    this.vus.add(k)
    this.refus.push({ classe, couche: CLASSES[classe], chemin, quoi, proche })
  }
}

function cles(c: Collecte, x: Record<string, unknown>, chemin: string, permis: readonly string[], requis: readonly string[], ou: string): boolean {
  let ok = true
  for (const k of Object.keys(x)) {
    if (permis.includes(k)) continue
    ok = false
    if (estAttributDom(k)) c.noter('ATTRIBUT_DOM', `${chemin}.${k}`, `${dire(k)} est un attribut du web, pas une prop du contrat (${ou})`, DOM_VERS[k] && permis.includes(DOM_VERS[k]) ? DOM_VERS[k] : lePlusProche(k, permis))
    else c.noter('PROP_INCONNUE', `${chemin}.${k}`, `${dire(k)} n’existe pas dans ${ou}`, lePlusProche(k, permis))
  }
  for (const k of requis) {
    if (k in x) continue
    ok = false
    c.noter('PROP_MANQUANTE', `${chemin}.${k}`, `${ou} exige ${dire(k)}`, null)
  }
  return ok
}

function texte(c: Collecte, x: unknown, chemin: string) {
  if (typeof x === 'string') {
    if (/<\/?[a-zA-Z!]/u.test(x)) c.noter('HTML_DANS_TEXTE', chemin, `${dire(x.slice(0, 40))} : du HTML dans un texte`, null)
    else if (!MOTIF.texte.test(x)) c.noter('VALEUR_INVALIDE', chemin, 'un texte non vide, sans chevrons, 600 signes au plus', null)
    return
  }
  // La clé d'un texte est à Deribfy : le modèle n'en écrit jamais.
  if (estObjet(x) && '$t' in x) { c.noter('TYPE_INVALIDE', chemin, 'un texte s’écrit en clair, dans la langue principale : la clé est fabriquée par Deribfy', null); return }
  c.noter('TYPE_INVALIDE', chemin, `un texte s’écrit en clair, pas ${dire(x)}`, null)
}

function liaison(c: Collecte, x: unknown, chemin: string) {
  if (!estObjet(x)) { c.noter('TYPE_INVALIDE', chemin, `une donnée s’écrit { "$data": "<source>.<…>" }, pas ${dire(x)}`, null); return }
  if (!cles(c, x, chemin, ['$data'], ['$data'], 'une liaison')) return
  const v = x.$data
  if (typeof v !== 'string') { c.noter('TYPE_INVALIDE', `${chemin}.$data`, 'le chemin est une chaîne', null); return }
  const [source = '', ...reste] = v.split('.')
  if (!(source in SOURCES)) { c.noter('LIAISON_HORS_CONTRAT', `${chemin}.$data`, `${dire(v)} : « ${source} » n’est pas une source du contrat`, lePlusProche(source, Object.keys(SOURCES))); return }
  if (!MOTIF.liaison.test(v) || reste.length !== LONGUEUR_LIAISON[source] || (source === 'session' && !SESSION.includes(reste[0]!))) {
    c.noter('LIAISON_HORS_CONTRAT', `${chemin}.$data`, `${dire(v)} : ${SOURCES[source as keyof typeof SOURCES]}`, null)
  }
}

function litteral(c: Collecte, x: unknown, chemin: string) {
  if (typeof x === 'number' || typeof x === 'boolean' || x === null) return
  if (typeof x === 'string') { if (!MOTIF.litteral.test(x)) c.noter('VALEUR_INVALIDE', chemin, `${dire(x)} : une valeur courte, sans balise`, null); return }
  c.noter('TYPE_INVALIDE', chemin, `une valeur simple attendue, pas ${dire(x)}`, null)
}

function genre(c: Collecte, g: Genre, x: unknown, chemin: string, prop: string) {
  switch (g.g) {
    case 'texte': return texte(c, x, chemin)
    case 'liaison': return liaison(c, x, chemin)
    case 'jeton': {
      const connus = JETONS[g.jeu] as readonly string[]
      if (typeof x !== 'string') return c.noter('TYPE_INVALIDE', chemin, `un jeton ${g.jeu} est un nom`, null)
      if (!connus.includes(x)) c.noter('JETON_INCONNU', chemin, `${dire(x)} n’est pas un jeton ${g.jeu} (${connus.join(', ')})`, lePlusProche(x, connus))
      return
    }
    case 'variante':
      if (typeof x !== 'string') return c.noter('TYPE_INVALIDE', chemin, `${prop} est un nom`, null)
      if (!g.valeurs.includes(x)) c.noter('VARIANTE_INCONNUE', chemin, `${dire(x)} n’est pas une valeur de ${prop} (${g.valeurs.join(', ')})`, lePlusProche(x, g.valeurs))
      return
    case 'icone':
      if (typeof x !== 'string') return c.noter('TYPE_INVALIDE', chemin, 'une icône est un nom', null)
      if (!(ICONES as readonly string[]).includes(x)) c.noter('ICONE_INCONNUE', chemin, `${dire(x)} n’est pas une icône du catalogue`, lePlusProche(x, ICONES))
      return
    case 'booleen':
      if (typeof x !== 'boolean') c.noter('TYPE_INVALIDE', chemin, `${prop} vaut true ou false`, null)
      return
    case 'enfants':
      if (!Array.isArray(x)) return c.noter('TYPE_INVALIDE', chemin, `${prop} est une liste de composants`, null)
      x.forEach((n, i) => { noeud(c, n, `${chemin}[${String(i)}]`) })
      return
    case 'effets':
      if (!Array.isArray(x)) return c.noter('TYPE_INVALIDE', chemin, 'effets est une liste d’actions', null)
      if (x.length === 0) return c.noter('ACTION_MANQUANTE', chemin, 'une commande sans effet : au moins une action', null)
      x.forEach((a, i) => { action(c, a, `${chemin}[${String(i)}]`) })
      return
    case 'choix':
      if (!Array.isArray(x)) return c.noter('TYPE_INVALIDE', chemin, 'choix est une liste', null)
      if (x.length === 0) return c.noter('VALEUR_INVALIDE', chemin, 'choix vide', null)
      x.forEach((o, i) => {
        const ch = `${chemin}[${String(i)}]`
        if (!estObjet(o)) return c.noter('TYPE_INVALIDE', ch, '{ valeur, libelle } attendu', null)
        if (!cles(c, o, ch, ['valeur', 'libelle'], ['valeur', 'libelle'], 'un choix')) return
        if (typeof o.valeur !== 'string') c.noter('TYPE_INVALIDE', `${ch}.valeur`, 'une valeur courte', null)
        else litteral(c, o.valeur, `${ch}.valeur`)
        texte(c, o.libelle, `${ch}.libelle`)
      })
      return
    case 'filtres':
    case 'ecritures': {
      if (!Array.isArray(x)) return c.noter('TYPE_INVALIDE', chemin, `${prop} est une liste`, null)
      const seconde = g.g === 'filtres' ? 'egal' : 'depuis'
      x.forEach((o, i) => {
        const ch = `${chemin}[${String(i)}]`
        if (!estObjet(o)) return c.noter('TYPE_INVALIDE', ch, `{ champ, ${seconde} } attendu`, null)
        if (!cles(c, o, ch, ['champ', seconde], ['champ', seconde], g.g === 'filtres' ? 'un filtre' : 'une écriture')) return
        if (typeof o.champ !== 'string' || !MOTIF.identifiant.test(o.champ)) c.noter('VALEUR_INVALIDE', `${ch}.champ`, `${dire(o.champ)} n’est pas un nom de colonne`, null)
        if (g.g === 'filtres') liaison(c, o.egal, `${ch}.egal`)
        else if (estObjet(o.depuis)) liaison(c, o.depuis, `${ch}.depuis`)
        else litteral(c, o.depuis, `${ch}.depuis`)
      })
      return
    }
    case 'route':
      if (typeof x !== 'string') return c.noter('TYPE_INVALIDE', chemin, 'une route est un nom court', null)
      if (!MOTIF.route.test(x)) c.noter('VALEUR_INVALIDE', chemin, `${dire(x)} n’est pas une route (minuscules et tirets)`, slug(x) || null)
      return
    case 'table':
      if (typeof x !== 'string' || !MOTIF.identifiant.test(x)) c.noter('VALEUR_INVALIDE', chemin, `${dire(x)} n’est pas un nom de table`, null)
      return
    case 'chemin':
      if (typeof x !== 'string') return c.noter('TYPE_INVALIDE', chemin, 'un chemin est une chaîne', null)
      liaison(c, { $data: x }, chemin)
      return
    case 'donneeOuValeur':
      if (estObjet(x)) return liaison(c, x, chemin)
      return litteral(c, x, chemin)
    case 'codeLangue':
      if (typeof x !== 'string' || !MOTIF.langue.test(x)) c.noter('VALEUR_INVALIDE', chemin, `${dire(x)} n’est pas un code de langue`, null)
      return
    case 'charge':
      if (!Array.isArray(x)) return c.noter('TYPE_INVALIDE', chemin, 'une charge est une liste de { champ, depuis }', null)
      x.forEach((o, i) => {
        const ch = `${chemin}[${String(i)}]`
        if (!estObjet(o)) return c.noter('TYPE_INVALIDE', ch, '{ champ, depuis } attendu', null)
        if (!cles(c, o, ch, ['champ', 'depuis'], ['champ', 'depuis'], 'un champ de charge')) return
        if (typeof o.champ !== 'string' || !CHAMPS_DE_CHARGE.includes(o.champ)) c.noter('CHARGE_INVALIDE', `${ch}.champ`, `${dire(o.champ)} n’est pas un champ de charge (${CHAMPS_DE_CHARGE.join(', ')})`, typeof o.champ === 'string' ? lePlusProche(o.champ, CHAMPS_DE_CHARGE) : null)
        liaison(c, o.depuis, `${ch}.depuis`)
      })
      return
  }
}

function action(c: Collecte, x: unknown, chemin: string) {
  if (!estObjet(x)) return c.noter('TYPE_INVALIDE', chemin, `une action est un objet { "faire": … }, pas ${dire(x)}`, null)
  if (!('faire' in x)) return c.noter('PROP_MANQUANTE', `${chemin}.faire`, 'une action dit ce qu’elle fait : « faire »', null)
  const f = x.faire
  if (typeof f !== 'string' || !(FAIRE as string[]).includes(f)) {
    return c.noter('ACTION_INCONNUE', `${chemin}.faire`, `${dire(f)} n’est pas une action (${FAIRE.join(', ')})`, typeof f === 'string' ? lePlusProche(f, FAIRE) : null)
  }
  const args = ACTIONS[f as keyof typeof ACTIONS].args as Readonly<Record<string, DefProp>>
  const permis = ['faire', ...Object.keys(args)]
  cles(c, x, chemin, permis, Object.entries(args).filter(([, d]) => d.requis).map(([k]) => k), `l’action ${f}`)
  for (const [arg, d] of Object.entries(args)) {
    if (!(arg in x)) continue
    if (f === 'emit' && arg === 'evenement') {
      if (typeof x.evenement !== 'string' || !(EVENEMENTS as readonly string[]).includes(x.evenement)) {
        c.noter('EVENEMENT_INCONNU', `${chemin}.evenement`, `${dire(x.evenement)} n’est pas un événement du squelette (${EVENEMENTS.join(', ')})`, typeof x.evenement === 'string' ? lePlusProche(x.evenement, EVENEMENTS) : null)
      }
      continue
    }
    genre(c, d.genre, x[arg], `${chemin}.${arg}`, arg)
  }
  if (f === 'emit' && x.evenement === 'choisirLangue' && !('valeur' in x)) c.noter('PROP_MANQUANTE', `${chemin}.valeur`, 'choisirLangue dit laquelle : « valeur » (un code de langue lue)', null)
  if (f === 'emit' && typeof x.evenement === 'string' && (EVENEMENTS as readonly string[]).includes(x.evenement)) {
    const charge = Array.isArray(x.charge) ? x.charge.filter(estObjet).map((o) => ({ champ: String(o.champ) })) : undefined
    if ((x.charge === undefined || Array.isArray(x.charge)) && !chargeConforme(x.evenement, charge)) {
      const attendu = Object.entries(CHARGES[x.evenement] ?? {}).map(([k, r]) => `${k}${r === 'requis' ? '' : ' (facultatif)'}`)
      c.noter('CHARGE_INVALIDE', `${chemin}.charge`, `${x.evenement} porte ${attendu.length > 0 ? `exactement : ${attendu.join(', ')}` : 'aucune charge'}`, null)
    }
  }
}

const FORMULAIRE = /^(form|formulaire|formular|<form>?)$/iu

function noeud(c: Collecte, x: unknown, chemin: string) {
  if (!estObjet(x)) return c.noter('TYPE_INVALIDE', chemin, `un composant est un objet { "composant": … }, pas ${dire(x)}`, null)
  if (!('composant' in x)) return c.noter('PROP_MANQUANTE', `${chemin}.composant`, 'un composant se nomme : « composant »', null)
  const nom = x.composant
  if (typeof nom !== 'string') return c.noter('TYPE_INVALIDE', `${chemin}.composant`, 'le nom d’un composant est une chaîne', null)
  // Un composant refusé ne cache pas ses enfants : mesuré (A1, écran 20), le Bouton
  // « libellé » d'un formulaire refusé n'était jamais jugé.
  const enfantsDuRefuse = () => { if (Array.isArray(x.enfants)) x.enfants.forEach((n, i) => { noeud(c, n, `${chemin}.enfants[${String(i)}]`) }) }
  if (FORMULAIRE.test(nom)) {
    c.noter('FORMULAIRE_NATIF', `${chemin}.composant`, `${dire(nom)} : aucun formulaire natif — l’aperçu bloque leur envoi ; on écrit avec un Bouton dont l’effet est submit`, 'Bouton')
    return enfantsDuRefuse()
  }
  const def = COMPOSANTS[nom]
  if (def === undefined) {
    c.noter('COMPOSANT_INCONNU', `${chemin}.composant`, `${dire(nom)} n’est pas un composant du catalogue`, nom.startsWith('#') ? null : lePlusProche(nom, Object.keys(COMPOSANTS)))
    return enfantsDuRefuse()
  }
  const props = { ...def.props, ...PROPS_COMMUNES }
  const requis = Object.entries(props).filter(([k, d]) => d.requis && !(nom === 'Bouton' && k === 'effets')).map(([k]) => k)
  cles(c, x, chemin, ['composant', ...Object.keys(props)], requis, nom)
  if (nom === 'Bouton' && !('effets' in x)) c.noter('ACTION_MANQUANTE', `${chemin}.effets`, 'un Bouton sans effet : au moins une action', null)
  for (const [prop, d] of Object.entries(props)) if (prop in x) genre(c, d.genre, x[prop], `${chemin}.${prop}`, prop)
}

function ecran(c: Collecte, x: unknown, chemin: string) {
  if (!estObjet(x)) return c.noter('TYPE_INVALIDE', chemin, 'un écran est un objet', null)
  cles(c, x, chemin, Object.keys(PROPS_ECRAN), ['route', 'acces', 'titre', 'corps'], 'un écran')
  if ('route' in x) genre(c, { g: 'route' }, x.route, `${chemin}.route`, 'route')
  if ('acces' in x && (typeof x.acces !== 'string' || !MOTIF.role.test(x.acces))) c.noter('VALEUR_INVALIDE', `${chemin}.acces`, `${dire(x.acces)} n’est pas un rôle`, null)
  if ('titre' in x) texte(c, x.titre, `${chemin}.titre`)
  if ('tetrade' in x) {
    const t = x.tetrade
    if (!estObjet(t)) c.noter('TYPE_INVALIDE', `${chemin}.tetrade`, '{ table, vue } attendu', null)
    else if (cles(c, t, `${chemin}.tetrade`, ['table', 'vue'], ['table', 'vue'], 'une tétrade')) {
      genre(c, { g: 'table' }, t.table, `${chemin}.tetrade.table`, 'table')
      if (typeof t.vue !== 'string' || !(VUES_TETRADE as readonly string[]).includes(t.vue)) c.noter('VALEUR_INVALIDE', `${chemin}.tetrade.vue`, `${dire(t.vue)} n’est pas une vue (${VUES_TETRADE.join(', ')})`, typeof t.vue === 'string' ? lePlusProche(t.vue, VUES_TETRADE) : null)
    }
  }
  if ('etat' in x) {
    if (!Array.isArray(x.etat)) c.noter('TYPE_INVALIDE', `${chemin}.etat`, 'etat est une liste', null)
    else x.etat.forEach((e, i) => {
      const ch = `${chemin}.etat[${String(i)}]`
      if (!estObjet(e)) return c.noter('TYPE_INVALIDE', ch, '{ nom, nature } attendu', null)
      if (!cles(c, e, ch, ['nom', 'nature', 'initial'], ['nom', 'nature'], 'une valeur d’état')) return
      if (typeof e.nom !== 'string' || !MOTIF.identifiant.test(e.nom)) c.noter('VALEUR_INVALIDE', `${ch}.nom`, `${dire(e.nom)} n’est pas un nom`, null)
      if (typeof e.nature !== 'string' || !(NATURES_ETAT as readonly string[]).includes(e.nature)) c.noter('VALEUR_INVALIDE', `${ch}.nature`, `${dire(e.nature)} (${NATURES_ETAT.join(', ')})`, typeof e.nature === 'string' ? lePlusProche(e.nature, NATURES_ETAT) : null)
      if ('initial' in e) litteral(c, e.initial, `${ch}.initial`)
    })
  }
  if ('corps' in x) {
    if (!Array.isArray(x.corps)) c.noter('TYPE_INVALIDE', `${chemin}.corps`, 'corps est une liste de composants', null)
    else if (x.corps.length === 0) c.noter('VALEUR_INVALIDE', `${chemin}.corps`, 'un écran vide', null)
    else x.corps.forEach((n, i) => { noeud(c, n, `${chemin}.corps[${String(i)}]`) })
  }
}

function traductions(c: Collecte, x: unknown, chemin: string) {
  if (!Array.isArray(x)) return c.noter('TYPE_INVALIDE', chemin, 'traductions est une liste', null)
  x.forEach((t, i) => {
    const ch = `${chemin}[${String(i)}]`
    if (!estObjet(t)) return c.noter('TYPE_INVALIDE', ch, '{ langue, textes } attendu', null)
    if (!cles(c, t, ch, ['langue', 'textes'], ['langue', 'textes'], 'une traduction')) return
    genre(c, { g: 'codeLangue' }, t.langue, `${ch}.langue`, 'langue')
    if (!Array.isArray(t.textes)) return c.noter('TYPE_INVALIDE', `${ch}.textes`, 'textes est une liste', null)
    t.textes.forEach((e, j) => {
      const cj = `${ch}.textes[${String(j)}]`
      if (!estObjet(e)) return c.noter('TYPE_INVALIDE', cj, '{ cle, texte } attendu', null)
      if (!cles(c, e, cj, ['cle', 'texte'], ['cle', 'texte'], 'un texte traduit')) return
      // Les clés des traductions sont FABRIQUÉES par Deribfy ; une clé hors grammaire est une erreur de Deribfy.
      if (typeof e.cle !== 'string' || !MOTIF.cle.test(e.cle)) c.noter('VALEUR_INVALIDE', `${cj}.cle`, `${dire(e.cle)} n’est pas une clé fabriquée par Deribfy`, null)
      if (typeof e.texte !== 'string') c.noter('TYPE_INVALIDE', `${cj}.texte`, 'un texte est une chaîne', null)
      else if (/<\/?[a-zA-Z!]/u.test(e.texte)) c.noter('HTML_DANS_TEXTE', `${cj}.texte`, `${dire(e.texte.slice(0, 40))} : du HTML dans un texte`, null)
      else if (!MOTIF.traduction.test(e.texte)) c.noter('VALEUR_INVALIDE', `${cj}.texte`, 'un texte sans chevrons, 600 signes au plus', null)
    })
  })
}

function coucheUn(brut: unknown, forme: 'spec' | 'fragment'): Refus[] {
  const c = new Collecte()
  if (!estObjet(brut)) { c.noter('TYPE_INVALIDE', '', 'la spec est un objet JSON', null); return c.refus }
  if (forme === 'spec') {
    cles(c, brut, '', Object.keys(PROPS_SPEC), ['ecrans', 'barre'], 'la spec')
    if ('ecrans' in brut) {
      if (!Array.isArray(brut.ecrans)) c.noter('TYPE_INVALIDE', 'ecrans', 'ecrans est une liste', null)
      else if (brut.ecrans.length === 0) c.noter('VALEUR_INVALIDE', 'ecrans', 'aucun écran', null)
      else brut.ecrans.forEach((e, i) => { ecran(c, e, `ecrans[${String(i)}]`) })
    }
    if ('barre' in brut) {
      if (!Array.isArray(brut.barre)) c.noter('TYPE_INVALIDE', 'barre', 'barre est une liste de routes', null)
      else brut.barre.forEach((r, i) => { genre(c, { g: 'route' }, r, `barre[${String(i)}]`, 'route') })
    }
  } else {
    cles(c, brut, '', ['ecran', 'traductions'], ['ecran'], 'un fragment')
    if ('ecran' in brut) ecran(c, brut.ecran, 'ecran')
  }
  if ('traductions' in brut) traductions(c, brut.traductions, 'traductions')
  return c.refus
}

// ════════════════════════════════════════════════════════════════════════
// COUCHE 2 — LE CONTEXTE LU, PUIS LE GRAPHE
// ════════════════════════════════════════════════════════════════════════
type Lu = {
  cles: Set<string>
  cibles: { route: string; chemin: string }[]
  emis: Set<string>
}

const tableau = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])

/**
 * UNE COLONNE SECRÈTE n'a rien à faire dans un écran : le mot de passe appartient
 * à la connexion (le squelette), jamais à une table qu'on lit ou écrit.
 * Mesuré (A1, écran 10) : une table « utilisateur » à mot_de_passe en clair.
 */
export const COLONNE_SECRETE = /^(mot_?de_?passe|motdepasse|password|passwd|pwd|mdp|secret|hash_?mdp|code_?pin|pin)$/iu

/**
 * UNE MENTION DE DÉMONSTRATION dans une application livrée : mesuré (A1, écrans
 * 6, 14, 15, 17) — « Démonstration », « (démo) », « (démonstration) ».
 */
const DEMO = /(?<![\p{L}])(d[ée]mo|d[ée]monstration|demonstration)(?![\p{L}])/iu

/**
 * UN MONTANT ÉCRIT EN DUR : un prix vient des données (`format: montant`),
 * jamais d'un texte. Mesuré (A1, écran 6) : un catalogue aux prix inventés.
 */
const MONTANT = /\d[\d\s.,]*\s?(?:FCFA|F\s?CFA|XAF|XOF|€|\$|£|francs?\b|F\b)|(?:€|\$|£)\s?\d/u

function scanTexte(c: Collecte, texte: string, chemin: string, ctx: Contexte) {
  for (const h of horsLecture(texte, ctx)) c.noter(h.classe, chemin, `${dire(h.nom)} : la lecture du cahier ne le nomme pas`, null)
  const demo = DEMO.exec(texte)
  if (demo !== null) c.noter('MENTION_DEMO', chemin, `« ${demo[0]} » : une application livrée ne s’annonce pas en démonstration`, null)
  const montant = MONTANT.exec(texte)
  if (montant !== null) c.noter('MONTANT_EN_DUR', chemin, `« ${montant[0].trim()} » : un montant vient des données (Valeur, format montant), pas d’un texte`, null)
}
const chaine = (x: unknown): string | null => (typeof x === 'string' ? x : null)
const donnee = (x: unknown): string | null => (estObjet(x) && typeof x.$data === 'string' ? x.$data : null)

function contexteEcran(c: Collecte, e: Record<string, unknown>, chemin: string, ctx: Contexte): Lu {
  const lu: Lu = { cles: new Set(), cibles: [], emis: new Set() }
  const tables = new Map(ctx.tables.map((t) => [t.nom, t]))
  const colonnes = (t: string) => ['id', ...(tables.get(t)?.colonnes ?? [])]
  const acces = chaine(e.acces)
  if (acces !== null && acces !== 'visiteur' && !ctx.roles.some((r) => normaliser(r) === normaliser(acces))) {
    c.noter('ROLE_INCONNU', `${chemin}.acces`, `le rôle ${dire(acces)} n’est pas lu dans le cahier`, lePlusProche(acces, [...ctx.roles, 'visiteur']))
  }
  const tetrade = estObjet(e.tetrade) ? e.tetrade : null
  const tableTetrade = tetrade !== null ? chaine(tetrade.table) : null
  if (tableTetrade !== null && !tables.has(tableTetrade)) c.noter('TABLE_INCONNUE', `${chemin}.tetrade.table`, `${dire(tableTetrade)} n’est pas une table déclarée`, lePlusProche(tableTetrade, [...tables.keys()]))
  const declares = new Set(tableau(e.etat).map((x) => (estObjet(x) ? chaine(x.nom) : null)).filter((x): x is string => x !== null))
  const visibles = new Set<string>()
  const lecteurs = new Set<string>()
  const ecritures: { nom: string; chemin: string; libelle: string }[] = []
  const champs: { nom: string; chemin: string }[] = []

  const scanLitteral = (v: unknown, ch: string) => {
    if (typeof v !== 'string') return
    for (const h of horsLecture(v, ctx)) c.noter(h.classe, ch, `${dire(h.nom)} : la lecture du cahier ne le nomme pas`, null)
  }
  const secrete = (col: string | undefined, ch: string): boolean => {
    if (col === undefined || !COLONNE_SECRETE.test(col)) return false
    c.noter('COLONNE_SECRETE', ch, `${dire(col)} : un secret ne se lit ni ne s’écrit dans un écran — la connexion le porte (emit connexion)`, null)
    return true
  }
  // Un VISITEUR ne lit qu'une table déclarée publique (lecturePublique ; absent ⇒ privée).
  const privee = (t: string, ch: string) => {
    if (acces !== 'visiteur') return
    const lue = tables.get(t)
    if (lue !== undefined && lue.publique !== true) c.noter('DONNEE_PRIVEE_EXPOSEE', ch, `l’écran est ouvert au visiteur et lit ${dire(t)}, table privée (non déclarée publique)`, null)
  }
  const verifierLiaison = (v: string | null, ch: string, portee: string | null, role: 'visible' | 'lecteur' | 'champ' | 'aucun') => {
    if (v === null) return
    const [source, a, b] = v.split('.')
    if (source === 'table' && a !== undefined) {
      if (!tables.has(a)) c.noter('TABLE_INCONNUE', ch, `${dire(a)} n’est pas une table déclarée`, lePlusProche(a, [...tables.keys()]))
      else privee(a, ch)
    }
    if (source === 'parcours' && a !== undefined) {
      if (!tables.has(a)) c.noter('TABLE_INCONNUE', ch, `${dire(a)} n’est pas une table déclarée`, lePlusProche(a, [...tables.keys()]))
      else if (secrete(b, ch)) { /* noté */ }
      else if (b !== undefined && !colonnes(a).includes(b)) c.noter('CHAMP_INCONNU', ch, `${dire(b)} n’est pas une colonne de ${a}`, lePlusProche(b, colonnes(a)))
      else privee(a, ch)
    }
    if (source === 'ligne' && a !== undefined && portee !== INCONNUE) {
      if (secrete(a, ch)) { /* noté */ }
      else if (portee === null) c.noter('LIAISON_HORS_PORTEE', ch, `${dire(v)} : aucune ligne courante ici (hors d’un modèle de Lignes ou d’un écran de tétrade detail / editer)`, null)
      else if (!colonnes(portee).includes(a)) c.noter('CHAMP_INCONNU', ch, `${dire(a)} n’est pas une colonne de ${portee}`, lePlusProche(a, colonnes(portee)))
    }
    if (source === 'etat' && a !== undefined) {
      if (!declares.has(a)) c.noter('ETAT_INCONNU', ch, `${dire(a)} n’est pas une valeur d’état déclarée par l’écran`, lePlusProche(a, [...declares]))
      else {
        if (role === 'visible') { visibles.add(a); lecteurs.add(a) }
        if (role === 'lecteur') lecteurs.add(a)
        if (role === 'champ') visibles.add(a)
      }
    }
  }

  const effets = (liste: unknown, ch: string, portee: string | null, libelle: string) => {
    tableau(liste).forEach((a, i) => {
      if (!estObjet(a)) return
      const ca = `${ch}[${String(i)}]`
      switch (a.faire) {
        case 'navigate': {
          const r = chaine(a.route)
          if (r !== null) lu.cibles.push({ route: r, chemin: `${ca}.route` })
          verifierLiaison(donnee(a.avec), `${ca}.avec`, portee, 'lecteur')
          return
        }
        case 'submit': {
          const t = chaine(a.table)
          const connue = t !== null && tables.has(t)
          if (t !== null && !connue) c.noter('TABLE_INCONNUE', `${ca}.table`, `${dire(t)} n’est pas une table déclarée`, lePlusProche(t, [...tables.keys()]))
          // Modifier ou supprimer, c'est UNE ligne : il faut une ligne courante. Mesuré (A1, écran 9).
          if ((a.ecriture === 'modifier' || a.ecriture === 'supprimer') && portee === null) {
            c.noter('SUBMIT_SANS_LIGNE', `${ca}.ecriture`, `${String(a.ecriture)} hors d’une ligne courante : on ne sait pas quelle ligne (dans le modèle de Lignes, ou sur un écran de tétrade detail / editer)`, null)
          }
          tableau(a.valeurs).forEach((v, j) => {
            if (!estObjet(v)) return
            const cv = `${ca}.valeurs[${String(j)}]`
            const champ = chaine(v.champ)
            if (secrete(champ ?? undefined, `${cv}.champ`)) { /* noté */ }
            else if (connue && champ !== null && !colonnes(t).includes(champ)) c.noter('CHAMP_INCONNU', `${cv}.champ`, `${dire(champ)} n’est pas une colonne de ${t}`, lePlusProche(champ, colonnes(t)))
            if (estObjet(v.depuis)) verifierLiaison(donnee(v.depuis), `${cv}.depuis`, portee, 'lecteur')
            else scanLitteral(v.depuis, `${cv}.depuis`)
          })
          return
        }
        case 'emit': {
          const ev = chaine(a.evenement)
          if (ev !== null) lu.emis.add(ev)
          tableau(a.charge).forEach((x, j) => { if (estObjet(x)) verifierLiaison(donnee(x.depuis), `${ca}.charge[${String(j)}].depuis`, portee, 'lecteur') })
          if (ev === 'choisirLangue') {
            const code = chaine(a.valeur)
            if (code !== null && !languesPermises(ctx).includes(code)) c.noter('LANGUE_HORS_LECTURE', `${ca}.valeur`, `${dire(code)} : langues lues ${languesPermises(ctx).join(', ')}`, lePlusProche(code, languesPermises(ctx)))
          }
          return
        }
        case 'setState': {
          const ch2 = chaine(a.chemin)
          if (ch2 !== null && !ch2.startsWith('etat.')) c.noter('ECRITURE_HORS_ETAT', `${ca}.chemin`, `${dire(ch2)} : setState n’écrit que l’état de l’écran (etat.<nom>) ; une table s’écrit par submit`, null)
          else if (ch2 !== null) {
            const nom = ch2.split('.')[1]!
            if (!declares.has(nom)) c.noter('ETAT_INCONNU', `${ca}.chemin`, `${dire(nom)} n’est pas une valeur d’état déclarée par l’écran`, lePlusProche(nom, [...declares]))
            else ecritures.push({ nom, chemin: ch, libelle })
          }
          if (estObjet(a.valeur)) verifierLiaison(donnee(a.valeur), `${ca}.valeur`, portee, 'lecteur')
          else scanLitteral(a.valeur, `${ca}.valeur`)
          return
        }
        default:
      }
    })
  }

  const parcourir = (n: unknown, ch: string, portee: string | null) => {
    if (!estObjet(n)) return
    tableau(n.choix).forEach((o, i) => { if (estObjet(o)) scanLitteral(o.valeur, `${ch}.choix[${String(i)}].valeur`) })
    verifierLiaison(donnee(n.si), `${ch}.si`, portee, 'visible')
    verifierLiaison(donnee(n.siNon), `${ch}.siNon`, portee, 'visible')
    const libelle = typeof n.libelle === 'string' ? n.libelle : String(n.composant)
    switch (n.composant) {
      case 'Valeur':
      case 'Illustration':
        verifierLiaison(donnee(n.donnee), `${ch}.donnee`, portee, 'visible')
        break
      case 'Champ': {
        const d = donnee(n.donnee)
        verifierLiaison(d, `${ch}.donnee`, portee, 'champ')
        if (d !== null && d.startsWith('etat.') && declares.has(d.split('.')[1]!)) champs.push({ nom: d.split('.')[1]!, chemin: `${ch}.donnee` })
        break
      }
      case 'Lignes':
      case 'Fiche': {
        const d = donnee(n.donnee)
        let t: string | null = null
        if (d !== null && !d.startsWith('table.')) c.noter('LIAISON_HORS_PORTEE', `${ch}.donnee`, `${dire(d)} : ${String(n.composant)} lit une table (table.<table>)`, null)
        // Une table inconnue est refusée UNE fois ; ses lignes ne sont pas re-jugées colonne par colonne.
        else if (d !== null) { verifierLiaison(d, `${ch}.donnee`, portee, 'visible'); t = d.split('.')[1] ?? null; if (t !== null && !tables.has(t)) t = INCONNUE }
        tableau(n.filtre).forEach((f, i) => {
          if (!estObjet(f)) return
          const champ = chaine(f.champ)
          if (secrete(champ ?? undefined, `${ch}.filtre[${String(i)}].champ`)) { /* noté */ }
          else if (t !== null && t !== INCONNUE && champ !== null && !colonnes(t).includes(champ)) c.noter('CHAMP_INCONNU', `${ch}.filtre[${String(i)}].champ`, `${dire(champ)} n’est pas une colonne de ${t}`, lePlusProche(champ, colonnes(t)))
          verifierLiaison(donnee(f.egal), `${ch}.filtre[${String(i)}].egal`, portee, 'visible')
        })
        tableau(n.modele).forEach((m, i) => { parcourir(m, `${ch}.modele[${String(i)}]`, t) })
        break
      }
      default:
    }
    if ('effets' in n) effets(n.effets, `${ch}.effets`, portee, libelle)
    if ('videAction' in n) effets(n.videAction, `${ch}.videAction`, portee, typeof n.videLibelle === 'string' ? n.videLibelle : libelle)
    tableau(n.enfants).forEach((m, i) => { parcourir(m, `${ch}.enfants[${String(i)}]`, portee) })
  }

  // ── LES TEXTES : en clair ; leurs clés sont fabriquées par Deribfy (textes.ts).
  for (const t of textesDe(e)) {
    lu.cles.add(t.cle)
    scanTexte(c, t.texte, `${chemin}.${t.chemin}`, ctx)
  }
  const vue = tetrade !== null ? chaine(tetrade.vue) : null
  const porteeEcran = tableTetrade !== null && tables.has(tableTetrade) && (vue === 'detail' || vue === 'editer') ? tableTetrade : null
  tableau(e.corps).forEach((n, i) => { parcourir(n, `${chemin}.corps[${String(i)}]`, porteeEcran) })
  tableau(e.etat).forEach((x, i) => { if (estObjet(x)) scanLitteral(x.initial, `${chemin}.etat[${String(i)}].initial`) })

  // ── UN EFFET QUE PERSONNE NE VOIT : « ne change rien à l'écran » (juge Chromium), vu ici sans navigateur.
  for (const w of ecritures) {
    if (!visibles.has(w.nom)) c.noter('ACTION_SANS_EFFET', w.chemin, `« ${w.libelle} » écrit etat.${w.nom}, que rien ne montre à l’écran`, null)
  }
  for (const ch of champs) {
    if (!lecteurs.has(ch.nom)) c.noter('CHAMP_SANS_EFFET', ch.chemin, `etat.${ch.nom} est saisi puis lu par rien (ni filtre, ni écriture, ni affichage)`, null)
  }
  return lu
}

/**
 * LES TRADUCTIONS : la langue principale est celle des textes écrits en clair
 * (la première langue lue) ; chaque autre langue lue doit porter chaque clé
 * fabriquée par Deribfy.
 */
function contexteTraductions(c: Collecte, tr: unknown, cles: Set<string>, ctx: Contexte) {
  const permises = languesPermises(ctx)
  const principale = permises[0]!
  const parLangue = new Map<string, Map<string, string>>()
  tableau(tr).forEach((t, i) => {
    if (!estObjet(t)) return
    const langue = chaine(t.langue)
    if (langue === null) return
    if (!permises.includes(langue)) c.noter('LANGUE_HORS_LECTURE', `traductions[${String(i)}].langue`, `${dire(langue)} : langues lues ${permises.join(', ')}`, lePlusProche(langue, permises))
    const m = parLangue.get(langue) ?? new Map<string, string>()
    parLangue.set(langue, m)
    tableau(t.textes).forEach((e, j) => {
      if (!estObjet(e)) return
      const cle = chaine(e.cle)
      const tx = chaine(e.texte)
      if (cle !== null && tx !== null) m.set(cle, tx)
      if (tx !== null) scanTexte(c, tx, `traductions[${String(i)}].textes[${String(j)}].texte`, ctx)
    })
  })
  for (const l of permises.filter((x) => x !== principale)) {
    const m = parLangue.get(l)
    const manquantes = [...cles].filter((k) => m?.get(k) === undefined || m.get(k)!.trim() === '')
    if (manquantes.length > 0) c.noter('TRADUCTION_MANQUANTE', `traductions.${l}`, `${l} : ${String(manquantes.length)} clé(s) sans texte (${manquantes.slice(0, 4).join(', ')}${manquantes.length > 4 ? '…' : ''})`, null)
  }
}

function coucheDeux(brut: Record<string, unknown>, forme: 'spec' | 'fragment', ctx: Contexte): Refus[] {
  const c = new Collecte()
  const ecrans = forme === 'spec' ? tableau(brut.ecrans).filter(estObjet) : estObjet(brut.ecran) ? [brut.ecran] : []
  const cles = new Set<string>()
  const lus = ecrans.map((e, i) => {
    const lu = contexteEcran(c, e, forme === 'spec' ? `ecrans[${String(i)}]` : 'ecran', ctx)
    for (const k of lu.cles) cles.add(k)
    return lu
  })
  contexteTraductions(c, brut.traductions, cles, ctx)

  const tables = new Map(ctx.tables.map((t) => [t.nom, t]))
  const duPlan = new Set<string>([...ctx.routes, ...ROUTES_SOCLE])
  if (forme === 'fragment') {
    for (const lu of lus) for (const cible of lu.cibles) {
      if (!duPlan.has(cible.route)) c.noter('ROUTE_HORS_PLAN', `ecran.${cible.chemin.replace(/^ecran\./u, '')}`, `${dire(cible.route)} n’est pas une route du plan`, lePlusProche(cible.route, [...duPlan]))
    }
    return c.refus
  }

  // ── LE GRAPHE
  const routes = ecrans.map((e) => chaine(e.route))
  const vues = new Set<string>()
  const vus = new Map<string, number>()
  routes.forEach((r, i) => {
    if (r === null) return
    if (vus.has(r)) c.noter('ROUTE_DOUBLE', `ecrans[${String(i)}].route`, `${dire(r)} a déjà un écran (ecrans[${String(vus.get(r))}])`, null)
    else vus.set(r, i)
    const t = estObjet(ecrans[i]!.tetrade) ? (ecrans[i]!.tetrade as Record<string, unknown>) : null
    const tt = t !== null ? chaine(t.table) : null
    const tv = t !== null ? chaine(t.vue) : null
    if (tt !== null && tv !== null && tables.has(tt)) vues.add(`${tt}|${tv}`)
    else if (!duPlan.has(r)) c.noter('ROUTE_HORS_PLAN', `ecrans[${String(i)}].route`, `${dire(r)} n’est ni une route du plan, ni du socle, ni un écran de tétrade`, lePlusProche(r, [...duPlan]))
  })
  const existe = new Set(routes.filter((r): r is string => r !== null))
  for (const r of duPlan) if (!existe.has(r)) c.noter('ROUTE_SANS_ECRAN', 'ecrans', `la route ${dire(r)} ${ROUTES_SOCLE.includes(r as never) ? 'du socle' : 'du plan'} n’a pas d’écran`, null)
  for (const lu of lus) {
    for (const cible of lu.cibles) if (!existe.has(cible.route)) c.noter('ROUTE_SANS_ECRAN', cible.chemin, `${dire(cible.route)} : aucun écran ne porte cette route`, lePlusProche(cible.route, [...existe]))
  }
  const barre = tableau(brut.barre).map(chaine).filter((r): r is string => r !== null)
  barre.forEach((r, i) => { if (!existe.has(r)) c.noter('ROUTE_SANS_ECRAN', `barre[${String(i)}]`, `${dire(r)} : aucun écran ne porte cette route`, lePlusProche(r, [...existe])) })
  if (barre.length < 3 || barre.length > 5 || new Set(barre).size !== barre.length) c.noter('BARRE_HORS_BORNES', 'barre', `la barre du bas porte 3 à 5 routes distinctes (${String(barre.length)} reçue(s))`, null)

  for (const t of ctx.tables) {
    const requises = t.journal === true ? ['liste', 'detail'] : [...VUES_TETRADE]
    const manquent = requises.filter((v) => !vues.has(`${t.nom}|${v}`))
    if (manquent.length > 0) c.noter('TETRADE_INCOMPLETE', 'ecrans', `la table ${dire(t.nom)} n’a pas ses vues ${manquent.join(', ')}`, null)
  }

  const entrees = new Map<string, Set<string>>()
  lus.forEach((lu, i) => {
    const de = routes[i]
    for (const cible of lu.cibles) if (de !== null && de !== undefined && cible.route !== de) {
      const s = entrees.get(cible.route) ?? new Set<string>()
      s.add(de)
      entrees.set(cible.route, s)
    }
  })
  routes.forEach((r, i) => {
    if (r === null) return
    if (r !== 'accueil' && !barre.includes(r) && (entrees.get(r)?.size ?? 0) === 0) c.noter('ECRAN_SANS_ENTREE', `ecrans[${String(i)}]`, `aucun écran ne mène à ${dire(r)}`, null)
    if (lus[i]!.cibles.length === 0) c.noter('ECRAN_SANS_SORTIE', `ecrans[${String(i)}]`, `${dire(r)} ne mène nulle part (aucun navigate)`, null)
  })

  const iCompte = routes.indexOf('compte')
  if (iCompte >= 0) {
    const lu = lus[iCompte]!
    const manque = [...['aide', 'contact', 'legal'].filter((r) => !lu.cibles.some((x) => x.route === r)).map((r) => `navigate ${r}`), ...(lu.emis.has('deconnexion') ? [] : ['emit deconnexion'])]
    if (manque.length > 0) c.noter('COMPTE_INCOMPLET', `ecrans[${String(iCompte)}]`, `le compte doit mener à l’aide, au contact, aux mentions légales et déconnecter — il manque : ${manque.join(', ')}`, null)
  }

  const p = ctx.parcours ?? []
  for (let i = 0; i + 1 < p.length; i += 1) {
    const a = p[i]!
    const b = p[i + 1]!
    const ia = routes.indexOf(a)
    if (ia < 0 || !existe.has(b)) continue
    if (!lus[ia]!.cibles.some((x) => x.route === b)) c.noter('PARCOURS_ROMPU', `ecrans[${String(ia)}]`, `le parcours lu passe de ${dire(a)} à ${dire(b)}, et ${dire(a)} n’y mène pas`, null)
  }
  return c.refus
}

function valider(brut: unknown, ctx: Contexte, forme: 'spec' | 'fragment', complet: boolean): Verdict {
  const zodOk = (forme === 'spec' ? SchemaSpec : SchemaFragment).safeParse(brut).success
  const un = coucheUn(brut, forme)
  if (un.length > 0 && !complet) return { ok: false, refus: un, zodOk, couche: 1 }
  const deux = estObjet(brut) ? coucheDeux(brut, forme, ctx) : []
  const refus = [...un, ...deux]
  return { ok: refus.length === 0, refus, zodOk, couche: un.length > 0 ? 1 : deux.length > 0 ? 2 : null }
}

/** L'application entière : couche 1, puis contexte et graphe. */
export function validerSpec(brut: unknown, ctx: Contexte, o: { complet?: boolean } = {}): Verdict {
  return valider(brut, ctx, 'spec', o.complet === true)
}

/** Un écran seul avec ses textes : couche 1 et contexte ; ses navigations doivent viser le plan. */
export function validerFragment(brut: unknown, ctx: Contexte, o: { complet?: boolean } = {}): Verdict {
  return valider(brut, ctx, 'fragment', o.complet === true)
}

/** Le reproche, en clair, d'une liste de refus — ce que la relance montrera au modèle. */
export function reproche(refus: readonly Refus[]): string {
  return refus.map((r) => `- ${r.classe} · ${r.chemin || '(racine)'} · ${r.quoi}${r.proche !== null ? ` → le plus proche : « ${r.proche} »` : ''}`).join('\n')
}
