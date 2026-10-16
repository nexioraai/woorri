// STUB react-native pour tests structurels (E1) — même approche que
// @deribfy/primitives (composants hôtes purs), plus une FlatList
// FONCTIONNELLE : react-test-renderer n'appelle jamais renderItem d'un
// composant hôte, le stub matérialise donc les lignes.
import { createElement, Fragment } from "react";
import type { ReactElement } from "react";

export const View = "View";
export const Text = "Text";
export const TextInput = "TextInput";
export const Pressable = "Pressable";
export const ActivityIndicator = "ActivityIndicator";
export const StyleSheet = {
  create: <T,>(styles: T): T => styles,
};

// ── LES DEUX CROCHETS QUE LA COUTURE DE PLATEFORME EMPLOIE (2026-10-16).
//
// `plateforme.tsx` interroge React Native pour deux FAITS que seul le système
// connaît : la largeur de la fenêtre (barre du bas ou barre latérale) et le
// schéma de couleurs choisi par la personne (clair ou sombre — exigence
// Google Play, et Apple écrit que le mode sombre n'est pas optionnel).
//
// Le stub ne les portait pas, et les gates d'applications émises ont rendu
// « useColorScheme is not a function » sur CHAQUE écran. Ce ne sont pas des
// inventions : les deux sont des API publiques de React Native, et ce stub
// était simplement en retard sur ce que le runtime emploie.
//
// ── POURQUOI CES VALEURS-LÀ, ET PAS D'AUTRES.
//
// 390 × 844, c'est un iPhone en portrait — SOUS le seuil de 840, donc la
// barre du bas. « light », c'est le schéma qui était posé en dur avant la
// correction. Les deux ensemble reproduisent EXACTEMENT la disposition que
// ces gates mesuraient déjà : rien ne bouge dans ce qu'ils observent.
//
// Une largeur au-dessus de 840 aurait fait basculer tous les écrans émis en
// barre latérale — un changement RÉEL, mais mesuré nulle part ici. Le choix
// va donc dans le sens de la non-régression, pas de la nouveauté.
export const useWindowDimensions = (): { width: number; height: number } => ({
  width: 390,
  height: 844,
});

export const useColorScheme = (): "light" | "dark" => "light";

interface FlatListStubProps<ItemT> {
  data?: readonly ItemT[];
  renderItem: (info: { item: ItemT; index: number }) => ReactElement;
  keyExtractor?: (item: ItemT, index: number) => string;
  ListHeaderComponent?: ReactElement | (() => ReactElement) | null;
  ListEmptyComponent?: ReactElement | (() => ReactElement) | null;
  [prop: string]: unknown;
}

const materialiser = (
  c: ReactElement | (() => ReactElement) | null | undefined,
): ReactElement | null =>
  c == null ? null : typeof c === "function" ? createElement(c) : c;

export function FlatList<ItemT>({
  data,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListEmptyComponent,
  ...rest
}: FlatListStubProps<ItemT>): ReactElement {
  // DET-033 : le stub matérialise aussi l'en-tête et l'état vide — la vraie
  // FlatList les rend, un stub qui les tairait rendrait ces régions
  // inobservables (c'est exactement ainsi qu'un défaut réel se cacherait).
  const lignes = (data ?? []).map((item, index) =>
    createElement(
      Fragment,
      { key: keyExtractor?.(item, index) ?? String(index) },
      renderItem({ item, index }),
    ),
  );
  return createElement(
    "FlatList",
    rest,
    materialiser(ListHeaderComponent),
    lignes.length === 0 ? materialiser(ListEmptyComponent) : lignes,
  );
}
