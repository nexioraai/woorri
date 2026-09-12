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
import { ecransDe, type ModeleMetier } from "../../../benchmarks/air-emission/modele-metier.mjs";

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

describe("① le SURPLUS structurel est refusé, l'EXPRESSION reste libre", () => {
  it("base verte : le document accepté ne porte aucun bloc structurel injustifié", () => {
    expect(jugerContenuDEcran(AIR, PRESCRIPTIF)).toEqual([]);
  });

  it("MUTATION — une liste d'une entité que le plan n'a pas placée ici : REFUSÉE, nommée", () => {
    const air = doc();
    const cible = ecrans(air)[0];
    const etrangere = (air as unknown as { entities: { id: string }[] }).entities.find(
      (e) => !cible?.blocks.some((b) => b.entityId === e.id),
    );
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
