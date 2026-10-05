// @deribfy/primitives — contrats v1 + implémentation StyleSheet+tokens (D-021).
export type {
  A11yProps,
  AppButtonProps,
  AppImageProps,
  AppTextProps,
  BadgeProps,
  GridCardProps,
  RangeeProps,
  SearchEntryProps,
  ListFooterProps,
  ListRowProps,
  Primitives,
  Scheme,
  ScreenShellProps,
  SectionProps,
  SpinnerProps,
  StateViewProps,
  TextFieldProps,
  TextTone,
  TextVariant,
  ThemeBridge,
} from "./contracts.ts";
export {
  AppButton,
  AppImage,
  AppText,
  Badge,
  GridCard,
  Rangee,
  SearchEntry,
  ListFooter,
  ListRow,
  primitives,
  ScreenShell,
  Section,
  Spinner,
  StateView,
  TextField,
} from "./primitives.tsx";
// `useStyles` rejoint l'index (D-087) : les blocs en ont besoin pour la
// vignette de ligne, et importer un sous-chemin depuis un paquet aurait créé
// une seconde porte d'entrée là où il n'en faut qu'une.
export { ThemeRoot, useStyles, useThemeBridge } from "./theme-bridge.tsx";
export { GLYPHE_PAR_ROLE, ROLES_ICONES } from "./roles-icones.ts";
export type { RoleIcone } from "./roles-icones.ts";

// ══════════════════════════════════════════════════════════════
//  LA LISTE — DERNIÈRE PIÈCE DE PLATEFORME SORTIE DES BLOCS.
// ══════════════════════════════════════════════════════════════
//
// ── POURQUOI ELLE DÉMÉNAGE ICI.
//
// Les 505 lignes de `blocks/components.tsx` n'importaient de React Native
// qu'UNE SEULE chose : `FlatList`, en deux usages. Tout le reste passait déjà
// par les primitives — c'est la règle D-023, mécanisée par un cliquet.
//
// Mesuré le 2026-10-05, en préparant la cible WEB : cette unique importation
// était ce qui empêchait les blocs d'être PARTAGÉS entre le natif et le web.
// En la faisant passer derrière les primitives — qui possèdent déjà tout le
// visuel et sont, elles, remplaçables par cible — les blocs deviennent
// agnostiques. Cinq cents lignes passent de « à réécrire » à « partagées ».
//
// ── CE QUE LA PRIMITIVE PORTE, ET RIEN DE PLUS.
//
// Les props sont celles que les deux usages emploient réellement, renommées
// dans la langue du dépôt. Porter l'API complète de `FlatList` reviendrait à
// déplacer la dépendance au lieu de la supprimer : une primitive web devrait
// alors implémenter des comportements que personne n'utilise.
export { Liste } from "./liste.tsx";
export type { ProprietesListe } from "./liste.tsx";

// Les composants HÔTES — même vocabulaire que `@deribfy/primitives-web`, pour
// qu'un fichier d'interface s'écrive une seule fois pour les deux cibles.
export { Vue, Texte, Geste, Signe, Defilement, EviteLeClavier } from "./hotes.tsx";
