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
