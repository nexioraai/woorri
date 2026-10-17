// ÉTATS DE BLOC — dimension C de la grille A++, jamais observée jusqu'ici.
// Confronte TROIS affirmations qui n'ont jamais été croisées :
//   1. ce que le REGISTRE DE BLOCS déclare rendable   (getBlock().states)
//   2. ce que l'ENVELOPPE concède atteignable          (reachableBlockStates)
//   3. ce que l'ARTEFACT ÉMIS rend RÉELLEMENT           (observation)
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { readdirSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { compilerANeuf } from "./app-fraiche.ts";
const REPO = new URL("../../../../", import.meta.url).pathname;
// ── CE QU'IL MONTAIT, JUSQU'AU 2026-10-17, ET POURQUOI C'ETAIT AVEUGLE.
//
// `import.meta.glob` est resolu par Vite A LA TRANSFORMATION, contre un chemin
// LITTERAL : il chargeait les ecrans de `slices/conteneurs/app/`, l'application
// COMMISE, dont le runtime n'a pas bouge depuis le 2026-08-31 — SEPT semaines.
//
// DEMONTRE, PAS DEDUIT : en cassant `ScreenShell` dans le compilateur — la
// primitive que TOUT ecran emis importe —, `gate:app-compile` rend 0/32 et ce
// fichier rendait « passed ».
//
// La liste est donc construite A L'EXECUTION sur l'emission fraiche.
type Chargeur<T> = () => Promise<T>;
let APP = "";
let ECRANS: Record<string, Chargeur<{ default: unknown }>> = {};
let DONNEES: Record<string, Chargeur<unknown>> = {};
beforeAll(async () => {
  const a = await compilerANeuf("slices/conteneurs/air/suivi-conteneurs.air.json", "deribfy-etats-blocs");
  APP = a.base;
  // Un zero se voit : un dossier vide rendrait tout montage impossible pour
  // une raison qu'on mettrait longtemps a nommer.
  expect(a.fichiers, "aucun fichier emis : il n'y a rien a monter").toBeGreaterThan(10);
  const noms = readdirSync(APP + "screens").sort();
  ECRANS = Object.fromEntries(
    noms.filter((n) => n.endsWith(".tsx")).map((n) => [APP + "screens/" + n, () => import(APP + "screens/" + n)]),
  );
  DONNEES = Object.fromEntries(
    noms.filter((n) => n.endsWith(".data.ts")).map((n) => [APP + "screens/" + n, () => import(APP + "screens/" + n)]),
  );
}, 180_000);

describe("Dimension C — états de bloc réellement rendus", () => {
  it("croise registre déclaré × enveloppe concédée × artefact observé", async () => {
    const { getBlock } = await import(REPO + "packages/blocks/src/registry.ts");
    const { EXECUTION_ENVELOPE_V1: ENV } = await import(REPO + "packages/execution-contract/src/envelope.ts");
    const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
    const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
    const { demoData } = await import(APP + "demo.data.ts");

    // Deux conditions de données : celle LIVRÉE, et une variante VIDE.
    const CONDITIONS: [string, unknown][] = [
      ["fixtures livrées", buildDemoProvider(demoData)],
      ["dataset vide", buildDemoProvider({})],
    ];
    const observes = new Map<string, Set<string>>();   // blockType → états vus
    const rendus = new Map<string, Set<string>>();      // condition → blocs rendus

    for (const [nomCond, provider] of CONDITIONS) {
      rendus.set(nomCond, new Set());
      for (const [chemin, charger] of Object.entries(ECRANS)) {
        const { screenData } = await (DONNEES[chemin.replace(/\.tsx$/, ".data.ts")] as
          () => Promise<{ screenData: { blocks: { id: string; blockType: string }[] } }>)();
        const Ecran = (await (charger as () => Promise<{ default: () => unknown }>)()).default;
        let r: ReactTestRenderer | undefined;
        act(() => { r = create(createElement(DataRoot as never, { provider } as never, createElement(Ecran as never)) as never); });
        for (const b of screenData.blocks) {
          const n = r!.root.findAll((x) => (x.props as { testID?: string }).testID === b.id)[0];
          if (!n) continue;
          rendus.get(nomCond)!.add(b.id);
          const st = (n.props as { state?: unknown }).state;
          const kind = typeof st === "string" ? st : (st as { kind?: string } | undefined)?.kind;
          if (kind) { if (!observes.has(b.blockType)) observes.set(b.blockType, new Set()); observes.get(b.blockType)!.add(kind); }
        }
        r!.unmount();
      }
    }

    console.log("\n[C] blocType        DÉCLARÉ au registre            CONCÉDÉ par l'enveloppe     OBSERVÉ rendu");
    const types = [...new Set([...observes.keys(), ...Object.keys(ENV.reachableBlockStates)])].sort();
    let dec = 0, con = 0, obs = 0;
    for (const t of types) {
      const d = getBlock(t)?.states ?? [], c = ENV.reachableBlockStates[t] ?? [], o = [...(observes.get(t) ?? [])].sort();
      dec += d.length; con += c.length; obs += o.length;
      console.log(`    ${t.padEnd(16)}${d.join("/").padEnd(31)}${c.join("/").padEnd(28)}${o.join("/") || "«aucun état porté»"}`);
    }
    console.log(`    ${"TOTAL".padEnd(16)}${String(dec).padEnd(31)}${String(con).padEnd(28)}${obs}`);
    console.log(`\n[C] états déclarés JAMAIS observés : ${dec - obs} sur ${dec}`);

    const livres = rendus.get("fixtures livrées")!, vides = rendus.get("dataset vide")!;
    const seulementVide = [...vides].filter((b) => !livres.has(b));
    console.log(`\n[C] blocs rendus — fixtures livrées : ${livres.size}   ·   dataset vide : ${vides.size}`);
    if (seulementVide.length)
      console.log(`[C] rendus SEULEMENT sous dataset vide : ${seulementVide.join(", ")}` +
        `\n    ⇒ rendables en principe, INATTEIGNABLES avec les données livrées (le moteur n'écrit pas)`);
    expect(types.length).toBeGreaterThan(0);
  });
});
