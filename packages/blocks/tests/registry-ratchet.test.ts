import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BLOCK_REGISTRY_VERSION, BLOCKS, blocks } from "../src";

// CLIQUETS DE REGISTRE (patron D-020) : liste v1 EXACTE, versions, ordre
// stable, indépendance E2E. Ajouter/retirer un bloc DOIT faire échouer un
// test ici — modification = acte conscient (décision consignée + version
// mineure), jamais un effet de bord (D-023 : pas d'élargissement au cas où).
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

// Liste v1 EXACTE — GELÉE (L2 + D-024, revue propriétaire du 2026-08-28).
// ÉDITION CONSCIENTE (1.8.0) : `spacer` entre au registre. PREMIER ajout de
// TYPE depuis le gel, et il est justifié par un fait mesuré sur appareil —
// sans notion de mise en page, tous les blocs s'empilent en haut et le bas de
// l'écran reste vide (1170 px sous le dernier bouton de l'accueil produit).
// Strictement additif : aucun bloc existant ne change, un document 1.7.0 est
// inchangé. Le bloc ne porte NI contenu, NI donnée, NI action.
// ÉDITION CONSCIENTE (mission composition, 2026-09-10) : `search_entry`
// entre au registre. Justifié par les RÉFÉRENCES fournies par le
// propriétaire (Amazon, marketplace d'annonces) : la recherche y est un
// élément STRUCTUREL de l'accueil — un contrôle à l'allure de champ qui
// NAVIGUE vers l'écran où la recherche s'exécute. Strictement additif.
const V1_BLOCK_IDS = [
  "button",
  "detail_header",
  "empty_state",
  "form",
  "header",
  "list",
  "search_entry",
  "spacer",
  // 1.14.0 (EP-198) — NEUVIEME bloc, ajoute en queue : l ordre du registre est
  // celui de la declaration, et les huit premiers ne bougent pas.
  "prose",
];

