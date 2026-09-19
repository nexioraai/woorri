// EP-073 — JUGES D'ACCEPTATION DE LA CAMPAGNE, extraits d'emit-v3.
//
// POURQUOI CE MODULE EXISTE : emit-v3 refuse tout import (garde EP-065 — un
// script qui dépense au chargement est une arme posée sur la table), mais la
// convergence des réparations se mesure en RE-JUGEANT des artefacts archivés,
// à 0 $. Les juges n'ont ni dialecte fournisseur ni dépense : ils vivent ici,
// importables ; emit-v3 les consomme — mêmes objets aux deux attempts (R6).
// AUCUNE règle n'a bougé dans l'extraction : le corps est celui d'emit-v3,
// déplacé tel quel (les cliquets de contenu le vérifient).
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = join(fileURLToPath(import.meta.url), "..");
const REPO = join(HERE, "..", "..");
const airSchema = await import(join(REPO, "packages/air-schema/src/index.ts"));
const blocksRegistry = await import(join(REPO, "packages/blocks/src/registry.ts"));
const registry = await import(join(REPO, "packages/capability-registry/src/index.ts"));
const compiler = await import(join(REPO, "packages/compiler/src/index.ts"));
const fidelity = await import(join(REPO, "packages/fidelity/src/index.ts"));
const executionGraph = await import(join(REPO, "packages/execution-contract/src/graph.ts"));
const executionContract = await import(join(REPO, "packages/execution-contract/src/envelope.ts"));
const vivacite = await import(join(REPO, "packages/execution-contract/src/vivacite.ts"));
const presentation = await import(join(REPO, "packages/execution-contract/src/presentation.ts"));
const ENV = executionContract.EXECUTION_ENVELOPE_V1;
const modeleMetier = await import(join(HERE, "modele-metier.mjs"));

// R6 (EP-062) — JUGES D'ACCEPTATION, écrits UNE fois pour les DEUX attempts.
//
// La campagne EP-061 avait la navigation prescrite à l'attempt 1 et PAS à
// l'attempt 2 (seul `validateLocal` re-tournait après réparation) : un juge
// présent à un attempt sur deux ne juge pas. Ici vivent TOUS les juges
// au-delà du schéma : navigation prescrite (R5), vivacité et conformance
// (R6, document confronté à l'ENVELOPPE — un déclencheur hors enveloppe ne
// satisfait aucun arc, un contrôle non câblé est refusé, un param non
// consommé est refusé, une référence affichée brute est refusée).
/**
 * EP-102 — PÉRIMÈTRE DE JUGEMENT : quels juges ont RÉELLEMENT tourné.
 *
 * MOTIF (règle générale, consignée) : un compteur qui compare deux états
 * dont l'un n'est pas observable mesure autre chose que ce qu'il croit.
 * Mesuré : un document schéma-invalide ne porte QU'UN diagnostic (le parse
 * s'arrête) ; la réparation qui rétablit le schéma fait APPARAÎTRE les
 * diagnostics sémantiques — la gate anti-oscillation les comptait comme
 * « introduits » et gardait le document INVALIDE.
 *
 * Le discriminant est la COMPARABILITÉ, jamais l'invalidité : deux documents
 * ne se comparent que s'ils ont été soumis AU MÊME ENSEMBLE de juges. Un
 * périmètre plus large n'est pas une régression — c'est une mesure plus
 * complète ; un périmètre plus étroit en est une.
 */
export function perimetreDeJugement(air, prescriptif) {
  if (air === null) return [];
  const perimetre = ["schema", "semantique"];
  if (prescriptif !== undefined) perimetre.push("prescriptions");
  return perimetre;
}

/** Comparables ⇔ MÊME périmètre. Sinon la comparaison n'a pas de base. */
export function sontComparables(perimetreA, perimetreB) {
  return (
    perimetreA.length === perimetreB.length &&
    perimetreA.every((f) => perimetreB.includes(f))
  );
}

/**
 * Le périmètre B ÉLARGIT-il A ? (A strictement inclus dans B) — une
 * réparation qui rend jugeable ce qui ne l'était pas RÉVÈLE, elle
 * n'introduit pas.
 */
export function elargit(perimetreAvant, perimetreApres) {
  return (
    perimetreAvant.length < perimetreApres.length &&
    perimetreAvant.every((f) => perimetreApres.includes(f))
  );
}

/**
 * EP-105 — CONSÉQUENCES D'UN RECLASSEMENT D'ÉCRAN, dérivées du document.
 *
 * Le type d'écran est DÉRIVÉ de ses blocs (mesuré). Ajouter un bloc de
 * détail sur un écran qui porte déjà une collection NON SCOPÉE fait
 * basculer cette collection sous C5. Le diagnostic qui ORDONNE d'ajouter un
 * détail doit donc énoncer cette conséquence — sinon il prescrit une
 * réparation qui en viole une autre, et la boucle oscille (3 mesures).
 * La clause nomme les blocs CONCERNÉS du document ; aucun identifiant n'est
 * écrit en dur, aucune règle sur un type de bloc particulier.
 */
export function consequencesDeReclassement(air, screenId) {
  const ecran = air.screens.find((s) => s.id === screenId);
  if (ecran === undefined) return "";
  const aDejaUnDetail = ecran.blocks.some((b) => b.blockType === "detail_header");
  if (aDejaUnDetail) return "";
  const collectionsNues = ecran.blocks.filter(
    (b) =>
      b.blockType === "list" &&
      !(b.props ?? []).some((p) => p.key === "scopeFieldId"),
  );
  if (collectionsNues.length === 0) return "";
  // EP-113 — LE DOMAINE DES VALEURS VALIDES EST FOURNI AVEC L'ORDRE.
  //
  // Mesuré : le réparateur posait un `scopeFieldId` EXISTANT et du BON TYPE
  // (`reference`) — il n'inventait rien — mais sur un écran SANS
  // detail_header, où la portée n'a aucun sens (E2/D-129). Cause : la clause
  // ordonnait « scope-la » sans dire (a) que scoper et poser le détail sont
  // INDISSOCIABLES, ni (b) quels champs sont éligibles. Une prescription qui
  // ordonne sans fournir le domaine des valeurs valides est INCOMPLÈTE —
  // même motif que L-098-C, un cran plus loin. Le domaine est DÉRIVÉ du
  // document (champs `reference` de l'entité listée), jamais écrit en dur.
  const eligibles = (bloc) => {
    const entite = air.entities.find((e) => e.id === bloc.entityId);
    return (entite?.fields ?? [])
      .filter((f) => f.type === "reference" && f.referencesEntityId !== undefined)
      .map((f) => `${f.id}→${f.referencesEntityId}`);
  };
  const detail = collectionsNues
    .map((b) => {
      const champs = eligibles(b);
      return champs.length === 0
        ? `${b.id} (AUCUN champ \`reference\` : cette liste NE PEUT PAS être scopée — ne pose pas de détail sur cet écran)`
        : `${b.id} (champs éligibles : ${champs.join(", ")})`;
    })
    .join(" ; ");
  return (
    ` CONSÉQUENCE À TRAITER DANS LA MÊME RÉPARATION : poser un détail sur ` +
    `"${screenId}" en fait une FICHE, et sa ou ses collections y deviendront ` +
    `NON CONTEXTUALISÉES (règle C5) — ${detail}. Les deux gestes sont ` +
    `INDISSOCIABLES : un \`scopeFieldId\` posé sur un écran SANS ` +
    `\`detail_header\` est INVALIDE (la portée n'a pas d'instance courante), ` +
    `et le champ choisi doit pointer l'entité du détail que tu poses. Fais ` +
    `les deux, ou ne fais ni l'un ni l'autre.`
  );
}

