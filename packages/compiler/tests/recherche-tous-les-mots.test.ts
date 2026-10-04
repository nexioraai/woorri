import { describe, expect, it } from "vitest";
import { lignesVisibles, type LigneListe } from "../runtime/list-pipeline.ts";

// ════════════════════════════════════════════════════════════════════
//  « UN MOT RAMÈNE LARGE, TROIS RESSERRENT » — le besoin, mot pour mot.
//
// ── LE DÉFAUT, MESURÉ SUR UN COMPTOIR RÉEL (SGD, 2026-10).
//
// La recherche cherchait la saisie ENTIÈRE comme sous-chaîne d'un champ.
// « filtre toyota » ne trouvait donc PAS « filtre à huile toyota » : les deux
// mots y sont, séparés par « à huile ». L'employé voyait un écran vide alors que
// la pièce était en stock, et le client attendait.
//
// J'avais d'abord écrit cet exemple avec « huile toyota » — dans ce test ET
// dans trois commentaires permanents. C'était FAUX : « huile toyota » EST une
// sous-chaîne de « filtre à huile toyota », les mots y sont adjacents. Le test
// a refusé de passer, et il avait raison contre moi.
//
// Les fiches ci-dessous sont de vraies pièces d'un vrai stock.
// ════════════════════════════════════════════════════════════════════

const STOCK: readonly LigneListe[] = [
  { id: "1", values: { nom: "filtre à huile toyota" } },
  { id: "2", values: { nom: "filtre à huile nissan" } },
  { id: "3", values: { nom: "filtre à air toyota" } },
  { id: "4", values: { nom: "plaquette de frein avant" } },
  { id: "5", values: { nom: "silent bloc avant" } },
];

const chercher = (question: string, mode?: "tous_les_mots") =>
  lignesVisibles(STOCK, {
    rechercheChamp: "nom",
    recherche: question,
    ...(mode === undefined ? {} : { rechercheMode: mode }),
  }).map((l) => l.values.nom);

describe("le défaut, tel qu'il était", () => {
  it("en sous-chaîne, « filtre toyota » ne trouve RIEN — et la pièce est en stock", () => {
    // Ce test fige le comportement d'AVANT. Il ne décrit pas un bug à corriger :
    // il décrit ce que le mode `sous_chaine` fait, et doit continuer de faire,
    // pour que rien ne change là où personne ne l'a demandé.
    expect(chercher("filtre toyota")).toEqual([]);
    // Et la preuve que l'exemple est bien choisi : les mots sont là, séparés.
    expect(chercher("huile toyota")).toEqual(["filtre à huile toyota"]);
  });

  it("en sous-chaîne, la suite EXACTE fonctionne — c'est tout ce qu'elle sait faire", () => {
    expect(chercher("à huile")).toEqual(["filtre à huile toyota", "filtre à huile nissan"]);
  });
});

describe("« tous les mots » : l'ordre ne compte plus, la présence oui", () => {
  it("« huile toyota » trouve la pièce, alors que les mots ne sont pas côte à côte", () => {
    expect(chercher("huile toyota", "tous_les_mots")).toEqual(["filtre à huile toyota"]);
  });

  it("l'ORDRE est indifférent — « toyota huile » rend la même chose", () => {
    expect(chercher("toyota huile", "tous_les_mots")).toEqual(["filtre à huile toyota"]);
  });

  it("UN mot ramène large", () => {
    expect(chercher("filtre", "tous_les_mots")).toEqual([
      "filtre à huile toyota",
      "filtre à huile nissan",
      "filtre à air toyota",
    ]);
  });

  it("DEUX mots resserrent", () => {
    expect(chercher("filtre toyota", "tous_les_mots")).toEqual([
      "filtre à huile toyota",
      "filtre à air toyota",
    ]);
  });

  it("TROIS mots désignent une seule pièce", () => {
    expect(chercher("filtre air toyota", "tous_les_mots")).toEqual(["filtre à air toyota"]);
  });

  it("c'est une CONJONCTION, pas un OU — un mot absent ferme la réponse", () => {
    // Un OU aurait rendu les quatre lignes portant « filtre » ou « nissan », et
    // noyé la réponse. C'est l'erreur la plus facile à faire ici.
    expect(chercher("filtre peugeot", "tous_les_mots")).toEqual([]);
  });
});

describe("une saisie de comptoir n'est pas propre", () => {
  it("espaces multiples, début et fin : la question est quand même lue", () => {
    expect(chercher("   huile    toyota  ", "tous_les_mots")).toEqual(["filtre à huile toyota"]);
  });

  it("une question VIDE ne filtre rien — jamais un écran vide par accident", () => {
    expect(chercher("", "tous_les_mots")).toHaveLength(STOCK.length);
    expect(chercher("    ", "tous_les_mots")).toHaveLength(STOCK.length);
  });

  it("la casse est indifférente dans les deux modes", () => {
    expect(chercher("HUILE Toyota", "tous_les_mots")).toEqual(["filtre à huile toyota"]);
    expect(chercher("À HUILE")).toEqual(["filtre à huile toyota", "filtre à huile nissan"]);
  });
});

describe("le mode ne s'applique qu'à la recherche", () => {
  it("sans champ de recherche déclaré, le mode est sans effet", () => {
    // Une liste qui ne déclare pas `searchFieldId` n'a pas de recherche du
    // tout : le mode ne doit pas inventer un filtrage.
    const toutes = lignesVisibles(STOCK, {
      recherche: "huile toyota",
      rechercheMode: "tous_les_mots",
    });
    expect(toutes).toHaveLength(STOCK.length);
  });
});
