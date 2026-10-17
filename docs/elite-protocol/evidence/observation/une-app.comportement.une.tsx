// ════════════════════════════════════════════════════════════════════
//  LOT 6 — NIVEAU ⑤ : VOTRE APPLICATION AGIT-ELLE ?
// ════════════════════════════════════════════════════════════════════
//
// ── CE QUE LE NIVEAU PRÉCÉDENT NE PROUVAIT PAS.
//
// Le LOT 4 monte chaque écran et refuse ceux qui rendent du vide. Mais un
// écran peut se monter, afficher ses contrôles, et ne RIEN faire quand on
// appuie. Ce dépôt a déjà payé ce défaut et l'a nommé : `APP-D002` —
// « 56 contrôles pressables et muets ».
//
// Ici on APPUIE, on SAISIT, et on regarde ce qui arrive réellement à la
// source de données.
//
// ── D'OÙ VIENT LA MÉTHODE, ET ELLE N'EST PAS DE MOI.
//
// `comportement.obs.tsx` fait exactement cela depuis longtemps — presser,
// saisir, journaliser les écritures. Mesuré le 2026-10-17, deux faits :
//   ① il passe (3 contrôles verts) ;
//   ② il est cloué à `slices/resto-riche/app/` EN DUR, une tranche-fixture,
//      et AUCUNE gate ne le lance (14 des 19 fichiers d'observation sont
//      dans ce cas).
//
// Donc la technique existait, prouvée, et ne s'appliquait jamais à
// l'application que le propriétaire venait de générer. C'est le même geste
// que le LOT 4 a fait pour le rendu : on le pointe sur `DERIBFY_APP`.
//
// v0, observé le 2026-10-16, s'arrête lui aussi au niveau ④ par un autre
// chemin : `fill @e9 "13000"` puis vérification que le nombre affiché a
// changé. Le contrôle ② ci-dessous est cette idée, rendue générique.
//
// ── CE QUI EST ASSERTÉ, ET CE QUI EST SEULEMENT RAPPORTÉ.
//
// ASSERTÉ : ce qui est vrai de TOUTE application générée.
// RAPPORTÉ : l'atteignabilité de chaque opération déclarée. Mesuré sur la
// tontine : le document déclare `create` ET `update` ; appuyer sur tout
// produit deux `create` et zéro `update`. Ce n'est PAS une preuve de
// défaut — un `update` exige en général de choisir une ligne d'abord, et
// cette sonde n'navigue pas. L'asserter rendrait un faux rouge. On le DIT,
// et qui veut creuser a le chiffre.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const BASE = (process.env.DERIBFY_APP ?? "").replace(/\/?$/u, "/");
/** Le nombre de mutations DÉCLARÉES par le document, passé par le script.
 *  Absent ⇒ on n'exige aucune écriture : exiger ce que le document ne
 *  promet pas serait un faux cliquet. */
const MUTATIONS = Number(process.env.DERIBFY_MUTATIONS ?? "0");

interface Instance {
  id: string;
  values: Record<string, string>;
}

/**
 * UN FOURNISSEUR QUI ÉCRIT VRAIMENT, ET QUI DIT CE QU'ON LUI A DEMANDÉ.
 *
 * Un double qui accepte tout sans rien noter rendrait « ça écrit » vrai et
 * invérifiable. Celui-ci journalise l'opération ET l'entité : c'est ce qui
 * permet de dire QUELLE promesse du document a été honorée.
 */