/**
 * EP-122 · ② — CE QUI EST **EN TROP** SE JUGE AUSSI.
 *
 * Asymétrie mesurée (EP-121) : un écran orphelin est refusé, un bloc
 * surnuméraire est accepté ; la bijection compte les ÉCRANS, jamais leur
 * CONTENU. Conséquence d'usage : 8 blocs sur un écran que le plan prescrit
 * à UNE surface (connexion, inscription, mot de passe oublié, liste de
 * boutiques, recherche…), et une navigation par BOUTON qui perd l'identité
 * que personne ne juge (C4 ne regarde que les lignes de liste).
 *
 * LA FRONTIÈRE (O.4 appliquée au contenu d'écran) : ce qui porte une
 * STRUCTURE doit être justifié ; ce qui porte de l'EXPRESSION reste libre.
 * Le discriminant est DÉRIVÉ du registre : un bloc porte une structure ssi
 * il est LIÉ À UNE ENTITÉ (entity: "required") — il montre ou saisit des
 * données du modèle. Les autres (header, spacer, button, empty_state,
 * search_entry) sont de l'expression ou de la navigation : le générateur
 * garde sa liberté de libellés, d'ordre et d'affordance.
 */
export function jugerContenuDEcran(air, prescriptif) {
  if (air === null || prescriptif === undefined) return [];
  const out = [];
  const parEcran = new Map();
  for (const e of prescriptif.plan.ecrans) {
    parEcran.set(modeleMetier.ecranAirDe(e.ecranId), e);
  }
  const surfaces = new Map(
    modeleMetier.surfacesDe(prescriptif.modele).map((sf) => [sf.surfaceId, sf]),
  );
  for (const ecran of air.screens) {
    const prescrit = parEcran.get(ecran.id);
    if (prescrit === undefined) continue;
    // concepts que le plan autorise sur CET écran (via ses surfaces).
    const conceptsPrescrits = new Set(
      prescrit.surfaces.map((sid) => surfaces.get(sid)?.concept).filter((c) => c !== undefined),
    );
    const entitesPrescrites = new Set(
      [...conceptsPrescrits].map((c) => `ent_${String(c).slice(4)}`),
    );
    for (const bloc of ecran.blocks) {
      const definition = blocksRegistry.getBlock(bloc.blockType);
      if (definition?.entity !== "required") continue; // expression : libre.
      // EP-165 ③c — CE QUE LA RELATION JUSTIFIE, LE PLAN N'A PAS À LE RÉPÉTER.
      //
      // MESURÉ sur 11 paires (modèle, document) : 43 diagnostics, dont 38
      // visaient une entité RELIÉE au concept prescrit — les créneaux d'un
      // soin sur l'écran du soin, les produits d'une boutique sur l'écran de
      // la boutique, le créneau qu'on réserve sur l'écran de réservation.
      // C'est ce qu'une application FAIT ; le reprocher demandait au document
      // de montrer une fiche sans ce qu'elle contient.
      //
      // LA JUSTIFICATION EXISTAIT DÉJÀ, AILLEURS : le modèle DÉCLARE ses
      // relations, et `conceptsRelies` les lit depuis R2. Le juge exigeait
      // l'entité EXACTE de la surface et ignorait cette déclaration — même
      // forme qu'en ③a et ③b : une information présente au modèle que le
      // juge n'allait pas chercher.
      //
      // UN SEUL SAUT, ET C'EST LA GARDE ESSENTIELLE : `conceptsRelies` ne
      // parcourt pas le graphe (`relations.some`, jamais de fermeture
      // transitive). EP-139 a montré où mène la transitivité — produit →
      // boutique → compte rendait TOUT justifiable et VIDAIT le juge.
      // MESURÉ ICI : 5 cas subsistent après la règle, le juge garde son
      // pouvoir de refus.
      //
      // ET LE CHEMIN D'ABUS EST FERMÉ PAR LA CHRONOLOGIE : les relations
      // vivent dans le MODÈLE (P0), jugé à sa propre passe. Le générateur de
      // P2 ne peut pas inventer une relation pour se justifier — il ne
      // l'écrit pas.
      const justifieParRelation =
        bloc.entityId !== undefined &&
        [...conceptsPrescrits].some((c) =>
          modeleMetier.conceptsRelies(
            prescriptif.modele,
            `cpt_${String(bloc.entityId).slice(4)}`,
            String(c),
          ),
        );
      if (
        bloc.entityId !== undefined &&
        !entitesPrescrites.has(bloc.entityId) &&
        !justifieParRelation
      ) {
        out.push({
          code: "AIR_BLOC_STRUCTUREL_NON_JUSTIFIE",
          path: `screens[${ecran.id}].blocks[${bloc.id}]`,
          message:
            `le bloc "${bloc.id}" (${bloc.blockType}) présente l'entité ` +
            `"${bloc.entityId}" qu'AUCUNE surface prescrite de cet écran ne ` +
            `justifie (prescrites : ${[...entitesPrescrites].join(", ") || "aucune"}). ` +
            `Un écran ne porte QUE les données que le plan y a placées — les ` +
            `libellés, l'ordre et les boutons restent à toi, les données non.`,
        });
      }
    }
  }
  return out;
}

