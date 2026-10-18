// CONTRATS DE PRIMITIVES v1 (ROADMAP Phase 3.2 — dossier d'options validé
// par le propriétaire : A1+B2+C2+D1).
//
// RÈGLE D'ÉTANCHÉITÉ (ARCHITECTURE §22, D-021, prouvée 6/6 au banc P-003,
// verrouillée par tests/contracts-ratchet.test.ts) : ce fichier n'importe
// QUE des types de `react`. Aucun type de bibliothèque de styling, aucun
// type react-native, aucune valeur — le moteur de styling reste remplaçable
// sans toucher ni aux contrats, ni aux blocs, ni à l'AIR.
//
// Surface a11y minimale (C2) : `testID` partout ; `accessibilityLabel` sur
// les primitives interactives/informatives. Les RÔLES a11y sont posés par
// l'implémentation (détail interne, pas contractuel).
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

export type Scheme = "light" | "dark";

export interface A11yProps {
  testID?: string;
  accessibilityLabel?: string;
}

// Les 4 variantes de texte = les 4 tokens de police de la source unique.
/**
 * `display` (1.3.0) — un cran au-dessus de `heading`, pour la PREMIÈRE phrase
 * qu'une personne lit. Additif : un appelant qui ne le nomme pas est inchangé.
 */
export type TextVariant = "label" | "body" | "title" | "heading" | "display";
export type TextTone = "default" | "muted" | "primary" | "error" | "success" | "warn";

/**
 * LA SUITE D'UN TEXTE — la seconde partie d'une même phrase, en ton atténué.
 *
 * ── POURQUOI CE N'EST PAS LE BLOC QUI LA COMPOSE.
 *
 * Le bloc d'en-tête voulait rendre « Bonjour Aminata, » suivi de « voici
 * votre espace. » sur une seule ligne. Composer les deux demandait un ESPACE,
 * et le cliquet F3 l'a refusé — à raison : « un libellé humain porte presque
 * toujours une signature détectable dans un littéral : espace, diacritique,
 * points de suspension ». Un espace dans un bloc est la signature d'un texte
 * fabriqué par le moteur.
 *
 * La règle que ce dépôt applique partout ailleurs donne la sortie, et elle est
 * écrite dans le bloc lui-même : « Le bloc choisit un RÔLE, la primitive porte
 * la forme ». Un séparateur typographique EST une forme. Il vit donc ici.
 */
export type AppTextProps = PropsWithChildren<
  A11yProps & {
    variant?: TextVariant;
    tone?: TextTone;
    /** Alignement LOGIQUE (miroir RTL automatique) — jamais left/right. */
    align?: "start" | "center" | "end";
      /**
     * La SECONDE partie de la même phrase, rendue inline et atténuée.
     *
     * Absente, le texte est celui d'avant au caractère près. Les deux parties
     * viennent du DOCUMENT ; seul l'espace qui les sépare appartient à la
     * primitive.
     */
    suite?: string;
}
>;

export type ScreenShellProps = PropsWithChildren<A11yProps & { title: string }>;

// `fill` (D-039/DET-006) : la section occupe la hauteur disponible et BORNE
// ses enfants. Indispensable à une liste virtualisée : sans parent borné,
// une FlatList reçoit une hauteur infinie et rend TOUS ses éléments — la
// virtualisation est neutralisée. Le style reste porté par les primitives ;
// le paquet `blocks` se contente de DÉCLARER l'intention (contrainte
// « aucun style en dur », D-021/D-023).
export type SectionProps = PropsWithChildren<
  A11yProps & {
    title?: string;
    fill?: boolean;
    /**
     * DISPOSITION EN LIGNE (1.3.0) — les enfants se placent côte à côte et
     * passent à la ligne quand la largeur manque, au lieu de s'empiler sur
     * toute la largeur. Ajoutée pour les options d'un filtre à choix : empilées
     * verticalement, elles donnaient à un écran de consultation l'allure d'un
     * formulaire. Le bloc choisit un RÔLE, la primitive choisit la forme —
     * le cliquet d'étanchéité interdit tout style chez les blocs, à raison.
     */
    inline?: boolean;
    /**
     * SECTION RESSERRÉE (1.18.0) — même gouttière latérale, respiration
     * verticale réduite.
     *
     * Mesuré à l'écran (SM-A175F) : « Mot de passe oublié » FLOTTAIT. Le
     * formulaire fermait sa section, le lien en ouvrait une autre, et les deux
     * respirations s'additionnaient — ~62 dp entre le bouton d'envoi et un
     * simple lien de texte. Le lien n'appartenait plus visuellement au
     * formulaire qu'il prolonge.
     *
     * Un LIEN n'est pas une action de bloc : il ne mérite pas la respiration
     * d'un bloc. Le bloc choisit le RÔLE (`kind: "link"`), la primitive choisit
     * la forme — le cliquet d'étanchéité interdit tout style chez les blocs.
     */
    tight?: boolean;
    /**
     * LIEN D'EN-TÊTE (1.21.0) — « Voir plus › » à droite du titre : le patron
     * des références marketplace (Amazon, annonces). Le libellé vient du
     * DOCUMENT ; sans gestionnaire, rien n'est rendu.
     */
    titleAction?: { label: string; onPress: () => void };
  }
