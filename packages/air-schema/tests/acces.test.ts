import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { migrateAirDocument, assertValidAir } from "../src/index.ts";

// ============================================================
// LE CONTRÔLE D'ACCÈS REFUSE-T-IL CE QU'IL DOIT REFUSER ?
//
// Un schéma qui ACCEPTE un modèle d'accès faux est pire que pas de schéma du
// tout : il donne la confiance sans la garantie. Ces tests partent donc d'un
// document VALIDE et cassent une chose à la fois.
//
// Le document de référence est celui d'un système en production — SGD —
// dérivé de ses migrations SQL. Un document fabriqué pour le test aurait
// mesuré ma capacité à écrire un cas qui passe.
// ============================================================

const RACINE = new URL("../../../", import.meta.url).pathname;
const lire = () =>
  JSON.parse(readFileSync(RACINE + "slices/gestion/gestion.air.json", "utf8")) as Record<
    string,
    unknown
  >;

describe("contrôle d'accès (AIR 1.28.0)", () => {
  it("le document de gestion, tel qu'il est produit, passe", () => {
    expect(() => assertValidAir(migrateAirDocument(lire()))).not.toThrow();
  });

  it("l'écran d'entrée ne peut pas exiger un droit que le rôle par défaut n'a pas", () => {
    // ── LE DÉFAUT FONDATEUR, et il est arrivé pour de vrai.
    //
    // Un employé dont les droits n'étaient pas encore accordés était mis
    // dehors dès l'ouverture — à la connexion, puis à chaque lancement de
    // l'application installée sur son téléphone. Le propriétaire ne pouvait
    // pas le rencontrer : il voit tout.
    const doc = lire() as any;
    const reserve = doc.screens.find((s: any) => s.requiredRightId !== undefined);
    doc.navigation.entryScreenId = reserve.id;

    expect(diagnostiquer(doc)).toContain("AIR_ACCESS_ENTRY_UNREACHABLE");
  });

  it("un écran ne peut pas exiger un droit qui n'est pas déclaré", () => {
    // Sans ce contrôle, la sécurité dépendrait d'une orthographe : un droit
    // mal tapé OUVRIRAIT l'écran à tout le monde au lieu de le fermer.
    const doc = lire() as any;
    doc.screens[1].requiredRightId = "right_nexistepas";
    expect(diagnostiquer(doc)).toContain("AIR_ACCESS_RIGHT_UNKNOWN");
  });

  it("le rôle par défaut doit exister, sinon un nouveau compte n'a aucun statut", () => {
    const doc = lire() as any;
    doc.access.defaultRoleId = "role_fantome";
    expect(diagnostiquer(doc)).toContain("AIR_ACCESS_DEFAULT_ROLE_UNKNOWN");
  });

  it("un droit nommé SANS bloc access ne protège rien, et c'est refusé", () => {
    // Il se lirait comme une précaution et n'en serait pas une. Mieux vaut
    // refuser que laisser croire.
    const doc = lire() as any;
    delete doc.access;
    expect(diagnostiquer(doc)).toContain("AIR_ACCESS_SANS_DECLARATION");
  });

  it("un document SANS droits ni access reste valide — l'ajout est additif", () => {
    // Toutes les applications ne sont pas des systèmes de gestion. Une
    // boutique n'a pas d'employés, et lui imposer un modèle d'accès
    // reviendrait à inventer une organisation qu'elle n'a pas.
    const doc = lire() as any;
    delete doc.access;
    for (const s of doc.screens) delete s.requiredRightId;
    expect(() => assertValidAir(migrateAirDocument(doc))).not.toThrow();
  });
});

/**
 * Les diagnostics d'un document, LUS plutôt que subis.
 *
 * `migrateAirDocument` lève dès le premier diagnostic — c'est le bon
 * comportement en production, et c'est précisément ce qu'un test ne peut pas
 * utiliser : il veut vérifier QUEL diagnostic sort, pas seulement qu'il y en a
 * un. On attrape donc l'erreur et on lit la liste qu'elle porte.
 */
function diagnostiquer(doc: unknown): string[] {
  try {
    assertValidAir(migrateAirDocument(doc as Record<string, unknown>));
    return [];
  } catch (e) {
    const liste = (e as { diagnostics?: { code: string }[] }).diagnostics;
    if (liste === undefined) throw e;
    return liste.map((d) => d.code);
  }
}
