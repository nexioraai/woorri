/**
 * EP-218 · UNE APPLICATION WEB DOIT ETRE REGARDABLE, PAS SEULEMENT MONTABLE.
 *
 * MESURE QUI A COMMANDE CE CLIQUET, ET C'EST LE PROPRIETAIRE QUI L'A VUE
 * AVANT MOI. Je lui ai remis une application web construite en disant
 * « elle est prete ». Il l'a ouverte : « c'est quoi ce bordel ».
 *
 * J'avais regarde les gates — ca compile, ca se monte, 32 sur 32 — et AUCUNE
 * de ces gates ne regarde si l'ecran est PRESENTABLE. J'ai presente une
 * preuve technique comme si c'etait un produit. C'est exactement le defaut
 * que ce depot nomme « la verite du moteur presentee comme la verite de
 * l'ecran ».
 *
 * ── CE QUE LA MESURE A TROUVE.
 *
 * ZERO `fontFamily` dans tout le projet emis. Sur la cible NATIVE ce n'est
 * pas un probleme : ne rien declarer donne la police du systeme. Sur le WEB,
 * ne rien declarer donne le defaut du NAVIGATEUR — un serif, souvent Times.
 * Toute l'application s'affichait dans une police que personne n'avait
 * choisie, sur une palette sombre. C'est la PREMIERE chose qu'on voit.
 *
 * ── CE QUE CE CLIQUET TIENT, ET CE QU'IL NE PRETEND PAS TENIR.
 *
 * Il ne juge pas le GOUT. Aucun test ne peut dire qu'un ecran est beau. Il
 * tient les quelques proprietes SANS LESQUELLES aucun ecran ne peut l'etre —
 * une police declaree, un fond peint, un lissage. Ce sont des conditions
 * necessaires, jamais suffisantes, et c'est dit.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");

/** Tous les documents du corpus, via la source UNIQUE que les gates lisent. */
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

const htmlDe = async (air: ProjectAir): Promise<string> => {
  const { compileWeb } = await import("../src/index.ts");
  return compileWeb(air).files.get("index.html") ?? "";
};

/** La carte complete des fichiers emis — pour peser ce qui voyage vraiment. */
const filesDe = async (air: ProjectAir): Promise<Map<string, string>> => {
  const { compileWeb } = await import("../src/index.ts");
  return compileWeb(air).files as Map<string, string>;
};

