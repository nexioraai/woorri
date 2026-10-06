import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { migrateAirDocument, assertValidAir } from "../src/index.ts";

// ════════════════════════════════════════════════════════════════════
//  QUI ÉCRIT LE SERVEUR ? (AIR 1.34.0)
//
// ── LA QUESTION QUI A OUVERT CE LOT.
//
// « Que font les autres générateurs d'applis ? » Réponse mesurée : ils
// fournissent le backend (Bubble, Adalo) ou le GÉNÈRENT depuis un schéma
// (Hasura, PostgREST). Seuls les outils internes supposent un système déjà en
// place — et les utilisateurs de Deribfy n'arrivent avec RIEN.
//
// Le format porte désormais la réponse, et c'est le CLIENT qui tranche.
// ════════════════════════════════════════════════════════════════════

const RACINE = new URL("../../../", import.meta.url).pathname;

interface Doc {
  backend?: { kind: string; stack?: string; domain?: string };
  network: { allowedDomains: string[] };
  datasets: {
    id: string;
    sourceKind?: string;
    sourceIntegrationId?: string;
    sourceDomain?: string;
  }[];
}

const lire = (): Doc =>
  JSON.parse(readFileSync(RACINE + "slices/tontine/tontine.air.json", "utf8")) as Doc;

/**
 * Les refus, QUEL QUE SOIT L'ÉTAGE QUI LES PRONONCE.
 *
 * Un document peut être refusé par le SCHÉMA (Zod — une forme impossible) ou
 * par le VALIDATEUR (une incohérence entre nœuds valides). La première version
 * de ce helper ne lisait que le second et relançait le premier : trois tests
 * échouaient en annonçant un bug du code alors que le code refusait
 * correctement — au mauvais étage pour eux.
 *
 * Les deux refus comptent. Le code n'en nomme qu'un.
 */
function diagnostiquer(doc: Doc): string[] {
  try {
    assertValidAir(migrateAirDocument(doc));
    return [];
  } catch (e) {
    const l = (e as { diagnostics?: { code: string }[] }).diagnostics;
    return l === undefined ? ["SCHEMA_REFUSE"] : l.map((d) => d.code);
  }
}

describe("le document réel de la tontine", () => {
  it("déclare un serveur GÉNÉRÉ en Spring Boot, comme le propriétaire l'exige", () => {
    expect(lire().backend).toEqual({ kind: "genere", stack: "spring_boot" });
  });

  it("est valide sans adresse de serveur — elle n'existe pas encore", () => {
    // L'état le plus NORMAL du chantier : le serveur s'écrit AVANT que son
    // adresse existe. Un contrôle qui l'interdirait refuserait la réalité.
    expect(lire().backend?.domain).toBeUndefined();
    expect(diagnostiquer(lire())).toEqual([]);
  });
});

describe("ce que le format REFUSE", () => {
  it("un serveur GÉNÉRÉ sans pile est REFUSÉ", () => {
    // Le compilateur n'a pas de pile par défaut : le document doit dire DANS
    // QUOI, sinon le refus arriverait à la compilation, avec un message qui
    // accuserait le document d'autre chose.
    const doc = lire();
    doc.backend = { kind: "genere" };
    expect(diagnostiquer(doc).length).toBeGreaterThan(0);
  });

  it("un serveur EXTERNE qui déclare une pile est REFUSÉ", () => {
    // Le serveur du client est écrit dans le langage qu'il veut. Le document
    // n'a pas à le prétendre.
    const doc = lire();
    doc.backend = { kind: "externe", stack: "spring_boot" };
    expect(diagnostiquer(doc).length).toBeGreaterThan(0);
  });

  it("une adresse hors de la politique réseau est REFUSÉE", () => {
    // `network.policy` est `deny_by_default` : une adresse non autorisée rend
    // l'application incapable de joindre son PROPRE serveur, et ça ne se voit
    // qu'à l'exécution, sur un appareil.
    const doc = lire();
    doc.backend = { kind: "genere", stack: "spring_boot", domain: "api.exemple.test" };
    expect(diagnostiquer(doc)).toContain("AIR_BACKEND_DOMAINE_INTERDIT");
  });

  it("un serveur JOIGNABLE que personne n'appelle est REFUSÉ", () => {
    const doc = lire();
    doc.network.allowedDomains.push("api.exemple.test");
    doc.backend = { kind: "genere", stack: "spring_boot", domain: "api.exemple.test" };
    expect(diagnostiquer(doc)).toContain("AIR_BACKEND_SANS_SOURCE");
  });

  it("une source qui lit un AUTRE serveur est REFUSÉE", () => {
    const doc = lire();
    doc.network.allowedDomains.push("api.exemple.test", "api.ailleurs.test");
    doc.backend = { kind: "genere", stack: "spring_boot", domain: "api.exemple.test" };
    const d = doc.datasets[0];
    if (d === undefined) throw new Error("prémisse absente : un dataset");
    // Une provenance distante COMPLÈTE : le schéma exige l'intégration qui la
    // sert. Sans elle, le document est refusé pour une tout autre raison, et
    // le test ne mesurerait plus ce qu'il croit.
    d.sourceKind = "remote";
    d.sourceIntegrationId = "intg_argent_mobile";
    d.sourceDomain = "api.ailleurs.test";
    expect(diagnostiquer(doc)).toContain("AIR_BACKEND_SOURCE_ETRANGERE");
  });
});

describe("le nœud reste OPTIONNEL — additivité stricte", () => {
  it("un document sans `backend` est valide, et n'émet aucun serveur", () => {
    // Les 30 documents du corpus gelé sont dans ce cas. Leur fabriquer un
    // serveur changerait ce que ces mesures mesurent.
    const doc = lire();
    delete doc.backend;
    expect(diagnostiquer(doc)).toEqual([]);
  });
});
