// LES PRIMITIVES DE LA CIBLE WEB — même contrat que `@deribfy/primitives`.
//
// Un bloc ne connaît NI l'une NI l'autre : il ne connaît que le contrat. C'est
// ce qui permet aux 505 lignes de `blocks/components.tsx` d'être partagées
// entre les deux cibles sans qu'une ligne ne change.
export {
  ScreenShell, Section, AppText, AppButton, TextField, AppImage, ListFooter,
  SearchEntry, Rangee, GridCard, ListRow, Badge, StateView, Spinner, primitives,
} from "./primitives.tsx";
export { Liste } from "./liste.tsx";
export type { ProprietesListe } from "./liste.tsx";
// Le pont de thème et le vocabulaire des signes sont AGNOSTIQUES : ils ne
// contiennent ni balise ni composant natif. On les ré-exporte depuis le paquet
// commun plutôt que d'en faire une seconde vérité.
export { ThemeRoot, useStyles, useThemeBridge } from "@deribfy/primitives/theme-bridge";
export { GLYPHE_PAR_ROLE, ROLES_ICONES } from "@deribfy/primitives/roles-icones";

// Les composants HÔTES — même vocabulaire que `@deribfy/primitives`.
export { Vue, Texte, Geste, Visuel, Saisie, Attente, Signe, Defilement, EviteLeClavier } from "./hotes.tsx";
