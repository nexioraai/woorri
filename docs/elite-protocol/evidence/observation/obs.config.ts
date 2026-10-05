import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
const ici = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
const REACT = ici("../../../../packages/blocks/node_modules/react");
export default defineConfig({
  test: { include: ["**/*.obs.tsx"], environment: "node", root: ici(".") },
  resolve: {
    dedupe: ["react", "react-test-renderer"],
    alias: [
      // Stubs d'HÔTE : ce sont eux qui rendent l'exécution OBSERVABLE en node.
      { find: "react-native-safe-area-context", replacement: ici("./stub-safe-area.ts") },
      { find: "@react-navigation/native", replacement: ici("./stub-navigation.ts") },
      // ── LA COUTURE DE NAVIGATION (2026-10-05) — L'INSTRUMENT SUIT LE CODE.
      //
      // Le runtime n'importe plus `@react-navigation/native` : il lit un
      // CONTRAT que chaque cible remplit (natif, web). L'alias ci-dessus ne
      // l'interceptait donc plus, et le navigateur rendu par défaut est INERTE
      // — toute navigation devenait invisible, et CHAQUE contrôle passait pour
      // un fantôme. Mesuré : 127 fantômes sur `v3-agence-immo` au lieu de 13.
      //
      // Le défaut n'était pas dans les applications : il était dans la sonde.
      // ⚠️ LA REGEX DOIT COUVRIR TOUT LE SPÉCIFICATEUR. Avec un `find` régulier,
      // Vite ne remplace que la PORTION correspondante : `/navigation-contrat$/`
      // transformait `./navigation-contrat` en `./` + chemin du stub, soit un
      // chemin bâtard que rien ne résout. Le `^.*` est ce qui rend le
      // remplacement total.
      { find: /^.*navigation-contrat(\.tsx)?$/, replacement: ici("./stub-navigation.ts") },
      // 1.8.0 — le paquet d'icônes livre du JSX dans des `.js` construits, que
      // le bundler du harnais refuse. Le stub rend un élément NOMMÉ : une
      // observation peut vérifier quelle icône est demandée.
      { find: /^@expo\/vector-icons(\/.*)?$/, replacement: ici("./stub-icones.ts") },
      // Étape ② — la barre d'état déclarée par AppShell, observable en node.
      { find: "expo-status-bar", replacement: ici("./stub-status-bar.ts") },
      { find: "react-native", replacement: ici("./stub-rn.ts") },
      // Une SEULE instance de react, partagée par le rendu et les composants émis.
      { find: "react-test-renderer", replacement: ici("../../../../packages/blocks/node_modules/react-test-renderer") },
      { find: /^react\/(.*)$/, replacement: REACT + "/$1" },
      { find: /^react$/, replacement: REACT },
    ],
  },
});
