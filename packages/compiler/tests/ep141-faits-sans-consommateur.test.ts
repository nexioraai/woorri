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
  // EP-142 — VIDE, et c'est le résultat de la réconciliation.
  //
  // `accountDeletionRequired` PRESCRIT désormais sa surface : le fait du
  // contrat et l'écran de genre `account_delete` sont la même exigence, et
  // une incohérence entre les deux est refusée (L-137-A close).
  //
  // `dataCollected` alimente les obligations du propriétaire : le document
  // déclare ce qu'il collecte, et cette matière est RENDUE à celui qui devra
  // la recopier dans Play Console (L-141-A close).
  //
  // Une entrée ici doit porter sa dette ET être vraie : le test suivant
  // vérifie qu'une exception qui a gagné un consommateur est retirée.
};

/**
 * EP-142 ③ — UNE CONSTANTE N'EST PAS UN FAIT SANS CONSOMMATEUR.
 *
 * `network.policy` est déclaré `z.literal("deny_by_default")` : le schéma
 * n'autorise AUCUNE autre valeur. Mon diagnostic de L-141-B — « un document
 * déclarant une autre politique ne changerait rien » — était FAUX : un tel
 * document serait refusé à la porte. Un champ qui ne varie pas ne peut pas
 * mentir, donc il n'a pas besoin de peser sur une décision ; l'invariant est
 * tenu par le schéma lui-même, ce qui est plus fort qu'un juge.
 *
 * Le danger que l'inventaire traque n'existe que pour les champs qui VARIENT.
 * Le cliquet les distingue désormais, au lieu de les confondre.
 */
const CONSTANTES_DE_SCHEMA: readonly string[] = ["policy"];

describe("EP-141 ① · aucun fait de publication sans consommateur", () => {
  it("chaque fait est LU quelque part dans le moteur", () => {
    for (const champ of FAITS) {
      expect(lecteurs(champ).length, `« ${champ} » n'est lu nulle part`).toBeGreaterThan(0);
    }
  });

  it("chaque fait pèse sur une DÉCISION, ou figure aux exceptions déclarées", () => {
    for (const champ of FAITS) {
      if (CONSTANTES_DE_SCHEMA.includes(champ)) continue;
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

  it("plus aucun fait de publication n'est lu sans effet", () => {
    // Vérification frontale, et c'est ce qui a changé en EP-142 : plus aucun
    // fait de publication n'est restitué sans peser sur quelque chose.
    const restitues = FAITS.filter(
      (c) =>
        !CONSTANTES_DE_SCHEMA.includes(c) &&
        lecteurs(c).length > 0 &&
        lecteurs(c).every((f) => RESTITUTION.test(f)),
    );
    // EP-142 — la liste est VIDE : `accountDeletionRequired` prescrit
    // désormais sa surface, `dataCollected` alimente les obligations du
    // propriétaire, et `policy` est une constante de schéma, pas une dette.
    expect(restitues).toEqual([]);
  });
});
