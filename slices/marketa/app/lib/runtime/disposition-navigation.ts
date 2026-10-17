// ════════════════════════════════════════════════════════════════════
//  OÙ VA LA NAVIGATION PRINCIPALE — LA RÈGLE, ET D'OÙ ELLE VIENT.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT QUI A COMMANDÉ CE FICHIER, VU PAR LE PROPRIÉTAIRE.
//
// Le 2026-10-16, la PWA d'une application générée tournait dans une fenêtre
// Safari de 1 600 px. La barre d'onglets s'étalait sur toute la largeur
// pendant que le contenu restait dans sa colonne de 768 px. Verdict du
// propriétaire, en une phrase : « on dirait une appli React Native ».
//
// Il avait raison, et la littérature le dit plus sèchement : « les designs de
// bureau portés depuis des plateformes mobiles étaient pires »
// (Nielsen Norman Group, « Mobile First Is NOT Mobile Only »).
//
// Mesuré avant correction : `primary-nav.tsx` portait ZÉRO logique de
// largeur — pas un point de rupture, pas un rail. Une barre du bas, à toutes
// les largeurs, sur les deux cibles.
//
// ── CE QUE DISENT LES TROIS RÉFÉRENTIELS, ET OÙ ILS CONVERGENT.
//
// MATERIAL DESIGN 3 — « Navigation bars should only be used for compact and
// medium breakpoints, while navigation rails should be used instead in
// expanded and extra-large breakpoints. » Les classes : compacte < 600 dp,
// medium 600–839, expanded 840–1199, large 1200–1599, extra-large ≥ 1600.
//   https://m3.material.io/components/navigation-rail/guidelines
//
// APPLE HUMAN INTERFACE GUIDELINES — les barres d'onglets ne sont PAS prises
// en charge sur macOS ; sur iPadOS, « consider using a sidebar instead of a
// tab bar ». Depuis iPadOS 18, `UITab`/`UITabGroup` bascule AUTOMATIQUEMENT
// de l'une à l'autre selon la largeur de la vue.
//   https://developers.apple.com/design/human-interface-guidelines/components/navigation-and-search/tab-bars
//
// NIELSEN NORMAN GROUP — déconseille la navigation principale en bas sur
// bureau ; recommande la navigation verticale à gauche, « scalable,
// responsive, and easy to scan ».
//   https://www.nngroup.com/articles/vertical-nav/
//
// LES TROIS CONVERGENT SUR LE MÊME ÉNONCÉ, et c'est ce qui le rend sûr : ce
// n'est pas « web contre natif », c'est UNE FONCTION DE LA LARGEUR. Apple en
// fait même une bascule automatique — la bonne lecture.
//
// ── POURQUOI 840, ET PAS 600 NI 1200.
//
// Material 3 laisse le choix entre barre et rail dans la classe medium
// (600–839) et devient net à partir de 840. Chez nous, le même nombre tombe
// d'une contrainte de lisibilité :
//
// À 840, une barre latérale de 256 px laisse 584 px au contenu. C'est
// au-dessus de la largeur de lecture confortable, et bien en deçà du plafond
// de 768 — qui est un PLAFOND, jamais un minimum. En dessous de 840, la
// colonne tomberait sous 580 px et le texte deviendrait serré.
//
// Material 3 place le tiroir permanent plus haut encore (1200 dp). On s'en
// écarte DÉLIBÉRÉMENT et on dit pourquoi : leur échelle suppose un rail
// d'icônes entre 840 et 1199, et nous n'avons pas d'icônes sur le web. Entre
// une barre du bas étirée sur 1 000 px et une barre latérale, la seconde est
// celle que les trois référentiels recommandent.
//
// ── CE QUE CE FICHIER NE DÉCIDE PAS.
//
// Il ne connaît NI la plateforme NI la cible. Un iPhone en portrait (390 px)
// et une PWA dans une fenêtre étroite reçoivent la même réponse, parce que
// c'est la même situation. Un iPad en paysage (1 024 px) et un navigateur de
// bureau aussi. Demander « suis-je une PWA ? » serait poser la mauvaise
// question : ce qui compte est la place disponible, pas la technologie.
//
// Conséquence directe, et c'est voulu : sur iPhone la barre du bas reste —
// Apple la recommande sur iOS, et aucune des 29 applications natives ne
// change de dessin sur téléphone.

// ── POURQUOI UNE BARRE LATÉRALE ET NON LE « RAIL » DE MATERIAL 3.
//
// Material 3 distingue deux composants pour les grandes largeurs : le RAIL
// (~80 dp, une icône surmontée d'un libellé court) et le TIROIR / barre
// latérale (360 dp, du texte aligné à gauche).
//
// MESURE DU 2026-10-16, ET ELLE TRANCHE : sur la cible web, `Signe` rend un
// `<span aria-hidden>` VIDE. La police de glyphes n'y est pas embarquée —
// c'est une décision documentée des primitives web, pas un oubli. Une
// première version a donc produit un rail de 96 px SANS ICÔNES : les
// libellés y passaient à la ligne trois fois, et le propriétaire l'a comparé
// à une vraie barre latérale, à raison.
//
// Un rail sans icônes n'est pas un rail, c'est une colonne de texte trop
// étroite. On prend donc le composant qui correspond à ce qu'on sait
// RÉELLEMENT dessiner : une barre latérale textuelle. C'est aussi ce que
// décrivent Apple (« sidebar ») et NN/g (« left-side vertical navigation »)
// — le mot « rail » n'appartient qu'à Material.
//
// CE QUI RESTE OUVERT, ET QUI EST DIT PLUTÔT QU'HABILLÉ : les 11 glyphes du
// vocabulaire fermé pourraient être embarqués en SVG pour la cible web. Tant
// que ce n'est pas fait, la navigation web est textuelle — en haut comme sur
// le côté.

/** Les deux dispositions que le moteur sait rendre. Liste FERMÉE. */
export type DispositionNavigation = "barre" | "laterale";

/**
 * LE SEUIL, EN POINTS INDÉPENDANTS DE LA DENSITÉ.
 *
 * Exporté pour que les cliquets le mesurent sans le recopier : un test qui
 * réécrit `840` dans son propre fichier ne prouve plus rien le jour où la
 * valeur change ici.
 */
export const SEUIL_LATERALE = 840;

/**
 * La disposition qu'une largeur commande.
 *
 * Strictement au-dessous du seuil : barre du bas. À partir du seuil : barre
 * latérale. La borne est INCLUSIVE côté latéral, comme Material 3 compte ses
 * classes (expanded commence À 840, pas après).
 */
export function dispositionDe(largeur: number): DispositionNavigation {
  return largeur >= SEUIL_LATERALE ? "laterale" : "barre";
}