>;

export interface AppButtonProps extends A11yProps {
  label: string;
  /**
   * OPTIONNEL depuis D-084 — sans gestionnaire, le bouton n'est PAS pressable.
   * Un effet que le moteur n'exécute pas ne doit pas offrir d'affordance :
   * c'est le remède d'`APP-D002`, appliqué ici au niveau de la primitive pour
   * qu'aucun étage au-dessus ne puisse le contourner.
   */
  onPress?: () => void;
  /**
   * `chip` (1.5.0, DET-034) — un FILTRE, pas une action : visuel de badge
   * (le langage compact existant du système), cible tactile INTACTE à
   * `tapTarget` — le pressable garde sa pleine hauteur autour d'un visuel
   * compact. Jugé sur appareil : deux gros boutons pleine hauteur donnaient
   * aux filtres plus d'importance qu'à la recherche.
   */
  /**
   * SIGNE (1.6.0) — nom de glyphe du vocabulaire FERMÉ partagé avec les
   * onglets. Absent = bouton purement textuel, comportement 1.5.0 inchangé.
   */
  icon?: string;
  /**
   * `link` (1.5.0) — du TEXTE cliquable. Un chemin secondaire ne doit pas
   * peser autant qu'une action : ni fond, ni bordure, ni pleine largeur.
   * La cible tactile reste PLEINE — discret ne veut pas dire inatteignable.
   */
  kind?: "primary" | "ghost" | "chip" | "link";
  /**
   * État SÉLECTIONNÉ (1.5.0) — porté par `accessibilityState.selected`, comme
   * la navigation. Ferme l'observation consignée le 2026-09-05 : un chip de
   * filtre actif n'exposait aucun état à l'accessibilité.
   */
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export interface TextFieldProps extends A11yProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  loading?: boolean;
  /** Saisie masquée (AuthFlow — mot de passe). */
  secure?: boolean;
}

export interface ListRowProps extends A11yProps {
  title: string;
  subtitle?: string;
  badge?: string;
  /**
   * LE SENS DU BADGE (2026-10-13) — il voyage AVEC lui, jamais séparément.
   *
   * `Badge` acceptait un `tone` depuis l'origine, mais aucune des deux
   * surfaces qui affichent un badge ne pouvait le lui transmettre : la
   * propriété n'existait pas. Comptés le même jour : zéro usage de
   * `badgeSuccess`/`badgeWarn`/`badgeError`, pourtant déclarés dans la
   * feuille de style. La couleur de sens était écrite et inatteignable.
   */
  badgeTone?: BadgeProps["tone"];
  /**
   * LA FORME DE LA PASTILLE D'UNE LIGNE — pleine, ou en POINT (D15).
   *
   * Une liste dense se lit mieux avec un point qu'avec une pastille pleine :
   * c'est ce que Bolt pose sur « À jour · En attente · En retard ». Le
   * DOCUMENT le dit ; le moteur ne le devine pas.
   */
  badgeForme?: BadgeProps["forme"];
  /** Texte de fin de ligne (prix, valeur, méta) — position logique RTL. */
  trailing?: string;
  /** Contenu de tête de ligne fourni par le bloc (avatar, icône…). */
  leading?: ReactNode;
  onPress?: () => void;
}

/**
 * CARTE DE CATALOGUE (1.20, jugé à l'écran) — l'unité d'une GRILLE deux
 * colonnes : image dessus, titre, sous-titre, valeur. Même philosophie que
 * ListRow : le bloc choisit le rôle, la primitive porte toute la forme.
 */
/** Pied de liste (2026-09-10) — la respiration qui évite le rang tranché. */
export type ListFooterProps = Record<string, never>;

/** Entrée de recherche — l'allure d'un champ, le geste d'une navigation. */
export interface SearchEntryProps extends A11yProps {
  placeholder: string;
  onPress?: () => void;
  /** Action de recherche visuelle (caméra) — nommée par le document. */
  visual?: { label: string; onPress: () => void };
}

