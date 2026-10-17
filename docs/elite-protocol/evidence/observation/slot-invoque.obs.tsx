// D-058 — LE SLOT S'EXÉCUTE-T-IL VRAIMENT ?
//
// Toute la chaîne peut être en place — schéma, liaison, émission, registre —
// et le slot ne jamais tourner. Seul le RENDU tranche. Ce fichier monte
// l'écran panier de `resto-riche` avec le registre de slots RÉEL et lit ce qui
// est affiché.
//
// Contrôle négatif inclus : sans registre, la prop déclarée par le document
// doit être rendue telle quelle. Sans lui, un test vert ne prouverait rien —
// il pourrait passer parce que le texte attendu était déjà là.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { compilerANeuf } from "./app-fraiche.ts";
const REPO = new URL("../../../../", import.meta.url).pathname;

// ── CE QU'IL MONTAIT, JUSQU'AU 2026-10-17, ET POURQUOI C'ETAIT AVEUGLE.
//
// Ce fichier lisait `slices/resto-riche/app/` — l'application COMMISE. Elle
// emporte sa propre copie du runtime, dont le dernier commit date du
// 2026-09-11. Il mesurait donc le compilateur de SEPTEMBRE.
//
// DEMONTRE, PAS DEDUIT : en cassant `ScreenShell` dans le compilateur — la
// primitive que TOUT ecran emis importe —, `gate:app-compile` rend 0/32 et
// ce fichier rendait « passed ». Il compile desormais a neuf.
let APP = "";
beforeAll(async () => {
  const a = await compilerANeuf("slices/resto-riche/chez-nous.air.json", "deribfy-slot-invoque", [
    // Le Code Slot est du code HUMAIN : le compilateur emet le mecanisme,
    // jamais le contenu. Il est donc superpose a l'emission fraiche.
    "slices/resto-riche/app/slots",
  ]);
  APP = a.base;
  // Un zero se voit : sans ce controle, un dossier vide rendrait tout
  // montage impossible pour une raison qu'on mettrait longtemps a nommer.
  expect(a.fichiers, "aucun fichier emis : il n'y a rien a monter").toBeGreaterThan(20);
}, 180_000);


async function rendre(avecSlots: boolean): Promise<string[]> {
  const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
  const { SlotRoot } = await import(APP + "lib/runtime/slot-provider.tsx");
  const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(APP + "demo.data.ts");
  const { slotRegistry } = await import(APP + "slots/index.ts");
  const Ecran = (await import(APP + "screens/scr_panier.tsx")).default;
  const provider = buildDemoProvider(demoData);
  const arbre = createElement(
    DataRoot as never,
    { provider } as never,
    avecSlots
      ? createElement(SlotRoot as never, { registry: slotRegistry } as never, createElement(Ecran as never))
      : createElement(Ecran as never),
  );
  let r: ReactTestRenderer | undefined;
  act(() => { r = create(arbre as never); });
  const textes = r!.root.findAll((n) => typeof n.type === "string" || true)
    .flatMap((n) => (Array.isArray(n.props.children) ? n.props.children : [n.props.children]))
    .filter((c): c is string => typeof c === "string");
  r!.unmount();
  return textes;
}

describe("D-058 — invocation réelle d'un Code Slot", () => {
  it("CONTRÔLE NÉGATIF : sans registre, la prop DÉCLARÉE est rendue", async () => {
    const textes = await rendre(false);
    expect(textes).toContain("Vérifiez avant de commander");
    expect(textes.some((t) => t.startsWith("Total :"))).toBe(false);
  });

  it("AVEC le registre, la sortie du slot REMPLACE la prop déclarée", async () => {
    const textes = await rendre(true);
    const total = textes.find((t) => t.startsWith("Total :"));
    console.log("\n[D-058] sous-titre rendu par le slot :", total);
    expect(total, "le slot doit avoir écrit sa sortie dans la prop du bloc").toBeDefined();
    expect(total).toContain("FCFA");
    // La prop déclarée a bien été REMPLACÉE, pas juxtaposée.
    expect(textes).not.toContain("Vérifiez avant de commander");
  });
});
