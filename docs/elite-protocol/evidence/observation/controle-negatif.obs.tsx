// INSTRUMENT D'OBSERVATION v0 — TAP + DELTA + CONTRÔLE NÉGATIF
//
// POURQUOI IL EXISTE. La mesure structurelle des 25 gates a établi que
// 0/25 gates possèdent une correspondance sémantique avec le runtime, et que
// G5 (« tout contrôle agit ») n'a AUCUNE implémentation : ce qui existait
// était un recensement statique de types. Cet instrument produit la première
// observation d'EXÉCUTION du chantier : il rend un écran ÉMIS avec le runtime
// ÉMIS, presse chaque contrôle par son identité, et enregistre le delta.
//
// CE QU'IL PROUVE : qu'un contrôle agit ou n'agit pas, sur l'artefact réel.
// CE QU'IL NE PROUVE PAS : rien de la couche native (géométrie, fluidité,
// persistance, réseau). Le rendu est celui de react-test-renderer sur un stub
// d'hôtes RN — niveau JS, pas niveau appareil.
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { createElement } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { compilerANeuf } from "./app-fraiche.ts";
import { journal, reset } from "./stub-navigation";

// ── POURQUOI LES IMPORTS STATIQUES ONT DISPARU (2026-10-17).
//
// Ce fichier importait STATIQUEMENT `slices/conteneurs/app/...` — l'application
// COMMISE, dont le runtime n'a pas bouge depuis le 2026-08-31, SEPT semaines.
// Un import statique porte un chemin LITTERAL : il ne peut pas viser une
// emission fraiche, et le fichier mesurait donc le compilateur d'aout.
//
// DEMONTRE, PAS DEDUIT : en cassant `ScreenShell` dans le compilateur,
// `gate:app-compile` rend 0/32 et ce fichier rendait « 2 passed ».
//
// Les quatre liens deviennent dynamiques, resolus apres la compilation.
let DataRoot: unknown;
let provider: unknown;
let Ecran: unknown;

beforeAll(async () => {
  const a = await compilerANeuf(
    "slices/conteneurs/air/suivi-conteneurs.air.json",
    "deribfy-controle-negatif",
  );
  // Un zero se voit : un dossier vide rendrait le montage impossible pour une
  // raison qu'on mettrait longtemps a nommer.
  expect(a.fichiers, "aucun fichier emis : il n'y a rien a monter").toBeGreaterThan(10);
  DataRoot = (await import(a.base + "lib/runtime/data-provider.tsx")).DataRoot;
  const { buildDemoProvider } = await import(a.base + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(a.base + "demo.data.ts");
  provider = buildDemoProvider(demoData);
  Ecran = (await import(a.base + "screens/scr_conteneurs.tsx")).default;
}, 180_000);

const rendre = (): ReactTestRenderer => {
  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(DataRoot as never, { provider } as never, createElement(Ecran as never)) as never,
    );
  });
  if (!r) throw new Error("rendu impossible");
  return r;
};
/** Identités réellement ADRESSABLES dans l'arbre rendu. */
const adressables = (r: ReactTestRenderer): string[] =>
  [...new Set(r.root.findAll((n) => typeof (n.props as { testID?: string }).testID === "string")
    .map((n) => (n.props as { testID: string }).testID))].sort();
/** Presse un nœud par son identité ; retourne false si aucun handler n'existe. */
const presser = (r: ReactTestRenderer, testID: string): boolean => {
  const cibles = r.root.findAll((n) => (n.props as { testID?: string }).testID === testID &&
    typeof (n.props as { onPress?: unknown }).onPress === "function");
  if (cibles.length === 0) return false;
  act(() => { (cibles[0].props as { onPress: () => void }).onPress(); });
  return true;
};

describe("INSTRUMENT D'OBSERVATION — écran émis scr_conteneurs", () => {
  it("CONTRÔLE NÉGATIF — sans appui, aucune transition ne se produit", () => {
    reset(); const r = rendre();
    act(() => {});                                   // laisser vivre le rendu
    expect(journal).toHaveLength(0);                 // 🔴 delta nul exigé
    console.log("\n[OBS] contrôle négatif : transitions sans appui =", journal.length);
    console.log("[OBS] identités adressables :", adressables(r).join(", "));
    r.unmount();
  });

  it("TAP + DELTA — chaque identité adressable est pressée, le delta est enregistré", () => {
    const r0 = rendre(); const ids = adressables(r0); r0.unmount();
    const releve: { id: string; handler: boolean; transitions: string[] }[] = [];
    for (const id of ids) {
      reset(); const r = rendre();
      const handler = presser(r, id);
      releve.push({ id, handler, transitions: journal.map((j) => j.name) });
      r.unmount();
    }
    console.log("\n[OBS] RELEVÉ D'EXÉCUTION — appui par identité");
    for (const l of releve)
      console.log(`   ${l.id.padEnd(30)} handler=${String(l.handler).padEnd(5)} transitions=[${l.transitions.join(",") || "aucune"}]`);
    const agissants = releve.filter((l) => l.transitions.length > 0);
    const inertes = releve.filter((l) => l.handler && l.transitions.length === 0);
    const sansHandler = releve.filter((l) => !l.handler);
    console.log(`\n[OBS] BILAN  adressables=${ids.length}  avec handler=${releve.length - sansHandler.length}` +
      `  AGISSANTS=${agissants.length}  pressés-SANS-EFFET=${inertes.length}  sans handler=${sansHandler.length}`);
    expect(ids.length).toBeGreaterThan(0);
  });
});
