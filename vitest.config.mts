// L-163-A (EP-164) — LA BATTERIE RACINE CONNAÎT SES PROJETS.
//
// DÉFAUT FERMÉ, ET IL AVAIT COÛTÉ CHER : sans cette déclaration, `vitest`
// lancé à la racine ramassait tous les fichiers de test du dépôt en IGNORANT
// les `vitest.config.ts` des paquets — donc leurs alias. Cinq fichiers qui
// PASSENT dans leur paquet échouaient ici sur « Flow is not supported »,
// parce que vitest chargeait le VRAI `react-native` (écrit en Flow) au lieu
// du stub que `packages/blocks` et `packages/primitives` déclarent.
//
// CE FAUX ÉCHEC A ÉTÉ LU PENDANT DES PASSES COMME « le rendu React Native
// est hors d'atteinte » et a fondé la dette L-133-A tout entière. Le harnais
// d'arbre existait et tournait (37 tests verts) — c'est la manière de le
// lancer qui mentait, pas lui.
//
// `apps/web` N'EST PAS DANS LES PROJETS, ET CE N'EST PAS UN OUBLI.
// MESURÉ : lancée seule, sa batterie est à 4071/4071. Ramenée ici, 26 tests
// tombent — ses cliquets d'architecture appellent `checkDomainBoundaries(
// domain, process.cwd())`, donc ils supposent que le processus a été lancé
// DEPUIS `apps/web`. Le `root` d'un projet vitest ne déplace pas le cwd du
// processus : l'hypothèse est dans les tests, pas dans cette configuration.
// C'est une fragilité qui leur appartient, elle est PRÉEXISTANTE, et la
// corriger serait modifier un chantier hors périmètre. Consignée [L-164-A] ;
// `apps/web` garde sa commande propre, qui reste verte.
//
// CE QUI SORT DU PÉRIMÈTRE, ET C'EST DIT PLUTÔT QUE SILENCIEUX :
// `benchmarks/e2e/**/*.test.js` sont des scénarios DETOX (`require("detox")`,
// `device.launchApp`) destinés au runner Detox sur simulateur — jamais à
// vitest. Ils échouaient ici pour la même raison de fond : ramassés par un
// runner qui n'est pas le leur. Les exclure n'est pas les masquer ; c'est
// cesser de les compter comme des tests vitest, ce qu'ils ne sont pas.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Chaque projet est lancé AVEC sa propre configuration — c'est tout
    // l'objet de ce fichier. Ne jamais remplacer par un `include` global :
    // ce serait retomber exactement dans le défaut refermé ici.
    projects: ["packages/*/vitest.config.ts"],
  },
});
