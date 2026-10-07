// CAMPAGNE D'ÉMISSION AIR v3 — CORRECTIF DE PROMPT (2026-08-30).
//
// emit.mjs (v1) et emit-v2.mjs (v2) sont CONSERVÉS INTACTS : ce sont les
// enregistrements des campagnes qui ont produit les corpus. Ce fichier est
// leur successeur, PAS leur remplacement.
//
// CAUSE RACINE CORRIGÉE ICI — diagnostic du 2026-08-30 :
//   Les 12 documents du corpus ont TOUS 4 écrans (3 pour un seul) et TOUS
//   exactement 3 entités. Ce n'était ni une limite du modèle, ni une limite
//   du schéma, ni une limite du moteur : la règle 10 du prompt disait
//   « Sois complet mais sobre : 2 à 4 écrans, 1 à 3 entités ».
//   Le modèle a SATURÉ le plafond qu'on lui donnait, 12 fois sur 12.
//   [VÉRIFIÉ] un AIR écrit à la main à 12 écrans / 8 entités est accepté par
//   les validateurs et compilé sans erreur — le plafond n'était que le prompt.
//
// TROIS CORRECTIFS :
//   1. règle 10 — dimensionner sur le BESOIN, plus sur un plafond ; et exiger
//      que tout écran déclaré soit atteignable (18 écrans du corpus ne le sont pas) ;
//   2. règle E — besoin non exprimable : le déclarer au lieu de le perdre en
//      silence (12 documents déclarent 17 champs `asset` qu'aucun bloc ne rend) ;
//   3. règle F — conditionner l'état vide (17 duplications mesurées au corpus).
//
// NON EXÉCUTÉ. Lancer cette campagne consomme du budget LLM : décision propriétaire.

// DE SMART BLOCKS (D-023/D-024). Mêmes 12 intentions, même pipeline par
// sections que la campagne 2.4 (emit.mjs, INTOUCHÉ), mêmes contraintes API.
// Différences consignées en D-025 : + allowlist de blocs au prompt et
// validateAirBlocks en validation locale · design.overrides ABSENT ·
// round-trip SUPPRIMÉ (garantie D-019 structurelle au schéma inchangé) ·
// sortie corpus-v3/ (v1 ET v2 gelés, byte-identiques) · PLAFOND DUR 25 $.
// Usage : node emit-v2.mjs [debut] [fin]
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// EP-051 — le SDK vit dans l'ADAPTATEUR ; ce script n'en connaît plus le nom.
import { z } from "zod";
import { INTENTIONS } from "./intentions.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const airSchema = await import(join(REPO, "packages/air-schema/src/index.ts"));
const registry = await import(join(REPO, "packages/capability-registry/src/index.ts"));

// EP-176 ① — LES CAPACITÉS QUI EXIGENT UNE INTÉGRATION, DÉRIVÉES DU REGISTRE.
//
// Le prompt mentionnait `capability` treize fois, TOUTES pour
// `actions.effect.capability`, AUCUNE pour `integrations[].capability`. Le
// compilateur, lui, n'émet le client d'authentification que si une intégration
// porte ce lien : le moteur EXIGEAIT un champ qu'il ne DEMANDAIT pas.
//
// La liste n'est pas écrite : `implementation.kind === "provider_service"`
// désigne exactement les capacités qui s'appuient sur un service EXTERNE.
function capacitesDeService() {
  return registry.CAPABILITIES.filter((c) => c.implementation?.kind === "provider_service")
    .map((c) => `\`${c.id}\``)
    .join(", ");
}

const blocksRegistry = await import(join(REPO, "packages/blocks/src/registry.ts"));
const presentation = await import(join(REPO, "packages/execution-contract/src/presentation.ts"));
// Étape ③ (EP-008) — le digest INTERPOLE le registre au lieu de le recopier :
// la liste des rôles d'icônes et le NOMBRE de blocs viennent des sources.
const { ROLES_ICONES } = await import(join(REPO, "packages/primitives/src/roles-icones.ts"));
const { obligationsPourPasse } = await import(join(HERE, "obligations-passes.mjs"));
// R5 (EP-055) — P0 + dérivations + prescriptions : le générateur perd le
// stylo structurel quand un MODÈLE existe.
const passe0 = await import(join(HERE, "passe0.mjs"));
const modeleMetier = await import(join(HERE, "modele-metier.mjs"));
const repairScope = await import(join(REPO, "packages/repair/src/repair-scope.ts"));
const budgetUsd = await import(join(REPO, "packages/repair/src/budget-usd.ts"));
// EP-051 — LA frontière fournisseur : tout dialecte passe par lui.
// EP-089/EP-091 — le fournisseur se charge par le REGISTRE de configuration
// (adaptateurs.mjs) : le cliquet anti-fournisseur interdit tout nom ici —
// l'appelant choisit par ADAPTATEUR_FOURNISSEUR, le registre valide et
// porte le défaut. Tout le dialecte vit dans l'adaptateur chargé.
const { chargerAdaptateur } = await import(join(HERE, "adaptateurs.mjs"));
const adaptateur = await chargerAdaptateur(process.env.ADAPTATEUR_FOURNISSEUR);
const preservation = await import(join(REPO, "packages/repair/src/preservation.ts"));
// EP-051 — l'échelle vient de l'adaptateur (degradationsPourEchelle).
const executionContract = await import(join(REPO, "packages/execution-contract/src/envelope.ts"));
const executionGraph = await import(join(REPO, "packages/execution-contract/src/graph.ts"));
const vivacite = await import(join(REPO, "packages/execution-contract/src/vivacite.ts"));
const fidelity = await import(join(REPO, "packages/fidelity/src/index.ts"));
const compiler = await import(join(REPO, "packages/compiler/src/index.ts"));

