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

  it("la pile commence par `system-ui` et finit par `sans-serif`", async () => {
    // L'ORDRE compte. `system-ui` donne la police NATIVE de l'appareil — San
    // Francisco sur iPhone, Roboto sur Android — celle que la personne lit
    // partout ailleurs. Et le dernier repli doit etre `sans-serif` : sans
    // lui, un navigateur exotique retombe sur son serif, et on revient au
    // defaut qu'on corrige ici.
    const docs = await documents();
    const html = await htmlDe((docs[0] as { air: ProjectAir }).air);
    const regle = /font-family\s*:([^;]+);/u.exec(html)?.[1] ?? "";
    expect(regle.trimStart().startsWith("system-ui")).toBe(true);
    expect(regle.trimEnd().endsWith("sans-serif")).toBe(true);
  });

  it("AUCUNE police n'est TELECHARGEE — un cahier reel exigeait moins de 150 Ko", async () => {
    // Charger une police ajoute une requete, un clignotement au premier rendu
    // et du poids. Le cahier d'un client reel exige « < 150 KB pour reseaux
    // 3G ». La pile systeme ne coute rien.
    const docs = await documents();
    const html = await htmlDe((docs[0] as { air: ProjectAir }).air);
    expect(html).not.toContain("@font-face");
    expect(html).not.toContain("fonts.googleapis");
    expect(html).not.toContain("fonts.gstatic");
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
