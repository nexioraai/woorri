/**
 * LES PREUVES DE LA REMISE EN ORDRE.
 *
 * Mesure du 2026-10-11 : le compilateur ecrit `order: d.order` puis trie
 * dessus — il RESPECTE l'ordre du document. Les juges savent pourtant que
 * l'accueil va en premier et le compte en dernier ; leur verdict est
 * publie et jamais bloquant, donc jete. L'application sortait avec ses
 * onglets dans le desordre.
 */
import { describe, expect, it } from "vitest";
import { normaliserOrdreDestinations } from "../src/ordre-presentation.ts";
import type { ProjectAir } from "@deribfy/air-schema";

const doc = (destinations: { routeId: string; order: number }[]): ProjectAir =>
  ({
    navigation: {
      entryScreenId: "scr_entree",
      routes: [
        { id: "rt_accueil", screenId: "scr_entree" },
        { id: "rt_compte", screenId: "scr_compte" },
        { id: "rt_stock", screenId: "scr_stock" },
        { id: "rt_caisse", screenId: "scr_caisse" },
      ],
      primary: {
        destinations: destinations.map((d) => ({ ...d, label: { fr: d.routeId } })),
      },
    },
    screens: [
      { id: "scr_entree" },
      { id: "scr_compte", purpose: "account_home" },
      { id: "scr_stock" },
      { id: "scr_caisse" },
    ],
  }) as unknown as ProjectAir;

const rangs = (a: ProjectAir): string[] =>
  [...(a.navigation.primary?.destinations ?? [])]
    .sort((x, y) => x.order - y.order)
    .map((d) => d.routeId);

describe("l’accueil en premier, le compte en dernier", () => {
  it("remet les deux primitives à leur place", () => {
    const r = normaliserOrdreDestinations(
      doc([
        { routeId: "rt_compte", order: 0 },
        { routeId: "rt_stock", order: 1 },
        { routeId: "rt_accueil", order: 2 },
      ]),
    );
    expect(rangs(r.air)).toEqual(["rt_accueil", "rt_stock", "rt_compte"]);
  });

  it("DIT ce qu’il a déplacé — une correction muette est incontestable", () => {
    const r = normaliserOrdreDestinations(
      doc([
        { routeId: "rt_compte", order: 0 },
        { routeId: "rt_accueil", order: 1 },
      ]),
    );
    expect(r.deplacements).toHaveLength(2);
    expect(r.deplacements.join(" ")).toContain("rt_accueil : rang 1 → 0");
  });

  it("les destinations du DOMAINE gardent leur ordre relatif", () => {
    // Imposer leur ordre ferait de la barre un gabarit — exactement ce que
    // le compilateur refuse deja pour les libelles.
    const r = normaliserOrdreDestinations(
      doc([
        { routeId: "rt_compte", order: 0 },
        { routeId: "rt_caisse", order: 1 },
        { routeId: "rt_stock", order: 2 },
        { routeId: "rt_accueil", order: 3 },
      ]),
    );
    expect(rangs(r.air)).toEqual(["rt_accueil", "rt_caisse", "rt_stock", "rt_compte"]);
  });

  it("les rangs restent 0..n sans trou — le schéma borne à 4", () => {
    const r = normaliserOrdreDestinations(
      doc([
        { routeId: "rt_compte", order: 2 },
        { routeId: "rt_stock", order: 3 },
        { routeId: "rt_accueil", order: 4 },
      ]),
    );
    expect([...(r.air.navigation.primary?.destinations ?? [])].map((d) => d.order).sort())
      .toEqual([0, 1, 2]);
  });
});

describe("ce qui ne doit PAS bouger", () => {
  it("un ordre déjà correct ressort INCHANGÉ, objet compris", () => {
    const d = doc([
      { routeId: "rt_accueil", order: 0 },
      { routeId: "rt_stock", order: 1 },
      { routeId: "rt_compte", order: 2 },
    ]);
    const r = normaliserOrdreDestinations(d);
    expect(r.deplacements).toEqual([]);
    expect(r.air).toBe(d);
  });

  it("une barre d’une seule destination, ou absente, ne bouge pas", () => {
    const seule = doc([{ routeId: "rt_accueil", order: 0 }]);
    expect(normaliserOrdreDestinations(seule).air).toBe(seule);
    const sans = { ...seule, navigation: { ...seule.navigation, primary: undefined } } as ProjectAir;
    expect(normaliserOrdreDestinations(sans).air).toBe(sans);
  });

  it("le document d’origine n’est JAMAIS modifié", () => {
    const d = doc([
      { routeId: "rt_compte", order: 0 },
      { routeId: "rt_accueil", order: 1 },
    ]);
    normaliserOrdreDestinations(d);
    expect(d.navigation.primary?.destinations[0]?.order).toBe(0);
    expect(d.navigation.primary?.destinations[0]?.routeId).toBe("rt_compte");
  });

  it("sans écran de compte, seul l’accueil remonte", () => {
    const sansCompte = {
      ...doc([
        { routeId: "rt_stock", order: 0 },
        { routeId: "rt_accueil", order: 1 },
      ]),
      screens: [{ id: "scr_entree" }, { id: "scr_stock" }],
    } as unknown as ProjectAir;
    expect(rangs(normaliserOrdreDestinations(sansCompte).air)).toEqual(["rt_accueil", "rt_stock"]);
  });
});
