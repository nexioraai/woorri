// EP-132 · CLIQUET DE CONTRAT — le texte du repli existe TOUJOURS.
//
// La décision de repli ne tient que si le document porte de quoi la remplir.
// Au registre, tout bloc qui peut porter un média déclare aussi un champ de
// titre, et celui-là n'est PAS optionnel : c'est ce qui a permis de NE PAS
// étendre le contrat. Ce cliquet garde cette propriété — un bloc futur qui
// porterait une image sans titre rouvrirait le rectangle vide.
//
// Il vit ici, et lit le registre par son sous-chemin  : l'index
// du paquet ré-exporte des compositions React, que le bundler de test ne
// sait pas charger (react-native en Flow) — dette préexistante, contournée
// en n'important QUE le contrat, jamais le rendu.
import { describe, expect, it } from "vitest";
import { getBlock, listBlockIds } from "@deribfy/blocks/registry";

describe("EP-132 · le contrat fournit toujours le texte du repli", () => {
  it("tout bloc qui porte un média déclare aussi un titre NON optionnel", () => {
    const porteurs = listBlockIds()
      .map((id) => getBlock(id))
      .filter((b) => b !== undefined)
      .filter((b) => b.fieldRefPropsAffichage.includes("imageFieldId"));
    // Si ce compte tombe à zéro, le cliquet ne garde plus rien.
    expect(porteurs.length).toBeGreaterThan(0);
    for (const b of porteurs) {
      expect(b.fieldRefPropsAffichage, b.id).toContain("titleFieldId");
      // Le schéma est typé de façon opaque : la question se pose donc au
      // schéma lui-même — accepte-t-il l'absence du titre ? S'il l'accepte,
      // un document pourrait porter un média sans rien pour le remplacer.
      const sansTitre = b.propsSchema.safeParse({ imageFieldId: "fld_x" });
      expect(sansTitre.success, `${b.id} : un titre absent est accepté`).toBe(false);
    }
  });
});
