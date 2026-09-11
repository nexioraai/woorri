// STUB D'HÔTE — `expo-status-bar` (étape ② AppShell, 2026-09-11).
//
// Le paquet réel touche l'hôte natif ; en node il n'y a pas de barre d'état.
// Le stub REND un élément nommé portant le style demandé : une observation
// peut vérifier que le shell déclare bien la barre d'état, et avec quel
// style — un stub muet ferait taire la question (même patron que les icônes).
import { createElement } from "react";

export function StatusBar({ style }: { style?: string }) {
  return createElement("ExpoStatusBar", { statusBarStyle: style });
}
