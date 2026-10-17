// G2 — « ∀ contrôle adressable ». Propriété jusqu'ici NON IMPLÉMENTÉE
// (aucun croisement arbre a11y ↔ plan dans le dépôt). Mesurée ici par
// confrontation : blocs DÉCLARÉS au plan  ×  identités RÉELLEMENT rendues.
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
  const a = await compilerANeuf("slices/conteneurs/air/suivi-conteneurs.air.json", "deribfy-g2-adressabilite");
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

describe("G2 — adressabilité des blocs déclarés", () => {
  it("confronte les blocs du plan aux identités réellement rendues", async () => {
    const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
    const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
    const { demoData } = await import(APP + "demo.data.ts");
    const provider = buildDemoProvider(demoData);
    let declares = 0, adressables = 0; const absents: string[] = [];
    console.log("\n[G2] écran                        blocs déclarés   adressables   NON ADRESSABLES");
    for (const [chemin, charger] of Object.entries(ECRANS)) {
      const { screenData } = await (DONNEES[chemin.replace(/\.tsx$/, ".data.ts")] as
        () => Promise<{ screenData: { screenId: string; blocks: { id: string; blockType: string }[] } }>)();
      const Ecran = (await (charger as () => Promise<{ default: () => unknown }>)()).default;
      let r: ReactTestRenderer | undefined;
      act(() => { r = create(createElement(DataRoot as never, { provider } as never, createElement(Ecran as never)) as never); });
      const ids = new Set(r!.root.findAll((n) => typeof (n.props as { testID?: string }).testID === "string")
        .map((n) => (n.props as { testID: string }).testID));
      r!.unmount();
      const manquants = screenData.blocks.filter((b) => !ids.has(b.id));
      declares += screenData.blocks.length; adressables += screenData.blocks.length - manquants.length;
      manquants.forEach((b) => absents.push(`${screenData.screenId}/${b.id} [${b.blockType}]`));
      console.log(`     ${screenData.screenId.padEnd(28)}${String(screenData.blocks.length).padStart(8)}` +
        `${String(screenData.blocks.length - manquants.length).padStart(14)}${String(manquants.length).padStart(17)}`);
    }
    console.log(`     ${"TOTAL".padEnd(28)}${String(declares).padStart(8)}${String(adressables).padStart(14)}${String(declares - adressables).padStart(17)}`);
    console.log(`\n[G2] taux d'adressabilité : ${(100 * adressables / declares).toFixed(1)} %`);
    if (absents.length) { console.log("[G2] BLOCS DÉCLARÉS NON ADRESSABLES :"); absents.forEach((a) => console.log("     🔴 " + a)); }
    expect(declares).toBeGreaterThan(0);
  });
});
