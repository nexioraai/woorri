// FEUILLES DE STYLE — StyleSheet + tokens maison (D-021). SEUL module (avec
// primitives.tsx) à connaître le moteur de styling : les contrats n'en savent
// rien (étanchéité §22). Tokens consommés depuis la SOURCE UNIQUE (3.1).
// RTL : propriétés LOGIQUES exclusivement (start/end) — miroir automatique
// prouvé au banc, verrouillé par tests/rtl-ratchet.test.ts.
// DESIGN SYSTEM v2 (P-007, Phase 10) : plus AUCUNE valeur de design en dur —
// graisses, pas fin d'espacement et opacité d'état viennent des tokens ;
// l'accent n'est plus utilisé comme couleur de texte (encre dérivée).
import { theme } from "../tokens";
// L'appel au moteur de styles passe par une COUTURE : c'est le seul mot de
// React Native qu'il restait ici, et la cible web le remplace par l'identité.
// Voir ./feuille.ts — la feuille, elle, reste UNIQUE pour les deux cibles.
import { creerFeuille } from "./feuille.ts";
import type { Scheme } from "./contracts.ts";

export type Palette = (typeof theme.color)[Scheme];

const makeSheet = (c: Palette) =>
  creerFeuille({
    // — ScreenShell —
    shell: { flex: 1, backgroundColor: c.bg },
    // ── L'ANNEAU DE FOCUS CLAVIER, UNIQUE POUR LES DEUX CIBLES.
    //
    // `outlineWidth` / `outlineColor` / `outlineOffset` existent dans
    // `ViewStyle` depuis React Native 0.76 — VERIFIE dans les types de la
    // version installee (0.86.3, StyleSheetTypes.d.ts lignes 496-499). On ne
    // passe PAS par une bordure : une bordure occupe de la place et decalerait
    // la mise en page au moment du focus.
    //
    // La couleur est l'accent des jetons, identique dans les deux schémas —
    // mesuré, pas supposé.
    //
    // LA VALEUR N'EST PAS CITÉE ICI, et c'est délibéré : l'oracle de la
    // dimension D compte les couleurs en dur sur le FICHIER ENTIER,
    // commentaires compris. Écrire l'hexadécimal dans une explication suffit
    // à faire tomber « zéro valeur en dur » — c'est arrivé le 2026-10-16.
    // L'instrument a raison sur le fond ; on ne l'assouplit pas pour une
    // phrase qui peut se dire autrement.
    focusAnneau: {
      outlineWidth: 3,
      outlineStyle: "solid" as const,
      outlineColor: c.primary,
      outlineOffset: 2,
    },
    shellTitle: {
      fontSize: theme.font.heading,
      fontWeight: theme.fontWeight.bold,
      color: c.text,
      padding: theme.space.lg,
    },
    // — Section —
    section: { padding: theme.space.lg },
    // DET-006 : section qui remplit et BORNE sa hauteur, plus conteneur
    // d'enfants borné — la liste virtualisée y retrouve une fenêtre finie.
    sectionFill: { flex: 1 },
    // SECTION RESSERRÉE (1.18.0) — la gouttière LATÉRALE reste celle de toutes
    // les autres sections (les bords ne bougent pas d'un bloc à l'autre) ; seule
    // la respiration VERTICALE se réduit. Un lien de texte prolonge le bloc
    // qu'il suit, il n'en ouvre pas un nouveau.
    // ASYMÉTRIQUE, et c'est le point : peu d'air AU-DESSUS (le lien continue le
    // bloc qu'il suit), davantage EN DESSOUS (il ne se confond pas avec ce qui
    // vient après). Mesuré au premier build : une réduction symétrique laissait
    // l'écart du haut ÉGAL à celui du bas — le lien flottait toujours entre les
    // deux, exactement le défaut jugé.
    sectionTight: { paddingTop: theme.space.xxs, paddingBottom: theme.space.xl },
    sectionFillBody: { flex: 1 },
    // PIED DE LISTE (2026-09-10, capture propriétaire) : sans lui, le dernier
    // rang restait tranché net contre la barre du bas. L'espace laisse le
    // contenu finir sa course au-dessus d'elle.
    listContent: { height: theme.space.xl },
    // Disposition EN LIGNE (1.3.0) : les enfants se suivent et passent à la
    // ligne. `gap` remplace des marges par enfant — aucune propriété physique,
    // la dimension F (RTL par propriétés logiques) reste tenue.
    sectionInlineBody: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: theme.space.sm,
    },
    // EN-TÊTE DE SECTION AVEC LIEN (1.21.0) — titre à gauche, « Voir plus »
    // à droite, cible tactile pleine sur le lien.
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitleLien: {
      minHeight: theme.size.tapTarget,
      justifyContent: "center",
      paddingHorizontal: theme.space.xs,
    },
    sectionTitleLienTexte: { color: c.primaryText, fontSize: theme.font.label },
    sectionTitle: {
      fontSize: theme.font.title,
      fontWeight: theme.fontWeight.semibold,
      color: c.text,
      marginBottom: theme.space.md,
    },
    // — AppText (variantes = tokens de police ; tons = tokens de couleur) —
    textLabel: { fontSize: theme.font.label, color: c.text },
    textBody: { fontSize: theme.font.body, color: c.text },
    textTitle: { fontSize: theme.font.title, fontWeight: theme.fontWeight.semibold, color: c.text },
    textHeading: { fontSize: theme.font.heading, fontWeight: theme.fontWeight.bold, color: c.text },
    textDisplay: { fontSize: theme.font.display, fontWeight: theme.fontWeight.bold, color: c.text },
    toneMuted: { color: c.muted },
    tonePrimary: { color: c.primaryText },
    toneError: { color: c.error },
    toneSuccess: { color: c.success },
    toneWarn: { color: c.warn },
    alignStart: { textAlign: "auto" },
    alignCenter: { textAlign: "center" },
    // `justify` n'existe pas ; « end » logique = right en LTR, miroir en RTL
    // est géré par writingDirection native — on utilise l'axe logique :
    alignEnd: { alignSelf: "flex-end" },
    // — AppButton —
    // PREMIUM (2026-09-09, jugement propriétaire) : hauteur de CONTRÔLE
    // au-dessus du minimum tactile, coins pleins — la borne A (48 dp) reste
    // tenue par construction puisque controlHeight > tapTarget.
    button: {
      minHeight: theme.size.controlHeight,
      backgroundColor: c.primary,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.space.md,
      paddingHorizontal: theme.space.lg,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: theme.space.sm,
    },
    buttonGhost: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: c.primary,
    },
    buttonDisabled: { opacity: theme.opacity.disabled },
    // Révélation du secret : cible tactile PLEINE (48 dp), posée dans la
    // rangée du champ — la contrainte A vaut aussi pour ce contrôle.
    // L'oeil se SUPERPOSE a la fin du champ au lieu de le pousser : sans
    // cela, un champ masque etait plus etroit qu'un champ ordinaire, et deux
    // champs voisins n'avaient pas la meme largeur. Mesure a l'oeil sur
    // l'ecran de connexion. `end` est LOGIQUE : miroir RTL automatique.
    fieldRevele: {
      position: "absolute",
      end: 0,
      top: 0,
      bottom: 0,
      minWidth: theme.size.tapTarget,
      alignItems: "center",
      justifyContent: "center",
    },
    fieldRevelIcone: { fontSize: theme.font.title, color: c.muted },
    // FERMETURE D'UNE FEUILLE (1.18.0) — posée dans l'en-tête natif, à la fin
    // (propriété LOGIQUE via `alignItems`, aucun côté physique). Cible PLEINE :
    // un contrôle discret n'est pas un contrôle petit.
    fermerFeuille: {
      minWidth: theme.size.tapTarget,
      minHeight: theme.size.tapTarget,
      alignItems: "center",
      justifyContent: "center",
    },
    fermerFeuilleIcone: { fontSize: theme.font.title, color: c.text },
    // — chip (1.5.0, DET-034) : la CIBLE garde tapTarget, le VISUEL est un
    // badge. La discrétion est dans le rendu, jamais dans la zone de toucher.
    // Style de BASE du chip (jamais empilé sur `button` : rien à écraser,
    // donc aucune valeur en dur — l'instrument E le vérifie).
    buttonChip: {
      minHeight: theme.size.tapTarget,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    buttonChipVisuel: {
      backgroundColor: c.badgeBg,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.space.sm,
      paddingVertical: theme.space.xxs,
    },
    buttonChipVisuelActif: { backgroundColor: c.primary },
    // LIEN (1.5.0) : du TEXTE cliquable. Ni fond, ni bordure, ni pleine
    // largeur — un chemin secondaire ne doit pas peser autant qu'une action.
    // La cible tactile reste PLEINE : discret ne veut pas dire inatteignable.
    buttonLien: {
      minHeight: theme.size.tapTarget,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    buttonLienText: { color: c.primaryText, fontSize: theme.font.body },
    buttonChipText: { color: c.primaryText, fontWeight: theme.fontWeight.semibold, fontSize: theme.font.label },
    buttonChipTextActif: { color: c.onPrimary },
    buttonText: { color: c.onPrimary, fontWeight: theme.fontWeight.semibold, fontSize: theme.font.body },
    // 1.6.0 — le signe s'aligne au texte, il ne le remplace pas.
    // Propriété LOGIQUE (`marginEnd`), pas physique : le cliquet RTL l'exige,
    // et il a raison — en arabe le signe doit passer à droite tout seul.
    buttonIcon: { fontSize: theme.font.body, marginEnd: theme.space.sm },
    buttonGhostText: { color: c.primaryText },
    // — TextField —
    fieldWrap: { marginBottom: theme.space.md },
    fieldLabel: {
      fontSize: theme.font.label,
      color: c.muted,
      marginBottom: theme.space.xs,
    },
    fieldRow: { flexDirection: "row", alignItems: "center" },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: theme.radius.sm,
      minHeight: theme.size.tapTarget,
      paddingHorizontal: theme.space.md,
      paddingVertical: theme.space.sm,
      color: c.text,
      backgroundColor: c.surface,
      fontSize: theme.font.body,
    },
    inputError: { borderColor: c.error },
    fieldError: {
      color: c.error,
      fontSize: theme.font.label,
      marginTop: theme.space.xs,
    },
    fieldSpinner: { marginStart: theme.space.sm },
    // — NAVIGATION PRINCIPALE (D-086) — compacte PAR CONSTRUCTION : sa hauteur
    // est bornée par la cible tactile, pas par le contenu. C'est ce qui la
    // distingue des quatre gros boutons qu'elle remplace, lesquels grandissaient
    // avec leur libellé.
    // PANNEAU DE NAVIGATION (1.3.0) — la barre était un simple filet posé au
    // bas de l'écran : quatre libellés séparés du contenu par un trait. Elle
    // devient un PANNEAU détaché, posé sur le fond, avec un état actif porté
    // par une pastille et non par la seule graisse du texte.
    // Contraintes tenues, et vérifiées : `minHeight` reste `tapTarget` (48 dp,
    // mesuré conforme sur A17) ; aucune valeur en dur, tout vient des tokens
    // (dimension D) ; aucune propriété physique (dimension F) ; aucune limite
    // de lignes sur les libellés (dimension E — le mot exact est volontairement
    // absent, l'instrument le cherche par sous-chaîne sans distinguer un
    // commentaire du code).
    // Gouttières RESSERRÉES (2026-09-09) : à CINQ onglets, « Commandes »
    // cassait sur deux lignes — mesuré à l'écran sur l'app générée. La cible
    // tactile ne bouge pas ; seuls les interstices se réduisent.
    primaryNav: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: theme.space.sm,
      paddingHorizontal: theme.space.xs,
      gap: theme.space.xxs,
    },
    // ── LE RAIL VERTICAL — la même navigation, à partir de 840 px.
    //
    // Material 3 : barre en compact/medium, RAIL en expanded et au-delà.
    // Apple : pas de barre d'onglets sur macOS, barre latérale sur iPad.
    // NN/g : la navigation verticale à gauche se parcourt mieux sur bureau.
    // La règle et ses sources vivent dans `disposition-navigation`.
    //
    // `borderEndWidth` et non `borderRightWidth` : propriété LOGIQUE, comme
    // tout le reste de cette feuille — en arabe le rail passe à droite tout
    // seul, et une bordure physique se serait trompée de côté.
    primaryNavLaterale: {
      flexDirection: "column",
      // ── LA LARGEUR, ET POURQUOI ELLE EST DÉRIVÉE.
      //
      // 768 / 3 = 256 px. Dérivée de la largeur de lisibilité, jamais écrite
      // à la main : si la colonne de lecture change un jour, la barre suit.
      //
      // Material 3 prescrit 360 dp pour un tiroir permanent. On prend moins,
      // et c'est un choix mesuré : à 840 px de fenêtre, 360 ne laisserait que
      // 480 px au contenu, pendant que 256 en laisse 584. La navigation ne
      // doit pas gagner contre ce qu'elle sert à atteindre.
      width: theme.size.measure / 3,
      backgroundColor: c.surface,
      borderEndWidth: 1,
      borderEndColor: c.border,
      paddingVertical: theme.space.md,
      paddingHorizontal: theme.space.sm,
      gap: theme.space.xxs,
    },
    // ── L'ENTRÉE D'UNE BARRE LATÉRALE SE LIT, ELLE NE SE DEVINE PAS.
    //
    // `flex: 1` est ABSENT, et c'est la différence qui compte : dans une
    // colonne il étirerait chaque entrée sur toute la hauteur disponible, et
    // quatre destinations occuperaient l'écran entier.
    //
    // Le contenu est en LIGNE et aligné au DÉBUT : un glyphe puis son
    // libellé, comme une liste se lit. Centrer le texte d'une barre latérale
    // casse l'alignement vertical des premières lettres, qui est justement ce
    // qui la rend parcourable d'un coup d'œil (NN/g).
    primaryNavLateraleItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.sm,
      minHeight: theme.size.tapTarget,
      paddingHorizontal: theme.space.md,
      paddingVertical: theme.space.sm,
      borderRadius: theme.radius.md,
    },
    primaryNavItem: {
      flex: 1,
      minHeight: theme.size.tapTarget,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.space.xxs,
      paddingVertical: theme.space.xs,
      borderRadius: theme.radius.md,
    },
    // ÉTAT ACTIF LISIBLE SANS LIRE — pastille pleine sur l'onglet courant.
    primaryNavItemActive: {
      flex: 1,
      minHeight: theme.size.tapTarget,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.space.xxs,
      paddingVertical: theme.space.xs,
      borderRadius: theme.radius.md,
      backgroundColor: c.badgeBg,
    },
    /** L'entrée ACTIVE : même marque d'état que la barre, autre géométrie. */
    primaryNavLateraleItemActive: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.sm,
      minHeight: theme.size.tapTarget,
      paddingHorizontal: theme.space.md,
      paddingVertical: theme.space.sm,
      borderRadius: theme.radius.md,
      backgroundColor: c.badgeBg,
    },
    /**
     * LE LIBELLÉ D'UNE BARRE LATÉRALE EST DU TEXTE DE LECTURE.
     *
     * Dans la barre du bas il est minuscule (`font.label`, 12) parce qu'il
     * tient sous un glyphe dans un cinquième de largeur. Ici il a 256 px : le
     * garder à 12 px produirait une colonne de texte timide à côté d'un
     * contenu en 14. Mesuré sur l'écran du propriétaire — c'est l'une des
     * deux raisons pour lesquelles le premier essai ne ressemblait pas à une
     * barre latérale.
     */
    primaryNavLateraleLabel: { fontSize: theme.font.body, color: c.muted },
    primaryNavLateraleLabelActive: {
      fontSize: theme.font.body,
      fontWeight: theme.fontWeight.semibold,
      color: c.primaryText,
    },
    // Taille du glyphe d'onglet — portée par un TOKEN, jamais par un nombre
    // écrit dans le composant : la dimension D interdit toute valeur en dur.
    primaryNavIcon: { fontSize: theme.font.heading },
    primaryNavLabel: { fontSize: theme.font.label, color: c.muted },
    primaryNavLabelActive: {
      fontSize: theme.font.label,
      color: c.primaryText,
      fontWeight: theme.fontWeight.semibold,
    },
    // — SearchEntry — l'allure du champ `input`, la hauteur d'un contrôle
    // principal : c'est l'invitation majeure d'un accueil.
    searchEntry: {
      minHeight: theme.size.controlHeight,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: theme.radius.lg,
      backgroundColor: c.surface,
      paddingHorizontal: theme.space.md,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.sm,
    },
    searchEntryIcone: { fontSize: theme.font.title, color: c.muted },
    // Caméra de recherche visuelle : cible PLEINE au bout de la barre —
    // poussée à la fin par marginStart auto (propriété logique, RTL sûr).
    searchEntryVisuel: {
      minWidth: theme.size.tapTarget,
      minHeight: theme.size.tapTarget,
      alignItems: "center",
      justifyContent: "center",
      marginStart: "auto",
    },
    searchEntryTexte: { fontSize: theme.font.body, color: c.muted },
    // — GridCard (1.20) — la cellule d'un catalogue : image pleine largeur
    // de carte, corps textuel, valeur en pied. Les colonnes sont posées par
    // la FlatList ; la carte remplit sa cellule (flex: 1) et respire par sa
    // marge. AUCUNE hauteur figée : le texte s'agrandit, la carte suit.
    gridCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      margin: theme.space.xs,
      overflow: "hidden",
    },
    gridCardImage: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: c.border,
    },
    gridCardBody: { padding: theme.space.md, gap: theme.space.xs },
    // Carte COMPACTE d'une rangée horizontale : largeur bornée (jeton), la
    // rangée en montre plusieurs et invite au geste. Même anatomie sinon.
    // Rangée d'APERÇU (mesuré à l'écran : paires à largeur fixe débordant de
    // ~8 dp → fausse colonne). Les cartes partagent la largeur par flex.
    rangeeApercu: { flexDirection: "row", gap: theme.space.sm },
    gridCardCompact: {
      width: theme.size.tapTarget * 3.25,
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      marginEnd: theme.space.sm,
      overflow: "hidden",
    },
    gridCardTrailing: {
      fontSize: theme.font.body,
      fontWeight: theme.fontWeight.bold,
      color: c.primaryText,
      marginTop: theme.space.xs,
    },
    // — ListRow —
    row: {
      minHeight: theme.size.tapTarget,
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.space.md,
      marginHorizontal: theme.space.lg,
      marginVertical: theme.space.xs,
      flexDirection: "row",
      alignItems: "center",
    },
    rowLeading: { marginEnd: theme.space.md },
    // VIGNETTE DE LIGNE (1.2.0, D-087) — carrée, bornée, à gauche du texte.
    // C'est la composition d'un catalogue : image à gauche, titre et
    // description au centre qui prennent tout l'espace restant (`rowBody`
    // flex:1), prix à droite. Rien n'est centré, rien ne reste étroit.
    // VISUEL D'EN-TÊTE — pleine largeur, hauteur bornée : c'est la hiérarchie
    // d'une fiche produit. `width: "100%"` exploite l'espace horizontal au lieu
    // de laisser un visuel étroit centré.
    imageHeader: {
      width: "100%",
      minHeight: theme.size.tapTarget * 3,
      borderRadius: theme.radius.md,
      backgroundColor: c.border,
      marginBottom: theme.space.md,
    },
    // MARQUE (1.4.0) : hauteur bornée, largeur libre, alignée au DÉBUT (le
    // miroir RTL est donc automatique). Aucun fond : un logo se pose, il ne
    // s'encadre pas.
    imageBrand: {
      // Cadre CARRÉ : une marque symbolique remplit sa boîte. Un cadre plus
      // large la laisserait flotter — `contain` la réduirait à la hauteur et
      // le reste de la largeur resterait vide.
      width: theme.size.tapTarget * 1.5,
      height: theme.size.tapTarget * 1.5,
      alignSelf: "flex-start",
      marginBottom: theme.space.lg,
    },
    imageThumb: {
      width: theme.size.tapTarget,
      height: theme.size.tapTarget,
      borderRadius: theme.radius.sm,
      backgroundColor: c.border,
    },
    // EP-132 — la place d'un média PROMIS qui n'est pas arrivé. Elle garde
    // exactement la forme du média qu'elle remplace (la mise en page ne
    // bouge pas), et porte le texte que le document fournit déjà. Aucune
    // couleur neuve : le fond est celui des surfaces, l'encre celle des
    // textes secondaires — un emplacement en attente, pas une alarme.
    imageRepli: {
      backgroundColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.space.xs,
    },
    imageRepliTexte: {
      fontSize: theme.font.label,
      color: c.muted,
      textAlign: "center",
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: theme.font.body, fontWeight: theme.fontWeight.semibold, color: c.text },
    rowSubtitle: {
      fontSize: theme.font.label,
      color: c.muted,
      marginTop: theme.space.xs,
    },
    rowTrailing: {
      fontSize: theme.font.body,
      fontWeight: theme.fontWeight.bold,
      // v2 (DET-019) : encre DÉRIVÉE de l'accent — l'accent lui-même reste
      // réservé aux FONDS et aux bordures, où le seuil 4,5:1 ne s'applique
      // pas au texte. Mesuré : 2,95:1 avant, 4,57:1 après.
      color: c.primaryText,
      marginStart: theme.space.md,
    },
    // — Barre d'un graphique —
    //
    // Deux cahiers des charges reels demandent des comparaisons mensuelles :
    // consommation et montants d'un cote, volumes et taux de l'autre. Des
    // BARRES suffisent, et elles ne coutent aucune dependance : une courbe
    // aurait exige SVG. La piste porte la longueur totale, le remplissage la
    // proportion — le bloc ne decide d'aucune couleur.
    barreLigne: {
      marginTop: theme.space.xs,
    },
    barreEntete: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    barrePiste: {
      backgroundColor: c.border,
      borderRadius: theme.radius.sm,
      height: theme.space.md,
      overflow: "hidden",
      marginTop: theme.space.xxs,
      flexDirection: "row",
    },
    // Le RESTE de la piste. Deux `flex` fratries donnent la proportion sans
    // chaine de pourcentage — qui ne se type pas en React Native.
    barreReste: {},
    barreRemplissage: {
      backgroundColor: c.primary,
      borderRadius: theme.radius.sm,
      height: "100%",
    },
    barreValeur: { fontSize: theme.font.label, color: c.muted },
    // — Badge —
    badge: {
      backgroundColor: c.badgeBg,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.space.sm,
      paddingVertical: theme.space.xxs,
      alignSelf: "flex-start",
      marginTop: theme.space.xs,
    },
    badgeText: { fontSize: theme.font.label, color: c.muted },
    // — Avatar a initiales (2026-10-17) —
    //
    // MESURE : chaque ligne de la liste des membres chez Bolt porte un rond
    // d initiales (AM, PE, JM). Deribfy ne pouvait montrer qu une VIGNETTE,
    // et seulement quand le document declare une image. Une liste de
    // personnes sans photo restait une liste de texte nu.
    //
    // UN SEUL FOND, pas une teinte par personne : une couleur par individu
    // exigerait une palette que les 44 jetons ne portent pas. On ne bricole
    // pas une teinte ici — ce serait une decision de design deguisee en
    // commodite d ecriture.
    avatar: {
      backgroundColor: c.badgeBg,
      borderRadius: theme.size.tapTarget,
      width: theme.size.tapTarget,
      height: theme.size.tapTarget,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTexte: {
      fontSize: theme.font.label,
      fontWeight: theme.fontWeight.semibold,
      color: c.muted,
    },
    badgeSuccess: { color: c.success },
    badgeWarn: { color: c.warn },
    badgeError: { color: c.error },
    // — StateView —
    stateWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.space.xl,
      gap: theme.space.md,
    },
    stateTitle: {
      fontSize: theme.font.title,
      fontWeight: theme.fontWeight.semibold,
      color: c.text,
      textAlign: "center",
    },
    stateMessage: {
      fontSize: theme.font.body,
      color: c.muted,
      textAlign: "center",
    },
    stateTitleError: { color: c.error },
  });

export type Sheet = ReturnType<typeof makeSheet>;

// Pré-calcul UNIQUE des deux feuilles (patron gagnant du banc : la bascule
// de thème ne recrée aucun style, elle change de feuille).
export const SHEETS: Record<Scheme, Sheet> = {
  light: makeSheet(theme.color.light),
  dark: makeSheet(theme.color.dark),
};
