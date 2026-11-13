/**
 * LES SPECS SYNTHÉTIQUES DE LA PREUVE — une base saine, puis des mutations
 * qui y injectent UNE faute chacune, avec la classe que le validateur doit
 * rendre. Aucune n'est tirée au hasard : la liste est déterministe et chaque
 * mutation dit ce qu'elle fait.
 *
 * La base couvre ce que le graphe exige : les routes du plan, le socle
 * (compte, aide, contact, légal), la tétrade de chaque table (journal : liste
 * et détail), une barre de trois onglets, le parcours lu, fr/en/ar.
 */
import type { Contexte } from '../validateur'
import type { Classe } from '../validateur'

export const CTX: Contexte = {
  routes: ['accueil', 'recherche', 'detail', 'paiement', 'confirmation'],
  roles: ['Particulier', 'Administrateur'],
  tables: [
    { nom: 'reservation', colonnes: ['chambre', 'montant', 'statut'] },
    { nom: 'offre', colonnes: ['nom', 'prix', 'ville'] },
    { nom: 'journal', colonnes: ['action', 'horodatage'], journal: true },
  ],
  langues: ['fr', 'en', 'ar'],
  devises: ['XAF'],
  moyensPaiement: ['Airtel Money'],
  pays: ['Tchad'],
  parcours: ['recherche', 'detail', 'paiement', 'confirmation'],
}

type O = Record<string, unknown>
const t = (cle: string) => ({ $t: cle })
const d = (chemin: string) => ({ $data: chemin })
const nav = (route: string, avec?: string): O => ({ faire: 'navigate', route, ...(avec !== undefined ? { avec: d(avec) } : {}) })
const bouton = (cle: string, effets: O[], extra: O = {}): O => ({ composant: 'Bouton', libelle: t(cle), effets, ...extra })
const ecran = (route: string, acces: string, corps: O[], extra: O = {}): O => ({ route, acces, titre: t(`${route.replace(/-/gu, '')}.titre`), ...extra, corps })

function tetrade(table: string, colonnes: readonly string[], journal: boolean): O[] {
  const liste = ecran(`${table}-liste`, 'Administrateur', [
    { composant: 'Lignes', donnee: d(`table.${table}`), vide: t(`${table}.vide`), modele: [
      { composant: 'Encart', effets: [nav(`${table}-detail`, 'ligne.id')], enfants: colonnes.map((c) => ({ composant: 'Valeur', libelle: t(`${table}.${c}`), donnee: d(`ligne.${c}`) })) },
    ] },
    ...(journal ? [] : [bouton(`${table}.ajouter`, [nav(`${table}-creer`)], { icone: 'ajouter' })]),
    bouton('commun.accueil', [nav('accueil')], { genre: 'discret' }),
  ], { tetrade: { table, vue: 'liste' } })
  const detail = ecran(`${table}-detail`, 'Administrateur', [
    ...colonnes.map((c) => ({ composant: 'Valeur', libelle: t(`${table}.${c}`), donnee: d(`ligne.${c}`) })),
    ...(journal ? [] : [
      bouton(`${table}.modifier`, [nav(`${table}-editer`)]),
      bouton(`${table}.supprimer`, [{ faire: 'submit', table, mode: 'supprimer' }, nav(`${table}-liste`)], { genre: 'danger' }),
    ]),
    bouton('commun.retour', [nav(`${table}-liste`)], { genre: 'secondaire' }),
  ], { tetrade: { table, vue: 'detail' } })
  if (journal) return [liste, detail]
  const creer = ecran(`${table}-creer`, 'Administrateur', [
    ...colonnes.map((c) => ({ composant: 'Champ', libelle: t(`${table}.${c}`), donnee: d(`etat.${c}`), nature: 'texte', requis: true })),
    bouton(`${table}.enregistrer`, [{ faire: 'submit', table, mode: 'creer', valeurs: colonnes.map((c) => ({ champ: c, depuis: d(`etat.${c}`) })) }, nav(`${table}-liste`)], { genre: 'principal' }),
    bouton('commun.retour', [nav(`${table}-liste`)], { genre: 'secondaire' }),
  ], { tetrade: { table, vue: 'creer' }, etat: colonnes.map((c) => ({ nom: c, nature: 'texte' })) })
  const editer = ecran(`${table}-editer`, 'Administrateur', [
    ...colonnes.map((c) => ({ composant: 'Champ', libelle: t(`${table}.${c}`), donnee: d(`ligne.${c}`), nature: 'texte' })),
    bouton(`${table}.enregistrer`, [{ faire: 'submit', table, mode: 'modifier', valeurs: colonnes.map((c) => ({ champ: c, depuis: d(`ligne.${c}`) })) }, nav(`${table}-detail`)], { genre: 'principal' }),
    bouton('commun.retour', [nav(`${table}-detail`)], { genre: 'secondaire' }),
  ], { tetrade: { table, vue: 'editer' } })
  return [liste, detail, creer, editer]
}

