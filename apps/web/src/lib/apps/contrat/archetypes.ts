/**
 * APPELÉ PAR LES TESTS, PAR CONSTRUCTION — jusqu’à l’étape 4 (EP-365) : branché par l’étape 4.
 *
 * V3 — LES TREIZE ARCHÉTYPES. Le modèle n'écrit plus un écran : il REMPLIT les
 * emplacements (« slots ») d'un archétype imposé ; Deribfy en tire l'écran du
 * contrat. Chaque slot déclare son genre admis, sa cardinalité, s'il est requis.
 * Les cinq états d'une donnée, la largeur, la droite-à-gauche et les cibles de
 * 48 sont rendus par le moteur, jamais écrits par personne.
 *
 * L'accueil (`accueil`) et la gestion d'une table (`tableAdmin`), que Deribfy
 * écrivait à part en 3c-2, sont des archétypes comme les autres.
 */
import { lePlusProche } from './proche'

export type GenreSlot = 'texte' | 'route' | 'table' | 'colonne' | 'variante' | 'colonnes' | 'liens' | 'champs' | 'textes' | 'noeuds'
export type DefSlot = {
  readonly genre: GenreSlot
  readonly requis: boolean
  /** Pour une liste : bornes de cardinalité. Pour un genre simple : 1 (requis) ou 0..1. */
  readonly min?: number
  readonly max?: number
  /** `noeuds` : les composants admis ; `variante` : les valeurs admises. */
  readonly admis?: readonly string[]
  readonly aide: string
}
export type DefArchetype = {
  readonly aide: string
  /** Ce que l'écran lit : rien, les lignes d'une table, ou la ligne en cours. */
  readonly donnees: 'aucune' | 'lignes' | 'ligne'
  readonly slots: Readonly<Record<string, DefSlot>>
  /** Les sorties de navigation que le gabarit pose (en plus de « Accueil »). */
  readonly sorties: readonly string[]
}

const s = (genre: GenreSlot, requis: boolean, aide: string, extra: Partial<DefSlot> = {}): DefSlot => ({ genre, requis, aide, ...extra })
const TITRE = s('texte', true, 'le titre de l’écran')
const TABLE = s('table', true, 'la table lue')
const COLONNES = s('colonnes', true, 'les colonnes montrées : [{ colonne, libelle, format? }]', { min: 1, max: 6 })
const VIDE = s('texte', true, 'ce qui s’affiche quand il n’y a rien')

