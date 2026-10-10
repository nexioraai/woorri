// ════════════════════════════════════════════════════════════════════
//  LES POLITIQUES D'ACCÈS AUX DONNÉES SE DÉRIVENT DU CONTRAT.
//
// ── LE DÉFAUT QUE CE FICHIER EXISTE POUR RENDRE IMPOSSIBLE.
//
// Mesure publique, CVE-2025-48757 : 170+ applications générées par un
// concurrent ont exposé e-mails, téléphones, données de paiement et clés
// d'API tierces — 303 points d'entrée, certains en ÉCRITURE. Cause racine :
// le générateur émettait des `create table` SANS activer la sécurité par
// ligne ni écrire une seule politique, pendant que l'application interrogeait
// la base DIRECTEMENT depuis le client avec la clef publique. Sans politique,
// cette clef lisait des tables entières.
//
// La réponse du concurrent fut un scanner qui vérifie que la sécurité par
// ligne est ACTIVÉE. Il ne vérifie pas que les politiques FONT quelque chose.
// C'est la nuance que ce module existe pour ne pas laisser ouverte.
//
// ── POURQUOI DÉRIVER PLUTÔT QUE DEMANDER AU MODÈLE.
//
// La littérature situe les défauts du code généré par IA dans « la gestion
// d'erreur, les cas limites, la concurrence et LES FRONTIÈRES DE SÉCURITÉ ».
// Une politique d'accès EST une frontière de sécurité. On ne la demande donc
// pas : on la CALCULE depuis ce que le document déclare déjà, et un juge
// refuse le document quand le calcul ne trouve pas de réponse. La faille
// devient impossible à ÉMETTRE, au lieu d'être détectable après coup.
//
// ── CE MODULE NE PRODUIT PAS DE SQL.
//
// Il rend un PLAN : qui possède quoi, et quelle politique en découle. Le
// juge (`validate.ts`) et l'émetteur (compilateur) en dérivent chacun leur
// sortie — une seule source, deux consommateurs. Le dépôt a vu quatre fois
// « une liste écrite deux fois diverge ».
// ════════════════════════════════════════════════════════════════════
import type { ProjectAir } from "./air.ts";

/** Comment une table se rattache — ou non — à la personne connectée. */
export type Portee =
  /** C'est l'entité des personnes : une ligne par identité. */
  | { readonly kind: "identite" }
  /** Un champ de cette table pointe la personne : propriété DIRECTE. */
  | { readonly kind: "directe"; readonly fieldId: string }
  /** La propriété passe par d'autres tables — chaîne la plus courte. */
  | {
      readonly kind: "chaine";
      readonly chemin: readonly { readonly entityId: string; readonly fieldId: string }[];
    }
  /** Donnée de vitrine : lecture ouverte ASSUMÉE, écriture fermée. */
  | { readonly kind: "vitrine"; readonly datasetId: string }
  /**
   * DONNÉE DE L'ORGANISATION — découverte en jugeant un système RÉEL.
   *
   * Le premier jet de ce module refusait `gestion` (SGD, en production) :
   * sept entités atteignables, aucune entité de personnes, donc « orphelines ».
   * C'était MON modèle qui manquait, pas le document : les dépenses et les
   * factures d'une entreprise n'appartiennent pas à l'employé qui les saisit.
   * Elles appartiennent à l'organisation, et ce qui en garde l'accès est un
   * DROIT déclaré — `requiredRightId`, posé sur les douze écrans concernés.
   *
   * La condition est STRICTE : toute surface qui atteint l'entité doit porter
   * un droit. Un seul écran nu suffirait à la rendre lisible sans condition —
   * et ce serait la faille, pas le modèle.
   */
  | { readonly kind: "organisation"; readonly droits: readonly string[] }
  /** Aucun chemin, aucune vitrine : le document ne dit pas à qui c'est. */
  | {
      readonly kind: "orpheline";
      /** Elle porte des données de démonstration ET le client l'écrit : la
       *  confusion à nommer, pour que l'auteur comprenne le refus. */
      readonly demoMutee?: string;
    };

export interface PolitiqueTable {
  readonly entityId: string;
  /** Le nom de table — `name` de l'entité, déjà contraint par le schéma. */
  readonly table: string;
  readonly portee: Portee;
  /** Atteignable depuis le client (écran ou action) : c'est ce qui EXPOSE. */
  readonly atteignable: boolean;
  /** `append_only` déclaré : pas de mise à jour, pas de suppression. */
  readonly appendOnly: boolean;
  readonly politiques: readonly Politique[];
}

