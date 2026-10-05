import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { migrateAirDocument, assertValidAir } from "../src/index.ts";

// ════════════════════════════════════════════════════════════════════
//  CE QUI NE SE RÉÉCRIT PAS, ET CE QUI SUCCÈDE À QUOI (AIR 1.30.0).
//
// ── DEUX MÉTIERS, LE MÊME BESOIN.
//
// SGD : « annuler un mouvement, c'est en écrire un INVERSE, jamais effacer le
// premier ». Un mouvement effacé fait mentir la comptabilité dès la première
// erreur corrigée.
//
// Tontine : `statut` énumérait quatre valeurs sans dire RIEN de leur ordre.
// Rien n'empêchait de repasser un décaissement réussi en « en attente ». Le mot
// « séquestre » écrit dans une colonne ne séquestre rien.
// ════════════════════════════════════════════════════════════════════

const RACINE = new URL("../../../", import.meta.url).pathname;

interface Champ {
  id: string;
  type: string;
  enumValues?: string[];
  transitions?: { from: string; to: string }[];
}
interface DocTest {
  entities: { id: string; appendOnly?: boolean; fields: Champ[] }[];
  actions: {
    id: string;
    name: string;
    trigger: { kind: string; event?: string };
    effect: { kind: string; entityId?: string; operation?: string };
  }[];
}

/**
 * Une action COMPLÈTE, parce que le schéma en exige quatre champs.
 *
 * Ma première version n'en posait que l'id et l'effet : les tests échouaient
 * sur la FORME avant d'atteindre la règle qu'ils mesurent. Un déclencheur de
 * cycle de vie suffit — ces tests portent sur l'EFFET, pas sur le geste.
 */
const action = (id: string, entityId: string, operation: string) => ({
  id,
  name: id,
  trigger: { kind: "lifecycle", event: "screen_open" },
  effect: { kind: "mutation", entityId, operation },
});

const lire = (fichier: string): DocTest =>
  JSON.parse(readFileSync(RACINE + fichier, "utf8")) as DocTest;
const TONTINE = "slices/tontine/tontine.air.json";
const GESTION = "slices/gestion/gestion.air.json";

const brut = (doc: DocTest) => doc as unknown as Record<string, unknown>;

function diagnostiquer(doc: DocTest): string[] {
  try {
    assertValidAir(migrateAirDocument(brut(doc)));
    return [];
  } catch (e) {
    const liste = (e as { diagnostics?: { code: string }[] }).diagnostics;
    if (liste === undefined) throw e;
    return liste.map((d) => d.code);
  }
}

function exige<T>(valeur: T | undefined, quoi: string): T {
  if (valeur === undefined) throw new Error(`prémisse absente : ${quoi}`);
  return valeur;
}

describe("les documents réels, tels qu'ils sont produits", () => {
  it("le journal d'argent de la tontine est figé", () => {
    const e = exige(
      lire(TONTINE).entities.find((x) => x.id === "ent_transactions"),
      "l'entité des transactions",
    );
    expect(e.appendOnly).toBe(true);
  });

  it("les mouvements ET les dépenses de SGD sont figés", () => {
    // Les deux, parce qu'une charge passée se contre-passe aussi : elle ne se
    // gomme pas davantage qu'un mouvement de stock.
    const ents = lire(GESTION).entities;
    for (const id of ["ent_mouvements", "ent_depenses"]) {
      expect(exige(ents.find((x) => x.id === id), id).appendOnly).toBe(true);
    }
  });

  it("une tontine s'ouvre, tourne, puis s'achève — et ne revient pas", () => {
    const champ = exige(
      lire(TONTINE)
        .entities.find((x) => x.id === "ent_tontines")
        ?.fields.find((f) => f.id === "fld_tontines_statut"),
      "le statut d'une tontine",
    );
    expect(champ.transitions).toEqual([
      { from: "EN_ATTENTE", to: "ACTIVE" },
      { from: "ACTIVE", to: "TERMINEE" },
    ]);
    // La preuve que le cycle ne se rejoue pas : aucun passage ne RAMÈNE vers
    // l'état initial.
    expect(exige(champ.transitions, "les passages").some((t) => t.to === "EN_ATTENTE")).toBe(false);
  });

  it("les deux documents passent", () => {
    for (const f of [TONTINE, GESTION]) {
      expect(() => assertValidAir(migrateAirDocument(brut(lire(f)))), f).not.toThrow();
    }
  });
});

