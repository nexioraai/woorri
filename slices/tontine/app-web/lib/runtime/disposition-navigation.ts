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
// ── POURQUOI 840, ET PAS 600 NI 1024.
//
// Material 3 laisse le choix entre barre et rail dans la classe medium
// (600–839) et devient net à partir de 840. Chez nous, l'arithmétique tombe
// sur le même nombre :
//
//     largeur de lisibilité du contenu .... 768 px  (theme.size.measure)
//   + largeur du rail .................... ~ 80 px
//                                          ────────
//                                            848 px
//
// En dessous de ~840, un rail VOLERAIT de la largeur au texte — il faudrait
// réduire la colonne de lecture pour le loger. Au-dessus, il tient sans rien
// prendre. Le seuil du référentiel et celui de notre mise en page sont le
// même nombre, et ce n'est pas une coïncidence : les deux dérivent de la
// même contrainte de lisibilité.
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

/** Les deux dispositions que le moteur sait rendre. Liste FERMÉE. */
export type DispositionNavigation = "barre" | "rail";

/**
 * LE SEUIL, EN POINTS INDÉPENDANTS DE LA DENSITÉ.
 *
 * Exporté pour que les cliquets le mesurent sans le recopier : un test qui
 * réécrit `840` dans son propre fichier ne prouve plus rien le jour où la
 * valeur change ici.
 */
export const SEUIL_RAIL = 840;

/**
 * La disposition qu'une largeur commande.
 *
 * Strictement au-dessous du seuil : barre du bas. À partir du seuil : rail
 * vertical. La borne est INCLUSIVE côté rail, comme Material 3 compte ses
 * classes (expanded commence À 840, pas après).
 */
export function dispositionDe(largeur: number): DispositionNavigation {
  return largeur >= SEUIL_RAIL ? "rail" : "barre";
}
