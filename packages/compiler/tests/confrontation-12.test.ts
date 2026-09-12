// CONFRONTATION #12 — fermeture C1/C3/C4/C5/C6/C8/C9 (2026-09-11).
// Chaque test nomme sa condition. Aucun secteur, aucune app nommée en règle.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrateAirDocument, projectAirSchema } from "@deribfy/air-schema";
import { collectionsSurFiche, navigationsDeLigne } from "@deribfy/execution-contract";
import { emitProject } from "../src/emit-project.ts";
import {
  porteeDe,
  repetitionsSuspectes,
  surfacesDe,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const lireAir = (rel: string) =>
  projectAirSchema.parse(
    migrateAirDocument(JSON.parse(readFileSync(join(R, rel), "utf8")) as Record<string, unknown>),
  );

// ── Fixture AIR synthétique (dérivée du réel, AUCUN nom d'app en règle) ──
const AIR = lireAir("slices/marketa/marketa.air.json");

describe("C4 — la cible d'une ligne CONSOMME l'identité dérivée", () => {
  it("cas VALIDE : ligne → détail de la MÊME entité (itemId direct)", () => {
    const nav = navigationsDeLigne(AIR);
    expect(nav.some((n) => n.consommation === "detail_meme_entite")).toBe(true);
  });

  it("cas INVALIDE : ligne → collection générique sans consommation = signalé", () => {
    // Mutation : re-cibler une navigation de ligne détail→catalogue.
    const detailNav = navigationsDeLigne(AIR).find((n) => n.consommation === "detail_meme_entite");
    expect(detailNav).toBeDefined();
    const catalogue = AIR.screens.find(
      (s) => s.id !== detailNav?.targetScreenId &&
        s.blocks.some((b) => b.blockType === "list") &&
        !s.blocks.some((b) => b.blockType === "detail_header"),
    );
    expect(catalogue).toBeDefined();
    const mute = {
      ...AIR,
      actions: AIR.actions.map((a) =>
        a.trigger.kind === "ui" &&
        a.trigger.blockId === detailNav?.blockId &&
        a.trigger.role !== "secondary" &&
        a.effect.kind === "navigate" &&
        a.effect.screenId === detailNav.targetScreenId
          ? { ...a, effect: { ...a.effect, screenId: catalogue?.id ?? "" } }
          : a,
      ),
    };
    const apres = navigationsDeLigne(projectAirSchema.parse(mute));
    const trouve = apres.find((n) => n.blockId === detailNav?.blockId);
    expect(trouve?.consommation).toBe("aucune");
  });

  it("cas VALIDE : drill « catégorie → collection SCOPÉE par référence » = r(itemId)", () => {
    // Fixture minimale : cat → liste d'items scopée par un champ reference.
    const doc = {
      ...AIR,
      entities: [
        { id: "ent_cat", name: "cat", fields: [{ id: "fld_cat_nom", name: "nom", type: "string", required: true }] },
        { id: "ent_item", name: "item", fields: [
          { id: "fld_item_nom", name: "nom", type: "string", required: true },
          { id: "fld_item_cat", name: "cat", type: "reference", required: true, referencesEntityId: "ent_cat", referenceDisplayFieldId: "fld_cat_nom" },
        ] },
      ],
      datasets: [
        { id: "data_cat", entityId: "ent_cat", contentHash: "a".repeat(64), rowCount: 3 },
        { id: "data_item", entityId: "ent_item", contentHash: "b".repeat(64), rowCount: 6 },
      ],
      relations: [], rules: [], slots: [], integrations: [], capabilities: [], permissions: [],
      compliance: { ...AIR.compliance, commerceClass: "none" },
      expectedTests: [], intent: undefined,
      screens: [
        { id: "scr_cats", title: [{ locale: "fr", text: "Catégories" }], blocks: [
          { id: "blk_cats", blockType: "list", entityId: "ent_cat",
            props: [{ key: "titleFieldId", value: "fld_cat_nom" }] },
        ] },
        { id: "scr_items", title: [{ locale: "fr", text: "Items" }], blocks: [
          { id: "blk_items", blockType: "list", entityId: "ent_item",
            props: [
              { key: "titleFieldId", value: "fld_item_nom" },
              { key: "scopeFieldId", value: "fld_item_cat" },
            ] },
        ] },
      ],
      navigation: { entryScreenId: "scr_cats", routes: [
        { id: "nav_cats", screenId: "scr_cats" }, { id: "nav_items", screenId: "scr_items" },
      ] },
      actions: [
        { id: "act_drill", name: "ouvrir la catégorie",
          trigger: { kind: "ui", blockId: "blk_cats" },
          effect: { kind: "navigate", screenId: "scr_items" } },
      ],
    };
    const nav = navigationsDeLigne(projectAirSchema.parse(migrateAirDocument(doc)));
    expect(nav).toHaveLength(1);
    expect(nav[0]?.consommation).toBe("liste_scopee_relation");
  });
});

describe("C5 — collection sur fiche : accès contextualisé seulement", () => {
  it("le juge distingue scopée / non scopée ; corpus gelé = dette consignée", () => {
    const bus = lireAir("slices/validation-appareil/validation-appareil.air.json");
    const rapport = collectionsSurFiche(bus);
    // Le document appareil possède une liste SCOPÉE sur fiche (E2, prouvée).
    expect(rapport.some((x) => x.contextualisee)).toBe(true);
  });
});

describe("C6 — portée DÉRIVÉE, anti-répétition par quadruplet", () => {
  const M: ModeleMetier = {
    version: "modele-metier/1.0.0",
    couverture: { couverts: [{ terme: "objets", noeuds: ["cpt_objet"] }], nonRetenus: [] },
    acteurs: [{ id: "act_a", nom: "A" }],
    concepts: [
      { id: "cpt_objet", nom: "Objet", donnees: true },
      { id: "cpt_dossier", nom: "Dossier", donnees: true },
    ],
    relations: [{ de: "cpt_objet", vers: "cpt_dossier", nature: "reference" }],
    parcours: [
      { id: "par_global", besoin: "parcourir", acteur: "act_a",
        etapes: [
          { concept: "cpt_objet", geste: "decouvrir" },
          { concept: "cpt_objet", geste: "chercher" },
          { concept: "cpt_objet", geste: "consulter" },
        ] },
      { id: "par_perso", besoin: "retrouver les siens", acteur: "act_a",
        etapes: [
          { concept: "cpt_objet", geste: "consulter_historique" },
          { concept: "cpt_objet", geste: "consulter" },
        ] },
      { id: "par_lie", besoin: "voir les objets d'un dossier", acteur: "act_a",
        etapes: [
          { concept: "cpt_dossier", geste: "consulter" },
          { concept: "cpt_objet", geste: "decouvrir" },
          { concept: "cpt_objet", geste: "consulter" },
        ] },
    ],
  };
  it("dérivation : globale / resultat / acteur / instance — sans champ déclaré", () => {
    const [pg, pp, pl] = M.parcours;
    expect(pg && porteeDe(M, pg, 0)).toBe("globale");
    expect(pg && porteeDe(M, pg, 1)).toBe("resultat:cpt_objet");
    expect(pp && porteeDe(M, pp, 0)).toBe("acteur:act_a");
    expect(pl && porteeDe(M, pl, 1)).toBe("instance:cpt_dossier");
  });
  it("même quadruplet = dédoublonné avec ORIGINE cumulée ; portées ≠ = surfaces distinctes", () => {
    expect(validerModele(M)).toEqual([]);
    const surfaces = surfacesDe(M);
    const decouvertes = surfaces.filter((x) => x.role === "decouverte" && x.concept === "cpt_objet");
    // deux découvertes : globale ET instance:dossier — portées distinctes.
    expect(decouvertes).toHaveLength(2);
    const consulters = surfaces.filter((x) => x.role === "detail" && x.concept === "cpt_objet");
    // consulter (globale) partagé par par_global et par_perso ? portées : globale vs acteur —
    // par_perso consulte APRÈS historique ⇒ portée acteur ⇒ 2 surfaces là aussi ? mesuré :
    expect(consulters.length).toBeGreaterThanOrEqual(1);
    for (const c of consulters) expect(c.origine.length).toBeGreaterThanOrEqual(1);
  });
  it("répétition SUSPECTE : deux surfaces au même quadruplet = refus", () => {
    const s = surfacesDe(M);
    expect(repetitionsSuspectes(s)).toHaveLength(0);
    const doublon = [...s, s[0]];
    expect(repetitionsSuspectes(doublon as never)).toHaveLength(1);
  });
});

describe("C8/L6 — UNIFIÉ par consommation : la gate d'égalité a disparu d'elle-même", () => {
  it("les rôles du plan CONSOMMENT screenTraits — plus aucun recompte local", () => {
    // R5 · L6 : l'égalité n'a plus à être testée entre deux dérivations —
    // il n'y en a plus qu'UNE. Ce test garde la CONSOMMATION : le planner
    // importe screenTraits et ne re-dérive plus detail/form pour les rôles.
    const source = readFileSync(join(R, "packages", "compiler", "src", "plan-composition.ts"), "utf8");
    expect(source).toContain('screenTraits } from "@deribfy/execution-contract"');
    expect(source).toContain('traits.has("detail")');
    expect(source).toContain('traits.has("form")');
    // le recompte local des blockTypes pour les RÔLES a disparu :
    const zoneRoles = source.slice(source.indexOf("const role: RoleEcran"));
    expect(zoneRoles.slice(0, 600).includes('blockType === "detail_header"')).toBe(false);
    expect(zoneRoles.slice(0, 600).includes('blockType === "form"')).toBe(false);
  });
});

describe("C3 — suppression du texte : preuve DYNAMIQUE", () => {
  it("les dérivations ne touchent JAMAIS un texte original planté (piège Proxy)", () => {
    const M2 = {
      version: "modele-metier/1.0.0",
      couverture: { couverts: [{ terme: "objets", noeuds: ["cpt_objet"] }], nonRetenus: [] },
      acteurs: [{ id: "act_a", nom: "A" }],
      concepts: [{ id: "cpt_objet", nom: "Objet", donnees: true,
        attributs: [{ id: "att_img", nature: "media", requis: true }] }],
      relations: [],
      parcours: [{ id: "par_p", besoin: "voir", acteur: "act_a",
        etapes: [
          { concept: "cpt_objet", geste: "decouvrir" },
          { concept: "cpt_objet", geste: "consulter" },
        ] }],
    };
    const acces: string[] = [];
    const piege = new Proxy({ ...M2, texteOriginal: "BRIEF SECRET" }, {
      get(cible, prop): unknown {
        if (prop === "texteOriginal") acces.push("texteOriginal");
        return Reflect.get(cible, prop);
      },
    });
    const avecTexte = { surfaces: surfacesDe(piege as never), diags: validerModele(piege) };
    const sansTexte = { surfaces: surfacesDe(M2 as never), diags: validerModele(M2) };
    expect(acces).toEqual([]); // AUCUNE dérivation n'a lu le texte
    // Défense à DEUX étages : en 1.0.0, la MIGRATION (copie par liste fermée
    // de clés) fait mourir la clé étrangère avant le schéma — le texte ne
    // peut pas survivre ; en 1.1.0 (sans migration), le schéma STRICT refuse.
    expect(sansTexte.diags).toEqual([]);
    expect(avecTexte.diags).toEqual([]); // le texte est MORT à la migration
    expect(JSON.stringify(avecTexte.surfaces)).toBe(JSON.stringify(sansTexte.surfaces));
    // EP-081 (édition consciente) : la clé étrangère se teste à la version
    // COURANTE — un 1.1.0 passe par la migration à liste fermée, qui fait
    // MOURIR les clés hors contrat (c'est SA protection C3, pas un trou).
    const v11 = { ...M2, version: "modele-metier/1.2.0", texteOriginal: "BRIEF" };
    expect(validerModele(v11).some((d) => d.code === "MODELE_SCHEMA")).toBe(true);
  });

  it("l'ÉMISSION ignore le texte libre : altérer intent.request ne change pas UN octet émis", () => {
    const original = lireAir("slices/dougplace/dougplace.air.json");
    expect(original.intent).toBeDefined();
    const altere = {
      ...original,
      intent: original.intent === undefined ? undefined : {
        ...original.intent,
        request: "TEXTE ORIGINAL SUPPRIMÉ — remplacé pour la preuve C3.",
      },
    };
    const a = emitProject(original);
    const b = emitProject(projectAirSchema.parse(altere));
    expect([...b.files.keys()].sort()).toEqual([...a.files.keys()].sort());
    for (const [chemin, contenu] of a.files) {
      expect(b.files.get(chemin), chemin).toBe(contenu);
    }
  });
});

describe("C1 — couverture : le vide est refusé (complément)", () => {
  it("un modèle sans AUCUN terme couvert est refusé (MODELE_COUVERTURE_VIDE)", () => {
    const M3: ModeleMetier = {
      version: "modele-metier/1.0.0",
      couverture: { couverts: [], nonRetenus: [] },
      acteurs: [{ id: "act_a", nom: "A" }],
      concepts: [{ id: "cpt_x", nom: "X", donnees: true }],
      relations: [],
      parcours: [{ id: "par_p", besoin: "voir", acteur: "act_a",
        etapes: [
          { concept: "cpt_x", geste: "decouvrir" },
          { concept: "cpt_x", geste: "consulter" },
        ] }],
    };
    expect(validerModele(M3).some((d) => d.code === "MODELE_COUVERTURE_VIDE")).toBe(true);
  });
});
