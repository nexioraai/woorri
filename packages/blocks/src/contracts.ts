// CONTRATS COMPORTEMENTAUX DES SMART BLOCKS v1 (ROADMAP Phase 3.3, D-023 —
// registre de blocs COMPOSITES DE PRIMITIVES, granularité section d'écran).
//
// RÈGLE D'ÉTANCHÉITÉ (§22, D-021 — même cliquet que les primitives) : ce
// fichier n'importe QUE des types de `react`. Aucun type de styling, aucun
// type react-native — le moteur de styling ET le moteur E2E restent
// remplaçables sans toucher aux contrats des blocs.
//
// Les ÉTATS (loading/empty/error) sont EXPLICITES et contractuels : le bloc
// ne déduit jamais son état de ses données (déterminisme — c'est le
// compilateur/runtime qui décide de l'état, jamais une heuristique).
import type { ComponentType } from "react";

export interface BlockA11yProps {
  testID?: string;
}

export interface HeaderBlockProps extends BlockA11yProps {
  title: string;
  subtitle?: string;
  /**
   * ACCROCHE (1.7.0) — le titre est rendu dans la variante `display`, un cran
   * au-dessus de `heading`. Réservé à la PREMIÈRE phrase qu'une personne lit :
   * un écran d'accueil produit. Absent = comportement 1.6.0 inchangé.
   */
  accroche?: boolean;
  /**
   * MARQUE (1.9.0) — l'image d'identité, posée AU-DESSUS du titre. Aucun
   * document ne pouvait en déclarer une : les applications générées n'avaient
   * donc aucune identité visible, alors que toute application de référence
   * ouvre sur la sienne. L'URL vient du DOCUMENT, jamais du moteur.
   */
  logoUri?: string;
  /**
   * SURTITRE (2026-10-17) — la ligne qui SITUE, au-dessus du titre.
   *
   * MESURE : comparaison detail par detail avec Bolt, demandee par le
   * proprietaire. Chacun de ses ecrans ouvre sur une petite ligne grise en
   * capitales — PILOTAGE, JOURNAL FINANCIER, COMMUNAUTE, ESPACE DE TRAVAIL —
   * puis le grand titre, puis une phrase. Trois niveaux, pas deux.
   *
   * Deribfy n en portait que DEUX : titre et sous-titre. Le lecteur ne savait
   * donc jamais OU il se trouve avant d avoir lu le titre entier.
   *
   * Le moteur n en choisit ni la casse ni la couleur : il recoit le texte du
   * document, deja ecrit (F3).
   */
  surtitre?: string;
}

/**
 * RECHERCHE DANS UNE LISTE (1.2.0, D-087) — état tenu par l'appelant.
 *
 * Le bloc ne possède pas la saisie : il la reçoit et la restitue. C'est ce qui
 * lui permet de rester un composant PUR, testable sans monter d'application.
 */
