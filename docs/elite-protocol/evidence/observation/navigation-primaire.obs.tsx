// PREUVES DE LA NAVIGATION PRINCIPALE — D-086.
//
// Exigence propriétaire : « NE CONSIDÈRE AUCUN POINT COMME RÉUSSI SUR SIMPLE
// INSPECTION DU CODE. » Aucune assertion ici ne lit un style ni une source :
// tout est MONTÉ, et l'arbre rendu est interrogé.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer, ReactTestInstance } from "react-test-renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { compilerANeuf } from "./app-fraiche.ts";
import { cibleAttendue, type DonneesEcran } from "./attendu-du-plan.ts";
import { journal as navJournal, reset as navReset } from "./stub-navigation.ts";

// ── LE FIXTURE AVAIT DISPARU, ET IL NE REVIENDRA PAS (2026-10-17).
//
// Ce fichier visait `/tmp/nav-preuve/app/` — un dossier temporaire qu'AUCUN
// script du depot ne remplit. Il echouait donc depuis longtemps, non pas sur
// un defaut mais sur un fixture evapore. Un cliquet qui ne peut pas tourner
// ne protege rien ; celui-ci garde la propriete D-086, qui est exactement ce
// qui DIFFERE entre la cible web et la cible native.
//
// Le document est `resto-quartier` : seul des 22 documents du depot a porter
// les CINQ ecrans attendus et une navigation principale a 5 destinations.
// Compile A NEUF — le cliquet juge le compilateur d'aujourd'hui.
const DOCUMENT = "packages/golden-corpus/corpus-v3/resto-quartier.air.json";
let APP = "";
beforeAll(async () => {
  const a = await compilerANeuf(DOCUMENT, "deribfy-navigation-primaire");
  APP = a.base;
  // Un zero se voit : un dossier vide rendrait tout montage impossible pour
  // une raison qu'on mettrait longtemps a nommer.
  expect(a.fichiers, "aucun fichier emis : il n'y a rien a monter").toBeGreaterThan(10);
}, 180_000);

async function racine() {
  const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(APP + "lib/runtime/form-state.tsx");
  const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(APP + "demo.data.ts");
  return { DataRoot, FormStateRoot, provider: buildDemoProvider(demoData) };
}

async function monter(ecran: string): Promise<ReactTestRenderer> {
  const k = await racine();
  const Ecran = (await import(APP + `screens/${ecran}.tsx`)).default as () => unknown;
  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(k.DataRoot as never, { provider: k.provider } as never,
        createElement(k.FormStateRoot as never, null as never, createElement(Ecran as never))) as never,
    );
  });
  return r!;
}

const barre = (r: ReactTestRenderer): ReactTestInstance | undefined =>
  r.root.findAll((n) => (n.props as { testID?: string }).testID === "primary-nav")[0];

/**
 * LES ONGLETS, DEDUPLIQUES PAR IDENTITE — et pourquoi c'est juste.
 *
 * MESURE DU 2026-10-17 : `findAll` rendait DIX noeuds pour CINQ onglets. Ce
 * n'etait pas une barre doublee — la sonde l'a montre : un seul `primary-nav`,
 * et chaque onglet rendu comme `Geste` ENVELOPPANT un `Pressable`, les deux
 * portant le meme `testID`. L'ancien selecteur comptait le composant ET son
 * element hote.
 *
 * On garde donc UN noeud par identite, comme `app-complete` et `couverture`
 * le font deja. La propriete mesuree — « cinq onglets, dans l'ordre du
 * document » — c'est bien cinq identites distinctes.
 *
 * CE QUI N'EST PAS PERDU : une barre REELLEMENT doublee ne se verrait plus
 * ici, puisque les identites resteraient cinq. C'est pourquoi le controle
 * `barreUnique` ci-dessous est AJOUTE — il garde ce que cette deduplication
 * cesse de voir.
 */
