import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// ════════════════════════════════════════════════════════════════════
//  LE HARNAIS DE LA CIBLE WEB — ET CE QU'IL NE CONTIENT PAS.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI UN SECOND FICHIER DE CONFIGURATION.
//
// Celui du natif aligne SEPT stubs d'hôte : `react-native`,
// `expo-status-bar`, `react-native-safe-area-context`, les icônes Expo, la
// navigation. Ce sont eux qui rendent une application Expo observable en node.
//
// Ici, il n'y en a AUCUN — et c'est le cœur de la preuve. Une application web
// émise n'a plus rien à stuber : ses primitives rendent `div`, `span` et
// `button`, sa couture de plateforme est inerte par conception, et sa
// navigation lit l'adresse en se gardant d'un `window` absent. Si ce fichier
// devait un jour gagner un stub, c'est que du natif aurait fui dans la cible
// web — et le harnais le dirait avant l'utilisateur.
//
// ── POURQUOI PAS DE DOM, ET CE QUE ÇA NE COÛTE PAS.
//
// Monter une application web semble exiger un DOM. Le dépôt n'en embarque
// aucun (ni jsdom ni happy-dom), et en ajouter un pour cette gate aurait été
// une dépendance de plus pour une propriété qu'on peut prouver sans elle :
// `react-test-renderer` monte un arbre de composants QUEL QUE SOIT le type de
// ses hôtes — `div` y est une chaîne, comme `View`. Les effets tournent, les
// pressions se déclenchent, les avertissements de React se capturent.
//
// ⚠️ CE QUI RESTE HORS DE PORTÉE, ET QUI EST DIT : la MISE EN PAGE. Aucun
// style n'est calculé, donc rien ici ne prouve qu'un écran est lisible — seul
// un vrai navigateur le dirait. Cette gate prouve que l'application VIT, pas
// qu'elle est belle.
const ici = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
const REACT = ici("../../../../packages/blocks/node_modules/react");

export default defineConfig({
  // Extension PROPRE (`.obsweb.tsx`) : le harnais natif inclut `**/*.obs.tsx`
  // et aurait ramassé cette observation avec ses sept stubs — l'application
  // web se serait alors montée dans le décor du natif, et la gate aurait
  // prouvé le contraire de ce qu'elle cherche.
  test: { include: ["**/*.obsweb.tsx"], environment: "node", root: ici(".") },
  resolve: {
    dedupe: ["react", "react-test-renderer"],
    alias: [
      // Une SEULE instance de react, partagée par le rendu et les composants
      // émis — même raison que le harnais natif : deux instances rendent les
      // hooks inutilisables, avec un message qui accuse le composant.
      {
        find: "react-test-renderer",
        replacement: ici("../../../../packages/blocks/node_modules/react-test-renderer"),
      },
      { find: /^react\/(.*)$/, replacement: REACT + "/$1" },
      { find: /^react$/, replacement: REACT },
    ],
  },
});
