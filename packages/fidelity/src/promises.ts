// GATE DES PROMESSES — PHASE 10B, critère F1.
//
// Fait fondateur (`APP-D004`) : 227 `expectedTests` étaient déclarés au corpus
// et leurs SEULS consommateurs étaient le validateur (unicité d'identifiant) et
// le rendu texte. **Personne ne les exécutait.** Mesuré à la première
// confrontation : 167 sur 227 visaient une cible qui ne fonctionne pas.
//
// Ce module confronte chaque promesse à l'état RÉEL de sa cible dans le
// document, croisé avec l'enveloppe d'exécution du moteur. Il est PUR : il
// n'exécute ni ne compile rien.
//
// 🔴 LIMITE INSCRITE DANS L'INSTRUMENT : une cible vivante n'est PAS une
// promesse tenue. Vérifier « le total additionne correctement » exigerait
// d'exécuter une logique que le moteur n'exécute pas. Cette gate établit une
// **CONDITION NÉCESSAIRE** — rien de plus, et elle le dit dans son propre
// rapport (`limites`). `P-C` : `PARTIAL → PASS` ❌.
import type { ProjectAir } from "@deribfy/air-schema";
import {
  type ExecutionEnvelope,
  controls,
  dataBindings,
  reachableScreens,
} from "@deribfy/execution-contract";

export type PromiseState =
  /** La cible existe et fonctionne. CONDITION NÉCESSAIRE satisfaite — pas la promesse. */
  | "cible_vivante"
  /** La cible existe mais ne fonctionne pas : rien ne peut tenir cette promesse. */
  | "cible_morte"
  /** La cible n'est pas déclarée par le document. */
  | "cible_inexistante";

export type TargetKind =
  | "screen"
  | "action"
  | "entity"
  // ── EP-204 — LES SEPT FAMILLES QUE LE VALIDATEUR ACCEPTE ET QUE CET
  // ÉVALUATEUR IGNORAIT. Le validateur a été ÉLARGI les 2026-09-10 puis
  // 2026-09-11 (`validate.ts`, règle 11), délibérément et sur mesure :
  // « un test sur un bloc vivant — la liste du catalogue montre les produits —
  // est une promesse parfaitement vérifiable ». Depuis ce jour il accepte les
  // DIX familles de nœuds du document ; celui-ci n'en connaissait que TROIS et
  // rendait `cible_inexistante` pour les sept autres.
  | "block"
  | "field"
  | "route"
  | "dataset"
  | "rule"
  | "integration"
  | "capability"
  | "inconnu";

export interface PromiseVerdict {
  readonly testId: string;
  readonly kind: string;
  readonly targetId: string;
  readonly targetKind: TargetKind;
  readonly state: PromiseState;
  /** Pourquoi ce verdict — jamais un code nu, toujours la cause mesurée. */
  readonly motif: string;
}

export interface PromiseCoverage {
  /** Écrans atteignables couverts par ≥ 1 promesse. */
  readonly screens: readonly [covered: number, total: number];
  /** Actions réellement exécutées par le moteur, couvertes par ≥ 1 promesse. */
  readonly actions: readonly [covered: number, total: number];
  /** Entités rendues avec des données, couvertes par ≥ 1 promesse. */
  readonly entities: readonly [covered: number, total: number];
}

export interface PromiseReport {
  readonly verdicts: readonly PromiseVerdict[];
  readonly declared: number;
  readonly vivantes: number;
  readonly mortes: number;
  readonly inexistantes: number;
  /** Ce que l'artefact promet et qui n'est PAS mesuré ici. Toujours non vide. */
  readonly limites: readonly string[];
  readonly coverage: PromiseCoverage;
  readonly passed: boolean;
  /** Vide si `passed`. Sinon, une raison par cause distincte. */
  readonly failures: readonly string[];
}