// D-088 — LE PROMPT LIT L'ENVELOPPE, IL NE LA PARAPHRASE PLUS.
//
// CAUSE RACINE MESURÉE : le prompt REDISAIT en prose ce que le moteur sait
// faire. Quand le moteur a gagné les images et la recherche, la prose est
// restée. Le générateur a donc appris — et répété dans 12 documents sur 12 —
// que le registre était dépourvu de visuel et de recherche. 42 promesses
// `test_besoin_non_rendable_*` et 19 motifs d'inexprimabilité en découlent.
// Une prose ne peut pas dériver si elle est CALCULÉE depuis l'objet.
const ENV = executionContract.EXECUTION_ENVELOPE_V1;
const surfaceEnveloppe = () => {
  const faits = [
    ["imageRendering", "AFFICHER DES IMAGES", "`imageFieldId` sur `list` (vignette) et sur `detail_header` (visuel d'en-tête)"],
    ["listSearch", "UNE RECHERCHE QUI FILTRE", "`searchFieldId` + `searchPlaceholder` sur `list` — le filtrage est RÉEL, pas décoratif"],
    // « au plus 3 » était AMBIGU et le générateur a obéi à la lettre : il a
    // produit 3 filtres pilotés PUIS un `filterFieldId` littéral, soit 4 au
    // total, refusés par le registre gelé (`definitions.ts` : total = pilotés
    // + littéral, > 3 ⇒ BLOCK_PROPS_INVALID). Le budget est COMMUN, la
    // formulation ne le disait pas. Corrigé le 2026-09-04.
    ["listUserFiltering", "DES FILTRES RÉGLÉS PAR L'UTILISATEUR", "\`userFilterFieldIds\`/\`userFilterOperators\`/\`userFilterInputTypes\` sur \`list\` — BUDGET COMMUN DE 3 FILTRES AU TOTAL SUR UN MÊME BLOC, le filtre littéral \`filterFieldId\` COMPRIS : 3 pilotés + 1 littéral = 4 et sont REFUSÉS. Si tu poses un \`filterFieldId\`, il ne reste que 2 filtres pilotés. Conjonction, valeur vide = inactif"],
    ["relationScoping", "UNE LISTE LIMITÉE À L'INSTANCE COURANTE", "\`scopeFieldId\` sur la \`list\` d'un écran de détail — champ \`reference\` vers l'entité de l'écran"],
    ["liveData", "DES DONNÉES VIVANTES D'UNE SOURCE DISTANTE", "\`sourceKind: \"remote\"\` sur le dataset (+ \`sourceIntegrationId\` EXISTANTE, \`sourceDomain\` dans \`network.allowedDomains\`, \`sourceRefreshSeconds\` optionnel) — l'app émise CONSOMME cette source (rafraîchissement par POLLING) ; JAMAIS du temps réel poussé"],
    ["primaryNavigation", "UNE BARRE PERSISTANTE", "`navigation.primary` — 3 à 5 destinations, présentes sur chaque écran"],
    ["listFiltering", "TRIER, FILTRER, BORNER", "`sortFieldId`/`sortDirection`, `filterFieldId`/`filterOperator`/`filterValue`, `pageSize`"],
    ["relationTraversal", "AFFICHER UNE RÉFÉRENCE LISIBLE", "`referenceDisplayFieldId` sur le champ de référence"],
    ["crossScreenFormState", "CONSERVER UN FORMULAIRE ENTRE ÉCRANS", "l'état saisi survit à une navigation"],
    ["rulesEnforced", "VALIDER AVANT ÉCRITURE", "`air.rules` est appliquée"],
    ["slotsInvoked", "INVOQUER UN CODE SLOT", "un slot lié est réellement appelé"],
  ];
  const sait = faits.filter(([f]) => ENV[f] === true);
  const nesaitpas = faits.filter(([f]) => ENV[f] !== true);
  return (
    "CE QUE LE MOTEUR SAIT FAIRE (enveloppe " + ENV.version + ", mesurée — non négociable) :\n" +
    sait.map(([f, quoi, comment]) => `   ✅ ${quoi} — ${comment}   [${f}]`).join("\n") +
    "\n   ✅ EFFETS D'ACTION : " + ENV.effects.join(", ") +
    "\n   ✅ DONNÉES : " + ENV.dataOperations.join(", ") +
    (nesaitpas.length > 0
      ? "\n\nCE QUE LE MOTEUR NE SAIT PAS ENCORE FAIRE :\n" +
        nesaitpas.map(([f, quoi]) => `   ❌ ${quoi}   [${f}: false]`).join("\n")
      : "") +
    "\n   ❌ EXÉCUTER UN EFFET `capability` (caméra, GPS, carte, notifications)   [capabilitiesEmitCode: " +
    String(ENV.capabilitiesEmitCode) +
    "]\n\nCes drapeaux sont les SEULS faits qu'un motif d'inexprimabilité peut invoquer, " +
    "et il doit les nommer EXACTEMENT. Un motif qui invoque un fait ✅ est REJETÉ par le validateur."
  );
};

// EP-051 — la clé appartient à l'adaptateur (CONFIG.cheminCle/motifCle).

const MODEL = adaptateur.CONFIG.model; // EP-051 — paramètre d'adaptateur, plus une hypothèse.
// PORTÉ À 16000 (D-078) — mesuré, pas supposé : la campagne a échoué sur son
// PREMIER domaine avec « Unexpected end of JSON input » après 202 s et 0,53 $.
// La réponse était TRONQUÉE. Les sept règles ajoutées demandent bien plus de
// JSON qu'avant — intention avec un besoin par écran, liaison de chaque slot,
// titres d'état sur chaque bloc lié — et 8000 jetons ne suffisaient plus.
// PORTÉ À 24000 (2026-09-04) — mesuré sur l'échec de la veille, pas supposé :
// la section `ecrans` de `toiletteur-chiens` a atteint EXACTEMENT le plafond de
// 16000 jetons, après avoir ouvert 8 écrans et en pleine écriture du 8e (le
// dernier fragment conservé s'arrête sur un `sortFieldId`). La cause est
// structurelle et attendue : `emit-v3` a levé le plafond de DIMENSIONNEMENT du
// prompt (règle 10 — dimensionner sur le besoin), et l'émission partielle le
// confirme, 6 entités produites contre 3 au document d'origine. Un document
// plus riche déborde une sortie calibrée pour l'ancien format. Même classe que
// D-078 (8000 → 16000), un cran plus loin.
//
// 24000 = +50 % sur la mesure, soit ~12 écrans complets là où 16000 en tenait
// 7,5. Valeur choisie MINIMALE-SÛRE, pas confortable : le pire cas par appel
// passe de 0,467 $ à 0,667 $, et 7 sections doivent tenir sous le plafond dur
// de la tentative. Monter plus haut réduirait le nombre d'appels que le garde
// budgétaire autorise avant de mordre.
// EP-095 — BORNE DÉRIVÉE, PAS AUGMENTÉE (EP-050). Deux mesures concordantes
// sur archives : marketplace tronquée = 24 000 jetons pour 16 écrans
// COMPLETS ≈ 1 500 j/écran ; kaviva vert recoupé ≈ 1 416 j/écran. Pire taux
// 1 500 × 24 écrans prescrits = 36 000 → /0,9 → 40 000.
// DETTE CONSIGNÉE (EP-095) : une borne FIXE sur une passe dont la sortie
// croît avec le nombre d'écrans RE-CASSERA au domaine suivant — la borne
// durable se dérive PAR PASSE de la taille du plan (conception, GO futur).
const MAX_TOKENS = 40000;
// DÉLAI ET REPRISES (D-080) — la campagne a perdu deux domaines sur
// « Request timed out » : le SDK abandonne à 10 minutes par défaut, et les
// sections lourdes (actions avec liaisons, écrans avec titres d'état) les
// dépassent. Un abandon coûte le domaine ENTIER et ce qui a déjà été facturé
// (1,47 $ perdu sur `boutique-mode`). 20 minutes et deux reprises : le SDK
// rejoue lui-même, sans relancer toute la campagne.
const client = await adaptateur.creerClient(
  (chemin) => readFileSync(join(REPO, ...chemin), "utf8"),
  { timeout: 20 * 60 * 1000, maxRetries: 2 },
);

// EP-051 — tarifs et lecture d'usage : dialecte de l'adaptateur.
const PRIX = {
  in: adaptateur.CONFIG.prixParMtok.entree,
  cacheWrite: adaptateur.CONFIG.prixParMtok.ecritureCache,
  cacheRead: adaptateur.CONFIG.prixParMtok.lectureCache,
  out: adaptateur.CONFIG.prixParMtok.sortie,
};
const coutUSD = (u) => adaptateur.coutUsd(adaptateur.lireUsage(u));

// --- Découpage en sections : 5 groupes, chacun ACCEPTÉ par la grammaire
// structured outputs (sondé section par section puis par groupes —
// probe-grammar.mjs). Ordre de dépendance : base → données → écrans →
// comportement → câblage. ---
// ── CONTRAT CIBLE — CLIQUET DE SYNCHRONISATION (2026-09-09) ──
// Mesuré : ce prompt est resté figé au contrat du 2/09 (~1.9) pendant que le
// schéma marchait jusqu'à 1.18 — chaque nouveauté étant OPTIONNELLE, rien ne
// refusait, le générateur ne la demandait simplement JAMAIS, et chaque app
// générée naissait en dessous du niveau. Un test du paquet air-schema compare
// cette constante à AIR_SCHEMA_VERSION : toute avancée du schéma CASSE la CI
// tant que ce prompt n'a pas été resynchronisé, consciemment.
// EP-137 — resynchronisé sur AIR 1.23.0 (`purpose` : le genre des écrans
// qui n'ont aucune existence métier). Monté DANS LE MÊME GESTE que la
// règle 41, comme le cliquet `generateur-synchronise` l'exige.
export const CONTRAT_CIBLE = "1.34.0";

