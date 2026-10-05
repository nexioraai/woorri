// ════════════════════════════════════════════════════════════════════
//  LA NAVIGATION — DERNIÈRE COUTURE DE PLATEFORME DU RUNTIME.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI UNE COUTURE, ET NON DEUX RUNTIMES.
//
// `air-runtime.tsx` fait 1 029 lignes et n'importe de plateforme qu'UNE SEULE
// chose : `useNavigation` de `@react-navigation/native`. Mesuré le 2026-10-05,
// en préparant la cible web — exactement le même constat que pour `FlatList`
// dans les blocs, et exactement le même remède.
//
// Dupliquer le runtime pour changer une ligne aurait créé deux vérités qui
// divergent au premier correctif. On déclare donc le CONTRAT ici, et chaque
// cible le remplit : React Navigation sur le natif, l'historique du navigateur
// sur le web.
//
// ── CE QUE LE CONTRAT PORTE, ET RIEN DE PLUS.
//
// Deux gestes, mesurés sur les usages réels :
//   · `navigate` — aller à un écran ;
//   · `reset` — REMPLACER la pile par un seul écran, ce que fait une
//     destination principale (sans quoi `navigate` les empile et l'en-tête
//     dessine une flèche de retour qui fait défiler les onglets à l'envers —
//     défaut vu sur appareil, voir `racines-navigation`).
//
// Porter l'API complète de React Navigation reviendrait à déplacer la
// dépendance au lieu de la supprimer : la cible web devrait implémenter des
// comportements que personne n'utilise.

import { createContext, useContext, type PropsWithChildren } from "react";

/** Ce qu'une cible doit savoir faire pour qu'une application navigue. */
export interface Navigateur {
  navigate: (name: string, params?: Record<string, unknown>) => void;
  reset: (state: {
    index: number;
    routes: readonly { name: string; params?: Record<string, unknown> }[];
  }) => void;
}

/**
 * NAVIGATEUR INERTE PAR DÉFAUT, et c'est un choix.
 *
 * Une application montée sans racine de navigation ne doit pas TOMBER : elle
 * doit simplement ne pas naviguer. Lever ici ferait échouer un harnais de
 * rendu qui monte un écran isolé — et ces harnais sont précisément ce qui
 * prouve que les écrans se montent.
 */
const INERTE: Navigateur = { navigate: () => undefined, reset: () => undefined };

const Contexte = createContext<Navigateur>(INERTE);

export function NavigationRoot({ navigateur, children }: PropsWithChildren<{ navigateur: Navigateur }>) {
  return <Contexte.Provider value={navigateur}>{children}</Contexte.Provider>;
}

/** Le navigateur courant. Même nom que chez React Navigation, à dessein. */
export function useNavigation(): Navigateur {
  return useContext(Contexte);
}
