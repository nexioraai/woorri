/**
 * EP-261 · LOT B — LA CARTE DE CHIFFRE, ET LA CAUSE RACINE QU'ELLE A RÉVÉLÉE.
 *
 * ── CE QUI A COMMANDÉ CE BLOC.
 *
 * Comparaison détail par détail avec Bolt, demandée par le propriétaire. Son
 * tableau de bord de tontine ouvre sur QUATRE cartes — solde, cotisations
 * collectées, membres actifs, prochaine échéance. Libellé discret, grand
 * nombre, légende qui le situe.
 *
 * Deribfy ne savait dessiner que SEPT formes : en-tête, bouton, liste,
 * formulaire, état vide, en-tête de détail, champ de recherche. Avec le plus
 * beau thème du monde, une liste de lignes de texte ne ressemblera jamais à
 * un tableau de bord. Le manque n'était pas le THÈME — c'était le
 * VOCABULAIRE.
 *
 * ── LA CAUSE RACINE, TROUVÉE EN CONSTRUISANT CE BLOC.
 *
 * `flatConfigSchema` n'admet qu'une primitive ou un TABLEAU DE PRIMITIVES.
 * Jamais un objet. Son en-tête le justifie, et c'est mesuré : « la platitude
 * est une contrainte de l'API de sorties structurées (≤ 24 paramètres
 * optionnels par schéma) ; un groupement s'exprime par des clés pointées ».
 *
 * CONSÉQUENCE QUE PERSONNE N'AVAIT VUE : le bloc `graphique` exige
 * `series: [{label, value, display}]` — un tableau d'OBJETS. C'est
 * INEXPRIMABLE dans un document AIR. Voilà pourquoi ZÉRO document sur 23 ne
 * l'emploie : non pas que le générateur l'ignore — il figure dans
 * l'allowlist FERMÉE qu'on lui transmet — mais qu'il ne PEUT PAS l'écrire.
 *
 * Ce cliquet tient donc deux choses : que la carte marche, et que sa forme
 * reste EXPRIMABLE.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";
import { compileProject } from "../src/compile-project.ts";
// ── ON IMPORTE LE REGISTRE, PAS LA FAMILLE DE COMPOSANTS.
//
// `@deribfy/blocks` ré-exporte `components.tsx`, qui tire `react-native` —
// écrit en Flow, que le transformateur de ces tests refuse de lire. Le
// registre, lui, ne dépend que de zod et des contrats : c'est exactement ce
// qu'on veut éprouver ici.
import { listBlockIds, getBlock } from "../../blocks/src/registry.ts";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const tontine = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(readFileSync(join(R, "slices", "tontine", "tontine.air.json"), "utf8")) as Record<
      string,
      unknown
    >,
  );

describe("EP-261 · la carte de chiffre", () => {
  it("① LE BLOC EST DANS L'ALLOWLIST TRANSMISE AU GÉNÉRATEUR", () => {
    // Sans cela, le générateur ne peut pas l'employer : le registre EST ce
    // qu'on lui donne, et il est FERMÉ (« blockType UNIQUEMENT parmi ces N »).
    expect(listBlockIds(), "le bloc n'est pas déclaré").toContain("statistiques");
    const def = getBlock("statistiques");
    expect(def?.entity, "une carte de chiffres ne porte pas d'entité").toBe("forbidden");
  });

  it("② SA FORME EST EXPRIMABLE DANS UN DOCUMENT — la leçon de `graphique`", () => {
    // ── LE CONTRÔLE QUI EMPÊCHE DE REFAIRE L'ERREUR.
    //
    // `flatConfigSchema` n'admet qu'une primitive ou un tableau de
    // primitives. Un bloc dont une prop attend un tableau d'OBJETS est
    // inemployable — c'est le cas de `graphique`, et c'est pourquoi aucun
    // document ne le porte. On vérifie que `statistiques` n'a pas ce défaut.
    const def = getBlock("statistiques");
    const forme = JSON.stringify(def?.propsSchema ?? {});
    // Les colonnes parallèles sont la forme prescrite par `flatConfigSchema`
    // (« un groupement s'exprime par des clés pointées »).
    const cles = Object.keys(
      (def?.propsSchema as { shape?: Record<string, unknown> } | undefined)?.shape ?? {},
    );
    expect(cles, "les colonnes parallèles ont disparu").toContain("items.label");
    expect(cles, "la colonne des valeurs a disparu").toContain("items.valeur");
    expect(
      cles.some((k) => k === "items"),
      "une prop `items` monolithique est réapparue : elle serait INEXPRIMABLE",
    ).toBe(false);
    expect(forme.length, "le schéma est vide").toBeGreaterThan(50);
  });

  it("③ UN DOCUMENT QUI L'EMPLOIE EST VALIDE ET COMPILE", () => {
    const air = tontine();
    const bloc = air.screens
      .flatMap((s) => s.blocks)
      .find((b) => b.blockType === "statistiques");
    expect(bloc, "le témoin a disparu de la tontine : ce cliquet ne mesure plus rien").not.toBeUndefined();
    const fichiers = compileProject(air).files;
    expect(fichiers.size, "la compilation est vide").toBeGreaterThan(20);
  });

  it("④ LES CHIFFRES ATTEIGNENT L'ÉCRAN — pas seulement le document", () => {
    // La leçon du LOT 3 : une forme écrite et débranchée ne montre rien.
    const air = tontine();
    const fichiers = compileProject(air).files;
    const tout = [...fichiers.values()].filter((v) => typeof v === "string").join("\n");
    expect(tout, "le bloc n'est pas câblé au runtime").toContain("AirStatistiques");
    expect(tout, "la valeur n'atteint pas l'application émise").toContain("265 000 FCFA");
    expect(tout, "le libellé n'atteint pas l'application émise").toContain("Cagnotte du tour");
  });

  it("⑤ LE MOTEUR NE FORMATE RIEN (F3) — la valeur arrive écrite", () => {
    // ── POURQUOI CE CONTRÔLE EXISTE.
    //
    // Le moteur ne saurait ni la devise, ni la précision, ni la langue. Si un
    // jour quelqu'un ajoutait un formatage ici, « 265 000 FCFA » deviendrait
    // « 265000 » ou « 265 000,00 » — et le franc CFA n'a pas de centimes.
    const def = getBlock("statistiques");
    const cles = Object.keys(
      (def?.propsSchema as { shape?: Record<string, unknown> } | undefined)?.shape ?? {},
    );
    // La valeur est une CHAÎNE, jamais un nombre : c'est ce qui interdit au
    // moteur de la reformater.
    expect(cles, "la colonne des valeurs a disparu").toContain("items.valeur");
    const src = readFileSync(
      join(R, "packages", "compiler", "runtime", "air-runtime.tsx"),
      "utf8",
    );
    const i = src.indexOf("export function AirStatistiques");
    const bloc = src.slice(i, src.indexOf("export function", i + 40));
    expect(bloc, "le bloc a disparu du runtime").toContain("items.valeur");
    for (const interdit of ["Intl.NumberFormat", "toFixed", "toLocaleString"]) {
      expect(bloc, `le moteur s'est mis à formater les nombres (${interdit})`).not.toContain(
        interdit,
      );
    }
  });

  it("⑦ LE SURTITRE SITUE, ET IL ATTEINT L'ÉCRAN", () => {
    // ── TROIS NIVEAUX DE HIÉRARCHIE, PAS DEUX.
    //
    // MESURE : chaque écran de Bolt ouvre sur une petite ligne grise en
    // capitales — PILOTAGE, JOURNAL FINANCIER, COMMUNAUTÉ — puis le grand
    // titre, puis une phrase. Deribfy n'en portait que DEUX, et le lecteur ne
    // savait pas OÙ il était avant d'avoir lu le titre entier.
    //
    // ET LA CHAÎNE ENTIÈRE EST TENUE : déclaré au bloc, rendu par le
    // composant, TRANSMIS par le runtime. Ce dernier maillon est celui qui
    // avait manqué à `accroche` et `logoUri` — déclarés, portés, et jamais
    // passés. Rien n'échouait : l'en-tête rendait sa forme d'avant.
    const air = tontine();
    const avecSurtitre = air.screens
      .flatMap((s) => s.blocks)
      .filter((b) => (b.props ?? []).some((p) => p.key === "surtitre"));
    expect(
      avecSurtitre.length,
      "aucun écran ne porte de surtitre : ce cliquet ne mesure plus rien",
    ).toBeGreaterThan(0);

    const tout = [...compileProject(air).files.values()]
      .filter((v) => typeof v === "string")
      .join("\n");
    expect(tout, "le surtitre n'atteint pas l'application émise").toContain("PILOTAGE");

    // LE MAILLON DU RUNTIME, nommément : sans lui le surtitre resterait au
    // document et personne ne le verrait.
    const rt = readFileSync(
      join(R, "packages", "compiler", "runtime", "air-runtime.tsx"),
      "utf8",
    );
    expect(rt, "le runtime ne transmet pas le surtitre").toContain("surtitre={str(props.surtitre)}");
  });

  it("⑥ QUATRE AU PLUS — éprouvé, pas lu dans le texte du schéma", () => {
    // ── CE CONTRÔLE A ÉTÉ CORRIGÉ APRÈS AVOIR ÉTÉ FAUX.
    //
    // Il cherchait « 4 » dans `JSON.stringify(propsSchema)`. Zod ne sérialise
    // pas ses bornes sous cette forme : le contrôle était rouge pour une
    // mauvaise raison. On ÉPROUVE la borne au lieu de la lire.
    const schema = getBlock("statistiques")?.propsSchema as
      | { safeParse: (v: unknown) => { success: boolean } }
      | undefined;
    expect(schema, "le schéma a disparu").not.toBeUndefined();
    const colonnes = (n: number) => ({
      "items.label": Array.from({ length: n }, (_, i) => `L${String(i)}`),
      "items.valeur": Array.from({ length: n }, (_, i) => `V${String(i)}`),
    });
    expect(schema?.safeParse(colonnes(4)).success, "quatre cartes sont refusées").toBe(true);
    expect(
      schema?.safeParse(colonnes(5)).success,
      "cinq cartes passent : la grille d'un téléphone casse",
    ).toBe(false);
    expect(
      schema?.safeParse(colonnes(0)).success,
      "zéro carte passe : un bloc vide s'afficherait",
    ).toBe(false);
  });
});