describe("EP-218 ① · CHAQUE application web emise declare sa typographie", () => {
  it("une police est declaree, avec un repli systeme, sur TOUT le corpus", async () => {
    const docs = await documents();
    // Si le corpus devenait introuvable, ce test passerait en ne mesurant
    // rien. Il doit tomber dans ce cas-la.
    expect(docs.length).toBeGreaterThan(20);
    const sans: string[] = [];
    for (const { nom, air } of docs) {
      const html = await htmlDe(air);
      if (!/font-family\s*:/u.test(html)) sans.push(nom);
    }
    expect(sans).toEqual([]);
  });

  it("la pile du CORPS commence par `system-ui` et finit par `sans-serif`", async () => {
    // L'ORDRE compte. `system-ui` donne la police NATIVE de l'appareil — San
    // Francisco sur iPhone, Roboto sur Android — celle que la personne lit
    // partout ailleurs. Et le dernier repli doit etre `sans-serif` : sans
    // lui, un navigateur exotique retombe sur son serif, et on revient au
    // defaut qu'on corrige ici.
    //
    // ── CE CONTROLE A ETE CORRIGE APRES ETRE DEVENU VERT A TORT (2026-10-17).
    //
    // Il prenait la PREMIERE regle `font-family` du document. Depuis que les
    // themes serif declarent trois `@font-face`, cette premiere regle est
    // celle d'une FACE — `font-family: "DeribfySerif"` — et plus celle du
    // corps. Le controle mesurait donc une autre regle que la sienne.
    //
    // Il ne l'a pas dit tout de suite : il lisait le PREMIER document du
    // corpus, dont le theme est en police systeme et qui n'a donc aucune
    // `@font-face`. Vert, et aveugle. On lit desormais la regle `html, body`
    // NOMMEMENT, et sur TOUT le corpus.
    const docs = await documents();
    expect(docs.length, "corpus introuvable : ce controle ne mesure plus rien").toBeGreaterThan(20);
    const fautifs: string[] = [];
    for (const { nom, air } of docs) {
      const html = await htmlDe(air);
      const regle = /html,\s*body\s*\{[\s\S]*?font-family\s*:([^;]+);/u.exec(html)?.[1] ?? "";
      if (!regle.trimStart().startsWith("system-ui") || !regle.trimEnd().endsWith("sans-serif")) {
        fautifs.push(`${nom} → ${regle.trim().slice(0, 60)}`);
      }
    }
    expect(fautifs, "la pile du corps a derive").toEqual([]);
  });

  it("AUCUNE police TIERCE, et le poids des faces reste sous le cahier client", async () => {
    // ── CE CLIQUET A FAILLI REFUSER LE THEME, ET IL AVAIT DE BONNES RAISONS.
    //
    // Il interdisait TOUT `@font-face`, au motif qu'« un cahier reel exige
    // < 150 KB pour reseaux 3G ». Le 2026-10-17, le proprietaire a demande que
    // la cible native ait la meme identite typographique que le web (« il faut
    // surtout pas oublier native »). Les deux instructions se heurtaient.
    //
    // ── CE QUI A DECIDE : LA MESURE, SUR UNE APPLICATION CONSTRUITE.
    //
    //   · JS                 304 811 o → 88 390 o gzip
    //   · index.html           6 492 o →  2 669 o gzip
    //   · 3 faces TrueType   128 296 o → 73 723 o gzip  → total 164 Ko
    //   · 3 faces WOFF2       57 620 o (deja compresse) → total 147 Ko
    //
    // Le WOFF2 garde la promesse, le TrueType la rompt. Le format n'est donc
    // pas une preference : c'est la condition pour que ce lot existe.
    //
    // Et le cahier est tenu DEUX FOIS : une application dont le theme est en
    // police systeme n'emet AUCUNE face — onze des vingt-deux documents.
    //
    // ── CE QUI RESTE INTERDIT, ET SANS AMENDEMENT POSSIBLE.
    //
    // Une police TIERCE. `fonts.googleapis`/`fonts.gstatic` ajoutent une
    // requete vers un domaine qu'on ne controle pas, une resolution DNS, un
    // risque de vie privee, et une panne dont on n'est pas maitre. Les faces
    // sont SERVIES PAR L'APPLICATION, meme origine, deja en cache au second
    // ecran.
    const docs = await documents();
    expect(docs.length, "corpus introuvable").toBeGreaterThan(20);
    const PLAFOND_FACES = 60 * 1024;
    const tiers: string[] = [];
    const tropLourds: string[] = [];
    const formatsInterdits: string[] = [];
    for (const { nom, air } of docs) {
      const html = await htmlDe(air);
      for (const domaine of ["fonts.googleapis", "fonts.gstatic", "use.typekit", "//fonts."]) {
        if (html.includes(domaine)) tiers.push(`${nom} → ${domaine}`);
      }
      if (!html.includes("@font-face")) continue;
      // UNE FACE DECLAREE DOIT ETRE EN WOFF2 : le TrueType fait passer le
      // total au-dessus du cahier, mesure a l'appui.
      for (const m of html.matchAll(/src:\s*url\("([^"]+)"\)/gu)) {
        if (!(m[1] ?? "").endsWith(".woff2")) formatsInterdits.push(`${nom} → ${m[1] ?? ""}`);
      }
      // ET LE POIDS REEL DES FACES EMISES EST BORNE.
      const fichiers = [...(await filesDe(air)).entries()].filter(([k]) =>
        k.startsWith("public/polices/"),
      );
      const octets = fichiers.reduce(
        (n, [, v]) => n + (typeof v === "string" ? Buffer.from(v, "base64").length : 0),
        0,
      );
      if (octets > PLAFOND_FACES) {
        tropLourds.push(`${nom} → ${String(Math.round(octets / 1024))} Ko`);
      }
    }
    expect(tiers, "une police TIERCE est chargee : requete hors de notre controle").toEqual([]);
    expect(
      formatsInterdits,
      "une face n'est pas en WOFF2 : le total passerait au-dessus du cahier client",
    ).toEqual([]);
    expect(
      tropLourds,
      `des faces depassent le plafond de ${String(PLAFOND_FACES / 1024)} Ko`,
    ).toEqual([]);
  });
});

describe("EP-218 ② · LE FOND EST PEINT, SINON LA PALETTE S'ARRETE A L'APPLICATION", () => {
  it("le document porte un fond, et le schema sombre aussi", async () => {
    // Le theme peint le fond de l'ECRAN, pas celui de la page. Sur un
    // telephone, un defilement elastique decouvre du BLANC sous une
    // application sombre.
    const docs = await documents();
    const html = await htmlDe((docs[0] as { air: ProjectAir }).air);
    expect(/body\s*\{[^}]*background/u.test(html)).toBe(true);
    expect(html).toContain("prefers-color-scheme: dark");
  });
});

describe("EP-218 ③ · CE QUE CE CLIQUET NE PRETEND PAS", () => {
  it("il ne juge pas le GOUT, et c'est ecrit", async () => {
    // Un test ne peut pas dire qu'un ecran est beau. Celui-ci tient les
    // conditions NECESSAIRES — une police, un fond, un lissage — jamais les
    // suffisantes. Le dire ici evite qu'un vert soit lu comme « c'est joli ».
    const source = readFileSync(join(ICI, "ep218-web-regardable.test.ts"), "utf8");
    expect(source).toContain("Il ne juge pas le GOUT");
    // Et le lissage, qui fait la difference entre un texte net et un texte sale.
    const docs = await documents();
    const html = await htmlDe((docs[0] as { air: ProjectAir }).air);
    expect(html).toContain("font-smoothing");
  });
});
