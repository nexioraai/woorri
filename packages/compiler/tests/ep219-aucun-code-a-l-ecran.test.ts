// EP-219 — LA LISTE DES PROPRIÉTÉS QUI MONTRENT DU TEXTE NE DOIT PAS DÉRIVER.
//
// ── CE QUI A IMPOSÉ CE CLIQUET, ET C'EST LA RÉPÉTITION QUI COMPTE.
//
// Le 2026-10-13, le propriétaire a ouvert une application web générée et a
// jugé : « visuellement nul ». Mesure : 33 documents du corpus sur 46
// affichaient des valeurs BRUTES — « en_attente_documents »,
// « SEQUESTRE_BLOQUE », « coupe_ciseaux » — et 866 champs montrés n'avaient
// aucun libellé, si bien que les formulaires demandaient « nom_complet » et
// « adresse_livraison » à des clients.
//
// Le refus `AIR_ENUM_CODE_MONTRE` a été écrit, et il a fallu le corriger
// TROIS FOIS dans la même journée :
//
//   ① quatre propriétés singulières — il restait 8 écrans de détail qui
//      montraient « sous_offre », par `badgeFieldIds` AU PLURIEL ;
//   ② plus `badgeFieldIds` — il restait 1 écran qui montrait
//      « toux_du_chenil », par `userFilterFieldIds`, dont les valeurs
//      deviennent des PUCES de filtre visibles ;
//   ③ plus `fieldIds` et `userFilterFieldIds` — vert.
//
// Trois fois, le même défaut est rentré par la porte que la liste venait
// d'oublier. La chose à surveiller n'est donc pas le défaut : c'est LA
// LISTE. Un prop d'affichage ajouté au registre demain rouvrirait le
// chemin en silence, et personne ne le verrait avant une capture d'écran.
//
// ── POURQUOI LE CLIQUET VIT ICI.
//
// `air-schema` porte le refus, et ne dépend PAS de `blocks` : le format ne
// doit pas connaître les blocs. Ce n'est pas un oubli, c'est l'étagement.
// Mais une liste recopiée sans gardien dérive. Ce paquet voit les deux, et
// c'est le seul.
//
// ── CE QU'IL NE PROUVE PAS.
//
// 🟠 Il ne prouve pas qu'aucun code n'arrive à l'écran — ça, c'est la gate
//    de rendu web (`corpus-web`, 32 applications, 244 écrans), qui lit le
//    TEXTE RENDU et ne suppose aucun chemin. Celui-ci prouve seulement que
//    la porte d'entrée du validateur couvre tout ce que le registre déclare
//    afficher. Les deux sont nécessaires : l'un refuse le document, l'autre
//    regarde l'écran.
import { describe, expect, it } from "vitest";
import { getBlock, listBlockIds } from "@deribfy/blocks/registry";
import {
  PORTEURS_DE_TEXTE_EN_LISTE,
  PORTEURS_DE_TEXTE_SINGULIERS,
} from "@deribfy/air-schema";

describe("EP-219 · aucun code machine sous les yeux d'un humain", () => {
  const couverts = new Set<string>([
    ...PORTEURS_DE_TEXTE_SINGULIERS,
    ...PORTEURS_DE_TEXTE_EN_LISTE,
  ]);

  it("le validateur couvre TOUTE propriété que le registre déclare AFFICHER", () => {
    // `imageFieldId` est la seule exception, et elle est nommée : une image
    // n'est pas du texte, son identifiant ne s'affiche jamais. Toute autre
    // propriété d'affichage non couverte est un chemin ouvert.
    const manquantes: string[] = [];
    for (const id of listBlockIds()) {
      const b = getBlock(id);
      if (b === undefined) continue;
      for (const prop of b.fieldRefPropsAffichage) {
        if (prop === "imageFieldId") continue;
        if (!couverts.has(prop)) manquantes.push(`${b.id}.${prop}`);
      }
    }
    expect(
      manquantes,
      `propriétés d'AFFICHAGE non couvertes par le refus : ${manquantes.join(", ")} — ` +
        `ajoutez-les dans validate.ts, sinon un code machine passera à l'écran par ce chemin`,
    ).toEqual([]);
  });

  it("`userFilterFieldIds` est couvert BIEN QU'il soit classé filtrage", () => {
    // Les deux lectures sont vraies : le prop FILTRE, et ses valeurs
    // deviennent les LIBELLÉS des puces. C'est la seconde qui compte ici, et
    // c'est exactement ce que la deuxième correction a coûté.
    const classeFiltrage = listBlockIds().some((id) =>
      (getBlock(id)?.fieldRefPropsFiltrage ?? []).includes("userFilterFieldIds"),
    );
    expect(classeFiltrage, "le registre le classe bien en filtrage").toBe(true);
    expect(couverts.has("userFilterFieldIds")).toBe(true);
  });

  it("la liste n'enfle pas : toute entrée est une propriété d'un bloc réel", () => {
    // Le symétrique du premier : une liste qui grossit avec des noms qui
    // n'existent plus donnerait l'illusion d'une couverture.
    const reelles = new Set(
      listBlockIds().flatMap((id) => {
        const b = getBlock(id);
        return b === undefined ? [] : [...b.fieldRefPropsAffichage, ...b.fieldRefPropsFiltrage];
      }),
    );
    const fantomes = [...couverts].filter((p) => !reelles.has(p));
    expect(fantomes, `propriétés inconnues du registre : ${fantomes.join(", ")}`).toEqual([]);
  });
});
