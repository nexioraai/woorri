// INSTRUMENT D'OBSERVATION v1 — COUVERTURE DES DEUX SLICES.
// Étend v0 : tous les écrans émis des 2 slices · appui par identité ·
// contrôle négatif par écran · ET comparaison OBSERVÉ vs PLAN.
// Ce que le plan attend est lu dans les données d'écran ÉMISES, jamais supposé.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { readdirSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { compilerANeuf } from "./app-fraiche.ts";
import { journal, reset } from "./stub-navigation";

// ── CE QU'IL BALAYAIT, JUSQU'AU 2026-10-17, ET C'EST LE PLUS LARGE DES NEUF.
//
// `import.meta.glob("../../../../slices/*/app/...")` est resolu par Vite A LA
// TRANSFORMATION : il chargeait les ecrans de TOUTES les tranches COMMISES,
// dont les runtimes n'avaient pas bouge depuis le 2026-08-31 et le 2026-09-11.
//
// DEMONTRE, PAS DEDUIT : en cassant `ScreenShell` dans le compilateur — la
// primitive que TOUT ecran emis importe —, `gate:app-compile` rend 0/32 et ce
// fichier rendait « 1 passed ».
//
// Les deux tranches sont donc COMPILEES A NEUF, et l'etiquette de tranche est
// resolue depuis le dossier emis au lieu d'etre lue dans un chemin de depot.
const TRANCHES = [
  { nom: "resto-riche", doc: "slices/resto-riche/chez-nous.air.json" },
  { nom: "conteneurs", doc: "slices/conteneurs/air/suivi-conteneurs.air.json" },
] as const;

type Chargeur = () => Promise<Record<string, unknown>>;
const bases = new Map<string, string>();
let ECRANS: Record<string, Chargeur> = {};
let DONNEES: Record<string, Chargeur> = {};
let PROVIDERS: Record<string, Chargeur> = {};
let DEMOPROV: Record<string, Chargeur> = {};
let DEMODATA: Record<string, Chargeur> = {};

beforeAll(async () => {
  for (const t of TRANCHES) {
    const a = await compilerANeuf(t.doc, `deribfy-couverture-${t.nom}`);
    // Un zero se voit : un dossier vide rendrait tout montage impossible.
    expect(a.fichiers, `aucun fichier emis pour ${t.nom}`).toBeGreaterThan(10);
    bases.set(a.base, t.nom);
    const lien = (sous: string): [string, Chargeur] => [
      a.base + sous,
      () => import(a.base + sous) as Promise<Record<string, unknown>>,
    ];
    for (const nom of readdirSync(a.base + "screens").sort()) {
      if (nom.endsWith(".data.ts")) DONNEES = { ...DONNEES, ...Object.fromEntries([lien("screens/" + nom)]) };
      else if (nom.endsWith(".tsx")) ECRANS = { ...ECRANS, ...Object.fromEntries([lien("screens/" + nom)]) };
    }
    PROVIDERS = { ...PROVIDERS, ...Object.fromEntries([lien("lib/runtime/data-provider.tsx")]) };
    DEMOPROV = { ...DEMOPROV, ...Object.fromEntries([lien("lib/runtime/demo-provider.ts")]) };
    DEMODATA = { ...DEMODATA, ...Object.fromEntries([lien("demo.data.ts")]) };
  }
}, 300_000);

/** L'etiquette de tranche, resolue sur le dossier emis — plus sur un chemin
 *  de depot, qui n'existe plus dans ce que l'on monte. */
const slice = (p: string): string => {
  for (const [base, nom] of bases) if (p.startsWith(base)) return nom;
  throw new Error(`tranche inconnue pour ${p}`);
};

interface Donnees { screenId: string; blocks: { id: string; blockType: string; props: Record<string, unknown> }[];
  actions: Record<string, { kind: string; screenId?: string }>; uiActionsByBlock: Record<string, string>; }

/** Cible ATTENDUE par le plan pour une identité pressée — lue dans les données émises. */
function cibleAttendue(d: Donnees, testID: string): string | null {
  const row = /^(.*)-row-.+$/.exec(testID);
  const blockId = row ? row[1] : testID;
  const bloc = d.blocks.find((b) => b.id === blockId);
  if (!bloc) return null;
  const parProp = typeof bloc.props.actionId === "string" ? bloc.props.actionId : undefined;
  const parDeclencheur = d.uiActionsByBlock[blockId];
  const actionId = ["button", "empty_state"].includes(bloc.blockType) ? parProp : parDeclencheur;
  if (!actionId) return null;
  const eff = d.actions[actionId];
  return eff?.kind === "navigate" && eff.screenId ? eff.screenId : null;
}

