/**
 * EP-263 · LE CATALOGUE DE THÈMES — ET LE THÈME QUI ÉTAIT UN HACHAGE.
 *
 * ── CE QUE LA MESURE A DIT, ET C'EST LE POINT DE DÉPART DU LOT.
 *
 * Le propriétaire : « les concurrents font des thèmes absolument géniaux,
 * contrairement à ce que Deribfy fait ». Mesuré de bout en bout sur les DEUX
 * cibles, le 2026-10-17 :
 *
 *   · 22 documents, 21 noms de thème DISTINCTS ;
 *   · entre `kaviva-spa` et `coach-fitness`, le module de thème émis différait
 *     sur 4 lignes sur 71 — soit DEUX jetons sur douze (`primary` et son
 *     encre dérivée `primaryText`) ;
 *   · `bg`, `surface`, `text`, `muted`, `border`, `badgeBg`, `space`,
 *     `radius`, `font` : IDENTIQUES pour les 22 ;
 *   · `tokensVersion` : vide dans 22 documents sur 22 ;
 *   · `design.overrides` : rempli dans UN document sur 22.
 *
 * Et la teinte qui bougeait était un HACHAGE DU NOM : `spa_elegant` recevait
 * du magenta #FA1ED8, `fitness_energy` du cyan #1EEEFA, et `scene_nuit` — une
 * salle de concert — de l'orange sur fond BLANC.
 *
 * Le mécanisme n'était pas cassé, il était ARBITRAIRE. C'est pire : il avait
 * l'apparence d'un thème, et c'est ce qui a permis de le laisser douze
 * générations sans le voir.
 *
 * ── LE DIAGNOSTIC, ET IL NE PORTE PAS SUR LA PALETTE.
 *
 * Le manque n'était pas une couleur, c'était un VOCABULAIRE — exactement
 * comme pour les blocs, où sept formes ne pouvaient pas dessiner un tableau de
 * bord quel que soit le thème. Un catalogue FERMÉ répond : le moteur n'invente
 * pas une palette (F3) et ne la déduit pas d'un nom (EP-201), il la LIT.
 *
 * ── CE QUI EST PROUVÉ ICI, ET CE QUI EST PROUVÉ AILLEURS.
 *
 * Ce fichier lit la SOURCE. Que deux thèmes fassent deux mondes À L'ÉCRAN est
 * prouvé par montage d'applications compilées à neuf, dans
 * `observation/theme-identite.obs.tsx` — et quatre mutations y répondent,
 * dont une qui a corrigé une assertion verte à tort.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast, DESIGN_TOKENS_VERSION, WCAG_AA } from "@deribfy/design-tokens";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";
import { CATALOGUE, THEMES_CATALOGUE, estThemeDuCatalogue } from "../src/themes-catalogue.ts";
import { applyThemeOverrides } from "../src/emit-theme.ts";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lire = (...p: string[]): string => readFileSync(join(R, ...p), "utf8");

/** Tous les documents AIR du dépôt — tranches et corpus. */
const documents = (): { nom: string; air: ProjectAir }[] => {
  const out: { nom: string; air: ProjectAir }[] = [];
  const pousser = (chemin: string, nom: string): void => {
    out.push({
      nom,
      air: migrateAirDocument(JSON.parse(readFileSync(chemin, "utf8")) as Record<string, unknown>),
    });
  };
  const tranches = join(R, "slices");
  if (existsSync(tranches)) {
    for (const d of readdirSync(tranches, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      for (const f of readdirSync(join(tranches, d.name))) {
        if (f.endsWith(".air.json")) pousser(join(tranches, d.name, f), f.replace(".air.json", ""));
      }
    }
  }
  const corpus = join(R, "packages", "golden-corpus", "corpus-v3");
  if (existsSync(corpus)) {
    for (const f of readdirSync(corpus)) {
      if (f.endsWith(".air.json")) pousser(join(corpus, f), f.replace(".air.json", ""));
    }
  }
  return out;
};

/**
 * PLAFOND DES DOCUMENTS HORS CATALOGUE — mesuré à ZÉRO le 2026-10-17.
 *
 * Un nom hors catalogue garde l'ancien comportement (rotation de teinte). Ce
 * n'est pas une faveur mais la compatibilité : un document non migré compile
 * exactement comme avant. Les 22 ont été migrés le jour même, donc le plafond
 * est À la mesure — et un plafond à la mesure est le seul qui morde.
 *
 * Il ne peut que DESCENDRE : un document qui sort du catalogue fait rougir.
 */
const PLAFOND_HORS_CATALOGUE = 0;

describe("EP-263 · le catalogue de thèmes", () => {
  it("① LE CATALOGUE EST FERMÉ ET NON VIDE — le patron du registre de blocs", () => {
    expect(THEMES_CATALOGUE.length, "catalogue vide : rien à choisir").toBeGreaterThanOrEqual(8);
    expect(
      estThemeDuCatalogue("gestion_sobre"),
      "un nom du catalogue n'est pas reconnu",
    ).toBe(true);
    expect(
      estThemeDuCatalogue("spa_elegant"),
      "un nom RETIRÉ du catalogue est reconnu : la fermeture ne tient plus",
    ).toBe(false);
    // Chaque thème porte le monde ENTIER, pas une teinte : c'est la différence
    // avec le hachage qu'il remplace.
    for (const [nom, t] of Object.entries(CATALOGUE)) {
      for (const schema of ["light", "dark"] as const) {
        for (const cle of ["bg", "surface", "text", "muted", "primary", "border", "badgeBg"] as const) {
          expect(t[schema][cle], `${nom}.${schema}.${cle} manque`).toMatch(/^#[0-9A-F]{6}$/iu);
        }
      }
      for (const cle of ["sm", "md", "lg"] as const) {
        expect(t.radius[cle], `${nom}.radius.${cle} manque`).toBeGreaterThan(0);
      }
      expect(["systeme", "serif", "mono"], `${nom}.famille hors vocabulaire`).toContain(t.famille);
      // ── LE « POURQUOI » EST EXIGÉ, ET CE N'EST PAS DE LA DÉCORATION.
      //
      // Sans lui, le prochain qui lit ce catalogue ne peut pas savoir à quel
      // document attribuer quel monde — et il en inventera un de plus. C'est
      // la discipline qui a manqué aux 21 noms libres d'avant.
      expect(t.pourquoi.length, `${nom} n'explique pas ce qu'il sert`).toBeGreaterThan(20);
    }
  });

  it("② AUCUNE PALETTE N'EST ILLISIBLE — et c'est éprouvé, pas lu", () => {
    // ── POURQUOI CE CONTRÔLE EXISTE EN DOUBLE.
    //
    // Le module lève DÉJÀ au chargement si une palette tombe sous le seuil :
    // c'est le garde-fou qui compte, parce qu'il casse la compilation de toute
    // application. Celui-ci est le TÉMOIN — il nomme la propriété pour qu'on
    // ne retire pas le garde-fou en croyant retirer du zèle.
    //
    // Mesuré en écrivant le catalogue : `soin_doux.dark` a échoué à 1,19:1 sur
    // sa bordure. J'ai éclairci la bordure, PAS baissé le seuil.
    for (const [nom, t] of Object.entries(CATALOGUE)) {
      for (const schema of ["light", "dark"] as const) {
        const p = t[schema];
        expect(contrast(p.text, p.bg), `${nom}.${schema} texte/fond`).toBeGreaterThanOrEqual(WCAG_AA);
        expect(contrast(p.text, p.surface), `${nom}.${schema} texte/surface`).toBeGreaterThanOrEqual(
          WCAG_AA,
        );
        expect(contrast(p.muted, p.bg), `${nom}.${schema} secondaire/fond`).toBeGreaterThanOrEqual(
          WCAG_AA,
        );
        // La bordure n'est pas du texte : 4,5:1 la rendrait noire. On exige
        // qu'elle EXISTE à l'oeil.
        expect(contrast(p.border, p.surface), `${nom}.${schema} bordure invisible`).toBeGreaterThan(
          1.2,
        );
      }
    }
  });

  it("③ LES DOCUMENTS CHOISISSENT DANS LE CATALOGUE — plafond qui ne monte pas", () => {
    const docs = documents();
    expect(docs.length, "aucun document lu : ce contrôle ne mesure plus rien").toBeGreaterThan(15);
    const hors = docs.filter((d) => !estThemeDuCatalogue(d.air.design.theme));
    if (hors.length > 0) {
      console.log(
        "  hors catalogue : " + hors.map((d) => `${d.nom}=${d.air.design.theme}`).join(", "),
      );
    }
    expect(
      hors.length,
      `${String(hors.length)} document(s) hors catalogue : leur thème retombe sur la ` +
        "rotation de teinte, qui ne change que l'accent",
    ).toBeLessThanOrEqual(PLAFOND_HORS_CATALOGUE);
    // ── ET LE CATALOGUE EST RÉELLEMENT EMPLOYÉ, PAS JUSTE DISPONIBLE.
    //
    // Un catalogue dont tous les documents prendraient le même thème ne
    // prouverait rien : c'est l'état d'avant sous un autre nom.
    const employes = new Set(docs.map((d) => d.air.design.theme));
    expect(
      employes.size,
      "les documents se partagent moins de quatre mondes : l'identité ne varie guère",
    ).toBeGreaterThanOrEqual(4);
  });

  it("④ LE THÈME PEINT LA PALETTE ENTIÈRE — mesuré, pas supposé", () => {
    // ── LE CONTRÔLE QUI REMPLACE LA MESURE « 4 LIGNES SUR 71 ».
    //
    // On dérive deux thèmes opposés et on COMPTE les jetons qui diffèrent.
    // Avant le catalogue : DEUX (`primary`, `primaryText`). Exiger six, c'est
    // exiger qu'un monde visuel soit un monde, pas une teinte.
    const faire = (nom: string): ProjectAir =>
      ({
        design: { theme: nom },
        screens: [],
      }) as unknown as ProjectAir;
    const a = applyThemeOverrides(faire("soin_doux")).theme;
    const b = applyThemeOverrides(faire("effort_vif")).theme;
    const cles = Object.keys(a.color.light ?? {});
    const differents = cles.filter(
      (k) =>
        (a.color.light as Record<string, string>)[k] !==
        (b.color.light as Record<string, string>)[k],
    );
    console.log(`  jetons de palette différents : ${String(differents.length)} / ${String(cles.length)} — ${differents.join(" ")}`);
    expect(
      differents.length,
      "deux mondes opposés partagent presque toute leur palette : " +
        "c'est l'état d'avant (2 jetons sur 12)",
    ).toBeGreaterThanOrEqual(6);
    // LES RAYONS AUSSI : un spa n'a pas les coins d'une application d'effort.
    expect(
      [a.radius.sm, a.radius.md, a.radius.lg].join("/"),
      "les deux thèmes arrondissent identiquement",
    ).not.toBe([b.radius.sm, b.radius.md, b.radius.lg].join("/"));
    // ET LA FAMILLE DE CARACTÈRES, le jeton qui n'existait pas.
    expect(a.font.famille, "`soin_doux` devrait porter un serif").toBe("serif");
    expect(
      b.font.famille,
      "`effort_vif` devrait rester en police système — sinon la montée n'est pas additive",
    ).toBe("systeme");
  });

  it("⑤ LE DOCUMENT RESTE MAÎTRE — une surcharge explicite bat le catalogue", () => {
    // ── L'ORDRE DES ÉTAGES EST LA RÈGLE, ET IL EST FRAGILE.
    //
    // Le catalogue pose le monde, PUIS `design.overrides` s'applique. Inverser
    // ferait du catalogue une prison : un document ne pourrait plus ajuster
    // une couleur, et la seule issue serait de sortir du catalogue — donc de
    // perdre le monde entier pour changer un jeton.
    const air = {
      design: {
        theme: "soin_doux",
        overrides: [{ key: "color.light.primary", value: "#123456" }],
      },
      screens: [],
    } as unknown as ProjectAir;
    const { theme, problems } = applyThemeOverrides(air);
    expect(problems, "la surcharge est refusée").toEqual([]);
    expect(
      (theme.color.light as Record<string, string>).primary,
      "le catalogue écrase la surcharge du document",
    ).toBe("#123456");
    // ET L'ENCRE SUIT : la dérivation est rejouée après, donc le contraste
    // tient pour n'importe quel accent (garde-fou 3 d'`emit-theme`).
    const encre = (theme.color.light as Record<string, string>).primaryText ?? "";
    const fond = (theme.color.light as Record<string, string>).bg ?? "";
    expect(contrast(encre, fond), "l'encre dérivée ne suit plus l'accent surchargé").toBeGreaterThanOrEqual(
      WCAG_AA,
    );
  });

  it("⑥ LA FAMILLE EST UN RÔLE, ET L'ASYMÉTRIE DES DEUX CIBLES EST TENUE", () => {
    // ── POURQUOI UN RÔLE ET PAS UN NOM, ET C'EST MESURÉ.
    //
    // Aucun nom de police n'existe sur iOS ET Android à la fois : iOS porte
    // Georgia, Palatino, Menlo ; Android porte Noto Serif, Roboto et les alias
    // génériques. Un nom absent NE LÈVE PAS — il retombe en silence sur la
    // police système, et l'identité disparaît sans qu'aucun signal ne le dise.
    const tok = lire("packages", "design-tokens", "tokens.json");
    expect(tok, "le jeton de famille a disparu").toContain('"famille"');
    for (const nom of ["Georgia", "Menlo", "Roboto", "Noto"]) {
      expect(
        tok,
        `le nom de police « ${nom} » est écrit dans le jeton : il sera absent ` +
          "d'une des deux plateformes, en silence",
      ).not.toContain(nom);
    }

    // ── L'ÉTAT RÉEL DES DEUX CIBLES, ET IL EST ASYMÉTRIQUE.
    //
    // J'ai d'abord servi le rôle au natif avec
    // `Platform.OS === "ios" ? "Georgia" : "serif"`. Le cliquet 4 de
    // `keyboard-a11y-locks` a rougi : il interdit tout `Platform.OS` dans le
    // code ÉMIS, et j'ai VÉRIFIÉ qu'aucun n'existait avant moi — la propriété
    // était intacte. Ce qu'elle protège est réel : un branchement d'exécution
    // ferait rendre les deux plateformes différemment, et toute observation de
    // ce dépôt monte avec un stub `ios`.
    //
    // J'ai aussi écarté `Platform.select`, qui ne contient pas le littéral
    // cherché mais fait la même chose : ç'aurait été maquiller le cliquet.
    const natif = lire("packages", "primitives", "src", "feuille.ts");
    const web = lire("packages", "primitives-web", "src", "feuille.ts");
    const sansCommentaires = (x: string): string =>
      x.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "");

    expect(natif, "la couture native a perdu sa fonction").toContain("familleDe");
    expect(web, "la couture web a perdu sa fonction").toContain("familleDe");

    // LE NATIF NE BRANCHE PAS, et ne nomme AUCUNE police. Si quelqu'un y pose
    // un nom sans embarquer de fichier de police, il rougit ici — et c'est
    // exactement l'intention : une identité livrée sur la moitié des appareils
    // n'est pas une identité qu'on peut promettre.
    const codeNatif = sansCommentaires(natif);
    expect(
      codeNatif,
      "la couture native branche par plateforme : le cliquet `Platform.OS` " +
        "du code émis tombera, et les deux plateformes rendront différemment",
    ).not.toContain("Platform");
    // ── ON MESURE LE CORPS, PAS LE FICHIER, ET C'EST UNE CORRECTION.
    //
    // Première forme : « le code natif ne contient pas le mot `serif` ». Elle
    // rougissait, et pour une mauvaise raison — `serif` est un nom de RÔLE,
    // il figure dans la signature `(role: "systeme" | "serif" | "mono")`. Une
    // assertion qui confond le vocabulaire des rôles avec un nom de police ne
    // mesure pas ce qu'elle croit.
    //
    // On exige donc que le CORPS ne rende aucune chaîne : un nom de police ne
    // peut entrer que par un `return "…"`.
    const corpsNatif = codeNatif.slice(codeNatif.indexOf("familleDe"));
    expect(
      corpsNatif,
      "la couture native rend un nom de police : il sera absent d'une des deux " +
        "plateformes et y retombera EN SILENCE sur la police système. Servir le " +
        "natif demande un fichier de police embarqué (décision propriétaire).",
    ).not.toMatch(/return\s+["'`]/u);
    expect(corpsNatif, "la couture native ne rend plus rien d'explicite").toContain(
      "return undefined",
    );

    // LE WEB SERT LE RÔLE POUR DE VRAI — une pile CSS se dégrade, et elle
    // finit par un générique pour que le CARACTÈRE survive à l'absence de
    // toute police nommée.
    const codeWeb = sansCommentaires(web);
    expect(codeWeb, "la couture web ne nomme plus aucune police").toContain("Georgia");
    for (const generique of ["serif", "monospace"]) {
      expect(
        codeWeb,
        `la pile web ne finit pas par le générique « ${generique} »`,
      ).toContain(generique);
    }

    // ── ET LA FEUILLE L'APPLIQUE AUX CINQ RÔLES DE TEXTE.
    //
    // Un seul rôle habillé serait pire que rien : le titre dans une police, le
    // corps dans une autre. La feuille est COMMUNE aux deux cibles — c'est
    // elle qui garantit qu'un jeton ajouté se voit des deux côtés le même jour.
    const styles = lire("packages", "primitives", "src", "styles.ts");
    for (const role of ["textLabel", "textBody", "textTitle", "textHeading", "textDisplay"]) {
      const i = styles.indexOf(`${role}: {`);
      expect(i, `le rôle de texte ${role} a disparu`).toBeGreaterThan(-1);
      expect(
        styles.slice(i, styles.indexOf("}", i)),
        `${role} n'applique pas la famille de caractères`,
      ).toContain("fontFamily");
    }
  });

  it("⑦ LA VERSION DES TOKENS A MONTÉ — ajout compatible", () => {
    const [majeur, mineur] = DESIGN_TOKENS_VERSION.split(".").map(Number);
    expect(majeur, "la majeure a bougé : un jeton optionnel n'est pas une rupture").toBe(1);
    expect(mineur, "la mineure n'a pas monté avec le jeton de famille").toBeGreaterThanOrEqual(6);
  });
});
