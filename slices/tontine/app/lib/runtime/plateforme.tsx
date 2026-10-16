// LA COUTURE DE PLATEFORME — barre d'état et zones sûres.
//
// ── CE QUE `app-shell` DEMANDAIT À LA PLATEFORME, ET POURQUOI C'EST ICI.
//
// Mesuré le 2026-10-05 : l'enveloppe d'application importait `expo-status-bar`
// et `react-native-safe-area-context`. Deux paquets qui n'existent pas sur le
// web — et le shell est précisément le fichier qui doit valoir pour les deux
// cibles, puisque c'est lui qui POSE les insets (EP-002, un seul site).
//
// La couture suit celle de la navigation : ce fichier porte l'implémentation
// NATIVE, la cible web le remplace par `plateforme-web.tsx`. Les deux exposent
// le même contrat, et `app-shell` n'en connaît aucun des deux.
export { StatusBar } from "expo-status-bar";
export { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWindowDimensions } from "react-native";

/**
 * LA LARGEUR DE LA FENÊTRE, EN POINTS INDÉPENDANTS DE LA DENSITÉ.
 *
 * ── POURQUOI LA COUTURE, ET PAS LA NAVIGATION ELLE-MÊME.
 *
 * Connaître la largeur est un FAIT DE PLATEFORME : le natif l'obtient d'un
 * module de React Native, le web d'une propriété du document. Les deux
 * répondent la même chose — un nombre — et c'est tout ce que l'interface a le
 * droit de savoir. La DÉCISION qu'on en tire (barre ou rail) vit ailleurs, dans
 * `disposition-navigation`, pour qu'elle soit lisible en un seul endroit.
 *
 * `useWindowDimensions` est un abonnement, pas une lecture : la valeur suit la
 * rotation de l'appareil et le redimensionnement d'une fenêtre sur iPad. Lire
 * `Dimensions.get("window")` une fois aurait figé la disposition au premier
 * rendu — un iPad tourné serait resté en barre du bas.
 */
export function useLargeurDeFenetre(): number {
  return useWindowDimensions().width;
}
