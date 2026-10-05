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

// ── CE QUE CES TESTS TOUCHENT DU DOCUMENT, ET RIEN DE PLUS.
//
// La première version lisait le document `as any`. Le lint du dépôt l'a refusé,
// et il a raison : `any` éteint le typage à l'endroit même où ces tests
// manipulent la structure à la main. Un champ renommé ne les aurait pas fait
// broncher — ils auraient muté une propriété inexistante et continué de passer.
// On déclare donc la forme réellement touchée. Elle est partielle par
// construction : ce qui n'est pas écrit ici n'est pas manipulé.
interface DocTest {
  screens: { id: string; requiredRightId?: string }[];
  navigation: { entryScreenId: string; routes: { id: string }[] };
  entities: { fields: { id: string }[] }[];
  access?: {
    rights: { id: string; name?: string; label?: { locale: string; text: string }[] }[];
    // `rightIds` et `grantsAllRights` sont touchés par les tests du droit sans
    // porteur : les déclarer ici, c'est la raison d'être de cette interface
    // partielle — ce qui n'est pas écrit n'est pas manipulé.
    roles: { id: string; rightIds?: string[]; grantsAllRights?: boolean }[];
    defaultRoleId: string;
  };
  intent: {
    needs: {
      id: string;
      resolution:
        | { kind: "satisfied"; nodeIds: string[] }
        | { kind: "unexpressible"; reason: string; nodeIds?: undefined };
    }[];
  };
}

const lire = (): DocTest =>
  JSON.parse(readFileSync(RACINE + "slices/gestion/gestion.air.json", "utf8")) as DocTest;

/** Le document rendu au contrat d'entrée du validateur, sans passer par `any`. */
const brut = (doc: DocTest) => doc as unknown as Record<string, unknown>;

/**
 * La prémisse d'un test, rendue EXPLICITE.
 *
 * `find` et l'indexation rendent `undefined`, et c'est ce que `any` masquait :
 * un test pouvait muter une propriété d'un objet absent et continuer de passer,
 * ne mesurant plus rien. Ici, une prémisse fausse ÉCHOUE, et elle dit laquelle.
 */
function exige<T>(valeur: T | undefined, quoi: string): T {
  if (valeur === undefined) throw new Error(`prémisse absente du document : ${quoi}`);
  return valeur;
}

