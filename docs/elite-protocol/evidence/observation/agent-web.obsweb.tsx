// ════════════════════════════════════════════════════════════════════
//  PREUVE WEB — L'AGENT NE DIT PAS UN CODE SUR LA CIBLE WEB NON PLUS.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE FICHIER EXISTE ALORS QUE LE RUNTIME EST PARTAGÉ.
//
// `air-runtime.tsx` est le MÊME fichier des deux côtés, donc on pourrait
// déduire que la correction vaut pour le web. Déduire n'est pas mesurer — et ce
// dépôt a payé deux fois pour l'avoir oublié le même jour : l'avatar à
// initiales compilait côté web et ne s'affichait pas, parce que
// `primitives.tsx` n'est PAS partagé.
//
// Or c'est précisément une PRIMITIVE qui rend ce message : `StateView`. Elle a
// deux implémentations, une par cible. Le déduire aurait été l'erreur exacte
// qu'on vient de payer.
//
// ── CE QUE CE FICHIER TIENT.
//
// ① aucun code `AIR_AGENT_*` dans le texte rendu par la cible WEB ;
// ② la phrase déclarée par le document y est bien lue.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer, ReactTestInstance } from "react-test-renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const REPO = new URL("../../../../", import.meta.url).pathname;
const DOCUMENT = "docs/elite-protocol/evidence/fixtures/agent-essai.air.json";

let APP = "";
let ECRAN = "";

beforeAll(async () => {
  const { migrateAirDocument } = (await import(REPO + "packages/air-schema/src/index.ts")) as {
    migrateAirDocument: (d: Record<string, unknown>) => unknown;
  };
  const { compileWeb } = (await import(REPO + "packages/compiler/src/compile-web.ts")) as {
    compileWeb: (a: unknown) => { files: Map<string, string> };
  };
  const brut = JSON.parse(readFileSync(join(REPO, DOCUMENT), "utf8")) as {
    screens: { id: string; blocks: { blockType: string }[] }[];
  };
  const trouve = brut.screens.find((s) => s.blocks.some((b) => b.blockType === "agent"));
  expect(trouve, "le fixture ne porte plus de bloc agent").not.toBeUndefined();
  ECRAN = trouve?.id ?? "";

  const air = migrateAirDocument(brut as unknown as Record<string, unknown>);
  const fichiers = compileWeb(air).files;
  const base = join(tmpdir(), "deribfy-agent-web") + "/";
  rmSync(base, { recursive: true, force: true });
  const { estBinaire } = (await import(
    REPO + "packages/compiler/src/fichiers-binaires.ts"
  )) as { estBinaire: (c: string) => boolean };
  for (const [chemin, contenu] of fichiers) {
    const abs = join(base, chemin);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, estBinaire(chemin) ? Buffer.from(contenu, "base64") : contenu);
  }
  // Les dépendances sont EMPRUNTÉES, comme partout ailleurs dans ce dossier.
  const { symlinkSync, existsSync } = await import("node:fs");
  const deps = REPO + "slices/resto-riche/app/node_modules";
  expect(existsSync(deps), "aucun `node_modules` de référence à emprunter").toBe(true);
  symlinkSync(deps, join(base, "node_modules"), "dir");
  APP = base;
}, 240_000);

const texte = (n: ReactTestInstance): string =>
  n
    .findAll(() => true)
    .flatMap((x) => (Array.isArray(x.props.children) ? x.props.children : [x.props.children]))
    .filter((c): c is string => typeof c === "string")
    .join(" ");

