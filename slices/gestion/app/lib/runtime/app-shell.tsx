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
// La barre d'état est DÉCLARÉE ici (expo-status-bar, présent dans le verrou
// embarqué) : style dérivé du thème — icônes sombres sur surface claire,
// claires sur surface sombre. Aucun écran généré n'a le droit de toucher aux
// insets : le cliquet d'émission le vérifie (app-shell.test.ts).
//
// La persistance reste STRUCTURELLE : c'est l'ORDRE DE L'ARBRE (chrome et
// navigation hors du conteneur défilant) qui la fait, pas une position
// absolue — vérifiable sans lire un style (D-086, mission chrome).
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeBridge } from "../primitives/theme-bridge";
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
  return (
    <View
      testID="app-shell"
      style={{ flex: 1, paddingTop: avecEntete ? 0 : insets.top }}
    >
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {chrome}
      <View
        testID="app-shell-contenu"
        style={{ flex: 1, paddingBottom: navigation === undefined ? insets.bottom : 0 }}
      >
        {children}
      </View>
      {navigation === undefined ? null : (
        <View testID="app-shell-navigation" style={{ paddingBottom: insets.bottom }}>
          {navigation}
        </View>
      )}
    </View>
  );
}