// ── LE CŒUR DE L'ÉMISSION VIT DÉSORMAIS DANS SON PROPRE MODULE.
//
// 624 lignes — PARTS, partsPour, les digests, SYSTEM_EMIT, callPart et ses
// aides — ont été déplacées TELLES QUELLES dans `emission-coeur.mjs`, pour
// que le produit puisse les appeler sans lancer cette campagne. Rien n'a été
// réécrit : `tests/extraction-coeur.test.mjs` compare l'empreinte du bloc
// déplacé à celle d'avant le déplacement.
//
// La fabrique reçoit les seize dépendances que ce script construisait déjà.
// Aucune n'a été ajoutée ni retirée.
const { creerCoeurEmission } = await import(join(HERE, "emission-coeur.mjs"));
const {
  PARTS, partsPour, surfacesDigest, blocsDigest, registryDigest,
  SYSTEM_EMIT, callPart, texteBrut, extractJson,
} = creerCoeurEmission({ airSchema, registry, blocksRegistry, presentation, ROLES_ICONES, adaptateur, client, MAX_TOKENS, coutUSD, capacitesDeService, etatDepense, budgetUsd, modeleMetier, surfaceEnveloppe, PRIX, z });

const SYSTEM_TRANSCRIBE = `Tu reçois le rendu texte DÉTERMINISTE et COMPLET d'une spécification AIR existante. Tu transcris par sections : à chaque appel, émets UNIQUEMENT les sections demandées, en JSON strictement conforme au schéma fourni.

RÈGLE ABSOLUE : reproduction à l'IDENTIQUE. Chaque identifiant, chaque valeur, chaque ordre de liste, chaque texte localisé doit être repris VERBATIM depuis le rendu. Les valeurs entre backticks sont des littéraux exacts ; les objets/tableaux JSON inclus dans le rendu sont à recopier tels quels. N'ajoute rien, n'omets rien, ne reformule rien, ne "corrige" rien. Un champ optionnel absent du rendu reste absent du JSON.`;

const acceptation = await import(join(HERE, "acceptation.mjs"));
const { validateLocal, jugerAcceptation, perimetreDeJugement, elargit } = acceptation;

/**
 * EP-187 — DEUX TEXTES, DEUX DESTINATAIRES.
 *
 * OBJECTION DE YOUSSOUF, ET ELLE EST JUSTE : « on ne peut pas tout figer, les
 * besoins des utilisateurs on ne les connaît même pas ». Si chaque demande
 * d'un client de Deribfy exige une passe du moteur, Deribfy ne sert à rien.
 *
 * LA LIGNE : reste FIGÉ ce qui est imposé de l'EXTÉRIEUR — « Accueil » et
 * « Compte », les surfaces légales, les conventions Material. Le client ne
 * peut pas les négocier, et c'est ce qui évite le rejet au magasin. TOUT LE
 * RESTE devient exprimable, en TEXTE LIBRE, sans que personne ait eu à le
 * prévoir.
 *
 * CES PRÉFÉRENCES NE PASSENT PAS PAR P0 : P0 écrit le MODÈLE et refuse
 * mécaniquement toute décision d'écran (« écrans, mise en page, navigation,
 * composition » y sont INTERDITS). Elles s'adressent à l'ÉMISSION, qui décide
 * les écrans. La garde métier de P0 reste intacte.
 *
 * UN SEUL SITE LES POSE, pour les trois chemins qui émettent — sans quoi une
 * préférence vaudrait à l'émission et pas à la réparation.
 *
 * RÉSERVE, DITE PLUTÔT QUE TUE : un texte libre n'est PAS vérifiable
 * mécaniquement. Aucun juge ne sait lire une phrase et compter. Une
 * préférence GARANTIE devrait devenir une règle mesurable — préférence par
 * préférence, et c'est alors un choix du propriétaire.
 */
function contexteClient(intention) {
  const demande = `DEMANDE DU CLIENT :\n${intention.text}`;
  if (intention.preferences === undefined) return demande;
  return (
    `${demande}\n\n` +
    `PRÉFÉRENCES DE PRÉSENTATION DU PROPRIÉTAIRE — elles portent sur ce que ` +
    `l'on VOIT, jamais sur ce que l'application FAIT. Honore-les quand elles ` +
    `ne contredisent NI le plan prescrit, NI une règle de ce prompt : ` +
    `celles-là sont imposées par les magasins et ne se négocient pas. Si une ` +
    `préférence contredit une règle, SUIS LA RÈGLE et n'invente aucun ` +
    `compromis.\n${intention.preferences}`
  );
}

async function emitSections(system, contextText, label, usage, refusals, accumulateur, prescriptif) {
  const assembled = accumulateur ?? {};
  for (const part of partsPour(prescriptif)) {
    // Étape ⑤ — les OBLIGATIONS dérivées mécaniquement des sections émises :
    // identifiants promis, cibles autorisées. Zéro coût, zéro supposition.
    const obligations = [
      obligationsPourPasse(part.base ?? part.name, assembled),
      // R5 — quand un modèle existe, la STRUCTURE est PRESCRITE.
      prescriptif === undefined
        ? ""
        : modeleMetier.obligationsPrescriptives(part.base ?? part.name, prescriptif.modele, prescriptif.plan, presentation.DESTINATIONS_MIN),
    ].filter((x) => x !== "").join("\n\n");
    // EP-173 — UN LOT DIT EXACTEMENT CE QU'IL PORTE, et rien d'autre.
    const perimetreDuLot =
      part.base !== "ecrans"
        ? ""
        : part.surfaces === true
          ? `\n\nCE LOT PORTE UNIQUEMENT LES ÉCRANS DE SURFACE (règle 41 — ceux qui se déclarent par \`purpose\`). N'ÉMETS AUCUN écran de parcours : ils ont été émis dans les lots précédents et figurent dans les sections déjà émises.`
          : `\n\nCE LOT PORTE EXACTEMENT CES ÉCRANS, NI PLUS NI MOINS : ${part.ecransAttendus.map((e) => modeleMetier.ecranAirDe(e)).join(", ")}. Les autres écrans du plan sont émis dans d'autres lots — ne les émets pas ici, ne les anticipe pas.`;
    const user =
      `${contextText}\n\nSECTIONS À ÉMETTRE MAINTENANT : ${part.keys.join(", ")}.${perimetreDuLot}` +
      (Object.keys(assembled).length
        ? `\n\nSECTIONS DÉJÀ ÉMISES (à respecter strictement, ne pas réémettre) :\n${JSON.stringify(assembled)}`
        : "") +
      (obligations === "" ? "" : `\n\n${obligations}`);
    let response = await callPart(part, system, user, `${label}:${part.name}`, usage);
    if (adaptateur.lireReponse(response).refusee) {
      refusals.count++;
      response = await callPart(part, system, user, `${label}:${part.name}#retry`, usage);
      if (adaptateur.lireReponse(response).refusee) {
        refusals.count++;
        throw new Error(`refus persistant sur ${part.name}`);
      }
    }
    const emis = extractJson(response);
    if (part.accumule !== undefined) {
      // SANS CECI, CHAQUE LOT EFFACERAIT LE PRÉCÉDENT et le document ne
      // porterait que les écrans du dernier appel.
      const cle = part.accumule;
      assembled[cle] = [...(assembled[cle] ?? []), ...(emis[cle] ?? [])];
      for (const [k, v] of Object.entries(emis)) if (k !== cle) assembled[k] = v;
    } else {
      Object.assign(assembled, emis);
    }
    // EP-169 ① — LE VERDICT DE LA BASE EST RENDU DÈS LA BASE.
    //
    // MESURÉ sur EP-168 : le run s'est arrêté avant les écrans, et le
    // document portait DÉJÀ une barre fausse (« Rechercher » en première
    // destination, « Mon compte » au lieu de « Compte »). Les juges qui le
    // disent existaient, étaient branchés, et n'ont rien dit — parce qu'ils
    // ne sont appelés que sur un document COMPLET. 21 minutes et 1,21 $ plus
    // tard, personne n'avait ce verdict.
    //
    // PUBLIÉ, JAMAIS BLOQUANT : interrompre une émission à mi-course
    // changerait la dynamique du run, et EP-168 vient de rappeler ce qu'on
    // perd à modifier un comportement juste avant de payer.
    if (part.name === "base") {
      const verdictBase = acceptation.jugerBase(assembled, {
        ecransDIdentite: prescriptif?.ecransDIdentite ?? [],
      });
      for (const v of verdictBase) {
        console.log(`  ⚠ [base] ${v.code} — ${String(v.message ?? "").slice(0, 160)}`);
      }
      if (verdictBase.length > 0) refusals.verdictBase = verdictBase.map((v) => v.code);
    }
  }
  return assembled;
}