async function monterEtEchouer(code: string): Promise<ReactTestRenderer> {
  const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(APP + "lib/runtime/form-state.tsx");
  const { AgentRoot } = await import(APP + "lib/runtime/agent-racine.tsx");
  const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(APP + "demo.data.ts");
  const Ecran = (await import(APP + `screens/${ECRAN}.tsx`)).default as () => unknown;
  const port = {
    catalogue: () => Promise.resolve({ ok: false as const, code }),
    parler: () => Promise.resolve({ ok: false as const, code }),
    agir: () => Promise.resolve({ ok: false as const, code }),
  };
  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(AgentRoot as never, { port } as never,
        createElement(DataRoot as never, { provider: buildDemoProvider(demoData) } as never,
          createElement(FormStateRoot as never, null as never, createElement(Ecran as never)))) as never,
    );
  });
  // Côté web les identités sont `data-testid` : chercher `testID` rendrait
  // zéro nœud et un vert mensonger.
  // ── DEUX NOMS POUR LA MÊME IDENTITÉ, ET IL FAUT LES DEUX.
  //
  // Les COMPOSITES (`AppButton`, `AgentBlock`) reçoivent `testID` — c'est le
  // contrat des blocs, identique des deux côtés. Les nœuds HÔTES rendus par le
  // web portent `data-testid`, parce que c'est l'attribut HTML.
  //
  // Mon premier harnais ne cherchait que `data-testid` : les gestes
  // (`onPress`, `onSend`) vivent sur les COMPOSITES, donc il n'en trouvait
  // aucun, et le contrôle ① passait sans qu'aucun échec ait eu lieu.
  const par = (frag: string): ReactTestInstance[] =>
    r?.root.findAll((n) => {
      const p = n.props as Record<string, unknown>;
      return (
        String(p["data-testid"] ?? "").includes(frag) || String(p.testID ?? "").includes(frag)
      );
    }) ?? [];
  // ── LE GESTE DOIT ÊTRE CELUI DE L'AGENT, PAS LE PREMIER DE L'ÉCRAN.
  //
  // Mon premier harnais prenait le PREMIER nœud portant `onPress` dans tout
  // l'arbre. L'écran en porte d'autres, donc l'agent ne s'ouvrait pas, l'envoi
  // n'avait pas lieu, et l'échec jamais. Conséquence : le contrôle ① passait
  // — « aucun code affiché » — alors que rien n'avait échoué. Vert, et faux.
  //
  // On scope donc au bloc : seuls les nœuds dont l'identité porte
  // `blk_agent_essai` sont actionnés.
  const gesteDeLAgent = (nom: "onPress" | "onSend"): ReactTestInstance | undefined =>
    par("blk_agent_essai").find(
      (n) => typeof (n.props as Record<string, unknown>)[nom] === "function",
    );
  expect(par("blk_agent_essai").length, "le bloc agent n'est pas rendu côté web").toBeGreaterThan(0);
  const ouvrir = gesteDeLAgent("onPress");
  expect(ouvrir, "aucun geste d'ouverture sur le bloc agent").not.toBeUndefined();
  await act(async () => {
    (ouvrir?.props as { onPress: () => void }).onPress();
  });
  // ── IL FAUT SAISIR AVANT D'ENVOYER, et j'avais sauté cette étape.
  //
  // `AirAgent.envoyer` ne part pas sur un texte vide — c'est juste, personne
  // n'envoie le vide. Sans saisie, l'envoi est muet, l'échec n'a pas lieu, et
  // le contrôle ① redevient vert pour rien. Le harnais natif la faisait ; le
  // web l'avait perdue.
  const champ = par("blk_agent_essai").find(
    (n) => typeof (n.props as Record<string, unknown>).onChangeText === "function",
  );
  expect(champ, "aucun champ de saisie après ouverture").not.toBeUndefined();
  await act(async () => {
    (champ?.props as { onChangeText: (v: string) => void }).onChangeText("fais quelque chose");
  });
  const envoyer = gesteDeLAgent("onSend");
  expect(envoyer, "aucun geste d'envoi après ouverture : l'échec n'aura pas lieu").not.toBeUndefined();
  await act(async () => {
    (envoyer?.props as { onSend: () => void }).onSend();
  });
  // ── ET ON EXIGE QUE L'ÉCHEC AIT EU LIEU.
  //
  // Sans cette vérification, un harnais qui n'actionne rien rendrait le
  // contrôle ① vert pour la plus mauvaise des raisons.
  const codeVu = par("-echec-").length;
  expect(
    codeVu,
    "aucun état d'échec rendu : le harnais n'a pas déclenché l'erreur, et les " +
      "contrôles qui suivent seraient verts sans rien prouver",
  ).toBeGreaterThan(0);
  return r!;
}

describe("PREUVE WEB — l'agent dit une phrase, jamais un code", () => {
  it("① AUCUN CODE `AIR_AGENT_*` DANS LE TEXTE RENDU PAR LE WEB", async () => {
    const r = await monterEtEchouer("AIR_AGENT_SANS_CERVEAU");
    const tout = texte(r.root);
    console.log(`\n[AGENT-WEB] texte rendu : ${tout.slice(0, 160)}`);
    expect(
      tout,
      "le code du serveur s'affiche côté WEB : `StateView` a deux " +
        "implémentations, et déduire du natif aurait été l'erreur de l'avatar",
    ).not.toContain("AIR_AGENT");
    r.unmount();
  });

  it("② LA PHRASE DÉCLARÉE EST LUE SUR LE WEB AUSSI", async () => {
    const r = await monterEtEchouer("AIR_AGENT_SANS_CERVEAU");
    expect(
      texte(r.root),
      "la phrase du document n'atteint pas l'écran web",
    ).toContain("Je n ai pas pu faire cela");
    r.unmount();
  });
});
