// EP-165 ② — LE TRANSPORT D'IMAGE VIT DANS L'ADAPTATEUR, JAMAIS DANS LE CONTRAT.
//
// C'est la frontière d'EP-049 et elle ne bouge pas : la requête NEUTRE dit
// « il y a des images » (`{mediaType, base64}`), chaque adaptateur seul sait
// dans quel dialecte les mettre. Trois dialectes mesurés ici, aucun appel.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const AD = join(R, "benchmarks", "air-emission");

const charger = (nom: string): Promise<Record<string, any>> =>
  import(join(AD, `adaptateur-${nom}.mjs`));

const PNG = readFileSync(join(R, "benchmarks", "e2e", "results", "rtl", "ios-rtl.png"));
const IMAGE = { mediaType: "image/png", base64: PNG.toString("base64") };
const REQUETE = { system: "S", user: "U", grammaire: { type: "object" } };
const REGLAGES = { max_tokens: 2000 };
const NOMS = ["anthropic", "openai", "deepseek"] as const;

const contenuUtilisateur = (appel: any): unknown =>
  appel.messages[appel.messages.length - 1].content;

describe("EP-165 ② · le transport d'image", () => {
  for (const nom of NOMS) {
    it(`${nom} — SANS image, la charge utile est INCHANGÉE`, async () => {
      // NON-RÉGRESSION D'ABORD : toutes les campagnes passées n'envoient pas
      // d'image. Si la forme changeait à vide, le transport aurait cassé ce
      // qui marchait — exactement ce que CLAUDE.md interdit.
      const a = await charger(nom);
      expect(typeof contenuUtilisateur(a.construireAppel(REQUETE, REGLAGES))).toBe("string");
      expect(typeof contenuUtilisateur(a.construireAppel({ ...REQUETE, images: [] }, REGLAGES))).toBe(
        "string",
      );
    });

    it(`${nom} — AVEC image, le dialecte porte l'image ET le texte`, async () => {
      const a = await charger(nom);
      const c = contenuUtilisateur(a.construireAppel({ ...REQUETE, images: [IMAGE] }, REGLAGES));
      expect(Array.isArray(c), "contenu non bloqué").toBe(true);
      const blocs = (c as { type: string }[]).map((b) => b.type);
      // L'IMAGE AVANT LE TEXTE — consigne explicite d'un des fournisseurs, et
      // règle unique pour les trois : un ordre qui varierait par dialecte
      // rendrait les verdicts incomparables entre lecteurs.
      expect(blocs[blocs.length - 1]).toBe("text");
      expect(blocs.length).toBe(2);
      // Les octets de l'image voyagent réellement — un transport qui perdrait
      // la donnée passerait tous les tests de forme.
      expect(JSON.stringify(c)).toContain(IMAGE.base64.slice(0, 64));
    });

    it(`${nom} — la capacité de vision est DÉCLARÉE, pas devinée`, async () => {
      const a = await charger(nom);
      expect(a.VISION, "aucune capacité déclarée").toBeDefined();
      expect(typeof a.VISION.supportee).toBe("boolean");
      expect(a.VISION.modele, "le modèle qui REGARDE doit être nommé").toBeTruthy();
      expect(Array.isArray(a.VISION.formats)).toBe(true);
    });
  }

  it("LA VISION APPARTIENT AU MODÈLE, PAS AU FOURNISSEUR — corrige EP-164", () => {
    // J'avais écrit que `deepseek-chat` était « un modèle de texte », ce qui
    // laissait entendre que ce fournisseur ne voyait pas. VÉRIFICATION à la
    // documentation : il voit, sur un AUTRE modèle. Une requête portant une
    // image doit donc partir au modèle qui sait la lire — sans quoi on
    // lirait un refus comme un verdict.
    return charger("deepseek").then((a) => {
      expect(a.VISION.modele).not.toBe(a.VISION.modeleDeGeneration);
      const avec = a.construireAppel({ ...REQUETE, images: [IMAGE] }, REGLAGES);
      const sans = a.construireAppel(REQUETE, REGLAGES);
      expect(avec.model, "le modèle doit suivre la modalité").toBe(a.VISION.modele);
      expect(sans.model).toBe(a.VISION.modeleDeGeneration);
    });
  });

  it("UNE FORME NON ATTESTÉE EST DÉCLARÉE COMME TELLE — jamais présentée comme sûre", async () => {
    // La documentation d'un fournisseur détaille son bloc image pour une API
    // que cet adaptateur n'emploie PAS. La forme retenue est donc probable,
    // pas attestée, et le dépôt doit le porter par écrit plutôt que de le
    // découvrir sur un 400 payant.
    const declarations = await Promise.all(
      NOMS.map(async (n) => [n, (await charger(n)).VISION] as const),
    );
    const nonAttestees = declarations.filter(([, v]) => v.formeAttestee === false);
    expect(nonAttestees.length, "au moins une réserve doit être portée").toBeGreaterThan(0);
    for (const [nom, v] of nonAttestees) {
      expect(typeof v.reserve, `${nom} — réserve sans motif écrit`).toBe("string");
      expect(v.reserve.length, `${nom} — motif trop court pour être utile`).toBeGreaterThan(80);
    }
  });

  it("AU MOINS UN LECTEUR EST INDÉPENDANT DU GÉNÉRATEUR", async () => {
    // Le cœur de la demande : celui qui regarde ne doit pas être celui qui a
    // produit. La règle est d'EMPLOI, pas de code — ce cliquet vérifie
    // seulement qu'un candidat existe et se déclare.
    const dispos = await Promise.all(
      NOMS.map(async (n) => [n, (await charger(n)).VISION] as const),
    );
    const independants = dispos.filter(([, v]) => v.supportee && v.independantDuGenerateur === true);
    expect(independants.length, "aucun lecteur indépendant déclaré").toBeGreaterThanOrEqual(2);
  });
});
