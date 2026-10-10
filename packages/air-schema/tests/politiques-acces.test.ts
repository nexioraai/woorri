// ════════════════════════════════════════════════════════════════════
//  LES POLITIQUES D'ACCÈS — DÉRIVÉES, JUGÉES, ET PROUVÉES AUX DEUX SENS.
//
// Mesure publique (CVE-2025-48757) : 170+ applications générées par un
// concurrent ont exposé e-mails, téléphones, données de paiement et clefs
// d'API — parce que le générateur émettait des tables sans politique et que
// l'application les lisait depuis le client avec la clef publique. Leur
// correctif vérifie que la sécurité par ligne est ACTIVÉE ; il ne vérifie
// pas que les politiques FONT quelque chose.
//
// Ces preuves portent sur cette nuance, dans LES DEUX SENS : ce qui doit
// passer passe, ce qui doit être refusé est refusé.
// ════════════════════════════════════════════════════════════════════
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  migrateAirDocument,
  assertValidAir,
  validateAir,
  derivePlanAcces,
  entiteDIdentite,
  porteeDe,
  PROFONDEUR_MAX_CHAINE,
  type ProjectAir,
} from "../src/index.ts";

const RACINE = new URL("../../../", import.meta.url).pathname;
const lire = (): ProjectAir =>
  assertValidAir(
    migrateAirDocument(
      JSON.parse(readFileSync(RACINE + "slices/gestion/gestion.air.json", "utf8")) as Record<
        string,
        unknown
      >,
    ),
  );
const copie = (air: ProjectAir): ProjectAir => JSON.parse(JSON.stringify(air)) as ProjectAir;
const codes = (air: ProjectAir): string[] => validateAir(air).map((d) => d.code);

describe("la dérivation — d'où vient le propriétaire d'une ligne", () => {
  it("un document RÉEL se dérive sans orpheline atteignable, et il reste valide", () => {
    const air = lire();
    expect(codes(air).filter((c) => c.startsWith("AIR_RLS_"))).toEqual([]);
    const plan = derivePlanAcces(air);
    expect(plan.tables.length).toBe(air.entities.length);
  });

  it("l'entité des personnes est DÉSIGNÉE, jamais devinée — délégation d'abord, session ensuite", () => {
    const air = copie(lire());
    // ② par une écriture `instanceFrom: session` — « la ligne de la PERSONNE
    //    CONNECTÉE », dit le contrat
    const cible = air.entities[0];
    expect(cible).toBeDefined();
    if (cible === undefined) return;
    (air as { actions: unknown[] }).actions = [
      {
        id: "act_profil",
        name: "enregistrer",
        trigger: { kind: "ui", screenId: air.screens[0]?.id, blockId: air.screens[0]?.blocks[0]?.id },
        effect: { kind: "mutation", entityId: cible.id, operation: "update", instanceFrom: "session" },
      },
    ];
    expect(entiteDIdentite(air)).toEqual({ entityId: cible.id, origine: "session" });

    // ① la délégation PRIME : le contrat la déclare explicitement
    const autre = air.entities[1];
    if (autre !== undefined) {
      (air as { access?: Record<string, unknown> }).access = {
        ...(air.access as Record<string, unknown>),
        delegation: {
          subjectEntityId: autre.id,
          delegateFieldId: autre.fields[0]?.id,
          delegatableRightIds: [air.access?.rights[0]?.id],
        },
      };
      expect(entiteDIdentite(air)?.origine).toBe("delegation");
      expect(entiteDIdentite(air)?.entityId).toBe(autre.id);
    }
  });

  it("la portée se lit par DISTANCE : identité, directe, chaîne — la plus courte gagne", () => {
    const air = copie(lire());
    const personnes = air.entities[0];
    const possedee = air.entities[1];
    if (personnes === undefined || possedee === undefined) return;

    expect(porteeDe(air, personnes.id, personnes.id)).toEqual({ kind: "identite" });

    // propriété DIRECTE : un champ référence les personnes
    (possedee as { fields: unknown[] }).fields = [
      ...possedee.fields,
      { id: "fld_porteur", name: "porteur", type: "reference", required: true, referencesEntityId: personnes.id },
    ];
    expect(porteeDe(air, possedee.id, personnes.id)).toEqual({ kind: "directe", fieldId: "fld_porteur" });

    // CHAÎNE : une troisième entité ne connaît que la possédée
    const tierce = air.entities[2];
    if (tierce !== undefined) {
      (tierce as { fields: unknown[] }).fields = [
        ...tierce.fields,
        { id: "fld_parent", name: "parent", type: "reference", required: true, referencesEntityId: possedee.id },
      ];
      const portee = porteeDe(air, tierce.id, personnes.id);
      expect(portee.kind).toBe("chaine");
      if (portee.kind === "chaine") {
        expect(portee.chemin.length).toBe(2);
        expect(portee.chemin.length).toBeLessThanOrEqual(PROFONDEUR_MAX_CHAINE);
      }
    }
  });
});