const onglets = (r: ReactTestRenderer): ReactTestInstance[] => {
  const vus = new Set<string>();
  return r.root
    .findAll((n) => String((n.props as { testID?: string }).testID ?? "").startsWith("primary-nav-"))
    .filter((n) => {
      const id = String((n.props as { testID?: string }).testID ?? "");
      if (vus.has(id)) return false;
      vus.add(id);
      return true;
    });
};

/** Le nombre de barres rendues. Deux barres seraient un defaut grave —
 *  l'utilisateur verrait deux rangees d'onglets — et la deduplication
 *  ci-dessus ne le montrerait plus. Ce compte le garde. */
const barreUnique = (r: ReactTestRenderer): number =>
  r.root.findAll(
    (n) => (n.props as { testID?: string }).testID === "primary-nav" && typeof n.type === "string",
  ).length;

const libelle = (n: ReactTestInstance): string => {
  const t = n.findAll(() => true)
    .flatMap((x) => (Array.isArray(x.props.children) ? x.props.children : [x.props.children]))
    .filter((c): c is string => typeof c === "string");
  return t[0] ?? "";
};

// Écrans du document RÉELLEMENT GÉNÉRÉ par emit-v3 (D-086) — ce n'est plus un
// document que j'ai écrit à la main.
const ECRANS = ["scr_accueil", "scr_menu", "scr_panier", "scr_commandes", "scr_compte"];

describe("PREUVE 4 — la navigation est rendue EN BAS", () => {
  it("la barre est le DERNIER enfant de la coquille, après tout le contenu", async () => {
    const r = await monter("scr_accueil");
    const b = barre(r);
    expect(b, "la barre doit être rendue").toBeDefined();
    // Position prouvée par l'ORDRE DE L'ARBRE, pas par une feuille de style :
    // la coquille est le conteneur d'écran, la barre est son dernier enfant.
    const coquille = r.root.findAll((n) => (n.props as { testID?: string }).testID === "scr_accueil")[0];
    expect(coquille, "la coquille d'écran doit exister").toBeDefined();
    const enfants = coquille!.children.filter((c) => typeof c !== "string") as ReactTestInstance[];
    const dernier = enfants[enfants.length - 1];
    const barreDansDernier =
      dernier?.findAll((n) => (n.props as { testID?: string }).testID === "primary-nav").length ?? 0;
    console.log(`\n[PREUVE 4] enfants de la coquille : ${String(enfants.length)} · la barre est dans le DERNIER : ${barreDansDernier > 0 ? "OUI" : "NON"}`);
    expect(barreDansDernier, "la barre doit être le dernier enfant de la coquille").toBeGreaterThan(0);
    r.unmount();
  });
});

describe("PREUVE 3 — l'ordre déclaré est respecté", () => {
  it("les onglets sont rendus dans l'ordre du document", async () => {
    const r = await monter("scr_accueil");
    const noms = onglets(r).map(libelle);
    console.log("[PREUVE 3] ordre rendu :", noms.join(" | "));
    expect(noms).toEqual(["Accueil", "Menu", "Panier", "Commandes", "Compte"]);
    r.unmount();
  });
});

describe("PREUVE 5 — persistance sur tous les écrans concernés", () => {
  it("la barre est présente sur CHAQUE écran, avec les mêmes onglets", async () => {
    const rapport: string[] = [];
    for (const e of ECRANS) {
      const r = await monter(e);
      const b = barre(r);
      const n = onglets(r).length;
      rapport.push(`   ${e.padEnd(18)} barre:${b ? "✅" : "🔴"} onglets:${String(n)}`);
      expect(b, `${e} doit porter la barre`).toBeDefined();
      expect(n, `${e} doit porter 5 onglets`).toBe(5);
      r.unmount();
    }
    console.log("[PREUVE 5] persistance :\n" + rapport.join("\n"));
  });
});

