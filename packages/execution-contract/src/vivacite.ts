// R6 (EP-062) — JUGE UNIFIÉ DE VIVACITÉ.
//
// THÈME, tiré de la campagne EP-061 : un arc, un contrôle ou une donnée n'est
// réputé VIVANT que s'il est EXÉCUTABLE, pas seulement déclaré. Toute
// vérification qui confronte le plan au document sans confronter le document
// à l'ENVELOPPE est aveugle — c'est la cause commune de l'écran mort
// (scr_cpt_compte_confirmer), des deux contrôles morts (empty_state à
// déclencheur `data`) et du signUp aux quatre params fantômes de la première
// traversée réelle du pipeline.
//
// CE MODULE JUGE, IL NE MESURE PAS : chaque diagnostic est un REFUS destiné
// au chemin d'acceptation de la campagne (même étage que C4/C5 — jamais
// `validateAirBlocks`, qui re-jugerait le corpus gelé : leçon D-105). Les
// instruments de mesure restent dans `graph.ts` ; ce juge les CONSOMME —
// aucune sémantique n'est écrite deux fois (précédent EP-059 : une liste
// écrite deux fois diverge).
//
// FRONTIÈRE ASSUMÉE (consignée EP-062) : le juge refuse ce que le DOCUMENT
// peut corriger (déclencheur hors enveloppe, dispatch absent, param non
// consommé, référence affichée brute, arc insatisfait). Il EXEMPTE la
// limitation-moteur déclarée : un contrôle visant une méthode de capability
// hors `capabilityMethodsExecutees` est un besoin LÉGITIMEMENT déclaré
// (règle 17) que le moteur n'implémente pas encore — le refuser rendrait la
// boucle de réparation INGAGNABLE (précédent mesuré R1/EP-020 : 5
// diagnostics, kaviva). Sa mort reste VISIBLE par la mesure `controls()`.
import type { ProjectAir } from "@deribfy/air-schema";
import type { ExecutionEnvelope, TriggerKind } from "./envelope.ts";
import { areteExecutable, controls, rawReferences, reachableScreens } from "./graph.ts";

type Air = ProjectAir;

