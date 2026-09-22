// EP-188 ① — UNE ENTITÉ PRESCRITE QUI MANQUE EST UN REFUS.
//
// Cause directe de l'échec du run EP-186 : le document déclarait TROIS
// entités pour CINQ concepts porteurs de données. `ent_annonce` — le concept
// central du domaine — MANQUAIT, et les 29 diagnostics « entité inconnue »
// n'étaient que des références vers elle.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ProjectAir } from "@deribfy/air-schema";
import {
  migrerModele,
  verifierEntitesPrescrites,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";
import { SECTIONS_CORRECTIVES, sectionsAReemettre } from "@deribfy/repair";

import { requis } from "./helpers.ts";
const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");
// UNE affirmation de type à la FRONTIÈRE ; au-delà, le compilateur vérifie.
const lire = (motif: string): ProjectAir =>
  JSON.parse(
    readFileSync(
      join(RES, requis(readdirSync(RES).find((f) => f.includes(motif)), "résultat de run « " + motif + " »")),
      "utf8",
    ),
  ) as ProjectAir;

const DOC = lire("marche-immobilier.2026-09-15T23-07-09-872Z.attempt2");
const brut = lire("marche-immobilier.2026-09-15T23-07-09-872Z.modele-p0-t2") as unknown as {
  modele?: ModeleMetier;
};
const MODELE = migrerModele(brut.modele ?? brut) as ModeleMetier;

describe("EP-188 ① · l'entité prescrite qui manque", () => {
  it("LE CAS RÉEL — le document du run EP-186 est REFUSÉ, nommément", () => {
    const d = verifierEntitesPrescrites(DOC, MODELE);
    expect(d.map((x) => x.path).sort()).toEqual([
      "entities[ent_annonce]",
      "entities[ent_recherche]",
    ]);
    expect(requis(d[0], "d0").code).toBe("ENTITE_PRESCRITE_MANQUANTE");
  });

  it("UN DOCUMENT COMPLET PASSE — ce n'est pas un refus systématique", () => {
    const complet = structuredClone(DOC) as { entities: { id: string }[] };
    for (const c of MODELE.concepts) {
      if (!c.donnees) continue;
      const id = `ent_${c.id.slice(4)}`;
      if (!complet.entities.some((e) => e.id === id)) complet.entities.push({ id });
    }
    expect(verifierEntitesPrescrites(complet, MODELE)).toEqual([]);
  });

  it("SEULS LES CONCEPTS PORTEURS DE DONNÉES sont exigés", () => {
    // Un concept sans données n'a pas d'entité : l'exiger inventerait une
    // table vide.
    const sansDonnees = structuredClone(MODELE);
    for (const c of sansDonnees.concepts) (c as { donnees?: boolean }).donnees = false;
    expect(verifierEntitesPrescrites(DOC, sansDonnees)).toEqual([]);
  });

  it("LA RÉPARATION SAIT OÙ ALLER — sinon elle supprimerait les références", () => {
    // Sans route déclarée, `sectionDuChemin` devinerait, et une réparation qui
    // vise la mauvaise section ne peut que retirer ce qui cite l'entité au
    // lieu de rétablir l'entité elle-même.
    expect(SECTIONS_CORRECTIVES.ENTITE_PRESCRITE_MANQUANTE).toEqual(["donnees"]);
    expect(
      sectionsAReemettre([{ code: "ENTITE_PRESCRITE_MANQUANTE", path: "entities[ent_annonce]" }]),
    ).toContain("donnees");
  });

  it("LE MESSAGE INTERDIT DE RÉPARER EN SUPPRIMANT", () => {
    // Le chemin de fuite évident : retirer les blocs qui citent l'entité
    // absente ferait taire les 29 diagnostics sans rien rétablir.
    const d = verifierEntitesPrescrites(DOC, MODELE);
    expect(requis(d[0], "d0").message).toContain("ne supprime pas ce qui la référence");
    expect(requis(d[0], "d0").message).toContain("RÉÉMETS-LA");
  });

  it("CE QUE LE MOTEUR EXIGE, IL LE VÉRIFIE — le trou nommé", () => {
    // Le moteur prescrivait « une entité par concept porteur de données » et
    // ne le vérifiait QUE pour les écrans. Une prescription non vérifiée
    // n'est qu'un vœu.
    const src = readFileSync(join(R, "benchmarks", "air-emission", "modele-metier.mjs"), "utf8");
    expect(src).toContain("NAVIGATION_ECRAN_PRESCRIT_MANQUANT");
    expect(src).toContain("ENTITE_PRESCRITE_MANQUANTE");
  });
});

// EP-188 ③ — LES NOMBRES DE DÉMONSTRATION.
describe("EP-188 ③ · un nombre sans demoValues est tiré au hasard", () => {
  it("LE CAS RÉEL — les trois champs qui ont produit 907 pièces", async () => {
    const { nombresVraisemblables } = await import("@deribfy/fidelity");
    const doc = lire("marche-immobilier.2026-09-13T18-29-46-907Z.attempt1");
    const champs = nombresVraisemblables(doc as never).map(
      (x) => (/« ([^»]+) »/.exec(x.message))?.[1],
    );
    expect(champs).toContain("fld_bien_surface");
    expect(champs).toContain("fld_bien_pieces");
    expect(champs).toContain("fld_annonce_prix");
  });

  it("UN CHAMP QUI PORTE SES VALEURS PASSE — pas un refus systématique", async () => {
    const { nombresVraisemblables } = await import("@deribfy/fidelity");
    const doc = structuredClone(lire("marche-immobilier.2026-09-13T18-29-46-907Z.attempt1")) as {
      entities: { fields: { type: string; required?: boolean; demoValues?: string[] }[] }[];
    };
    for (const e of doc.entities)
      for (const f of e.fields)
        if (f.type === "number" || f.type === "decimal") f.demoValues = ["3", "4", "5"];
    expect(nombresVraisemblables(doc as never)).toEqual([]);
  });

  it("SEULS LES CHAMPS REQUIS sont exigés — un facultatif peut rester vide", async () => {
    const { nombresVraisemblables } = await import("@deribfy/fidelity");
    const doc = structuredClone(lire("marche-immobilier.2026-09-13T18-29-46-907Z.attempt1")) as {
      entities: { fields: { type: string; required?: boolean }[] }[];
    };
    for (const e of doc.entities) for (const f of e.fields) f.required = false;
    expect(nombresVraisemblables(doc as never)).toEqual([]);
  });

  it("LE TIRAGE RESTE, ET LA SOURCE DIT POURQUOI", () => {
    // Le contrat ne porte AUCUNE borne (`min`/`max` n'existent pas au
    // schéma) : le compilateur ne peut pas deviner qu'une surface et un prix
    // n'ont pas la même échelle. La réponse est dans le PROMPT, pas ici.
    const src = readFileSync(join(R, "packages", "compiler", "src", "demo-fixtures.ts"), "utf8");
    expect(src).toContain("le contrat ne porte");
    expect(src).toContain("demoValues");
    const air = readFileSync(join(R, "packages", "air-schema", "src", "air.ts"), "utf8");
    const champ = air.slice(air.indexOf("const fieldSchema"), air.indexOf("const fieldSchema") + 1400);
    expect(champ, "le schéma a gagné des bornes").not.toMatch(/\bmin:\s*z\./);
  });

  it("ET LA RÈGLE EST TRANSMISE — le moteur dit ce qu'il exige (EP-122)", () => {
    const emit = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(emit).toContain("36quinquies. NOMBRES VRAISEMBLABLES");
    expect(emit).toContain("907 PIÈCES");
    expect(emit, "la cohérence entre champs doit être dite").toContain("COHÉRENTES ENTRE ELLES");
  });
});

// EP-188 ⑤ — L'ESPACE COMPTE D'UN ANONYME NE POSE PAS DE FORMULAIRE.
describe("EP-188 ⑤ · deux boutons, pas une fiche", () => {
  it("LE CAS RÉEL — le run EP-186 posait DEUX formulaires d'emblée", async () => {
    const { jugerEntreeDeCompte } = await import("@deribfy/execution-contract");
    const d = jugerEntreeDeCompte(DOC, {
      entryScreenId: DOC.navigation.entryScreenId,
      ecransDIdentite: ["scr_cpt_profil_annonceur_s_identifier"],
    });
    expect(d.map((x) => x.code)).toEqual(["PRESENTATION_COMPTE_FORMULAIRE_DEMBLEE"]);
    expect(requis(d[0], "d0").message).toContain("DEUX BOUTONS");
  });

  it("DEUX BOUTONS SANS FORMULAIRE PASSENT", async () => {
    const { jugerEntreeDeCompte } = await import("@deribfy/execution-contract");
    const air = structuredClone(DOC) as { screens: { id: string; blocks: { blockType: string }[] }[] };
    const cible = requis(air.screens.find((s) => s.id === "scr_cpt_profil_annonceur_s_identifier"), "idscr_cpt_profil_annonceur_s_identifier");
    cible.blocks = cible.blocks.filter((b) => b.blockType !== "form");
    expect(
      jugerEntreeDeCompte(air as never, {
        entryScreenId: "x",
        ecransDIdentite: ["scr_cpt_profil_annonceur_s_identifier"],
      }),
    ).toEqual([]);
  });

  it("PORTÉE STRICTE — un écran qui n'est pas d'identité n'est jamais jugé", async () => {
    // Modifier ses informations une fois connecté EST un formulaire légitime.
    const { jugerEntreeDeCompte } = await import("@deribfy/execution-contract");
    expect(jugerEntreeDeCompte(DOC as never, { entryScreenId: "x", ecransDIdentite: [] })).toEqual([]);
  });

  it("TRANSMIS PUIS JUGÉ, DANS CET ORDRE — la règle d'EP-184", () => {
    // On ne refuse pas ce qu'on n'a jamais demandé. La règle 17ter a été
    // transmise en EP-184 ; elle n'a pas suffi ; le juge vient ensuite.
    const emit = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(emit).toContain("17ter. L'ESPACE COMPTE A DEUX ÉTATS");
    const pres = readFileSync(join(R, "packages", "execution-contract", "src", "presentation.ts"), "utf8");
    expect(pres).toContain("TRANSMIS PUIS JUGÉ");
  });
});