describe("cliquets du registre de blocs", () => {
  it("CLIQUET — la liste v1 est exacte, triée, sans doublon", () => {
    expect(BLOCKS.map((b) => b.id)).toEqual(V1_BLOCK_IDS);
  });

  // ÉDITION CONSCIENTE (2026-08-31, D-060) — DÉGEL DÉLIBÉRÉ, STRICTEMENT ADDITIF.
  //
  // Le registre était gelé en 1.0.0 par D-024. Fait qui a forcé la montée : la
  // dimension C d'A++ exige que TOUT bloc consommant des données expose
  // loading/empty/error. Or, des trois types que le corpus lie à une entité,
  // `form` ne connaissait NI `loading` NI `empty`, et `detail_header` n'avait
  // AUCUN état. La dimension n'était donc pas « non atteinte » : elle était
  // **INATTEIGNABLE** (APP-D003 / DET-028). Aucune quantité de travail sur le
  // moteur ne l'aurait rendue conforme.
  //
  // La montée n'enlève RIEN : aucun état supprimé, `state` reste optionnel
  // partout, défaut inchangé. Un appelant 1.0.0 se comporte à l'identique — ce
  // que le test ci-dessous vérifie explicitement, pour que « additif » soit une
  // propriété MESURÉE et non une intention déclarée.
  // ÉDITION CONSCIENTE (2026-09-02, E1/E2 D-129) : 1.2.0 → 1.3.0 — filtres
  // pilotés et portée relationnelle, ADDITIFS ; rien n'est retiré, le corps du
  // test le vérifie comme avant.
  it("DÉGEL ADDITIF (D-060, D-087, D-129) : registre 1.3.0, et rien n'a été retiré", () => {
    // D-087 : seconde montée additive — `list` gagne vignette et recherche,
    // `detail_header` gagne son visuel. Rien n'est retiré, tout est optionnel.
    // DET-032 : quatrième montée additive — `optionLabels` OPTIONNEL sur les
    // filtres à choix (libellés d'affichage AIR 1.10.0). Valeurs, filtrage et
    // testID inchangés ; un appelant 1.3.0 est inchangé.
    // DET-034 : cinquième montée additive — chips de filtre (`kind: "chip"`,
    // `selected` sur la primitive). Un appelant 1.4.0 est inchangé.
    // 1.6.0 : sixième montée additive — `required` sur les champs (le bouton
    // dérive s'il est actionnable) et `icon` sur le bouton. Un appelant 1.5.0
    // est inchangé.
    // 1.7.0 : septième montée additive — `accroche` sur l'en-tête (le titre
    // monte d'un cran typographique, pour la PREMIÈRE phrase qu'on lit).
    // 1.9.0 : `logoUri` sur l'en-tête — la MARQUE. Aucun document ne pouvait
    // en déclarer une : les apps générées n'avaient aucune identité visible.
    // 1.10.0 : deux signes de plus au vocabulaire fermé — `close-outline`
    // (passer l'étape) et `help-circle-outline` (aide). Additif.
    // 1.11.0 : `kind: "link"` — du TEXTE cliquable pour un chemin secondaire.
    // Mesuré à l'écran : « Mot de passe oublié » et « Continuer sans compte »
    // pesaient autant qu'une action principale.
    // 1.12.0 (EP-108) : titres et messages des ÉTATS déclarés au document —
    // `loadingTitle`, `emptyTitle`, `emptyMessage`, `errorTitle`,
    // `errorMessage`. DONNÉES, jamais texte moteur (F3) : sans déclaration,
    // l'état n'est pas rendu. Additif et optionnel.
    // 1.13.0 (EP-159) : `saisieRoles` / `saisieCibles` — les saisies qui
    // n'existent PAS en base (confirmation d'un secret, acceptation de
    // conditions). `fieldIds` ne référence que des champs d'entité : tout ce
    // qui s'affichait devait donc exister en colonne. Tableaux PARALLÈLES,
    // même patron que les filtres pilotés. Additif et optionnel.
    //
    // CES DEUX MONTÉES N'ÉTAIENT PAS CONSIGNÉES ICI, et le cliquet est resté
    // ROUGE depuis le 2026-09-13 — il attendait 1.11.0 quand le registre
    // portait 1.13.0. Un cliquet rouge en permanence ne garde plus rien : on
    // apprend à le lire comme du bruit, et la montée SUIVANTE passe sans être
    // vue. Recalé en NOMMANT ce que chaque version a ajouté, comme les onze
    // précédentes — c'est la trace qui fait la valeur de ce cliquet, pas le
    // nombre.
    // 1.14.0 (EP-198) : NEUVIEME BLOC — `prose`, texte suivi. Le registre en
    // comptait huit, et le plus long texte qu aucun pouvait porter etait un
    // sous-titre : les ecrans `terms` et `privacy_policy` annoncaient donc
    // « le texte complet est fourni par le proprietaire ». Le generateur ne
    // refusait pas d ecrire, il n avait AUCUN endroit ou le faire.
    // Premiere montee qui AJOUTE un bloc et non une prop — et rien n est
    // retire : les huit precedents sont intacts.
    expect(BLOCK_REGISTRY_VERSION).toBe("1.14.0");
    expect(BLOCKS.map((b) => b.id)).toEqual(V1_BLOCK_IDS);
  });

  it("CLIQUET — chaque bloc du registre a son composant, et réciproquement", () => {
    const toComponent = (id: string): string =>
      `${id.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")}Block`;
    expect(Object.keys(blocks).sort()).toEqual(V1_BLOCK_IDS.map(toComponent).sort());
  });

  it("CLIQUET — liaison d'entité toujours explicite, jamais ambiguë", () => {
    for (const b of BLOCKS) expect(["required", "forbidden"]).toContain(b.entity);
  });

  it("CLIQUET — indépendance E2E : aucune trace de maestro/detox dans les sources", () => {
    for (const file of readdirSync(SRC)) {
      const source = readFileSync(join(SRC, file), "utf8")
        .split("\n")
        .filter((l) => !l.trimStart().startsWith("//"))
        .join("\n")
        .toLowerCase();
      expect(source.includes("maestro"), `${file} référence maestro`).toBe(false);
      expect(source.includes("detox"), `${file} référence detox`).toBe(false);
    }
  });
});