export const ARCHETYPES = {
  auth: { aide: 'se connecter', donnees: 'aucune', sorties: ['apres', 'inscription'], slots: {
    titre: TITRE, intro: s('texte', false, 'une phrase d’accueil'),
    natureIdentifiant: s('variante', true, 'courriel ou téléphone', { admis: ['courriel', 'telephone'] }),
    libelleIdentifiant: s('texte', true, 'le libellé de l’identifiant'), libelleSecret: s('texte', true, 'le libellé du mot de passe'),
    apres: s('route', true, 'où aller une fois connecté'), inscription: s('route', false, 'l’écran d’inscription'), libelleInscription: s('texte', false, 'le libellé du lien d’inscription'),
  } },
  onboarding: { aide: 'les premiers pas', donnees: 'aucune', sorties: ['fin'], slots: {
    titre: TITRE, etapes: s('noeuds', true, 'les étapes', { min: 1, max: 5, admis: ['Encart', 'Phrase', 'Titre', 'Illustration', 'Pictogramme'] }),
    fin: s('route', true, 'où mène « commencer »'), libelleFin: s('texte', true, 'le libellé du bouton final'),
  } },
  accueil: { aide: 'la porte d’entrée', donnees: 'aucune', sorties: ['raccourcis'], slots: {
    titre: TITRE, intro: s('texte', false, 'une phrase'), raccourcis: s('liens', true, 'les écrans proposés : [{ libelle, route }]', { min: 1, max: 12 }),
  } },
  liste: { aide: 'les lignes d’une table', donnees: 'lignes', sorties: ['detail', 'creation'], slots: {
    titre: TITRE, table: TABLE, colonnes: COLONNES, detail: s('route', false, 'l’écran de détail'), creation: s('route', false, 'l’écran de création'),
    libelleCreation: s('texte', false, 'le libellé « ajouter »'), vide: VIDE,
  } },
  recherche: { aide: 'chercher dans une table', donnees: 'lignes', sorties: ['detail'], slots: {
    titre: TITRE, table: TABLE, colonneRecherche: s('colonne', true, 'la colonne cherchée'), libelleRecherche: s('texte', true, 'le libellé du champ'),
    colonnes: COLONNES, detail: s('route', false, 'l’écran de détail'), vide: VIDE,
  } },
  detail: { aide: 'une ligne', donnees: 'ligne', sorties: ['retour'], slots: {
    titre: TITRE, table: TABLE, colonnes: COLONNES, actions: s('noeuds', false, 'des commandes', { min: 0, max: 3, admis: ['Bouton'] }),
    retour: s('route', true, 'où revenir'), vide: VIDE,
  } },
  formulaire: { aide: 'créer une ligne', donnees: 'aucune', sorties: ['apres'], slots: {
    titre: TITRE, table: TABLE, champs: s('champs', true, 'les champs : [{ colonne, libelle, nature, requis? }]', { min: 1, max: 12 }),
    apres: s('route', true, 'où aller après l’envoi'), libelleEnvoi: s('texte', true, 'le libellé de l’envoi'),
  } },
  checkout: { aide: 'payer', donnees: 'ligne', sorties: ['confirmation'], slots: {
    titre: TITRE, table: TABLE, colonnes: COLONNES, colonneMontant: s('colonne', true, 'la colonne du montant'),
    tablePaiement: s('table', true, 'la table où le paiement s’écrit'), champMontant: s('colonne', true, 'sa colonne du montant'),
    champMoyen: s('colonne', false, 'sa colonne du moyen de paiement'), moyens: s('textes', false, 'les moyens de paiement LUS', { min: 0, max: 8 }),
    confirmation: s('route', true, 'l’écran de confirmation'), libellePayer: s('texte', true, 'le libellé du paiement'), vide: VIDE,
  } },
  confirmation: { aide: 'ce qui vient d’arriver', donnees: 'ligne', sorties: ['suites'], slots: {
    titre: TITRE, message: s('texte', true, 'le message de réussite'), table: TABLE, colonnes: COLONNES,
    suites: s('liens', true, 'la suite : [{ libelle, route }]', { min: 1, max: 2 }), vide: VIDE,
  } },
  profil: { aide: 'la personne', donnees: 'ligne', sorties: ['edition'], slots: {
    titre: TITRE, table: TABLE, colonnes: COLONNES, edition: s('route', false, 'l’écran de modification'), vide: VIDE,
  } },
  compte: { aide: 'le compte et ses pages', donnees: 'aucune', sorties: ['aide', 'contact', 'legal'], slots: { titre: TITRE } },
  dashboard: { aide: 'le tableau de bord', donnees: 'lignes', sorties: ['raccourcis', 'detail'], slots: {
    titre: TITRE, raccourcis: s('liens', false, 'des raccourcis', { min: 0, max: 6 }), table: TABLE, colonnes: COLONNES,
    detail: s('route', false, 'l’écran de détail'), vide: VIDE,
  } },
  tableAdmin: { aide: 'gérer une table', donnees: 'lignes', sorties: ['creation', 'edition'], slots: {
    titre: TITRE, table: TABLE, colonnes: COLONNES, creation: s('route', false, 'l’écran de création'), edition: s('route', false, 'l’écran de modification'), vide: VIDE,
  } },
} as const satisfies Readonly<Record<string, DefArchetype>>
export type NomArchetype = keyof typeof ARCHETYPES
export const NOMS_ARCHETYPES = Object.keys(ARCHETYPES) as NomArchetype[]

/** Une page du compte (aide, contact, mentions légales) — de la famille du compte, pas un archétype de plus. */
export const PAGE_DU_COMPTE: DefArchetype = { aide: 'une page du compte', donnees: 'aucune', sorties: ['retour'], slots: {
  titre: TITRE, texte: s('texte', true, 'le contenu'), retour: s('route', true, 'où revenir'),
} }

