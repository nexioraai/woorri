// EP-137 — LE CONTENU DE L'ESPACE COMPTE EST UNE PRIMITIVE.
//
// EP-130 a posé que l'accueil et le compte sont des primitives ; leur CONTENU
// l'est aussi. Ces surfaces n'ont aucune existence métier — elles existent
// parce que c'est une APPLICATION. Trois sont des OBLIGATIONS DE PLATEFORME
// citées à la source, quatre sont des DÉCISIONS PRODUIT étiquetées.
import { describe, expect, it } from "vitest";
import { AIR_SCHEMA_VERSION, projectAirSchema } from "@deribfy/air-schema";
import {
  DESTINATIONS_MAX,
  SURFACES_DE_COMPTE,
  jugerBarreInferieure,
  jugerEspaceCompte,
  surfacesAttendues,
  type GenreEcran,
} from "../src/presentation.ts";
import { L, P, air } from "./fixtures.ts";

const codes = (f: readonly { code: string }[]): string[] => f.map((x) => x.code);
const AVEC_IDENTITE = { ecransDIdentite: ["scr_compte"] };
const SANS_IDENTITE = { ecransDIdentite: [] };

/** Base VERTE : un compte, et toutes les surfaces qu'il doit porter. */
function baseVerte(genres: readonly GenreEcran[] = surfacesAttendues(true)): ReturnType<typeof air> {
  const ecransDeGenre = genres.map((genre) => ({
    id: `scr_${genre}`,
    title: L(genre),
    purpose: genre,
    blocks: [{ id: `blk_${genre}`, blockType: "header" as const, props: P({ title: genre }) }],
  }));
  return air({
    screens: [
      { id: "scr_a", title: L("A"), blocks: [{ id: "blk_a", blockType: "header" as const, props: P({ title: "A" }) }] },
      { id: "scr_compte", title: L("Compte"), blocks: [{ id: "blk_c", blockType: "header" as const, props: P({ title: "C" }) }] },
      { id: "scr_b", title: L("B"), blocks: [{ id: "blk_b", blockType: "header" as const, props: P({ title: "B" }) }] },
      ...ecransDeGenre,
    ],
    navigation: {
      entryScreenId: "scr_a",
      routes: [
        { id: "nav_a", screenId: "scr_a" },
        { id: "nav_compte", screenId: "scr_compte" },
        { id: "nav_b", screenId: "scr_b" },
      ],
      primary: {
        destinations: [
          { routeId: "nav_a", label: L("A"), order: 0, icon: "accueil" },
          { routeId: "nav_compte", label: L("Compte"), order: 1, icon: "compte" },
          { routeId: "nav_b", label: L("B"), order: 2, icon: "liste" },
        ],
      },
    },
    // Chaque surface est atteignable DEPUIS le compte — sinon elle ne remplit
    // aucune obligation, si bien déclarée soit-elle.
    actions: genres.map((genre) => ({
      id: `act_${genre}`,
      name: `ouvrir ${genre}`,
      trigger: { kind: "ui" as const, blockId: `blk_${genre}` },
      effect: { kind: "navigate" as const, screenId: `scr_${genre}` },
    })),
  });
}

describe("EP-137 · base verte", () => {
  it("un document qui porte ses surfaces ne rend AUCUN diagnostic", () => {
    expect(codes(jugerEspaceCompte(baseVerte(), AVEC_IDENTITE))).toEqual([]);
  });

  it("la base verte est un document AIR valide", () => {
    const r = projectAirSchema.safeParse(baseVerte());
    expect(r.success, JSON.stringify(r.error?.issues.slice(0, 2))).toBe(true);
  });
});

describe("EP-137 · ① une surface manquante est refusée, et NOMMÉE", () => {
  it("chaque surface retirée produit son diagnostic, une par une", () => {
    for (const genre of surfacesAttendues(true)) {
      const restantes = surfacesAttendues(true).filter((g) => g !== genre);
      const f = jugerEspaceCompte(baseVerte(restantes), AVEC_IDENTITE);
      expect(codes(f), genre).toEqual(["PRESENTATION_SURFACE_COMPTE_ABSENTE"]);
      expect(f[0]!.message, genre).toContain(genre);
    }
  });

  it("le message dit le FONDEMENT — obligation de plateforme ou décision produit", () => {
    const sansConfidentialite = surfacesAttendues(true).filter((g) => g !== "privacy_policy");
    expect(jugerEspaceCompte(baseVerte(sansConfidentialite), AVEC_IDENTITE)[0]!.message)
      .toContain("OBLIGATION DE PLATEFORME — App Store Review Guidelines 5.1.1(i)");
    const sansAide = surfacesAttendues(true).filter((g) => g !== "help");
    expect(jugerEspaceCompte(baseVerte(sansAide), AVEC_IDENTITE)[0]!.message)
      .toContain("DÉCISION PRODUIT");
  });
});