/** Les textes : chaque clé employée, dans chaque langue lue. */
const TEXTES_PARTICULIERS: Record<string, Record<string, string>> = {
  'langue.fr': { fr: 'Français', en: 'Français', ar: 'Français' },
  'langue.en': { fr: 'English', en: 'English', ar: 'English' },
  'langue.ar': { fr: 'العربية', en: 'العربية', ar: 'العربية' },
  'paiement.moyen': { fr: 'Paiement par Airtel Money au Tchad, en XAF', en: 'Pay with Airtel Money in Tchad, in XAF', ar: 'الدفع عبر Airtel Money في Tchad بعملة XAF' },
}

function clesDe(x: unknown, s: Set<string>): Set<string> {
  if (Array.isArray(x)) for (const y of x) clesDe(y, s)
  else if (typeof x === 'object' && x !== null) {
    const o = x as O
    if (typeof o.$t === 'string') s.add(o.$t)
    for (const v of Object.values(o)) clesDe(v, s)
  }
  return s
}

export function traduire(ecrans: unknown): O[] {
  const cles = [...clesDe(ecrans, new Set())].sort()
  return ['fr', 'en', 'ar'].map((langue) => ({
    langue,
    textes: cles.map((cle) => ({ cle, texte: TEXTES_PARTICULIERS[cle]?.[langue] ?? `${langue} ${cle.replace(/\./gu, ' ')}` })),
  }))
}

export function base(): O {
  const ecrans: O[] = [
    ecran('accueil', 'visiteur', [
      { composant: 'Titre', texte: t('accueil.bienvenue'), niveau: 'page' },
      { composant: 'Phrase', texte: t('accueil.intro'), taille: 'corps', couleur: 'texteDiscret' },
      { composant: 'Pile', sens: 'ligne', espace: 'm', aligner: 'debut', enfants: [
        bouton('accueil.chercher', [nav('recherche')], { genre: 'principal', icone: 'recherche' }),
        bouton('accueil.detail', [nav('detail')], { genre: 'secondaire' }),
        bouton('accueil.payer', [nav('paiement')], { genre: 'secondaire' }),
        bouton('accueil.confirmation', [nav('confirmation')], { genre: 'secondaire' }),
      ] },
      { composant: 'Encart', fond: 'surface', elevation: 'leve', rayon: 'm', espace: 'l', enfants: [
        bouton('accueil.reservations', [nav('reservation-liste')], { genre: 'discret' }),
        bouton('accueil.offres', [nav('offre-liste')], { genre: 'discret' }),
        bouton('accueil.journal', [nav('journal-liste')], { genre: 'discret' }),
      ] },
      { composant: 'Pile', sens: 'ligne', espace: 's', enfants: [
        bouton('langue.fr', [{ faire: 'emit', evenement: 'choisirLangue', valeur: 'fr' }], { genre: 'discret' }),
        bouton('langue.en', [{ faire: 'emit', evenement: 'choisirLangue', valeur: 'en' }], { genre: 'discret' }),
        bouton('langue.ar', [{ faire: 'emit', evenement: 'choisirLangue', valeur: 'ar' }], { genre: 'discret' }),
      ] },
      { composant: 'Pile', espace: 'xs', enfants: [
        bouton('compte.aide', [nav('aide')], { genre: 'discret' }),
        bouton('compte.contact', [nav('contact')], { genre: 'discret' }),
        bouton('compte.legal', [nav('legal')], { genre: 'discret' }),
      ] },
    ]),
    ecran('recherche', 'visiteur', [
      { composant: 'Champ', libelle: t('recherche.ville'), donnee: d('etat.ville'), nature: 'texte', aide: t('recherche.villeAide') },
      bouton('recherche.effacer', [{ faire: 'setState', chemin: 'etat.ville', valeur: '' }], { genre: 'discret', icone: 'fermer' }),
      { composant: 'Lignes', donnee: d('table.offre'), filtre: [{ champ: 'ville', egal: d('etat.ville') }], vide: t('recherche.vide'), modele: [
        { composant: 'Encart', elevation: 'plat', effets: [nav('detail', 'ligne.id')], enfants: [
          { composant: 'Valeur', donnee: d('ligne.nom') },
          { composant: 'Valeur', libelle: t('recherche.prix'), donnee: d('ligne.prix'), format: 'montant' },
        ] },
      ] },
      bouton('commun.accueil', [nav('accueil')], { genre: 'secondaire' }),
    ], { etat: [{ nom: 'ville', nature: 'texte', initial: '' }] }),
    ecran('detail', 'visiteur', [
      { composant: 'Valeur', libelle: t('detail.nom'), donnee: d('parcours.offre.nom') },
      { composant: 'Valeur', libelle: t('detail.prix'), donnee: d('parcours.offre.prix'), format: 'montant' },
      bouton('detail.reserver', [nav('paiement')], { genre: 'principal' }),
      bouton('commun.retour', [nav('recherche')], { genre: 'secondaire', icone: 'retour' }),
    ]),
    ecran('paiement', 'Particulier', [
      { composant: 'Phrase', texte: t('paiement.moyen') },
      { composant: 'Champ', libelle: t('paiement.chambre'), donnee: d('etat.chambre'), nature: 'texte', requis: true },
      bouton('paiement.payer', [
        { faire: 'submit', table: 'reservation', mode: 'creer', valeurs: [
          { champ: 'chambre', depuis: d('etat.chambre') }, { champ: 'montant', depuis: d('parcours.offre.prix') }, { champ: 'statut', depuis: 'payee' },
        ] },
        nav('confirmation'),
      ], { genre: 'principal', icone: 'paiement' }),
      bouton('commun.retour', [nav('detail')], { genre: 'secondaire' }),
    ], { etat: [{ nom: 'chambre', nature: 'texte' }] }),
    ecran('confirmation', 'Particulier', [
      { composant: 'Message', nature: 'succes', texte: t('confirmation.message') },
      { composant: 'Valeur', libelle: t('confirmation.chambre'), donnee: d('parcours.reservation.chambre') },
      { composant: 'Trait', espace: 'm' },
      bouton('commun.accueil', [nav('accueil')], { genre: 'principal' }),
      bouton('confirmation.mesReservations', [nav('reservation-liste')], { genre: 'secondaire' }),
    ]),
    ecran('compte', 'visiteur', [
      { composant: 'Valeur', libelle: t('compte.utilisateur'), donnee: d('session.utilisateur') },
      bouton('compte.aide', [nav('aide')], { icone: 'aide' }),
      bouton('compte.contact', [nav('contact')]),
      bouton('compte.legal', [nav('legal')]),
      bouton('compte.deconnexion', [{ faire: 'emit', evenement: 'deconnexion' }, nav('accueil')], { genre: 'danger' }),
    ]),
    ...['aide', 'contact', 'legal'].map((r) => ecran(r, 'visiteur', [
      { composant: 'Phrase', texte: t(`${r}.texte`) },
      bouton('commun.retour', [nav('compte')], { genre: 'secondaire' }),
    ])),
    ...tetrade('reservation', ['chambre', 'montant', 'statut'], false),
    ...tetrade('offre', ['nom', 'prix', 'ville'], false),
    ...tetrade('journal', ['action', 'horodatage'], true),
  ]
  return { ecrans, barre: ['accueil', 'recherche', 'compte'], traductions: traduire(ecrans) }
}

