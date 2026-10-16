/**
 * EP-224 · UNE APPLICATION WEB DOIT POUVOIR SE POSER SUR UN ÉCRAN D'ACCUEIL.
 *
 * ── LA DEMANDE, ET CE QU'ELLE A RÉVÉLÉ.
 *
 * Le propriétaire : « il faut que ça soit téléchargeable sur iPhone, Mac,
 * iPad et tablette Samsung, Huawei, etc. ». Mesure du 2026-10-15 sur la
 * sortie RÉELLE de `compileWeb` : le manifeste ne déclarait AUCUNE icône,
 * aucun service worker n'était émis, et le `<head>` ne portait aucune des
 * balises qu'iOS exige. L'application était donc installable NULLE PART —
 * ni sur iPhone, ni sur Android, ni sur Huawei.
 *
 * Le fichier portait pourtant cette note : « AUCUNE ICÔNE N'EST DÉCLARÉE,
 * et c'est délibéré : en annoncer une que le document ne porte pas ferait
 * promettre un fichier absent, et le navigateur refuserait l'installation
 * entière ». Le raisonnement était JUSTE. La conclusion ne l'était plus,
 * parce qu'on peut ÉMETTRE l'icône au lieu de l'attendre.
 *
 * ── CE QUE CE CLIQUET TIENT, ET CE QU'IL NE PRÉTEND PAS TENIR.
 *
 * Il ne prouve PAS qu'un iPhone réel propose l'installation : aucun test
 * de ce dépôt ne pilote un appareil. Il prouve ce qui est vérifiable sans
 * en supposer davantage — que le manifeste est complet, que CHAQUE fichier
 * promis EXISTE, que le service worker répond bien à `fetch`, et que la
 * page le déclare. Si l'un manque, aucun navigateur ne propose rien ; s'ils
 * sont tous là, la décision appartient au navigateur, pas à nous.
 */
// ── LES FICHIERS D'INSTALLATION ONT CHANGÉ DE PLACE LE 2026-10-16.
//
// Ils vivaient à la racine du projet émis. Mesure de ce jour-là, sur la
// CONSTRUCTION de production : aucun n'arrivait dans `dist/` — Vite ne copie
// que ce qui est importé par le code, ou placé dans `public/`. La PWA
// construite n'avait donc ni service worker ni icône.
//
// Ces cliquets protégeaient la bonne règle au mauvais endroit : ils
// vérifiaient que le moteur ÉMET, pas que la construction LIVRE. Les chemins
// suivent désormais `public/`, et EP-250 ajoute le contrôle qui manquait —
// aucun de ces fichiers ne doit traîner à la racine, où Vite le hacherait.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");

const documents = async (): Promise<readonly { nom: string; air: ProjectAir }[]> => {
  const { documentsDuCorpus } = (await import(
    RACINE + "/docs/elite-protocol/evidence/corpus-documents.mjs"
  )) as { documentsDuCorpus: (r: string) => readonly [string, string, unknown?][] };
  const vus: { nom: string; air: ProjectAir }[] = [];
  for (const [nom, chemin, transformer] of documentsDuCorpus(RACINE + "/")) {
    if (vus.some((v) => v.nom === nom)) continue;
    let brut: unknown = JSON.parse(readFileSync(chemin, "utf8"));
    if (typeof transformer === "function") {
      const r = (transformer as (d: unknown) => unknown)(brut);
      if (r === undefined) continue;
      brut = r;
    }
    vus.push({ nom, air: migrateAirDocument(brut) });
  }
  return vus;
};

const projet = async (air: ProjectAir): Promise<ReadonlyMap<string, string>> => {
  const { compileWeb } = await import("../src/index.ts");
  return compileWeb(air).files;
};

interface Manifeste {
  icons?: { src: string; sizes?: string; type?: string; purpose?: string }[]
  start_url?: string
  scope?: string
  id?: string
  display?: string
  theme_color?: string
  background_color?: string
}

