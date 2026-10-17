// ════════════════════════════════════════════════════════════════════
//  EP-258 — UNE RÈGLE NE JUGE QUE CE QUE LE FORMULAIRE COLLECTE.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT QUE CE FICHIER EXISTE POUR INTERDIRE, ET SON AMPLEUR.
//
// Mesuré le 2026-10-17 sur les 15 documents du dépôt : VINGT formulaires,
// dans DOUZE documents, ne pouvaient PAS être soumis. Jamais, et en silence.
//
// LE MÉCANISME, LU DANS LE CODE, PAS SUPPOSÉ :
//   ① `reglesRespectees` évaluait TOUTES les règles de l'entité contre la
//      saisie du formulaire, avant toute écriture, et `return` sans rien dire ;
//   ② une assertion sur un champ ABSENT de la saisie échouait toujours — `in`
//      comparait la chaîne « undefined » à sa liste, `required` voyait du
//      vide, `matches` refusait `undefined` ;
//   ③ le bouton restait ACTIF : `onSubmit={() => dispatch(actionId, …)}`,
//      sans `disabled` ni condition de validité.
//
// L'utilisateur remplissait tout ce qu'il voyait, appuyait, et RIEN. Sans
// message. Et aucune gate ne le voyait : `gate:app-rendu` était verte sur
// les 29 applications du corpus.
//
// ── POURQUOI C'ÉTAIT UNE ERREUR DE CATÉGORIE, ET PAS UN OUBLI.
//
// Une règle porte un invariant sur une ENTITÉ (« le statut d'un billet
// appartient à ce cycle de vie »). Le formulaire ne collecte pas ce champ, et
// il a RAISON : personne ne tape un statut. L'invariant de la table a son
// gardien, et ce n'est pas le client : `derive-rls.ts` le porte côté serveur.
//
// ── CE QUI N'EST PAS AFFAIBLI, ET C'EST TOUT L'ENJEU.
//
// Un champ que le formulaire EXPOSE porte toujours sa clé : `AirForm` l'amorce
// à vide pour chaque champ déclaré. Laissé vide, il échoue `required` et
// BLOQUE. On distingue « le formulaire ne collecte pas ce champ » de
// « l'utilisateur ne l'a pas rempli » — sans cette amorce, le correctif aurait
// rendu tout formulaire soumettable à vide.
//
// Les deux moitiés sont donc mesurées ICI, sur la même application, et elles
// ne valent que PAIRÉES.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { champDuTestID, valeurPourChamp, type AssertionData } from "./saisie-conforme.ts";
// ── LE BINAIRE EST DÉCODÉ, ET LA DÉCISION EST UNIQUE (2026-10-17).
//
// Les faces de police embarquées voyagent en base64 dans la carte de fichiers.
// Écrire ce base64 EN TEXTE produit un fichier présent, non vide et INVALIDE —
// et une famille introuvable ne lève pas : elle retombe en silence sur la
// police système. NEUF écrivains existaient ; `fichiers-binaires.ts` est le
// seul endroit où la décision vit.
import { estBinaire } from "../../../../packages/compiler/src/fichiers-binaires.ts";

const REPO = new URL("../../../../", import.meta.url).pathname;
const DOC = REPO + "slices/validation-appareil/validation-appareil.air.json";

// ── L'APPLICATION EST COMPILÉE À NEUF, ET C'EST LE POINT.
//
// DÉFAUT MESURÉ SUR CE FICHIER MÊME : je l'avais d'abord pointé sur
// `slices/validation-appareil/app/`, l'application COMPILÉE ET COMMISE. Elle
// embarque sa propre copie du runtime, figée au jour de sa compilation — donc
// SANS le correctif. Le cliquet mesurait du code périmé et tombait au rouge
// sur une correction qui fonctionne.
//
// Un cliquet qui juge le COMPILATEUR doit passer par le compilateur. On émet
// donc dans un dossier neuf à chaque exécution, et l'on emprunte les
// dépendances d'une tranche déjà installée — même geste que
// `scripts/verifier-une-app.mjs`, pour la même raison.
const APP = join(tmpdir(), "deribfy-ep258") + "/";
const DEPS = REPO + "slices/resto-riche/app/node_modules";
const ECRAN = "scr_reservation";
const FORMULAIRE = "blk_reservation_form";

interface Instance {
  id: string;
  values: Record<string, string>;
}

