// ÉTAPE ⑤ (mission Elite A++++, 2026-09-11) — LE GÉNÉRATEUR SOUS DÉPENDANCES.
//
// EP-005 : passe `ecrans` avant `actions` = boutons promus avant leurs gestes
// (cibles mortes payées en réparation — F1 mesuré). Résolution démontrée :
// `capacites` RÉORDONNÉE avant `ecrans` (dépendance actions→capability
// déclarée, règle 5) ; le cycle écrans↔actions CONTRAINT par des obligations
// mécaniques dérivées des sections émises. Ces tests jugent le module pur et
// cliquettent l'ordre des passes dans emit-v3.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { actionsPromises, ciblesVivantes, obligationsPourPasse } from "../../../benchmarks/air-emission/obligations-passes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const ECRANS = [
  {
    id: "scr_accueil",
    blocks: [
      { id: "blk_recherche", blockType: "search_entry", props: [{ key: "actionId", value: "act_chercher" }] },
      { id: "blk_selection", blockType: "list", props: [{ key: "seeAllLabel", value: "Voir plus" }] },
      { id: "blk_entete", blockType: "header", props: [{ key: "title", value: "Accueil" }] },
    ],
  },
  {
    id: "scr_compte",
    blocks: [{ id: "blk_sortir", blockType: "button", props: [{ key: "actionId", value: "act_sortir" }] }],
  },
];

describe("étape ⑤ — obligations mécaniques dérivées des sections émises", () => {
  it("chaque actionId promis par un bloc devient une obligation nommée", () => {
    const { directes, secondaires } = actionsPromises(ECRANS);
    expect(directes.map((d) => d.actionId).sort()).toEqual(["act_chercher", "act_sortir"]);
    expect(secondaires).toEqual([{ screenId: "scr_accueil", blockId: "blk_selection" }]);
    const texte = obligationsPourPasse("actions", { screens: ECRANS });
    expect(texte).toContain("act_chercher");
    expect(texte).toContain("act_sortir");
    expect(texte).toContain('role:"secondary"');
    expect(texte).toContain("scr_accueil.blk_selection");
  });

  it("sans promesse, aucune obligation — le texte est vide", () => {
    expect(obligationsPourPasse("actions", { screens: [] })).toBe("");
    expect(obligationsPourPasse("base", { screens: ECRANS })).toBe("");
    expect(obligationsPourPasse("ecrans", { screens: ECRANS })).toBe("");
  });

  it("cablage/intention reçoivent la liste FERMÉE des cibles vivantes", () => {
    const assembled = {
      screens: ECRANS,
      actions: [{ id: "act_chercher" }, { id: "act_sortir" }],
      entities: [{ id: "ent_produit", fields: [{ id: "fld_nom" }] }],
      datasets: [{ id: "data_produits" }],
      capabilities: ["auth"],
      navigation: { routes: [{ id: "nav_accueil" }] },
    };
    const ids = ciblesVivantes(assembled);
    for (const attendu of [
      "scr_accueil", "blk_recherche", "act_chercher", "ent_produit",
      "fld_nom", "data_produits", "auth", "nav_accueil",
    ]) {
      expect(ids).toContain(attendu);
    }
    const texte = obligationsPourPasse("cablage", assembled);
    expect(texte).toContain("liste FERMÉE");
    expect(texte).toContain("act_sortir");
    expect(obligationsPourPasse("intention", assembled)).toContain("nodeIds");
  });

  it("CLIQUET — l'ordre des passes respecte les dépendances démontrées", () => {
    const source = readFileSync(
      join(HERE, "..", "..", "..", "benchmarks", "air-emission", "emit-v3.mjs"),
      "utf8",
    );
    const pos = (nom: string) => source.search(new RegExp(`name: "${nom}"`));
    for (const nom of ["base", "entites", "donnees", "capacites", "ecrans", "actions", "cablage", "intention"]) {
      expect(pos(nom), nom).toBeGreaterThan(-1);
    }
    // capacites AVANT ecrans/actions (règle 5 : effet capability → déclarée) ;
    // cablage et intention APRÈS tout ce qu'ils ciblent.
    expect(pos("capacites")).toBeLessThan(pos("ecrans"));
    expect(pos("ecrans")).toBeLessThan(pos("actions"));
    expect(pos("actions")).toBeLessThan(pos("cablage"));
    expect(pos("cablage")).toBeLessThan(pos("intention"));
    // Les obligations sont branchées sur l'émission ET la réparation.
    // EP-173 — l'émission dispatche sur le nom DE BASE : un lot
    // `ecrans:par_xxx` doit recevoir les obligations de `ecrans`, pas celles
    // d'une passe inexistante. Ce que ce cliquet garantit ne change pas.
    expect(source).toMatch(/obligationsPourPasse\(part\.(base \?\? part\.)?name, assembled\)/);
    expect(source).toContain("obligationsPourPasse(part.name, repaired)");
  });
});