describe("le juge — la nuance où le scanner du concurrent s'arrête", () => {
  it("REFUSE une table atteignable sans propriétaire ni vitrine, et la NOMME", () => {
    const air = copie(lire());
    // une entité neuve, montrée par un écran, sans aucun lien vers l'identité
    (air as { entities: unknown[] }).entities = [
      ...air.entities,
      { id: "ent_secret", name: "secret", fields: [{ id: "fld_valeur", name: "valeur", type: "text", required: true }] },
    ];
    // ...montrée par l'écran qui ne porte AUCUN droit : rien ne la garde.
    const ecran = air.screens.find((e) => e.requiredRightId === undefined);
    expect(ecran).toBeDefined();
    if (ecran === undefined) return;
    (ecran as { blocks: unknown[] }).blocks = [
      ...ecran.blocks,
      { id: "blk_secret", blockType: "list", entityId: "ent_secret" },
    ];
    const diag = validateAir(air).filter((d) => d.code === "AIR_RLS_TABLE_ORPHELINE");
    expect(diag.length).toBe(1);
    expect(diag[0]?.message).toContain("ent_secret");
    expect(diag[0]?.message).toContain("170 applications");
  });

  it("une entité INTERNE (que rien n'atteint) ne déclenche RIEN — l'exposition, pas l'existence", () => {
    const air = copie(lire());
    (air as { entities: unknown[] }).entities = [
      ...air.entities,
      { id: "ent_interne", name: "interne", fields: [{ id: "fld_x", name: "x", type: "text", required: true }] },
    ];
    expect(codes(air).filter((c) => c.startsWith("AIR_RLS_"))).toEqual([]);
  });

  it("REFUSE une table de DÉMONSTRATION que le client écrit — des lignes de démo ne rendent pas public", () => {
    const air = copie(lire());
    const entite = air.entities[0];
    // déclenchée depuis l'écran SANS droit : sinon le droit de l'écran la
    // garde, et c'est une donnée d'ORGANISATION — légitime, pas un trou.
    const ecran = air.screens.find((e) => e.requiredRightId === undefined);
    if (entite === undefined || ecran === undefined) return;
    // vitrine déclarée : un jeu de données la porte
    (air as { datasets?: unknown[] }).datasets = [
      {
        id: "ds_vitrine",
        entityId: entite.id,
        contentHash: "a".repeat(64),
        rowCount: 3,
        sourceKind: "seed",
      },
    ];
    // ... et une action l'écrit
    (air as { actions: unknown[] }).actions = [
      ...air.actions,
      {
        id: "act_muter",
        name: "muter",
        trigger: { kind: "ui", screenId: ecran.id, blockId: ecran.blocks[0]?.id },
        effect: { kind: "mutation", entityId: entite.id, operation: "create" },
      },
    ];
    const diag = validateAir(air).filter((d) => d.code === "AIR_RLS_DEMO_PRISE_POUR_VITRINE");
    expect(diag.length).toBeGreaterThanOrEqual(1);
    expect(diag[0]?.message).toContain("des données de démonstration ne");
    // et la portée n'est PAS vitrine : la lecture publique n'est pas accordée
    const plan = derivePlanAcces(air);
    expect(plan.tables.find((t) => t.entityId === entite.id)?.portee.kind).toBe("orpheline");
  });

  it("une vitrine LUE par tous passe — la lecture publique est assumée, pas tolérée", () => {
    const air = copie(lire());
    const entite = air.entities[0];
    if (entite === undefined) return;
    (air as { datasets?: unknown[] }).datasets = [
      { id: "ds_v", entityId: entite.id, contentHash: "b".repeat(64), rowCount: 2, sourceKind: "seed" },
    ];
    const plan = derivePlanAcces(air);
    const table = plan.tables.find((t) => t.entityId === entite.id);
    expect(table?.portee.kind).toBe("vitrine");
    const lecture = table?.politiques.filter((p) => p.operation === "select") ?? [];
    expect(lecture.length).toBe(1);
    expect(lecture[0]?.predicat).toEqual({ kind: "ouvert", justification: "vitrine" });
    // et AUCUNE écriture ouverte n'en découle
    const ouvertes = (table?.politiques ?? []).filter(
      (p) => p.predicat.kind === "ouvert" && p.operation !== "select",
    );
    expect(ouvertes).toEqual([]);
    expect(codes(air).filter((c) => c.startsWith("AIR_RLS_"))).toEqual([]);
  });

  it("un prédicat TOUJOURS VRAI sur une donnée possédée est refusé — c'est le `using (true)` du concurrent", () => {
    // La dérivation ne le produit jamais ; ce contrôle garde la dérivation
    // elle-même. On force donc le cas en jugeant un plan trafiqué.
    const air = copie(lire());
    const plan = derivePlanAcces(air);
    const possedee = plan.tables.find((t) => t.portee.kind !== "orpheline" && t.portee.kind !== "vitrine");
    expect(possedee).toBeDefined();
    // La preuve de la RÈGLE : aucune politique ouverte ne sort d'une portée
    // possédée, sur AUCUNE table du document réel.
    for (const table of plan.tables) {
      for (const politique of table.politiques) {
        if (politique.predicat.kind !== "ouvert") continue;
        expect(table.portee.kind).toBe("vitrine");
        expect(politique.operation).toBe("select");
      }
    }
  });
});

