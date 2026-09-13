// EP-158 — TROIS DÉFAUTS VUS À L'ŒIL, QU'AUCUN JUGE NE VOYAIT.
//
// Le retour manquant en est le troisième en deux inspections. Il n'est pas
// une affaire d'apparence : c'est une convention de plateforme que le
// document peut SUPPRIMER sans que rien ne le dise.
import { describe, expect, it } from "vitest";
import { jugerRetourAtteignable, obligationsDuProprietaire } from "../src/index.ts";
import { L, P, air } from "./fixtures.ts";

type Air = ReturnType<typeof air>;
const codes = (f: readonly { code: string }[]): string[] => f.map((x) => x.code);

/** Une pile : un accueil-destination, et un écran atteint par un bouton. */
function pile(options: { enteteEmpile: boolean; enteteRacine?: boolean }): Air {
  const ecran = (id: string, entete: boolean) => ({
    id,
    title: L(id),
    ...(entete ? {} : { showsScreenTitle: false }),
    blocks: [{ id: `blk_${id}`, blockType: "header" as const, props: P({ title: id }) }],
  });
  return air({
    screens: [
      ecran("scr_accueil", options.enteteRacine ?? false),
      ecran("scr_detail", options.enteteEmpile),
    ],
    navigation: {
      entryScreenId: "scr_accueil",
      routes: [{ id: "nav_a", screenId: "scr_accueil" }],
    },
    actions: [
      {
        id: "act_ouvrir",
        name: "ouvrir le détail",
        trigger: { kind: "ui" as const, blockId: "blk_scr_accueil" },
        effect: { kind: "navigate" as const, screenId: "scr_detail" },
      },
    ],
  });
}

describe("EP-158 ① · un écran empilé garde son retour", () => {
  it("un écran atteint par navigation qui masque son en-tête est REFUSÉ", () => {
    const f = jugerRetourAtteignable(pile({ enteteEmpile: false }));
    expect(codes(f)).toEqual(["PRESENTATION_ECRAN_SANS_RETOUR"]);
    expect(f[0]!.message).toContain("cul-de-sac");
  });

  it("le même écran avec son en-tête ne produit rien", () => {
    expect(codes(jugerRetourAtteignable(pile({ enteteEmpile: true })))).toEqual([]);
  });

  it("une RACINE peut masquer la sienne — il n'y a rien derrière elle", () => {
    // L'accueil masque son en-tête pour porter la marque : c'est légitime, et
    // la pile ne lui donnerait aucun retour de toute façon.
    const m = pile({ enteteEmpile: true, enteteRacine: false });
    expect(codes(jugerRetourAtteignable(m))).toEqual([]);
  });

  it("une destination de la barre peut masquer la sienne aussi", () => {
    const m = pile({ enteteEmpile: false });
    m.navigation.routes.push({ id: "nav_d", screenId: "scr_detail" });
    m.navigation.primary = {
      destinations: [
        { routeId: "nav_a", label: L("Accueil"), order: 0, icon: "accueil" },
        { routeId: "nav_d", label: L("Détail"), order: 1, icon: "liste" },
      ],
    };
    // Devenu racine de destination, il n'est plus un cul-de-sac.
    expect(codes(jugerRetourAtteignable(m))).toEqual([]);
  });

  it("un écran que RIEN n'atteint n'est pas jugé ici — c'est un autre défaut", () => {
    const m = pile({ enteteEmpile: false });
    m.actions = [];
    expect(codes(jugerRetourAtteignable(m))).toEqual([]);
  });
});

describe("EP-158 ③ · la version est une donnée du propriétaire", () => {
  it("elle est demandée, et rangée dans ce qu'il FOURNIT", () => {
    const doc = pile({ enteteEmpile: true });
    const v = obligationsDuProprietaire(doc).find((o) => o.quoi.includes("VERSION"));
    expect(v).toBeDefined();
    expect(v!.ou).toBe("fournir");
    expect(v!.source).toContain("version");
  });

  it("le moteur n'en invente aucune — il dit pourquoi", () => {
    const v = obligationsDuProprietaire(pile({ enteteEmpile: true }))
      .find((o) => o.quoi.includes("VERSION"));
    expect(v!.quoi).toContain("le document ne la porte pas");
  });

  it("elle est due quelle que soit l'application", () => {
    for (const doc of [pile({ enteteEmpile: true }), pile({ enteteEmpile: false })]) {
      expect(obligationsDuProprietaire(doc).some((o) => o.quoi.includes("VERSION"))).toBe(true);
    }
  });
});
