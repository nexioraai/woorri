/**
 * APPELÉ PAR LES TESTS, PAR CONSTRUCTION — à l’étape 1 seulement (EP-365) : branché par l’étape 4.
 *
 * LE CONTRAT DES ÉCRANS — étape 1 du plan « assembler plutôt qu'inventer ».
 *
 * UNE SEULE SOURCE. Tout ce qui parle du contrat en DÉRIVE, par code :
 *   - le schéma Zod (`SchemaSpec`, `SchemaFragment`) et son schéma JSON ;
 *   - la consigne donnée au modèle (`consigne.ts`) ;
 *   - le validateur et ses classes de refus (`validateur.ts`).
 * Consigne et juge ne peuvent donc plus se contredire : en 3c-2, la consigne
 * imposait `../systeme/langue` que le juge des imports refusait (13 tentatives
 * sur 27 de 5b1c20bc). Ici, il n'existe qu'une table.
 *
 * Ce que le contrat RETIRE au modèle, et pourquoi (mesures 94cf0489, 5b1c20bc) :
 *   - les valeurs de style : seuls des JETONS nommés, en énumérations, jamais
 *     une valeur (« var(--espace-m) » ×27, « JETONS.ESPACE.m » ×4) ;
 *   - le texte : seulement des clés `$t`, traduites dans chaque langue lue
 *     (un seul écran du modèle sur ~30 était traduit en fr/en/ar) ;
 *   - les données : seulement des chemins `$data` vers des tables et colonnes
 *     déclarées (le détail « sain » de 5b1c20bc écrivait cinq colonnes absentes) ;
 *   - le comportement : quatre actions, navigate / submit / emit / setState ;
 *     l'envoi des données est fait par le squelette en JavaScript — il n'existe
 *     AUCUN formulaire natif (le cadre de l'aperçu les bloque : « Ajouter » mort) ;
 *   - le web : aucun nom de prop n'est un attribut DOM ni une propriété CSS,
 *     les directions sont logiques (début / fin) — React Native sera une
 *     seconde sortie du MÊME contrat.
 *
 * Les noms des composants sont à Deribfy, distincts de shadcn, MUI et React
 * Native Paper, pour que le modèle n'y importe pas les réglages d'une autre
 * bibliothèque.
 */
import { z } from 'zod'

// ── LES JETONS : des noms, jamais des valeurs.
export const JETONS = {
  couleur: ['fond', 'surface', 'texte', 'texteDiscret', 'accent', 'surAccent', 'succes', 'alerte', 'danger', 'bordure'],
  espace: ['aucun', 'xs', 's', 'm', 'l', 'xl'],
  rayon: ['aucun', 's', 'm', 'l', 'plein'],
  taille: ['legende', 'corps', 'sousTitre', 'titre', 'grandTitre'],
  elevation: ['plat', 'leve', 'flottant'],
} as const
export type Jeu = keyof typeof JETONS

export const ICONES = [
  'accueil', 'recherche', 'filtre', 'calendrier', 'horloge', 'paiement', 'document', 'message', 'utilisateur',
  'reglages', 'aide', 'localisation', 'valide', 'fermer', 'alerte', 'information', 'ajouter', 'modifier',
  'supprimer', 'retour', 'suivant', 'partager', 'telephone', 'courriel',
] as const

/** Les événements que le squelette sait traiter. `choisirLangue` prend un code de langue LUE. */
export const EVENEMENTS = ['connexion', 'deconnexion', 'choisirLangue', 'rafraichir', 'partager', 'contacter'] as const

/** Les routes que le squelette impose à toute application (le compte et ses trois pages). */
export const ROUTES_SOCLE = ['accueil', 'compte', 'aide', 'contact', 'legal'] as const

/** Les quatre vues de la tétrade d'une table. Une table journal n'a que `liste` et `detail`. */
export const VUES_TETRADE = ['liste', 'detail', 'creer', 'editer'] as const

