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
      if (bloc.entityId !== undefined && !entitesPrescrites.has(bloc.entityId)) {
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
export function jugerNavigationsDeBouton(air) {
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

export function jugerAcceptation(air, prescriptif, intention) {
  if (air === null) return [];
  const out = [];
  if (prescriptif !== undefined) {
    out.push(
      ...modeleMetier.verifierNavigationPrescrite(
        air,
        modeleMetier.prescriptionsNavigation(prescriptif.plan),
      ),
    );
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
  out.push(...jugerNavigationsDeBouton(air));
  out.push(
    ...vivacite.jugerVivacite(air, executionContract.EXECUTION_ENVELOPE_V1, {
      arcsPrescrits,
      commerceAttendu: intention?.commerce,
    }),
  );
  return out;
}

export function validateLocal(document) {
  const parsed = airSchema.projectAirSchema.safeParse(document);
  if (!parsed.success) {
    return {
      air: null,
      diagnostics: parsed.error.issues.map((issue) => ({
        code: "SCHEMA",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }
  const diagnostics = [
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
