/**
 * EP-250 · CE QUE LES MAGASINS EXIGENT, MESURÉ SUR CE QUI EST ÉMIS.
 *
 * ── LA DEMANDE DU PROPRIÉTAIRE, LE 2026-10-16.
 *
 * « Il faut que Deribfy sache exactement quoi faire quand c'est une appli web
 * et une appli React Native publiée sur l'App Store et Google Play. Il faut
 * lire et comprendre les référentiels universels, et les suivre. »
 *
 * Une règle écrite dans un module ne prouve rien : ce fichier la mesure sur
 * l'application COMPILÉE. C'est la différence entre « Deribfy sait » et
 * « Deribfy a écrit qu'il savait ».
 *
 * ── LES TROIS DÉFAUTS QUE CE CLIQUET FERME, TOUS MESURÉS.
 *
 * ① Le manifeste ne déclarait QUE du SVG. Les critères d'installabilité de
 *    Chrome demandent 192 et 512, et donnent le PNG comme format éprouvé :
 *    la PWA ne s'installait pas sur Android. Sur iPhone si — Safari est plus
 *    permissif — ce qui explique qu'on ne l'ait pas vu.
 *
 * ② `theme_color` valait `#992999`, un violet dérivé d'un hachage du slug,
 *    pendant que l'application affichait `#1E4DFA`. Deux identités pour un
 *    seul document.
 *
 * ③ `ThemeRoot` n'était MONTÉ NULLE PART. Les deux palettes étaient émises
 *    dans chaque application et le schéma restait `"light"` en dur. Google
 *    Play en fait une exigence explicite : ce n'était pas un agrément
 *    manquant, c'était un motif de refus.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";
import { AUTORITES, REGLES, reglesOuvertes } from "../src/conformite-magasins.ts";
import { pngUni } from "../src/png-uni.ts";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");

const document = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(readFileSync(join(RACINE, "slices/tontine/tontine.air.json"), "utf8")),
  );

interface Manifeste {
  name?: string;
  short_name?: string;
  start_url?: string;
  display?: string;
  theme_color?: string;
  lang?: string;
  icons?: { src: string; sizes: string; type: string; purpose?: string }[];
}

/**
 * Le manifeste vit sous `public/` — c'est ce qui le fait copier TEL QUEL à la
 * racine de la construction. Lire l'ancien chemin rendrait `{}`, et tous les
 * contrôles passeraient sur un objet vide sans rien prouver.
 */
const manifesteDe = (fichiers: ReadonlyMap<string, string>): Manifeste =>
  JSON.parse(fichiers.get("public/manifest.webmanifest") ?? "{}") as Manifeste;

