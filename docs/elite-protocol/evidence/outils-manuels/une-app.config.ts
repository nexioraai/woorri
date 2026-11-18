// OUTIL MANUEL (2026-11-18) — sorti du dossier des observations : il ne tourne dans
// AUCUNE CI. Lancement : npm run verifier:une-app -- <document.air.json>
// LA CONFIGURATION DU CAS PARTICULIER — les MÊMES alias, un autre filet.
//
// Elle REPREND `obs.config.ts` au lieu de recopier ses treize alias. Une
// liste d'alias recopiée dérive : le jour où la couture de navigation change
// (elle a déjà changé une fois, et la sonde a compté 127 fantômes au lieu de
// 13), seule la copie oubliée mentirait.
//
// Seule différence : le filet. `**/*.une.tsx` au lieu de `**/*.obs.tsx` —
// ce fichier d'observation ne tourne donc JAMAIS avec le corpus, et le
// cliquet du corpus continue d'exiger son nombre exact d'applications.
import { fileURLToPath } from "node:url";
import base from "../observation/obs.config.ts";

export default {
  ...base,
  // La racine est CE dossier : les alias restent ceux des observations (absolus).
  test: { ...base.test, include: ["**/*.une.tsx"], root: fileURLToPath(new URL(".", import.meta.url)) },
};
