// EP-141 ① — CLIQUET : UN FAIT DU CONTRAT DOIT AVOIR UN CONSOMMATEUR.
//
// Le contrat interdit au MODÈLE les faits sans consommateur
// (`MODELE_COMMERCE_SANS_OBJET`) et ne se l'appliquait pas à LUI-MÊME. Trois
// passes ont trouvé des cas par accident ; ce cliquet les rend détectables.
//
// PÉRIMÈTRE ASSUMÉ ET DIT : les champs de publication — `compliance`,
// `native`, `network` — plus les clés racine du document. C'est là que vivent
// les faits qu'une plateforme exige et qu'un moteur peut oublier d'honorer.
// L'inventaire complet (40 noms de champs) a été fait à la main en EP-141 ;
// ce cliquet garde la zone où un oubli coûte un refus de publication.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HERE = join(import.meta.dirname, "..", "..", "..");

/** Le code du MOTEUR, débarrassé de ce qui n'est pas une lecture. */
function sourcesDuMoteur(): { fichier: string; code: string }[] {
  const out: { fichier: string; code: string }[] = [];
  const visiter = (dir: string): void => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      // `styling` porte des Pods iOS : des dizaines de milliers d'en-têtes
      // qui ne sont pas du moteur et qui feraient durer le scan une minute.
      if (f === "node_modules" || f === "results" || f === "corpus-v2") continue;
      if (f === "styling" || f === "attic") continue;
      if (statSync(p).isDirectory()) { visiter(p); continue; }
      if (!/\.(ts|tsx|mjs)$/.test(f)) continue;
      // Un TEST ou une FIXTURE écrit un champ sans le consommer ; du code
      // EMBARQUÉ est une copie. Ni l'un ni l'autre ne prouve un usage.
      if (f.includes("embedded-") || f.includes(".generated.")) continue;
      if (p.includes("/tests/") || f.includes(".test.") || f.includes("fixtures")) continue;
      const code = readFileSync(p, "utf8")
        // Une MENTION EN PROSE n'est pas une lecture — ni en commentaire, ni
        // dans une chaîne. Mesuré : le registre de capacités nomme
        // `compliance.accountDeletionRequired` dans un texte de contrainte,
        // et cette seule mention le faisait passer pour consommé.
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/.*$/gm, " ")
        .replace(/"(?:[^"\\]|\\.)*"/g, " ")
        .replace(/'(?:[^'\\]|\\.)*'/g, " ");
      out.push({ fichier: p.slice(HERE.length + 1), code });
    }
  };
  for (const d of ["packages", "benchmarks"]) visiter(join(HERE, d));
  return out;
}

// Le scan est fait UNE fois : le relancer par champ coûtait une seconde
// chacun, et le test expirait avant de rien prouver.
const SOURCES = sourcesDuMoteur();

/** Un consommateur LIT : accès, indexation ou destructuration. */
function lecteurs(champ: string): string[] {
  const motif = new RegExp(`\\.${champ}\\b|\\[\\s*["'\`]${champ}["'\`]|\\{[^}]*\\b${champ}\\b[^}]*\\}\\s*=`);
  return SOURCES.filter((s) => motif.test(s.code)).map((s) => s.fichier);
}

/** Restituer n'est pas décider : un rendu de texte ne consomme rien. */
const RESTITUTION = /render-text|journal|rapport\b/;

// Les champs de publication, tenus un par un.
const FAITS = [
  "commerceClass", "dataCollected", "accountDeletionRequired",
  "minIosVersion", "minAndroidSdk", "allowedDomains", "policy",
];

/**
 * EXCEPTIONS DÉCLARÉES — un fait lu sans qu'aucune décision n'en dépende.
 * Chacune porte sa raison ET sa dette. Vider cette liste est un objectif ;
 * l'allonger sans raison écrite est ce que le cliquet empêche.
 */
const SANS_EFFET_ASSUME: Readonly<Record<string, string>> = {
  accountDeletionRequired:
    "L-137-A — porte une OBLIGATION Apple (5.1.1(v)) et n'est que restitué : " +
    "aucun écran, aucun juge, aucun manifeste n'en dépend. Depuis EP-137, le " +
    "genre d'écran `account_delete` exprime la même exigence par une surface : " +
    "les deux doivent être réconciliés.",
  dataCollected:
    "L-141-A — porte la MATIÈRE du formulaire Data safety de Google Play, que " +
    "tout développeur doit remplir (EP-138). Le document déclare ce qu'il " +
    "collecte, et rien n'en fait quoi que ce soit : ni permission induite, ni " +
    "texte de politique, ni sortie destinée à la console. La déclaration reste " +
    "un acte de console, mais la matière existe et dort.",
  policy:
    "L-141-B — `network.policy` vaut `deny_by_default` dans tout le corpus et " +
    "n'est LU par aucune décision : c'est `allowedDomains` qui est consommé, " +
    "par neuf fichiers. La politique est donc appliquée DE FAIT par la liste " +
    "blanche, jamais parce que le champ le demande — si un document déclarait " +
    "une autre politique, rien ne changerait. L'audit EP-138 la donnait pour " +
    "produite : c'était optimiste.",
};

describe("EP-141 ① · aucun fait de publication sans consommateur", () => {
  it("chaque fait est LU quelque part dans le moteur", () => {
    for (const champ of FAITS) {
      expect(lecteurs(champ).length, `« ${champ} » n'est lu nulle part`).toBeGreaterThan(0);
    }
  });

  it("chaque fait pèse sur une DÉCISION, ou figure aux exceptions déclarées", () => {
    for (const champ of FAITS) {
      const decisionnels = lecteurs(champ).filter((f) => !RESTITUTION.test(f));
      if (decisionnels.length > 0) continue;
      expect(
        SANS_EFFET_ASSUME[champ],
        `« ${champ} » n'est que restitué et n'est pas déclaré comme tel`,
      ).toBeDefined();
    }
  });

  it("toute exception déclarée l'est encore — une liste qui vieillit ment", () => {
    for (const [champ, raison] of Object.entries(SANS_EFFET_ASSUME)) {
      expect(raison.length).toBeGreaterThan(60);
      const decisionnels = lecteurs(champ).filter((f) => !RESTITUTION.test(f));
      expect(
        decisionnels,
        `« ${champ} » a maintenant un consommateur : retirer l'exception`,
      ).toEqual([]);
    }
  });

  it("le cas connu est bien celui-là, et lui seul", () => {
    // Vérification frontale : TROIS faits de publication sont restitués sans
    // qu'aucune décision n'en dépende. L'inventaire manuel n'en avait vu
    // qu'un ; le cliquet, écrit ensuite, en a trouvé deux de plus — c'est
    // exactement ce qu'on attend d'un instrument par rapport à une lecture.
    const restitues = FAITS.filter(
      (c) => lecteurs(c).length > 0 && lecteurs(c).every((f) => RESTITUTION.test(f)),
    );
    expect(restitues.sort()).toEqual(["accountDeletionRequired", "dataCollected", "policy"]);
  });
});