export interface Politique {
  /** `air_<table>_<droit|portee>_<operation>` — nommée, donc relisible. */
  readonly nom: string;
  readonly operation: "select" | "insert" | "update" | "delete";
  /** Le droit exigé, quand le contrat en attache un à cette opération. */
  readonly rightId?: string;
  /**
   * Le prédicat, en TERMES DU CONTRAT — jamais du SQL : l'émetteur le
   * traduit pour sa cible, et le juge le lit sans connaître de dialecte.
   */
  readonly predicat: Predicat;
}

export type Predicat =
  /** La ligne appartient à la personne connectée (chemin déclaré). */
  | { readonly kind: "proprietaire"; readonly portee: Portee }
  /** Le droit suffit — une opération d'administration déclarée. */
  | { readonly kind: "droit"; readonly rightId: string }
  /** Ouvert à tous : LÉGITIME uniquement sur une vitrine, en lecture. */
  | { readonly kind: "ouvert"; readonly justification: "vitrine" };

export interface PlanAcces {
  /** L'entité qui porte les personnes — `undefined` si le document n'en a pas. */
  readonly entiteIdentite?: string;
  /** D'où vient cette désignation : le contrat doit pouvoir le dire. */
  readonly origineIdentite?: "delegation" | "session";
  readonly tables: readonly PolitiqueTable[];
  /** Le rôle qui traverse tout, quand il est déclaré (`grantsAllRights`). */
  readonly roleTotal?: string;
  readonly roleDefaut?: string;
}

/** Profondeur maximale d'une chaîne de propriété. Bornée, et c'est un choix :
 *  au-delà, « cette ligne appartient à cette personne » cesse d'être une
 *  phrase qu'un propriétaire d'application peut vérifier. */
export const PROFONDEUR_MAX_CHAINE = 3;

/**
 * L'ENTITÉ DES PERSONNES, DÉRIVÉE — jamais devinée.
 *
 * Deux marqueurs, par ordre de force :
 *   ① `access.delegation.subjectEntityId` — le contrat le dit explicitement :
 *      « l'entité qui porte les PERSONNES — celles qui délèguent et reçoivent » ;
 *   ② une action dont l'effet écrit avec `instanceFrom: "session"` — le
 *      contrat dit « la ligne de la PERSONNE CONNECTÉE ».
 * Sans marqueur, il n'y a pas d'identité dans ce document, et ce n'est pas
 * une faute : une vitrine sans compte n'en a pas besoin.
 */
export function entiteDIdentite(
  air: ProjectAir,
): { entityId: string; origine: "delegation" | "session" } | undefined {
  const sujet = air.access?.delegation?.subjectEntityId;
  if (sujet !== undefined) return { entityId: sujet, origine: "delegation" };
  for (const action of air.actions) {
    const effet = action.effect as {
      kind?: string;
      entityId?: string;
      instanceFrom?: string;
    };
    if (effet.kind === "mutation" && effet.instanceFrom === "session" && effet.entityId !== undefined) {
      return { entityId: effet.entityId, origine: "session" };
    }
  }
  return undefined;
}

/** Les entités que le CLIENT peut atteindre : un bloc d'écran les lit, une
 *  action les écrit. C'est cet ensemble qui expose — le reste est interne. */
export function entitesAtteignables(air: ProjectAir): ReadonlySet<string> {
  const vues = new Set<string>();
  for (const ecran of air.screens) {
    for (const bloc of ecran.blocks) {
      if (bloc.entityId !== undefined) vues.add(bloc.entityId);
    }
  }
  for (const action of air.actions) {
    const effet = action.effect as { kind?: string; entityId?: string };
    if (effet.kind === "mutation" && effet.entityId !== undefined) vues.add(effet.entityId);
  }
  // `expectedTests` n'entre PAS ici : un test observe l'atteignabilité, il ne
  // la crée pas. Une cible de test n'ouvre aucune porte au client.
  return vues;
}

/**
 * LA PORTÉE D'UNE TABLE — sa distance à l'identité, par parcours en largeur
 * sur les champs `reference`. La chaîne LA PLUS COURTE gagne : c'est celle
 * qu'un propriétaire peut relire à voix haute.
 */
