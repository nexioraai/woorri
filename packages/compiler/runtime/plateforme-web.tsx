import { useSyncExternalStore } from "react";

// LA COUTURE DE PLATEFORME, CÔTÉ WEB.
//
// ── LA BARRE D'ÉTAT N'EXISTE PAS DANS UN NAVIGATEUR.
//
// Sur iOS et Android, `StatusBar` décide de la couleur de l'heure et des
// icônes système. Une page web ne commande pas cela : elle le DÉCLARE, par la
// couleur de thème du manifeste, et le système en déduit le contraste. Le
// composant est donc inerte — et il doit exister tout de même, pour que
// `app-shell` reste un seul fichier.
//
// ── LES ZONES SÛRES SONT RENDUES EN CSS, PAS EN NOMBRES.
//
// Le web expose les encoches par `env(safe-area-inset-*)` : des longueurs que
// seul le moteur de style sait résoudre, au moment du rendu. Elles ne
// PEUVENT pas devenir les nombres que le natif renvoie — les convertir
// exigerait de mesurer la page, donc de rendre une première fois faux.
//
// Elles sont donc appliquées là où elles appartiennent : sur l'élément racine
// de `index.html`, une fois, en CSS. Ce module rend des zéros parce que le
// rembourrage est DÉJÀ posé en amont — pas parce que l'encoche est ignorée.
// Les additionner reviendrait à doubler la marge sur un iPhone.

/** Inerte : une page web déclare son thème, elle ne commande pas la barre. */
export function StatusBar(_props: { style?: "light" | "dark" }) {
  return null;
}

/**
 * LA LARGEUR DE LA FENÊTRE — le pendant web, même contrat, autre source.
 *
 * ── POURQUOI `useSyncExternalStore` ET PAS `useState` + `useEffect`.
 *
 * Avec un état et un effet, le PREMIER rendu se fait sur une valeur inventée,
 * puis l'effet corrige. Sur un écran large, cela afficherait une barre du bas
 * pendant une image avant de la remplacer par un rail — un saut visible, à
 * chaque chargement. `useSyncExternalStore` lit la vraie valeur dès le premier
 * rendu et s'abonne ensuite.
 *
 * ── LE TROISIÈME ARGUMENT, ET CE QU'IL DÉCIDE.
 *
 * C'est la valeur rendue quand il n'y a PAS de document — rendu côté serveur.
 * On rend zéro, c'est-à-dire la classe la plus étroite : si jamais on ne sait
 * pas, on sert la disposition du téléphone. Mobile d'abord, y compris dans
 * l'incertitude.
 */
const abonnerALaLargeur = (relire: () => void): (() => void) => {
  window.addEventListener("resize", relire);
  return () => {
    window.removeEventListener("resize", relire);
  };
};

export function useLargeurDeFenetre(): number {
  return useSyncExternalStore(
    abonnerALaLargeur,
    () => window.innerWidth,
    () => 0,
  );
}

/** Zéro partout : l'encoche est traitée en CSS sur la racine du document. */
export function useSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  return { top: 0, bottom: 0, left: 0, right: 0 };
}
