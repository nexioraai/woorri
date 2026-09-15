// EP-135 — LA PARTITION DES DIAGNOSTICS, ET SES CLIQUETS.
//
// Un refus doit savoir s'il se RE-TIRE (le brief disait assez, la machine a
// mal travaillé) ou s'il se DEMANDE (la machine ne pouvait pas savoir). Cette
// passe pose la classification ; elle ne l'exerce pas.
//
// Le cliquet principal n'est pas ici : il est dans `d()`, qui REFUSE un code
// sans classe. Ces tests vérifient qu'aucun chemin ne contourne cette garde.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as mm from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(HERE, "..", "..", "..", "benchmarks", "air-emission", "modele-metier.mjs"),
  "utf8",
);

const TABLE = mm.DIAGNOSTICS as Record<string, { classe: string; pourquoi: string; discutable?: boolean }>;

const BASE = mm.migrerModele(
  JSON.parse(readFileSync(join(HERE, "..", "..", "..", "slices", "kaviva", "kaviva-modele.json"), "utf8")),
) as Record<string, unknown>;

/** Les codes réellement émis, lus dans la source — pas dans la table. */
const codesEmis = (): string[] => [
  ...new Set(
    [...SOURCE.matchAll(/\bd\(\s*"([A-Z][A-Z_]+)"/g), ...SOURCE.matchAll(/\bd\(\s*\n\s*"([A-Z][A-Z_]+)"/g)]
      .map((m) => m[1] ?? ""),
  ),
];

describe("EP-135 · la partition est EXHAUSTIVE", () => {
  it("les diagnostics de modèle sont TOUS classés, aucun de plus, aucun de moins", () => {
    const duModele = Object.keys(TABLE).filter((c) => c.startsWith("MODELE_"));
    // 19 à la partition d'EP-135 ; 20 depuis EP-139, qui a ajouté l'accès
    // sans connexion ; 21 depuis EP-182 ②, qui a ajouté « l'écran d'ouverture
    // ne montre aucun contenu ». Ce compte se monte par ÉDITION CONSCIENTE —
    // c'est tout l'objet du cliquet : un diagnostic neuf ne peut pas entrer
    // en silence.
    // 22 depuis EP-183, qui a ajouté « publier sans compte ».
    expect(duModele).toHaveLength(22);
  });

  it("tout code émis par la source est classé", () => {
    for (const code of codesEmis()) {
      expect(TABLE[code], `« ${code} » émis sans classe`).toBeDefined();
    }
  });

  it("toute entrée de la table est réellement émise — une table qui vieillit ment", () => {
    const emis = new Set(codesEmis());
    for (const code of Object.keys(TABLE)) {
      expect(emis.has(code), `« ${code} » classé mais jamais émis`).toBe(true);
    }
  });

  it("chaque classe est l'une des deux, et chaque entrée porte sa justification", () => {
    for (const [code, entree] of Object.entries(TABLE)) {
      expect(mm.CLASSES_DIAGNOSTIC, code).toContain(entree.classe);
      expect(entree.pourquoi.length, code).toBeGreaterThan(30);
    }
  });
});

describe("EP-135 · LE CLIQUET — un diagnostic sans classe ne peut pas naître", () => {
  it("émettre un code inconnu JETTE — prouvé en le provoquant, pas en le lisant", () => {
    // `d()` n'est pas exporté : on atteint la garde en retirant une classe de
    // la table, puis en faisant produire CE diagnostic par un juge réel. Si
    // la garde n'existait pas, le diagnostic sortirait sans un mot.
    const sauvegarde = TABLE.MODELE_SANS_PARCOURS;
    expect(sauvegarde).toBeDefined();
    const modeleSansParcours = { ...BASE, parcours: [] };
    // Avec sa classe : le diagnostic sort normalement.
    expect((mm.validerModele(modeleSansParcours) as { code: string }[]).map((x) => x.code))
      .toContain("MODELE_SANS_PARCOURS");
    try {
      delete TABLE.MODELE_SANS_PARCOURS;
      expect(() => mm.validerModele(modeleSansParcours)).toThrow(/EP-135/);
    } finally {
      TABLE.MODELE_SANS_PARCOURS = sauvegarde!;
    }
    // Et le module est rendu intact : le test suivant doit voir la table pleine.
    expect((mm.validerModele(modeleSansParcours) as { code: string }[]).map((x) => x.code))
      .toContain("MODELE_SANS_PARCOURS");
  });

  it("aucun diagnostic n'est construit À LA MAIN, hors de la fabrique", () => {
    // Le chemin de contournement : un littéral { code: "...", path, message }
    // écrit directement, qui n'appellerait jamais `d()`.
    const aLaMain = [...SOURCE.matchAll(/\{\s*code:\s*"([A-Z][A-Z_]+)"/g)].map((m) => m[1]);
    expect(aLaMain).toEqual([]);
  });

  it("aucune classe inventée ailleurs dans la source", () => {
    const classes = [...SOURCE.matchAll(/classe:\s*(\w+)/g)].map((m) => m[1]);
    for (const c of classes) expect(["FP", "IM"]).toContain(c);
  });
});

describe("EP-135 · CE QUE LA PARTITION DIT, ET QU'IL FAUT POUVOIR RELIRE", () => {
  it("seuls DEUX diagnostics se demandent à un humain", () => {
    expect(mm.diagnosticsDeClasse("intention_manquante")).toEqual([
      "MODELE_TERME_AMBIGU",
      "MODELE_COMMERCE_ABSENT",
    ]);
  });

  it("ces deux-là couvrent exactement le dialogue attendu", () => {
    // « quel marché visez-vous ? » lève un terme que le moteur a lui-même
    // coché ambigu ; « comment les vendeurs vendent-ils ? » remplit le fait
    // `commerce`. Aucune troisième question n'est fondée aujourd'hui.
    expect(TABLE.MODELE_TERME_AMBIGU?.classe).toBe("intention_manquante");
    expect(TABLE.MODELE_COMMERCE_ABSENT?.classe).toBe("intention_manquante");
  });

  it("les cas douteux sont tranchés vers le re-tirage, et DITS", () => {
    const douteux = Object.entries(TABLE).filter(([, v]) => v.discutable === true);
    expect(douteux.length).toBeGreaterThan(0);
    for (const [code, v] of douteux) {
      // L'asymétrie de prudence : un doute ne coûte jamais une question à
      // l'humain. Et il s'écrit, pour qu'une passe future le rouvre.
      expect(v.classe, code).toBe("faute_de_production");
      expect(v.pourquoi, code).toContain("DOUTEUX");
    }
  });

  it("tout diagnostic de dérivation ou de plan est une faute de production", () => {
    for (const [code, v] of Object.entries(TABLE)) {
      if (code.startsWith("MODELE_")) continue;
      expect(v.classe, code).toBe("faute_de_production");
    }
  });
});