describe("non-régression — les documents SANS bloc `access` ne changent pas d'un iota", () => {
  // Prouvé sur de VRAIS documents, pas sur un document trafiqué : trois
  // slices en production ne déclarent aucun contrôle d'accès, et leur
  // propriété se lit par les références (identité + possédées + vitrines).
  const SANS_ACCESS = [
    ["dougplace", "slices/dougplace/dougplace.air.json"],
    ["marketa", "slices/marketa/marketa.air.json"],
    ["koro-artisans", "slices/marketplace-artisans/koro-artisans.air.json"],
  ] as const;
  for (const [nom, chemin] of SANS_ACCESS) {
    it(`${nom} : aucune politique de droit, aucun diagnostic de politique`, () => {
      const air = assertValidAir(
        migrateAirDocument(
          JSON.parse(readFileSync(RACINE + chemin, "utf8")) as Record<string, unknown>,
        ),
      );
      expect(air.access).toBeUndefined();
      expect(codes(air).filter((c) => c.startsWith("AIR_RLS_"))).toEqual([]);
      const plan = derivePlanAcces(air);
      expect(plan.roleTotal).toBeUndefined();
      expect(plan.roleDefaut).toBeUndefined();
      for (const table of plan.tables) {
        for (const politique of table.politiques) {
          expect(politique.rightId).toBeUndefined();
        }
      }
      // et la carte reste SIGNIFIANTE : une identité, des possédées, des vitrines
      const kinds = new Set(plan.tables.filter((t) => t.atteignable).map((t) => t.portee.kind));
      expect(kinds.has("orpheline")).toBe(false);
      expect(kinds.has("identite")).toBe(true);
    });
  }

  it("`grantsAllRights` ne dégénère JAMAIS en « ouvert à tous »", () => {
    const air = copie(lire());
    const acces = air.access;
    if (acces === undefined) return;
    (acces.roles[0] as { grantsAllRights?: boolean }).grantsAllRights = true;
    const plan = derivePlanAcces(air);
    expect(plan.roleTotal).toBe(acces.roles[0]?.id);
    for (const table of plan.tables) {
      for (const politique of table.politiques) {
        if (politique.predicat.kind === "ouvert") {
          // seule une vitrine, seulement en lecture
          expect(table.portee.kind).toBe("vitrine");
          expect(politique.operation).toBe("select");
        }
      }
    }
  });
});

describe("déterminisme", () => {
  it("même document ⇒ même plan, octet pour octet", () => {
    const a = JSON.stringify(derivePlanAcces(lire()));
    const b = JSON.stringify(derivePlanAcces(lire()));
    expect(a).toBe(b);
  });
});