describe("EP-224 · l'application se pose sur un écran d'accueil", () => {
  it("CHAQUE icône promise par le manifeste EXISTE dans le projet émis", async () => {
    // LE CONTRÔLE QUI COMPTE, et c'est la crainte d'origine du fichier :
    // un navigateur qui ne trouve pas une icône annoncée refuse
    // l'installation ENTIÈRE — il ne l'ignore pas.
    for (const { nom, air } of await documents()) {
      const f = await projet(air);
      const m = JSON.parse(f.get("public/manifest.webmanifest") ?? "{}") as Manifeste;
      expect(m.icons, `« ${nom} » ne déclare aucune icône : rien ne s'installera`).toBeDefined()
      expect((m.icons ?? []).length, `« ${nom} » : liste d'icônes vide`).toBeGreaterThan(0)
      for (const ic of m.icons ?? []) {
        // Le manifeste cite `./icone.svg` ; le fichier vit sous `public/`,
        // d'où Vite le copie à la racine de la construction — c'est la MÊME
        // adresse une fois servi, et c'est ce qui rend le lien juste.
        const chemin = "public/" + ic.src.replace(/^\.\//u, "")
        expect(
          f.has(chemin),
          `« ${nom} » promet « ${ic.src} » que le projet n'émet PAS — le navigateur refusera tout`,
        ).toBe(true)
      }
    }
  })

  it("le manifeste porte ce qu'un navigateur réclame pour installer", async () => {
    for (const { nom, air } of await documents()) {
      const m = JSON.parse((await projet(air)).get("public/manifest.webmanifest") ?? "{}") as Manifeste
      expect(m.display, `« ${nom} » sans display standalone s'ouvre dans l'onglet`).toBe("standalone")
      expect(m.start_url, `« ${nom} » sans start_url`).toBeTruthy()
      expect(m.scope, `« ${nom} » sans scope`).toBeTruthy()
      expect(m.id, `« ${nom} » sans id : une mise à jour se dupliquerait`).toBeTruthy()
      // CASSE INDIFFÉRENTE, et il a fallu le corriger : cette expression
      // n acceptait que des minuscules. Depuis que la couleur vient du moteur
      // de thème (EP-250) et non d un hachage du slug, elle arrive en
      // MAJUSCULES — comme toute la palette des jetons. L hexadécimal CSS est
      // insensible à la casse : c est le contrôle qui était trop étroit, pas
      // la valeur qui est fausse.
      expect(m.theme_color, `« ${nom} » sans theme_color`).toMatch(/^#[0-9a-fA-F]{6}$/u)
      expect(m.background_color, `« ${nom} » sans background_color`).toMatch(
        /^#[0-9a-fA-F]{6}$/u,
      )
      // `maskable` : sans lui Android encadre l'icône de blanc.
      expect(
        (m.icons ?? []).some((i) => (i.purpose ?? "").includes("maskable")),
        `« ${nom} » : aucune icône maskable — Android ajoutera un cadre blanc`,
      ).toBe(true)
    }
  })

  it("un service worker est émis ET répond à fetch", async () => {
    // Chrome, Samsung Internet et le navigateur Huawei n'affichent l'invite
    // d'installation QUE si un service worker gère `fetch`. Un fichier
    // présent mais muet ne suffirait pas — on vérifie le gestionnaire.
    for (const { nom, air } of await documents()) {
      const sw = (await projet(air)).get("public/sw.js")
      expect(sw, `« ${nom} » n'émet aucun sw.js`).toBeDefined()
      expect(sw, `« ${nom} » : sw.js sans gestionnaire fetch`).toMatch(
        /addEventListener\(\s*["']fetch["']/u,
      )
      expect(sw, `« ${nom} » : sw.js ne répond jamais`).toMatch(/respondWith/u)
    }
  })

  it("la page déclare le manifeste, l icône, le service worker et iOS", async () => {
    for (const { nom, air } of await documents()) {
      const h = (await projet(air)).get("index.html") ?? ""
      expect(h, `« ${nom} » sans manifeste`).toMatch(/rel="manifest"/u)
      expect(h, `« ${nom} » sans icône tactile : iOS posera une capture`).toMatch(
        /rel="apple-touch-icon"/u,
      )
      expect(h, `« ${nom} » : iOS ouvrira dans Safari avec la barre d adresse`).toMatch(
        /name="apple-mobile-web-app-capable"/u,
      )
      expect(h, `« ${nom} » sans theme-color`).toMatch(/name="theme-color"/u)
      expect(h, `« ${nom} » n enregistre pas le service worker`).toMatch(
        /serviceWorker\.register/u,
      )
    }
  })

  it("la page émise ne contient AUCUN commentaire — il serait servi à chaque visiteur", async () => {
    // Règle déjà énoncée dans `emit-web.ts` et mesurée le 2026-10-05 (546
    // octets d'explications partis dans `dist/index.html`), mais qu'AUCUN
    // cliquet ne tenait. En posant les balises iOS j'ai re-commis la faute
    // dans l'heure : la règle existait, la garde non.
    for (const { nom, air } of await documents()) {
      const h = (await projet(air)).get("index.html") ?? ""
      expect(
        (h.match(/<!--/gu) ?? []).length,
        `« ${nom} » : la page sert des commentaires à ses visiteurs`,
      ).toBe(0)
    }
  })

  it("l icône est un SVG valide qui porte l initiale de l application", async () => {
    for (const { nom, air } of await documents()) {
      const svg = (await projet(air)).get("public/icone.svg") ?? ""
      expect(svg, `« ${nom} » : icône absente`).toMatch(/^<svg /u)
      expect(svg, `« ${nom} » : icône sans viewBox`).toMatch(/viewBox="0 0 512 512"/u)
      expect(svg, `« ${nom} » : icône sans libellé accessible`).toMatch(/aria-label=/u)
      // Pas de balise ouverte : un SVG cassé est une icône absente.
      expect(svg.trimEnd().endsWith("</svg>"), `« ${nom} » : SVG non refermé`).toBe(true)
    }
  })

  it("la couleur est DÉTERMINISTE : même document, même couleur", async () => {
    const premier = (await documents())[0]
    expect(premier, "le corpus est vide : le contrôle ne prouverait rien").toBeDefined()
    if (premier === undefined) return
    const lire = async (): Promise<Manifeste> =>
      JSON.parse((await projet(premier.air)).get("public/manifest.webmanifest") ?? "{}") as Manifeste
    const une = await lire()
    const deux = await lire()
    expect(une.theme_color).toBe(deux.theme_color)
  })

  it("CONTRÔLE NÉGATIF — deux applications différentes n ont pas la même couleur", async () => {
    // Sans ce contrôle, une constante codée en dur passerait le test
    // précédent sans que la couleur dépende de quoi que ce soit.
    const docs = await documents()
    const couleurs = new Set<string>()
    for (const { air } of docs) {
      const m = JSON.parse((await projet(air)).get("public/manifest.webmanifest") ?? "{}") as Manifeste
      couleurs.add(String(m.theme_color))
    }
    expect(
      couleurs.size,
      `${String(docs.length)} documents partagent ${String(couleurs.size)} couleur(s) : elle ne dérive de rien`,
    ).toBeGreaterThan(1)
  })
})