describe("INSTRUMENT v1 — couverture des écrans émis des 2 slices", () => {
  it("presse toutes les identités de tous les écrans et confronte au plan", async () => {
    const bilan: Record<string, { ids: number; handlers: number; conformes: number; inertes: number;
      divergents: number; nonDeclarees: number; sansAttente: number }> = {};
    const anomalies: string[] = [];

    for (const [cheminEcran, charger] of Object.entries(ECRANS)) {
      const s = slice(cheminEcran);
      try {
      const nomData = cheminEcran.replace(/\.tsx$/, ".data.ts");
      const modData = await (DONNEES[nomData] as () => Promise<{ screenData: Donnees }>)();
      const d = modData.screenData;
      const { DataRoot } = await (Object.entries(PROVIDERS).find(([k]) => slice(k) === s)![1] as
        () => Promise<{ DataRoot: (p: unknown) => unknown }>)();
      const { buildDemoProvider } = await (Object.entries(DEMOPROV).find(([k]) => slice(k) === s)![1] as
        () => Promise<{ buildDemoProvider: (d: unknown) => unknown }>)();
      const { demoData } = await (Object.entries(DEMODATA).find(([k]) => slice(k) === s)![1] as
        () => Promise<{ demoData: unknown }>)();
      const Ecran = (await (charger as () => Promise<{ default: () => unknown }>)()).default;

      if (typeof Ecran !== "function") throw new Error(`écran non chargé : ${cheminEcran}`);
      const rendre = (): ReactTestRenderer => { let r: ReactTestRenderer | undefined;
        // createElement, jamais un appel direct : les hooks exigent un vrai rendu.
        const arbre = createElement(DataRoot as never, { provider: buildDemoProvider(demoData) } as never,
          createElement(Ecran as never));
        act(() => { r = create(arbre as never); });
        if (!r) throw new Error("rendu impossible"); return r; };

      reset(); const r0 = rendre();
      if (journal.length !== 0) anomalies.push(`${s}/${d.screenId} : CONTRÔLE NÉGATIF ÉCHOUÉ (${journal.length})`);
      const ids = [...new Set(r0.root.findAll((n) => typeof (n.props as { testID?: string }).testID === "string")
        .map((n) => (n.props as { testID: string }).testID))].sort();
      r0.unmount();

      const b = bilan[`${s}/${d.screenId}`] = { ids: ids.length, handlers: 0, conformes: 0, inertes: 0,
        divergents: 0, nonDeclarees: 0, sansAttente: 0 };
      for (const id of ids) {
        reset(); const r = rendre();
        const cibles = r.root.findAll((n) => (n.props as { testID?: string }).testID === id &&
          typeof (n.props as { onPress?: unknown }).onPress === "function");
        if (cibles.length === 0) { r.unmount(); continue; }
        b.handlers++;
        act(() => { (cibles[0].props as { onPress: () => void }).onPress(); });
        const obs = journal.map((j) => j.name); r.unmount();
        const att = cibleAttendue(d, id);
        if (att && obs.length === 1 && obs[0] === att) b.conformes++;
        else if (att && obs.length === 0) { b.inertes++; anomalies.push(`🔴 ${s}/${d.screenId}/${id} : plan=${att}, observé=AUCUNE`); }
        else if (att && obs[0] !== att) { b.divergents++; anomalies.push(`🔴 ${s}/${d.screenId}/${id} : plan=${att}, observé=${obs.join(",")}`); }
        else if (!att && obs.length > 0) { b.nonDeclarees++; anomalies.push(`🔴 ${s}/${d.screenId}/${id} : plan=AUCUNE, observé=${obs.join(",")}`); }
        else { b.sansAttente++; anomalies.push(`🟠 ${s}/${d.screenId}/${id} : PRESSABLE SANS EFFET (aucune action au plan)`); }
      }
      } catch (e) {
        // Un écran qui ne se rend pas EST une observation : on l'enregistre, on continue.
        anomalies.push(`🔴 ${cheminEcran.split("/app/")[1]} : RENDU IMPOSSIBLE — ${String((e as Error).message).slice(0, 90)}`);
      }
    }

    console.log("\n[OBS] COUVERTURE — écran par écran");
    console.log("  écran".padEnd(34) + "ids  handler  conforme  inerte  diverg.  non-décl.  pressable-sans-effet");
    const T = { ids: 0, handlers: 0, conformes: 0, inertes: 0, divergents: 0, nonDeclarees: 0, sansAttente: 0 };
    for (const [k, b] of Object.entries(bilan)) {
      for (const c of Object.keys(T) as (keyof typeof T)[]) T[c] += b[c];
      console.log(`  ${k.padEnd(32)}${String(b.ids).padStart(3)}${String(b.handlers).padStart(9)}` +
        `${String(b.conformes).padStart(10)}${String(b.inertes).padStart(8)}${String(b.divergents).padStart(9)}` +
        `${String(b.nonDeclarees).padStart(11)}${String(b.sansAttente).padStart(22)}`);
    }
    console.log(`  ${"TOTAL".padEnd(32)}${String(T.ids).padStart(3)}${String(T.handlers).padStart(9)}` +
      `${String(T.conformes).padStart(10)}${String(T.inertes).padStart(8)}${String(T.divergents).padStart(9)}` +
      `${String(T.nonDeclarees).padStart(11)}${String(T.sansAttente).padStart(22)}`);
    console.log(`\n[OBS] ANOMALIES : ${anomalies.length}`);
    anomalies.forEach((a) => console.log("   " + a));
    expect(T.ids).toBeGreaterThan(0);
  });
});
