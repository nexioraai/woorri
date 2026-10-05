import { defineConfig } from "vitest/config";

// AUCUN ALIAS, ET C'EST LE SIGNE QUE LE PORTAGE TIENT. Le paquet natif doit
// remplacer `react-native` et les icônes Expo par des stubs pour s'exécuter en
// node ; celui-ci n'a rien à remplacer, parce qu'il ne dépend de rien d'autre
// que de React. C'est la mesure la plus simple de ce qu'on a gagné.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
});