export function porteeDe(
  air: ProjectAir,
  entityId: string,
  entiteIdentite: string | undefined,
): Portee {
  // Les droits qui gardent CETTE entité : ceux des écrans qui la montrent et
  // des actions qui l'écrivent. `undefined` dès qu'UNE surface est nue.
  const gardes = droitsQuiGardent(air, entityId);
  if (entiteIdentite !== undefined && entityId === entiteIdentite) return { kind: "identite" };

  const parId = new Map(air.entities.map((e) => [e.id, e]));
  if (entiteIdentite !== undefined) {
    // Largeur d'abord : la première solution trouvée EST la plus courte.
    const file: { entityId: string; chemin: { entityId: string; fieldId: string }[] }[] = [
      { entityId, chemin: [] },
    ];
    const vus = new Set<string>([entityId]);
    // `for..of` sur une file qui CROÎT pendant l'itération : c'est bien un
    // parcours en largeur — chaque element pousse ses voisins en fin de file.
    for (const courant of file) {
      if (courant.chemin.length >= PROFONDEUR_MAX_CHAINE) continue;
      const entite = parId.get(courant.entityId);
      if (entite === undefined) continue;
      for (const champ of entite.fields) {
        if (champ.type !== "reference" || champ.referencesEntityId === undefined) continue;
        const chemin = [...courant.chemin, { entityId: courant.entityId, fieldId: champ.id }];
        if (champ.referencesEntityId === entiteIdentite) {
          return chemin.length === 1
            ? { kind: "directe", fieldId: champ.id }
            : { kind: "chaine", chemin };
        }
        if (!vus.has(champ.referencesEntityId)) {
          vus.add(champ.referencesEntityId);
          file.push({ entityId: champ.referencesEntityId, chemin });
        }
      }
    }
  }

  // Pas de chemin vers l'identité : une donnée de VITRINE se lit par tous —
  // mais SEULEMENT si le client ne l'écrit JAMAIS.
  //
  // MESURE QUI A CORRIGÉ CETTE RÈGLE (corpus `resto-quartier`) : six entités
  // y portent un jeu de données, dont `ent_client` et `ent_commande`. Elles
  // n'ont pas ces lignes parce qu'elles sont publiques — elles les ont parce
  // que la vitrine a besoin de données de DÉMONSTRATION. Ma première règle
  // « porte un jeu de données ⇒ lecture publique » aurait donc émis un
  // prédicat toujours vrai sur les fiches clients et les commandes : la
  // catastrophe du concurrent, reproduite par nous. Des données de
  // démonstration ne rendent pas une table publique.
  const jeu = air.datasets.find((d) => d.entityId === entityId);
  const muteeParLeClient = air.actions.some((a) => {
    const effet = a.effect as { kind?: string; entityId?: string };
    return effet.kind === "mutation" && effet.entityId === entityId;
  });
  if (jeu !== undefined && !muteeParLeClient) return { kind: "vitrine", datasetId: jeu.id };

  // Donnée de l'ORGANISATION : pas de propriétaire individuel, mais chaque
  // surface qui y mène exige un droit. C'est effectif — il faut PORTER le
  // droit — et ce n'est pas un prédicat toujours vrai.
  if (gardes !== undefined && gardes.length > 0) return { kind: "organisation", droits: gardes };

  return jeu === undefined ? { kind: "orpheline" } : { kind: "orpheline", demoMutee: jeu.id };
}

/**
 * LES DROITS QUI GARDENT UNE ENTITÉ — ou `undefined` si UNE seule surface
 * l'atteint sans droit. La sévérité est le point : un écran nu rend la table
 * lisible sans condition, et la moyenne des autres n'y change rien.
 */
export function droitsQuiGardent(air: ProjectAir, entityId: string): string[] | undefined {
  const droits = new Set<string>();
  for (const ecran of air.screens) {
    if (!ecran.blocks.some((b) => b.entityId === entityId)) continue;
    if (ecran.requiredRightId === undefined) return undefined;
    droits.add(ecran.requiredRightId);
  }
  for (const action of air.actions) {
    const effet = action.effect as { kind?: string; entityId?: string };
    if (effet.kind !== "mutation" || effet.entityId !== entityId) continue;
    // Une action sans droit sur un écran QUI EN PORTE UN reste gardée par
    // l'écran : c'est lui qui conditionne l'accès au geste.
    const ecran = air.screens.find((s) => s.id === (action.trigger as { screenId?: string }).screenId);
    const garde = action.requiredRightId ?? ecran?.requiredRightId;
    if (garde === undefined) return undefined;
    droits.add(garde);
  }
  return [...droits].sort();
}

/**
 * LE PLAN COMPLET — ce que le juge lit et ce que l'émetteur écrit.
 *
 * Les droits deviennent des politiques NOMMÉES : `requiredRightId` est posé
 * séparément sur les écrans et sur les actions (« trois droits distincts sur
 * le MÊME écran de scan »), donc la lecture et l'écriture ne se confondent
 * pas. `grantsAllRights` NE DÉGÉNÈRE PAS en « ouvert à tous » : il désigne un
 * RÔLE, et le prédicat reste « cette personne porte ce rôle » — un rôle qui
 * traverse n'est pas une table publique.
 */