/**
 * D-103 — AUCUN TRAVAIL DÉJÀ PAYÉ N'EST PERDU. Si l'émission s'interrompt en
 * cours — budget épuisé, refus persistant, troncature — les sections déjà
 * obtenues ont été FACTURÉES. Les jeter reviendrait à payer sans conserver la
 * preuve. L'assemblage partiel voyage donc avec l'erreur.
 */
async function emitSectionsAvecPartiel(system, contextText, label, usage, refusals, prescriptif) {
  const partiel = {};
  return preservation.avecPreservation(preservation.CLE_EMISSION, partiel, () =>
    emitSections(system, contextText, label, usage, refusals, partiel, prescriptif),
  );
}

async function repairSections(
  document,
  diagnostics,
  intentionText,
  label,
  usage,
  refusals,
  accumulateur,
  prescriptif,
) {
  // Réparation BORNÉE (1 passe) et CIBLÉE. D-088 · D1 : les sections réémises
  // sont celles qui PORTENT LE CORRECTIF, plus seulement celle où le défaut
  // s'observe. Mesuré : sur 3 classes de défauts sur 4, la section
  // d'observation ne pouvait pas porter le correctif — la seule issue laissée
  // au modèle était de SUPPRIMER la référence fautive.
  const failing = repairScope.sectionsAReemettre(diagnostics);
  // P9 · LE TRAVAIL DE RÉPARATION VIT DÉSORMAIS HORS DE CETTE PILE. Tant que
  // `repaired` était une variable locale, une erreur technique l'emportait
  // avec elle : les sections déjà réémises — et déjà PAYÉES — disparaissaient.
  const partiel = accumulateur ?? preservation.reparationPartielleVierge(document);
  const repaired = partiel.document;
  // SCISSION `entites`/`donnees` (2026-09-09) : le vocabulaire de sections de
  // la réparation reste STABLE (« donnees » couvre les entités) — c'est ici,
  // et seulement ici, que le nom de passe se traduit en nom de section.
  const sectionDe = (partName) => (partName === "entites" ? "donnees" : partName);
  for (const part of PARTS.filter((p) => failing.includes(sectionDe(p.name)))) {
    // Tous les diagnostics dont CETTE section peut porter le correctif.
    const subset = diagnostics.filter((d) =>
      repairScope.sectionsAReemettre([d]).includes(sectionDe(part.name)),
    );
    if (subset.length === 0) continue;
    const obligations = obligationsPourPasse(part.name, repaired);
    // EP-073 · ② — LA RÉPARATION REÇOIT LES MÊMES PRESCRIPTIONS QUE
    // L'ÉMISSION. Cause racine MESURÉE de l'oscillation (run 22-09 : 14
    // corrigés, 10 RÉINTRODUITS — 3 écrans rendus inatteignables, navigation
    // hors plan) : la section était réécrite AVEUGLE à la structure prescrite.
    const prescriptives =
      prescriptif === undefined
        ? ""
        : modeleMetier.obligationsPrescriptives(part.name, prescriptif.modele, prescriptif.plan, presentation.DESTINATIONS_MIN);
    const user =
      `${intentionText}\n\nDocument complet actuel :\n${JSON.stringify(repaired)}\n\n` +
      (obligations === "" ? "" : `${obligations}\n\n`) +
      (prescriptives === "" ? "" : `${prescriptives}\n\n`) +
      `Les validateurs déterministes signalent ces incohérences dans les sections ${part.keys.join(", ")} :\n` +
      `${JSON.stringify(subset, null, 2)}\n\n` +
      `Réémets UNIQUEMENT les sections ${part.keys.join(", ")}, corrigées : corrige ce que les diagnostics signalent, conserve tout le reste à l'identique.\n\n` +
      "INTERDIT — RÉPARER EN SUPPRIMANT. Un nœud que les diagnostics ne nomment " +
      "pas NE PEUT PAS disparaître : ni entité, ni champ, ni écran, ni bloc, ni " +
      "action, ni promesse. Faire taire un diagnostic en retirant ce qu'il " +
      "désigne indirectement est un ÉCHEC, pas une réparation — la suppression " +
      "est détectée et la réparation REJETÉE. Si une exigence te semble " +
      "impossible à tenir, construis-la quand même dans la section qui la porte.";
    let response = await callPart(part, SYSTEM_EMIT, user, `${label}:${part.name}#repair`, usage);
    if (adaptateur.lireReponse(response).refusee) {
      refusals.count++;
      continue;
    }
    Object.assign(repaired, extractJson(response));
    // La section est réémise ET payée : elle entre dans la preuve AVANT que
    // l'appel suivant ait la moindre occasion d'échouer.
    partiel.sectionsReemises.push(part.name);
  }

  // GARANTIE INTRA-EXÉCUTION (D-088 · D1). Comparer deux GÉNÉRATIONS est mal
  // fondé — le modèle a le droit de remodeler. Comparer l'attempt 1 et
  // l'attempt 2 ne l'est pas : même document, même demande, consigne explicite
  // de tout conserver. Ce qui disparaît sans qu'un diagnostic le nomme est une
  // amputation, et la réparation est REJETÉE — le document d'origine est
  // conservé pour que le défaut reste VISIBLE au lieu d'être maquillé.
  // Deux disparitions, pas une : le nœud RETIRÉ, et le nœud DÉNATURÉ — un champ
  // `asset` retypé en `string` garde son identifiant et perd tout ce qu'il
  // promettait. Les deux rejettent la réparation.
  // TROIS disparitions, pas une. Le nœud RETIRÉ ; le nœud DÉNATURÉ (un champ
  // `asset` retypé) ; et le nœud DÉPLACÉ — un champ passé sous une autre entité
  // garde son identifiant et perd toute obligation d'affichage. L'empreinte
  // sémantique couvre les deux derniers, plus l'inversion de relation, le
  // changement d'effet d'action, la bascule de résolution d'un besoin et la
  // modification de `airSchemaVersion` en cours de réparation.
  const ampute = [
    ...repairScope.amputationsHorsPerimetre(document, repaired, diagnostics),
    ...repairScope
      .mutationsHorsPerimetre(document, repaired, diagnostics)
      .map((m) => `${m.id} (${m.avant} → ${m.apres})`),
  ];
  // D-093 · D8 — LA PREUVE N'EST JAMAIS JETÉE. Lors du rejet précédent, le
  // document RÉPARÉ a été perdu : impossible, après coup, de savoir ce que le
  // modèle avait réellement produit, ni si le rejet était fondé. Il a fallu le
  // reconstituer depuis les signatures du journal. Le document réparé est
  // désormais rendu dans TOUS les cas, retenu ou non.
  return { document: ampute.length > 0 ? document : repaired, repaired, ampute };
}

/**
 * P9 — SYMÉTRIQUE DE `emitSectionsAvecPartiel`, ET POUR LA MÊME RAISON.
 * L'émission était protégée depuis D-103 ; la réparation ne l'était pas. Le
 * `529 Overloaded` de P9 a frappé exactement là : 1,7718 $ payés, sections
 * réparées perdues. Ce qui est payé est conservé, quelle que soit la phase.
 */
