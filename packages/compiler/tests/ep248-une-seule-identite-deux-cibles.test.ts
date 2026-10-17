/**
 * EP-248 · UN DOCUMENT, UNE IDENTITÉ — QUELLE QUE SOIT LA CIBLE.
 *
 * ── LE DÉFAUT, VU SUR L'ÉCRAN D'UN CLIENT LE 2026-10-16.
 *
 * Le document `slices/tontine` déclare `design.theme: "tontine_sobre"`, dont
 * le moteur dérive un accent BLEU (`#1E4DFA`). L'application native l'affichait
 * bien. La PWA du MÊME document, construite la même minute, affichait
 * `#FA5D1E` — l'orange de Deribfy.
 *
 * Autrement dit : l'application d'un client portait la marque de son
 * générateur. C'est le défaut que D-067 disait avoir fermé (« 12 documents,
 * 12 thèmes déclarés, UNE SEULE identité visuelle ») — il était resté ouvert
 * du côté web, où personne ne le mesurait.
 *
 * ── LA CAUSE ÉTAIT UN ORDRE, PAS UN OUBLI.
 *
 * `emitProject` posait bien le thème propre à l'app. Puis `compileWeb`
 * recouvrait `lib/` avec `EMBEDDED_ASSETS_WEB` — la table COMMUNE — et
 * reposait la copie par défaut des jetons par-dessus. Le calcul avait lieu,
 * et son résultat était écrasé.
 *
 * ── CE QUE CE FICHIER TIENT, ET POURQUOI DEUX CONTRÔLES ET PAS UN.
 *
 * ① L'ÉGALITÉ : les deux cibles portent le même thème, à l'octet.
 * ② L'IDENTITÉ : ce thème est bien celui du DOCUMENT, pas le défaut du
 *    moteur. Sans ce second contrôle, deux cibles qui porteraient TOUTES LES
 *    DEUX l'orange de Deribfy passeraient le premier — et le défaut
 *    d'origine serait déclaré fermé alors qu'il aurait seulement changé de
 *    forme.
 * ③ LA LISTE FERMÉE : tout fichier qui diffère entre les deux cibles est
 *    nommé ici. Le prochain écart — quel qu'il soit — rougira avant d'être
 *    livré, parce que le même piège d'ordre a déjà mordu DEUX fois sur ce
 *    mécanisme (`navigation-native.tsx`, puis les jetons).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";
import { theme as JETONS_PAR_DEFAUT } from "@deribfy/design-tokens";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");

const JETONS = "lib/tokens/theme.generated.ts";

const document = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(readFileSync(join(RACINE, "slices/tontine/tontine.air.json"), "utf8")),
  );

/** L'accent effectivement embarqué, lu dans le module de jetons émis. */
const accentDe = (fichiers: ReadonlyMap<string, string>): string | undefined =>
  /"primary":\s*"(#[0-9A-Fa-f]{6})"/u.exec(fichiers.get(JETONS) ?? "")?.[1];

/**
 * LES ÉCARTS LÉGITIMES — et ils le sont pour une raison, pas par habitude.
 *
 * Mesuré le 2026-10-16 : 75 fichiers communs aux deux cibles, 13 qui
 * diffèrent. Douze sont des COUTURES DE PLATEFORME. Le treizième était le
 * défaut.
 */
const ECARTS_LEGITIMES = new Set([
  // Le projet lui-même : Vite contre Metro, react-dom contre react-native.
  ".gitignore",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  // Les primitives : le web rend du HTML là où le natif rend des vues.
  "lib/primitives/feuille.ts",
  "lib/primitives/hotes.tsx",
  "lib/primitives/liste.tsx",
  "lib/primitives/primitives.tsx",
  "lib/runtime/plateforme.tsx",
  // ── LA RACINE DES POLICES (2026-10-17) — ÉDITION CONSCIENTE.
  //
  // Le natif ENREGISTRE les faces embarquées auprès du moteur (`useFonts`) et
  // attend qu'elles soient prêtes ; le web n'a rien à faire, ses `@font-face`
  // vivent dans la feuille émise. C'est une couture de plateforme au même
  // titre que `feuille.ts` : la même question, deux réponses dictées par la
  // plateforme.
  "lib/runtime/polices.tsx",
  // L'enveloppe : point d'entrée, racine et navigation.
  "App.tsx",
  "navigation.tsx",
  // Une PWA se dépose chez un hébergeur, une app native chez Apple et Google.
  "PUBLICATION.md",
]);

