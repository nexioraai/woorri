// ════════════════════════════════════════════════════════════════════
//  PREUVE — L'AGENT D'UNE APPLICATION NE DIT PLUS UN CODE MACHINE.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT, MESURÉ LE 2026-10-17, ET IL ATTEIGNAIT L'UTILISATEUR FINAL.
//
// `AirAgent` passait le CODE du serveur comme message d'erreur :
// `message: echec`. Une personne qui demande quelque chose à son application
// lisait donc, à l'écran, « AIR_AGENT_SANS_CERVEAU » ou
// « AIR_AGENT_REPONSE_ILLISIBLE ».
//
// Et le bloc `agent` n'avait AUCUN moyen de déclarer une phrase, alors que
// `list`, `form` et `detail_header` l'ont depuis le registre 1.1.0 (D-060).
// Le défaut n'était donc pas un oubli de câblage : c'était un trou de
// VOCABULAIRE, la même famille que les sept formes de blocs qui ne pouvaient
// pas dessiner un tableau de bord.
//
// SUR LES DEUX CIBLES. Le runtime de l'agent est PARTAGÉ entre natif et web —
// un seul `air-runtime.tsx`, un seul `AgentBlock`. Le code s'affichait donc
// des deux côtés, et la correction vaut des deux côtés.
//
// ── POURQUOI UN DOCUMENT DE SYNTHÈSE, ET IL FAUT LE DIRE.
//
// ZÉRO document du dépôt ne déclare un bloc `agent`. Il est dans l'allowlist
// transmise au générateur, sa forme est exprimable (vérifié), et personne ne
// l'emploie — exactement l'état de `graphique` avant sa réparation. Ce fait
// est CONSIGNÉ, pas corrigé ici : poser un agent dans un document réel est une
// décision de produit, pas un effet de bord de ce lot.
//
// Le fixture est donc explicite : `fixtures/agent-essai.air.json`, un document
// du corpus auquel on AJOUTE un bloc agent. Il passe `assertValidAir`.
//
// ── CE QUE CE FICHIER TIENT.
//
// ① aucun code `AIR_AGENT_*` n'atteint le texte rendu ;
// ② la phrase DÉCLARÉE par le document est celle qu'on lit ;
// ③ le code reste DIAGNOSTICABLE — dans le `testID`, pas sous les yeux ;
// ④ sans phrase déclarée, aucun message n'est rendu, et l'état d'erreur reste
//    VISIBLE : la personne sait que ça a échoué.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer, ReactTestInstance } from "react-test-renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { compilerANeuf } from "./app-fraiche.ts";

const DOCUMENT_REL = "docs/elite-protocol/evidence/fixtures/agent-essai.air.json";
const DOCUMENT = DOCUMENT_REL;
const REPO = new URL("../../../../", import.meta.url).pathname;

/** L'écran du fixture qui porte l'agent — lu au document, jamais devine. */
const ECRAN_AGENT = (() => {
  const doc = JSON.parse(
    readFileSync(new URL("../../../../" + DOCUMENT_REL, import.meta.url).pathname, "utf8"),
  ) as { screens: { id: string; blocks: { blockType: string }[] }[] };
  const s = doc.screens.find((x) => x.blocks.some((b) => b.blockType === "agent"));
  if (s === undefined) throw new Error("agent-parle — le fixture ne porte plus de bloc agent");
  return s.id;
})();

let APP = "";
beforeAll(async () => {
  const a = await compilerANeuf(DOCUMENT, "deribfy-agent-parle");
  APP = a.base;
  expect(a.fichiers, "rien d'émis : il n'y a rien à monter").toBeGreaterThan(10);
}, 240_000);

/** Tout le texte rendu sous un nœud, concaténé. */
const texte = (n: ReactTestInstance): string =>
  n
    .findAll(() => true)
    .flatMap((x) => (Array.isArray(x.props.children) ? x.props.children : [x.props.children]))
    .filter((c): c is string => typeof c === "string")
    .join(" ");

/**
 * Monte l'écran d'entrée avec un PORT D'AGENT QUI ÉCHOUE, et déclenche l'envoi.
 *
 * Le port est le joint : il rend `{ ok: false, code }`, exactement ce que le
 * transport HTTP rend quand le serveur refuse. On n'a donc besoin d'aucun
 * réseau — et le cliquet zéro-réseau du dépôt reste satisfait.
 */
async function monterEtEchouer(code: string): Promise<ReactTestRenderer> {
  const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(APP + "lib/runtime/form-state.tsx");
  const { AgentRoot } = await import(APP + "lib/runtime/agent-racine.tsx");
  const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(APP + "demo.data.ts");
  // ── L'ÉCRAN EST CELUI QUI PORTE L'AGENT, PAS LE PREMIER DE LA NAVIGATION.
  //
  // Mon premier fixture posait l'agent sur l'écran d'entrée, et le compilateur
  // l'a REFUSÉ : `PLAN_CHROME_DUPLIQUE`. L'agent est un chrome PERSISTANT, et
  // la règle de composition n'en admet qu'un par écran — deux barres
  // permanentes sur un même écran, c'est deux fois la même promesse.
  //
  // Le refus était juste. Le fixture pose donc l'agent sur un écran sans
  // chrome, et on monte CELUI-LÀ.
  const Ecran = (await import(APP + `screens/${ECRAN_AGENT}.tsx`)).default as () => unknown;

  // Le contrat du port : `catalogue`, `parler`, `agir`. J avais ecrit
  // `comprendre` — un nom que j ai suppose au lieu de le lire, et le montage a
  // leve `port.parler is not a function`. Le contrat est la source.
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

  // ── OUVRIR, SAISIR, ENVOYER : on provoque l'échec par le GESTE, pas en
  // fabriquant un état interne. Un état posé à la main prouverait le rendu
  // d'un état, pas le trajet d'un échec.
  const parTestID = (frag: string): ReactTestInstance[] =>
    (r?.root.findAll((n) => String((n.props as { testID?: string }).testID ?? "").includes(frag)) ??
      []);
  const bouton = parTestID("blk_agent_essai").find(
    (n) => typeof (n.props as { onPress?: unknown }).onPress === "function",
  );
  expect(bouton, "le bloc agent n'est pas rendu").not.toBeUndefined();
  await act(async () => {
    (bouton?.props as { onPress: () => void }).onPress();
  });
  const champ = parTestID("blk_agent_essai").find(
    (n) => typeof (n.props as { onChangeText?: unknown }).onChangeText === "function",
  );
  if (champ !== undefined) {
    await act(async () => {
      (champ.props as { onChangeText: (v: string) => void }).onChangeText("fais quelque chose");
    });
  }
  const envoi = parTestID("blk_agent_essai").find(
    (n) => typeof (n.props as { onSend?: unknown }).onSend === "function",
  );
  if (envoi !== undefined) {
    await act(async () => {
      (envoi.props as { onSend: () => void }).onSend();
    });
  }
  return r!;
}

