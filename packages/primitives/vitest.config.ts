import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
  resolve: {
    alias: {
      // ⚠️ AVANT `react-native` — L'ORDRE EST LA CORRECTION.
      //
      // Vite résout les alias par PRÉFIXE : « react-native-svg » commence par
      // « react-native ». Placé après, il serait réécrit vers le stub de
      // react-native et le module SVG n'existerait jamais.
      "react-native-svg": fileURLToPath(
        new URL("./tests/stubs/react-native-svg.ts", import.meta.url),
      ),
      // E1 (dossier 3.2 validé) : les tests structurels s'exécutent en node
      // avec un STUB de react-native (composants hôtes purs pour
      // react-test-renderer). Le typage, lui, se fait contre les VRAIS types
      // RN (devDependency) ; la vérité de rendu natif est le harnais 3.4.
      "react-native": fileURLToPath(
        new URL("./tests/stubs/react-native.ts", import.meta.url),
      ),
      // 1.6.0 — le SIGNE des boutons vient du paquet d'icônes, qui livre du
      // JSX dans des `.js` construits : inobservable en node sans stub.
      "@expo/vector-icons/Ionicons": fileURLToPath(
        new URL("./tests/stubs/vector-icons.ts", import.meta.url),
      ),
    },
  },
});