function fournisseurEcrivain(base: Record<string, Instance[]>) {
  const journal: string[] = [];
  const data = JSON.parse(JSON.stringify(base)) as Record<string, Instance[]>;
  let n = 0;
  return {
    journal,
    provider: {
      listInstances: (e: string) => data[e] ?? [],
      getInstance: (e: string, id?: string) =>
        id === undefined ? data[e]?.[0] : data[e]?.find((r) => r.id === id),
      create: (e: string, v: Readonly<Record<string, string>>) => {
        journal.push(`create:${e}`);
        n += 1;
        (data[e] ??= []).push({ id: `neuf_${String(n)}`, values: { ...v } });
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
      upsert: (e: string) => {
        journal.push(`upsert:${e}`);
        return true;
      },
    },
  };
}

type Noeud = { props: Record<string, unknown> };
const champsDe = (r: ReactTestRenderer): Noeud[] =>
  r.root.findAll((n) => typeof (n.props as { onChangeText?: unknown }).onChangeText === "function");
const pressablesDe = (r: ReactTestRenderer): Noeud[] =>
  r.root.findAll((n) => typeof (n.props as { onPress?: unknown }).onPress === "function");

async function monter(provider: unknown, fichier: string): Promise<ReactTestRenderer> {
  const { DataRoot } = await import(BASE + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(BASE + "lib/runtime/form-state.tsx");
  const Ecran = (await import(BASE + "screens/" + fichier)).default as () => unknown;
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
  if (r === undefined) throw new Error(`${fichier} ne s'est pas monté`);
  return r;
}

/**
 * CE QU'ON SAISIT DANS CHAQUE CHAMP, ET D'OÙ VIENT L'IDENTITÉ.
 *
 * ── LE DÉFAUT QUE J'AI COMMIS, PUIS MESURÉ.
 *
 * Ma première version remplissait TOUT avec « 42 ». Sur `bus-intercites` :
 * 136 appuis, 32 champs, ZÉRO écriture — et j'ai failli écrire que
 * l'application était muette. Le document déclarait un motif e-mail et une
 * liste fermée : « 42 » les violait, et la soumission était refusée À RAISON.
 *
 * Un instrument qui crie au loup sur une application saine est PIRE que pas
 * d'instrument : on apprend à l'ignorer.
 *
 * ── COMMENT ON RETROUVE LE CHAMP.
 *
 * `TextField` porte son `testID` sur sa VUE ENVELOPPE, pas sur le `TextInput`
 * qui tient `onChangeText`. On remonte donc les parents jusqu'au premier
 * `testID`, dont la forme est `<bloc>-field-<champ>`. Le script passe la
 * table `champ → valeur`, dérivée des ASSERTIONS du document.
 *
 * Sans table, on retombe sur un témoin neutre : l'instrument reste utilisable
 * à la main, et il ne prétend pas savoir ce qu'on ne lui a pas dit.
 */
const VALEURS: Record<string, string> = (() => {
  try {
    return JSON.parse(process.env.DERIBFY_VALEURS ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
})();
const TEMOIN = "Temoin-4217";

function champDe(noeud: { parent?: unknown; props: Record<string, unknown> }): string | null {
  let p: { parent?: unknown; props?: Record<string, unknown> } | undefined = noeud;
  for (let i = 0; i < 8 && p !== undefined && p !== null; i += 1) {
    const id = p.props?.testID;
    if (typeof id === "string") {
      const m = /-field-(.+)$/u.exec(id);
      if (m?.[1] !== undefined) return m[1];
    }
    p = p.parent as typeof p;
  }
  return null;
}

/** SAISIR CHAMP PAR CHAMP, EN RE-INTERROGEANT L'ARBRE : chaque frappe
 *  provoque un rendu, donc les nœuds capturés avant deviennent obsolètes.
 *  (Piège déjà rencontré dans `comportement.obs.tsx`, qui le documente.) */
function remplirTout(r: ReactTestRenderer, force?: string): number {
  const n = champsDe(r).length;
  for (let i = 0; i < n; i += 1) {
    act(() => {
      const champs = champsDe(r);
      const cible = champs[i];
      if (cible === undefined) return;
      const id = champDe(cible as never);
      const valeur =
        force ?? (id === null ? TEMOIN : (VALEURS[id] ?? TEMOIN));
      (cible.props as { onChangeText: (v: string) => void }).onChangeText(valeur);
    });
  }
  return n;
}

const ecrans = (): string[] =>
  readdirSync(BASE + "screens")
    .filter((x) => x.endsWith(".tsx"))
    .sort();

describe("UNE APPLICATION — elle AGIT, pas seulement elle s'affiche", () => {
  it("① AUCUN APPUI NE CASSE L'APPLICATION", { timeout: 180_000 }, async () => {
    const { demoData } = await import(BASE + "demo.data.ts");
    const casses: string[] = [];
    let appuis = 0;
    for (const f of ecrans()) {
      const { provider } = fournisseurEcrivain(demoData as never);
      const r = await monter(provider, f);
      const boutons = pressablesDe(r);
      appuis += boutons.length;
      try {
        act(() => {
          for (const b of boutons) (b.props as { onPress: () => void }).onPress();
        });
      } catch (e) {
        casses.push(`${f} — ${e instanceof Error ? e.message.slice(0, 140) : String(e)}`);
      }
      r.unmount();
    }
    console.log(`\n  ${String(appuis)} appui(s) sur ${String(ecrans().length)} écran(s)`);
    for (const c of casses) console.log(`   🔴 ${c}`);
    // Sans ce compte, une application SANS contrôle passerait au vert sans
    // qu'on ait appuyé sur quoi que ce soit.
    expect(appuis, "aucun contrôle pressable : il n'y a rien à éprouver").toBeGreaterThan(0);
    expect(casses, casses.slice(0, 4).join(" · ")).toEqual([]);
  });

  it("② UN CHAMP REMPLI N'EST PAS DÉCORATIF", { timeout: 180_000 }, async () => {
    // ── LE CONTRÔLE QUI DISTINGUE « ÇA S'AFFICHE » DE « ÇA RÉPOND ».
    //
    // Un champ qui accepte une frappe sans que RIEN ne change à l'écran est
    // un contrôle muet : l'utilisateur tape, et son texte n'existe nulle
    // part. On vérifie les deux : l'arbre change, et la valeur s'y trouve.
    const { buildDemoProvider } = await import(BASE + "lib/runtime/demo-provider.ts");
    const { demoData } = await import(BASE + "demo.data.ts");
    const muets: string[] = [];
    let avecChamps = 0;
    let champsTotal = 0;
    for (const f of ecrans()) {
      const r = await monter(buildDemoProvider(demoData), f);
      const n = champsDe(r).length;
      if (n === 0) {
        r.unmount();
        continue;
      }
      avecChamps += 1;
      champsTotal += n;
      const avant = JSON.stringify(r.toJSON());
      remplirTout(r, TEMOIN);
      const apres = JSON.stringify(r.toJSON());
      if (avant === apres) muets.push(`${f} — ${String(n)} champ(s) : l'affichage ne change pas`);
      else if (!apres.includes(TEMOIN)) {
        muets.push(`${f} — la saisie ne ressort nulle part à l'écran`);
      }
      r.unmount();
    }
    console.log(
      `\n  ${String(champsTotal)} champ(s) sur ${String(avecChamps)} écran(s) de saisie`,
    );
    for (const m of muets) console.log(`   🔴 ${m}`);
    expect(muets, muets.slice(0, 4).join(" · ")).toEqual([]);
    // UNE APPLICATION SANS AUCUN CHAMP EST LÉGITIME (un tableau de bord en
    // lecture). On le DIT au lieu d'exiger ce que le document ne promet pas.
    if (avecChamps === 0) console.log("   ⚪ aucun écran de saisie : rien à remplir ici");
  });

  it("③ CE QUE LE DOCUMENT PROMET EN ÉCRITURE, L'APPLICATION LE FAIT", { timeout: 180_000 }, async () => {
    const { demoData } = await import(BASE + "demo.data.ts");
    const { journal, provider } = fournisseurEcrivain(demoData as never);
    for (const f of ecrans()) {
      const r = await monter(provider, f);
      remplirTout(r);
      try {
        act(() => {
          for (const b of pressablesDe(r)) (b.props as { onPress: () => void }).onPress();
        });
      } catch {
        // ① porte déjà le verdict sur les appuis qui cassent ; le redire ici
        // ferait croire à deux défauts pour un seul.
      }
      r.unmount();
    }
    const parOperation = new Map<string, number>();
    for (const e of journal) {
      const op = e.split(":")[0] ?? "?";
      parOperation.set(op, (parOperation.get(op) ?? 0) + 1);
    }
    console.log(
      `\n  ${String(MUTATIONS)} mutation(s) déclarée(s) · ${String(journal.length)} écriture(s) obtenue(s)`,
    );
    for (const [op, n] of [...parOperation].sort()) console.log(`   · ${op} × ${String(n)}`);
    // ── RAPPORTÉ, PAS ASSERTÉ, ET LA RAISON EST ÉCRITE.
    //
    // Mesuré sur la tontine : le document déclare `create` et `update` ;
    // appuyer sur tout produit deux `create` et zéro `update`. Un `update`
    // exige en général de choisir une ligne d'abord, et cette sonde ne
    // navigue pas. L'asserter rendrait un faux rouge sur une application
    // saine. Le chiffre est là pour qui veut creuser.
    if (MUTATIONS > 0 && parOperation.size < MUTATIONS) {
      console.log(
        `   ⚪ ${String(parOperation.size)} opération(s) atteinte(s) sur ${String(MUTATIONS)} déclarée(s)` +
          " — une opération peut exiger une navigation que cette sonde ne fait pas",
      );
    }
    if (MUTATIONS === 0) {
      console.log("   ⚪ le document ne déclare aucune mutation : aucune écriture exigée");
      return;
    }
    expect(
      journal.length,
      `le document déclare ${String(MUTATIONS)} mutation(s) et AUCUN appui n'écrit : ` +
        "la promesse est morte (classe APP-D002)",
    ).toBeGreaterThan(0);
  });

  it("④ CONTRÔLE NÉGATIF — une source en LECTURE SEULE n'écrit rien et ne casse pas", { timeout: 180_000 }, async () => {
    // ── POURQUOI CE CONTRÔLE EXISTE.
    //
    // ③ serait vert si l'application appelait `create` en aveugle. Ici le
    // fournisseur n'EXPOSE aucune méthode d'écriture : l'appel doit être
    // ABSENT, pas fatal. Une application qui plante faute d'écriture
    // disponible casserait chez tout client sans serveur.
    const { buildDemoProvider } = await import(BASE + "lib/runtime/demo-provider.ts");
    const { demoData } = await import(BASE + "demo.data.ts");
    const lecture = buildDemoProvider(demoData) as Record<string, unknown>;
    expect(
      typeof lecture.create,
      "le fournisseur de démonstration EXPOSE une écriture : ce contrôle ne contrôle plus rien",
    ).not.toBe("function");

    const casses: string[] = [];
    for (const f of ecrans()) {
      const r = await monter(lecture, f);
      remplirTout(r);
      try {
        act(() => {
          for (const b of pressablesDe(r)) (b.props as { onPress: () => void }).onPress();
        });
      } catch (e) {
        casses.push(`${f} — ${e instanceof Error ? e.message.slice(0, 140) : String(e)}`);
      }
      r.unmount();
    }
    for (const c of casses) console.log(`   🔴 ${c}`);
    expect(casses, casses.slice(0, 4).join(" · ")).toEqual([]);
  });
});