/** Rangée d'aperçu — deux cartes qui PARTAGENT la largeur (flex), gap par
 * jeton : la paire ne peut pas déborder, donc jamais de fausse colonne. */
export type RangeeProps = PropsWithChildren<Record<never, never>>;

export interface GridCardProps extends A11yProps {
  /** Carte de RANGÉE horizontale : largeur bornée par jeton, image carrée. */
  compact?: boolean;
  title: string;
  subtitle?: string;
  trailing?: string;
  badge?: string;
  /** Le SENS du badge — même raison que `ListRowProps.badgeTone`. */
  badgeTone?: BadgeProps["tone"];
  imageUri?: string;
  onPress?: () => void;
}

/**
 * IMAGE (1.2.0, D-087) — deux variantes seulement, décidées ici et non par
 * l'appelant : `thumb` pour une ligne de liste, `header` pour une fiche. Un
 * bloc ne porte AUCUN style (cliquet d'étanchéité) : il choisit un RÔLE, la
 * primitive choisit la forme.
 */
export interface AppImageProps extends A11yProps {
  uri: string;
  /**
   * `brand` (1.4.0) — la MARQUE : petite, alignée au début, hauteur bornée.
   * Ni une vignette de ligne, ni une image d'en-tête pleine largeur — un
   * logo a sa propre contrainte : rester lisible sans jamais dominer.
   */
  variant: "thumb" | "header" | "brand";
}

/**
 * AVATAR A INITIALES (2026-10-17) — la tete de ligne d une personne.
 *
 * MESURE : chaque ligne de la liste des membres chez Bolt porte un rond
 * d initiales — AM, PE, JM. Deribfy ne savait montrer qu une VIGNETTE, et
 * seulement quand le document declare une image : une liste de personnes
 * sans photo restait du texte nu.
 *
 * LE TEXTE VIENT DU DOCUMENT. La primitive n en DERIVE que les initiales,
 * ce qui est une operation typographique, pas une invention de contenu.
 */
export interface AvatarInitialesProps {
  /** Le nom affiche ailleurs sur la ligne — jamais un texte invente ici. */
  nom: string;
  testID?: string;
}

/**
 * UN TABLEAU — des colonnes alignées, un en-tête, une ligne par enregistrement.
 *
 * ── CE QU'IL AJOUTE À UNE LISTE, ET POURQUOI CE N'EST PAS LA MÊME CHOSE.
 *
 * Une LISTE porte des rôles fixes : un titre, un sous-titre, une pastille, une
 * valeur de fin. Elle répond à « qu'est-ce que c'est ? ». Un TABLEAU porte N
 * colonnes de même rang et répond à « compare-les ». Les applications de
 * gestion — celles que ce générateur produit le plus souvent — vivent de la
 * seconde question.
 *
 * ── LES MOTS VIENNENT DU DOCUMENT, Y COMPRIS LES EN-TÊTES.
 *
 * `colonnes` porte les libellés déjà résolus par l'appelant depuis les CHAMPS
 * de l'entité. La primitive n'invente aucun titre de colonne et n'impose
 * aucune casse — c'est le document qui écrit « Montant », pas le moteur.
 */
export interface TableauProps extends A11yProps {
  /** Les en-têtes, dans l'ordre des cellules. Écrits par le DOCUMENT. */
  colonnes: readonly string[];
  /** Une ligne par enregistrement : ses cellules, déjà formatées. */
  lignes: readonly { readonly id: string; readonly cellules: readonly string[] }[];
}

/**
 * UN ANNEAU DE PROGRESSION — une proportion, lue d'un coup d'œil.
 *
 * ── POURQUOI IL A COÛTÉ UNE DÉPENDANCE, ET QUI L'A DÉCIDÉ.
 *
 * Un arc à angle arbitraire ne se dessine pas en React Native sans
 * `react-native-svg`. La seule alternative sans dépendance — quatre quarts de
 * cercle en bordures — ne sait montrer que 25, 50, 75 et 100 % : elle
 * MENTIRAIT sur toute autre proportion, et maquiller une proportion est pire
 * que ne pas la dessiner.
 *
 * Mesuré le 2026-10-18 : 7,6 Mo installés sur disque — 1,43 Mo de JS
 * consommable, 2,09 Mo de sources natives, le reste en cartes de source et en
 * portages non utilisés. Ce qui arrive dans l'APK n'est PAS mesuré : le dépôt
 * n'a de balance que côté web. Version 15.15.4, celle que
 * le bundle d'Expo 57 déclare. Décision du propriétaire, 2026-10-18.
 *
 * ── CE QUE LA PRIMITIVE NE FAIT PAS.
 *
 * Elle n'arrondit rien et ne formate rien. `valeur` est le texte DÉJÀ écrit
 * par le document — « 75 % », « 9/12 », ce qu'il veut. `ratio` est une
 * proportion 0..1 calculée par l'appelant : la primitive pose un angle, elle
 * ne connaît ni les données ni leur échelle.
 */