/**
 * EP-122 · ② — UNE NAVIGATION PAR BOUTON QUI TRANSPORTE UNE IDENTITÉ.
 *
 * C4 (`navigationsDeLigne`) ne voit que les LIGNES de liste. Mesuré : depuis
 * la fiche d'un produit, un BOUTON menait à un écran listant TOUS les
 * vendeurs — l'instance était perdue, et aucun juge ne le disait. Même
 * exigence, autre porteur : si l'écran SOURCE porte un détail d'entité,
 * l'écran CIBLE doit consommer cette identité (détail de la même entité, ou
 * collection scopée par un champ qui la vise).
 */
export function jugerNavigationsDeBouton(air, prescriptif) {
  // EP-167 — LE JUGE REÇOIT ENFIN CE QU'IL JUGE.
  //
  // Il jugeait une INTENTION (« ce bouton agit-il sur l'instance ? ») sans
  // avoir accès à l'intention. EP-166 a montré que ce n'était pas une
  // impossibilité : `jugerAcceptation` LE REÇOIT, passait déjà le modèle à
  // `jugerContenuDEcran` à la ligne précédente, et ne le passait pas ici.
  // MÊME CHEMIN QU'EP-160, AUTRE BOUT : là-bas la signature exigeait ce que
  // l'appelant n'avait pas ; ici elle ne demandait pas ce qu'il avait.
  //
  // LE CRITÈRE N'EST PAS « SUIT UN ARC » MAIS « SUIT UN ARC QUI TRANSPORTE
  // UNE IDENTITÉ » — et c'est la MESURE qui l'a imposé, pas moi : sur les
  // arcs des plans réels, `transport` vaut `null` (106), `itemId` (66) ou
  // `instance` (33), et il est DÉRIVÉ DE `TABLE_GESTES` par le geste de
  // l'étape. Un arc n'est donc pas une permission : c'est le modèle qui dit
  // si quelque chose voyage.
  //
  // LA GARDE, ET ELLE EST LE CŒUR DE LA RÈGLE : un arc NE JUSTIFIE PAS
  // l'absence de consommation — il l'EXIGE. Ce juge devient plus strict là
  // où le modèle transporte une identité, et se tait là où rien ne voyage.
  // Sans cette garde, (b) aurait été un désarmement déguisé.
  //
  // SANS `prescriptif`, RIEN NE CHANGE : le juge reste intégralement strict.
  // Un appelant qui ne peut pas fournir le modèle n'obtient pas un juge plus
  // permissif — il obtient celui d'avant.
  const arcsPorteurs = new Set(
    (prescriptif?.plan?.navigation?.arcs ?? [])
      .filter((a) => a.transport !== null && a.transport !== undefined)
      .map((a) => `${modeleMetier.ecranAirDe(a.de)}→${modeleMetier.ecranAirDe(a.vers)}`),
  );
  const arcsDuPlan = new Set(
    (prescriptif?.plan?.navigation?.arcs ?? []).map(
      (a) => `${modeleMetier.ecranAirDe(a.de)}→${modeleMetier.ecranAirDe(a.vers)}`,
    ),
  );
  if (air === null) return [];
  const out = [];
  const ecranDe = new Map(air.screens.map((s) => [s.id, s]));
  const entites = new Map(air.entities.map((e) => [e.id, e]));
  for (const ecran of air.screens) {
    const detail = ecran.blocks.find((b) => b.blockType === "detail_header" && b.entityId !== undefined);
    if (detail === undefined) continue;
    for (const bloc of ecran.blocks) {
      if (bloc.blockType !== "button") continue;
      const actionId = (bloc.props ?? []).find((p) => p.key === "actionId")?.value;
      const action = air.actions.find(
        (a) =>
          a.id === actionId ||
          (a.trigger.kind === "ui" && a.trigger.blockId === bloc.id),
      );
      const cibleId =
        action?.effect.kind === "navigate" ? action.effect.screenId : undefined;
      if (cibleId === undefined) continue;
      const cible = ecranDe.get(cibleId);
      if (cible === undefined) continue;
      // EP-165 ③b — UN LIEU DE L'APPLICATION N'EST PAS LA SUITE D'UNE ACTION.
      //
      // Ce juge présume que TOUT bouton partant d'une fiche AGIT SUR cette
      // instance. C'est vrai de « Réserver ce créneau » ; c'est faux de
      // « Aide », « Conditions », ou d'un onglet de la barre. MESURÉ sur 38
      // documents : 63 diagnostics, dont 17 visaient une cible qu'on atteint
      // INDÉPENDAMMENT de toute fiche — 5 surfaces d'application, 12
      // destinations de la barre primaire. Exiger d'y « scoper la
      // collection » n'a aucun sens : on n'affiche pas l'aide DU bien.
      //
      // UNE SEULE CAUSE, DEUX FORMES : dans les deux cas la cible est un
      // LIEU de l'application — un écran que l'utilisateur atteint par
      // lui-même, pas une étape ouverte par ce qu'il regarde.
      //
      // LES DEUX TESTS SONT STRUCTURELS, AUCUNE LISTE : la présence du champ
      // `purpose` (énumération FERMÉE du schéma) et l'appartenance aux
      // destinations déclarées de `navigation.primary`.
      // EP-167 — CE QUE LE MODÈLE NE FAIT PAS VOYAGER N'A RIEN À CONSOMMER.
      // N'est examiné que ce qui suit un arc PORTEUR. Le plan absent, tout
      // reste examiné : l'ignorance ne relâche rien.
      if (arcsDuPlan.size > 0 && !arcsPorteurs.has(`${ecran.id}→${cibleId}`)) continue;
      const estLieu =
        cible.purpose !== undefined ||
        (air.navigation.primary?.destinations ?? []).some(
          (dst) => air.navigation.routes.find((r) => r.id === dst.routeId)?.screenId === cibleId,
        );
      if (estLieu) continue;
      // CONSOMMATION — les QUATRE formes, dérivées du schéma (corrigé après
      // mesure : une première version ne connaissait que le détail et la
      // liste scopée, et refusait à tort « Réserver ce créneau » → formulaire
      // de rendez-vous, et « Annuler ce rendez-vous » → formulaire d'édition.
      // Agir SUR une instance par un formulaire est une consommation.)
      const viseLaFiche = (entiteId) =>
        (entites.get(entiteId)?.fields ?? []).some(
          (f) => f.type === "reference" && f.referencesEntityId === detail.entityId,
        );
      const consomme = cible.blocks.some((b) => {
        // (a) le détail de la MÊME entité : on regarde la même instance.
        if (b.blockType === "detail_header" && b.entityId === detail.entityId) return true;
        // (b) un FORMULAIRE de la même entité : on l'édite.
        if (b.blockType === "form" && b.entityId === detail.entityId) return true;
        // (c) un FORMULAIRE d'une entité qui RÉFÉRENCE la fiche : on crée
        //     quelque chose POUR cette instance (réserver, contacter, payer).
        if (b.blockType === "form" && b.entityId !== undefined && viseLaFiche(b.entityId)) return true;
        // (d) une COLLECTION scopée par un champ qui vise la fiche.
        if (b.blockType !== "list" || b.entityId === undefined) return false;
        const champ = (b.props ?? []).find((p) => p.key === "scopeFieldId")?.value;
        const entite = entites.get(b.entityId);
        return (entite?.fields ?? []).some(
          (f) => f.id === champ && f.type === "reference" && f.referencesEntityId === detail.entityId,
        );
      });
      if (!consomme) {
        out.push({
          code: "AIR_BOUTON_IDENTITE_PERDUE",
          path: `screens[${ecran.id}].blocks[${bloc.id}]`,
          message:
            `le bouton "${bloc.id}" part d'une FICHE de "${detail.entityId}" et ` +
            `mène à "${cibleId}", qui ne CONSOMME PAS cette instance : ni détail ` +
            `de la même entité, ni collection scopée par un champ \`reference\` ` +
            `qui la vise. L'utilisateur qui agit DEPUIS une fiche agit SUR cette ` +
            `instance — l'écran d'arrivée doit le savoir. NE SUPPRIME NI LE ` +
            `BOUTON NI SA NAVIGATION : scope la collection cible, ou cible le détail.`,
        });
      }
    }
  }
  return out;
}

