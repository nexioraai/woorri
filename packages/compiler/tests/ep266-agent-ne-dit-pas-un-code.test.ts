/**
 * EP-266 · L'AGENT D'UNE APPLICATION NE DIT PAS UN CODE MACHINE.
 *
 * ── LE DÉFAUT, ET IL ATTEIGNAIT L'UTILISATEUR FINAL.
 *
 * Mesuré le 2026-10-17 : `AirAgent` passait le CODE du serveur comme message
 * d'erreur — `message: echec`. Une personne qui demande quelque chose à son
 * application lisait donc, à l'écran, « AIR_AGENT_SANS_CERVEAU » ou
 * « AIR_AGENT_REPONSE_ILLISIBLE ».
 *
 * SUR LES DEUX CIBLES : `air-runtime.tsx` est le même fichier des deux côtés.
 *
 * ── CE N'ÉTAIT PAS UN OUBLI DE CÂBLAGE, MAIS UN TROU DE VOCABULAIRE.
 *
 * Le bloc `agent` n'avait AUCUNE prop pour déclarer une phrase de refus, alors
 * que `list`, `form` et `detail_header` en ont depuis le registre 1.1.0
 * (D-060) — dont l'en-tête dit exactement pourquoi : « DONNÉES du document,
 * jamais texte moteur (F3) : sans titre déclaré, l'état n'est pas rendu ».
 *
 * Trois blocs l'avaient eu, le quatrième avait été oublié. Même famille que
 * les sept formes qui ne pouvaient pas dessiner un tableau de bord : le manque
 * n'était pas le câblage, c'était le mot.
 *
 * ── CE QUI EST PROUVÉ AILLEURS.
 *
 * Ce fichier lit la source. Que le code n'atteigne plus l'écran est prouvé par
 * MONTAGE, sur les deux cibles : `observation/agent-parle.obs.tsx` (natif) et
 * `observation/agent-web.obsweb.tsx` (web). Cinq mutations les tuent — dont
 * une qui casse la primitive `StateView` du WEB seulement, ce qui justifie la
 * preuve séparée : cette primitive a deux implémentations, et déduire du natif
 * aurait été l'erreur exacte payée le matin même sur l'avatar à initiales.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getBlock, listBlockIds } from "../../blocks/src/registry.ts";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lire = (...p: string[]): string => readFileSync(join(R, ...p), "utf8");
const sansCommentaires = (x: string): string =>
  x.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "");

describe("EP-266 · l'agent dit une phrase, jamais un code", () => {
  it("① LE BLOC PEUT DÉCLARER SA PHRASE — le patron de D-060, appliqué au quatrième", () => {
    expect(listBlockIds(), "le bloc agent a disparu").toContain("agent");
    const schema = getBlock("agent")?.propsSchema as
      | { safeParse: (v: unknown) => { success: boolean } }
      | undefined;
    expect(schema, "le schéma du bloc agent a disparu").not.toBeUndefined();

    // ── ON MESURE L'EFFET DE LA PROP, PAS UN JEU DE PROPS COMPLET.
    //
    // Ma première forme passait `{ label, errorMessage }` et rougissait :
    // `placeholder` est OBLIGATOIRE sur ce bloc. L'assertion était incomplète,
    // pas le schéma — et un contrôle qui rougit pour sa propre faute de frappe
    // apprend à être ignoré.
    //
    // On compare donc AVANT et APRÈS : ajouter la phrase ne doit rien casser,
    // et un non-texte doit être refusé. Robuste à toute prop obligatoire,
    // présente ou future.
    const eprouver = (
      id: string,
      base: Record<string, unknown>,
    ): { sans: boolean; avec: boolean; mauvais: boolean } => {
      const sch = getBlock(id)?.propsSchema as
        | { safeParse: (v: unknown) => { success: boolean } }
        | undefined;
      return {
        sans: sch?.safeParse(base).success ?? false,
        avec: sch?.safeParse({ ...base, errorMessage: "Je n ai pas pu." }).success ?? false,
        mauvais: sch?.safeParse({ ...base, errorMessage: 42 }).success ?? true,
      };
    };

    const agent = eprouver("agent", { label: "Demander", placeholder: "Ecrivez" });
    expect(agent.sans, "le jeu de props de référence est déjà refusé : l'épreuve ne mesure rien").toBe(
      true,
    );
    expect(
      agent.avec,
      "le bloc ne peut pas déclarer de phrase de refus : l'agent n'aura que le " +
        "code du serveur à montrer",
    ).toBe(true);
    // ── ET LA FORME RESTE EXPRIMABLE DANS UN DOCUMENT.
    //
    // La leçon de `graphique`, inemployable depuis sa création parce que sa
    // prop attendait un tableau d'objets que `flatConfigSchema` refuse. Une
    // chaîne en est une forme plate ; on l'éprouve au lieu de le supposer.
    expect(agent.mauvais, "un non-texte est accepté : la prop n'est plus une phrase").toBe(false);

    // LES TROIS AUTRES L'ONT TOUJOURS : si l'un les perdait, ce serait une
    // régression de la même propriété, dans l'autre sens.
    for (const [id, base] of [
      ["list", { titleFieldId: "fld_x" }],
      ["form", { fieldIds: ["fld_x"], submitLabel: "Envoyer" }],
      ["detail_header", { titleFieldId: "fld_x" }],
    ] as const) {
      const r = eprouver(id, base);
      expect(r.sans, `${id} : le jeu de props de référence est refusé, l'épreuve ne mesure rien`).toBe(
        true,
      );
      expect(r.avec, `le bloc ${id} a perdu sa phrase de refus (D-060)`).toBe(true);
    }
  });

  it("② LE RUNTIME NE PASSE PLUS LE CODE À L'AFFICHAGE", () => {
    // ── POURQUOI ON MESURE LE VOISINAGE ET PAS LE FICHIER.
    //
    // `echec` doit TOUJOURS exister dans ce fichier : c'est l'état d'erreur, et
    // il part dans le `testID` pour rester diagnosticable. Ce qui est interdit,
    // c'est qu'il devienne le `message` — donc on lit la zone de l'état.
    const rt = sansCommentaires(lire("packages", "compiler", "runtime", "air-runtime.tsx"));
    const i = rt.indexOf('kind: "error", title: label');
    const j = rt.indexOf("kind: \"error\"");
    const debut = i > -1 ? i : j;
    expect(debut, "l'état d'erreur de l'agent a disparu du runtime").toBeGreaterThan(-1);
    const zone = rt.slice(debut, debut + 400);
    expect(
      zone,
      "le code du serveur redevient le message affiché : une personne lirait " +
        "« AIR_AGENT_SANS_CERVEAU » dans son application",
    ).not.toMatch(/message:\s*echec/u);
    expect(
      zone,
      "la phrase du document n'est plus transmise : l'échec serait muet",
    ).toContain("props.errorMessage");

    // ── LE CODE RESTE DIAGNOSTICABLE, ET C'EST UNE CONDITION.
    //
    // Un code qu'on cache entièrement est un code qu'on ne peut plus suivre.
    expect(
      rt,
      "le code d'échec ne voyage plus dans l'identité du bloc : un échec ne " +
        "serait plus diagnosticable",
    ).toContain("-echec-");
  });

  it("③ LES DEUX CIBLES RENDENT LE MESSAGE — `StateView` n'est pas partagée", () => {
    // La primitive qui affiche ce message a DEUX implémentations. L'avatar à
    // initiales l'a prouvé le matin même : posé côté natif seulement, il a
    // cassé 32/32 applications web. On exige donc les deux.
    for (const paquet of ["primitives", "primitives-web"]) {
      const src = lire("packages", paquet, "src", "primitives.tsx");
      const i = src.indexOf("export function StateView");
      expect(i, `${paquet} : StateView a disparu`).toBeGreaterThan(-1);
      const corps = src.slice(i, src.indexOf("export function", i + 40));
      // ── CETTE ASSERTION A ÉTÉ RENFORCÉE APRÈS AVOIR SURVÉCU À SA MUTATION.
      //
      // Première forme : « le corps contient le mot `message` ». Mesuré en
      // renommant `message` → `messageAbsent` dans la primitive web : le
      // contrôle restait VERT, parce que le nouveau nom contient l'ancien.
      // Ma mutation était mauvaise ET l'assertion était faible — les deux.
      //
      // On exige le RENDU : la valeur passée comme ENFANT d'un nœud de texte.
      // C'est la forme qu'un renommage ne peut pas imiter, et c'est la même
      // leçon que `>{a.libelle}<` sur le sélecteur d'appareil.
      expect(
        corps,
        `${paquet} : StateView ne rend plus son message comme texte — la ` +
          "phrase déclarée n'atteindrait pas l'écran de cette cible",
      ).toMatch(/>\{message\}</u);
    }
  });

  it("④ LE BLOC AGENT N'A AUCUN DOCUMENT APPELANT — consigné, pas corrigé", () => {
    // ── CE CONTRÔLE DIT UN FAIT, ET IL EST INCONFORTABLE.
    //
    // ZÉRO document du dépôt ne déclare un bloc `agent`. Il est dans
    // l'allowlist transmise au générateur, sa forme est exprimable, et personne
    // ne l'emploie — exactement l'état de `graphique` avant sa réparation, et
    // c'est ainsi qu'on l'avait laissé mourir sans le voir.
    //
    // Poser un agent dans un document réel est une décision de PRODUIT, pas un
    // effet de bord d'un lot de correction. Ce contrôle existe pour que le fait
    // soit LU : si un document en déclare un demain, il rougira, et la ligne
    // ci-dessous devra être réécrite — consciemment.
    //
    // La correction, elle, est prouvée sur un fixture explicite :
    // `fixtures/agent-essai.air.json`, un document du corpus auquel on ajoute
    // un bloc agent, et qui passe `assertValidAir` et l'émission.
    const dossiers = [
      join(R, "packages", "golden-corpus", "corpus-v3"),
      ...readdirSync(join(R, "slices"), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => join(R, "slices", d.name)),
    ];
    const avecAgent: string[] = [];
    for (const dossier of dossiers) {
      if (!existsSync(dossier)) continue;
      for (const f of readdirSync(dossier)) {
        if (!f.endsWith(".air.json")) continue;
        const doc = JSON.parse(readFileSync(join(dossier, f), "utf8")) as {
          screens?: { blocks?: { blockType?: string }[] }[];
        };
        const porte = (doc.screens ?? []).some((s) =>
          (s.blocks ?? []).some((b) => b.blockType === "agent"),
        );
        if (porte) avecAgent.push(f);
      }
    }
    if (avecAgent.length > 0) {
      console.log(`  documents portant un agent : ${avecAgent.join(", ")}`);
    }
    expect(
      avecAgent,
      "un document déclare désormais un bloc agent. Ce n'est pas une erreur — " +
        "c'est une bonne nouvelle. Mais le contrôle ci-dessus était écrit sur " +
        "l'hypothèse inverse : relisez-le, et déplacez la preuve du fixture de " +
        "synthèse vers ce document RÉEL.",
    ).toEqual([]);

    // ET LE FIXTURE DE SYNTHÈSE EXISTE, lui : sans lui, les montages ne
    // mesurent rien.
    const fixture = join(R, "docs", "elite-protocol", "evidence", "fixtures", "agent-essai.air.json");
    expect(existsSync(fixture), "le fixture de l'agent a disparu").toBe(true);
    const brut = readFileSync(fixture, "utf8");
    expect(brut, "le fixture ne déclare plus de bloc agent").toContain('"blockType": "agent"');
    expect(brut, "le fixture ne déclare plus de phrase de refus").toContain("errorMessage");
  });
});