async function repairSectionsAvecPartiel(document, diagnostics, intentionText, label, usage, refusals, prescriptif) {
  const partiel = preservation.reparationPartielleVierge(document);
  return preservation.avecPreservation(preservation.CLE_REPARATION, partiel, () =>
    repairSections(document, diagnostics, intentionText, label, usage, refusals, partiel, prescriptif),
  );
}

async function roundTrip(air, slug, usage, refusals) {
  const rendered = airSchema.renderAirToText(air);
  const context = `RENDU TEXTE DE LA SPÉCIFICATION À TRANSCRIRE :\n\n${rendered}`;
  const document = await emitSectionsAvecPartiel(SYSTEM_TRANSCRIBE, context, `${slug}#rt`, usage, refusals);
  const { air: air2, diagnostics } = validateLocal(document);
  if (air2 === null || diagnostics.length > 0) {
    return { ok: false, schemaValid: air2 !== null, diagnosticsCount: diagnostics.length };
  }
  const h1 = airSchema.hashCanonical(air);
  const h2 = airSchema.hashCanonical(air2);
  return { ok: true, identical: h1 === h2, hash1: h1, hash2: h2 };
}

function corpusJson(air) {
  return JSON.stringify(JSON.parse(airSchema.canonicalJson(air)), null, 2) + "\n";
}

const RESULTS_DIR = join(HERE, "results");
// SORTIE EN corpus-v3 (D-078) — la version précédente écrivait dans
// `corpus-v2`, LE CORPUS GELÉ. Elle l'aurait ÉCRASÉ, détruisant du même coup la
// base de comparaison de toutes les mesures historiques (D-025) et le
// avant/après que cette campagne existe pour produire. Le gel n'est pas une
// formalité : c'est ce qui rend un « avant » opposable.
const CORPUS_DIR = join(REPO, "packages/golden-corpus/corpus-v3");
mkdirSync(CORPUS_DIR, { recursive: true });
mkdirSync(RESULTS_DIR, { recursive: true });
mkdirSync(CORPUS_DIR, { recursive: true });
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const JOURNAL = join(RESULTS_DIR, `campagne-v2-${RUN_ID}.jsonl`);

/**
 * P9 · UN ARTEFACT PORTE SA GÉNÉRATION, OU N'EST PAS UNE PREUVE.
 *
 * CAUSE RACINE : les artefacts portaient un nom FIXE, réécrit à chaque
 * campagne. `coach-fitness.attempt2.air.json` produit par P8 a survécu à P9
 * sous un nom que rien ne distinguait d'un artefact de P9 — et une lecture
 * rapide l'a effectivement pris pour tel.
 *
 * Le nom porte maintenant le `RUN_ID`, le même que celui du journal : un
 * artefact se rattache à sa campagne SANS contexte, par son seul nom. Et
 * l'écriture est en `wx` — deux campagnes ne peuvent pas se recouvrir, et un
 * artefact déjà déposé ne peut pas être remplacé en silence.
 */
function ecrireArtefact(slug, phase, contenu) {
  const fichier = preservation.nomArtefact({ slug, runId: RUN_ID, phase });
  writeFileSync(join(RESULTS_DIR, fichier), JSON.stringify(contenu, null, 2) + "\n", {
    flag: "wx",
  });
  return fichier;
}

// EP-065 — JETON DE GO OBLIGATOIRE. Ce module DÉPENSAIT AU CHARGEMENT : un
// import réflexe (vérification d'interpolation, outillage, test) a lancé une
// campagne réelle sans GO (0,3601 $ journalisés, tuée en vol). Même patron
// que dry-run-p0.mjs (EP-030) : aucun appel payant ne part sans un jeton
// explicite posé PAR le lanceur humain — un import ne le possède jamais.
if (process.env.GO_CAMPAGNE !== "OUI-JE-PAIE") {
  console.error(
    "REFUS (EP-065) : lancer une campagne exige GO_CAMPAGNE=OUI-JE-PAIE " +
      "(GO budgétaire explicite). Un import de ce module ne dépense plus.",
  );
  process.exit(2);
}

const start = Number(process.argv[2] ?? 0);
const end = Number(process.argv[3] ?? INTENTIONS.length);

// ── D-103 · LE PLAFOND MORD ENTRE CHAQUE APPEL, PLUS SEULEMENT ENTRE INTENTIONS.
//
// Il était vérifié UNE FOIS, au début de chaque intention, et le coût n'était
// additionné qu'APRÈS l'intention entière. Une intention unique comparait donc
// le plafond à ZÉRO puis courait sans contrôle : P6 a coûté 2,7396 $ pour
// 2,50 $ annoncés, et l'exposition réelle d'un lancement était ~16,80 $.
//
// `BUDGET_USD` est réglable par l'appelant : `BUDGET_USD=3.5 node emit-v3.mjs 2 3`.
// À défaut, le plafond historique de 25 $ (D-025) s'applique.
const PLAFOND_USD = Number(process.env.BUDGET_USD ?? 25);
let etatDepense = budgetUsd.DEPENSE_INITIALE;
// EP-050/EP-060 — l'alerte 90 % est un INSTRUMENT du GO : le franchissement
// est signalé UNE fois, la campagne continue (le plafond, lui, mord à 100 %,
// D-103). Une borne approchée à 90 % doit être révisée avant la mesure suivante.
let alerteNeufDixiemesEmise = false;
const TARIFS = {
  entree: PRIX.in,
  ecritureCache: PRIX.cacheWrite,
  lectureCache: PRIX.cacheRead,
  sortie: PRIX.out,
};
const summary = [];

// ── MODE RÉPARATION SEULE (2026-09-04) — `--reparer <artefact> <slug>`.
//
// LACUNE COMBLÉE, mesurée : il n'existait aucun moyen de reprendre un document
// déjà émis. Un run interrompu — par le plafond, par une erreur — obligeait à
// tout régénérer depuis zéro, soit 7 appels payés une seconde fois pour
// corriger ce qui ne tenait qu'en 1 à 3. Le lot 7 en a fait les frais.
//
// Ce mode ne réémet RIEN : il charge un artefact existant, le valide, et
// n'appelle le modèle QUE sur les sections que les diagnostics désignent, par
// la MÊME fonction que la campagne (`repairSectionsAvecPartiel`) — aucune
// duplication de prompt, donc aucune divergence possible entre les deux
// chemins. Le plafond `BUDGET_USD` mord à l'identique, avant chaque appel.
// Le corpus n'est écrit que si le document devient VALIDE.
if (process.argv[2] === "--reparer") {
  const chemin = process.argv[3];
  const slug = process.argv[4];
  if (chemin === undefined || slug === undefined) {
    console.error("usage : node emit-v3.mjs --reparer <artefact.air.json> <slug>");
    process.exit(1);
  }
  const intention = INTENTIONS.find((i) => i.slug === slug);
  if (intention === undefined) {
    console.error(`slug inconnu : ${slug}`);
    process.exit(1);
  }
  const document = JSON.parse(readFileSync(chemin, "utf8"));
  const { diagnostics } = validateLocal(document);
  console.log(`  ${diagnostics.length} diagnostic(s) · sections : ${JSON.stringify(repairScope.sectionsAReemettre(diagnostics))}`);
  if (diagnostics.length === 0) {
    console.log("  déjà valide — aucun appel émis, 0 $");
    process.exit(0);
  }
  const usage = [];
  const refusals = { count: 0 };
  let resultat;
  try {
    resultat = await repairSectionsAvecPartiel(
      document,
      diagnostics,
      contexteClient(intention),
      slug,
      usage,
      refusals,
    );
  } catch (e) {
    console.error(`  🔴 INTERROMPU — ${String(e.message ?? e).slice(0, 200)}`);
    // LE TRAVAIL PAYÉ NE MEURT PAS AVEC LE PROCESSUS (mesuré le 2026-09-10 :
    // 0,89 $ de sections réparées perdues faute de cette écriture — le garde
    // les attachait à l'erreur, le CLI les jetait). Même règle que la
    // campagne : tout partiel exploitable est ÉCRIT avant de sortir.
    const partiel = preservation.partielDeLErreur(e, preservation.CLE_REPARATION);
    if (partiel !== undefined && preservation.estExploitable(partiel)) {
      const f = ecrireArtefact(slug, "reparation-partielle", partiel.document);
      console.log(`  partiel conservé (${partiel.sectionsReemises.join(", ")}) : ${f}`);
    }
    console.log(`  dépensé ~$${etatDepense.depense.toFixed(4)} · ${usage.length} appel(s)`);
    process.exit(1);
  }
  const apres = validateLocal(resultat.repaired);
  const fichier = ecrireArtefact(slug, "repare", resultat.repaired);
  console.log(`  artefact : ${fichier}`);
  console.log(`  diagnostics ${diagnostics.length} -> ${apres.diagnostics.length}`);
  console.log(`  coût ~$${etatDepense.depense.toFixed(4)} · ${usage.length} appel(s)`);
  if (apres.air !== null && apres.diagnostics.length === 0) {
    writeFileSync(join(CORPUS_DIR, `${slug}.air.json`), JSON.stringify(resultat.repaired, null, 2) + "\n");
    console.log(`  🟢 VALIDE — versé au corpus`);
  } else {
    console.log(`  🔴 encore invalide — corpus NON écrit`);
    for (const d of apres.diagnostics.slice(0, 5)) console.log(`     ${d.code} · ${d.path}`);
  }
  process.exit(apres.diagnostics.length === 0 ? 0 : 1);
}

