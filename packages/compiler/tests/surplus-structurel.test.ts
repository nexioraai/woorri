// EP-122 · ② — CE QUI EST EN TROP SE JUGE AUSSI.
//
// Asymétrie mesurée (EP-121) : écran orphelin refusé, bloc surnuméraire
// accepté. LA FRONTIÈRE (O.4 au contenu d'écran) : ce qui porte une
// STRUCTURE doit être justifié, ce qui porte de l'EXPRESSION reste libre —
// discriminant DÉRIVÉ du registre (`entity: "required"`), aucune liste.
// Preuve sur kaviva (16 écrans ≠ 23).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  jugerContenuDEcran,
  jugerNavigationsDeBouton,
} from "../../../benchmarks/air-emission/acceptation.mjs";
import {
  conceptsRelies,
  ecranAirDe,
  ecransDe,
  surfacesDe,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");
type Air = Parameters<typeof jugerNavigationsDeBouton>[0];
const AIR = JSON.parse(
  readFileSync(join(RES, "kaviva-spa.2026-09-11T23-00-50-047Z.attempt2.air.json"), "utf8"),
) as Air;
const brut = JSON.parse(
  readFileSync(join(RES, "kaviva-spa.2026-09-11T23-00-50-047Z.modele-p0-t1.air.json"), "utf8"),
) as { modele?: ModeleMetier };
const MODELE = (brut.modele ?? brut) as ModeleMetier;
const PRESCRIPTIF = { modele: MODELE, plan: ecransDe(MODELE) };

interface Bloc { id: string; blockType: string; entityId?: string; props?: { key: string; value: unknown }[] }
interface Ecran { id: string; blocks: Bloc[] }
const doc = (): Air => structuredClone(AIR);
const ecrans = (a: Air): Ecran[] => (a as unknown as { screens: Ecran[] }).screens;

/** Les concepts que le plan autorise sur un écran — même dérivation que le juge. */
const conceptsPrescritsDe = (screenId: string): string[] => {
  const surfaces = new Map(surfacesDe(MODELE).map((sf) => [sf.surfaceId, sf]));
  const prescrit = PRESCRIPTIF.plan.ecrans.find((e) => ecranAirDe(e.ecranId) === screenId);
  return [
    ...new Set(
      (prescrit?.surfaces ?? [])
        .map((sid) => surfaces.get(sid)?.concept)
        .filter((c): c is string => c !== undefined),
    ),
  ];
};

describe("① le SURPLUS structurel est refusé, l'EXPRESSION reste libre", () => {
  it("base verte : le document accepté ne porte aucun bloc structurel injustifié", () => {
    expect(jugerContenuDEcran(AIR, PRESCRIPTIF)).toEqual([]);
  });

  it("MUTATION — une liste d'une entité que le plan n'a pas placée ici : REFUSÉE, nommée", () => {
    // RESSERRÉ EN EP-165 ③c, ET C'EST UN RENFORCEMENT : ce test prenait la
    // PREMIÈRE entité absente de l'écran, sans regarder si le modèle la
    // reliait au concept prescrit. Sur cette fixture elle tombait sur
    // `ent_creneau`, RELIÉE à `cpt_soin` — donc désormais justifiée par la
    // relation. Choisir une entité NON RELIÉE (`ent_profil` ici) ne
    // l'affaiblit pas : elle prouve la même chose avec le bon critère.
    const air = doc();
    const cible = ecrans(air)[0];
    const cptDe = (id: string): string => `cpt_${id.slice(4)}`;
    // Les concepts PRESCRITS DE CET ÉCRAN — dérivés exactement comme le juge
    // les dérive. Les comparer aux concepts du modèle ENTIER excluait tout.
    const prescrits = conceptsPrescritsDe(cible?.id ?? "");
    const etrangere = (air as unknown as { entities: { id: string }[] }).entities.find(
      (e) =>
        !cible?.blocks.some((b) => b.entityId === e.id) &&
        !prescrits.some((c) => conceptsRelies(MODELE, cptDe(e.id), c)),
    );
    expect(etrangere, "aucune entité non reliée dans la fixture").toBeDefined();
    cible?.blocks.push({ id: "blk_intrus", blockType: "list", entityId: etrangere?.id, props: [] });
    const f = jugerContenuDEcran(air, PRESCRIPTIF);
    expect(f.map((x) => x.code)).toEqual(["AIR_BLOC_STRUCTUREL_NON_JUSTIFIE"]);
    expect(f[0]?.message).toContain(etrangere?.id ?? "");
  });

  it("MUTATION — des blocs d'EXPRESSION ajoutés : ACCEPTÉS (le générateur garde sa liberté)", () => {
    const air = doc();
    const cible = ecrans(air)[0];
    cible?.blocks.push({ id: "blk_titre_libre", blockType: "header", props: [] });
    cible?.blocks.push({ id: "blk_espace", blockType: "spacer", props: [] });
    cible?.blocks.push({ id: "blk_bouton_libre", blockType: "button", props: [] });
    expect(jugerContenuDEcran(air, PRESCRIPTIF)).toEqual([]);
  });
});

describe("② la navigation par BOUTON qui perd l'identité est jugée", () => {
  it("le défaut réel du run vert est trouvé — invisible à C4, qui ne voit que les lignes", () => {
    const f = jugerNavigationsDeBouton(AIR);
    expect(f).toHaveLength(1);
    expect(f[0]?.path).toContain("blk_soin_bouton_creneaux");
    expect(f[0]?.message).toContain("ne CONSOMME PAS cette instance");
  });

  it("les QUATRE formes de consommation sont reconnues (corrigé après mesure : 2 faux positifs)", () => {
    // (b) formulaire de la MÊME entité et (c) formulaire d'une entité qui
    // référence la fiche : « Réserver ce créneau » et « Annuler ce
    // rendez-vous » étaient refusés à tort — agir SUR une instance par un
    // formulaire EST une consommation.
    const f = jugerNavigationsDeBouton(AIR).map((x) => x.path);
    expect(f.some((p) => p.includes("blk_creneau_bouton_reserver"))).toBe(false);
    expect(f.some((p) => p.includes("blk_rdv_detail_annuler"))).toBe(false);
  });

  it("MUTATION — la cible ne consomme plus rien : REFUSÉE, nommée", () => {
    const air = doc();
    const fiche = ecrans(air).find((s) => s.blocks.some((b) => b.blockType === "detail_header"));
    const bouton = fiche?.blocks.find((b) => b.blockType === "button");
    const actionId = (bouton?.props ?? []).find((p) => p.key === "actionId")?.value;
    const actions = (air as unknown as { actions: { id: string; effect: { screenId?: string } }[] }).actions;
    const action = actions.find((a) => a.id === actionId);
    const orphelin: Ecran = { id: "scr_orphelin", blocks: [{ id: "blk_rien", blockType: "header", props: [] }] };
    ecrans(air).push(orphelin);
    if (action) action.effect.screenId = "scr_orphelin";
    const f = jugerNavigationsDeBouton(air);
    expect(f.some((x) => x.path.includes(bouton?.id ?? "@@"))).toBe(true);
  });

  it("la gate EP-102 et les clauses EP-105/113/115/118 ne bougent pas", () => {
    const juges = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    const emitV3 = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(juges).toContain("INDISSOCIABLES");
    expect(juges).toContain("champs éligibles");
    expect(emitV3).toContain("elargit(perimetreAvant, perimetreApres)");
  });
});

// EP-165 ③b — UN LIEU DE L'APPLICATION N'EST PAS LA SUITE D'UNE ACTION.
//
// `jugerNavigationsDeBouton` présumait que TOUT bouton partant d'une fiche
// AGIT SUR cette instance. Vrai de « Réserver ce créneau », faux de
// « Aide » ou d'un onglet de la barre. MESURÉ sur 38 documents : 63
// diagnostics, dont 17 visaient une cible atteinte INDÉPENDAMMENT de toute
// fiche (5 surfaces, 12 destinations de barre). 63 → 46 après correction.
describe("EP-165 ③b · le bouton qui mène à un LIEU", () => {
  const avecBouton = (): Air => {
    // On part du document RÉEL et on lui ajoute une navigation depuis une
    // fiche vers un écran neuf — la forme exacte que le juge vise.
    const a = doc();
    const s = a as unknown as {
      screens: Ecran[];
      actions: { id: string; name: string; trigger: unknown; effect: unknown }[];
      navigation: { routes: { id: string; screenId: string }[]; primary?: { destinations: { routeId: string; order: number }[] } };
    };
    const fiche = s.screens.find((e) => e.blocks.some((b) => b.blockType === "detail_header"));
    if (fiche === undefined) throw new Error("fixture sans fiche");
    fiche.blocks.push({ id: "blk_sonde_btn", blockType: "button" });
    s.screens.push({ id: "scr_sonde_cible", blocks: [{ id: "blk_sonde_liste", blockType: "list" }] });
    s.actions.push({
      id: "act_sonde",
      name: "sonde",
      trigger: { kind: "ui", blockId: "blk_sonde_btn" },
      effect: { kind: "navigate", screenId: "scr_sonde_cible" },
    });
    return a;
  };
  // LA FIXTURE PORTE DÉJÀ UN DIAGNOSTIC (mesuré : `blk_soin_bouton_creneaux`).
  // Compter TOUS les codes ferait échouer les sondes sur un cas étranger —
  // c'est ce qui s'est produit avant cette restriction. On ne juge donc que
  // ce que la sonde a ajouté.
  const codes = (a: Air): string[] =>
    jugerNavigationsDeBouton(a)
      .filter((x) => String(x.path).includes("blk_sonde_btn"))
      .map((x) => x.code);

  it("LE JUGE N'EST PAS MORT — une cible ORDINAIRE qui ne consomme rien reste refusée", () => {
    // Sans cette moitié, « 63 → 46 » pourrait n'être qu'un juge vidé.
    expect(codes(avecBouton())).toContain("AIR_BOUTON_IDENTITE_PERDUE");
  });

  it("une cible porteuse d'un `purpose` est un LIEU — plus de reproche", () => {
    const a = avecBouton();
    const cible = (a as unknown as { screens: Ecran[] }).screens.find((e) => e.id === "scr_sonde_cible");
    (cible as unknown as { purpose: string }).purpose = "help";
    expect(codes(a)).not.toContain("AIR_BOUTON_IDENTITE_PERDUE");
  });

  it("une DESTINATION DE LA BARRE est un LIEU — on n'y scope pas une fiche", () => {
    const a = avecBouton();
    const s = a as unknown as {
      navigation: { routes: { id: string; screenId: string }[]; primary?: { destinations: { routeId: string; order: number }[] } };
    };
    s.navigation.routes.push({ id: "rt_sonde", screenId: "scr_sonde_cible" });
    if (s.navigation.primary === undefined) s.navigation.primary = { destinations: [] };
    s.navigation.primary.destinations.push({ routeId: "rt_sonde", order: 99 });
    expect(codes(a)).not.toContain("AIR_BOUTON_IDENTITE_PERDUE");
  });

  it("LA RÈGLE EST STRUCTURELLE — le juge ne cite AUCUN genre ni AUCUN identifiant", () => {
    // Une liste de purposes ou d'écrans écrite ici divergerait du schéma :
    // onzième occurrence du motif. Les deux tests doivent rester la PRÉSENCE
    // du champ et l'APPARTENANCE aux destinations déclarées.
    const source = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    const bloc = source.slice(
      source.indexOf("EP-165 ③b — UN LIEU DE L'APPLICATION"),
      source.indexOf("if (estLieu) continue;"),
    );
    expect(bloc.length, "bloc introuvable").toBeGreaterThan(200);
    const code = bloc.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    for (const genre of ["help", "terms", "settings", "contact", "privacy_policy"]) {
      expect(code, `le juge cite ${genre}`).not.toContain(`"${genre}"`);
    }
    expect(code, "le juge cite un identifiant d'écran").not.toMatch(/"scr_/);
  });
});

// EP-165 ③c — CE QUE LA RELATION JUSTIFIE, LE PLAN N'A PAS À LE RÉPÉTER.
//
// MESURÉ : 43 diagnostics sur 11 paires, dont 38 visaient une entité RELIÉE
// au concept prescrit (les créneaux d'un soin, les produits d'une boutique).
// 43 → 5 après la règle, et le juge REFUSE ENCORE — c'est ce qui distingue
// une règle d'un désarmement.
describe("EP-165 ③c · l'entité reliée est justifiée par la relation", () => {
  const conceptsDe = (m: ModeleMetier): string[] => m.concepts.map((c) => c.id);
  const relation = (m: ModeleMetier): { de: string; vers: string } | undefined =>
    (m as unknown as { relations?: { de: string; vers: string }[] }).relations?.[0];

  it("BASE VERTE — le document accepté reste sans diagnostic", () => {
    expect(jugerContenuDEcran(AIR, PRESCRIPTIF)).toEqual([]);
  });

  it("UNE ENTITÉ RELIÉE EST ACCEPTÉE — le test que la sonde a révélé manquant", () => {
    // CE TEST EXISTE PARCE QUE LA SONDE N'A PAS MORDU. En désactivant la
    // règle (`!justifieParRelation` → `true`), les cinq premiers tests
    // passaient encore : aucun ne vérifiait le CŒUR de la correction. Un
    // cliquet qui ne tombe pas quand on retire ce qu'il garde ne garde rien.
    const air = doc();
    const cible = ecrans(air)[0];
    const prescrits = conceptsPrescritsDe(cible?.id ?? "");
    const reliee = (air as unknown as { entities: { id: string }[] }).entities.find(
      (e) =>
        !cible?.blocks.some((b) => b.entityId === e.id) &&
        prescrits.some((c) => conceptsRelies(MODELE, `cpt_${e.id.slice(4)}`, c)),
    );
    expect(reliee, "aucune entité reliée dans la fixture").toBeDefined();
    cible?.blocks.push({ id: "blk_sonde_reliee", blockType: "list", entityId: reliee!.id, props: [] });
    expect(
      jugerContenuDEcran(air, PRESCRIPTIF).filter((x) => String(x.path).includes("blk_sonde_reliee")),
    ).toEqual([]);
  });

  it("LE JUGE N'EST PAS MORT — une entité SANS relation reste refusée", () => {
    // La moitié qui compte : sans elle, « 43 → 5 » pourrait n'être qu'un
    // juge désarmé. On pose une entité qu'AUCUNE relation ne rattache.
    const air = doc();
    const cible = ecrans(air).find((e) => e.blocks.some((b) => b.entityId !== undefined));
    expect(cible, "fixture sans bloc porteur d'entité").toBeDefined();
    cible!.blocks.push({
      id: "blk_sonde_orphelin",
      blockType: "list",
      entityId: "ent_parfaitement_etrangere",
    });
    const codes = jugerContenuDEcran(air, PRESCRIPTIF)
      .filter((x) => String(x.path).includes("blk_sonde_orphelin"))
      .map((x) => x.code);
    expect(codes).toEqual(["AIR_BLOC_STRUCTUREL_NON_JUSTIFIE"]);
  });

  it("UN SEUL SAUT — la règle ne referme pas le graphe (leçon d'EP-139)", () => {
    // EP-139 a montré où mène la transitivité : produit → boutique → compte
    // rendait TOUT justifiable. `conceptsRelies` lit `relations.some`, jamais
    // une fermeture transitive. On le vérifie sur la source plutôt que de le
    // supposer d'une lecture.
    const source = readFileSync(join(R, "benchmarks", "air-emission", "modele-metier.mjs"), "utf8");
    const corps = source.slice(
      source.indexOf("export function conceptsRelies"),
      source.indexOf("export function conceptsRelies") + 400,
    );
    expect(corps).toContain("relations.some");
    for (const motif of ["while", "closure", "transitif", "parcourir"]) {
      expect(corps.toLowerCase(), `fermeture transitive suspectée : ${motif}`).not.toContain(motif);
    }
  });

  it("LA RÈGLE EST DÉRIVÉE DU MODÈLE — le juge ne cite aucune entité", () => {
    const source = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    const bloc = source.slice(
      source.indexOf("EP-165 ③c — CE QUE LA RELATION JUSTIFIE"),
      source.indexOf("AIR_BLOC_STRUCTUREL_NON_JUSTIFIE"),
    );
    expect(bloc.length, "bloc introuvable").toBeGreaterThan(200);
    const code = bloc.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(code, "le juge cite une entité en dur").not.toMatch(/"ent_[a-z]/);
    expect(code, "la relation doit venir du modèle").toContain("conceptsRelies");
  });

  it("une relation est éprouvée dans les DEUX SENS — de→vers et vers→de", () => {
    // `conceptsRelies` accepte l'arête dans les deux sens ; si ce n'était
    // pas le cas, un écran justifierait ses enfants mais pas ses parents.
    const r = relation(MODELE);
    expect(r, "fixture sans relation").toBeDefined();
    expect(conceptsRelies(MODELE, r!.de, r!.vers)).toBe(true);
    expect(conceptsRelies(MODELE, r!.vers, r!.de)).toBe(true);
    const inconnu = "cpt_absolument_inconnu";
    expect(conceptsDe(MODELE).includes(inconnu)).toBe(false);
    expect(conceptsRelies(MODELE, inconnu, r!.de)).toBe(false);
  });
});

// EP-167 — LE JUGE REÇOIT ENFIN CE QU'IL JUGE (option b, L-165-B).
//
// `jugerNavigationsDeBouton` jugeait une INTENTION sans avoir accès à
// l'intention. EP-166 : ce n'était pas une impossibilité — `jugerAcceptation`
// passait le modèle au juge de la ligne PRÉCÉDENTE et pas à celui-ci.
// MESURÉ : 25 diagnostics sans le modèle, 13 avec — et les 13 restants sont
// ceux qui suivent un arc PORTEUR sans consommer. C'est la garde.
describe("EP-167 · l'arc porteur exige, il ne permet pas", () => {
  const PRESC = PRESCRIPTIF as unknown as {
    plan: { navigation?: { arcs?: { de: string; vers: string; transport: string | null }[] } };
  };
  const paths = (a: Air, p?: unknown): string[] =>
    jugerNavigationsDeBouton(a, p as never).map((x) => String(x.path));

  it("LA GARDE — un bouton SUR arc porteur qui ne consomme rien reste REFUSÉ", () => {
    // CAS RÉEL, non fabriqué : `blk_soin_bouton_creneaux` part d'une fiche de
    // soin, suit un arc que le modèle déclare PORTEUR, et n'emmène pas
    // l'instance. Il était refusé avant l'option (b) ; il l'est encore.
    // Sans cette moitié, « 25 → 13 » serait un désarmement déguisé.
    expect(paths(AIR, PRESCRIPTIF)).toContain(
      "screens[scr_cpt_soin_choisir].blocks[blk_soin_bouton_creneaux]",
    );
  });

  it("LE CŒUR DE (b) — un bouton HORS arc du plan n'est plus reproché", () => {
    const air = doc();
    const s = air as unknown as {
      screens: Ecran[];
      actions: { id: string; name: string; trigger: unknown; effect: unknown }[];
    };
    const fiche = s.screens.find((e) => e.blocks.some((b) => b.blockType === "detail_header"));
    expect(fiche, "fixture sans fiche").toBeDefined();
    fiche!.blocks.push({ id: "blk_ep167_btn", blockType: "button" });
    s.screens.push({ id: "scr_ep167_cible", blocks: [{ id: "blk_ep167_liste", blockType: "list" }] });
    s.actions.push({
      id: "act_ep167",
      name: "sonde",
      trigger: { kind: "ui", blockId: "blk_ep167_btn" },
      effect: { kind: "navigate", screenId: "scr_ep167_cible" },
    });
    // SANS le modèle : le juge ne peut pas savoir, il reproche.
    expect(paths(air).some((p) => p.includes("blk_ep167_btn"))).toBe(true);
    // AVEC le modèle : aucun arc ne mène là — c'est un élargissement.
    expect(paths(air, PRESCRIPTIF).some((p) => p.includes("blk_ep167_btn"))).toBe(false);
  });

  it("L'IGNORANCE NE RELÂCHE RIEN — sans modèle, le juge reste celui d'avant", () => {
    // Un appelant qui ne peut pas fournir le plan (réparation, re-jugement
    // d'archive) n'obtient pas un juge plus permissif.
    expect(paths(AIR).length).toBeGreaterThanOrEqual(paths(AIR, PRESCRIPTIF).length);
    expect(paths(AIR, { plan: {} })).toEqual(paths(AIR));
  });

  it("LE CRITÈRE EST LE TRANSPORT, DÉRIVÉ DU GESTE — pas la simple présence d'un arc", () => {
    // Le modèle dit si quelque chose voyage : `transport` vaut null, itemId
    // ou instance, et vient de TABLE_GESTES. Un arc n'est pas une permission.
    const arcs = PRESC.plan.navigation?.arcs ?? [];
    expect(arcs.length, "plan sans arcs").toBeGreaterThan(0);
    expect(arcs.some((a) => a.transport === null), "aucun arc sans transport").toBe(true);
    expect(arcs.some((a) => a.transport !== null), "aucun arc porteur").toBe(true);
    // Et le juge ne cite aucune valeur de transport en dur : il teste la
    // NULLITÉ, pour qu'un transport ajouté demain soit honoré sans édition.
    const source = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    const bloc = source.slice(
      source.indexOf("EP-167 — LE JUGE REÇOIT ENFIN"),
      source.indexOf("const ecranDe"),
    );
    expect(bloc.length, "bloc introuvable").toBeGreaterThan(200);
    const code = bloc.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    for (const v of ['"itemId"', '"instance"']) {
      expect(code, `le juge cite ${v} en dur`).not.toContain(v);
    }
  });
});
