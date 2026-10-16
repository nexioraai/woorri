/**
 * EP-251 · DERIBFY DISTINGUE LES DEUX CIBLES, ET IL LE PROUVE.
 *
 * ── LE DÉFAUT QUE CE FICHIER FERME, ET IL ÉTAIT LE MIEN.
 *
 * Le propriétaire, le 2026-10-16 : « revérifie encore, est-ce que tu as bien
 * fait ? Deribfy doit distinguer une appli web téléchargeable d'une appli
 * mobile dans l'App Store. »
 *
 * La mesure a été nette : `conformite-magasins` n'était importé par PERSONNE.
 * Le champ `cible` déclarait « web » ou « natif » et rien ne le lisait. Le
 * moteur produisait bien deux artefacts différents — mais il ne DISTINGUAIT
 * rien : aucun moyen de dire si ce qu'il venait d'émettre satisfaisait les
 * règles de la cible demandée.
 *
 * « Deribfy sait » était une phrase. Ce fichier en fait un fait mesurable.
 *
 * ── ET LES DEUX RÈGLES QUE JE LAISSAIS OUVERTES.
 *
 * Le propriétaire : « tu dois trouver une solution ». Les deux sont fermées,
 * et pas en les rayant de la liste :
 *
 *   WCAG 2.3.3 — la garde `prefers-reduced-motion` est posée dans la feuille
 *   émise. Elle ne coûte rien sur une page sans mouvement et couvre PAR
 *   CONSTRUCTION tout ce qui viendra. Mesuré ce jour : zéro animation
 *   aujourd'hui — c'est précisément pourquoi il fallait la poser maintenant,
 *   pendant que personne n'y pense.
 *
 *   App Store 4.2 — le moteur ne peut pas INVENTER une capacité native : ce
 *   serait fabriquer une fonctionnalité pour tromper un examinateur. Il peut
 *   refuser de se taire. Zéro capacité déclarée sur une cible native est le
 *   profil exact que 4.2 vise, et le savoir APRÈS soumission coûte une
 *   semaine d'attente à quelqu'un.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";
import { REGLES, reglesPour, reglesOuvertes, verifier } from "../src/conformite-magasins.ts";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");

const brut = (): Record<string, unknown> =>
  JSON.parse(readFileSync(join(RACINE, "slices/tontine/tontine.air.json"), "utf8")) as Record<
    string,
    unknown
  >;

const document = (): ProjectAir => migrateAirDocument(brut());

/** Les capacités que le DOCUMENT déclare — comptées, jamais inventées. */
const capacitesDuDocument = (): string[] => {
  const vues = new Set<string>();
  for (const m of JSON.stringify(brut()).matchAll(/"capability":"([^"]+)"/gu)) {
    if (m[1] !== undefined) vues.add(m[1]);
  }
  return [...vues];
};