/** Les sources d'une liaison `$data`. */
export const SOURCES = {
  table: 'les lignes d’une table déclarée : `table.<table>`',
  ligne: 'une colonne de la ligne courante (dans le `modele` de `Lignes`, ou sur un écran de tétrade `detail` / `editer`) : `ligne.<colonne>`',
  parcours: 'une colonne de la ligne en cours du parcours : `parcours.<table>.<colonne>`',
  etat: 'une valeur d’état déclarée par l’écran : `etat.<nom>`',
  session: 'la session : `session.role` ou `session.utilisateur`',
} as const

// ── LES GRAMMAIRES : aucune chaîne libre dans le contrat.
export const MOTIF = {
  cle: /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/u,
  // Chaque source a son arité : table.<t>, ligne.<c>, parcours.<t>.<c>, etat.<nom>, session.role|utilisateur.
  liaison: /^(?:(?:table|ligne|etat)\.[a-zA-Z][a-zA-Z0-9_]*|parcours\.[a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z][a-zA-Z0-9_]*|session\.(?:role|utilisateur))$/u,
  route: /^[a-z0-9]+(-[a-z0-9]+)*$/u,
  identifiant: /^[a-z][a-zA-Z0-9_]*$/u,
  role: /^\p{L}[\p{L}\p{N} _-]{0,40}$/u,
  langue: /^[a-z]{2,3}$/u,
  litteral: /^[\p{L}\p{N}_ .:@+-]{0,80}$/u,
  traduction: /^[^<>]{0,600}$/u,
} as const

// ── LES GENRES DE PROPS.
export type Genre =
  | { readonly g: 'texte' }
  | { readonly g: 'liaison' }
  | { readonly g: 'jeton'; readonly jeu: Jeu }
  | { readonly g: 'variante'; readonly valeurs: readonly string[] }
  | { readonly g: 'icone' }
  | { readonly g: 'booleen' }
  | { readonly g: 'enfants' }
  | { readonly g: 'effets' }
  | { readonly g: 'choix' }
  | { readonly g: 'filtres' }
  | { readonly g: 'ecritures' }
  | { readonly g: 'route' }
  | { readonly g: 'table' }
  | { readonly g: 'chemin' }
  | { readonly g: 'donneeOuValeur' }
  | { readonly g: 'codeLangue' }

export type DefProp = { readonly genre: Genre; readonly requis: boolean; readonly aide: string }
export type DefComposant = { readonly aide: string; readonly props: Readonly<Record<string, DefProp>> }

const p = (genre: Genre, requis: boolean, aide: string): DefProp => ({ genre, requis, aide })
const T: Genre = { g: 'texte' }
const L: Genre = { g: 'liaison' }
const E: Genre = { g: 'enfants' }
const jeton = (jeu: Jeu): Genre => ({ g: 'jeton', jeu })
const variante = (...valeurs: string[]): Genre => ({ g: 'variante', valeurs })

/** La prop que TOUS les composants acceptent : l'affichage conditionnel. */
export const PROPS_COMMUNES: Readonly<Record<string, DefProp>> = {
  si: p(L, false, 'affiché seulement quand cette liaison est vraie (non vide)'),
  siNon: p(L, false, 'affiché seulement quand cette liaison est fausse (ou vide)'),
}