export type Remplissage = { readonly archetype: string; readonly route: string; readonly acces: string; readonly slots: Readonly<Record<string, unknown>> }
export type RefusArchetype = { readonly classe: 'ARCHETYPE_INCONNU' | 'SLOT_INCONNU' | 'SLOT_MANQUANT' | 'SLOT_TYPE' | 'SLOT_CARDINALITE'; readonly slot: string; readonly quoi: string; readonly proche: string | null }

const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const estTexte = (x: unknown) => typeof x === 'string' && x.trim() !== ''
const IDENT = /^[a-z][a-zA-Z0-9_]*$/u
const ROUTE = /^[a-z0-9]+(-[a-z0-9]+)*$/u

function typeOk(d: DefSlot, v: unknown): boolean {
  const tous = (f: (x: unknown) => boolean) => Array.isArray(v) && v.every(f)
  switch (d.genre) {
    case 'texte': return estTexte(v)
    case 'route': return typeof v === 'string' && ROUTE.test(v)
    case 'table': case 'colonne': return typeof v === 'string' && IDENT.test(v)
    case 'variante': return typeof v === 'string' && (d.admis ?? []).includes(v)
    case 'colonnes': return tous((x) => estObjet(x) && typeof x.colonne === 'string' && IDENT.test(x.colonne) && estTexte(x.libelle))
    case 'liens': return tous((x) => estObjet(x) && estTexte(x.libelle) && typeof x.route === 'string' && ROUTE.test(x.route))
    case 'champs': return tous((x) => estObjet(x) && typeof x.colonne === 'string' && IDENT.test(x.colonne) && estTexte(x.libelle) && typeof x.nature === 'string')
    case 'textes': return tous(estTexte)
    case 'noeuds': return tous((x) => estObjet(x) && typeof x.composant === 'string' && (d.admis ?? []).includes(x.composant))
  }
}

/** Le remplissage suit-il son archétype ? (La forme ; le contrat juge ensuite l'écran produit.) */
export function validerRemplissage(r: Remplissage): RefusArchetype[] {
  const def = (ARCHETYPES as Readonly<Record<string, DefArchetype>>)[r.archetype] ?? (r.archetype === 'pageDuCompte' ? PAGE_DU_COMPTE : undefined)
  if (def === undefined) return [{ classe: 'ARCHETYPE_INCONNU', slot: '', quoi: `« ${r.archetype} » n’est pas un archétype`, proche: lePlusProche(r.archetype, NOMS_ARCHETYPES) }]
  const refus: RefusArchetype[] = []
  for (const k of Object.keys(r.slots)) if (!(k in def.slots)) refus.push({ classe: 'SLOT_INCONNU', slot: k, quoi: `${r.archetype} n’a pas de slot « ${k} »`, proche: lePlusProche(k, Object.keys(def.slots)) })
  for (const [k, d] of Object.entries(def.slots)) {
    const v = r.slots[k]
    if (v === undefined) { if (d.requis) refus.push({ classe: 'SLOT_MANQUANT', slot: k, quoi: `${r.archetype} exige « ${k} » (${d.aide})`, proche: null }); continue }
    if (!typeOk(d, v)) { refus.push({ classe: 'SLOT_TYPE', slot: k, quoi: `« ${k} » attend ${d.genre}${d.admis ? ` (${d.admis.join(', ')})` : ''}`, proche: null }); continue }
    if (Array.isArray(v) && (v.length < (d.min ?? 0) || v.length > (d.max ?? Number.POSITIVE_INFINITY))) {
      refus.push({ classe: 'SLOT_CARDINALITE', slot: k, quoi: `« ${k} » : ${String(v.length)} élément(s), attendu ${String(d.min ?? 0)} à ${d.max === undefined ? 'n' : String(d.max)}`, proche: null })
    }
  }
  return refus
}