describe("EP-251 · la conformité agit, et elle distingue la cible", () => {
  it("LES DEUX CIBLES N ONT PAS LES MÊMES RÈGLES — c est ça, distinguer", () => {
    const web = reglesPour("web").map((r) => r.id);
    const natif = reglesPour("natif").map((r) => r.id);

    expect(web, "aucune règle web").not.toHaveLength(0);
    expect(natif, "aucune règle native").not.toHaveLength(0);
    expect(
      web,
      "les deux cibles reçoivent exactement les mêmes règles : rien n est distingué",
    ).not.toEqual(natif);

    // CE QUI N APPARTIENT QU AU WEB n atteint jamais le natif.
    for (const id of ["WEB-ICONES-PNG", "WEB-SERVICE-WORKER", "WEB-MANIFESTE-COMPLET"]) {
      expect(web, `${id} manque à la cible web`).toContain(id);
      expect(natif, `${id} appliquée au natif : un projet Expo n a pas de manifeste PWA`).not.toContain(
        id,
      );
    }

    // CE QUI N APPARTIENT QU AUX MAGASINS n atteint jamais le web.
    for (const id of ["APPLE-4-2-6-SOUMISSION", "APPLE-4-2-FONCTIONNALITE"]) {
      expect(natif, `${id} manque à la cible native`).toContain(id);
      expect(web, `${id} appliquée au web : une PWA ne passe aucune revue`).not.toContain(id);
    }

    // ET CE QUI VAUT PARTOUT vaut des DEUX côtés.
    for (const id of ["PLAY-THEMES-CLAIR-SOMBRE", "WCAG-2-3-3-MOUVEMENT"]) {
      expect(web).toContain(id);
      expect(natif).toContain(id);
    }
  });

  it("LE VÉRIFICATEUR MESURE SUR CE QUI EST ÉMIS, et ne trouve aucun manque", async () => {
    const { compileWeb, compileProject } = await import("../src/index.ts");
    const air = document();
    const caps = capacitesDuDocument();

    for (const [nom, fichiers, cible] of [
      ["web", compileWeb(air).files, "web"],
      ["natif", compileProject(air).files, "natif"],
    ] as const) {
      const constats = verifier(fichiers, cible, caps);
      expect(constats.length, `${nom} : aucun constat rendu`).toBe(reglesPour(cible).length);

      const manques = constats.filter((c) => c.verdict === "manque");
      expect(
        manques,
        `${nom} — règles violées : ${manques.map((m) => `${m.regle} (${m.detail})`).join(" | ")}`,
      ).toEqual([]);

      // CHAQUE CONSTAT DIT CE QU IL A MESURÉ. Un verdict sans détail ne
      // permet ni de le croire ni de le contester.
      for (const c of constats) {
        expect(c.detail.length, `${nom} · ${c.regle} : verdict sans détail`).toBeGreaterThan(10);
      }
    }
  });

  it("LA RÈGLE 4.2 MORD VRAIMENT — zéro capacité, zéro indulgence", async () => {
    // ── LE CONTRÔLE QUI EMPÊCHE UNE FERMETURE DE COMPLAISANCE.
    //
    // Déclarer 4.2 « tenue » ne vaut que si le vérificateur sait la VIOLER.
    // Sans ce test, la règle serait verte parce qu elle ne regarde rien.
    const { compileProject } = await import("../src/index.ts");
    const fichiers = compileProject(document()).files;

    const avecCapacites = verifier(fichiers, "natif", capacitesDuDocument()).find(
      (c) => c.regle === "APPLE-4-2-FONCTIONNALITE",
    );
    expect(avecCapacites?.verdict, "un document qui déclare des capacités est refusé").toBe(
      "conforme",
    );

    const sansCapacite = verifier(fichiers, "natif", []).find(
      (c) => c.regle === "APPLE-4-2-FONCTIONNALITE",
    );
    expect(
      sansCapacite?.verdict,
      "zéro capacité native passe quand même : Apple refusera et le moteur n aura rien dit",
    ).toBe("manque");
    expect(sansCapacite?.detail, "le manque ne dit pas ce qu il faut faire").toMatch(/4\.2/u);
  });

  it("WCAG 2.3.3 — la garde est posée, et elle vaut pour ce qui n existe pas encore", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const html = compileWeb(document()).files.get("index.html") ?? "";

    expect(html, "aucune garde de mouvement réduit : obligation légale non tenue").toMatch(
      /@media \(prefers-reduced-motion:reduce\)/u,
    );
    // `0.01ms` et NON zéro : une durée nulle empêche l événement de fin
    // d animation de se déclencher, et du code qui l attend resterait bloqué.
    expect(html, "durée nulle : un écouteur de fin d animation ne se déclenchera jamais").toMatch(
      /animation-duration:0\.01ms !important/u,
    );
    expect(html).toMatch(/transition-duration:0\.01ms !important/u);
  });

  it("UNE ANIMATION SANS GARDE SERAIT REFUSÉE — le contrôle sait dire non", () => {
    // On fabrique un jeu de fichiers qui bouge SANS garde : le vérificateur
    // doit le refuser. Sinon « conforme » ne voudrait rien dire.
    const quiBouge = new Map<string, string>([
      ["index.html", "<html></html>"],
      ["lib/runtime/x.tsx", "const a = Animated.timing(v, { useNativeDriver: true });"],
    ]);
    const c = verifier(quiBouge, "web", []).find((x) => x.regle === "WCAG-2-3-3-MOUVEMENT");
    expect(c?.verdict, "une animation sans garde est déclarée conforme").toBe("manque");
    expect(c?.detail).toMatch(/SANS garde/u);
  });

  it("PLUS AUCUNE RÈGLE OUVERTE — et le compteur reste là pour le dire", () => {
    // ── POURQUOI LE COMPTEUR SURVIT À LA FERMETURE.
    //
    // Les deux ouvertes du 2026-10-16 sont fermées. Le contrôle ne disparaît
    // pas pour autant : ce qu il protège, ce n est pas « zéro aujourd hui »,
    // c est qu on ne puisse pas en rouvrir une en silence demain.
    const ouvertes = reglesOuvertes();
    expect(
      ouvertes.map((r) => r.id),
      "des règles sont de nouveau ouvertes sans que personne l ait dit",
    ).toEqual([]);

    // ET AUCUNE RÈGLE N EST ORPHELINE : chacune est tenue, ou explicitement
    // remise au publieur.
    for (const r of REGLES) {
      expect(
        ["tenue", "hors-moteur", "ouverte"],
        `${r.id} : état de tenue inconnu`,
      ).toContain(r.tenue.kind);
    }
  });

  it("LE MODULE EST BRANCHÉ — il agit, il ne documente plus seulement", async () => {
    // Le défaut d origine : le module existait et personne ne l importait.
    // Ce contrôle tient le branchement lui-même.
    const source = readFileSync(
      join(RACINE, "packages/compiler/src/conformite-magasins.ts"),
      "utf8",
    );
    expect(source, "le vérificateur a disparu").toMatch(/export function verifier/u);
    expect(source, "le champ `cible` n est plus lu par personne").toMatch(
      /REGLES\.filter\(\(r\) => r\.cible === cible/u,
    );

    // ET IL EST EXPORTÉ par le paquet : un module qu on ne peut pas importer
    // depuis l extérieur reste une note interne.
    const index = await import("../src/index.ts");
    expect(
      Object.keys(index),
      "`verifier` n est pas exporté : aucun appelant ne pourra s en servir",
    ).toContain("verifier");
  });
});