/**
 * EP-169 ① — CE QUE LA BASE PORTE SE JUGE DÈS LA BASE.
 *
 * MESURÉ SUR LE RUN EP-168, INTERROMPU AVANT LES ÉCRANS : le document émis
 * portait une barre primaire fausse — « Rechercher » en première destination
 * là où la primitive impose « Accueil », et « Mon compte » au lieu de
 * « Compte ». Les juges qui le disent EXISTENT et sont BRANCHÉS ; aucun n'a
 * parlé, parce qu'ils sont appelés depuis `jugerAcceptation`, qui n'est
 * appelé que sur un document COMPLET.
 *
 * CE N'ÉTAIT DONC PAS UNE INFIRMITÉ DES JUGES MAIS DE L'ORCHESTRATION, et la
 * mesure le prouve : les trois juges de primitives ne contiennent ZÉRO
 * référence à `air.screens`. Rejoués sur l'assemblage partiel RÉEL du run,
 * ils rendent le verdict qui manquait — gratuitement, 21 minutes plus tôt.
 *
 * `navigation` appartient au segment `base` : une destination porte un
 * LIBELLÉ et un RANG, et ni l'un ni l'autre n'exige qu'un écran existe.
 *
 * RÉGIME : ces diagnostics sont PUBLIÉS, pas bloquants. Faire échouer une
 * émission à mi-course changerait la dynamique du run, et EP-168 vient de
 * rappeler ce qu'on perd à modifier un comportement juste avant de payer.
 * Le verdict existe, il est rendu, il ne décide de rien.
 */
export function jugerBase(air, contexte) {
  if (air === null || air === undefined) return [];
  if (air.navigation?.primary === undefined) return [];
  const ctx = {
    entryScreenId: contexte?.entryScreenId ?? air.navigation.entryScreenId ?? "",
    ecransDIdentite: contexte?.ecransDIdentite ?? [],
  };
  return [
    ...presentation.jugerPrimitivesDeNavigation(air, ctx),
    ...presentation.jugerPositionPrimitives(air, ctx),
    ...presentation.jugerLibellesPrimitifs(air, ctx),
    // EP-171 ① — QUATRIÈME JUGE DE LA BARRE, DÉPLACÉ SUR MESURE.
    //
    // Le crible d'EP-170 l'a trouvé en classe (b) — zéro lecture de
    // `air.screens`, il ne lit que `navigation`, émis au segment `base`. Et
    // la mesure, faite sur les ONZE émissions partielles archivées et non sur
    // un cas isolé, a décidé : 15 diagnostics, tous des
    // `PRESENTATION_DESTINATION_SANS_ICONE` — « une barre de navigation se
    // lit par ses symboles ». DU SIGNAL, JAMAIS RENDU À PERSONNE.
    //
    // DEUX AUTRES CANDIDATS ONT ÉTÉ ÉCARTÉS PAR LA MÊME MESURE, pas par
    // prudence : `validateAirCapabilities` rend ZÉRO sur les onze (il juge le
    // registre, jamais l'intention — EP-169 ② l'avait établi par lecture, la
    // mesure le confirme), et `partagesDe` exige `integrations`, émis à
    // l'avant-dernier segment : le déplacer ne gagnerait rien.
    ...presentation.jugerBarreInferieure(air),
  ];
}

/**
 * EP-169 ② — UNE CAPACITÉ DE PAIEMENT EXIGE UN GESTE DE PAIEMENT.
 *
 * MESURÉ SUR EP-168 : le document déclarait `payments.psp` sur un brief qui
 * dit « il n'y a aucun paiement en ligne », et AUCUN de ses deux modèles P0
 * n'exerce le geste `payer`. Rien ne l'a arrêté :
 * `validateAirCapabilities` vérifie la conformité au REGISTRE — la capacité
 * existe, elle est bien formée — jamais la conformité à l'INTENTION.
 *
 * C'EST L-166-A SUR UN CAS RÉEL : un juge privé de ce qui le trancherait.
 * L'information existait — `compliance.commerceClass` était JUSTE, et le
 * modèle ne porte aucun `payer` — mais elle n'arrivait pas au juge.
 *
 * LES DEUX BORNES SONT DÉRIVÉES, AUCUNE LISTE :
 *  · « capacité de paiement » = `commerceConstraint !== "none"` au REGISTRE.
 *    Mesuré : cela désigne exactement `payments.iap` et `payments.psp`, et
 *    une capacité de paiement ajoutée demain sera couverte sans édition.
 *  · « le domaine paie » = le geste `payer` est EXERCÉ dans un parcours du
 *    modèle. `payer` appartient au vocabulaire FERMÉ de `TABLE_GESTES`.
 *
 * SANS `prescriptif`, LE JUGE SE TAIT — et ce n'est pas un relâchement au
 * sens d'EP-167 : avant cette passe il n'existait pas. Se taire EST le
 * comportement d'avant. Le modèle n'est jamais imposé à `validateLocal`, qui
 * doit rester capable de juger une archive ou une réparation seule.
 */