describe("EP-137 · ② elles vivent DANS le compte, jamais dans la barre", () => {
  it("une surface promue en destination est refusée", () => {
    const mute = baseVerte();
    mute.navigation.routes.push({ id: "nav_help", screenId: "scr_help" });
    mute.navigation.primary!.destinations.push({
      routeId: "nav_help", label: L("Aide"), order: 2, icon: "liste",
    });
    expect(codes(jugerEspaceCompte(mute, AVEC_IDENTITE)))
      .toEqual(["PRESENTATION_SURFACE_COMPTE_EN_BARRE"]);
  });

  it("une surface qu'aucune action n'atteint est orpheline", () => {
    const mute = baseVerte();
    mute.actions = mute.actions.filter((a) => a.id !== "act_terms");
    const f = jugerEspaceCompte(mute, AVEC_IDENTITE);
    expect(codes(f)).toEqual(["PRESENTATION_SURFACE_COMPTE_ORPHELINE"]);
    expect(f[0]!.message).toContain("aucune action n'y mène");
  });
});

describe("EP-137 · ③ PRIMITIVES : elles existent SANS modèle d'identité", () => {
  it("un document sans identité doit porter les quatre surfaces inconditionnelles", () => {
    // C'est LE test qui prouve que ce sont des primitives de PRÉSENTATION :
    // rien dans le modèle ne les demande, et elles sont pourtant exigées.
    const attendues = surfacesAttendues(false);
    expect(attendues).toEqual(["privacy_policy", "contact", "terms", "help", "settings"]);
    expect(codes(jugerEspaceCompte(baseVerte(attendues), SANS_IDENTITE))).toEqual([]);
    const sansRien = jugerEspaceCompte(baseVerte([]), SANS_IDENTITE);
    expect(sansRien).toHaveLength(5);
  });

  it("création et suppression de compte ne sont exigées QUE s'il y a des comptes", () => {
    // Guideline 5.1.1(v) est explicitement conditionnelle : « IF your app
    // supports account creation ». Les exiger sans comptes serait inventer.
    expect(surfacesAttendues(false)).not.toContain("account_delete");
    expect(surfacesAttendues(false)).not.toContain("account_create");
    expect(surfacesAttendues(true)).toContain("account_delete");
  });

  it("la suppression de compte est une OBLIGATION, pas un choix", () => {
    // Elle ne figurait pas dans la liste demandée ; la convention l'impose.
    expect(SURFACES_DE_COMPTE.account_delete.fondement).toBe("plateforme");
    expect(SURFACES_DE_COMPTE.account_create.fondement).toBe("produit");
  });
});

describe("EP-137 · ④ la borne de la barre tient, sans être assouplie", () => {
  it("sept surfaces de plus n'ajoutent AUCUNE destination", () => {
    const base = baseVerte();
    // Dix écrans, trois destinations : la borne de Material tient sans qu'on
    // ait eu à l'assouplir — c'est la conséquence de « elles vivent DANS le
    // compte ». Les y mettre en aurait demandé dix.
    expect(base.screens.length).toBeGreaterThan(DESTINATIONS_MAX);
    expect(base.navigation.primary!.destinations).toHaveLength(3);
    expect(codes(jugerBarreInferieure(base))).toEqual([]);
  });

  it("promouvoir une surface en destination : la barre reste conforme, le compte non", () => {
    const base = baseVerte();
    base.navigation.routes.push({ id: "nav_x", screenId: "scr_privacy_policy" });
    base.navigation.primary!.destinations.push({
      routeId: "nav_x", label: L("X"), order: 3, icon: "liste",
    });
    // Quatre destinations : Material est satisfait. C'est l'AUTRE juge qui
    // voit le défaut — les deux disent deux choses différentes, et c'est voulu.
    expect(codes(jugerBarreInferieure(base))).toEqual([]);
    expect(codes(jugerEspaceCompte(base, AVEC_IDENTITE)))
      .toEqual(["PRESENTATION_SURFACE_COMPTE_EN_BARRE"]);
  });
});

describe("EP-137 · CLIQUETS (règle d'EP-132)", () => {
  it("l'énumération du SCHÉMA et la table des fondements ne peuvent pas diverger", () => {
    // Le paquet du schéma ne peut dépendre d'aucun autre : sa liste est
    // littérale. Sans ce cliquet, un genre ajouté d'un côté serait muet de
    // l'autre — le motif « liste écrite deux fois », déjà payé cinq fois.
    const schema = projectAirSchema.shape.screens.element.shape.purpose;
    const duSchema = [...(schema.unwrap().options as readonly string[])].sort();
    expect(duSchema).toEqual(Object.keys(SURFACES_DE_COMPTE).sort());
  });

  it("chaque surface déclare son fondement, et une source si elle en a une", () => {
    for (const [genre, fiche] of Object.entries(SURFACES_DE_COMPTE)) {
      expect(["plateforme", "produit"], genre).toContain(fiche.fondement);
      // Une obligation SANS source citée serait une convention inventée.
      if (fiche.fondement === "plateforme") {
        expect(fiche.source, genre).toMatch(/App Store Review Guidelines/);
      } else {
        expect(fiche.source, genre).toBeNull();
      }
    }
  });

  it("le schéma qui porte ce champ est la version courante", () => {
    expect(AIR_SCHEMA_VERSION).toBe("1.23.0");
  });
});
