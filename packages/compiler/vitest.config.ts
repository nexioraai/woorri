import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // ── CE PAQUET NE CONTIENT PAS DES TESTS UNITAIRES (2026-10-14).
    //
    // Ses preuves COMPILENT le corpus entier — 46 documents, les trois
    // cibles, parfois dix fois pour comparer des empreintes. Le defaut de
    // vitest est 5 s, pense pour une fonction pure.
    //
    // MESURE qui a impose ce reglage : l'ajout d'UN document au corpus
    // (Conterak) a fait basculer trois preuves d'un coup — EP-155, EP-161 et
    // EP-218 — par depassement de delai, AUCUNE assertion cassee. Elles
    // tenaient a 4,4 s, 7,2 s et 3,5 s en isolation : elles vivaient au bord
    // du defaut, et le lot complet les y a poussees.
    //
    // Les corriger une par une aurait fait tomber la suivante au prochain
    // document. La chose a regler n'est pas le test, c'est le reglage.
    //
    // 30 s et pas davantage : quatre fois la plus lente mesuree (8,3 s), ce
    // qui laisse la marge d'un lot charge SANS masquer un test reellement
    // bloque. Les preuves les plus lourdes gardent leur `timeout` explicite.
    testTimeout: 30_000,
  },
});
