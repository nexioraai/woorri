// INSPECTION COMPLÈTE DE L'APPLICATION ÉMISE — avant de la rendre.
//
// Tous les contrôles précédents visaient UN point : un slot, un état, une
// traversée. Aucun n'a jamais monté les 7 écrans après les 11 décisions de la
// session. Un moteur peut passer 659 tests et produire une app qui explose au
// premier rendu — c'est exactement ce que `APP-D002` avait montré.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { readdirSync } from "node:fs";
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
  const a = await compilerANeuf("slices/resto-riche/chez-nous.air.json", "deribfy-app-complete", [
    // Le Code Slot est du code HUMAIN : le compilateur emet le mecanisme,
    // jamais le contenu. Il est donc superpose a l'emission fraiche.
    "slices/resto-riche/app/slots",
  ]);
  APP = a.base;
  // Un zero se voit : sans ce controle, un dossier vide rendrait tout
  // montage impossible pour une raison qu'on mettrait longtemps a nommer.
  expect(a.fichiers, "aucun fichier emis : il n'y a rien a monter").toBeGreaterThan(20);
  ECRANS = Object.fromEntries(
    readdirSync(APP + "screens")
      .filter((x) => x.endsWith(".tsx"))
      .sort()
      .map((nom) => [
        APP + "screens/" + nom,
        (() => import(APP + "screens/" + nom)) as ChargeurEcran,
      ]),
  );
}, 180_000);

// ── POURQUOI LE GLOB A DISPARU, ET C'ETAIT LA MOITIE DE L'AVEUGLEMENT.
//
// `import.meta.glob` est resolu par Vite A LA TRANSFORMATION, contre un chemin
// LITTERAL. Il chargeait donc les ecrans de la tranche COMMISE, meme apres que
// le runtime, lui, fut compile a neuf : du code frais par-dessus des ecrans
// figes, et la casse ne les atteignait jamais.
//
// MESURE : apres la seule conversion du runtime, ce fichier rendait encore
// « 2 passed » avec `ScreenShell` casse dans le compilateur. Les trois autres
// convertis le meme jour voyaient deja la casse — lui pas.
//
// La liste est donc construite A L'EXECUTION, sur le dossier fraichement
// emis, et chaque ecran est importe dynamiquement.
type ChargeurEcran = () => Promise<{ default: unknown }>;
let ECRANS: Record<string, ChargeurEcran> = {};

const textes = (r: ReactTestRenderer): string[] =>
  r.root
    .findAll(() => true)
    .flatMap((n) => (Array.isArray(n.props.children) ? n.props.children : [n.props.children]))
    .filter((c): c is string => typeof c === "string");

async function racine() {
  const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
  const { SlotRoot } = await import(APP + "lib/runtime/slot-provider.tsx");
  const { FormStateRoot } = await import(APP + "lib/runtime/form-state.tsx");
  const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(APP + "demo.data.ts");
  const { slotRegistry } = await import(APP + "slots/index.ts");
  return { DataRoot, SlotRoot, FormStateRoot, provider: buildDemoProvider(demoData), slotRegistry };
}

describe("INSPECTION — les 7 écrans de l'application émise", () => {
  it("chaque écran se monte SANS exception, et rend quelque chose", async () => {
    const { DataRoot, SlotRoot, FormStateRoot, provider, slotRegistry } = await racine();
    const chemins = Object.keys(ECRANS).sort();
    expect(chemins.length, "l'app doit avoir ses 7 écrans").toBe(7);
    const rapport: string[] = [];
    for (const [chemin, charger] of Object.entries(ECRANS).sort()) {
      const nom = chemin.split("/").pop() ?? "";
      const Ecran = (await (charger as () => Promise<{ default: () => unknown }>)()).default;
      let r: ReactTestRenderer | undefined;
      let erreur: string | undefined;
      try {
        act(() => {
          r = create(
            createElement(
              DataRoot as never,
              { provider } as never,
              createElement(
                SlotRoot as never,
                { registry: slotRegistry } as never,
                createElement(FormStateRoot as never, null as never, createElement(Ecran as never)),
              ),
            ) as never,
          );
        });
      } catch (e) {
        erreur = e instanceof Error ? e.message : String(e);
      }
      const t = erreur === undefined && r !== undefined ? textes(r) : [];
      const ids = erreur === undefined && r !== undefined
        ? r.root.findAll((n) => typeof (n.props as { testID?: string }).testID === "string").length
        : 0;
      r?.unmount();
      rapport.push(`   ${nom.padEnd(26)} ${erreur ?? `OK · ${ids} identités · ${t.length} textes`}`);
      expect(erreur, `${nom} ne doit pas lever`).toBeUndefined();
      expect(ids, `${nom} doit rendre au moins un bloc adressable`).toBeGreaterThan(0);
    }
    console.log("\n[INSPECTION] écrans montés :\n" + rapport.join("\n"));
  });

  it("AUCUN identifiant technique ne fuit à l'écran", async () => {
    const { DataRoot, SlotRoot, FormStateRoot, provider, slotRegistry } = await racine();
    const fuites: string[] = [];
    for (const [chemin, charger] of Object.entries(ECRANS).sort()) {
      const Ecran = (await (charger as () => Promise<{ default: () => unknown }>)()).default;
      let r: ReactTestRenderer | undefined;
      act(() => {
        r = create(
          createElement(
            DataRoot as never,
            { provider } as never,
            createElement(
              SlotRoot as never,
              { registry: slotRegistry } as never,
              createElement(FormStateRoot as never, null as never, createElement(Ecran as never)),
            ),
          ) as never,
        );
      });
      for (const t of textes(r!)) {
        if (/^(ent_|scr_|act_|fld_|blk_|slot_|data_)/.test(t)) {
          fuites.push(`${chemin.split("/").pop() ?? ""}: ${t}`);
        }
      }
      r!.unmount();
    }
    console.log("[INSPECTION] fuites d'identifiants :", fuites.length === 0 ? "AUCUNE" : fuites);
    expect(fuites).toEqual([]);
  });
});
