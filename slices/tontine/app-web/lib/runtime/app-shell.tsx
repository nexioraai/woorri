// APPSHELL — LE PROPRIÉTAIRE UNIQUE DU SHELL MOBILE (étape ②, 2026-09-11).
//
// AVANT (EP-002) : les insets étaient écrits sur QUATRE sites répartis sur
// DEUX couches (conteneurs d'écran émis + PrimaryNav), et la barre d'état
// n'avait AUCUN propriétaire — l'incident « horloge derrière la barre de
// recherche » est né exactement de cette dispersion. Chaque nouvel écran
// devait re-bricoler la même géométrie système.
//
// DÉSORMAIS, ce module possède SEUL la géométrie du viewport :
//
//   SYSTEM STATUS AREA        → inset du HAUT (sauf en-tête natif, qui le
//                               porte déjà — même règle qu'`enteteMasquee`)
//   PERSISTENT APP CHROME     → hors du flux défilant (search_entry…)
//   SCROLLABLE CONTENT        → flex: 1, AUCUN inset à sa charge
//   PERSISTENT APP NAVIGATION → la barre d'onglets
//   SYSTEM BOTTOM INSET       → porté ICI : sous la barre quand elle existe,
//                               sous le contenu sinon — UNE fois, jamais deux
//
// La barre d'état est MONTÉE ici — style dérivé du thème : icônes sombres sur
// surface claire, claires sur surface sombre. Elle n'est plus DÉCLARÉE ici :
// le paquet qui la fournit vit derrière la couture de plateforme, sans quoi la
// même enveloppe ne pourrait pas être émise pour le web. Aucun écran généré n'a
// le droit de toucher aux insets : le cliquet d'émission le vérifie
// (app-shell.test.ts). Le nom du paquet est volontairement absent de ce
// fichier — le cliquet cherche par sous-chaîne et ne distingue pas un
// commentaire du code, leçon déjà payée sur `primary-nav`.
//
// La persistance reste STRUCTURELLE : c'est l'ORDRE DE L'ARBRE (chrome et
// navigation hors du conteneur défilant) qui la fait, pas une position
// absolue — vérifiable sans lire un style (D-086, mission chrome).
// ── PAR LES PRIMITIVES, COMME LES BLOCS (2026-10-05).
//
// Ce fichier importait `View` directement de React Native. C'est la règle
// D-023 contournée : le visuel passe par les primitives, qui sont remplaçables
// par cible. Une seule importation, et l'enveloppe de l'application n'était
// plus portable.
import { Vue as View } from "../primitives";
// Barre d'état et zones sûres passent par une COUTURE — voir ./plateforme.
// Sans elle, le shell imposait deux paquets natifs à la cible web, alors que
// c'est justement le fichier qui doit valoir pour les deux.
import { StatusBar, useSafeAreaInsets, useLargeurDeFenetre } from "./plateforme";
import { dispositionDe } from "./disposition-navigation";
import { useThemeBridge } from "../primitives/theme-bridge";
import { theme } from "../tokens";
import type { PropsWithChildren, ReactNode } from "react";

export interface AppShellProps {
  /**
   * true = l'en-tête NATIF est rendu au-dessus de cet écran et porte déjà
   * l'inset du haut (même règle que `enteteMasquee`, lue par l'émission).
   */
  avecEntete: boolean;
  /** PERSISTENT APP CHROME — rendu AVANT le contenu, jamais dans son flux. */
  chrome?: ReactNode;
  /** PERSISTENT APP NAVIGATION — rendue APRÈS le contenu, jamais dedans. */
  navigation?: ReactNode;
}

export function AppShell({
  avecEntete,
  chrome,
  navigation,
  children,
}: PropsWithChildren<AppShellProps>) {
  const insets = useSafeAreaInsets();
  const { scheme } = useThemeBridge();
  // ── POURQUOI LE SHELL AUSSI INTERROGE LA LARGEUR.
  //
  // La barre se pose SOUS le contenu, le rail À CÔTÉ : ce n'est pas le même
  // axe, et c'est ce fichier qui possède la géométrie du viewport (EP-002).
  // `PrimaryNav` décide de son propre DESSIN, le shell décide de sa PLACE —
  // les deux lisent la même fonction, aucun ne redécide la règle.
  const rail = dispositionDe(useLargeurDeFenetre()) === "rail";
  return (
    <View
      testID="app-shell"
      style={{ flex: 1, paddingTop: avecEntete ? 0 : insets.top }}
    >
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {chrome}
      {/* ── LA MESURE : LE CONTENU A UNE LARGEUR DE LISIBILITÉ.
          //
          // Mesuré le 2026-10-13 : `maxWidth` n'existait NULLE PART dans le
          // moteur. L'application générée était donc une mise en page de
          // téléphone ÉTIRÉE sur un écran de bureau — sur 1440 px, une ligne
          // de liste fait 1440 px de large, le titre à l'extrême gauche, le
          // montant à l'extrême droite, et un désert entre les deux. C'est
          // la première cause du jugement « visuellement nul » porté sur une
          // application générée, captures à l'appui.
          //
          // Posé ICI parce que ce fichier est le propriétaire UNIQUE de la
          // géométrie du viewport (EP-002). Le poser dans chaque écran, ou
          // dans chaque bloc, serait la dispersion que ce module a
          // précisément supprimée.
          //
          // UNE SEULE RÈGLE, DEUX CIBLES : 768 ne mord jamais sur un
          // téléphone de 390 px, et borne la tablette en paysage comme
          // l'écran de bureau. Aucune ramification de plateforme.
          //
          // `width: "100%"` est indispensable AVEC `maxWidth` : sans lui, un
          // conteneur en colonne centré se réduit à la largeur de son
          // contenu le plus large, et les lignes ne tiendraient plus la
          // largeur disponible sur un téléphone. */}
      {/* ── DEUX AXES, UNE SEULE DÉFINITION DU CONTENU.
          //
          // En barre, tout s'empile : contenu puis navigation. En rail, la
          // navigation se met À CÔTÉ — le conteneur passe donc en ligne, et
          // le rail vient EN PREMIER (début de ligne), ce qui le place à
          // gauche en français et à droite en arabe, sans ramification.
          //
          // Le nœud `app-shell-contenu` est écrit UNE fois : sa largeur de
          // lisibilité ne doit pas dépendre de la disposition, sinon les deux
          // finiraient par diverger au premier ajustement. */}
      <View style={rail ? { flex: 1, flexDirection: "row" } : { flex: 1 }}>
        {rail && navigation !== undefined ? (
          <View
            testID="app-shell-navigation"
            // L'encoche du BORD, pas celle du bas : en paysage, un rail collé
            // au bord gauche passerait sous l'encoche d'un iPhone.
            style={{ paddingStart: insets.left, paddingBottom: insets.bottom }}
          >
            {navigation}
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <View
            testID="app-shell-contenu"
            style={{
              flex: 1,
              width: "100%",
              maxWidth: theme.size.measure,
              alignSelf: "center",
              paddingBottom: navigation === undefined || rail ? insets.bottom : 0,
            }}
          >
            {children}
          </View>
        </View>
      </View>
      {!rail && navigation !== undefined ? (
        <View testID="app-shell-navigation" style={{ paddingBottom: insets.bottom }}>
          {navigation}
        </View>
      ) : null}
    </View>
  );
}