export const COMPOSANTS: Readonly<Record<string, DefComposant>> = {
  Pile: { aide: 'empile ses enfants', props: {
    sens: p(variante('colonne', 'ligne'), false, 'colonne par défaut'),
    espace: p(jeton('espace'), false, 'entre les enfants'),
    aligner: p(variante('debut', 'centre', 'fin', 'etirer'), false, 'alignement logique (début / fin suivent la langue)'),
    enfants: p(E, true, 'les composants empilés'),
  } },
  Encart: { aide: 'une surface qui regroupe ; cliquable si elle porte des effets', props: {
    fond: p(jeton('couleur'), false, 'couleur de fond'),
    elevation: p(jeton('elevation'), false, 'relief'),
    rayon: p(jeton('rayon'), false, 'arrondi'),
    espace: p(jeton('espace'), false, 'marge intérieure'),
    effets: p({ g: 'effets' }, false, 'ce que fait un appui sur l’encart'),
    enfants: p(E, true, 'le contenu'),
  } },
  Titre: { aide: 'un titre', props: {
    texte: p(T, true, 'le titre'),
    niveau: p(variante('page', 'section', 'encart'), false, 'section par défaut'),
  } },
  Phrase: { aide: 'un texte courant', props: {
    texte: p(T, true, 'le texte'),
    taille: p(jeton('taille'), false, 'corps par défaut'),
    couleur: p(jeton('couleur'), false, 'texte par défaut'),
  } },
  Valeur: { aide: 'une donnée affichée, avec son libellé', props: {
    libelle: p(T, false, 'ce que c’est'),
    donnee: p(L, true, 'la donnée'),
    format: p(variante('texte', 'montant', 'date', 'nombre', 'statut'), false, 'montant : dans la devise de l’application'),
  } },
  Bouton: { aide: 'une commande ; elle porte TOUJOURS au moins un effet', props: {
    libelle: p(T, true, 'ce qui est écrit dessus'),
    effets: p({ g: 'effets' }, true, 'ce qu’elle fait, dans l’ordre'),
    genre: p(variante('principal', 'secondaire', 'discret', 'danger'), false, 'principal : une seule fois par écran'),
    icone: p({ g: 'icone' }, false, 'un pictogramme à côté du libellé'),
  } },
  Champ: { aide: 'une saisie liée à une donnée', props: {
    libelle: p(T, true, 'ce qu’on saisit'),
    donnee: p(L, true, 'où la saisie est rangée (un `etat.<nom>` le plus souvent)'),
    nature: p(variante('texte', 'nombre', 'date', 'courriel', 'telephone', 'secret', 'choix', 'case'), true, 'la sorte de saisie'),
    requis: p({ g: 'booleen' }, false, 'obligatoire'),
    choix: p({ g: 'choix' }, false, 'les valeurs possibles, pour `choix`'),
    aide: p(T, false, 'une indication sous le champ'),
  } },
  Lignes: { aide: 'répète un modèle pour chaque ligne d’une table', props: {
    donnee: p(L, true, '`table.<table>`'),
    filtre: p({ g: 'filtres' }, false, 'ne garde que les lignes dont la colonne vaut la liaison'),
    modele: p(E, true, 'ce qui est répété ; `ligne.<colonne>` y désigne la ligne'),
    vide: p(T, true, 'ce qui s’affiche quand il n’y a aucune ligne'),
  } },
  Pastille: { aide: 'une étiquette courte', props: {
    texte: p(T, true, 'l’étiquette'),
    ton: p(variante('neutre', 'succes', 'alerte', 'danger', 'information'), false, 'neutre par défaut'),
  } },
  Pictogramme: { aide: 'un pictogramme seul', props: {
    icone: p({ g: 'icone' }, true, 'lequel'),
    couleur: p(jeton('couleur'), false, 'sa couleur'),
  } },
  Illustration: { aide: 'une image venue des données', props: {
    donnee: p(L, true, 'l’image'),
    alternative: p(T, true, 'ce qu’elle montre, en mots'),
  } },
  Message: { aide: 'un des cinq états d’un écran', props: {
    nature: p(variante('vide', 'erreur', 'chargement', 'partiel', 'succes'), true, 'lequel'),
    texte: p(T, true, 'ce qu’il dit'),
    effets: p({ g: 'effets' }, false, 'une issue (réessayer, revenir)'),
  } },
  Trait: { aide: 'une séparation', props: {
    espace: p(jeton('espace'), false, 'l’espace autour'),
  } },
}

/** Les quatre actions. `submit` est exécuté par le squelette en JavaScript : aucun formulaire. */
export const ACTIONS = {
  navigate: { aide: 'ouvre un écran du plan', args: {
    route: p({ g: 'route' }, true, 'la route de l’écran (son nom court du plan)'),
    avec: p(L, false, 'la ligne à poser comme ligne en cours du parcours'),
  } },
  submit: { aide: 'écrit dans une table (le squelette s’en charge)', args: {
    table: p({ g: 'table' }, true, 'une table déclarée'),
    mode: p(variante('creer', 'modifier', 'supprimer'), true, 'l’écriture'),
    valeurs: p({ g: 'ecritures' }, false, 'chaque colonne écrite et d’où vient sa valeur'),
  } },
  emit: { aide: 'déclenche un événement du squelette', args: {
    evenement: p(variante(...EVENEMENTS), true, 'lequel'),
    valeur: p({ g: 'codeLangue' }, false, 'pour `choisirLangue` : le code d’une langue lue'),
  } },
  setState: { aide: 'change une valeur d’état de l’écran', args: {
    chemin: p({ g: 'chemin' }, true, '`etat.<nom>`'),
    valeur: p({ g: 'donneeOuValeur' }, true, 'une valeur, ou une liaison'),
  } },
} as const
export type Faire = keyof typeof ACTIONS
export const FAIRE = Object.keys(ACTIONS) as Faire[]