export function jugerCapacitesContreIntention(air, prescriptif) {
  const modele = prescriptif?.modele;
  if (air === null || air === undefined || modele === undefined) return [];
  const gestesExerces = new Set(
    (modele.parcours ?? []).flatMap((p) => (p.etapes ?? []).map((e) => e.geste)),
  );
  if (gestesExerces.has("payer")) return [];
  const contraintes = new Map(
    registry.CAPABILITIES.map((c) => [c.id, c.commerceConstraint]),
  );
  const out = [];
  for (const demandee of air.capabilities ?? []) {
    const contrainte = contraintes.get(demandee.capability);
    if (contrainte === undefined || contrainte === "none") continue;
    out.push({
      code: "AIR_CAPACITE_SANS_GESTE",
      path: `capabilities[${demandee.capability}]`,
      message:
        `la capacité "${demandee.capability}" porte une contrainte de commerce ` +
        `(${contrainte}) mais AUCUN parcours du modèle n'exerce le geste ` +
        `« payer » : le document déclare une possibilité que la demande ne ` +
        `contient pas. RETIRE LA CAPACITÉ — ne fabrique pas un parcours de ` +
        `paiement pour la justifier.`,
    });
  }
  return out;
}

/**
 * EP-176 ① — UNE CAPACITÉ DE SERVICE EXIGE UNE INTÉGRATION QUI LA PORTE.
 *
 * MESURÉ SUR EP-174 : les TROIS intégrations du document avaient
 * `capability = ABSENT`, alors que `capabilities` déclarait `auth`. Or le
 * compilateur n'émet le client d'authentification que si une intégration
 * porte `capability === "auth"` ET une config avec `url` et `anonKey`. Le
 * code de connexion existait, sa condition ne se déclenchait JAMAIS.
 *
 * ET LA RACINE EST LA TRANSMISSION, pour la onzième fois : le prompt
 * mentionne `capability` TREIZE fois, TOUTES pour `actions.effect.capability`
 * — AUCUNE pour `integrations[].capability`. Le moteur exigeait un champ
 * qu'il ne demandait pas. Principe EP-122 : ce que le moteur exige, il le
 * DIT.
 *
 * LA RÈGLE EST DÉRIVÉE DU REGISTRE, AUCUNE LISTE : une capacité dont
 * `implementation.kind === "provider_service"` s'appuie sur un service
 * EXTERNE — elle a donc besoin d'une intégration pour dire OÙ. Les autres
 * (`expo_module` : caméra, biométrie…) vivent dans l'appareil et n'en
 * exigent aucune. Une capacité de service ajoutée demain sera couverte sans
 * édition.
 */
export function jugerCapacitesSansIntegration(air) {
  if (air === null || air === undefined) return [];
  const parService = new Map(
    registry.CAPABILITIES.filter((c) => c.implementation?.kind === "provider_service").map((c) => [
      c.id,
      c,
    ]),
  );
  const portees = new Set(
    (air.integrations ?? []).map((i) => i.capability).filter((c) => c !== undefined),
  );
  const out = [];
  for (const demandee of air.capabilities ?? []) {
    if (!parService.has(demandee.capability)) continue;
    if (portees.has(demandee.capability)) continue;
    out.push({
      code: "AIR_CAPACITE_SERVICE_SANS_INTEGRATION",
      path: `capabilities[${demandee.capability}]`,
      message:
        `la capacité "${demandee.capability}" s'appuie sur un SERVICE externe ` +
        `(${String(parService.get(demandee.capability)?.implementation?.package ?? "")}) mais AUCUNE ` +
        `intégration ne la porte : aucune \`integrations[]\` n'a ` +
        `\`capability: "${demandee.capability}"\`. Le moteur ne peut pas deviner OÙ joindre ce ` +
        `service — il ne câblera rien, et la capacité restera déclarée sans effet. ` +
        `AJOUTE \`capability\` À L'INTÉGRATION QUI LA SERT ; n'invente aucun secret, ` +
        `l'adresse et la clé viennent du provisioning.`,
    });
  }
  return out;
}

export function jugerAcceptation(air, prescriptif, intention) {
  if (air === null) return [];
  const out = [];
  if (prescriptif !== undefined) {
    out.push(
      ...modeleMetier.verifierNavigationPrescrite(
        air,
        modeleMetier.prescriptionsNavigation(prescriptif.plan, presentation.DESTINATIONS_MIN),
      ),
    );
    // EP-188 ① — ET LES ENTITÉS PRESCRITES, que rien ne vérifiait.
    out.push(...modeleMetier.verifierEntitesPrescrites(air, prescriptif.modele));
  }
  const arcsPrescrits = (prescriptif?.plan?.navigation?.arcs ?? []).map((a) => ({
    de: modeleMetier.ecranAirDe(a.de),
    vers: modeleMetier.ecranAirDe(a.vers),
  }));
  // EP-130 — LE PLACEMENT : la première dimension de PRÉSENTATION jugée.
  // La zone d'un bloc vient du PLAN DE COMPOSITION (l'étage qui la décide) —
  // le juge ne la redevine pas.
  const planComposition = compiler.planifierComposition(air);
  const zoneDuBloc = (screenId, blockId) =>
    planComposition.ecrans
      .find((e) => e.screenId === screenId)
      ?.sections.find((s) => s.blockId === blockId)?.zone;
  // Les écrans d'identité viennent du MODÈLE (concept touché par s_identifier),
  // jamais d'une icône — une icône est un symbole, pas une destination.
  const conceptsIdentite = prescriptif.modele.concepts
    .map((c) => c.id)
    .filter((id) => modeleMetier.estConceptIdentite(prescriptif.modele, id));
  const surfacesModele = modeleMetier.surfacesDe(prescriptif.modele);
  const ecransDIdentite = prescriptif.plan.ecrans
    .filter((e) =>
      e.surfaces.some((sid) =>
        conceptsIdentite.includes(
          surfacesModele.find((sf) => sf.surfaceId === sid)?.concept ?? "",
        ),
      ),
    )
    .map((e) => modeleMetier.ecranAirDe(e.ecranId));
  out.push(
    ...presentation.jugerPlacement(air, zoneDuBloc, {
      entryScreenId: air.navigation.entryScreenId,
      ecransDIdentite,
    }),
  );
  // EP-137 — le CONTENU de l'espace compte est lui aussi une primitive.
  out.push(...presentation.jugerEspaceCompte(air, { ecransDIdentite }));
  // EP-192 — LE GENRE DE LA RACINE, ICI ET PAS AU SEGMENT `base`. Il lit
  // `screens[].purpose` ; au segment `base` les écrans n'existent pas encore,
  // et l'y avoir branché a coûté un arrêt technique. Sa place est auprès de
  // `jugerEspaceCompte`, qui lit les mêmes écrans et reçoit le même contexte.
  out.push(...presentation.jugerGenreRacineCompte(air, { ecransDIdentite }));
  // EP-147 ① — la divulgation se rencontre dans l'usage normal, elle ne se
  // range pas dans un menu : son placement est jugé à part.
  out.push(
    ...presentation.jugerDivulgationProeminente(air, {
      avecPartage: presentation.partagesDe(air).length > 0,
      ecransDIdentite,
    }),
  );

  // EP-122 · ② — le SURPLUS structurel et l'identité perdue par bouton.
  out.push(...jugerContenuDEcran(air, prescriptif));
  out.push(...jugerNavigationsDeBouton(air, prescriptif));
  out.push(...jugerCapacitesSansIntegration(air));
  out.push(
    ...vivacite.jugerVivacite(air, executionContract.EXECUTION_ENVELOPE_V1, {
      arcsPrescrits,
      commerceAttendu: intention?.commerce,
    }),
  );
  return out;
}