// ── LES LIBELLÉS DES GABARITS : des textes de Deribfy, dans la langue principale de l'application.
const GABARIT: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  fr: { accueil: 'Accueil', seConnecter: 'Se connecter', ajouter: 'Ajouter', retour: 'Retour', modifier: 'Modifier', supprimer: 'Supprimer', effacer: 'Effacer la recherche', deconnexion: 'Se déconnecter', aide: 'Aide', contact: 'Contact', legal: 'Mentions légales', utilisateur: 'Connecté en tant que', recents: 'Les plus récents', moyen: 'Moyen de paiement' },
  en: { accueil: 'Home', seConnecter: 'Sign in', ajouter: 'Add', retour: 'Back', modifier: 'Edit', supprimer: 'Delete', effacer: 'Clear the search', deconnexion: 'Sign out', aide: 'Help', contact: 'Contact', legal: 'Legal notice', utilisateur: 'Signed in as', recents: 'Most recent', moyen: 'Payment method' },
  ar: { accueil: 'الرئيسية', seConnecter: 'تسجيل الدخول', ajouter: 'إضافة', retour: 'رجوع', modifier: 'تعديل', supprimer: 'حذف', effacer: 'مسح البحث', deconnexion: 'تسجيل الخروج', aide: 'المساعدة', contact: 'اتصل بنا', legal: 'الإشعارات القانونية', utilisateur: 'متصل باسم', recents: 'الأحدث', moyen: 'وسيلة الدفع' },
}
export const libellesDuGabarit = (langue: string): Readonly<Record<string, string>> => GABARIT[langue] ?? GABARIT.en!

type O = Record<string, unknown>
const d = (c: string) => ({ $data: c })
const nav = (route: string, avec?: string): O => ({ faire: 'navigate', route, ...(avec !== undefined ? { avec: d(avec) } : {}) })
const bouton = (libelle: string, effets: O[], genre = 'secondaire', icone?: string): O => ({ composant: 'Bouton', libelle, effets, genre, ...(icone !== undefined ? { icone } : {}) })
const titre = (t: string): O => ({ composant: 'Titre', texte: t, niveau: 'page' })
type Col = { colonne: string; libelle: string; format?: string }
const valeurs = (cols: readonly Col[], source = 'ligne', table = ''): O[] => cols.map((c) => ({ composant: 'Valeur', libelle: c.libelle, donnee: d(source === 'ligne' ? `ligne.${c.colonne}` : `parcours.${table}.${c.colonne}`), ...(c.format !== undefined ? { format: c.format } : {}) }))

export type OptionsGabarit = { readonly langue: string; readonly langues: readonly { readonly code: string; readonly libelle: string }[] }

