// EP-202 — CE QUI EST AFFICHÉ DOIT ÊTRE RENSEIGNÉ, POUR CHAQUE LIGNE.
//
// QUESTION DE YOUSSOUF, APRÈS EP-201 : « et les produits avec images et leur
// prix ? » La règle 37bis le DEMANDAIT au générateur ; rien ne le VÉRIFIAIT —
// exactement le trou d'EP-199, rouvert dans la passe qui le refermait.
//
// MESURÉ sur le document du run 2026-09-19 : 8 titres, 8 photos, 6
// descriptions et ZÉRO prix — alors que le prix était affiché sur chaque
// ligne. Huit produits se montraient sans leur prix.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { vitrineAlignee } from "../src/matiere.ts";

const codes = (f: readonly { code: string }[]): string[] => f.map((x) => x.code);

/** Un document minimal : une entité montrée en liste, avec ce qu'on veut. */
const vitrine = (champs: readonly { id: string; type: string; n: number }[], affiches: readonly string[]) =>
  ({
    entities: [
      {
        id: "ent_x",
        name: "x",
        fields: champs.map((c) => ({
          id: c.id,
          name: c.id,
          type: c.type,
          required: false,
          demoValues: Array.from({ length: c.n }, (_, i) => `v${String(i)}`),
        })),
      },
    ],
    screens: [
      {
        id: "scr_a",
        title: [{ locale: "fr", text: "A" }],
        blocks: [
          {
            id: "blk_l",
            blockType: "list",
            entityId: "ent_x",
            props: [
              { key: "titleFieldId", value: affiches[0] ?? "fld_titre" },
              ...(affiches[1] === undefined ? [] : [{ key: "trailingFieldId", value: affiches[1] }]),
              ...(affiches[2] === undefined ? [] : [{ key: "imageFieldId", value: affiches[2] }]),
            ],
          },
        ],
      },
    ],
  }) as never;

describe("EP-202 · la vitrine est alignée, ligne par ligne", () => {
  it("AUTANT DE PRIX QUE DE TITRES — rien à dire", () => {
    const air = vitrine(
      [
        { id: "fld_titre", type: "string", n: 35 },
        { id: "fld_prix", type: "decimal", n: 35 },
        { id: "fld_photo", type: "asset", n: 35 },
      ],
      ["fld_titre", "fld_prix", "fld_photo"],
    );
    expect(codes(vitrineAlignee(air))).toEqual([]);
  });

  it("UN PRIX AFFICHÉ ET VIDE — le défaut EXACT du run, et il était invisible", () => {
    // `nombresVraisemblables` ne vise que les champs `required` : un prix
    // OPTIONNEL lui échappait, même affiché sur chaque ligne.
    const air = vitrine(
      [
        { id: "fld_titre", type: "string", n: 8 },
        { id: "fld_prix", type: "decimal", n: 0 },
      ],
      ["fld_titre", "fld_prix"],
    );
    const r = vitrineAlignee(air);
    expect(codes(r)).toEqual(["CAMPAGNE_VITRINE_INCOMPLETE"]);
    expect(r[0]?.message).toContain("8 ligne(s)");
  });

  it("UNE IMAGE POUR LA MOITIÉ DES LIGNES — l'autre moitié se montre sans", () => {
    const air = vitrine(
      [
        { id: "fld_titre", type: "string", n: 35 },
        { id: "fld_prix", type: "decimal", n: 35 },
        { id: "fld_photo", type: "asset", n: 17 },
      ],
      ["fld_titre", "fld_prix", "fld_photo"],
    );
    expect(codes(vitrineAlignee(air))).toEqual(["CAMPAGNE_VITRINE_INCOMPLETE"]);
  });

  it("UN CHAMP NON AFFICHÉ N'EST PAS VISÉ — le juge ne déborde pas", () => {
    // Une donnée que l'écran ne montre pas peut être partielle sans qu'on
    // le voie : la règle vise ce qui ATTEINT l'utilisateur.
    const air = vitrine(
      [
        { id: "fld_titre", type: "string", n: 35 },
        { id: "fld_note_interne", type: "string", n: 2 },
      ],
      ["fld_titre"],
    );
    expect(codes(vitrineAlignee(air))).toEqual([]);
  });

  it("UNE RÉFÉRENCE EST EXEMPTE — elle se résout par la relation", () => {
    const air = vitrine(
      [
        { id: "fld_titre", type: "string", n: 35 },
        { id: "fld_ville", type: "reference", n: 0 },
      ],
      ["fld_titre", "fld_ville"],
    );
    expect(codes(vitrineAlignee(air))).toEqual([]);
  });

  it("UNE ENTITÉ SANS AUCUNE VALEUR N'EST PAS VISÉE ICI", () => {
    // C'est le rôle des autres juges : celui-ci mesure l'ALIGNEMENT, pas
    // la présence. Deux diagnostics pour un même fait seraient du bruit.
    const air = vitrine(
      [
        { id: "fld_titre", type: "string", n: 0 },
        { id: "fld_prix", type: "decimal", n: 0 },
      ],
      ["fld_titre", "fld_prix"],
    );
    expect(codes(vitrineAlignee(air))).toEqual([]);
  });

  it("LA RÈGLE NE NOMME NI PRIX NI PHOTO NI DOMAINE (EP-100)", () => {
    // Elle vise les PROPS d'affichage du registre, pas des noms de champs.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "src", "matiere.ts"),
      "utf8",
    );
    const zone = src.slice(src.indexOf("EP-202"), src.indexOf("export function imagesDeVitrine"));
    expect(zone.length).toBeGreaterThan(0);
    expect(zone, "un identifiant de run s'est glissé dans la RÈGLE").not.toMatch(
      /\bscr_|\bent_|\bcpt_/,
    );
  });
});
