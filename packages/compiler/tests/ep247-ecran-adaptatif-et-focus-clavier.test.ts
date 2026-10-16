/**
 * EP-247 · L'APPLICATION S'ADAPTE A L'ECRAN, ET LE CLAVIER SE VOIT.
 *
 * ── LES TROIS CHIFFRES QUI ONT COMMANDE CE FICHIER.
 *
 * Mesures du 2026-10-16 sur une application REELLEMENT emise
 * (`apps-generees/kaviva-spa`, hors `node_modules`), recomptees par le
 * proprietaire :
 *
 *     @media ........... 1   (et c'etait le fond de page clair/sombre)
 *     :focus-visible ... 0
 *     onFocus .......... 0
 *
 * Autrement dit : l'application ne s'adaptait a AUCUNE largeur, et une
 * personne qui navigue au clavier ne voyait jamais ou elle se trouvait.
 *
 * ── CE QUE CE CLIQUET MESURE, ET SUR QUOI.
 *
 * Sur le PRODUIT COMPILE, jamais sur la source des primitives. Un embryon
 * correct dans `primitives-web/` qui n'arrive pas dans le zip ne sert a
 * personne — c'est exactement la forme de defaut que ce depot a payee
 * plusieurs fois (une regle vraie, et personne pour l'invoquer).
 *
 * ── CE QU'IL NE PRETEND PAS.
 *
 * Il ne prouve pas qu'un navigateur RE-DISPOSE la grille a 399 px : cela
 * demanderait un vrai moteur de rendu. Il prouve que l'echelle EXISTE, qu'elle
 * est DECROISSANTE vers les petites largeurs, et qu'elle est BRANCHEE au seul
 * consommateur possible. La verification a l'oeil, sur appareil, reste a faire
 * — et le dire vaut mieux que de l'habiller.
 *
 * Il ne prouve pas non plus que l'anneau natif se voit sur iOS : une vue
 * ordinaire n'y recoit pas le focus clavier. Ce qui est tenu, c'est que
 * l'etat existe, qu'il vient des jetons, et que `TextInput` — le seul element
 * natif focalise sur toutes les plateformes — le porte.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";
import { theme } from "@deribfy/design-tokens";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");

const document = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(
      readFileSync(join(RACINE, "packages/golden-corpus/corpus-v3/bus-intercites.air.json"), "utf8"),
    ),
  );

/** Les largeurs declarees par la feuille emise, dans l'ordre croissant. */
const rupturesDe = (css: string): number[] =>
  [...css.matchAll(/min-width:\s*(\d+)px/gu)].map((m) => Number(m[1])).sort((a, b) => a - b);