/** L'écran du contrat qu'un archétype rempli produit. */
export function expanser(r: Remplissage, o: OptionsGabarit): O {
  const g = libellesDuGabarit(o.langue)
  const v = r.slots as Readonly<Record<string, unknown>>
  const t = (k: string) => String(v[k])
  const route = (k: string) => (typeof v[k] === 'string' ? (v[k] as string) : null)
  const accueil = bouton(g.accueil!, [nav('accueil')], 'discret', 'accueil')
  const etat: O[] = []
  let corps: O[]
  switch (r.archetype) {
    case 'auth':
      etat.push({ nom: 'identifiant', nature: 'texte' }, { nom: 'secret', nature: 'texte' })
      corps = [titre(t('titre')), ...(v.intro !== undefined ? [{ composant: 'Phrase', texte: t('intro') }] : []),
        { composant: 'Champ', libelle: t('libelleIdentifiant'), donnee: d('etat.identifiant'), nature: t('natureIdentifiant'), requis: true },
        { composant: 'Champ', libelle: t('libelleSecret'), donnee: d('etat.secret'), nature: 'secret', requis: true },
        bouton(g.seConnecter!, [{ faire: 'emit', evenement: 'connexion', charge: [{ champ: 'identifiant', depuis: d('etat.identifiant') }, { champ: 'secret', depuis: d('etat.secret') }] }, nav(t('apres'))], 'principal'),
        ...(route('inscription') !== null ? [bouton(v.libelleInscription !== undefined ? t('libelleInscription') : g.ajouter!, [nav(route('inscription')!)], 'discret')] : []),
        accueil]
      break
    case 'onboarding':
      corps = [titre(t('titre')), { composant: 'Pile', espace: 'm', enfants: v.etapes as O[] },
        ...(o.langues.length > 1 ? [{ composant: 'Pile', sens: 'ligne', espace: 's', enfants: o.langues.map((l) => bouton(l.libelle, [{ faire: 'emit', evenement: 'choisirLangue', valeur: l.code }], 'discret')) }] : []),
        bouton(t('libelleFin'), [nav(t('fin'))], 'principal', 'suivant')]
      break
    case 'accueil':
      corps = [titre(t('titre')), ...(v.intro !== undefined ? [{ composant: 'Phrase', texte: t('intro') }] : []),
        { composant: 'Pile', espace: 's', enfants: (v.raccourcis as { libelle: string; route: string }[]).map((x) => ({ composant: 'Encart', effets: [nav(x.route)], enfants: [{ composant: 'Phrase', texte: x.libelle }] })) }]
      break
    case 'liste': case 'dashboard': case 'tableAdmin': {
      const cols = v.colonnes as Col[]
      const detail = route('detail')
      const creation = route('creation')
      const edition = route('edition')
      const admin = r.archetype === 'tableAdmin'
      const modele: O[] = admin
        ? [{ composant: 'Encart', enfants: [...valeurs(cols), { composant: 'Pile', sens: 'ligne', espace: 's', enfants: [
            ...(edition !== null ? [bouton(g.modifier!, [nav(edition, 'ligne.id')], 'secondaire', 'modifier')] : []),
            bouton(g.supprimer!, [{ faire: 'submit', table: t('table'), ecriture: 'supprimer' }], 'danger', 'supprimer')] }] }]
        : [{ composant: 'Encart', ...(detail !== null ? { effets: [nav(detail, 'ligne.id')] } : {}), enfants: valeurs(cols) }]
      corps = [titre(t('titre')),
        ...(r.archetype === 'dashboard' && Array.isArray(v.raccourcis) && v.raccourcis.length > 0
          ? [{ composant: 'Pile', sens: 'ligne', espace: 's', enfants: (v.raccourcis as { libelle: string; route: string }[]).map((x) => ({ composant: 'Encart', effets: [nav(x.route)], enfants: [{ composant: 'Phrase', texte: x.libelle }] })) },
             { composant: 'Titre', texte: g.recents!, niveau: 'section' }]
          : []),
        ...(creation !== null ? [bouton(v.libelleCreation !== undefined ? t('libelleCreation') : g.ajouter!, [nav(creation)], 'principal', 'ajouter')] : []),
        { composant: 'Lignes', donnee: d(`table.${t('table')}`), vide: t('vide'), videAction: [nav(creation ?? 'accueil')], videLibelle: creation !== null ? (v.libelleCreation !== undefined ? t('libelleCreation') : g.ajouter!) : g.accueil!, modele },
        accueil]
      break
    }
    case 'recherche': {
      etat.push({ nom: 'q', nature: 'texte', initial: '' })
      const detail = route('detail')
      corps = [titre(t('titre')),
        { composant: 'Champ', libelle: t('libelleRecherche'), donnee: d('etat.q'), nature: 'texte' },
        { composant: 'Lignes', donnee: d(`table.${t('table')}`), filtre: [{ champ: t('colonneRecherche'), egal: d('etat.q') }], vide: t('vide'),
          videAction: [{ faire: 'setState', chemin: 'etat.q', valeur: '' }], videLibelle: g.effacer!,
          modele: [{ composant: 'Encart', ...(detail !== null ? { effets: [nav(detail, 'ligne.id')] } : {}), enfants: valeurs(v.colonnes as Col[]) }] },
        accueil]
      break
    }
    case 'detail': case 'profil':
      corps = [titre(t('titre')),
        { composant: 'Fiche', donnee: d(`table.${t('table')}`), vide: t('vide'), videAction: [nav(route('retour') ?? 'accueil')], videLibelle: g.retour!,
          modele: [...valeurs(v.colonnes as Col[]), ...((v.actions as O[] | undefined) ?? []),
            ...(r.archetype === 'profil' && route('edition') !== null ? [bouton(g.modifier!, [nav(route('edition')!)], 'secondaire', 'modifier')] : [])] },
        ...(route('retour') !== null ? [bouton(g.retour!, [nav(route('retour')!)], 'secondaire', 'retour')] : []),
        accueil]
      break
    case 'formulaire': {
      const champs = v.champs as { colonne: string; libelle: string; nature: string; requis?: boolean }[]
      for (const c of champs) etat.push({ nom: c.colonne, nature: c.nature === 'case' ? 'booleen' : c.nature === 'nombre' ? 'nombre' : 'texte' })
      corps = [titre(t('titre')),
        ...champs.map((c) => ({ composant: 'Champ', libelle: c.libelle, donnee: d(`etat.${c.colonne}`), nature: c.nature, ...(c.requis === true ? { requis: true } : {}) })),
        bouton(t('libelleEnvoi'), [{ faire: 'submit', table: t('table'), ecriture: 'creer', valeurs: champs.map((c) => ({ champ: c.colonne, depuis: d(`etat.${c.colonne}`) })) }, nav(t('apres'))], 'principal'),
        accueil]
      break
    }
    case 'checkout': {
      const moyens = (v.moyens as string[] | undefined) ?? []
      const champMoyen = route('champMoyen')
      if (moyens.length > 0 && champMoyen !== null) etat.push({ nom: 'moyen', nature: 'texte' })
      corps = [titre(t('titre')),
        { composant: 'Fiche', donnee: d(`table.${t('table')}`), vide: t('vide'), videAction: [nav('accueil')], videLibelle: g.accueil!,
          modele: [...valeurs(v.colonnes as Col[]), { composant: 'Valeur', libelle: (v.colonnes as Col[]).find((c) => c.colonne === t('colonneMontant'))?.libelle ?? t('colonneMontant'), donnee: d(`ligne.${t('colonneMontant')}`), format: 'montant' }] },
        ...(moyens.length > 0 && champMoyen !== null ? [{ composant: 'Champ', libelle: g.moyen!, donnee: d('etat.moyen'), nature: 'choix', requis: true, choix: moyens.map((m) => ({ valeur: m.replace(/[^\p{L}\p{N}_ .:@+-]/gu, ''), libelle: m })) }] : []),
        bouton(t('libellePayer'), [{ faire: 'submit', table: t('tablePaiement'), ecriture: 'creer', valeurs: [
          { champ: t('champMontant'), depuis: d(`parcours.${t('table')}.${t('colonneMontant')}`) },
          ...(moyens.length > 0 && champMoyen !== null ? [{ champ: champMoyen, depuis: d('etat.moyen') }] : []),
        ] }, nav(t('confirmation'))], 'principal', 'paiement'),
        accueil]
      break
    }
    case 'confirmation':
      corps = [{ composant: 'Message', nature: 'succes', texte: t('message') }, titre(t('titre')),
        { composant: 'Fiche', donnee: d(`table.${t('table')}`), vide: t('vide'), videAction: [nav('accueil')], videLibelle: g.accueil!, modele: valeurs(v.colonnes as Col[]) },
        { composant: 'Pile', sens: 'ligne', espace: 's', enfants: (v.suites as { libelle: string; route: string }[]).map((x, i) => bouton(x.libelle, [nav(x.route)], i === 0 ? 'principal' : 'secondaire')) }]
      break
    case 'compte':
      corps = [titre(t('titre')), { composant: 'Valeur', libelle: g.utilisateur!, donnee: d('session.utilisateur') },
        bouton(g.aide!, [nav('aide')], 'secondaire', 'aide'), bouton(g.contact!, [nav('contact')], 'secondaire', 'message'), bouton(g.legal!, [nav('legal')], 'secondaire', 'document'),
        bouton(g.deconnexion!, [{ faire: 'emit', evenement: 'deconnexion' }, nav('accueil')], 'danger'), accueil]
      break
    case 'pageDuCompte':
      corps = [titre(t('titre')), { composant: 'Phrase', texte: t('texte') }, bouton(g.retour!, [nav(t('retour'))], 'secondaire', 'retour')]
      break
    default:
      throw new Error(`archétype inconnu : ${r.archetype}`)
  }
  return { route: r.route, acces: r.acces, titre: t('titre'), ...(etat.length > 0 ? { etat } : {}), corps }
}