const LIMITES: readonly string[] = [
  "L'ÉNONCÉ de chaque promesse n'est pas vérifié : une cible vivante n'est pas une promesse tenue.",
  "Aucune exécution n'a lieu — la mesure porte sur le document croisé avec l'enveloppe déclarée du moteur.",
  "La COUVERTURE est publiée mais ne fait pas échouer : aucun seuil n'a été arbitré.",
];

/**
 * Confronte les promesses d'un document à l'état réel de leurs cibles.
 *
 * FAIL-CLOSED sur le silence : un document qui ne déclare AUCUNE promesse
 * n'obtient pas un vert. Sans cette règle, la gate serait triviale à contourner
 * — il suffirait de ne rien promettre pour tout passer. C'est exactement le
 * défaut de « gate satisfaite par un artefact que personne n'a exploité »
 * (règle de composition 4 du GATE_REGISTER).
 */
export function evaluatePromises(
  air: ProjectAir,
  envelope: ExecutionEnvelope,
): PromiseReport {
  const atteignables = new Set(reachableScreens(air, envelope.triggers));
  const recensement = controls(air, envelope);
  const actionsVivantes = new Set([
    ...recensement.filter((c) => c.executed).map((c) => c.actionId),
    // SLOTS LIÉS (1.3.0, D-058) — un slot n'est pas un contrôle : il n'est pas
    // déclenché par une pression, il est CALCULÉ au rendu de l'écran et ses
    // sorties alimentent les props des blocs ciblés. `controls()` ne peut donc
    // pas le voir, et `effects` ne doit pas le porter (ce serait faire mentir
    // l'enveloppe sur le dispatcher). Sa vie se mesure ici, à sa condition
    // exacte : la liaison. Sans liaison, il reste mort.
    ...air.actions
      .filter((a) => a.effect.kind === "slot" && a.effect.binding !== undefined)
      .map((a) => a.id),
  ]);
  const actionsById = new Map(air.actions.map((a) => [a.id, a]));
  const entitesRendues = new Set(
    dataBindings(air)
      .filter((b) => b.seeded)
      .map((b) => b.entityId),
  );
  const ecrans = new Set(air.screens.map((s) => s.id));
  const entites = new Set(air.entities.map((e) => e.id));

  // ── EP-204 · LES SEPT FAMILLES MANQUANTES, CHACUNE AVEC SA CONDITION DE VIE.
  //
  // LE DÉFAUT MESURÉ : `v3/kaviva-spa` était déclaré 20/39 — 19 promesses
  // « à CIBLE INEXISTANTE ». Or les 19 cibles EXISTENT toutes : 12 blocs,
  // 5 champs, 1 route, 1 dataset, tous déclarés, tous acceptés par le
  // validateur. Aucune n'était absente. Le document était bon ; la MESURE
  // était fausse, et elle a fait rougir la gate de fidélité.
  //
  // CE N'EST PAS UN ÉLARGISSEMENT COMPLAISANT. Rien n'est réputé vivant parce
  // qu'il est déclaré — c'est exactement l'erreur que cet évaluateur existe
  // pour ne pas commettre. Chaque famille reçoit la condition de vie de ce
  // dont elle DÉPEND, et chacune peut rendre MORTE :
  //   · bloc      → il ne se rend que si son écran est ATTEIGNABLE ;
  //   · route     → elle ne mène quelque part que si cet écran l'est ;
  //   · champ     → rien ne l'affiche si son entité n'est pas rendue ;
  //   · dataset   → il n'alimente rien si son entité n'est pas rendue ;
  //   · règle     → morte si l'enveloppe ne les applique pas ;
  //   · capacité  → vivante si l'enveloppe déclare une méthode EXÉCUTÉE ;
  //   · intégra.  → morte si elle ne porte aucune capacité exécutée : rien ne
  //                 la câble (c'est la règle du juge EP-176).
  const ecranDuBloc = new Map(
    air.screens.flatMap((sc) => sc.blocks.map((b) => [b.id, sc.id] as const)),
  );
  const ecranDeLaRoute = new Map(air.navigation.routes.map((r) => [r.id, r.screenId] as const));
  const entiteDuChamp = new Map(
    air.entities.flatMap((e) => e.fields.map((f) => [f.id, e.id] as const)),
  );
  const entiteDuDataset = new Map(air.datasets.map((d) => [d.id, d.entityId] as const));
  const regles = new Set(air.rules.map((r) => r.id));
  const capacites = new Set(air.capabilities.map((c) => c.capability));
  const integrationsById = new Map(air.integrations.map((x) => [x.id, x] as const));
  const capaciteExecutee = (c: string): boolean =>
    (envelope.capabilityMethodsExecutees[c] ?? []).length > 0;

  // `expectedTests` est REQUIS par le schéma : pas de garde `?? []` — elle
  // laisserait croire que le champ peut manquer, et masquerait une régression
  // du schéma derrière un tableau vide silencieux.
  const verdicts: PromiseVerdict[] = air.expectedTests.map((t) => {
    const base = { testId: t.id, kind: t.kind, targetId: t.targetId };
    if (ecrans.has(t.targetId)) {
      return atteignables.has(t.targetId)
        ? { ...base, targetKind: "screen" as const, state: "cible_vivante" as const, motif: "écran atteignable depuis l'entrée" }
        : { ...base, targetKind: "screen" as const, state: "cible_morte" as const, motif: "écran INATTEIGNABLE : aucun chemin d'exécution n'y mène" };
    }
    const action = actionsById.get(t.targetId);
    if (action !== undefined) {
      return actionsVivantes.has(t.targetId)
        ? { ...base, targetKind: "action" as const, state: "cible_vivante" as const, motif: "action câblée sur un bloc et exécutée par le moteur" }
        : {
            ...base,
            targetKind: "action" as const,
            state: "cible_morte" as const,
            motif:
              action.effect.kind === "slot"
                ? `slot \`${action.effect.slotId}\` SANS LIAISON : le moteur ne sait ni quoi lui donner, ni où mettre son résultat — il ne l'appelle pas`
                : `effet \`${action.effect.kind}\` / déclencheur \`${action.trigger.kind}\` HORS ENVELOPPE, ou action câblée sur aucun bloc — rien ne s'exécute`,
          };
    }
    if (entites.has(t.targetId)) {
      return entitesRendues.has(t.targetId)
        ? { ...base, targetKind: "entity" as const, state: "cible_vivante" as const, motif: "entité liée à un bloc rendu et alimentée" }
        : { ...base, targetKind: "entity" as const, state: "cible_morte" as const, motif: "entité liée à AUCUN bloc rendu, ou sans dataset — rien ne s'affiche" };
    }
    const ecranPorteur = ecranDuBloc.get(t.targetId);
    if (ecranPorteur !== undefined) {
      return atteignables.has(ecranPorteur)
        ? { ...base, targetKind: "block" as const, state: "cible_vivante" as const, motif: `bloc rendu sur l'écran atteignable \`${ecranPorteur}\`` }
        : { ...base, targetKind: "block" as const, state: "cible_morte" as const, motif: `bloc porté par l'écran INATTEIGNABLE \`${ecranPorteur}\` — il ne se rend jamais` };
    }
    const ecranVise = ecranDeLaRoute.get(t.targetId);
    if (ecranVise !== undefined) {
      return atteignables.has(ecranVise)
        ? { ...base, targetKind: "route" as const, state: "cible_vivante" as const, motif: `route vers l'écran atteignable \`${ecranVise}\`` }
        : { ...base, targetKind: "route" as const, state: "cible_morte" as const, motif: `route vers l'écran INATTEIGNABLE \`${ecranVise}\` — elle ne mène nulle part` };
    }
    const entitePorteuse = entiteDuChamp.get(t.targetId);
    if (entitePorteuse !== undefined) {
      return entitesRendues.has(entitePorteuse)
        ? { ...base, targetKind: "field" as const, state: "cible_vivante" as const, motif: `champ de l'entité rendue \`${entitePorteuse}\`` }
        : { ...base, targetKind: "field" as const, state: "cible_morte" as const, motif: `champ de l'entité \`${entitePorteuse}\`, liée à AUCUN bloc rendu — rien ne l'affiche` };
    }
    const entiteAlimentee = entiteDuDataset.get(t.targetId);
    if (entiteAlimentee !== undefined) {
      return entitesRendues.has(entiteAlimentee)
        ? { ...base, targetKind: "dataset" as const, state: "cible_vivante" as const, motif: `dataset alimentant l'entité rendue \`${entiteAlimentee}\`` }
        : { ...base, targetKind: "dataset" as const, state: "cible_morte" as const, motif: `dataset de l'entité \`${entiteAlimentee}\`, qu'aucun bloc rendu n'affiche — il n'alimente rien` };
    }
    if (regles.has(t.targetId)) {
      return envelope.rulesEnforced
        ? { ...base, targetKind: "rule" as const, state: "cible_vivante" as const, motif: "règle appliquée par le moteur (enveloppe)" }
        : { ...base, targetKind: "rule" as const, state: "cible_morte" as const, motif: "l'enveloppe déclare que les règles ne sont appliquées NULLE PART — rien ne la fait respecter" };
    }
    if (capacites.has(t.targetId)) {
      return capaciteExecutee(t.targetId)
        ? { ...base, targetKind: "capability" as const, state: "cible_vivante" as const, motif: "capacité dont l'enveloppe déclare au moins une méthode EXÉCUTÉE" }
        : { ...base, targetKind: "capability" as const, state: "cible_morte" as const, motif: "capacité dont l'enveloppe n'exécute AUCUNE méthode — l'appel n'a jamais lieu" };
    }
    const integration = integrationsById.get(t.targetId);
    if (integration !== undefined) {
      return integration.capability !== undefined && capaciteExecutee(integration.capability)
        ? { ...base, targetKind: "integration" as const, state: "cible_vivante" as const, motif: `intégration portant la capacité exécutée \`${integration.capability}\`` }
        : {
            ...base,
            targetKind: "integration" as const,
            state: "cible_morte" as const,
            motif:
              integration.capability === undefined
                ? "intégration ne portant AUCUNE capacité — le moteur ne l'émet pas (règle EP-176)"
                : `intégration portant \`${integration.capability}\`, dont l'enveloppe n'exécute aucune méthode`,
          };
    }
    return {
      ...base,
      targetKind: "inconnu" as const,
      state: "cible_inexistante" as const,
      motif: "la cible n'est AUCUN nœud déclaré de ce document",
    };
  });

  const cibles = new Set(verdicts.map((v) => v.targetId));
  const inter = (candidats: Iterable<string>): readonly [number, number] => {
    const all = [...candidats];
    return [all.filter((id) => cibles.has(id)).length, all.length] as const;
  };

  const mortes = verdicts.filter((v) => v.state === "cible_morte").length;
  const inexistantes = verdicts.filter((v) => v.state === "cible_inexistante").length;
  const failures: string[] = [];
  if (verdicts.length === 0) {
    failures.push(
      "AUCUNE promesse déclarée : la fidélité ne peut pas être établie sur le silence — un document qui ne promet rien ne passe pas.",
    );
  }
  if (mortes > 0) failures.push(`${mortes} promesse(s) à CIBLE MORTE`);
  if (inexistantes > 0) failures.push(`${inexistantes} promesse(s) à CIBLE INEXISTANTE`);

  return {
    verdicts,
    declared: verdicts.length,
    vivantes: verdicts.filter((v) => v.state === "cible_vivante").length,
    mortes,
    inexistantes,
    limites: LIMITES,
    coverage: {
      screens: inter(atteignables),
      actions: inter(actionsVivantes),
      entities: inter(entitesRendues),
    },
    passed: failures.length === 0,
    failures,
  };
}