describe("une entité figée ne se réécrit pas", () => {
  for (const op of ["update", "delete"] as const) {
    it(`une action qui veut ${op === "update" ? "modifier" : "effacer"} est REFUSÉE`, () => {
      const doc = lire(TONTINE);
      doc.actions.push(action(`act_${op}_transaction`, "ent_transactions", op));
      expect(diagnostiquer(doc)).toContain("AIR_APPEND_ONLY_REECRITE");
    });
  }

  it("mais ÉCRIRE une ligne nouvelle reste permis — c'est la contre-passation", () => {
    // Tout l'objet de la règle : on ne ferme pas l'écriture, on ferme la
    // RÉÉCRITURE. Fermer les deux empêcherait de corriger quoi que ce soit.
    const doc = lire(TONTINE);
    doc.actions.push(action("act_creer_transaction", "ent_transactions", "create"));
    expect(diagnostiquer(doc)).not.toContain("AIR_APPEND_ONLY_REECRITE");
  });

  it("une entité NON figée se modifie librement", () => {
    // Un profil, un article, un réglage : y interdire la modification
    // obligerait à créer une ligne à chaque faute de frappe corrigée.
    const doc = lire(TONTINE);
    doc.actions.push(action("act_modifier_utilisateur", "ent_utilisateurs", "update"));
    expect(diagnostiquer(doc)).not.toContain("AIR_APPEND_ONLY_REECRITE");
  });
});

describe("ce qui succède à quoi", () => {
  it("des passages sur un champ qui n'est pas une énumération sont refusés", () => {
    // Un automate suppose une liste FERMÉE d'états, que seule une énumération
    // donne.
    const doc = lire(TONTINE);
    const champ = exige(
      doc.entities
        .find((x) => x.id === "ent_utilisateurs")
        ?.fields.find((f) => f.type === "string"),
      "un champ texte",
    );
    champ.transitions = [{ from: "a", to: "b" }];
    expect(diagnostiquer(doc)).toContain("AIR_TRANSITIONS_HORS_ENUM");
  });

  it("un passage vers un état qui n'existe pas est refusé", () => {
    const doc = lire(TONTINE);
    const champ = exige(
      doc.entities
        .find((x) => x.id === "ent_tontines")
        ?.fields.find((f) => f.id === "fld_tontines_statut"),
      "le statut",
    );
    champ.transitions = [{ from: "EN_ATTENTE", to: "ETAT_INVENTE" }];
    expect(diagnostiquer(doc)).toContain("AIR_TRANSITION_VALEUR_INCONNUE");
  });

  it("UN ÉTAT QUE RIEN N'ATTEINT EST REFUSÉ", () => {
    // Le refus le plus utile : le document promettrait un état que rien ne
    // produira. `TERMINEE` devient inatteignable si on retire son passage.
    const doc = lire(TONTINE);
    const champ = exige(
      doc.entities
        .find((x) => x.id === "ent_tontines")
        ?.fields.find((f) => f.id === "fld_tontines_statut"),
      "le statut",
    );
    champ.transitions = [{ from: "EN_ATTENTE", to: "ACTIVE" }];
    expect(diagnostiquer(doc)).toContain("AIR_TRANSITION_ETAT_MORT");
  });

  it("la PREMIÈRE valeur est l'état initial, et n'a besoin d'aucun passage", () => {
    // Sans cette règle, tout automate serait refusé : son état de départ n'est
    // atteint par rien, par définition.
    const doc = lire(TONTINE);
    expect(diagnostiquer(doc)).not.toContain("AIR_TRANSITION_ETAT_MORT");
  });

  it("une énumération SANS passages reste libre", () => {
    // Une catégorie — une famille d'article, un opérateur — se choisit, elle ne
    // se succède pas. L'absence de passages ne doit rien contraindre.
    const doc = lire(TONTINE);
    const operateur = exige(
      doc.entities
        .find((x) => x.id === "ent_transactions")
        ?.fields.find((f) => f.id === "fld_transactions_operateur"),
      "l'opérateur",
    );
    expect(operateur.transitions).toBeUndefined();
    expect(diagnostiquer(doc)).not.toContain("AIR_TRANSITION_ETAT_MORT");
  });
});