/** L'écran : ce que le modèle remplit. */
export const PROPS_ECRAN = {
  route: 'la route du plan',
  acces: 'le rôle qui l’ouvre, ou `visiteur`',
  titre: 'le titre ($t)',
  tetrade: 'facultatif : `{ table, vue }` pour un écran de tétrade',
  etat: 'facultatif : les valeurs d’état, `[{ nom, nature, initial? }]`',
  corps: 'les composants',
} as const
export const NATURES_ETAT = ['texte', 'nombre', 'booleen'] as const
export const PROPS_SPEC = {
  ecrans: 'les écrans',
  barre: 'les routes de la barre du bas (3 à 5)',
  traductions: '`[{ langue, textes: [{ cle, texte }] }]` — chaque clé, dans chaque langue lue',
} as const

// ── LE SCHÉMA ZOD, DÉRIVÉ DES TABLES.
export const Texte = z.strictObject({ $t: z.string().regex(MOTIF.cle) })
export const Liaison = z.strictObject({ $data: z.string().regex(MOTIF.liaison) })
const ChaineLitterale = z.string().regex(MOTIF.litteral)
export const Litteral = z.union([ChaineLitterale, z.number(), z.boolean(), z.null()])
const Route = z.string().regex(MOTIF.route)
const Identifiant = z.string().regex(MOTIF.identifiant)

export type NoeudSpec = { readonly composant: string } & Record<string, unknown>

function schemaGenre(g: Genre): z.ZodType {
  switch (g.g) {
    case 'texte': return Texte
    case 'liaison': return Liaison
    case 'jeton': return z.enum(JETONS[g.jeu] as unknown as [string, ...string[]])
    case 'variante': return z.enum(g.valeurs as [string, ...string[]])
    case 'icone': return z.enum(ICONES)
    case 'booleen': return z.boolean()
    case 'enfants': return z.array(Noeud)
    case 'effets': return z.array(Action).min(1)
    case 'choix': return z.array(z.strictObject({ valeur: ChaineLitterale, libelle: Texte })).min(1)
    case 'filtres': return z.array(z.strictObject({ champ: Identifiant, egal: Liaison }))
    case 'ecritures': return z.array(z.strictObject({ champ: Identifiant, depuis: z.union([Liaison, Litteral]) }))
    case 'route': return Route
    case 'table': return Identifiant
    case 'chemin': return z.string().regex(MOTIF.liaison)
    case 'donneeOuValeur': return z.union([Liaison, Litteral])
    case 'codeLangue': return z.string().regex(MOTIF.langue)
  }
}

/** Les actions, dérivées de `ACTIONS` comme les composants le sont de `COMPOSANTS`. */
export const Action: z.ZodType = z.lazy(() => z.discriminatedUnion('faire', Object.entries(ACTIONS).map(([faire, def]) => {
  const forme: Record<string, z.ZodType> = { faire: z.literal(faire) }
  for (const [arg, d] of Object.entries(def.args as Readonly<Record<string, DefProp>>)) {
    const s = schemaGenre(d.genre)
    forme[arg] = d.requis ? s : s.optional()
  }
  const objet = z.strictObject(forme)
  // choisirLangue dit LAQUELLE. Zod l'impose ; le schéma JSON ne sait pas l'écrire (limite dite, pas comblée).
  return faire === 'emit' ? objet.refine((x) => x.evenement !== 'choisirLangue' || x.valeur !== undefined, { message: 'choisirLangue exige valeur' }) : objet
}) as unknown as [z.ZodObject, ...z.ZodObject[]]))