/** Un fournisseur qui ÉCRIT vraiment et journalise ce qu'on lui demande. */
function fournisseurEcrivain(base: Record<string, Instance[]>) {
  const journal: string[] = [];
  const data = JSON.parse(JSON.stringify(base)) as Record<string, Instance[]>;
  return {
    journal,
    provider: {
      listInstances: (e: string) => data[e] ?? [],
      getInstance: (e: string, id?: string) =>
        id === undefined ? data[e]?.[0] : data[e]?.find((r) => r.id === id),
      create: (e: string, v: Readonly<Record<string, string>>) => {
        journal.push(`create:${e}`);
        (data[e] ??= []).push({ id: "neuf_1", values: { ...v } });
        return true;
      },
      update: (e: string) => {
        journal.push(`update:${e}`);
        return true;
      },
      remove: (e: string) => {
        journal.push(`remove:${e}`);
        return true;
      },
    },
  };
}

type Air = {
  rules?: { entityId?: string; assertions?: AssertionData[] }[];
  screens: { id: string; blocks?: { id: string; entityId?: string; blockType?: string; props?: { key: string; value: unknown }[] }[] }[];
};

const air = JSON.parse(readFileSync(DOC, "utf8")) as Air;

beforeAll(async () => {
  const { migrateAirDocument } = await import(REPO + "packages/air-schema/src/index.ts");
  const { compileProject } = await import(REPO + "packages/compiler/src/compile-project.ts");
  const doc = migrateAirDocument(JSON.parse(readFileSync(DOC, "utf8")) as Record<string, unknown>);
  const fichiers = (compileProject(doc) as { files: Map<string, string> }).files;
  rmSync(APP, { recursive: true, force: true });
  for (const [nom, contenu] of fichiers) {
    const abs = join(APP, nom);
    mkdirSync(dirname(abs), { recursive: true });
    // Les `.png` voyagent en base64 dans la carte — convention du dépôt.
    writeFileSync(abs, estBinaire(nom) ? Buffer.from(contenu, "base64") : contenu);
  }
  // L'emprunt est INDISPENSABLE, et son absence se DIT : un échec dont on
  // ignore la cause vaut moins qu'un refus net.
  if (!existsSync(DEPS)) {
    throw new Error(
      `EP-258 — aucun \`node_modules\` de référence en ${DEPS} ` +
        "(lancer `npm ci` dans slices/resto-riche/app)",
    );
  }
  symlinkSync(DEPS, join(APP, "node_modules"), "dir");
}, 120_000);

/** Les assertions de TOUT le document — `valeurPourChamp` filtre par champ. */
const assertions: AssertionData[] = (air.rules ?? []).flatMap((r) => r.assertions ?? []);

const blocFormulaire = air.screens
  .find((s) => s.id === ECRAN)
  ?.blocks?.find((b) => b.id === FORMULAIRE);

const champsExposes = (blocFormulaire?.props ?? []).find((p) => p.key === "fieldIds")
  ?.value as string[] | undefined;

const assertionsDeLEntite = (air.rules ?? [])
  .filter((r) => r.entityId === blocFormulaire?.entityId)
  .flatMap((r) => r.assertions ?? []);

async function monter(provider: unknown): Promise<ReactTestRenderer> {
  const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(APP + "lib/runtime/form-state.tsx");
  const Ecran = (await import(APP + `screens/${ECRAN}.tsx`)).default as () => unknown;
  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(
        DataRoot as never,
        { provider } as never,
        createElement(FormStateRoot as never, null as never, createElement(Ecran as never)),
      ) as never,
    );
  });
  if (r === undefined) throw new Error("l'écran ne s'est pas monté");
  return r;
}

const champs = (r: ReactTestRenderer) =>
  r.root.findAll((n) => typeof (n.props as { onChangeText?: unknown }).onChangeText === "function");
const pressables = (r: ReactTestRenderer) =>
  r.root.findAll((n) => typeof (n.props as { onPress?: unknown }).onPress === "function");

/** Saisir CHAMP PAR CHAMP en re-interrogeant l'arbre : chaque frappe provoque
 *  un rendu, donc les nœuds capturés avant deviennent obsolètes. */
function remplirConformement(r: ReactTestRenderer): number {
  const n = champs(r).length;
  for (let i = 0; i < n; i += 1) {
    act(() => {
      const cible = champs(r)[i];
      if (cible === undefined) return;
      const id = champDuTestID(
        (cible as unknown as { parent?: { props?: { testID?: unknown } } }).parent?.props?.testID ??
          (cible.props as { testID?: unknown }).testID,
      );
      const valeur = id === undefined ? "1" : valeurPourChamp(id, assertions);
      (cible.props as { onChangeText: (v: string) => void }).onChangeText(valeur);
    });
  }
  return n;
}

