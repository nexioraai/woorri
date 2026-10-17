// STUB D'HÔTES RN — étend celui du dépôt sans le modifier.
// Le stub de `packages/blocks/tests/stubs` ne couvre que les hôtes utilisés par
// les blocs ; les écrans ÉMIS en utilisent d'autres (ScrollView).
export * from "../../../../packages/blocks/tests/stubs/react-native";
export const ScrollView = "ScrollView";
// DET-030 — les écrans sans liste sont désormais enveloppés d'un ancrage
// clavier ; l'hôte doit exister ici aussi, sinon l'élément est `undefined`
// et le rendu observable explose (vu en CI, pas sur l'appareil).
export const KeyboardAvoidingView = "KeyboardAvoidingView";
export const SafeAreaView = "SafeAreaView";
export const Image = "Image";

// ── `Platform`, AJOUTÉ LE 2026-10-17 ET IL MANQUAIT VRAIMENT.
//
// La couture de feuille résout le rôle de famille de caractères en une police
// réellement présente, et pour cela elle lit `Platform.OS`. Le stub ne
// l'exposait pas : tout montage levait « Cannot read properties of undefined
// (reading 'OS') ».
//
// `ios` est choisi parce que c'est la plateforme la plus EXIGEANTE : elle ne
// connaît pas les alias génériques `serif`/`monospace` d'Android, donc elle
// demande de vrais noms. Un montage qui passe ici passe sur les deux.
export const Platform = {
  OS: "ios" as const,
  select: <T,>(specifics: { ios?: T; android?: T; default?: T }): T | undefined =>
    specifics.ios ?? specifics.default,
};
