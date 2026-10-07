// ============================================================
// CLIQUET — LE TRAIN NE RECULE PAS.
//
// ── LE PIÈGE, MESURÉ LE 2026-10-07.
//
// `npm audit` sur une application émise rend 31 vulnérabilités, dont une
// critique et vingt hautes. Les 31 annoncent un correctif disponible. Et ce
// « correctif » est UNE RÉTROGRADATION :
//
//     @expo/cli                      high   → expo@44.0.6        (MAJEURE)
//     @expo/code-signing-certificates high   → expo-updates@0.11.7 (MAJEURE)
//     …                                     → react-native@0.72.17
//
// Un `npm audit fix --force` ramènerait donc Expo de **57 à 44** et React
// Native de **0.86 à 0.72** — treize versions majeures en arrière, pour
// « corriger » des avis qui portent sur des dépendances transitives. L'outil
// ne ment pas : il propose la seule version de l'arbre où l'avis ne s'applique
// plus. C'est à nous de savoir que ce n'est pas un correctif.
//
// Le danger n'est pas la commande : c'est qu'elle passe INAPERÇUE. Un diff de
// `package.json` au milieu d'une centaine de lignes de verrou ne se remarque
// pas, et une application générée avec Expo 44 ne se verrait qu'au moment de
// publier sur un magasin.
//
// Ce cliquet refuse donc tout recul en dessous du plancher connu. Il n'empêche
// pas d'AVANCER — c'est tout l'intérêt : il distingue une montée d'une chute,
// ce qu'aucun outil d'audit ne sait faire à notre place.
// ============================================================
import { describe, expect, it } from "vitest";
import { RELEASE_TRAIN_V1 } from "../src/release-train.ts";

/** Le plancher. Il MONTE quand on met à jour, il ne descend jamais. */
const PLANCHER: Record<string, [number, number]> = {
  expo: [57, 0],
  "expo-build-properties": [57, 0],
  "expo-updates": [57, 0],
  "react-native": [0, 86],
  react: [19, 0],
};

const deps = (RELEASE_TRAIN_V1 as unknown as { templateDependencies?: Record<string, string> })
  .templateDependencies;

/** « 57.0.17 » → [57, 0]. */
const majeureMineure = (v: string): [number, number] => {
  const [a, b] = v.replace(/^[^0-9]*/, "").split(".");
  return [Number(a), Number(b)];
};

describe("CLIQUET — aucune dépendance du train ne recule", () => {
  it("le train déclare bien ses dépendances", () => {
    expect(deps, "RELEASE_TRAIN_V1.templateDependencies").toBeTruthy();
  });

  for (const [paquet, [maj, min]] of Object.entries(PLANCHER)) {
    it(`${paquet} reste au-dessus de ${String(maj)}.${String(min)}`, () => {
      const declare = deps?.[paquet] ?? "";
      expect(declare, `${paquet} absent du train`).not.toBe("");
      const [a, b] = majeureMineure(declare);
      // Le message compte autant que l'assertion : celui qui le lit vient
      // probablement de lancer `npm audit fix --force` sans le savoir.
      const vu = `${paquet}@${declare}`;
      expect(
        a > maj || (a === maj && b >= min),
        `${vu} est SOUS le plancher ${String(maj)}.${String(min)}. ` +
          "Si cela vient d'un `npm audit fix --force` : ce n'est pas un correctif, " +
          "c'est une rétrogradation — l'outil propose la seule version où l'avis " +
          "ne s'applique plus. Remontez la version. Si c'est une montée délibérée " +
          "vers une majeure supérieure, relevez le plancher dans ce fichier et " +
          "dites dans le commit ce qui a été vérifié.",
      ).toBe(true);
    });
  }

  it("CONTRÔLE NÉGATIF : le plancher saurait voir une chute", () => {
    // Sans ceci, les assertions ci-dessus pourraient passer pour une raison
    // étrangère au cliquet — une comparaison toujours vraie, par exemple.
    const [a, b] = majeureMineure("44.0.6");
    expect(a > 57 || (a === 57 && b >= 0)).toBe(false);
  });
});