export interface ListSearchSpec {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * FILTRE PILOTÉ PAR L'UTILISATEUR (E1, D-129) — même contrat que la
 * recherche : le bloc ne possède pas la saisie, il la reçoit et la restitue.
 * `text` rend un champ de saisie ; `choice` rend les options FOURNIES
 * (valeurs distinctes du périmètre, calculées par l'appelant) — re-presser
 * l'option active la désactive. Une valeur vide = filtre inactif.
 */
export interface ListFilterSpec {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputType: "text" | "choice";
  options?: readonly string[];
  /**
   * LIBELLÉS D'AFFICHAGE des options (1.4.0, DET-032) — clé = option BRUTE.
   * L'option reste la VALEUR (filtrage, testID) ; seul le texte rendu change.
   * Absent ou partiel : l'option brute est affichée — appelant 1.3.0 inchangé.
   */
  optionLabels?: Readonly<Record<string, string>>;
}

/**
 * LES QUATRE SENS QU'UN ÉTAT PEUT PORTER (1.5.0, AIR 1.43.0).
 *
 * `neutral` est l'absence de jugement, et c'est le mot JUSTE côté document :
 * la primitive l'appelle `info`, qui est un mot d'interface, pas un mot de
 * métier. La traduction se fait à la frontière, UNE fois, dans le composant —
 * jamais dans le document, qui ne doit pas connaître le vocabulaire du rendu.
 *
 * Quatre et pas cinq : ce sont les seules couleurs de sens que la palette
 * porte. Une cinquième exigerait un jeton de plus, donc une décision de
 * design — pas une commodité d'écriture.
 */
export type BadgeTone = "neutral" | "success" | "warn" | "error";

export interface ListItemData {
  id: string;
  /** Vignette de la ligne (1.2.0) — absente = ligne purement textuelle. */
  imageUri?: string;
  title: string;
  subtitle?: string;
  trailing?: string;
  badge?: string;
  /**
   * LE SENS DU BADGE (1.5.0, AIR 1.43.0) — pas sa couleur : son SENS.
   *
   * Mesuré le 2026-10-13 : la primitive `Badge` accepte un `tone` depuis
   * l'origine, et `success`/`warn`/`error` vivaient déjà dans la feuille de
   * style. ZÉRO usage. Aucun bloc n'en passait, donc toutes les pastilles
   * sortaient du même gris, et vingt lignes d'une liste étaient
   * indistinguables.
   *
   * Absent = `neutral`, c'est-à-dire AUCUN jugement. C'est le bon défaut :
   * une pastille colorée sur chaque ligne ne distingue plus rien, et
   * colorer au hasard dirait quelque chose de faux.
   */
  badgeTone?: BadgeTone;
}

// F3 (revue pré-gel 2026-08-28) : état DISCRIMINÉ — les libellés d'état
// sont REQUIS exactement quand l'état les rend, et FOURNIS par l'appelant
// (le compilateur, depuis l'AIR/les locales). AUCUN texte par défaut dans
// le moteur : une chaîne codée en dur fuiterait la langue du moteur dans
// des apps de langue arbitraire (i18n structurel, non-négociable 16).
export const LIST_BLOCK_STATES = ["ready", "loading", "empty", "error"] as const;
export type ListBlockState =
  | { kind: "ready" }
  | { kind: "loading"; title: string }
  | { kind: "empty"; title: string; message?: string }
  | {
      kind: "error";
      title: string;
      message?: string;
      retryLabel?: string;
      onRetry?: () => void;
    };

export interface ListBlockProps extends BlockA11yProps {
  /** 1.21.0 — lien d'en-tête de section (« Voir plus » ), libellé du document. */
  seeAll?: { label: string; onPress: () => void };
  /** 1.6.0 — lignes (défaut), cartes 2 colonnes, ou RANGÉE horizontale. */
  layout?: "rows" | "grid" | "row";
  /** Mission composition II — APERÇU BORNÉ : la liste coule dans un écran
   * composé (items déjà tronqués par l'appelant), aucune virtualisation ;
   * la fenêtre pleine reste le rendu de la liste unique d'un écran. */
  bounded?: boolean;
  /** Recherche rendue EN TÊTE de la liste (1.2.0) — absente = pas de champ. */
  search?: ListSearchSpec;
  /** Filtres pilotés (E1, D-129) — rendus sous la recherche, ≤ 3. */
  filters?: readonly ListFilterSpec[];
  title?: string;
  items: readonly ListItemData[];
  /** État EXPLICITE (défaut { kind: "ready" }) — jamais déduit des données. */
  state?: ListBlockState;
  onItemPress?: (itemId: string) => void;
  /**
   * AVATAR A INITIALES (2026-10-17) — quand les lignes sont des PERSONNES.
   *
   * MESURE : chaque ligne de la liste des membres chez Bolt porte un rond
   * d initiales (AM, PE, JM). Deribfy ne montrait qu une VIGNETTE, et
   * seulement si le document declare une image : une liste de personnes sans
   * photo restait du texte nu.
   *
   * LE DOCUMENT LE DIT, LE MOTEUR NE LE DEVINE PAS. Un catalogue de colliers
   * ne doit pas afficher « CB » pour « Collier baoule » — deviner qu une
   * entite designe des personnes serait exactement la devinette de domaine
   * que ce depot interdit partout ailleurs.
   *
   * L IMAGE PRIME : si la ligne porte une vignette, elle gagne. L avatar est
   * le REPLI, pas un remplacement.
   */
  avatarInitiales?: boolean;
}

export interface FormFieldSpec {
  id: string;
  label: string;
  placeholder?: string;
  secure?: boolean;
  /**
   * EP-159 — SAISIE NON PERSISTÉE. Une confirmation, une acceptation, un code
   * de vérification : la valeur est exigée à l'écran, vérifiée avant
   * écriture, puis OUBLIÉE. Elle ne part jamais vers la base — c'est ce qui
   * distingue cette famille d'un champ d'entité.
   */
  saisieSeule?: { role: string; cible?: string };
  /**
   * CHAMP OBLIGATOIRE (1.6.0) — le bloc en dérive si l'action est POSSIBLE.
   * Sans lui, le bouton d'envoi était toujours actif : il promettait une
   * action que la validation refusait ensuite en silence.
   */
  required?: boolean;
}

// REGISTRE 1.1.0 (D-060) : `loading` et `empty` entrent dans l'union.
// Fait mesuré : la dimension C d'A++ exige que TOUT bloc consommant des données
// expose loading/empty/error. `form` ne savait exprimer NI l'un NI l'autre — la
// dimension était donc INATTEIGNABLE, pas seulement non atteinte (APP-D003).
// Ajout STRICTEMENT ADDITIF : aucun état retiré, `state` reste optionnel, défaut
// "ready" — un appelant 1.0.0 se comporte à l'identique.
// D-095 — SOURCE UNIQUE DES ÉTATS. Le tableau est la déclaration ; le type en
// DÉRIVE. Le registre pointe sur ce même tableau. Il n'existe donc plus de
// seconde liste à tenir à jour, et la dérive mesurée en F5 devient impossible
// par construction — pas seulement détectée.
export const FORM_BLOCK_STATES = ["ready", "loading", "empty", "submitting", "error"] as const;
export type FormBlockState = (typeof FORM_BLOCK_STATES)[number];

export interface FormBlockProps extends BlockA11yProps {
  title?: string;
  fields: readonly FormFieldSpec[];
  values: Readonly<Record<string, string>>;
  onChangeField: (fieldId: string, value: string) => void;
  submitLabel: string;
  onSubmit: () => void;
  /** État EXPLICITE (défaut "ready"). */
  state?: FormBlockState;
  errorMessage?: string;
  fieldErrors?: Readonly<Record<string, string>>;
  /** Titres des états `loading`/`empty` — DONNÉES, jamais texte moteur (F3). */
  loadingTitle?: string;
  emptyTitle?: string;
}

/**
 * ESPACE EXTENSIBLE (1.8.0) — occupe la place restante. Sans lui, tous les
 * blocs s'empilent en haut et le bas de l'écran reste vide : mesuré sur
 * l'accueil produit, 1170 px de vide sous le dernier bouton. Aucun contenu,
 * aucun texte : c'est une intention de MISE EN PAGE, et rien d'autre.
 */
export type SpacerBlockProps = BlockA11yProps;

/**
 * TEXTE SUIVI (1.14.0, EP-198) — le bloc qui manquait pour qu'une surface
 * légale dise autre chose que « le texte sera fourni ».
 *
 * FAIT MESURÉ AVANT CETTE MONTÉE : le registre comptait HUIT blocs, et le
 * plus long texte qu'aucun pouvait porter était un sous-titre. Les écrans
 * `terms` et `privacy_policy` du run existaient, étaient atteignables sans
 * compte — et annonçaient « Le texte complet des conditions d'utilisation est
 * fourni par le propriétaire ». Ce n'était pas un refus du générateur : il
 * n'avait AUCUN endroit où écrire.
 *
 * LES PARAGRAPHES VIENNENT DU DOCUMENT, JAMAIS DU MOTEUR (F3). Le compilateur
 * n'écrit pas une ligne de ce texte — il le met en page. C'est la doctrine
 * déjà inscrite au schéma : le document nomme, le moteur dessine. Le cliquet
 * d'EP-143 reste donc entier : il interdit au MOTEUR de rédiger un texte
 * juridique, et rien ici ne le lui fait faire.
 */
export interface ProseBlockProps extends BlockA11yProps {
  /** Paragraphes, dans l'ordre. Un tableau vide n'est pas rendu. */
  paragraphs: readonly string[];
  /** Intertitre facultatif — le titre de l'écran reste ailleurs. */
  title?: string;
  /**
   * BROUILLON À FAIRE VALIDER (EP-198) — un texte juridique écrit par un
   * générateur ENGAGE le propriétaire s'il part tel quel. Le document le
   * déclare, le rendu l'annonce : personne ne publie sans l'avoir su.
   */
  brouillon?: boolean;
}

export interface ButtonBlockProps extends BlockA11yProps {
  label: string;
  /**
   * SIGNE DU BOUTON (1.6.0) — même vocabulaire FERMÉ que les onglets : le
   * moteur doit savoir DESSINER ce que le document nomme, un nom libre
   * ferait revenir la classe de défaut « promettre ce qu'on ne rend pas ».
   * Absent = bouton purement textuel, comportement 1.5.0 inchangé.
   */
  icon?: string;
  kind?: "primary" | "ghost" | "link";
  /**
   * OPTIONNEL depuis 1.1.0 (D-084) — même patron que `onItemPress` du bloc
   * liste : sans gestionnaire, le bouton n'est PAS pressable. Un effet que le
   * moteur n'exécute pas ne doit pas offrir d'affordance. Additif : un appelant
   * qui fournit `onPress` est inchangé.
   */
  onPress?: () => void;
}

export interface EmptyStateBlockProps extends BlockA11yProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// REGISTRE 1.1.0 (D-060) — même motif que `form` : `detail_header` consomme des
// données et ne portait AUCUN état. Les titres viennent des DONNÉES, jamais du
// moteur (F3) : un état sans titre déclaré n'est donc pas rendu.
export const DETAIL_HEADER_BLOCK_STATES = ["ready", "loading", "empty", "error"] as const;
export type DetailHeaderBlockState =
  | { kind: "ready" }
  | { kind: "loading"; title: string }
  | { kind: "empty"; title: string; message?: string }
  | { kind: "error"; title: string; message?: string };

export interface DetailHeaderBlockProps extends BlockA11yProps {
  title: string;
  subtitle?: string;
  badges?: readonly string[];
  trailing?: string;
  /** État EXPLICITE (défaut { kind: "ready" }) — jamais déduit des données. */
  state?: DetailHeaderBlockState;
  /**
   * VISUEL D'EN-TÊTE (1.2.0, D-087) — une fiche de plat, de bien ou d'article
   * sans image n'est pas une fiche. Absent = aucun visuel rendu, comportement
   * 1.1.0 inchangé.
   */
  imageUri?: string;
}

// Le record complet — la conformité de l'implémentation est vérifiée par le
// compilateur TypeScript (patron des primitives 3.2 et du banc P-003).
export interface Blocks {
  HeaderBlock: ComponentType<HeaderBlockProps>;
  ListBlock: ComponentType<ListBlockProps>;
  SearchEntryBlock: ComponentType<SearchEntryBlockProps>;
  FormBlock: ComponentType<FormBlockProps>;
  ButtonBlock: ComponentType<ButtonBlockProps>;
  SpacerBlock: ComponentType<SpacerBlockProps>;
  ProseBlock: ComponentType<ProseBlockProps>;
  GraphiqueBlock: ComponentType<GraphiqueBlockProps>;
  StatistiquesBlock: ComponentType<StatistiquesBlockProps>;
  AgentBlock: ComponentType<AgentBlockProps>;
  EmptyStateBlock: ComponentType<EmptyStateBlockProps>;
  DetailHeaderBlock: ComponentType<DetailHeaderBlockProps>;
}

// ── D-095 · LIAISON VÉRIFIÉE PAR LE COMPILATEUR.
//
// Pour les unions DISCRIMINÉES, chaque variante porte des champs différents :
// le tableau ne peut pas engendrer l'union. Il l'ENCADRE. Ces deux assertions
// échouent à la compilation si le tableau et l'union divergent, dans un sens
// comme dans l'autre — c'est la garantie que `BLOCKS[].states` n'avait pas.
type MemeEnsemble<A extends string, B extends string> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ListeLiee = MemeEnsemble<ListBlockState["kind"], (typeof LIST_BLOCK_STATES)[number]>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _DetailLie = MemeEnsemble<
  DetailHeaderBlockState["kind"],
  (typeof DETAIL_HEADER_BLOCK_STATES)[number]
>;

// Blocs SANS prop `state` : ils ne rendent qu'un état, déclaré ici pour que
// contracts.ts reste l'unique source des six blocs.
export const BUTTON_BLOCK_STATES = ["ready"] as const;
export const HEADER_BLOCK_STATES = ["ready"] as const;
/** 1.8.0 — le spacer n'a qu'un état : il est là, ou il ne l'est pas. */
export const SPACER_BLOCK_STATES = ["ready"] as const;
export const PROSE_BLOCK_STATES = ["ready"] as const;

/**
 * GRAPHIQUE (2026-10-13) — comparer des valeurs nommees.
 *
 * Mesure : DEUX cahiers des charges reels, deux metiers sans rapport, le meme
 * trou. « Graphiques mensuels de consommation et de montants » d'un cote,
 * « volumes, taux de succes, couts API/IA, recettes, commissions, marge » de
 * l'autre. Aucun type de bloc ne savait le dire.
 *
 * Le bloc ne CALCULE rien : le document fournit des couples etiquette/valeur
 * deja formates. La proportion se deduit du maximum de la serie — de
 * l'arithmetique, pas du contenu.
 *
 * Les trois etats du registre : une serie peut se charger, revenir vide, ou
 * echouer. Un graphique vide sans etat declare ressemblerait a un graphique a
 * zero, et les deux cahiers se trompent la-dessus de la meme facon.
 */
export const GRAPHIQUE_BLOCK_STATES = ["ready", "loading", "empty", "error"] as const;

/**
 * STATISTIQUES (2026-10-17) — LA CARTE DE CHIFFRE, ET POURQUOI ELLE MANQUAIT.
 *
 * ── LA MESURE QUI COMMANDE CE BLOC.
 *
 * Comparaison détaillée avec Bolt, demandée par le propriétaire : son
 * tableau de bord de tontine ouvre sur QUATRE cartes — solde, cotisations
 * collectées, membres actifs, prochaine échéance. Chacune porte un libellé
 * discret, un grand nombre, et une légende qui le situe (« +12,5 % ce
 * mois-ci »).
 *
 * Deribfy ne savait dessiner que SEPT formes : en-tête, bouton, liste,
 * formulaire, état vide, en-tête de détail, champ de recherche. Avec le plus
 * beau thème du monde, une liste de lignes de texte ne ressemblera jamais à
 * un tableau de bord.
 *
 * ── CE QUE LE BLOC NE FAIT PAS, ET C'EST LA RÈGLE F3.
 *
 * Il ne FORMATE aucun nombre. `valeur` arrive déjà écrite — « 265 000 FCFA »,
 * « 27 déc. », « 12 ». Le moteur ne saurait ni la devise, ni la précision, ni
 * la langue. Même contrat que `graphique`, pour la même raison.
 *
 * ── LE TON EST SÉMANTIQUE, PAS DÉCORATIF.
 *
 * `positif`/`negatif` disent ce que le chiffre SIGNIFIE, jamais une couleur.
 * Ils se résolvent sur les jetons `success` et `error`, qui existent depuis
 * toujours dans les 44 tokens et que RIEN n'employait.
 */
export const STATISTIQUES_BLOCK_STATES = ["ready", "loading", "empty", "error"] as const;

/** Le sens d'un chiffre — jamais sa couleur. */
export type TonStatistique = "neutre" | "positif" | "negatif" | "attention";

export interface StatistiqueItem {
  readonly label: string;
  /** DÉJÀ FORMATÉ par le document (F3) : « 265 000 FCFA », « 27 déc. ». */
  readonly valeur: string;
  /** Ce qui situe le chiffre : « +12,5 % ce mois-ci », « 2 nouveaux ». */
  readonly legende?: string;
  readonly ton?: TonStatistique;
}

export interface StatistiquesBlockProps extends BlockA11yProps {
  title?: string;
  /** QUATRE AU PLUS, et ce n'est pas arbitraire : au-delà, la grille d'un
   *  téléphone casse et les cartes deviennent illisibles. Bolt en pose
   *  exactement quatre. */
  items: readonly StatistiqueItem[];
  /** Même forme que `graphique` : les états viennent du document, le moteur
   *  n'invente aucun titre. */
  state?:
    | { kind: "ready" }
    | { kind: "loading"; title: string }
    | { kind: "empty"; title: string; message?: string }
    | { kind: "error"; title: string; message?: string };
}

/**
 * AGENT (2026-10-13) — le bouton qui le reveille, et la parole.
 *
 * Decision du proprietaire : chaque utilisateur a ce bouton ; qui veut s'en
 * servir l'active et lui parle, a la voix ou en ecrivant.
 *
 * Le bloc ne PENSE rien : il recueille une demande et montre ce qui revient.
 * Il ne porte AUCUN texte du moteur — l'invite, le libelle du bouton et les
 * messages viennent du document (F3). Il n'invente pas non plus de reponse :
 * `reply` est ce que l'appelant lui donne.
 *
 * `awaitingConfirmation` existe parce que certains gestes ne s'annulent pas.
 * Quand le document pose `confirmBeforeAct`, l'agent SUSPEND et le bloc
 * montre ce qu'il s'apprete a faire, avec deux issues explicites.
 */
export const AGENT_BLOCK_STATES = ["ready", "loading", "error"] as const;

export interface AgentBlockProps extends BlockA11yProps {
  /** Ce que le bouton dit. Vient du document. */
  label: string;
  /** L'invite du champ. Vient du document. */
  placeholder: string;
  /** Ouvert ou non — l'appelant tient l'etat. */
  open: boolean;
  onToggle: () => void;
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  /** Ce que l'agent a repondu. Jamais fabrique ici. */
  reply?: string;
  /** La parole, si le document l'autorise. */
  voice?: { label: string; listening: boolean; onToggle: () => void };
  /** Un geste qui ne s'annule pas attend un accord explicite. */
  awaitingConfirmation?: {
    summary: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  state?: { kind: "ready" } | { kind: "loading"; title: string } | { kind: "error"; title: string; message?: string };
}

export interface GraphiqueSerie {
  readonly label: string;
  /** Le nombre qui donne la PROPORTION. */
  readonly value: number;
  /** Le texte AFFICHE, formate par le document : unite, devise, arrondi. */
  readonly display: string;
}

export interface GraphiqueBlockProps extends BlockA11yProps {
  title?: string;
  series: readonly GraphiqueSerie[];
  state?:
    | { kind: "ready" }
    | { kind: "loading"; title: string }
    | { kind: "empty"; title: string; message?: string }
    | { kind: "error"; title: string; message?: string };
}
export const SEARCH_ENTRY_BLOCK_STATES = ["ready"] as const;

/**
 * ENTRÉE DE RECHERCHE (mission composition, 2026-09-10) — la recherche comme
 * ÉLÉMENT STRUCTUREL d'un accueil, pas comme champ d'une liste : un contrôle
 * à l'allure de champ qui NAVIGUE vers l'écran de recherche réel. Le patron
 * de toute app de référence — marketplace, réservation, éducation — où
 * l'accueil OFFRE la recherche et le catalogue l'EXÉCUTE.
 */
export interface SearchEntryBlockProps extends BlockA11yProps {
  placeholder: string;
  onPress?: () => void;
  /** Recherche VISUELLE — libellé du document + geste secondaire câblé. */
  visual?: { label: string; onPress: () => void };
}
export const EMPTY_STATE_BLOCK_STATES = ["empty"] as const;
