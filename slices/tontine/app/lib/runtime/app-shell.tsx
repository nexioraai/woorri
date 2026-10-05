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
import { StatusBar, useSafeAreaInsets } from "./plateforme";
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