export interface AnneauProps extends A11yProps {
  /** La proportion remplie, 0..1. Hors bornes, elle est ramenée dedans. */
  ratio: number;
  /** Le texte au centre, DÉJÀ formaté par le document. */
  valeur: string;
  /** CE QUE LA PROPORTION MESURE — sous l'anneau. « Cagnotte du tour ». */
  libelle?: string;
  /**
   * CE QUI SITUE LE CHIFFRE — sous le libellé, en ton atténué.
   *
   * « +12,5 % ce mois-ci ». J'ai failli le perdre : ma première version ne
   * passait que la valeur et une seule ligne, et les quatre cartes du tableau
   * de bord sont devenues des anneaux ANONYMES. Un anneau sans libellé est un
   * chiffre sans question — il montre où l'on en est, sans dire DE QUOI.
   */
  legende?: string;
}

export interface BadgeProps extends A11yProps {
  label: string;
  tone?: "info" | "success" | "warn" | "error";
  /**
   * LA FORME DISCRÈTE — un POINT coloré suivi du mot (D15 chez Bolt).
   *
   * ── POURQUOI CE N'EST PAS UNE PRIMITIVE DE PLUS.
   *
   * Bolt pose « À jour · En attente · En retard » en points colorés dans ses
   * listes denses, et des pastilles pleines ailleurs. C'est LA MÊME
   * information — un état, un ton — dans deux formes.
   *
   * En faire deux primitives, ce serait deux endroits où la sémantique peut
   * diverger, et ce dépôt a vu six fois « une liste écrite deux fois ». La
   * forme est donc une VARIANTE : même contrat, même ton, même mot.
   *
   * ── CE QUE LE POINT NE FAIT PAS : SE SUBSTITUER AU MOT.
   *
   * Le point porte la couleur, le mot porte le sens. Une couleur seule
   * exclurait qui ne la distingue pas — la règle que ce dépôt applique déjà
   * au journal de génération et au sélecteur d'appareil.
   */
  forme?: "pastille" | "point";
}

/**
 * UNE BARRE D'UN GRAPHIQUE.
 *
 * `ratio` est une PROPORTION (0..1) calculee par l'appelant depuis le maximum
 * de sa serie. La primitive ne connait ni les donnees ni leur echelle : elle
 * pose une longueur. `valeur` est le texte DEJA FORMATE par le document — la
 * primitive n'arrondit rien et n'ajoute aucune unite (F3).
 */
export interface BarreProps extends A11yProps {
  label: string;
  valeur: string;
  ratio: number;
}

export interface StateViewProps extends A11yProps {
  state: "loading" | "empty" | "error";
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface SpinnerProps extends A11yProps {
  size?: "small" | "large";
}

// Le record complet — la conformité d'une implémentation est vérifiée par
// le compilateur TypeScript (patron éprouvé au banc P-003).
export interface Primitives {
  ScreenShell: ComponentType<ScreenShellProps>;
  Section: ComponentType<SectionProps>;
  AppText: ComponentType<AppTextProps>;
  AppButton: ComponentType<AppButtonProps>;
  TextField: ComponentType<TextFieldProps>;
  AppImage: ComponentType<AppImageProps>;
  ListRow: ComponentType<ListRowProps>;
  Badge: ComponentType<BadgeProps>;
  StateView: ComponentType<StateViewProps>;
  Spinner: ComponentType<SpinnerProps>;
}

export interface ThemeBridge {
  scheme: Scheme;
  setScheme: (scheme: Scheme) => void;
}

/**
 * Les neuf graisses que CSS et React Native reconnaissent tous deux.
 *
 * Le type est précis, et il doit l'être : `string` ferait perdre
 * l'assignabilité à `TextStyle` de React Native, dont `fontWeight` est une
 * union de littéraux — mesuré, 4 erreurs de typage dans les primitives.
 * Le schéma des jetons contraint déjà la forme (`^[1-9]00$`), et le module de
 * thème émis est `as const` : les valeurs arrivent donc ici en littéraux, sans
 * aucune conversion forcée.
 */
export type Graisse = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

/** Les graisses DÉCLARÉES par les jetons, passées par la feuille. */
export interface Graisses {
  readonly semibold: Graisse;
  readonly bold: Graisse;
}