export function validateLocal(document, prescriptif) {
  // EP-162 ③ — L'INTENTION EST DUE, ET AUCUN JUGE BRANCHÉ NE LE VOYAIT.
  //
  // BRANCHÉ, PAS RETIRÉ. Le doute était légitime : `intent` est dans le
  // schéma, donc Zod pourrait suffire. MESURÉ, il ne suffit pas — un
  // document RÉEL du dépôt (toiletteur-chiens 1.7.1) privé de son intention
  // traverse `projectAirSchema.safeParse` ET `validateAir` en VERT. C'est
  // voulu : `air.ts` rend `intent` optionnel pour ne pas forcer la migration
  // à FABRIQUER une intention aux 12 documents du corpus gelé (D-044), et
  // renvoie le fail-closed « à la gate de fidélité ». Or l'ÉMISSION ne passe
  // pas par cette gate : la promesse était tenue ailleurs que là où elle
  // était due.
  //
  // ICI, sur le document BRUT — avant migration, seul moment où la version
  // DÉCLARÉE distingue un artefact gelé d'un document neuf.
  //
  // MESURÉ SUR 81 ARCHIVES avant branchement : 10 rouges, toutes des
  // `emission-partielle` — des assemblages interrompus par un échec
  // technique, jamais un document complet. Le fail-closed ne ferme sur
  // aucune génération réussie du passé.
  const intentionDue = airSchema.validateAirIntentRequirement(document);
  // EP-169 ② — `prescriptif` OPTIONNEL, remède d'EP-167 : sans lui rien ne
  // change, avec lui le juge des capacités peut enfin trancher.
  const capacitesContreIntention = jugerCapacitesContreIntention(document, prescriptif);
  const parsed = airSchema.projectAirSchema.safeParse(document);
  if (!parsed.success) {
    return {
      air: null,
      diagnostics: [
        ...intentionDue,
        ...capacitesContreIntention,
        ...parsed.error.issues.map((issue) => ({
          code: "SCHEMA",
          path: issue.path.join("."),
          message: issue.message,
        })),
      ],
    };
  }
  const diagnostics = [
    ...intentionDue,
    ...capacitesContreIntention,
    ...airSchema.validateAir(parsed.data),
    ...registry.validateAirCapabilities(parsed.data),
    ...blocksRegistry.validateAirBlocks(parsed.data),
    // ── PREUVE DE MATIÈRE (2026-09-10) — VERROU MÉCANIQUE, pas une règle de
    // prompt : un document qui VEND doit posséder une marchandise alimentée
    // et affichée, distincte du profil. Refus testé sur le cadavre réel
    // (dougplace, 1 entité = profil, 6,81 $). Couche CAMPAGNE uniquement —
    // le corpus gelé v2 précède l'exigence et n'est pas re-jugé.
    ...fidelity.preuveDeMatiere(parsed.data),
    // ── COMPOSITION II : sections nommées · recherche offerte à l'entrée ·
    // états du distant déclarés. Le couloir, lui, est devenu IRREPRÉSENTABLE
    // (aperçus bornés) — plus besoin de l'interdire.
    ...fidelity.principesDeComposition(parsed.data),
    ...fidelity.imagesDeVitrine(parsed.data),
    // EP-188 ③ — ET LES NOMBRES. Sans `demoValues`, le compilateur tire un
    // entier entre 1 et 999 quel que soit le sens du champ : c'est ainsi
    // qu'un logement obtient 907 pièces pour 933 m². Un relecteur de magasin
    // ouvre l'application et le voit — 4.2 punit la fonctionnalité minimale.
    ...fidelity.nombresVraisemblables(parsed.data),
    // EP-201 E/F — le catalogue et la devise. Regle transmise (37/37ter) ET
    // juge qui verifie: la loi d EP-199 vaut pour ces deux-la comme pour les
    // autres, sinon le generateur ne saurait pas ce qu on attend de lui.
    ...fidelity.catalogueFourni(parsed.data),
    ...fidelity.deviseCoherente(parsed.data),
    ...fidelity.rechercheVisuelleComplete(parsed.data),
    // ── BLUEPRINT (engine hardening) : le PLAN d'assemblage est validé
    // AVANT toute acceptation — un aperçu qui tronque offre sa suite, une
    // vitrine vide est refusée. Réponse locale à « est-ce bien planifié ? ».
    ...compiler.validerPlan(compiler.planifierComposition(parsed.data)),
    // ── C4 (confrontation #12) — CONSERVATION DE L'IDENTITÉ : la cible d'une
    // ligne doit CONSOMMER l'identité transportée (détail même entité, ou
    // liste scopée par un champ reference — r(itemId)). Mesuré : 29 sites du
    // corpus GELÉ jettent l'identité (consignés, jamais re-jugés) — la barre
    // vaut pour les générations FUTURES.
    ...executionGraph.navigationsDeLigne(parsed.data)
      .filter((n) => n.consommation === "aucune")
      .map((n) => ({
        code: "AIR_CIBLE_IDENTITE_PERDUE",
        path: `screens[${n.screenId}].blocks[${n.blockId}]`,
        message:
          `la ligne de "${n.blockId}" (entité "${n.entityId}") navigue vers ` +
          `"${n.targetScreenId}" qui ne CONSOMME PAS l'identité transportée : ` +
          `ni detail_header de la même entité, ni liste scopée par un champ ` +
          `reference vers elle. L'instance pressée serait PERDUE (repli rows[0] ` +
          `silencieux). Répare en ciblant le DÉTAIL de l'instance, ou en scopant ` +
          `la collection cible par un champ \`reference\` (règle 18). NE ` +
          `SUPPRIME NI LA LIGNE NI SA NAVIGATION (règle 27).` +
          // EP-105 — UNE PRESCRIPTION DE RÉPARATION DOIT ÊTRE COMPLÈTE.
          // Cause racine mesurée (L-098-C, 3 confirmations) : ce message
          // ordonne « cible le DÉTAIL » ; poser un detail_header RECLASSE
          // l'écran (le trait est DÉRIVÉ des blocs — prouvé : la
          // correspondance rôle-prescrit → trait-dérivé n'est pas univoque
          // sur une fixture VERTE, donc le plan NE prescrit PAS le type) et
          // la collection déjà présente bascule sous C5. La clause est
          // DÉRIVÉE du document (collections non scopées de l'écran cible),
          // jamais un nom de bloc en dur : tout bloc reclassant futur la
          // déclenchera de la même façon.
          consequencesDeReclassement(parsed.data, n.targetScreenId),
      })),
    // ── C5 (confrontation #12) — une collection sur une FICHE n'est légitime
    // qu'en ACCÈS CONTEXTUALISÉ (scopée à l'instance). 24 sites gelés consignés.
    ...executionGraph.collectionsSurFiche(parsed.data)
      .filter((x) => !x.contextualisee)
      .map((x) => ({
        code: "AIR_FICHE_COLLECTION_NON_CONTEXTUALISEE",
        path: `screens[${x.screenId}].blocks[${x.blockId}]`,
        message:
          `l'écran "${x.screenId}" est une FICHE et la liste "${x.blockId}" n'est ` +
          `pas scopée à l'instance (\`scopeFieldId\` absent) : une collection ` +
          `PLEINE absorbée dans un détail mélange deux responsabilités. Scope-la ` +
          `par le champ reference qui la relie à l'instance affichée.`,
      })),
    // ── FORM_SANS_ACTION (2026-09-01) — DIAGNOSTIC, JAMAIS UN REFUS DE CONTRAT.
    //
    // Un `form` rend TOUJOURS un bouton portant son `submitLabel` : c'est une
    // promesse faite à l'utilisateur. Or le registre impose `actionId` à un
    // `button` et RIEN à un `form` — mesuré : 7 formulaires muets sur 45, contre
    // 0 bouton muet sur 259. Trois portaient un paiement ou une confirmation.
    //
    // Le diagnostic vit ICI, dans la validation de la campagne, et NON dans
    // `validateAirBlocks` : ce pont est consommé en fail-closed par le
    // compilateur (`resolve-lock`) et par le cliquet du corpus gelé, qui exige
    // zéro diagnostic. L'y placer aurait REFUSÉ trois documents existants et
    // détruit la base de comparaison — l'erreur d'étage de D-105, à l'identique.
    // Même patron que `OVERRIDES_NON_VIDE` ci-dessous.
    ...executionGraph.formulairesSansAction(parsed.data).map((f) => ({
      code: "FORM_SANS_ACTION",
      path: `screens[${f.screenId}].blocks[${f.blockId}]`,
      message:
        `le formulaire "${f.blockId}" (écran "${f.screenId}") rend un bouton de ` +
        `soumission qu'AUCUNE action ne déclenche : la pression ne produit RIEN. ` +
        `Déclare une action \`{trigger:{kind:"ui",blockId:"${f.blockId}"}, ` +
        `effect:{kind:"mutation",entityId:<l'entité du formulaire>,operation:"create"|"update"}}\`. ` +
        `NE RETIRE NI LE FORMULAIRE NI SON BOUTON : la réparation attendue est de ` +
        `CONSTRUIRE l'action manquante (règle 27).`,
    })),
    // ── DETAIL_SANS_SOURCE (2026-09-01) — DIAGNOSTIC, comme FORM_SANS_ACTION.
    //
    // Un écran de détail n'apprend QUELLE instance afficher que d'une chose :
    // `useItemNavigate` transmet `{itemId}` quand une LIGNE DE LISTE est
    // pressée. Vérifié dans le runtime compilé : la navigation par BOUTON
    // appelle `navigation.navigate(screenId)` SANS aucun paramètre. Un détail
    // qu'aucune ligne n'atteint ne peut donc JAMAIS recevoir d'identifiant.
    //
    // Le fournisseur retombe alors sur `rows[0]`, EN SILENCE : l'écran affiche
    // toujours le premier enregistrement. Presser « le troisième » montre « le
    // premier », sans erreur ni état vide. Mesuré sur le corpus v3 : **28 écrans
    // de détail sur 34 (82 %)**, dont **27 sur une entité à plusieurs lignes**.
    //
    // Le 28e porte un jeu de démo d'UNE ligne — il n'est non ambigu que par
    // accident de fixture, jamais par le contrat. Aucune exemption n'est donc
    // accordée : la règle reste STRUCTURELLE.
    ...executionGraph
      .detailScreens(parsed.data)
      .filter((d) => !d.hasItemIdSource)
      .map((d) => ({
        code: "DETAIL_SANS_SOURCE",
        path: `screens[${d.screenId}].blocks[${d.blockId}]`,
        message:
          `l'écran de détail "${d.screenId}" n'est atteint par AUCUNE ligne de liste : ` +
          `il ne recevra jamais d'identifiant et affichera TOUJOURS le premier ` +
          `enregistrement, en silence. Déclare une action ` +
          `\`{trigger:{kind:"ui",blockId:<le bloc list de l'entité>}, ` +
          `effect:{kind:"navigate",screenId:"${d.screenId}"}}\` (règle 18). ` +
          `NE RETIRE NI L'ÉCRAN NI SON EN-TÊTE : la réparation attendue est de ` +
          `CÂBLER la ligne (règle 27).`,
      })),
    // ── ACTION_DECLENCHEUR_DECORATIF (2026-09-02, D-123) — DIAGNOSTIC, même étage.
    //
    // CAUSE RACINE PAYÉE (run refusé 2026-09-02T11-33-00-222Z) : la réparation
    // a créé une action à déclencheur `ui` sur un `empty_state` dont la prop
    // `actionId` dispatchait une AUTRE action. D-105 le dit : `button` et
    // `empty_state` dispatchent par LEUR prop — le déclencheur y est DÉCORATIF.
    // D-104 ne le voit pas (il vérifie le TYPE du bloc, pas la cohérence de
    // dispatch) ; la promesse visant l'action a fini en AIR_TEST_TARGET_MORTE
    // après réparation, trop tard pour une seconde passe. La condition est
    // DÉRIVÉE DU REGISTRE (`actionRefProps`), jamais d'une liste de types.
    ...parsed.data.actions.flatMap((a, ai) => {
      if (a.trigger.kind !== "ui") return [];
      const bloc = parsed.data.screens
        .flatMap((s) => s.blocks)
        .find((b) => b.id === a.trigger.blockId);
      if (bloc === undefined) return []; // référence brisée : refusée ailleurs
      const def = blocksRegistry.getBlock(bloc.blockType);
      if (def === undefined || !def.actionRefProps.includes("actionId")) return [];
      const dispatchee = (bloc.props ?? []).find((p) => p.key === "actionId")?.value;
      if (dispatchee === a.id) return [];
      return [
        {
          code: "ACTION_DECLENCHEUR_DECORATIF",
          path: `actions[${ai}].trigger.blockId`,
          message:
            `l'action "${a.id}" déclare un déclencheur sur le bloc "${bloc.id}" ` +
            `(type "${bloc.blockType}"), mais ce type de bloc dispatche l'action nommée ` +
            `par SA prop \`actionId\`` +
            (dispatchee === undefined ? ` — qui est ABSENTE` : ` — ici "${String(dispatchee)}"`) +
            ` : le déclencheur est DÉCORATIF, rien n'exécutera jamais "${a.id}". ` +
            `Répare en ALIGNANT : fais porter la prop \`actionId\` du bloc sur "${a.id}", ` +
            `OU re-cible déclencheur et promesses vers l'action réellement dispatchée, ` +
            `OU place le déclencheur sur un bloc qui dispatche "${a.id}". ` +
            `NE SUPPRIME NI L'ACTION NI LA PROMESSE QUI LA VISE (règle 27).`,
        },
      ];
    }),
    // ── PARITÉ F4 À LA GÉNÉRATION (2026-09-02, D-123) — même patron que D-118
    // pour F1. CAUSE RACINE PAYÉE (même run) : la section `intention` est émise
    // en attempt1 et jamais réémise ; la réparation renomme des nœuds et les
    // `nodeIds` des besoins se périment (2 `reference_brisee`) — sans la
    // promesse morte, ce document serait entré au corpus `valid=true` puis
    // aurait rougi la gate F4 : la divergence pipeline↔gate que D-118 a fermée
    // pour F1 existait à l'identique pour F4. L'AUTORITÉ est l'instrument de
    // la gate LUI-MÊME (`evaluateIntentCoverage`) — aucun faux positif nouveau
    // par construction. La pseudo-satisfaction SÉMANTIQUE reste hors de portée
    // de tout instrument (mesuré : 14 nœuds vivants autour d'un comportement
    // irrendable) — c'est l'objet de la règle 30 et du contrôle d'acceptation.
    ...(parsed.data.intent === undefined
      ? []
      : fidelity.evaluateIntentCoverage(parsed.data, ENV).verdicts.flatMap((v) => {
          const PARITE = {
            reference_brisee: "AIR_INTENT_REFERENCE_BRISEE",
            motif_refute: "AIR_INTENT_MOTIF_REFUTE",
            satisfaction_non_prouvee: "AIR_INTENT_SATISFACTION_NON_PROUVEE",
            satisfait_par_du_mort: "AIR_INTENT_SATISFAIT_PAR_DU_MORT",
          };
          const code = PARITE[v.state];
          if (code === undefined) return [];
          return [
            {
              code,
              path: `intent.needs[${v.needId}]`,
              message:
                `${v.motif}. Le besoin "${v.needId}" reste DÛ : satisfais-le sur des ` +
                `nœuds RÉELS recopiés caractère pour caractère (règle 11), ou déclare-le ` +
                `avec le fait exact (règles 11 et 30). NE LE SUPPRIME PAS (règle 27).`,
            },
          ];
        })),
    // ── AIR_TEST_TARGET_MORTE (2026-09-02, D-118) — DIAGNOSTIC, même étage.
    //
    // CAUSE RACINE PAYÉE : billetterie-concerts (runId 2026-09-01T22-53-00-610Z)
    // a promis `test_billet_emis_apres_paiement` sur une action à déclencheur
    // `data` — schéma-valide, JAMAIS exécutée (l'enveloppe n'exécute que
    // `ui`/`lifecycle`). `AIR_TEST_TARGET_UNKNOWN` vérifie que la cible EXISTE,
    // jamais qu'elle VIT : le pipeline a dit `valid=true`, la gate F1 a dit
    // rouge. Un document ne doit plus pouvoir être accepté ici et refusé là.
    //
    // L'AUTORITÉ EST L'INSTRUMENT DE LA GATE LUI-MÊME : `evaluatePromises`,
    // même contrat, mêmes verdicts — aucun faux positif nouveau par
    // construction, et le diagnostic se relâche TOUT SEUL quand l'enveloppe
    // gagne un déclencheur. Seul `cible_morte` est rapporté ici : l'inexistence
    // appartient à `AIR_TEST_TARGET_UNKNOWN` — jamais deux signaux par
    // promesse. Une action morte que RIEN ne promet n'est pas rapportée : la
    // gate F1 la tolère, le diagnostic ne juge pas plus sévèrement qu'elle.
    ...fidelity
      .evaluatePromises(parsed.data, ENV)
      .verdicts.flatMap((v, i) =>
        v.state === "cible_morte"
          ? [
              {
                code: "AIR_TEST_TARGET_MORTE",
                path: `expectedTests[${i}].targetId`,
                message:
                  `la promesse "${v.testId}" cible "${v.targetId}", qui EXISTE mais ne VIT pas : ` +
                  `${v.motif}. NE SUPPRIME NI LA PROMESSE NI SA CIBLE : rends la cible ` +
                  `VIVANTE — recâble son déclencheur dans l'enveloppe (\`ui\` sur un bloc ` +
                  `existant, ou \`lifecycle\`), câble l'action sur un bloc, relie l'écran ` +
                  `depuis un chemin exécutable — ou re-cible la promesse vers le nœud ` +
                  `VIVANT qui rend le même service (règle 27).`,
              },
            ]
          : [],
      ),
  ];
  const overrides = parsed.data.design?.overrides;
  if (overrides !== undefined && overrides.length > 0) {
    diagnostics.push({
      code: "OVERRIDES_NON_VIDE",
      path: "design.overrides",
      message: "D-025 : design.overrides doit être absent en corpus-v2",
    });
  }
  return { air: parsed.data, diagnostics };
}