function presserTout(r: ReactTestRenderer): number {
  const boutons = pressables(r);
  act(() => {
    for (const b of boutons) (b.props as { onPress: () => void }).onPress();
  });
  return boutons.length;
}

describe("EP-258 · une règle ne juge que ce que le formulaire collecte", () => {
  it("LE TÉMOIN PORTE BIEN LES DEUX CAS — sinon ce cliquet ne mesure rien", () => {
    // ── SANS CE CONTRÔLE, LES DEUX SUIVANTS POURRAIENT ÊTRE VERTS À VIDE.
    //
    // Si la tranche changeait et n'exposait plus de champ sous `required`, le
    // contrôle ③ passerait sans rien éprouver. Si plus aucune assertion ne
    // portait sur un champ absent, le contrôle ② ne mesurerait plus le
    // correctif. On vérifie le témoin AVANT de s'en servir.
    expect(champsExposes, "le formulaire témoin a disparu").not.toBeUndefined();
    const exposes = new Set(champsExposes ?? []);
    const absentes = assertionsDeLEntite.filter((a) => !exposes.has(a.fieldId));
    const presentes = assertionsDeLEntite.filter(
      (a) => exposes.has(a.fieldId) && a.operator === "required",
    );
    expect(
      absentes.map((a) => a.fieldId),
      "aucune assertion ne porte sur un champ ABSENT : le correctif n'est plus éprouvé",
    ).not.toEqual([]);
    expect(
      presentes.map((a) => a.fieldId),
      "aucun champ exposé n'est `required` : la protection n'est plus éprouvée",
    ).not.toEqual([]);
  });

  it("② UNE RÈGLE SUR UN CHAMP NON COLLECTÉ NE BLOQUE PLUS — le correctif", async () => {
    const { demoData } = await import(APP + "demo.data.ts");
    const { journal, provider } = fournisseurEcrivain(demoData as never);
    const r = await monter(provider);
    const n = remplirConformement(r);
    const appuis = presserTout(r);
    r.unmount();
    console.log(
      `\n  [EP-258] ${String(n)} champ(s) remplis · ${String(appuis)} appui(s) · ${String(journal.length)} écriture(s)`,
    );
    expect(n, "le formulaire n'expose aucun champ : rien à éprouver").toBeGreaterThan(0);
    expect(
      journal.length,
      "le formulaire remplis conformément n'écrit RIEN : une règle juge un champ " +
        "que le formulaire ne collecte pas (20 formulaires étaient dans ce cas)",
    ).toBeGreaterThan(0);
  });

  it("③ UN CHAMP EXPOSÉ ET VIDE BLOQUE TOUJOURS — la protection", async () => {
    // ── LE CONTRÔLE QUI EMPÊCHE QUE LE CORRECTIF DEVIENNE UN TROU.
    //
    // `useFormValues` n'écrit une clé qu'au premier caractère tapé. Si
    // `AirForm` n'amorçait pas chaque champ déclaré à vide, un requis
    // INTOUCHÉ serait invisible à la validation — et le formulaire se
    // soumettrait vide. C'est exactement ce que ce contrôle refuse.
    const { demoData } = await import(APP + "demo.data.ts");
    const { journal, provider } = fournisseurEcrivain(demoData as never);
    const r = await monter(provider);
    const appuis = presserTout(r);
    r.unmount();
    console.log(`  [EP-258] sans rien remplir : ${String(appuis)} appui(s) · ${String(journal.length)} écriture(s)`);
    expect(appuis, "aucun contrôle pressable : rien à éprouver").toBeGreaterThan(0);
    expect(
      journal,
      "une soumission VIDE a écrit : les champs requis exposés ne bloquent plus",
    ).toEqual([]);
  });

  it("④ CONTRÔLE NÉGATIF — une source en LECTURE SEULE n'écrit rien et ne casse pas", async () => {
    const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
    const { demoData } = await import(APP + "demo.data.ts");
    const lecture = buildDemoProvider(demoData) as Record<string, unknown>;
    expect(
      typeof lecture.create,
      "le fournisseur de démonstration expose une écriture : ce contrôle ne contrôle plus rien",
    ).not.toBe("function");
    const r = await monter(lecture);
    remplirConformement(r);
    expect(() => {
      presserTout(r);
    }, "aucune méthode d'écriture exposée : l'appel doit être ABSENT, pas fatal").not.toThrow();
    r.unmount();
  });
});