describe("EP-250 · la conformité aux magasins, mesurée sur le produit", () => {
  it("① LA PWA EST INSTALLABLE — 192 ET 512, en PNG, réellement émis", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const fichiers = compileWeb(document()).files;
    const icones = manifesteDe(fichiers).icons ?? [];

    for (const taille of ["192x192", "512x512"]) {
      const declaree = icones.find((i) => i.sizes === taille && i.type === "image/png");
      expect(
        declaree,
        `aucune icône PNG ${taille} déclarée : Chrome ne proposera pas l installation`,
      ).toBeDefined();
      // ET LE FICHIER EXISTE. Déclarer sans produire ferait échouer
      // l'installation — défaut que la note de l'icône raconte avoir payé.
      // Le manifeste cite `./icone-192.png` ; le fichier vit sous `public/`,
      // d où Vite le copie à la racine de la construction. C est la MÊME
      // adresse une fois servi.
      const chemin = "public/" + (declaree?.src ?? "").replace(/^\.\//u, "");
      expect(fichiers.has(chemin), `« ${chemin} » est déclaré mais n est pas émis`).toBe(true);
    }
  });

  it("LES PNG SONT DE VRAIES IMAGES, et de la bonne taille", () => {
    // ── POURQUOI ON RELIT LES OCTETS.
    //
    // Un `.png` dont le contenu est du texte n'est pas une image : ce dépôt
    // l'a déjà payé deux fois (« piège base64 fermé deux fois déjà »). On
    // vérifie donc la signature PNG et les dimensions écrites dans l en-tête,
    // pas la présence d un fichier portant la bonne extension.
    for (const cote of [192, 512]) {
      const o = pngUni(cote, "#1E4DFA");
      expect([...o.subarray(0, 8)], "signature PNG absente").toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      // IHDR commence à l octet 16 : largeur puis hauteur, en gros-boutien.
      const lire = (i: number): number =>
        ((o[i] ?? 0) << 24) | ((o[i + 1] ?? 0) << 16) | ((o[i + 2] ?? 0) << 8) | (o[i + 3] ?? 0);
      expect(lire(16), "largeur erronée dans l en-tête").toBe(cote);
      expect(lire(20), "hauteur erronée dans l en-tête").toBe(cote);
    }
  });

  it("② UNE SEULE IDENTITÉ — le manifeste porte l accent du document", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const fichiers = compileWeb(document()).files;
    const m = manifesteDe(fichiers);

    const accentJetons = /"primary":\s*"(#[0-9A-Fa-f]{6})"/u.exec(
      fichiers.get("lib/tokens/theme.generated.ts") ?? "",
    )?.[1];
    expect(accentJetons, "aucun accent lisible dans les jetons émis").toBeDefined();
    expect(
      m.theme_color,
      "le manifeste porte une autre couleur que l application : deux identités",
    ).toBe(accentJetons);

    // ET LA PAGE DIT LA MÊME CHOSE que le manifeste.
    expect(fichiers.get("index.html") ?? "").toContain(
      `<meta name="theme-color" content="${String(accentJetons)}" />`,
    );
  });

  it("③ LES DEUX THÈMES SONT SERVIS — et c est le système qui choisit", async () => {
    // Exigence Google Play, mot pour mot : « The app's content, and all web
    // content accessed by the app, must support both light and dark themes. »
    const { compileWeb, compileProject } = await import("../src/index.ts");
    const air = document();

    for (const [nom, fichiers] of [
      ["web", compileWeb(air).files],
      ["natif", compileProject(air).files],
    ] as const) {
      const jetons = fichiers.get("lib/tokens/theme.generated.ts") ?? "";
      expect(jetons, `${nom} : aucune palette claire`).toMatch(/"light":/u);
      expect(jetons, `${nom} : aucune palette sombre`).toMatch(/"dark":/u);

      // ── LE CONTRÔLE QUI COMPTE, ET QUI MANQUAIT.
      //
      // Les deux palettes étaient DÉJÀ émises avant correction. Ce qui
      // manquait, c était quelqu un pour choisir : `ThemeRoot` n était monté
      // nulle part, et le schéma valait « light » en dur.
      const shell = fichiers.get("lib/runtime/app-shell.tsx") ?? "";
      expect(shell, `${nom} : le pont de thème n est pas monté`).toMatch(/<ThemeRoot/u);
      expect(shell, `${nom} : le schéma ne vient pas du système`).toMatch(/useSchemaSysteme/u);

      const plateforme = fichiers.get("lib/runtime/plateforme.tsx") ?? "";
      expect(plateforme, `${nom} : la couture ne sait pas lire le système`).toMatch(
        /export function useSchemaSysteme/u,
      );
    }

    // ET CHAQUE CIBLE INTERROGE SA PROPRE SOURCE.
    expect(compileProject(air).files.get("lib/runtime/plateforme.tsx") ?? "").toMatch(
      /useColorScheme/u,
    );
    expect(compileWeb(air).files.get("lib/runtime/plateforme.tsx") ?? "").toMatch(
      /prefers-color-scheme/u,
    );
  });

  it("LE MANIFESTE EST COMPLET au sens des critères d installabilité", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const m = manifesteDe(compileWeb(document()).files);
    expect(m.name ?? m.short_name, "ni name ni short_name").toBeTruthy();
    expect(m.start_url, "start_url absent").toBeTruthy();
    expect(["standalone", "fullscreen", "minimal-ui"], `display = ${String(m.display)}`).toContain(
      m.display,
    );
    expect(m.theme_color, "theme_color absent").toBeTruthy();
    // WCAG 3.1.1 — la langue est déclarée, ici comme dans la page.
    expect(m.lang, "la langue n est pas déclarée au manifeste").toBeTruthy();
  });

  it("LE SERVICE WORKER EXISTE — sans lui, aucune invite d installation", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const fichiers = compileWeb(document()).files;
    const sw = fichiers.get("public/sw.js") ?? "";
    expect(sw, "aucun service worker émis").not.toBe("");
    expect(sw, "le service worker ne répond pas à `fetch`").toMatch(/addEventListener\("fetch"/u);
  });

  it("ÉMIS NE VEUT PAS DIRE LIVRÉ — les fichiers d installation sont dans `public/`", async () => {
    // ── LE DÉFAUT LE PLUS INSTRUCTIF DE LA JOURNÉE.
    //
    // Les cinq fichiers de l installation — service worker, manifeste, trois
    // icônes — étaient bien ÉMIS, à la racine du projet. Aucun n arrivait
    // dans `dist/` : Vite ne copie que ce qui est IMPORTÉ par le code, ou
    // placé dans `public/`. La PWA construite n avait donc ni service worker
    // ni icône, et aucune invite d installation nulle part.
    //
    // ET LA MESURE QUI M AVAIT TROMPÉ : le serveur répondait HTTP 200 sur
    // chacun. C était le repli d application monopage, qui rend `index.html`
    // pour toute adresse inconnue. J avais vérifié le CODE DE STATUT et
    // conclu que le fichier existait. Un statut n est pas un contenu.
    //
    // Ce contrôle ne peut pas lancer Vite. Il tient la règle MÉCANIQUE qui
    // garantit la copie : ces fichiers vivent sous `public/`, point.
    const { compileWeb } = await import("../src/index.ts");
    const fichiers = compileWeb(document()).files;

    for (const f of [
      "public/manifest.webmanifest",
      "public/sw.js",
      "public/icone.svg",
      "public/icone-192.png",
      "public/icone-512.png",
    ]) {
      expect(fichiers.has(f), `« ${f} » n est pas émis : Vite ne le copiera pas`).toBe(true);
    }

    // ET AUCUN NE TRAÎNE À LA RACINE : un doublon là-bas serait HACHÉ par
    // Vite et la déclaration du manifeste pointerait dans le vide — le défaut
    // d origine, revenu par l autre porte.
    for (const f of ["manifest.webmanifest", "sw.js", "icone.svg", "icone-192.png"]) {
      expect(
        fichiers.has(f),
        `« ${f} » est aussi à la racine : Vite le hachera et le lien cassera`,
      ).toBe(false);
    }
  });

  it("LES QUATRE AUTORITÉS SONT NOMMÉES, avec leur pouvoir et leur adresse", () => {
    // Une règle sans source est une opinion. Le module doit dire DE QUI elle
    // vient et CE QU IL PEUT FAIRE si on ne la suit pas.
    for (const [clef, a] of Object.entries(AUTORITES)) {
      expect(a.nom.length, `${clef} : pas de nom`).toBeGreaterThan(10);
      expect(a.pouvoir.length, `${clef} : son pouvoir n est pas dit`).toBeGreaterThan(5);
      expect(a.source, `${clef} : pas d adresse`).toMatch(/^https:\/\//u);
    }
    // L autorité LÉGALE est nommée comme telle — c est elle qu on n a pas le
    // droit d arbitrer.
    expect(AUTORITES.loi.pouvoir).toMatch(/légale/u);
  });

  it("LES RÈGLES NON TENUES SONT COMPTÉES, jamais tues", () => {
    // ── LE CLIQUET QUI EMPÊCHE LA DETTE SILENCIEUSE.
    //
    // Une règle `ouverte` est un manque ASSUMÉ : elle s applique, le moteur ne
    // la tient pas, et c est écrit. Le danger n est pas qu il y en ait — c est
    // qu elles augmentent sans que personne le voie.
    //
    // PLAFOND MESURÉ le 2026-10-16 : deux ouvertes — les capacités natives
    // (App Store 4.2) et `prefers-reduced-motion` (WCAG 2.3.3). Ce plafond est
    // MONOTONE DÉCROISSANT : on le baisse quand on ferme, jamais l inverse.
    const ouvertes = reglesOuvertes();
    expect(
      ouvertes.length,
      `règles non tenues : ${ouvertes.map((r) => r.id).join(", ")}`,
    ).toBeLessThanOrEqual(2);

    // ET CHAQUE OUVERTE DIT POURQUOI. « Ouverte » sans raison serait un trou.
    for (const r of ouvertes) {
      expect(r.tenue.kind).toBe("ouverte");
      if (r.tenue.kind !== "ouverte") continue;
      expect(r.tenue.raison.length, `${r.id} : ouverte sans raison`).toBeGreaterThan(20);
    }

    // TOUTE RÈGLE PORTE UNE AUTORITÉ CONNUE ET UNE CIBLE.
    for (const r of REGLES) {
      expect(Object.keys(AUTORITES), `${r.id} : autorité inconnue`).toContain(r.autorite);
      expect(["web", "natif", "les-deux"], `${r.id} : cible inconnue`).toContain(r.cible);
      expect(r.exigence.length, `${r.id} : exigence vide`).toBeGreaterThan(20);
    }
  });

  it("LA RÈGLE 4.2.6 EST CONSIGNÉE — c est la condition du modèle", () => {
    // Apple refuse une application issue d un service de génération, SAUF si
    // le fournisseur du contenu la soumet lui-même. Ce n est pas une
    // préférence du propriétaire : c est ce qui rend Deribfy publiable.
    const r = REGLES.find((x) => x.id === "APPLE-4-2-6-SOUMISSION");
    expect(r, "la règle 4.2.6 a disparu du référentiel").toBeDefined();
    expect(r?.tenue.kind, "4.2.6 ne peut pas être tenue par le moteur").toBe("hors-moteur");
  });
});
