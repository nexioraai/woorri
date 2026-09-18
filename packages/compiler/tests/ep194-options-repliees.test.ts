// EP-194 ① — LES OPTIONS DE FILTRE NE MANGENT PLUS L'ÉCRAN.
//
// DÉFAUT VU SUR L'APPAREIL, jamais par un test : deux champs de filtre, l'un à
// six valeurs, l'autre à deux. Les huit puces ont pris la moitié de la hauteur
// utile — DEUX lignes de contenu là où il en tenait six.
//
// Aucun identifiant de run ne paraît ici (EP-100) : le défaut est celui de
// TOUT domaine à nombreuses catégories — douze plats posent le problème de
// sept catégories de logement.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SEUIL_OPTIONS_ETALEES,
  optionsAffichees,
  optionsDebordent,
} from "../runtime/list-pipeline.ts";

// DEUX TAILLES, de part et d'autre du seuil.
const PEU = ["a", "b", "c"];
const BEAUCOUP = ["a", "b", "c", "d", "e", "f", "g"];

describe("EP-194 ① · le seuil de repli des options de filtre", () => {
  it("UNE SEULE OPTION RESTE VISIBLE — elle ne filtre rien, elle informe", () => {
    // SEUIL FIXÉ PAR YOUSSOUF, pas par moi : au-delà d'UNE option, repli.
    // J'avais posé QUATRE en le raisonnant seul — un arbitrage produit tranché
    // en silence. Sa règle est plus franche : un filtre à une valeur unique ne
    // filtre rien, puisque tout le contenu la porte ; dès qu'il y a un CHOIX,
    // sa place est derrière un déclencheur, pas devant le contenu.
    const UNE = ["a"];
    expect(optionsAffichees(UNE, "", false)).toEqual(UNE);
    expect(optionsDebordent(UNE), "un déclencheur inutile").toBe(false);
  });

  it("DEUX OPTIONS SE REPLIENT DÉJÀ — mon seuil de quatre en laissait passer douze", () => {
    // LE DÉFAUT QUE CE CAS GARDE : avec un seuil à 4 et les 3 champs que le
    // contrat autorise, DOUZE puces restaient permises devant le contenu.
    expect(optionsAffichees(["a", "b"], "", false)).toEqual([]);
    expect(optionsDebordent(["a", "b"])).toBe(true);
    expect(optionsAffichees(PEU, "", false)).toEqual([]);
    expect(optionsDebordent(PEU)).toBe(true);
  });

  it("SEPT OPTIONS SE REPLIENT — elles ne tiennent pas, le contenu passe avant", () => {
    expect(optionsAffichees(BEAUCOUP, "", false)).toEqual([]);
    expect(optionsDebordent(BEAUCOUP)).toBe(true);
  });

  it("UNE OPTION RETENUE RESTE VISIBLE REPLIÉE — sinon la liste courte est inexplicable", () => {
    // LE DÉFAUT QUE CE CAS GARDE : replier SANS montrer la sélection laisse
    // l'utilisateur devant une liste réduite sans rien qui dise pourquoi.
    expect(optionsAffichees(BEAUCOUP, "d", false)).toEqual(["d"]);
  });

  it("DÉPLIÉ, TOUT REVIENT — replié n'est pas perdu", () => {
    expect(optionsAffichees(BEAUCOUP, "", true)).toEqual(BEAUCOUP);
    expect(optionsAffichees(BEAUCOUP, "d", true)).toEqual(BEAUCOUP);
  });

  it("LA BASCULE EST EXACTE AU SEUIL — ni avant, ni après", () => {
    const juste = BEAUCOUP.slice(0, SEUIL_OPTIONS_ETALEES);
    const unDePlus = BEAUCOUP.slice(0, SEUIL_OPTIONS_ETALEES + 1);
    expect(optionsAffichees(juste, "", false), "le seuil se déclenche trop tôt").toEqual(juste);
    expect(optionsDebordent(juste)).toBe(false);
    expect(optionsAffichees(unDePlus, "", false), "le seuil ne se déclenche pas").toEqual([]);
    expect(optionsDebordent(unDePlus)).toBe(true);
  });

  it("LA RÈGLE NE NOMME AUCUN DOMAINE NI AUCUN IDENTIFIANT DE RUN (EP-100)", () => {
    // Cliquet anti-secteur : la règle vaut partout ou elle ne vaut rien.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "runtime", "list-pipeline.ts"),
      "utf8",
    );
    const zone = src.slice(src.indexOf("EP-194 ①"), src.indexOf("optionsDebordent("));
    expect(zone.length, "la règle est introuvable").toBeGreaterThan(0);
    expect(zone, "un identifiant de run s'est glissé dans la règle").not.toMatch(
      /\b(fld_|scr_|ent_|cpt_|act_)/,
    );
  });

  it("LE SEUIL EST ÉTIQUETÉ DÉCISION PRODUIT — aucune convention ne le fonde", () => {
    // Le dépôt exige qu'une règle sans source citée se déclare comme telle
    // (motif de `presentation.ts`). Cherché : la doc Compose des chips ne dit
    // rien du nombre, et m3.material.io reste illisible.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "runtime", "list-pipeline.ts"),
      "utf8",
    );
    const zone = src.slice(src.indexOf("EP-194 ①"), src.indexOf("export const SEUIL_OPTIONS_ETALEES"));
    expect(zone).toMatch(/DÉCISION PRODUIT/);
  });
});