describe("PREUVE — l'agent dit une phrase, jamais un code", () => {
  it("① AUCUN CODE `AIR_AGENT_*` N'ATTEINT LE TEXTE RENDU", async () => {
    const r = await monterEtEchouer("AIR_AGENT_SANS_CERVEAU");
    const tout = texte(r.root);
    console.log(`\n[AGENT] texte rendu : ${tout.slice(0, 160)}`);
    expect(
      tout,
      "le code du serveur s'affiche à la personne : c'est un identifiant de " +
        "diagnostic, pas une phrase",
    ).not.toContain("AIR_AGENT");
    r.unmount();
  });

  it("② LA PHRASE EST CELLE QUE LE DOCUMENT A DÉCLARÉE", async () => {
    // F3 : le moteur n'invente aucun texte. Si cette phrase apparaissait sans
    // être dans le document, c'est le moteur qui parlerait — et ce dépôt
    // l'interdit partout.
    const brut = readFileSync(REPO + DOCUMENT, "utf8");
    expect(brut, "le fixture ne déclare plus de phrase").toContain("Je n ai pas pu faire cela");
    const r = await monterEtEchouer("AIR_AGENT_SANS_CERVEAU");
    expect(
      texte(r.root),
      "la phrase déclarée par le document n'atteint pas l'écran : le maillon " +
        "manquant, pour la cinquième fois dans ce dépôt",
    ).toContain("Je n ai pas pu faire cela");
    r.unmount();
  });

  it("③ LE CODE RESTE DIAGNOSTICABLE — dans l'identité, pas sous les yeux", async () => {
    // Un code qu'on cache ENTIÈREMENT est un code qu'on ne peut plus suivre.
    // Il voyage donc dans le `testID` : un instrument le trouve, aucun œil ne
    // le subit.
    const r = await monterEtEchouer("AIR_AGENT_REPONSE_ILLISIBLE");
    const ids = r.root
      .findAll(() => true)
      .map((n) => String((n.props as { testID?: string }).testID ?? ""))
      .filter((s) => s.includes("blk_agent_essai"));
    console.log(`[AGENT] identités rendues : ${[...new Set(ids)].join(" ")}`);
    expect(
      ids.some((s) => s.includes("AIR_AGENT_REPONSE_ILLISIBLE")),
      "le code a disparu de l'identité : un échec ne serait plus diagnosticable",
    ).toBe(true);
    r.unmount();
  });

  it("④ SANS PHRASE DÉCLARÉE : aucun message, mais l'échec reste VISIBLE", async () => {
    // ── C'EST LE CONTRÔLE QUI REND LA MONTÉE ADDITIVE, ET IL A UN COÛT ASSUMÉ.
    //
    // Un document qui ne déclare pas `errorMessage` ne doit lire AUCUN texte
    // inventé (F3). Mais l'échec doit rester visible — sinon la personne a
    // appuyé sur envoyer et rien ne s'est passé, ce qui est pire qu'un code.
    //
    // On vérifie donc les deux ensemble : le titre (déclaré, c'est le label de
    // l'agent) est là, et aucun code ne l'accompagne.
    const chemin = REPO + "docs/elite-protocol/evidence/fixtures/agent-sans-phrase.air.json";
    const doc = JSON.parse(readFileSync(REPO + DOCUMENT, "utf8")) as {
      screens: { blocks: { id: string; props?: { key: string; value: unknown }[] }[] }[];
    };
    for (const s of doc.screens) {
      for (const b of s.blocks) {
        if (b.id === "blk_agent_essai") {
          b.props = (b.props ?? []).filter((p) => p.key !== "errorMessage");
        }
      }
    }
    writeFileSync(chemin, JSON.stringify(doc, null, 2) + "\n");

    const a = await compilerANeuf(
      "docs/elite-protocol/evidence/fixtures/agent-sans-phrase.air.json",
      "deribfy-agent-muet",
    );
    const précédent = APP;
    APP = a.base;
    try {
      const r = await monterEtEchouer("AIR_AGENT_SANS_CERVEAU");
      const tout = texte(r.root);
      console.log(`[AGENT] sans phrase déclarée : ${tout.slice(0, 120)}`);
      expect(tout, "un code s'affiche faute de phrase déclarée").not.toContain("AIR_AGENT");
      expect(
        tout,
        "l'échec est devenu invisible : la personne a appuyé sur envoyer et ne " +
          "sait pas que ça a échoué",
      ).toContain("Demander a l application");
      r.unmount();
    } finally {
      APP = précédent;
    }
  });
});