describe("EP-247 · l ecran adaptatif et le focus clavier, mesures sur le produit", () => {
  it("LA CIBLE WEB porte au moins TROIS points de rupture", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const html = compileWeb(document()).files.get("index.html") ?? "";

    const ruptures = [...new Set(rupturesDe(html))];
    expect(
      ruptures.length,
      `l application ne s adapte qu a ${String(ruptures.length)} largeur(s) : ${ruptures.join(", ")}`,
    ).toBeGreaterThanOrEqual(3);

    // ET ELLES SONT MOBILE-D ABORD : des `min-width`, donc une base qui vaut
    // pour le plus petit ecran et des ajouts vers le haut. L inverse
    // (`max-width`) ferait du telephone un cas particulier, et c est le cas le
    // plus courant.
    expect(html, "une regle `max-width` : la base n est plus le telephone").not.toMatch(
      /@media[^{]*max-width/u,
    );
  });

  it("L ECHELLE DE GRILLE EST DECROISSANTE vers les petites largeurs", async () => {
    // LE CONTROLE QUI COMPTE VRAIMENT. Une echelle qui existe mais qui donne
    // AUTANT de colonnes partout n adapte rien du tout.
    const { compileWeb } = await import("../src/index.ts");
    const html = compileWeb(document()).files.get("index.html") ?? "";

    // La valeur de base de `--db-g2` — celle qui vaut hors de toute requete.
    const base = /:root\{[^}]*--db-g2:repeat\((\d+),/u.exec(html);
    expect(base, "aucune valeur de base pour une grille de deux colonnes").not.toBeNull();
    expect(
      Number(base?.[1]),
      "une grille de deux colonnes reste a deux colonnes sur un telephone etroit",
    ).toBe(1);

    // Et elle REMONTE a deux des que la largeur le permet.
    expect(html, "la grille ne retrouve jamais ses deux colonnes").toMatch(
      /@media \(min-width:400px\)\{:root\{[^}]*--db-g2:repeat\(2,/u,
    );
  });

  it("L ECHELLE EST BRANCHEE — la liste la lit, et rien d autre ne peut la lire", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const fichiers = compileWeb(document()).files;

    const liste = fichiers.get("lib/primitives/liste.tsx") ?? "";
    expect(liste, "la liste web ignore l echelle : les requetes ne pilotent rien").toMatch(
      /var\(--db-g/u,
    );

    // ET LE REPLI EXISTE : au-dela de quatre colonnes aucune variable n est
    // declaree, et la grille doit alors se comporter EXACTEMENT comme avant.
    expect(liste, "aucun repli : une grille de cinq colonnes disparaitrait").toMatch(
      /var\(--db-g" \+\s*\n?\s*String\(colonnes\) \+\s*\n?\s*", repeat\(/u,
    );

    // Le document garde le dernier mot : c est lui qui dit le nombre.
    const blocs = fichiers.get("lib/blocks/components.tsx") ?? "";
    expect(blocs, "le nombre de colonnes ne vient plus du document").toMatch(/colonnes=\{/u);
  });

  it("LE FOCUS CLAVIER SE VOIT sur le web, et l anneau a deux tons", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const html = compileWeb(document()).files.get("index.html") ?? "";

    expect(html, "aucune regle de focus : on ne sait pas ou on est au clavier").toMatch(
      /:focus-visible/u,
    );
    // `:focus-visible` et non `:focus` : un clic de souris ne doit pas allumer
    // l anneau, sinon tout le monde le voit tout le temps et il ne signale
    // plus rien.
    expect(html, "`:focus` sans `-visible` : l anneau s allume aussi a la souris").not.toMatch(
      /[^-]:focus\b(?!-visible)/u,
    );

    // LE SECOND TON. Un anneau de la couleur d accent pose sur un bouton
    // d accent est invisible ; le `box-shadow` intercalaire peint les 2 px de
    // decalage avec le fond de la page et garantit la separation.
    expect(html, "anneau a un seul ton : invisible sur un bouton de la meme couleur").toMatch(
      /box-shadow:0 0 0 2px var\(--db-focus-fond\)/u,
    );
    expect(html, "le decalage manque : l anneau colle a l element").toMatch(/outline-offset:2px/u);

    // LES DEUX SCHEMAS. Le fond intercalaire change avec le theme, sinon il
    // peint du clair sous une application sombre.
    expect(html, "le fond de l anneau ne suit pas le schema sombre").toMatch(
      /@media \(prefers-color-scheme:dark\)\{:root\{--db-focus-fond:/u,
    );

    // ET LES ELEMENTS VISES SONT CEUX QU UN CLAVIER ATTEINT.
    for (const balise of ["button", "input", "textarea", "select"]) {
      expect(html, `« ${balise} » n est pas couvert par la regle de focus`).toContain(balise);
    }
  });

  it("LA COULEUR VIENT DES JETONS — aucune valeur de design en dur", async () => {
    // CONTROLE D ARCHITECTURE (D-021). Si quelqu un ecrivait `#FA5D1E` dans
    // l emetteur, l anneau cesserait de suivre le theme au premier changement
    // de palette — et personne ne le verrait avant de regarder l ecran.
    const source = readFileSync(join(RACINE, "packages/compiler/src/emit-web.ts"), "utf8");
    const blocFocus = /const reactifEtFocus[\s\S]*?\n\};/u.exec(source)?.[0] ?? "";
    expect(blocFocus, "le bloc reactif n a pas ete trouve dans la source").not.toBe("");
    expect(
      blocFocus,
      "une couleur en dur dans l emetteur : elle ne suivra plus les jetons",
    ).not.toMatch(/#[0-9A-Fa-f]{6}/u);

    // Et la valeur emise est BIEN celle du jeton.
    const { compileWeb } = await import("../src/index.ts");
    const html = compileWeb(document()).files.get("index.html") ?? "";
    expect(html).toContain("--db-focus:" + theme.color.light.primary);
  });

  it("LA CIBLE NATIVE porte l etat focalise, et il vient des jetons", async () => {
    const { compileProject } = await import("../src/index.ts");
    const fichiers = compileProject(document()).files;

    const hotes = fichiers.get("lib/primitives/hotes.tsx") ?? "";
    expect(hotes, "le geste natif n a aucun etat de focus").toMatch(/onFocus/u);
    expect(hotes, "l etat focalise n est pas tenu").toMatch(/setFocalise/u);

    // LE PIEGE PRESERVE : `style` de `Pressable` peut etre une FONCTION. Le
    // remplacer par un tableau casserait l etat presse EN SILENCE.
    expect(
      hotes,
      "la forme fonction de `style` n est plus preservee : l etat presse est perdu",
    ).toMatch(/typeof style === "function"/u);

    // ET LES RAPPELS DE L APPELANT SURVIVENT.
    expect(hotes, "les rappels de l appelant sont ecrases").toMatch(/onFocus\?\.\(e\)/u);

    // LE CHAMP DE SAISIE — le seul element natif focalise sur TOUTES les
    // plateformes, iOS compris.
    const prim = fichiers.get("lib/primitives/primitives.tsx") ?? "";
    expect(prim, "le champ de saisie n a pas d etat de focus").toMatch(/onFocus=\{/u);
    expect(prim, "l anneau n est pas applique au champ").toMatch(/focalise && s\.focusAnneau/u);

    // L ANNEAU VIENT DE LA FEUILLE PARTAGEE, ET DES JETONS.
    const styles = fichiers.get("lib/primitives/styles.ts") ?? "";
    expect(styles, "aucun anneau dans la feuille").toMatch(/focusAnneau/u);
    expect(styles, "la couleur de l anneau ne vient pas des jetons").toMatch(
      /outlineColor: c\.primary/u,
    );
    // PAS une bordure : une bordure occupe de la place et decalerait la mise
    // en page au moment du focus.
    expect(styles, "l anneau est une bordure : la mise en page sautera au focus").toMatch(
      /focusAnneau: \{[^}]*outlineWidth/u,
    );
  });

  it("SEPARATION — les requetes de largeur restent du cote WEB", async () => {
    // Une feuille CSS n a aucun sens dans un projet Expo : si une regle
    // `@media` apparaissait dans le zip natif, ce serait du web ayant fui.
    //
    // ── POURQUOI ON RETIRE LES COMMENTAIRES AVANT DE MESURER.
    //
    // Ma premiere version a rougi sur `lib/primitives/hotes.tsx` — parce que
    // le commentaire qui EXPLIQUE ou l anneau mord cite `:focus-visible` en
    // clair. Mesurer la prose au lieu du code aurait laisse deux issues :
    // affaiblir la documentation pour satisfaire une expression reguliere, ou
    // desarmer le controle. Ni l une ni l autre. On mesure donc ce que
    // l assertion VEUT dire : du code.
    //
    // LIMITE DITE : ce retrait est textuel, pas un analyseur syntaxique. Une
    // sequence `//` dans une chaine de caracteres tronquerait la ligne. C est
    // sans consequence ici — on ne cherche qu a ne pas voir les
    // commentaires — et il faut le savoir avant de reutiliser ce filtre.
    const sansCommentaires = (c: string): string =>
      c.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "");

    const { compileProject } = await import("../src/index.ts");
    const natif = compileProject(document()).files;
    let examines = 0;
    for (const [nom, contenu] of natif) {
      const code = sansCommentaires(contenu);
      examines += 1;
      expect(code, `« ${nom} » — une requete @media a fui dans le zip natif`).not.toMatch(
        /@media/u,
      );
      expect(code, `« ${nom} » — « :focus-visible » a fui dans le zip natif`).not.toMatch(
        /:focus-visible/u,
      );
    }
    // Sans ce compte, un zip VIDE passerait le controle sans rien prouver.
    expect(examines, "aucun fichier examine").toBeGreaterThan(10);
  });

  it("L ACCESSIBILITE EXISTANTE NE REGRESSE PAS", async () => {
    // Le proprietaire l a pose comme condition : « les accessibilityLabel
    // restent ». On le mesure sur le produit, pas sur la source.
    const { compileProject, compileWeb } = await import("../src/index.ts");
    const air = document();
    const compter = (fichiers: ReadonlyMap<string, string>): number =>
      [...fichiers.values()].reduce(
        (n, c) => n + (c.match(/accessibilityLabel/gu) ?? []).length,
        0,
      );

    // PLANCHER MESURE le 2026-10-16, apres l ajout du focus : 65 natif,
    // 69 web (le web en porte quatre de plus : ses hotes posent `aria-label`
    // depuis `accessibilityLabel`). Le seuil est pose SOUS la mesure pour ne
    // pas rougir au premier ajout legitime, et il est MONOTONE CROISSANT —
    // on ne le baisse jamais.
    //
    // Ma premiere version ecrivait 100, de memoire. C etait faux, et c est le
    // test qui me l a appris : un seuil se MESURE.
    expect(
      compter(compileProject(air).files),
      "l accessibilite native a regresse",
    ).toBeGreaterThanOrEqual(60);
    expect(
      compter(compileWeb(air).files),
      "l accessibilite web a regresse",
    ).toBeGreaterThanOrEqual(64);
  });

  it("MUTATION — retirer un palier fait bien rougir le controle", async () => {
    // Un cliquet qui ne mord pas est pire que pas de cliquet : il rassure.
    // On mute la feuille emise et on verifie que l assertion tombe.
    const { compileWeb } = await import("../src/index.ts");
    const html = compileWeb(document()).files.get("index.html") ?? "";

    const sain = [...new Set(rupturesDe(html))];
    expect(sain.length).toBeGreaterThanOrEqual(3);

    const mute = html.replace(/@media \(min-width:600px\)\{[^}]*\}\}/u, "");
    const apres = [...new Set(rupturesDe(mute))];
    expect(
      apres.length,
      "la mutation n a rien enleve : le controle ne mesure donc pas ce qu il dit",
    ).toBe(sain.length - 1);
    expect(apres.length, "la mutation passerait encore le seuil de trois").toBeLessThan(3);
  });
});