for (const intention of INTENTIONS.slice(start, end)) {
  if (etatDepense.depense >= PLAFOND_USD) {
    console.log(
      `PLAFOND ${PLAFOND_USD}$ ATTEINT — ARRÊT (D-025). Dépensé: $${etatDepense.depense.toFixed(4)}`,
    );
    break;
  }
  const t0 = Date.now();
  // ── L'ÉCHELLE REPART DU NIVEAU NOMINAL À CHAQUE DOCUMENT (2026-09-01).
  //
  // `PARTS` est construit UNE FOIS au chargement : sans cette remise à zéro, un
  // refus rencontré sur le document 1 laissait la part en position dégradée
  // pour tous les documents suivants. Chaque `part` a bien son propre
  // `levelIndex` — la contamination n'était pas entre parts, elle était entre
  // DOCUMENTS. Un document ne doit pas hériter de la dégradation d'un autre.
  for (const part of PARTS) part.levelIndex = 0;
  const journal = { runId: RUN_ID, intention: intention.slug, commerce: intention.commerce };
  const usage = [];
  const refusals = { count: 0 };
  try {
    // ── R5 (EP-055/EP-027a) — PASSE 0 : comprendre AVANT d'émettre. UN
    // appel, grammaire canonique dégradée par l'adaptateur (écarts
    // déclarés) ; un modèle refusé par P1 ARRÊTE l'intention à ~0,1 $ au
    // lieu de payer huit passes. Fail-closed : aucun modèle ⇒ aucune
    // prescription ⇒ pipeline historique (consigné au journal).
    let prescriptif;
    {
      // EP-070 · ③ — BOUCLE BORNÉE DE TIRAGE P0 : 3 tentatives MAXIMUM,
      // jamais plus. La boucle ne MASQUE pas la variance, elle la COMPTE :
      // chaque tentative est journalisée avec son arrêt et ses diagnostics,
      // et le taux de passage est PUBLIÉ au BILAN — c'est le chiffre qui
      // dimensionne R8 (EP-069 : 1/5 observé en tirages isolés). À
      // l'épuisement : arrêt et rapport. JAMAIS de dégradation ni
      // d'assouplissement de juge pour « faire passer » — les juges sont
      // les mêmes à chaque tentative, seul le tirage change.
      const P0_TENTATIVES_MAX = 3;
      journal.p0Tentatives = [];
      const requeteP0 = passe0.construireRequeteP0(intention.text);
      const { grammaire } = adaptateur.degraderGrammaire(requeteP0.grammaire);
      for (let tentative = 1; ; tentative++) {
        // COMPTABILITÉ : la passe 0 passe par callPart — LE seul propriétaire
        // du garde, du push et du cumul (cliquet de préservation honoré, pas
        // édité) ; la troncature y est traitée comme partout (corps préservé).
        const partP0 = {
          name: "p0",
          keys: ["modele"],
          levels: [{ name: "canonique-degradee-adaptateur", schema: grammaire }],
          levelIndex: 0,
        };
        const coutAvant = etatDepense.depense;
        const reponseP0 = await callPart(partP0, requeteP0.system, requeteP0.user, `${intention.slug}:p0#t${tentative}`, usage);
        const neutreP0 = adaptateur.lireReponse(reponseP0);
        const verdictP0 = passe0.jugerSortieP0(neutreP0.texte, intention.text, { tronquee: neutreP0.tronquee });
        ecrireArtefact(
          intention.slug, `modele-p0-t${tentative}`,
          verdictP0.ok ? verdictP0.modele : { brut: neutreP0.texte },
        );
        const diagnosticsPlan = verdictP0.ok
          ? (() => {
              const plan = modeleMetier.ecransDe(verdictP0.modele);
              return [...plan.diagnostics, ...modeleMetier.jugerPlanEcrans(plan, verdictP0.modele)];
            })()
          : [];
        const arret = !verdictP0.ok ? "P1" : diagnosticsPlan.length > 0 ? "P2" : "passe";
        journal.p0Tentatives.push({
          tentative,
          coutUSD: Number((etatDepense.depense - coutAvant).toFixed(4)),
          arret,
          diagnostics: !verdictP0.ok
            ? verdictP0.diagnostics.map((x) => x.code)
            : diagnosticsPlan.map((x) => x.code),
        });
        journal.passe0 = {
          ok: verdictP0.ok,
          diagnostics: verdictP0.diagnostics.map((x) => x.code),
          observation: verdictP0.observation ?? null,
        };
        if (arret === "passe") {
          const plan = modeleMetier.ecransDe(verdictP0.modele);
          // EP-190 ② — LE PRESCRIPTIF PORTE LES ÉCRANS D'IDENTITÉ.
          //
          // QUATORZIÈME VARIANTE DU MOTIF, ET LA TONTINE L'A RÉVÉLÉE : elle
          // porte DEUX concepts d'identité, et `jugerBase` criait pourtant
          // `PRESENTATION_ESPACE_COMPTE_ABSENT` au premier appel. Le juge
          // disait vrai SUR CE QU'IL VOYAIT — il recevait `ecransDIdentite:
          // []`, parce que personne ne les lui transmettait.
          //
          // DÉRIVÉ, jamais recopié : `estConceptIdentite` décide, `ecranAirDe`
          // traduit. Les deux existent et sont éprouvés depuis EP-139.
          const conceptsIdentite = verdictP0.modele.concepts
            .map((c) => c.id)
            .filter((id) => modeleMetier.estConceptIdentite(verdictP0.modele, id));
          const surfacesModele = modeleMetier.surfacesDe(verdictP0.modele);
          const ecransDIdentite = plan.ecrans
            .filter((e) =>
              (e.surfaces ?? []).some((sid) =>
                conceptsIdentite.includes(
                  surfacesModele.find((sf) => sf.surfaceId === sid)?.concept,
                ),
              ),
            )
            .map((e) => modeleMetier.ecranAirDe(e.ecranId));
          prescriptif = { modele: verdictP0.modele, plan, ecransDIdentite };
          break;
        }
        console.log(
          `  [${intention.slug}] tirage P0 ${tentative}/${P0_TENTATIVES_MAX} arrêté à ${arret} — la boucle compte la variance, elle ne la masque pas`,
        );
        if (tentative >= P0_TENTATIVES_MAX) {
          throw new Error(
            `P0/P2 refusés ${P0_TENTATIVES_MAX} fois (arrêts : ${journal.p0Tentatives.map((t) => t.arret).join(", ")}) — intention arrêtée AVANT les passes AIR`,
          );
        }
      }
    }
    let document = await emitSectionsAvecPartiel(
      SYSTEM_EMIT,
      contexteClient(intention),
      intention.slug,
      usage,
      refusals,
      prescriptif,
    );
    // EP-169 ② — le modèle voyage jusqu'au juge des capacités.
    let { air, diagnostics } = validateLocal(document, prescriptif);
    // R5+R6 — l'acceptation COMPLÈTE (navigation prescrite, vivacité,
    // conformance) tourne ici ET après réparation : mêmes juges, un seul code.
    diagnostics = [...diagnostics, ...jugerAcceptation(air, prescriptif, intention)];
    journal.diagnosticsPremierePasse = diagnostics.length;
    journal.attempts = 1;

    if (air === null || diagnostics.length > 0) {
      journal.attempts = 2;

      // D-088 · D8 — L'ATTEMPT 1 NE DISPARAÎT PLUS SANS TRACE.
      // La campagne précédente n'a journalisé qu'un NOMBRE de diagnostics :
      // impossible, après coup, de dire si le modèle avait réparé en
      // construisant ou en supprimant. La preuve la plus chère était détruite
      // à l'écriture du journal. Aucun secret n'entre ici : l'AIR est refusé
      // par `AIR_INTEGRATION_SECRET_LIKE_KEY` s'il en portait.
      const fichierAttempt1 = ecrireArtefact(intention.slug, "attempt1", document);
      journal.attempt1 = {
        fichier: fichierAttempt1,
        diagnostics: diagnostics.map((d) => ({ code: d.code, path: d.path })),
        sectionsReemises: repairScope.sectionsAReemettre(diagnostics),
        raisonDuRetry: air === null ? "schema-invalide" : "diagnostics-semantiques",
      };

      const avantReparation = document;
      const resultat = await repairSectionsAvecPartiel(
        document,
        diagnostics,
        contexteClient(intention),
        intention.slug,
        usage,
        refusals,
        prescriptif,
      );
      document = resultat.document;
      journal.amputationsRejetees = resultat.ampute;

      // Trois artefacts DISTINCTS et tous conservés, même quand ils diffèrent :
      //   generatedAttempt — ce que le modèle a écrit seul ;
      //   repairedAttempt  — ce qu'il a produit en réparant ;
      //   acceptedDocument — ce que le pipeline a finalement retenu.
      const fichierAttempt2 = ecrireArtefact(intention.slug, "attempt2", resultat.repaired);
      journal.attempt2 = {
        fichier: fichierAttempt2,
        retenu: resultat.ampute.length === 0,
        motifDuRejet: resultat.ampute.length > 0 ? resultat.ampute : undefined,
      };
      journal.artefacts = {
        generatedAttempt: journal.attempt1.fichier,
        repairedAttempt: fichierAttempt2,
        acceptedDocument: resultat.ampute.length === 0 ? fichierAttempt2 : journal.attempt1.fichier,
      };
      if (resultat.ampute.length > 0) {
        // La réparation a été REJETÉE : le document d'origine est conservé et
        // le défaut reste visible. Ne jamais maquiller une amputation en
        // succès — c'est exactement ce que ce chantier ferme.
        console.log(
          `  [${intention.slug}] RÉPARATION REJETÉE — amputation hors périmètre : ${resultat.ampute.join(", ")}`,
        );
      }
      ({ air, diagnostics } = validateLocal(document, prescriptif));
      // R6 — les MÊMES juges qu'à l'attempt 1 : un juge absent après
      // réparation ne jugeait pas (mesuré EP-061 : la navigation prescrite
      // ne re-tournait pas sur l'attempt 2).
      diagnostics = [...diagnostics, ...jugerAcceptation(air, prescriptif, intention)];
      // EP-073 · ② — GATE ANTI-OSCILLATION (patron D-088) : une réparation
      // qui INTRODUIT des diagnostics absents de l'attempt 1 détruit en
      // réparant — elle est REJETÉE, le document d'origine est conservé et
      // l'oscillation est JOURNALISÉE, jamais maquillée en progrès.
      const clesAttempt1 = new Set(
        (journal.attempt1?.diagnostics ?? []).map((x) => `${x.code}|${x.path}`),
      );
      const introduits = diagnostics.filter((x) => !clesAttempt1.has(`${x.code}|${x.path}`));
      // EP-102 · ① — L'OSCILLATION NE SE JUGE QU'ENTRE DOCUMENTS COMPARABLES.
      // Si la réparation ÉLARGIT le périmètre de jugement (elle rend jugeable
      // ce qui ne l'était pas), les diagnostics qui apparaissent sont RÉVÉLÉS,
      // pas introduits : la retenir, et son résultat devient la nouvelle base.
      // Périmètre ÉGAL ⇒ la gate juge comme avant (L-098-C inchangé) ;
      // périmètre RÉTRÉCI ⇒ régression franche, rejet.
      const perimetreAvant = perimetreDeJugement(
        validateLocal(avantReparation).air,
        prescriptif,
      );
      const perimetreApres = perimetreDeJugement(air, prescriptif);
      const revelation = elargit(perimetreAvant, perimetreApres);
      if (revelation) {
        console.log(
          `  [${intention.slug}] réparation RETENUE — elle RÉTABLIT la jugeabilité (${perimetreAvant.length}→${perimetreApres.length} familles de juges) : ${introduits.length} diagnostic(s) RÉVÉLÉS, non introduits`,
        );
        journal.reparationRevelation = {
          perimetreAvant,
          perimetreApres,
          revelesNonIntroduits: introduits.length,
        };
      }
      if (introduits.length > 0 && !revelation) {
        console.log(
          `  [${intention.slug}] RÉPARATION REJETÉE — OSCILLATION : ${introduits.length} diagnostic(s) INTRODUITS (${[...new Set(introduits.map((x) => x.code))].join(", ")})`,
        );
        journal.reparationOscillante = introduits.map((x) => ({ code: x.code, path: x.path }));
        document = avantReparation;
        ({ air, diagnostics } = validateLocal(document, prescriptif));
        diagnostics = [...diagnostics, ...jugerAcceptation(air, prescriptif, intention)];
        journal.artefacts.acceptedDocument = journal.attempt1.fichier;
      }
      journal.reparationBilan = {
        avant: (journal.attempt1?.diagnostics ?? []).length,
        apres: diagnostics.length,
        introduits: revelation ? 0 : introduits.length,
        ...(revelation ? { reveles: introduits.length } : {}),
      };
      journal.diagnosticsApresReparation = diagnostics.length;
      journal.diagnosticsRestantsCodes = [...new Set(diagnostics.map((d) => d.code))];
      journal.identiqueAvantApres = avantReparation === document;
    }

    const bilan = budgetUsd.issueGeneration({
      interrompuBudget: false,
      // Ce chemin est celui où AUCUNE erreur n'a été levée : le seul où
      // `terminee` peut être dit sans mentir.
      erreurTechnique: false,
      reparationRejetee: (journal.amputationsRejetees?.length ?? 0) > 0,
      sansDiagnostic: air !== null && diagnostics.length === 0,
    });
    journal.issue = bilan.issue;
    journal.valid = bilan.valid;
    // D-103 — L'EMPREINTE EST CONSIGNÉE MÊME EN ÉCHEC. Elle ne l'était que si
    // le document était valide : une génération rejetée ne laissait donc aucune
    // empreinte du document effectivement retenu, et P5 a dû être reconstituée
    // depuis les signatures du journal. Le hash canonique n'exige pas la
    // validité sémantique, seulement la conformité au schéma.
    if (air !== null) journal.airHash = airSchema.hashCanonical(air);
    if (journal.valid) {
      journal.commerceEmis = air.compliance.commerceClass;
      journal.commerceAttendu = intention.commerce;
      writeFileSync(join(CORPUS_DIR, `${intention.slug}.air.json`), corpusJson(air));
      journal.corpusFile = `${intention.slug}.air.json`;
    } else {
      journal.diagnosticsRestants = diagnostics.slice(0, 12);
    }
  } catch (error) {
    // D-103 · QUATRE ISSUES DISTINCTES, jamais confondues. Un arrêt budgétaire
    // n'est ni un succès ni une erreur technique : c'est un ÉCHEC PROPRE, et
    // `valid` ne peut pas être vrai — le document est partiel.
    //
    // P9 · TOUTE ERREUR NON BUDGÉTAIRE ARRIVÉE ICI EST UN ÉCHEC TECHNIQUE.
    // Elle était classée `terminee` — l'état le plus favorable — parce que le
    // classifieur n'en connaissait pas d'autre. Le `529 Overloaded` de P9 a
    // donc été journalisé comme une génération TERMINÉE.
    const budgetaire = error instanceof budgetUsd.BudgetEpuiseError;
    const technique = !budgetaire;
    journal.erreur = String(error?.message ?? error).slice(0, 400);
    journal.interrompuBudget = budgetaire;
    journal.erreurTechnique = technique;

    // ── CE QUI A ÉTÉ PAYÉ EST CONSERVÉ — LES DEUX PHASES, PAS UNE SEULE.
    const partiel = preservation.partielDeLErreur(error, preservation.CLE_EMISSION);
    if (partiel !== undefined && Object.keys(partiel).length > 0) {
      journal.assemblagePartiel = {
        fichier: ecrireArtefact(intention.slug, "emission-partielle", partiel),
        sectionsObtenues: Object.keys(partiel).sort(),
      };
    }
    // P9 — LA RÉPARATION AUSSI. C'est là que le 529 a frappé, et c'est
    // exactement ce travail-là qui a été perdu.
    // Le corps d'une réponse tronquée est une PREUVE PAYÉE : il est déposé
    // comme tel. Ce n'est pas un document — il est incomplet par définition.
    const tronque = preservation.partielDeLErreur(error, preservation.CLE_CORPS_TRONQUE);
    if (tronque !== undefined) {
      journal.reponseTronquee = {
        label: tronque.label,
        jetonsSortie: tronque.jetonsSortie,
        octets: tronque.corps.length,
        fichier:
          tronque.corps.length > 0
            ? ecrireArtefact(intention.slug, "reponse-tronquee", tronque)
            : undefined,
      };
    }
    const partielReparation = preservation.partielDeLErreur(error, preservation.CLE_REPARATION);
    if (partielReparation !== undefined) {
      journal.reparationPartielle = {
        sectionsReemises: [...partielReparation.sectionsReemises],
        // Zéro section réémise : la panne a frappé avant qu'aucune réparation
        // ne soit produite. Le fait est consigné, aucun artefact n'est inventé.
        fichier: preservation.estExploitable(partielReparation)
          ? ecrireArtefact(intention.slug, "reparation-partielle", partielReparation.document)
          : undefined,
      };
    }

    const { issue, valid } = budgetUsd.issueGeneration({
      interrompuBudget: budgetaire,
      erreurTechnique: technique,
      reparationRejetee: (journal.amputationsRejetees?.length ?? 0) > 0,
      sansDiagnostic: false,
    });
    journal.issue = issue;
    journal.valid = valid;
    const conserves = JSON.stringify({
      ...(journal.artefacts ?? { generatedAttempt: journal.attempt1?.fichier }),
      emissionPartielle: journal.assemblagePartiel?.fichier,
      reparationPartielle: journal.reparationPartielle?.fichier,
    });
    if (budgetaire) {
      console.log(
        `  [${intention.slug}] INTERROMPUE POUR BUDGET — ${error.message}\n` +
          `  artefacts conservés : ${conserves}`,
      );
    } else {
      console.log(
        `  [${intention.slug}] ÉCHEC TECHNIQUE — ${journal.erreur}\n` +
          `  issue=${issue} (JAMAIS « terminee ») · artefacts conservés : ${conserves}`,
      );
    }
  }
  journal.refusals = refusals.count;
  const cost = usage.reduce((s, u) => s + coutUSD(u ?? {}), 0);
  journal.depenseCumulee = Number(etatDepense.depense.toFixed(4));
  journal.appelsAPI = etatDepense.appels;
  journal.coutUSD = Number(cost.toFixed(4));
  journal.dureeMs = Date.now() - t0;
  appendFileSync(JOURNAL, JSON.stringify(journal) + "\n");
  summary.push(journal);
  console.log(
    `[${intention.slug}] valid=${journal.valid} attempts=${journal.attempts ?? "-"} refus=${refusals.count} ` +
      `rt=${journal.roundTrip ? (journal.roundTrip.identical ? "IDENTIQUE" : journal.roundTrip.ok ? "valide-non-identique" : "invalide") : "-"} ` +
      `$${journal.coutUSD} ${Math.round(journal.dureeMs / 1000)}s ${journal.erreur ? "ERREUR: " + journal.erreur : ""}`,
  );
}