export interface VivaciteFinding {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

/** Arc de navigation prescrit par le plan (P2d), en identifiants d'écrans AIR. */
export interface ArcPrescrit {
  readonly de: string;
  readonly vers: string;
}

export interface OptionsVivacite {
  readonly arcsPrescrits?: readonly ArcPrescrit[];
  /** Classe de commerce attendue par l'intention (Conformance). */
  readonly commerceAttendu?: string;
}

/** Clés de params DÉCLARÉES par un effet `capability` (configuration du document). */
function clesDeParams(effect: { params?: unknown }): readonly string[] {
  const p = effect.params;
  if (Array.isArray(p)) {
    return p
      .map((e) => (typeof e === "object" && e !== null ? (e as { key?: unknown }).key : undefined))
      .filter((k): k is string => typeof k === "string");
  }
  if (typeof p === "object" && p !== null) return Object.keys(p);
  return [];
}

export function jugerVivacite(
  air: Air,
  envelope: ExecutionEnvelope,
  options: OptionsVivacite = {},
): readonly VivaciteFinding[] {
  const out: VivaciteFinding[] = [];
  const activable = new Set<TriggerKind>(envelope.triggers);

  // ── 1 · DÉCLENCHEURS — dérivé de l'enveloppe, aucune liste locale.
  for (const action of air.actions) {
    if (!activable.has(action.trigger.kind)) {
      out.push({
        code: "VIVACITE_DECLENCHEUR_HORS_ENVELOPPE",
        path: `actions[${action.id}]`,
        message:
          `le déclencheur "${action.trigger.kind}" n'atteint aucun mécanisme ` +
          `d'activation du moteur (enveloppe : ${envelope.triggers.join(", ")}) : ` +
          `cette action ne peut JAMAIS partir. Déclare un déclencheur de ` +
          `l'enveloppe — un bloc qui dispatche (ui) ou un événement d'écran ` +
          `(lifecycle).`,
      });
    }
  }

  // ── 2 · ÉCRANS — l'atteignabilité sous l'enveloppe, pas sous la déclaration.
  const atteignables = new Set(
    reachableScreens(air, envelope.triggers, envelope.capabilityMethodsExecutees),
  );
  for (const screen of air.screens) {
    if (!atteignables.has(screen.id)) {
      out.push({
        code: "VIVACITE_ECRAN_INATTEIGNABLE",
        path: `screens[${screen.id}]`,
        message:
          `aucun chemin EXÉCUTABLE (déclencheur dans l'enveloppe, origine ` +
          `vivante) ne mène à cet écran : il n'apparaîtra jamais. Câble une ` +
          `arête exécutable depuis un écran vivant, ou retire l'écran.`,
      });
    }
  }

  // ── 3 · CONTRÔLES — un contrôle visible dont l'action ne part pas est un
  // mensonge d'interface. Exemption UNIQUE : la limitation-moteur déclarée
  // (méthode de capability hors enveloppe), voir l'en-tête.
  const actionParId = new Map(air.actions.map((a) => [a.id, a]));
  for (const controle of controls(air, envelope)) {
    if (controle.executed) continue;
    const action = actionParId.get(controle.actionId);
    if (action?.effect.kind === "capability") {
      const methodes = envelope.capabilityMethodsExecutees[action.effect.capability] ?? [];
      if (!methodes.includes(action.effect.method)) continue;
    }
    out.push({
      code: "VIVACITE_CONTROLE_MORT",
      path: `screens[${controle.screenId}].blocks[${controle.blockId}]`,
      message:
        `le contrôle "${controle.blockId}" promet l'action "${controle.actionId}" ` +
        `(${controle.effectKind}) que rien n'exécutera : déclencheur inactivable, ` +
        `dispatch absent, ou effet hors enveloppe. Un contrôle mort est refusé — ` +
        `câble le dispatch (trigger ui sur le bloc, ou prop actionId) avec un ` +
        `effet de l'enveloppe.`,
    });
  }

  // ── 4 · PARAMS DE CAPABILITY — une clé que le fournisseur ne lit pas est
  // une promesse morte AU NIVEAU DU PARAM : l'appel part, la configuration
  // n'est pas trouvée, l'invocation refuse. Dérivé de l'enveloppe (1.1.0).
  // Une capability ABSENTE de la table n'émet pas de code : ses params sont
  // sans objet, la mort est déjà celle de la méthode (exemption du point 3).
  for (const action of air.actions) {
    if (action.effect.kind !== "capability") continue;
    const consommees = envelope.capabilityParamsConsommes[action.effect.capability];
    if (consommees === undefined) continue;
    for (const cle of clesDeParams(action.effect)) {
      if (!consommees.includes(cle)) {
        out.push({
          code: "VIVACITE_PARAM_CAPABILITY_NON_CONSOMME",
          path: `actions[${action.id}].params[${cle}]`,
          message:
            `le param "${cle}" n'est lu par AUCUNE ligne du fournisseur ` +
            `"${action.effect.capability}" (clés consommées : ` +
            `${consommees.join(", ")}) : la configuration qu'il porte est ` +
            `perdue et l'invocation échouera. Utilise les clés consommées, ` +
            `rien d'autre.`,
        });
      }
    }
  }

  // ── 5 · RÉFÉRENCES BRUTES — un champ `reference` AFFICHÉ rend un
  // identifiant (`relationTraversal: false` : aucun bloc n'affiche un champ
  // de l'entité cible). Le document choisit ses champs d'affichage : il peut
  // corriger.
  for (const ref of rawReferences(air)) {
    out.push({
      code: "VIVACITE_REFERENCE_BRUTE_AFFICHEE",
      path: `screens[${ref.screenId}].blocks[${ref.blockId}].${ref.propKey}`,
      message:
        `le champ "${ref.fieldId}" est une référence vers "${ref.targetEntityId}" ` +
        `et serait rendu en IDENTIFIANT BRUT (le moteur ne traverse pas les ` +
        `relations à l'affichage). Affiche un champ propre à l'entité du bloc.`,
    });
  }

  // ── 6 · ARCS PRESCRITS — un arc du plan n'est satisfait que par une arête
  // EXÉCUTABLE (même sémantique que l'atteignabilité : `areteExecutable`,
  // source unique), ou par la barre persistante (une destination primaire
  // est atteignable de partout — D-099).
  const arcs = options.arcsPrescrits ?? [];
  if (arcs.length > 0) {
    const aretes = air.actions
      .map((a) => areteExecutable(air, a, activable, envelope.capabilityMethodsExecutees))
      .filter((a): a is NonNullable<typeof a> => a !== undefined);
    const ecranDeRoute = new Map(air.navigation.routes.map((r) => [r.id, r.screenId]));
    const racinesPrimaires = new Set(
      (air.navigation.primary?.destinations ?? [])
        .map((d) => ecranDeRoute.get(d.routeId))
        .filter((e): e is string => e !== undefined),
    );
    for (const arc of arcs) {
      if (racinesPrimaires.has(arc.vers)) continue;
      const satisfait = aretes.some(
        (a) => a.cible === arc.vers && (a.origine === undefined || a.origine === arc.de),
      );
      // EP-099 (L-098-A) — LIMITATION-MOTEUR DÉCLARÉE : un arc dont la
      // SEULE réalisation possible passe par une capability que le moteur
      // n'exécute pas (mesuré : marketplace, payer ⇒ payments.psp.
      // startCheckout, thenScreenId correctement posé) n'est PAS un défaut
      // du document — le générateur a écrit exactement ce que le contrat
      // demande. Le refuser rendrait la boucle de réparation INGAGNABLE
      // (précédent R1/EP-020, exemption identique déjà en vigueur pour
      // VIVACITE_CONTROLE_MORT). La mort reste VISIBLE : l'écran cible sort
      // en VIVACITE_ECRAN_INATTEIGNABLE si rien d'autre ne l'atteint.
      // DISCRIMINANT FIN (corrigé après morsure de 4 preuves EP-064) : la
      // capability est-elle ABSENTE de la table — donc AUCUNE méthode
      // exécutable, le document n'a aucune alternative (limitation-moteur,
      // exemption) — ou bien implémentée mais la MÉTHODE mal choisie, et
      // c'est alors une faute du document qui reste refusée (B3/EP-064).
      const tenteParCapabilite = air.actions.some(
        (a) =>
          a.effect.kind === "capability" &&
          a.effect.thenScreenId === arc.vers &&
          envelope.capabilityMethodsExecutees[a.effect.capability] === undefined,
      );
      if (!satisfait && tenteParCapabilite) continue;
      if (!satisfait) {
        // EP-115 — LE DIAGNOSTIC DIT LAQUELLE ÉTAIT ATTENDUE. Mesuré
        // (EP-114) : le générateur atteint bien la cible, mais depuis un
        // AUTRE écran — le message doit nommer ce cas précis, sinon il
        // décrit un manque là où il y a un mauvais point de départ.
        const ailleurs = aretes
          .filter((a) => a.cible === arc.vers && a.origine !== undefined && a.origine !== arc.de)
          .map((a) => a.origine);
        out.push({
          code: "VIVACITE_ARC_PRESCRIT_INEXECUTABLE",
          path: `navigation[${arc.de}->${arc.vers}]`,
          message:
            `l'arc prescrit ${arc.de} -> ${arc.vers} n'est satisfait par AUCUNE ` +
            `arête exécutable : une déclaration à déclencheur hors enveloppe ne ` +
            `satisfait aucun arc. Câble une action exécutable depuis ` +
            `"${arc.de}" (ou via une écriture réussie, thenScreenId).` +
            (ailleurs.length === 0
              ? ""
              : ` LA CIBLE EST POURTANT ATTEINTE — mais depuis ${[...new Set(ailleurs)].join(", ")}, ` +
                `PAS depuis "${arc.de}" : c'est la SOURCE qui manque, pas la destination. ` +
                `Une action vers la même cible depuis un autre écran ne remplace jamais celle-ci.`),
        });
      }
    }
  }

  // ── 7 · CONFORMANCE — la classe de commerce ÉMISE doit être celle que
  // l'intention attend. Divergence mesurée EP-061 : none vs
  // physical_or_offapp, consignée puis jugée ici.
  if (
    options.commerceAttendu !== undefined &&
    air.compliance.commerceClass !== options.commerceAttendu
  ) {
    out.push({
      code: "CONFORMANCE_COMMERCE_DIVERGENT",
      path: "compliance.commerceClass",
      message:
        `l'intention attend la classe de commerce "${options.commerceAttendu}" ` +
        `et le document déclare "${air.compliance.commerceClass}" : la ` +
        `déclaration de conformité ne décrit pas l'application demandée.`,
    });
  }

  return out;
}

/**
 * R6 (EP-062) — PREUVE D'EXÉCUTION DES INSTRUMENTS.
 *
 * « round-trip conformes 0/1 » affiché pour un instrument JAMAIS APPELÉ est
 * un faux négatif silencieux — même famille que l'écran mort : une vérité
 * d'écran sans vérité de moteur. Tout instrument attendu qui ne peut pas
 * prouver qu'il a tourné est NOMMÉ ; aucun chiffre ne se rend sans
 * attestation.
 */
export function jugerAttestations(
  instrumentsAttendus: readonly string[],
  instrumentsExecutes: ReadonlySet<string>,
): readonly VivaciteFinding[] {
  return instrumentsAttendus
    .filter((nom) => !instrumentsExecutes.has(nom))
    .map((nom) => ({
      code: "INSTRUMENT_NON_EXECUTE",
      path: `instruments[${nom}]`,
      message:
        `l'instrument "${nom}" n'a pas tourné : aucun chiffre ne peut être ` +
        `rendu en son nom. Afficher un compte (même 0/N) pour un instrument ` +
        `non exécuté est un faux négatif silencieux.`,
    }));
}
