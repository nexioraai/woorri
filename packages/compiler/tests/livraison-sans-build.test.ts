// CLIQUET — LA LIVRAISON SANS RECONSTRUCTION EST DÉRIVÉE, JAMAIS SAISIE.
//
// Fait mesuré le 2026-09-09 : TROIS défauts jugés à l'écran, tous en
// JavaScript, ont coûté QUATRE builds et ~1 h 30. Le routeur du dépôt savait
// déjà décider ce qui peut partir sans reconstruire — il n'avait aucun runtime
// à qui livrer. `expo-updates` entre dans le train (feu vert propriétaire).
//
// Deux faits verrouillés, chacun avec son contrôle négatif :
//   1. l'adresse de livraison est DÉRIVÉE du projet déclaré — deux sources
//      pour la même liaison finiraient par diverger, et une app irait chercher
//      ses mises à jour chez quelqu'un d'autre ;
//   2. la version d'exécution est l'EMPREINTE NATIVE — une livraison
//      n'atteint que les builds dont la surface native est identique. C'est la
//      plateforme qui refuse, en plus du routeur : deux gardes indépendantes.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitProject } from "../src/emit-project.ts";
import { RELEASE_TRAIN_V1 } from "../src/release-train.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOC = join(
  HERE, "..", "..", "..", "slices", "validation-appareil", "validation-appareil.air.json",
);

interface Distribution { owner: string; projectId: string }
const base = JSON.parse(readFileSync(DOC, "utf8")) as {
  app: { distribution?: Distribution };
};

const appJson = (doc: unknown): Record<string, unknown> => {
  const brut = emitProject(doc).files.get("app.json") ?? "{}";
  return (JSON.parse(brut) as { expo: Record<string, unknown> }).expo;
};

describe("cliquet — livraison sans reconstruction", () => {
  it("le document de l'appareil déclare bien un projet de distribution", () => {
    expect(base.app.distribution?.projectId).toBeTruthy();
  });

  it("l'adresse est DÉRIVÉE de l'identifiant de projet déclaré", () => {
    const expo = appJson(base);
    const id = base.app.distribution?.projectId ?? "";
    expect(expo.updates).toEqual({ url: `https://u.expo.dev/${id}` });
    // Et la même source alimente la liaison de build : une seule vérité.
    expect(expo.extra).toEqual({ eas: { projectId: id } });
  });

  it("la version d'exécution est l'EMPREINTE NATIVE, pas un numéro à la main", () => {
    // Un numéro saisi laisserait passer une livraison vers un build dont la
    // surface native diffère — exactement ce que le routeur interdit.
    expect(appJson(base).runtimeVersion).toEqual({ policy: "fingerprint" });
  });

  it("CONTRÔLE NÉGATIF — sans projet déclaré, AUCUNE livraison n'est configurée", () => {
    const sansProjet = { ...base, app: { ...base.app } };
    delete sansProjet.app.distribution;
    const expo = appJson(sansProjet);
    expect(expo.updates).toBeUndefined();
    expect(expo.runtimeVersion).toBeUndefined();
    expect(expo.extra).toBeUndefined();
  });

  it("le runtime de livraison est DANS le train, en version exacte", () => {
    const v = RELEASE_TRAIN_V1.templateDependencies["expo-updates"];
    expect(v).toBeDefined();
    // Version EXACTE : ni plage, ni caret, ni tilde — comme toutes les autres.
    expect(v).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