const valid = summary.filter((j) => j.valid).length;
// R6 (EP-062) — UN CHIFFRE EXIGE UNE ATTESTATION. Le round-trip est
// DÉBRANCHÉ (roundTrip() n'est appelé nulle part — EP-061f) : afficher
// « conformes 0/N » pour un instrument jamais appelé était un faux négatif
// silencieux. Le BILAN ne rend un compte QUE sur les journaux où
// l'instrument a réellement tourné, et NOMME l'absence sinon.
const rtJournaux = summary.filter((j) => j.roundTrip !== undefined);
const identical = rtJournaux.filter((j) => j.roundTrip.identical).length;
const rtValid = rtJournaux.filter((j) => j.roundTrip.ok).length;
const rtBilan =
  rtJournaux.length === 0
    ? "round-trip NON EXÉCUTÉ (instrument débranché — EP-061f)"
    : `round-trip conformes ${rtValid}/${rtJournaux.length} · identiques ${identical}/${rtJournaux.length}`;

// EP-070 · ③ — le taux de passage P0→P2 est PUBLIÉ à chaque campagne :
// c'est le chiffre qui dimensionne R8, jamais un détail interne.
const tiragesP0 = summary.flatMap((j) => j.p0Tentatives ?? []);
const passagesP0 = tiragesP0.filter((t) => t.arret === "passe").length;
const bilanP0 =
  tiragesP0.length === 0
    ? "P0 NON TIRÉ"
    : `passage P0→P2 : ${passagesP0}/${tiragesP0.length} tirages`;