export function derivePlanAcces(air: ProjectAir): PlanAcces {
  const identite = entiteDIdentite(air);
  const atteignables = entitesAtteignables(air);

  // Le droit qu'exige la LECTURE d'une entité : celui de l'écran qui la
  // montre. Plusieurs écrans, plusieurs droits : on retient l'ensemble.
  const droitsLecture = new Map<string, Set<string>>();
  for (const ecran of air.screens) {
    const droit = ecran.requiredRightId;
    if (droit === undefined) continue;
    for (const bloc of ecran.blocks) {
      if (bloc.entityId === undefined) continue;
      const pour = droitsLecture.get(bloc.entityId) ?? new Set<string>();
      pour.add(droit);
      droitsLecture.set(bloc.entityId, pour);
    }
  }
  // Le droit qu'exige une ÉCRITURE : celui de l'action qui l'effectue.
  const droitsEcriture = new Map<string, Map<string, string>>();
  for (const action of air.actions) {
    const effet = action.effect as { kind?: string; entityId?: string; operation?: string };
    if (effet.kind !== "mutation" || effet.entityId === undefined || effet.operation === undefined) continue;
    const pour = droitsEcriture.get(effet.entityId) ?? new Map<string, string>();
    if (action.requiredRightId !== undefined) pour.set(effet.operation, action.requiredRightId);
    droitsEcriture.set(effet.entityId, pour);
  }

  const roleTotal = air.access?.roles.find((r) => r.grantsAllRights === true)?.id;

  const tables = air.entities.map((entite) => {
    const portee = porteeDe(air, entite.id, identite?.entityId);
    const atteignable = atteignables.has(entite.id);
    const appendOnly = entite.appendOnly === true;
    const politiques: Politique[] = [];

    const nommer = (op: string, suffixe: string): string =>
      `air_${entite.name}_${suffixe}_${op}`;

    if (portee.kind === "vitrine") {
      // LECTURE ouverte, assumée et justifiée. ÉCRITURE : jamais ouverte —
      // une vitrine que le public modifie n'est pas une vitrine.
      politiques.push({
        nom: nommer("select", "vitrine"),
        operation: "select",
        predicat: { kind: "ouvert", justification: "vitrine" },
      });
      if (roleTotal !== undefined) {
        for (const op of ["insert", "update", "delete"] as const) {
          politiques.push({
            nom: nommer(op, "administration"),
            operation: op,
            predicat: { kind: "droit", rightId: roleTotal },
          });
        }
      }
    } else if (portee.kind === "organisation") {
      // Un droit garde chaque opération. Le prédicat EXIGE de porter le
      // droit : effectif, et jamais « toujours vrai ».
      const premier = portee.droits[0] ?? "";
      const ecritures = droitsEcriture.get(entite.id) ?? new Map<string, string>();
      politiques.push({
        nom: nommer("select", premier),
        operation: "select",
        rightId: premier,
        predicat: { kind: "droit", rightId: premier },
      });
      const operations = appendOnly ? (["insert"] as const) : (["insert", "update", "delete"] as const);
      for (const op of operations) {
        const droit = ecritures.get(op === "insert" ? "create" : op) ?? premier;
        politiques.push({
          nom: nommer(op, droit),
          operation: op,
          rightId: droit,
          predicat: { kind: "droit", rightId: droit },
        });
      }
    } else if (portee.kind !== "orpheline") {
      const droitsL = droitsLecture.get(entite.id);
      politiques.push({
        nom: nommer("select", droitsL === undefined ? "proprietaire" : [...droitsL].sort()[0] ?? "proprietaire"),
        operation: "select",
        ...(droitsL === undefined ? {} : { rightId: [...droitsL].sort()[0] }),
        predicat: { kind: "proprietaire", portee },
      });
      const ecritures = droitsEcriture.get(entite.id) ?? new Map<string, string>();
      const operations = appendOnly
        ? (["insert"] as const)
        : (["insert", "update", "delete"] as const);
      for (const op of operations) {
        const droit = ecritures.get(op === "insert" ? "create" : op);
        politiques.push({
          nom: nommer(op, droit ?? "proprietaire"),
          operation: op,
          ...(droit === undefined ? {} : { rightId: droit }),
          predicat: { kind: "proprietaire", portee },
        });
      }
    }
    // orpheline : AUCUNE politique émise. Le juge refusera si elle est
    // atteignable — on ne devine pas un propriétaire qui n'est pas déclaré.

    return { entityId: entite.id, table: entite.name, portee, atteignable, appendOnly, politiques };
  });

  return {
    ...(identite === undefined ? {} : { entiteIdentite: identite.entityId, origineIdentite: identite.origine }),
    tables,
    ...(roleTotal === undefined ? {} : { roleTotal }),
    ...(air.access?.defaultRoleId === undefined ? {} : { roleDefaut: air.access.defaultRoleId }),
  };
}