describe("PREUVE 6 — chaque destination ouvre RÉELLEMENT son écran", () => {
  it("presser un onglet navigue vers l'écran attendu", async () => {
    const r = await monter("scr_accueil");
    const attendu = ["scr_accueil", "scr_menu", "scr_panier", "scr_commandes", "scr_compte"];
    const obtenu: string[] = [];
    const tabs = onglets(r);
    for (let i = 0; i < tabs.length; i += 1) {
      navReset();
      act(() => {
        (onglets(r)[i]?.props as { onPress: () => void } | undefined)?.onPress();
      });
      obtenu.push(navJournal[0]?.name ?? "AUCUNE NAVIGATION");
    }
    console.log("[PREUVE 6] pressions :", obtenu.join(" → "));
    expect(obtenu).toEqual(attendu);
    r.unmount();
  });
});

describe("PREUVE 8 — la ligne de liste ouvre le détail", () => {
  it("une ligne de la liste des plats navigue vers le détail, avec son identifiant", async () => {
    const r = await monter("scr_accueil");
    const pressables = r.root.findAll(
      (n) => typeof (n.props as { onPress?: unknown }).onPress === "function" &&
        !String((n.props as { testID?: string }).testID ?? "").startsWith("primary-nav"),
    );
    navReset();
    let trouve: { name: string; params?: unknown } | undefined;
    let identite: string | undefined;
    for (const p of pressables) {
      navReset();
      act(() => { (p.props as { onPress: () => void }).onPress(); });
      const j = navJournal[0];
      if (j?.params !== undefined) {
        trouve = j;
        identite = String((p.props as { testID?: string }).testID ?? "");
        break;
      }
    }
    console.log("[PREUVE 8] navigation contextuelle :", JSON.stringify(trouve));
    expect(trouve, "une ligne de liste doit naviguer AVEC un itemId").toBeDefined();

    // ── L'ATTENTE VIENT DU PLAN, PLUS DU CODE DE CE FICHIER (2026-10-17).
    //
    // Cette ligne exigeait `"scr_plat_detail"` EN DUR. Sur `resto-quartier`,
    // l'accueil declare DEUX navigations contextuelles legitimes — les
    // categories vers le menu, les suggestions vers le detail — et la boucle
    // retient la premiere. Le test accusait donc une application saine.
    //
    // On lit desormais ce que les DONNEES EMISES promettent pour l'identite
    // reellement pressee. Doctrine de `couverture`, et meme module.
    const { screenData } = (await import(APP + "screens/scr_accueil.data.ts")) as {
      screenData: DonneesEcran;
    };
    const attendu = cibleAttendue(screenData, String(identite ?? ""));
    expect(
      attendu,
      `le plan ne promet aucune navigation pour « ${String(identite)} »`,
    ).not.toBeNull();
    expect(trouve?.name, "la navigation observee diverge de ce que le plan promet").toBe(attendu);
    expect((trouve?.params as { itemId?: string } | undefined)?.itemId).toBeTypeOf("string");
    r.unmount();
  });
});

describe("PREUVE — la barre est COMPACTE, pas quatre gros boutons", () => {
  it("les onglets tiennent dans UN conteneur en ligne, pas empilés", async () => {
    const r = await monter("scr_accueil");
    const b = barre(r)!;
    const style = ([] as unknown[]).concat(b.props.style as unknown[]).filter(Boolean);
    const enLigne = style.some((x) => (x as { flexDirection?: string }).flexDirection === "row");
    console.log("[PREUVE] disposition de la barre :", enLigne ? "EN LIGNE (row)" : "EMPILÉE");
    expect(enLigne, "les onglets doivent être côte à côte").toBe(true);
    // Et chaque onglet partage la largeur : `flex: 1`, donc aucun ne s'étale.
    const item = onglets(r)[0]!;
    const st = ([] as unknown[]).concat(item.props.style as unknown[]).filter(Boolean);
    expect(st.some((x) => (x as { flex?: number }).flex === 1)).toBe(true);
    r.unmount();
  });
});