// EP-162 ① — L'ATTESTATION EST JUGÉE, PLUS SEULEMENT ÉCRITE.
//
// Le principe « un chiffre exige une attestation » (R6, EP-062) était appliqué
// À LA MAIN, deux fois : un `if` pour le round-trip, un autre pour P0. Le juge
// qui le porte — `jugerAttestations` — existait et NE TOURNAIT PAS (EP-161).
// Il tourne désormais sur les instruments du bilan : un chiffre publié au nom
// d'un instrument qui n'a pas tourné est NOMMÉ, quel que soit l'instrument, y
// compris ceux qu'on ajoutera demain.
const INSTRUMENTS_DU_BILAN = ["passage-p0", "round-trip", "acceptation"];
const instrumentsExecutes = new Set([
  ...(tiragesP0.length > 0 ? ["passage-p0"] : []),
  ...(rtJournaux.length > 0 ? ["round-trip"] : []),
  ...(summary.length > 0 ? ["acceptation"] : []),
]);
const attestations = vivacite.jugerAttestations(
  INSTRUMENTS_DU_BILAN,
  instrumentsExecutes,
);
for (const a of attestations) console.log(`  ⚠ ${a.code} — ${a.message}`);
console.log(
  `\nBILAN tranche [${start},${end}) : ${valid}/${summary.length} AIR valides · ` +
    `${bilanP0} · ${rtBilan} · ` +
    `coût ~$${etatDepense.depense.toFixed(4)} · ${etatDepense.appels} appels · journal ${JOURNAL}`,
);