// ── LES MUTATIONS ─────────────────────────────────────────────────────────
export type Cas = { readonly classe: Classe; readonly quoi: string; readonly spec: O }

const ecranDe = (s: O, route: string) => (s.ecrans as O[]).find((e) => e.route === route)!
/** Tous les nœuds d'une spec (corps, enfants, modèles), dans l'ordre. */
function noeuds(s: O): O[] {
  const r: O[] = []
  const voir = (n: unknown) => {
    if (typeof n !== 'object' || n === null || Array.isArray(n)) return
    const o = n as O
    if (typeof o.composant === 'string') r.push(o)
    for (const k of ['corps', 'enfants', 'modele']) if (Array.isArray(o[k])) for (const m of o[k] as unknown[]) voir(m)
  }
  for (const e of s.ecrans as O[]) voir(e)
  return r
}
const de = (s: O, composant: string, rang = 0) => noeuds(s).filter((n) => n.composant === composant)[rang]!
/** Les actions d'une spec, avec leur bouton porteur. */
function actions(s: O, faire: string): O[] {
  const r: O[] = []
  for (const n of noeuds(s)) for (const a of (n.effets as O[] | undefined) ?? []) if (a.faire === faire) r.push(a)
  return r
}
const fr = (s: O) => (s.traductions as O[]).find((x) => x.langue === 'fr')!
const texteFr = (s: O, cle: string) => ((fr(s).textes as O[]).find((x) => x.cle === cle)!)