export const Noeud: z.ZodType<NoeudSpec> = z.lazy(() => {
  const variantes = Object.entries(COMPOSANTS).map(([nom, def]) => {
    const forme: Record<string, z.ZodType> = { composant: z.literal(nom) }
    for (const [prop, d] of Object.entries({ ...def.props, ...PROPS_COMMUNES })) {
      const s = schemaGenre(d.genre)
      forme[prop] = d.requis ? s : s.optional()
    }
    return z.strictObject(forme)
  })
  return z.discriminatedUnion('composant', variantes as unknown as [z.ZodObject, ...z.ZodObject[]])
}) as unknown as z.ZodType<NoeudSpec>

export const Ecran = z.strictObject({
  route: Route,
  acces: z.string().regex(MOTIF.role),
  titre: Texte,
  tetrade: z.strictObject({ table: Identifiant, vue: z.enum(VUES_TETRADE) }).optional(),
  etat: z.array(z.strictObject({ nom: Identifiant, nature: z.enum(NATURES_ETAT), initial: Litteral.optional() })).optional(),
  corps: z.array(Noeud).min(1),
})

export const Traductions = z.array(z.strictObject({
  langue: z.string().regex(MOTIF.langue),
  textes: z.array(z.strictObject({ cle: z.string().regex(MOTIF.cle), texte: z.string().regex(MOTIF.traduction) })),
}))

/** L'application entière (couches 1 et 2). */
export const SchemaSpec = z.strictObject({ ecrans: z.array(Ecran).min(1), barre: z.array(Route), traductions: Traductions })
/** Un écran seul, avec ses textes (couche 1 et contrôles de contexte ; pas de graphe). */
export const SchemaFragment = z.strictObject({ ecran: Ecran, traductions: Traductions })

export type Spec = z.infer<typeof SchemaSpec>
export type Fragment = z.infer<typeof SchemaFragment>

/**
 * Le schéma JSON du contrat, côté ENTRÉE — ce que le modèle écrit.
 * Mesuré au rouge-puis-vert : côté sortie (le défaut de Zod), un z.object qui
 * TOLÈRE des clés en trop est quand même écrit `additionalProperties: false`
 * (il les retire en sortie) ; le cliquet ne voyait rien.
 */
export function schemaJsonDuContrat(): Record<string, unknown> {
  return z.toJSONSchema(SchemaSpec, { io: 'input' }) as Record<string, unknown>
}

/**
 * Tous les identifiants du contrat : ce que la consigne doit nommer, et rien
 * d'autre. Calculé depuis les tables — le cliquet de la consigne compare les
 * deux ensembles dans les deux sens.
 */
export function identifiantsDuCatalogue(): Set<string> {
  const s = new Set<string>(['composant', 'faire', '$t', '$data', 'visiteur'])
  for (const k of Object.keys(PROPS_SPEC)) s.add(k)
  for (const k of Object.keys(PROPS_ECRAN)) s.add(k)
  for (const k of ['table', 'vue', 'nom', 'nature', 'initial', 'langue', 'textes', 'cle', 'texte', 'champ', 'egal', 'depuis', 'valeur', 'libelle']) s.add(k)
  for (const v of VUES_TETRADE) s.add(v)
  for (const v of NATURES_ETAT) s.add(v)
  for (const r of ROUTES_SOCLE) s.add(r)
  for (const [jeu, valeurs] of Object.entries(JETONS)) { s.add(jeu); for (const v of valeurs) s.add(v) }
  for (const i of ICONES) s.add(i)
  for (const src of Object.keys(SOURCES)) s.add(src)
  for (const [nom, def] of Object.entries(COMPOSANTS)) {
    s.add(nom)
    for (const [prop, d] of Object.entries(def.props)) {
      s.add(prop)
      if (d.genre.g === 'variante') for (const v of d.genre.valeurs) s.add(v)
    }
  }
  for (const prop of Object.keys(PROPS_COMMUNES)) s.add(prop)
  for (const [faire, def] of Object.entries(ACTIONS)) {
    s.add(faire)
    for (const [arg, d] of Object.entries(def.args)) {
      s.add(arg)
      if (d.genre.g === 'variante') for (const v of d.genre.valeurs) s.add(v)
    }
  }
  return s
}