describe("contrôle d'accès (AIR 1.28.0)", () => {
  it("le document de gestion, tel qu'il est produit, passe", () => {
    expect(() => assertValidAir(migrateAirDocument(brut(lire())))).not.toThrow();
  });

  it("l'écran d'entrée ne peut pas exiger un droit que le rôle par défaut n'a pas", () => {
    // ── LE DÉFAUT FONDATEUR, et il est arrivé pour de vrai.
    //
    // Un employé dont les droits n'étaient pas encore accordés était mis
    // dehors dès l'ouverture — à la connexion, puis à chaque lancement de
    // l'application installée sur son téléphone. Le propriétaire ne pouvait
    // pas le rencontrer : il voit tout.
    const doc = lire();
    const reserve = exige(
      doc.screens.find((s) => s.requiredRightId !== undefined),
      "un écran exigeant un droit",
    );
    doc.navigation.entryScreenId = reserve.id;

    expect(diagnostiquer(doc)).toContain("AIR_ACCESS_ENTRY_UNREACHABLE");
  });

  it("un écran ne peut pas exiger un droit qui n'est pas déclaré", () => {
    // Sans ce contrôle, la sécurité dépendrait d'une orthographe : un droit
    // mal tapé OUVRIRAIT l'écran à tout le monde au lieu de le fermer.
    const doc = lire();
    exige(doc.screens[1], "un deuxième écran").requiredRightId = "right_nexistepas";
    expect(diagnostiquer(doc)).toContain("AIR_ACCESS_RIGHT_UNKNOWN");
  });

  it("le rôle par défaut doit exister, sinon un nouveau compte n'a aucun statut", () => {
    const doc = lire();
    exige(doc.access, "le bloc access").defaultRoleId = "role_fantome";
    expect(diagnostiquer(doc)).toContain("AIR_ACCESS_DEFAULT_ROLE_UNKNOWN");
  });

  it("un droit nommé SANS bloc access ne protège rien, et c'est refusé", () => {
    // Il se lirait comme une précaution et n'en serait pas une. Mieux vaut
    // refuser que laisser croire.
    const doc = lire();
    delete doc.access;
    expect(diagnostiquer(doc)).toContain("AIR_ACCESS_SANS_DECLARATION");
  });

  it("un document SANS droits ni access reste valide — l'ajout est additif", () => {
    // Toutes les applications ne sont pas des systèmes de gestion. Une
    // boutique n'a pas d'employés, et lui imposer un modèle d'accès
    // reviendrait à inventer une organisation qu'elle n'a pas.
    const doc = lire();
    delete doc.access;
    for (const s of doc.screens) delete s.requiredRightId;
    // ── ET LES BESOINS QUI S'ADOSSAIENT À CES DROITS PARTENT AVEC EUX.
    //
    // Retirer `access` sans toucher à `intent.needs` laissait deux besoins se
    // déclarer PORTÉS par `right_stock`, `role_employe` et leurs pareils — des
    // nœuds qui venaient d'être supprimés. Le cliquet AIR_NEED_NODE_UNKNOWN l'a
    // fait voir, avec 16 diagnostics. Ce n'est pas lui qui a tort : une
    // boutique sans employés n'a pas « le besoin des droits par section »
    // porté, elle ne l'a pas du tout.
    doc.intent.needs = doc.intent.needs.filter((n) =>
      n.resolution.kind !== "satisfied"
        ? true
        : !n.resolution.nodeIds.some((id: string) => /^(right|role)_/.test(id)),
    );
    expect(() => assertValidAir(migrateAirDocument(brut(doc)))).not.toThrow();
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
function diagnostiquer(doc: DocTest): string[] {
  try {
    assertValidAir(migrateAirDocument(brut(doc)));
    return [];
  } catch (e) {
    const liste = (e as { diagnostics?: { code: string }[] }).diagnostics;
    if (liste === undefined) throw e;
    return liste.map((d) => d.code);
  }
}

// ════════════════════════════════════════════════════════════════════
//  UN DROIT QUE PERSONNE NE PEUT TENIR (2026-10-05).
//
// Trois contrôles d'accès existaient : droit non DÉCLARÉ, écran D'ENTRÉE fermé
// au rôle par défaut, droit DÉLÉGABLE sans porteur. Le cas général manquait —
// un droit exigé par n'importe quel écran ou geste, qu'aucun rôle n'accorde.
//
// Le raisonnement du contrôle de délégation s'applique ici et plus fort : là-bas
// « le mandataire exercerait un pouvoir que son mandant n'a pas » ; ici PERSONNE
// ne peut ouvrir l'écran, jamais, et toutes les portes du dépôt restent vertes.
//
// Repéré en dérivant le contrat d'API d'une tontine : la table des rôles donnée
// au développeur du serveur affichait « aucun droit » pour le Président.
// C'était un défaut du dérivateur (`grantsAllRights` non lu) et non du
// document — mais la question posée était bonne, et rien ne la posait.
// ════════════════════════════════════════════════════════════════════

/**
 * Le document réel, avec UN droit de plus que personne n'accorde, exigé par un
 * écran qui n'est pas l'entrée.
 *
 * Pas d'écran d'entrée : son cas est DÉJÀ couvert par
 * `AIR_ACCESS_ENTRY_UNREACHABLE`, et le viser ici ne prouverait rien de neuf.
 */
function docAvecDroitOrphelin(): DocTest {
  const doc = lire();
  if (doc.access === undefined) throw new Error("prémisse absente : le document porte access");
  // Un droit COMPLET : le schéma exige `name` et `label`. La première version
  // n'envoyait que l'identifiant, et les quatre tests échouaient au parse —
  // sur une erreur de forme, pas sur le contrôle qu'ils visent.
  doc.access.rights.push({
    id: "right_orphelin",
    name: "orphelin",
    label: [{ locale: "fr", text: "Droit que personne n'accorde" }],
  });
  const autre = doc.screens.find((s) => s.id !== doc.navigation.entryScreenId);
  if (autre === undefined) throw new Error("prémisse absente : un écran hors entrée");
  autre.requiredRightId = "right_orphelin";
  // ── LE GARANT GARDE SES DROITS, MAIS PLUS SA CARTE BLANCHE.
  //
  // Deux erreurs successives ici, et la seconde valait la première.
  //
  // ① Le document de référence porte `role_proprietaire` avec
  //    `grantsAllRights: true` : il tient DÉJÀ tout droit ajouté, celui-ci
  //    compris. Attendre un diagnostic était attendre l'impossible.
  //
  // ② Lui retirer `grantsAllRights` a orphelin TOUS les autres droits du
  //    document — onze écrans d'un coup. Le test mesurait alors un dégât
  //    collatéral, pas le cas qu'il visait.
  //
  // On énumère donc ce que la carte blanche accordait : le document reste
  // exactement aussi valide qu'avant, et UN SEUL droit est sans porteur.
  for (const r of doc.access.roles) {
    if (r.grantsAllRights !== true) continue;
    r.rightIds = doc.access.rights.map((x) => x.id).filter((id) => id !== "right_orphelin");
    delete r.grantsAllRights;
  }
  return doc;
}

describe("un droit exigé que personne ne peut tenir", () => {
  it("un ÉCRAN qui exige un droit sans porteur est REFUSÉ", () => {
    expect(diagnostiquer(docAvecDroitOrphelin())).toContain("AIR_DROIT_EXIGE_SANS_PORTEUR");
  });

  it("un rôle ORDINAIRE qui l'accorde suffit à le rendre valide", () => {
    // Le contrôle doit mordre ET laisser passer : un contrôle qui refuse tout
    // ne prouve rien.
    const doc = docAvecDroitOrphelin();
    doc.access?.roles[0]?.rightIds?.push("right_orphelin");
    expect(diagnostiquer(doc)).not.toContain("AIR_DROIT_EXIGE_SANS_PORTEUR");
  });

  it("un rôle `grantsAllRights` le porte AUSSI, sans l'énumérer", () => {
    // Le défaut qui m'a trompé en lisant le document de la tontine : un rôle
    // de garant n'énumère rien et porte tout. Lire `rightIds` seul fait croire
    // qu'il n'a aucun droit — et dans un contrat remis à un tiers, cette
    // lecture fait implémenter l'autorisation inverse.
    const doc = docAvecDroitOrphelin();
    const garant = doc.access?.roles[0];
    if (garant === undefined) throw new Error("prémisse absente : un rôle");
    garant.grantsAllRights = true;
    expect(diagnostiquer(doc)).not.toContain("AIR_DROIT_EXIGE_SANS_PORTEUR");
  });

  it("un droit DÉCLARÉ et jamais exigé reste valide", () => {
    // Un droit en réserve n'est pas un défaut : il n'enferme personne. Seul
    // l'écran ou le geste qui l'EXIGE rend son absence de porteur fatale.
    const doc = lire();
    doc.access?.rights.push({
    id: "right_en_reserve",
    name: "en_reserve",
    label: [{ locale: "fr", text: "Droit en réserve" }],
  });
    expect(diagnostiquer(doc)).not.toContain("AIR_DROIT_EXIGE_SANS_PORTEUR");
  });
});