export function cas(): Cas[] {
  const r: Cas[] = []
  const m = (classe: Classe, quoi: string, f: (s: O) => void) => { const s = base(); f(s); r.push({ classe, quoi, spec: s }) }
  const N = noeuds(base()).length

  // ── COUCHE 1
  const empruntes = ['Button', 'Card', 'View', 'Text', 'TextField', 'Stack', 'Typography', 'Badge', 'Divider', 'Image', 'Alert', 'FlatList', 'Pressable', 'CarteVedette', 'EnTeteDeSection', 'Grid', 'Paragraph', 'Title', 'List']
  empruntes.forEach((nom, i) => { m('COMPOSANT_INCONNU', `composant ${nom}`, (s) => { noeuds(s)[(i * 7) % N]!.composant = nom }) })
  ;['form', 'Form', 'FORM', 'Formulaire', 'formulaire', 'form', 'Form', 'Formulaire', 'formulaire', 'Formular'].forEach((nom, i) => {
    m('FORMULAIRE_NATIF', `composant ${nom}`, (s) => { noeuds(s)[(i * 11 + 3) % N]!.composant = nom })
  })
  ;['couleurFond', 'marge', 'ombre', 'largeur', 'police', 'visible', 'actif', 'lien', 'cible', 'infobulle', 'souligne', 'gras'].forEach((k, i) => {
    m('PROP_INCONNUE', `prop ${k}`, (s) => { noeuds(s)[(i * 5 + 1) % N]![k] = 'x' })
  })
  ;['className', 'style', 'onClick', 'href', 'id', 'onSubmit', 'htmlFor', 'aria-label', 'tabIndex', 'src', 'children', 'role', 'onPress', 'data-test', 'padding', 'color'].forEach((k, i) => {
    m('ATTRIBUT_DOM', `attribut ${k}`, (s) => { noeuds(s)[(i * 3 + 2) % N]![k] = k === 'style' ? { padding: 8 } : 'x' })
  })
  const requis: [string, string][] = [['Titre', 'texte'], ['Phrase', 'texte'], ['Valeur', 'donnee'], ['Bouton', 'libelle'], ['Champ', 'libelle'], ['Champ', 'donnee'], ['Champ', 'nature'], ['Lignes', 'donnee'], ['Lignes', 'modele'], ['Lignes', 'vide'], ['Message', 'nature'], ['Message', 'texte'], ['Encart', 'enfants'], ['Pile', 'enfants']]
  for (const [c, p] of requis) m('PROP_MANQUANTE', `${c} sans ${p}`, (s) => { delete de(s, c)[p] })
  for (const k of ['route', 'acces', 'titre', 'corps']) m('PROP_MANQUANTE', `écran sans ${k}`, (s) => { delete ecranDe(s, 'aide')[k] })
  m('PROP_MANQUANTE', 'navigate sans route', (s) => { delete actions(s, 'navigate')[3]!.route })
  m('PROP_MANQUANTE', 'submit sans table', (s) => { delete actions(s, 'submit')[0]!.table })
  m('PROP_MANQUANTE', 'submit sans mode', (s) => { delete actions(s, 'submit')[1]!.mode })
  m('PROP_MANQUANTE', 'setState sans valeur', (s) => { delete actions(s, 'setState')[0]!.valeur })
  m('PROP_MANQUANTE', 'emit sans événement', (s) => { delete actions(s, 'emit')[0]!.evenement })
  m('PROP_MANQUANTE', 'choisirLangue sans valeur', (s) => { delete actions(s, 'emit')[1]!.valeur })
  m('PROP_MANQUANTE', 'spec sans barre', (s) => { delete s.barre })
  m('PROP_MANQUANTE', 'spec sans traductions', (s) => { delete s.traductions })
  const variantes: [string, string, string, number][] = [
    ['Bouton', 'genre', 'primary', 0], ['Bouton', 'genre', 'primaire', 3], ['Bouton', 'genre', 'outline', 6], ['Bouton', 'genre', 'gauche', 9],
    ['Pile', 'sens', 'row', 0], ['Pile', 'sens', 'horizontal', 1], ['Pile', 'aligner', 'left', 0], ['Pile', 'aligner', 'center', 0], ['Pile', 'aligner', 'start', 0],
    ['Valeur', 'format', 'currency', 1], ['Valeur', 'format', 'prix', 2], ['Champ', 'nature', 'email', 0], ['Champ', 'nature', 'password', 1],
    ['Champ', 'nature', 'select', 2], ['Titre', 'niveau', 'h1', 0], ['Titre', 'niveau', '1', 0], ['Message', 'nature', 'empty', 0], ['Message', 'nature', 'loading', 0],
  ]
  for (const [c, p, v, i] of variantes) m('VARIANTE_INCONNUE', `${c}.${p} = ${v}`, (s) => { de(s, c, i)[p] = v })
  m('VARIANTE_INCONNUE', 'submit mode create', (s) => { actions(s, 'submit')[0]!.mode = 'create' })
  m('VARIANTE_INCONNUE', 'submit mode delete', (s) => { actions(s, 'submit')[2]!.mode = 'delete' })
  const jetons: [string, string, string][] = [
    ['Pile', 'espace', 'var(--espace-m)'], ['Pile', 'espace', '--space-m'], ['Pile', 'espace', 'JETONS.ESPACE.m'], ['Pile', 'espace', '16px'], ['Pile', 'espace', '2rem'],
    ['Pile', 'espace', 'md'], ['Encart', 'espace', 'lg'], ['Encart', 'rayon', 'var(--radius-md)'], ['Encart', 'rayon', 'rounded'], ['Encart', 'fond', '#ff0000'],
    ['Encart', 'fond', 'primary'], ['Encart', 'fond', 'var(--primary)'], ['Encart', 'elevation', 'shadow-lg'], ['Phrase', 'couleur', 'muted-foreground'],
    ['Phrase', 'taille', 'var(--text-sm)'], ['Phrase', 'taille', '14px'], ['Trait', 'espace', 'xxl'], ['Encart', 'elevation', 'ombre'], ['Phrase', 'couleur', 'gris'], ['Pile', 'espace', 'var(--space-m, 1rem)'],
  ]
  for (const [c, p, v] of jetons) m('JETON_INCONNU', `${c}.${p} = ${v}`, (s) => { de(s, c)[p] = v })
  ;['search', 'chargement', 'home', 'user', 'spinner', 'loader', 'arrow-left', 'info', 'trash', 'credit-card'].forEach((v, i) => {
    m('ICONE_INCONNUE', `icone ${v}`, (s) => { (noeuds(s).filter((n) => n.composant === 'Bouton')[i * 4]!).icone = v })
  })
  const litteraux: [string, (s: O) => void][] = [
    ['titre de l’accueil', (s) => { ecranDe(s, 'accueil').titre = 'Bienvenue' }],
    ['titre de la recherche', (s) => { ecranDe(s, 'recherche').titre = 'Recherche' }],
    ['titre du compte', (s) => { ecranDe(s, 'compte').titre = 'Mon compte' }],
    ...[0, 2, 5, 8, 13, 21, 34].map((i): [string, (s: O) => void] => [`libellé du bouton ${String(i)}`, (s) => { noeuds(s).filter((n) => n.composant === 'Bouton')[i]!.libelle = 'Valider' }]),
    ['texte d’une phrase', (s) => { de(s, 'Phrase').texte = 'Bienvenue sur Hayine' }],
    ['vide de Lignes', (s) => { de(s, 'Lignes').vide = 'Aucune offre' }],
    ['libellé d’un champ', (s) => { de(s, 'Champ').libelle = 'Ville' }],
    ['aide d’un champ', (s) => { de(s, 'Champ').aide = 'Ex. : NDjamena' }],
    ['texte d’un message', (s) => { de(s, 'Message').texte = 'Réservation confirmée' }],
    ['titre d’une page', (s) => { de(s, 'Titre').texte = 'Accueil' }],
  ]
  for (const [quoi, f] of litteraux) m('TEXTE_LITTERAL', quoi, f)
  ;['Titre Recherche', 'recherche..titre', '1titre', 'recherche titre', 'Recherche.titre', 'recherche-titre'].forEach((k, i) => {
    m('CLE_INVALIDE', `clé ${k}`, (s) => { noeuds(s).filter((n) => n.composant === 'Bouton')[i * 3]!.libelle = { $t: k } })
  })
  m('CLE_INVALIDE', 'clé de traduction invalide', (s) => { texteFr(s, 'accueil.titre').cle = 'Accueil Titre' })
  m('CLE_INVALIDE', 'clé de traduction vide', (s) => { texteFr(s, 'aide.texte').cle = '' })
  const liaisons = ['langue.courante', 'window.location.href', 'props.offre', 'JETONS.ESPACE', 'localStorage.panier', 'session.email', 'table.offre.nom', 'parcours.offre', 'etat', 'useLangue.langue']
  liaisons.forEach((v, i) => { m('LIAISON_HORS_CONTRAT', `$data ${v}`, (s) => { noeuds(s).filter((n) => n.composant === 'Valeur')[i % 12]!.donnee = { $data: v } }) })
  m('LIAISON_HORS_CONTRAT', 'setState vers window', (s) => { actions(s, 'setState')[0]!.chemin = 'window.titre' })
  ;['recharger', 'ouvrirUrl', 'goBack', 'alert', 'reload', 'naviguer', 'enregistrer', 'log', 'windowLocation', 'fetch'].forEach((f, i) => {
    m('ACTION_INCONNUE', `faire ${f}`, (s) => { actions(s, 'navigate')[i * 5]!.faire = f })
  })
  ;[0, 4, 9, 15, 22].forEach((i) => { m('ACTION_MANQUANTE', `Bouton ${String(i)} effets []`, (s) => { noeuds(s).filter((n) => n.composant === 'Bouton')[i]!.effets = [] }) })
  ;[1, 7, 12, 30].forEach((i) => { m('ACTION_MANQUANTE', `Bouton ${String(i)} sans effets`, (s) => { delete noeuds(s).filter((n) => n.composant === 'Bouton')[i]!.effets }) })
  m('ACTION_MANQUANTE', 'Encart effets []', (s) => { de(s, 'Encart', 1).effets = [] })
  ;['logout', 'refresh', 'imprimer', 'fermer', 'appeler', 'choisirTheme'].forEach((ev, i) => {
    m('EVENEMENT_INCONNU', `événement ${ev}`, (s) => { actions(s, 'emit')[i % 4]!.evenement = ev })
  })
  const types: [string, (s: O) => void][] = [
    ['corps objet', (s) => { ecranDe(s, 'aide').corps = { composant: 'Phrase' } }],
    ['enfants chaîne', (s) => { de(s, 'Pile').enfants = 'boutons' }],
    ['requis « oui »', (s) => { de(s, 'Champ', 1).requis = 'oui' }],
    ['effets objet', (s) => { de(s, 'Bouton', 2).effets = { faire: 'navigate', route: 'accueil' } }],
    ['traductions objet', (s) => { s.traductions = { fr: {} } }],
    ['écran chaîne', (s) => { (s.ecrans as unknown[])[3] = 'paiement' }],
    ['etat objet', (s) => { ecranDe(s, 'recherche').etat = { ville: 'texte' } }],
    ['barre chaîne', (s) => { s.barre = 'accueil' }],
    ['texte nombre', (s) => { de(s, 'Titre').texte = 42 }],
    ['liaison chaîne', (s) => { de(s, 'Valeur', 3).donnee = 'parcours.offre.nom' }],
  ]
  for (const [quoi, f] of types) m('TYPE_INVALIDE', quoi, f)
  const valeurs: [string, (s: O) => void][] = [
    ['route « Détail Offre »', (s) => { ecranDe(s, 'detail').route = 'Détail Offre' }],
    ['route « detail_offre »', (s) => { actions(s, 'navigate')[1]!.route = 'detail_offre' }],
    ['route « Paiement »', (s) => { actions(s, 'navigate')[2]!.route = 'Paiement' }],
    ['vue « list »', (s) => { (ecranDe(s, 'offre-liste').tetrade as O).vue = 'list' }],
    ['nature d’état « string »', (s) => { ((ecranDe(s, 'recherche').etat as O[])[0]!).nature = 'string' }],
    ['accès vide', (s) => { ecranDe(s, 'aide').acces = '' }],
    ['corps vide', (s) => { ecranDe(s, 'legal').corps = [] }],
    ['aucun écran', (s) => { s.ecrans = [] }],
    ['valeur à balise', (s) => { ((actions(s, 'submit')[0]!.valeurs as O[])[2]!).depuis = '<b>payee</b>' }],
    ['table « Réservation »', (s) => { actions(s, 'submit')[0]!.table = 'Réservation' }],
    ['code langue « arabe »', (s) => { actions(s, 'emit')[3]!.valeur = 'arabe' }],
    ['code langue « FR »', (s) => { (fr(s)).langue = 'FR' }],
  ]
  for (const [quoi, f] of valeurs) m('VALEUR_INVALIDE', quoi, f)
  ;['<b>Payer</b>', 'Ligne 1<br/>Ligne 2', '<script>alert(1)</script>', '<a href="x">lien</a>', '<!-- note -->', '</div>'].forEach((v, i) => {
    m('HTML_DANS_TEXTE', `texte ${v}`, (s) => { ((fr(s).textes as O[])[i * 9]!).texte = v })
  })

  // ── COUCHE 2 : LE CONTEXTE
  m('TABLE_INCONNUE', 'submit « reservations »', (s) => { actions(s, 'submit')[0]!.table = 'reservations' })
  m('TABLE_INCONNUE', 'submit « commande »', (s) => { actions(s, 'submit')[3]!.table = 'commande' })
  m('TABLE_INCONNUE', 'Lignes table.client', (s) => { de(s, 'Lignes').donnee = d('table.client') })
  m('TABLE_INCONNUE', 'parcours.client.nom', (s) => { de(s, 'Valeur', 3).donnee = d('parcours.client.nom') })
  m('TABLE_INCONNUE', 'parcours.offres.prix', (s) => { de(s, 'Valeur', 4).donnee = d('parcours.offres.prix') })
  const champs: [string, (s: O) => void][] = [
    ['submit offre_id', (s) => { ((actions(s, 'submit')[0]!.valeurs as O[])[0]!).champ = 'offre_id' }],
    ['submit cree_le', (s) => { ((actions(s, 'submit')[0]!.valeurs as O[])[2]!).champ = 'cree_le' }],
    ['submit montant_total', (s) => { ((actions(s, 'submit')[0]!.valeurs as O[])[1]!).champ = 'montant_total' }],
    ['ligne.prix_total', (s) => { (((de(s, 'Lignes').modele as O[])[0]!.enfants as O[])[1]!).donnee = d('ligne.prix_total') }],
    ['parcours.offre.tarif', (s) => { de(s, 'Valeur', 4).donnee = d('parcours.offre.tarif') }],
    ['filtre categorie', (s) => { ((de(s, 'Lignes').filtre as O[])[0]!).champ = 'categorie' }],
    ['parcours.reservation.numero', (s) => { de(s, 'Valeur', 5).donnee = d('parcours.reservation.numero') }],
  ]
  for (const [quoi, f] of champs) m('CHAMP_INCONNU', quoi, f)
  ;['admin', 'Client', 'superviseur', 'gestionnaire'].forEach((r, i) => { m('ROLE_INCONNU', `accès ${r}`, (s) => { (s.ecrans as O[])[i * 4 + 2]!.acces = r }) })
  m('LANGUE_HORS_LECTURE', 'traduction sw', (s) => { (s.traductions as O[]).push({ ...fr(s), langue: 'sw' }) })
  m('LANGUE_HORS_LECTURE', 'texte Kiswahili', (s) => { texteFr(s, 'aide.texte').texte = 'Disponible en Kiswahili' })
  m('LANGUE_HORS_LECTURE', 'texte Español', (s) => { texteFr(s, 'legal.texte').texte = 'Version Español' })
  m('LANGUE_HORS_LECTURE', 'choisirLangue es', (s) => { actions(s, 'emit')[1]!.valeur = 'es' })
  m('LANGUE_HORS_LECTURE', 'traduction de', (s) => { (s.traductions as O[]).push({ ...fr(s), langue: 'de' }) })
  m('DEVISE_HORS_LECTURE', 'USD', (s) => { texteFr(s, 'detail.prix').texte = 'Prix en USD' })
  m('DEVISE_HORS_LECTURE', '€', (s) => { texteFr(s, 'recherche.prix').texte = 'Prix (€)' })
  m('DEVISE_HORS_LECTURE', 'EUR', (s) => { texteFr(s, 'aide.texte').texte = 'Tarifs en EUR' })
  m('DEVISE_HORS_LECTURE', 'littéral USD', (s) => { ((actions(s, 'submit')[0]!.valeurs as O[])[2]!).depuis = 'USD' })
  m('PAIEMENT_HORS_LECTURE', 'Orange Money', (s) => { texteFr(s, 'paiement.moyen').texte = 'Payer avec Orange Money' })
  m('PAIEMENT_HORS_LECTURE', 'PayPal', (s) => { texteFr(s, 'aide.texte').texte = 'Remboursement par PayPal' })
  m('PAIEMENT_HORS_LECTURE', 'M-Pesa', (s) => { texteFr(s, 'contact.texte').texte = 'Paiement M-Pesa accepté' })
  m('PAYS_HORS_LECTURE', 'Cameroun', (s) => { texteFr(s, 'contact.texte').texte = 'Agences au Cameroun' })
  m('PAYS_HORS_LECTURE', 'Kenya', (s) => { texteFr(s, 'aide.texte').texte = 'Livré au Kenya' })
  m('PAYS_HORS_LECTURE', 'Nigeria', (s) => { texteFr(s, 'legal.texte').texte = 'Société de droit Nigeria' })
  m('TRADUCTION_MANQUANTE', 'clé absente en anglais', (s) => { const en = (s.traductions as O[])[1]!; en.textes = (en.textes as O[]).slice(1) })
  m('TRADUCTION_MANQUANTE', 'arabe absent', (s) => { s.traductions = (s.traductions as O[]).slice(0, 2) })
  m('TRADUCTION_MANQUANTE', 'clé nouvelle en français seul', (s) => { de(s, 'Phrase').texte = t('accueil.nouveau'); (fr(s).textes as O[]).push({ cle: 'accueil.nouveau', texte: 'Nouveau' }) })
  m('TRADUCTION_MANQUANTE', 'texte vide en arabe', (s) => { (((s.traductions as O[])[2]!.textes as O[])[4]!).texte = ' ' })
  m('ETAT_INCONNU', 'setState etat.inconnu', (s) => { actions(s, 'setState')[0]!.chemin = 'etat.inconnu' })
  m('ETAT_INCONNU', 'si etat.ouvert', (s) => { de(s, 'Phrase', 1).si = d('etat.ouvert') })
  m('ETAT_INCONNU', 'filtre etat.categorie', (s) => { (de(s, 'Lignes').filtre as O[]).push({ champ: 'nom', egal: d('etat.categorie') }) })
  m('ECRITURE_HORS_ETAT', 'setState parcours', (s) => { actions(s, 'setState')[0]!.chemin = 'parcours.reservation.statut' })
  m('ECRITURE_HORS_ETAT', 'setState table', (s) => { actions(s, 'setState')[0]!.chemin = 'table.offre' })
  m('ECRITURE_HORS_ETAT', 'setState session', (s) => { actions(s, 'setState')[0]!.chemin = 'session.role' })
  for (const route of ['recherche', 'detail', 'confirmation', 'aide']) {
    m('ACTION_SANS_EFFET', `bouton d’onglet muet sur ${route}`, (s) => {
      const e = ecranDe(s, route)
      e.etat = [...((e.etat as O[] | undefined) ?? []), { nom: 'onglet', nature: 'texte' }]
      ;(e.corps as O[]).unshift(bouton(`${route}.titre`, [{ faire: 'setState', chemin: 'etat.onglet', valeur: 'tout' }]))
    })
  }
  for (const route of ['detail', 'confirmation', 'contact']) {
    m('CHAMP_SANS_EFFET', `champ muet sur ${route}`, (s) => {
      const e = ecranDe(s, route)
      e.etat = [...((e.etat as O[] | undefined) ?? []), { nom: 'note', nature: 'texte' }]
      ;(e.corps as O[]).unshift({ composant: 'Champ', libelle: t(`${route}.titre`), donnee: d('etat.note'), nature: 'texte' })
    })
  }
  m('LIAISON_HORS_PORTEE', 'ligne.nom sur le détail', (s) => { de(s, 'Valeur', 3).donnee = d('ligne.nom') })
  m('LIAISON_HORS_PORTEE', 'ligne.chambre sur le compte', (s) => { (ecranDe(s, 'compte').corps as O[])[0]!.donnee = d('ligne.chambre') })
  m('LIAISON_HORS_PORTEE', 'Lignes sur un état', (s) => { de(s, 'Lignes').donnee = d('etat.ville') })

  // ── COUCHE 2 : LE GRAPHE
  m('ROUTE_SANS_ECRAN', 'navigate paiment', (s) => { actions(s, 'navigate').find((a) => a.route === 'paiement')!.route = 'paiment' })
  m('ROUTE_SANS_ECRAN', 'navigate confirmations', (s) => { actions(s, 'navigate').find((a) => a.route === 'confirmation')!.route = 'confirmations' })
  m('ROUTE_SANS_ECRAN', 'navigate offre-listes', (s) => { actions(s, 'navigate').find((a) => a.route === 'offre-liste')!.route = 'offre-listes' })
  m('ROUTE_SANS_ECRAN', 'barre profil', (s) => { (s.barre as string[])[2] = 'profil' })
  m('ROUTE_DOUBLE', 'aide en double', (s) => { (s.ecrans as O[]).push(structuredClone(ecranDe(s, 'aide'))) })
  m('ROUTE_DOUBLE', 'contact en double', (s) => { (s.ecrans as O[]).push(structuredClone(ecranDe(s, 'contact'))) })
  for (const route of ['promo', 'tableau-de-bord']) {
    m('ROUTE_HORS_PLAN', `écran ${route}`, (s) => {
      ;(s.ecrans as O[]).push(ecran(route, 'visiteur', [bouton('commun.accueil', [nav('accueil')])]))
      ;((ecranDe(s, 'accueil').corps as O[])).push(bouton('commun.retour', [nav(route)]))
      s.traductions = traduire(s.ecrans)
    })
  }
  m('ECRAN_SANS_ENTREE', 'journal-detail sans entrée', (s) => { ((((ecranDe(s, 'journal-liste').corps as O[])[0]!.modele as O[])[0]!.effets as O[])[0]!).route = 'accueil' })
  m('ECRAN_SANS_ENTREE', 'offre-editer sans entrée', (s) => { actions(s, 'navigate').find((a) => a.route === 'offre-editer')!.route = 'offre-liste' })
  m('ECRAN_SANS_ENTREE', 'reservation-creer sans entrée', (s) => { actions(s, 'navigate').find((a) => a.route === 'reservation-creer')!.route = 'accueil' })
  for (const route of ['aide', 'contact', 'legal']) {
    m('ECRAN_SANS_SORTIE', `${route} sans sortie`, (s) => { ((ecranDe(s, route).corps as O[])[1]!).effets = [{ faire: 'emit', evenement: 'partager' }] })
  }
  m('TETRADE_INCOMPLETE', 'offre sans editer', (s) => { (ecranDe(s, 'offre-editer').tetrade as O).vue = 'detail' })
  m('TETRADE_INCOMPLETE', 'reservation sans creer', (s) => { (ecranDe(s, 'reservation-creer').tetrade as O).vue = 'liste' })
  m('TETRADE_INCOMPLETE', 'journal sans detail', (s) => { (ecranDe(s, 'journal-detail').tetrade as O).vue = 'editer' })
  m('COMPTE_INCOMPLET', 'compte sans déconnexion', (s) => { ((ecranDe(s, 'compte').corps as O[])[4]!).effets = [nav('accueil')] })
  for (const [i, r] of [[1, 'aide'], [2, 'contact'], [3, 'legal']] as const) {
    m('COMPTE_INCOMPLET', `compte sans ${r}`, (s) => { ((ecranDe(s, 'compte').corps as O[])[i]!).effets = [nav('accueil')] })
  }
  m('BARRE_HORS_BORNES', 'deux onglets', (s) => { s.barre = ['accueil', 'recherche'] })
  m('BARRE_HORS_BORNES', 'six onglets', (s) => { s.barre = ['accueil', 'recherche', 'compte', 'aide', 'contact', 'legal'] })
  m('BARRE_HORS_BORNES', 'onglet en double', (s) => { s.barre = ['accueil', 'accueil', 'recherche'] })
  m('PARCOURS_ROMPU', 'recherche ne mène pas au détail', (s) => { (((de(s, 'Lignes').modele as O[])[0]!.effets as O[])[0]!).route = 'accueil' })
  m('PARCOURS_ROMPU', 'détail ne mène pas au paiement', (s) => { ((((ecranDe(s, 'detail').corps as O[])[2]!.effets as O[])[0]!)).route = 'accueil' })
  m('PARCOURS_ROMPU', 'paiement ne mène pas à la confirmation', (s) => { (((ecranDe(s, 'paiement').corps as O[])[2]!.effets as O[])).pop() })
  return r
}