describe("EP-248 · l identité du document traverse les deux cibles", () => {
  it("① LES DEUX CIBLES PORTENT LE MÊME THÈME, à l octet", async () => {
    const { compileWeb, compileProject } = await import("../src/index.ts");
    const air = document();
    const natif = compileProject(air).files.get(JETONS);
    const web = compileWeb(air).files.get(JETONS);

    expect(natif, "la cible native n émet aucun module de jetons").toBeDefined();
    expect(web, "la cible web n émet aucun module de jetons").toBeDefined();
    expect(
      web,
      "les deux cibles portent des jetons DIFFÉRENTS : une application, deux identités",
    ).toBe(natif);
  });

  it("② ET CE THÈME EST CELUI DU DOCUMENT, pas le défaut du moteur", async () => {
    // LE CONTRÔLE QUI EMPÊCHE UNE FAUSSE FERMETURE. Deux cibles également
    // fausses satisferaient le contrôle ①.
    const { compileWeb, compileProject } = await import("../src/index.ts");
    const air = document();

    const defaut = JETONS_PAR_DEFAUT.color.light.primary;
    for (const [nom, fichiers] of [
      ["natif", compileProject(air).files],
      ["web", compileWeb(air).files],
    ] as const) {
      const accent = accentDe(fichiers);
      expect(accent, `${nom} : aucun accent lisible dans les jetons`).toBeDefined();
      expect(
        accent,
        `${nom} : l application porte l accent du GÉNÉRATEUR (${defaut}), pas le sien`,
      ).not.toBe(defaut);
    }
  });

  it("LE NOM DU THÈME DÉCIDE — deux documents, deux identités", async () => {
    // Sans ce contrôle, un moteur qui poserait une couleur fixe — différente
    // du défaut — passerait les deux précédents sans rien personnaliser.
    const { compileWeb } = await import("../src/index.ts");
    const a = document();
    const b = JSON.parse(JSON.stringify(a)) as ProjectAir & {
      design: { theme: string }
    };
    b.design.theme = "tontine_autre_identite";

    const accentA = accentDe(compileWeb(a).files);
    const accentB = accentDe(compileWeb(b).files);
    expect(accentA).toBeDefined();
    expect(
      accentB,
      "changer le nom du thème ne change RIEN : l identité n est pas dérivée du document",
    ).not.toBe(accentA);
  });

  it("③ AUCUN AUTRE ÉCART que les coutures de plateforme nommées", async () => {
    // ── LE CLIQUET GÉNÉRAL, ET POURQUOI IL EXISTE.
    //
    // Le piège qui a produit ce défaut est un piège d ORDRE : l overlay web
    // repose la table commune par-dessus ce que l émission a personnalisé. Il
    // a déjà mordu sur `navigation-native.tsx`, puis sur les jetons. Rien ne
    // dit qu un troisième fichier ne suivra pas.
    //
    // Ce contrôle ne protège donc pas LES JETONS : il protège TOUT fichier
    // que les deux cibles partagent. Un nouvel écart devra être justifié ici,
    // ou il rougira.
    const { compileWeb, compileProject } = await import("../src/index.ts");
    const air = document();
    const natif = compileProject(air).files;
    const web = compileWeb(air).files;

    const communs = [...natif.keys()].filter((f) => web.has(f));
    expect(communs.length, "les deux cibles ne partagent presque rien").toBeGreaterThan(50);

    const inattendus = communs
      .filter((f) => natif.get(f) !== web.get(f))
      .filter((f) => !ECARTS_LEGITIMES.has(f));
    expect(
      inattendus,
      `écart NON justifié entre les deux cibles : ${inattendus.join(", ")}`,
    ).toEqual([]);

    // ET LA LISTE NE SE GONFLE PAS SANS QU ON LE VOIE : chaque entrée doit
    // correspondre à un écart RÉEL. Une couture qui disparaît doit sortir de
    // la liste, sinon celle-ci devient un fourre-tout qui ne refuse plus rien.
    const mortes = [...ECARTS_LEGITIMES].filter(
      (f) => natif.has(f) && web.has(f) && natif.get(f) === web.get(f),
    );
    expect(
      mortes,
      `entrées devenues inutiles dans la liste des écarts : ${mortes.join(", ")}`,
    ).toEqual([]);
  });

  it("L ANNEAU DE FOCUS porte le MÊME accent que les jetons", async () => {
    // ── UN DÉFAUT QUE J AI ÉCRIT MOI-MÊME, LE MATIN DU 2026-10-16.
    //
    // La feuille émise (EP-247) déclarait `--db-focus` depuis les jetons PAR
    // DÉFAUT du générateur. Une fois l identité réparée, les montants
    // sortaient en `#1E4DFA` et l anneau de focus en `#FA5D1E` : deux accents
    // dans une même page, dont un qui n appartenait pas au client.
    //
    // Corriger l identité SANS ce contrôle aurait donc laissé la moitié du
    // défaut en place — et la moitié restante est précisément celle qu on ne
    // voit qu au clavier.
    const { compileWeb } = await import("../src/index.ts");
    const fichiers = compileWeb(document()).files;

    const accentJetons = accentDe(fichiers);
    const accentAnneau = /--db-focus:(#[0-9A-Fa-f]{6})/u.exec(
      fichiers.get("index.html") ?? "",
    )?.[1];

    expect(accentAnneau, "la feuille n déclare plus d anneau de focus").toBeDefined();
    expect(
      accentAnneau,
      "l anneau de focus porte un autre accent que les jetons de l application",
    ).toBe(accentJetons);

    // ET IL N EST PAS CELUI DU GÉNÉRATEUR.
    expect(
      accentAnneau,
      "l anneau de focus porte l accent du GÉNÉRATEUR dans l application d un client",
    ).not.toBe(JETONS_PAR_DEFAUT.color.light.primary);
  });

  it("LE MÉCANISME EST AU BON ENDROIT — après l overlay, jamais avant", () => {
    // Le défaut ne venait pas d une ligne manquante mais d une ligne qui
    // arrivait trop tôt. Si quelqu un remontait ce bloc au-dessus de
    // l overlay, les tests ci-dessus rougiraient — mais le motif, lui, se
    // perdrait. On le nomme donc ici.
    const source = readFileSync(join(RACINE, "packages/compiler/src/compile-web.ts"), "utf8");
    // ── CE CONTRÔLE CHERCHAIT UNE FORME DE CODE, ET IL A ROUGI POUR RIEN.
      //
      // Il cherchait le littéral `EMBEDDED_ASSETS_WEB)) files.set` — soit une
      // boucle écrite sur UNE ligne. Le 2026-10-17, cette boucle a gagné un
      // corps (les faces de police ne sont émises que si le thème les
      // emploie), et le contrôle est devenu rouge alors que RIEN n'avait
      // changé de l'ordre qu'il protège.
      //
      // Troisième fois du jour qu'un cliquet recopie une forme au lieu de
      // mesurer une propriété. La propriété est : « l'overlay web arrive AVANT
      // le thème propre à l'application ». On cherche donc l'overlay par ce
      // qui ne peut pas changer de forme — son nom.
      const posOverlay = source.indexOf("EMBEDDED_ASSETS_WEB");
    const posTheme = source.indexOf("emitThemeModule(air)");
    expect(posOverlay, "l overlay web a disparu").toBeGreaterThan(0);
    expect(posTheme, "le thème propre à l app n est plus posé côté web").toBeGreaterThan(0);
    expect(
      posTheme,
      "le thème est posé AVANT l overlay : il sera écrasé, en silence",
    ).toBeGreaterThan(posOverlay);
  });
});
