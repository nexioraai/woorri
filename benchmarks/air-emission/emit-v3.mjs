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
export const CONTRAT_CIBLE = "1.25.0";

const PARTS = [
  {
    name: "base",
    keys: [
      "airSchemaVersion",
      "projectId",
      "app",
      "navigation",
      "design",
      "network",
      "native",
      "compliance",
    ],
  },
  // SCISSION 2026-09-09 (même patron que D-078, mesuré et non supposé) :
  // « The compiled grammar is too large » sur `donnees` à TOUS les niveaux de
  // dégradation — le schéma des champs a grossi depuis le 2/09 (label,
  // enumLabels en liste de paires, sensitive). Les entités portent seules la
  // grammaire la plus lourde ; le reste des données suit dans sa propre passe.
  { name: "entites", keys: ["entities"] },
  { name: "donnees", keys: ["relations", "datasets", "rules", "slots"] },
  // ÉTAPE ⑤ (EP-005, 2026-09-11) — RÉORDONNÉ après démonstration des
  // dépendances : la règle 5 exige que `actions.effect.capability` référence
  // une capability DÉCLARÉE — or `capacites` s'émettait APRÈS `actions`
  // (promesse avant déclaration). Les capacités ne dépendent d'aucune section
  // aval : elles passent AVANT les écrans. Le cycle écrans↔actions, lui, ne
  // se réordonne pas (blocs→actionId ET actions→blockId) : il est CONTRAINT
  // par les obligations mécaniques (obligations-passes.mjs).
  { name: "capacites", keys: ["capabilities", "permissions"] },
  { name: "ecrans", keys: ["screens"] },
  // DÉCOUPAGE (D-078) — mesuré, pas supposé : « The compiled grammar is too
  // large » sur `base` ET `comportement`. Les liaisons de slot et `thenScreenId`
  // ont grossi le schéma des actions au-delà de la limite des sorties
  // structurées, même au niveau le plus dégradé. Chaque section porte désormais
  // une grammaire que le service accepte.
  { name: "actions", keys: ["actions"] },
  { name: "cablage", keys: ["integrations", "expectedTests"] },
  // INTENTION EN DERNIER — ses `nodeIds` désignent des écrans, actions et
  // entités : on ne peut dire QUELS nœuds portent un besoin qu'une fois ces
  // nœuds émis. La placer en tête aurait forcé le modèle à référencer ce qui
  // n'existe pas encore.
  { name: "intention", keys: ["intent"] },
];

/**
 * `minItems` SUPÉRIEUR À 1 → RAMENÉ À 1, le reste INTACT.
 *
 * CAUSE RACINE MESURÉE (2026-09-01) : l'API refuse un schéma de sortie portant
 * un `minItems` autre que 0 ou 1 — « For 'array' type, 'minItems' values other
 * than 0 or 1 are not supported ». Sur le schéma AIR complet, **une seule**
 * contrainte est dans ce cas : `minItems: 3` sur
 * `$.navigation.primary.destinations`, introduite par D-086. Les 16 autres
 * valent 1 et sont acceptées.
 *
 * L'échelle répondait à cette unique incompatibilité en descendant d'un cran
 * qui détruit **35 contraintes** — 17 `minItems`, 16 `minLength`, et les DEUX
 * seules bornes hautes du schéma : `maxItems: 5` sur ces mêmes destinations et
 * `maxLength: 80` sur `app.name`. Une porte fermée à coups de mur.
 *
 * Ramener à 1 conserve ce qui peut l'être — le tableau doit rester non vide —
 * et laisse toutes les autres contraintes en place. Les niveaux suivants
 * demeurent, inchangés : ce sont des filets, pas le premier réflexe.
 */


for (const part of PARTS) {
  const pick = Object.fromEntries(part.keys.map((k) => [k, true]));
  part.zod = airSchema.projectAirSchema.pick(pick);
  // EP-051 — l'ÉCHELLE de dégradation est DÉCLARÉE par l'adaptateur.
  part.levels = adaptateur.degradationsPourEchelle(z.toJSONSchema(part.zod, { target: "draft-2020-12" }));
  part.levelIndex = 0;
}

// EP-153 — LE DIGEST DES BLOCS EST DÉRIVÉ DU REGISTRE.
//
// HUITIÈME OCCURRENCE DU MOTIF, et celle-ci a coûté quatre runs : le registre
// des blocs vit dans `definitions.ts`, et le prompt le RÉÉCRIVAIT à la main,
// bloc par bloc, prop par prop. La copie avait divergé — elle OMETTAIT
// `filterValue` et `filterOperator` de la liste `list`, et ne donnait le TYPE
// d'aucune prop. Le générateur a donc posé `filterValue: true` sur un champ
// booléen : geste sensé, valeur refusée par le registre, document non
// compilable. Quatre runs payés, rien à installer.
//
// Le type ne pouvait pas non plus venir de la grammaire : les props voyagent
// en `flatConfig` (paires clé/valeur), qui accepte les booléens. Le contrat
// des props n'est vérifié qu'APRÈS, par le registre. Entre les deux, le
// prompt était le seul canal — et il se taisait.
function blocsDigest() {
  const lignes = [];
  for (const id of blocksRegistry.listBlockIds()) {
    const bloc = blocksRegistry.getBlock(id);
    if (bloc === undefined) continue;
    const js = z.toJSONSchema(bloc.propsSchema, { target: "draft-2020-12", io: "input" });
    const requises = new Set(js.required ?? []);
    const props = Object.entries(js.properties ?? {}).map(([clef, def]) => {
      const type = def.type ?? (def.enum !== undefined ? "enum" : def.anyOf !== undefined ? "union" : "?");
      const valeurs = def.enum === undefined ? "" : ` parmi ${def.enum.map((v) => JSON.stringify(v)).join("|")}`;
      const items = def.items?.enum === undefined ? "" : ` de ${def.items.enum.map((v) => JSON.stringify(v)).join("|")}`;
      return `${clef}${requises.has(clef) ? " (REQUIS)" : "?"} : ${type}${valeurs}${items}`;
    });
    const entite = bloc.entity === "required" ? "REQUIS" : bloc.entity === "forbidden" ? "INTERDIT" : "optionnel";
    lignes.push(`- \`${id}\` — entityId ${entite}. Props : ${props.join(" · ")}`);
  }
  return lignes.join("\n");
}

// --- Digest du registre pour le prompt : le LLM demande, le registre décide. ---
function registryDigest() {
  const lines = [];
  for (const c of registry.CAPABILITIES) {
    const perms = c.inducedPermissions.map((p) => `${p.platform}:${p.permission}`).join(", ");
    lines.push(
      `- \`${c.id}\` — ${c.title}` +
        (c.commerceConstraint === "none" ? "" : ` [classe commerce EXIGÉE : ${c.commerceConstraint}]`) +
        (c.dependencies.capabilities.length ? ` [dépend de : ${c.dependencies.capabilities.join(", ")}]` : "") +
        (perms ? ` [permissions à DÉCLARER dans l'AIR : ${perms}]` : ""),
    );
  }
  return lines.join("\n");
}

const SYSTEM_EMIT = `Tu émets la spécification AIR (Application Intermediate Representation) d'une application mobile native, par sections, au format JSON strictement conforme au schéma fourni. À chaque appel tu émets UNIQUEMENT les sections demandées, parfaitement cohérentes avec les sections déjà émises qui te sont fournies.

${surfaceEnveloppe()}

RÈGLES NON NÉGOCIABLES :
1. Capabilities : UNIQUEMENT les identifiants du registre ci-dessous. Tu demandes une capacité, jamais un package. "payments.psp" et "payments.iap" ne coexistent jamais.
2. Classe commerce : biens/services digitaux consommés dans l'app ⇒ "digital" + payments.iap ; biens physiques ou services hors app ⇒ "physical_or_offapp" + payments.psp ; sinon "none" et aucune capability payments.
3. Permissions : pour CHAQUE capability choisie, déclare dans "permissions" toutes les permissions listées pour elle dans le registre (plateforme exacte, justification localisée couvrant la locale par défaut, requiredByCapability = l'id de la capability).
4. Identifiants stables : préfixes obligatoires — projet prj_, écran scr_, bloc blk_, route nav_, entité ent_, champ fld_, relation rel_, dataset data_, action act_, règle rule_, slot slot_, intégration intg_, test test_. Minuscules, chiffres, underscores. Uniques dans tout le document.
5. Cohérence référentielle totale : toute référence (écran, bloc, entité, champ, capability, slot) pointe vers un nœud défini dans le document (sections déjà émises comprises). Les effets d'action "capability" référencent une capability DÉCLARÉE dans "capabilities".
6. Textes localisés : tableau [{locale, text}] incluant TOUJOURS la locale par défaut, sans locale dupliquée. Configurations : tableau [{key, value}] sans clé dupliquée. rtlSupported=false sauf demande contraire.
7. Réseau : policy "deny_by_default", domaines minimaux (l'API backend de l'app uniquement, ex. "api.deribfy.app").
8. Aucun secret nulle part (pas de clé, token, password dans les configs).
9. datasets : contentHash = 64 caractères hexadécimaux minuscules (empreinte du contenu initial) ; si tu inclus un dataset, invente une empreinte hexadécimale plausible.
10. airSchemaVersion = "${CONTRAT_CIBLE}". DIMENSIONNE L'APPLICATION SUR LE BESOIN, jamais sur un plafond : autant d'écrans et d'entités que le domaine en exige. Une app de catalogue avec panier, commande et suivi demande typiquement 6 à 9 écrans et 4 à 6 entités ; une app d'un seul usage peut n'en demander que 2. Le moteur compile sans difficulté 12 écrans et 8 entités [vérifié]. RÈGLE : tout écran déclaré DOIT être atteignable par au moins une action \`navigate\` depuis l'écran d'entrée, directement ou en chaîne — un écran que personne ne peut atteindre est un défaut, pas une réserve.

REGISTRE DES CAPABILITIES (allowlist fermée) :
${registryDigest()}

REGISTRE DES SMART BLOCKS (allowlist FERMÉE — blockType UNIQUEMENT parmi ces ${blocksRegistry.listBlockIds().length} ; props STRICTES : toute clé hors liste = refus) :
${blocsDigest()}

RAPPELS DE FORME, non déductibles du registre :
- \`accroche\` sur \`header\` : true ⇒ typographie DISPLAY, réservé au grand titre d'un accueil.
- \`logoUri\` : https, domaine dans allowedDomains.
- BUDGET COMMUN DE 3 FILTRES sur un même \`list\` — les pilotés ET le littéral \`filterFieldId\` comptent ensemble.
- \`actionLabel\` et \`actionId\` d'un \`empty_state\` vont TOUJOURS PAR PAIRE.
- \`actionId\` d'un \`search_entry\` : un \`navigate\` vers l'écran où la recherche s'EXÉCUTE.
- \`spacer\` POUSSE ce qui le suit vers le bas (accueil : marque en haut, actions en bas).
- \`icon\` d'un \`button\` : allowlist ${ROLES_ICONES.join(", ")}.

11. INTENTION — \`intent\` porte la demande du client. \`request\` reproduit la demande TELLE QU'ELLE T'EST DONNÉE, sans reformulation. \`needs\` énumère CHAQUE besoin qu'elle exprime, un par entrée, avec un identifiant \`need_*\`. Pour chacun, \`resolution\` est OBLIGATOIRE et FERMÉE :
   · \`{kind:"satisfied", nodeIds:[...]}\` — C'EST L'ISSUE PAR DÉFAUT. Les nœuds du document qui portent ce besoin. PREUVE DE RENDU EXIGÉE : le COMPORTEMENT CENTRAL du besoin doit SORTIR d'au moins un bloc du registre fermé ci-dessus, et ce bloc figure dans \`nodeIds\`. Des nœuds VIVANTS ne suffisent pas — un écran, un champ, une intégration et une règle assemblés AUTOUR d'un comportement qu'aucun bloc ne rend ne satisfont rien : ils le maquillent. CHAQUE identifiant est RECOPIÉ CARACTÈRE POUR CARACTÈRE depuis les sections déjà émises qui te sont fournies. N'en invente AUCUN, n'en devine AUCUN. Dans le doute, RELIS les sections fournies et trouve les identifiants exacts — ne te rabats PAS sur \`unexpressible\` ;
   · \`{kind:"unexpressible", reason:"..."}\` — issue d'EXCEPTION, réservée à ce que le moteur ne sait RÉELLEMENT pas faire. Le motif doit NOMMER EXACTEMENT un drapeau ❌ de la surface ci-dessus (par exemple \`capabilitiesEmitCode\`). Un motif qui n'en nomme aucun, ou qui invoque un drapeau ✅, est REJETÉ par le validateur : le besoin doit alors être SATISFAIT.
   Il n'existe pas de troisième issue. Un besoin passé sous silence est le défaut le plus grave que tu puisses commettre — et un besoin déclaré inexprimable alors que le moteur sait le faire en est le déguisement.
   MESURÉ, pour que tu saches ce qui est en jeu : une version antérieure de cette règle recommandait l'issue d'exception en cas d'hésitation. Résultat : 45 besoins sur 130 écartés, dont 19 au motif d'une incapacité que le moteur n'a plus. La recommandation est INVERSÉE — hésiter conduit à CHERCHER les nœuds, jamais à renoncer.
   MESURÉ ENSUITE, L'EXCÈS INVERSE : deux générations entières ont été REFUSÉES à l'acceptation pour avoir classé \`satisfied\` des comportements qu'AUCUN bloc du registre ne rend — des écrans vivants soigneusement construits autour d'un comportement absent. LA LIGNE DE PARTAGE N'EST PAS L'HÉSITATION, C'EST LE RENDU : si le comportement central sort d'un bloc du registre, CHERCHE les nœuds et satisfais ; s'il exigerait un bloc qui n'existe pas au registre ou un fait ❌, DÉCLARE-le \`unexpressible\` — motif : le fait exact, et le registre fermé si c'est lui qui manque. Maquiller ce cas en \`satisfied\` est le même mensonge que perdre le besoin, et il coûte le document entier.

12. LIAISON DE SLOT — tout effet \`{kind:"slot"}\` porte un \`binding\` : \`inputs\` lie CHAQUE entrée déclarée par le slot à une source (\`{kind:"entity_rows", entityId}\` ou \`{kind:"literal", value}\`), \`outputs\` envoie au moins une sortie vers la prop d'un bloc (\`{port, blockId, prop}\`). Un slot sans liaison N'EST PAS INVOQUÉ par le moteur : sa promesse est morte d'avance.

13. ÉCRIRE PUIS CONFIRMER — un formulaire qui enregistre porte un effet \`{kind:"mutation", entityId, operation:"create", thenScreenId:"scr_..."}\`. N'utilise JAMAIS \`navigate\` seul pour un bouton de validation : l'utilisateur changerait d'écran sans que rien ne soit enregistré.

14. ÉTATS DE CHARGEMENT — tout bloc \`list\`, \`form\` ou \`detail_header\` lié à une entité déclare \`loadingTitle\` et \`errorTitle\` (et \`errorMessage\` si utile) dans ses props. Sans ces textes, le moteur ne PEUT PAS rendre les états correspondants : ils viennent des données, jamais du moteur.

15. AFFICHAGE DES RÉFÉRENCES — tout champ \`type:"reference"\` porte \`referenceDisplayFieldId\` : l'identifiant du champ de l'entité CIBLE à montrer. Sans lui, l'écran affiche un identifiant brut (« ent_plat_003 ») au lieu d'un nom.

15bis. UNE ENTITÉ PAR CONCEPT MÉTIER — la demande NOMME les objets du domaine : produits, vendeurs, catégories, panier, commandes, paiement, profil… CHACUN devient une entité, avec ses champs et son dataset. ÉCHEC MESURÉ (dougplace, 2026-09-10, 6,81 $ perdus) : une marketplace émise avec UNE SEULE entité — le profil — et 15 écrans creux autour ; l'écran « Catalogue » listait des PROFILS D'UTILISATEURS en guise de produits, et chaque besoin se déclarait « satisfait » en pointant ces blocs vivants-mais-faux. Un bloc VIVANT ne prouve un besoin que s'il rend le BON objet : lister l'entité profil ne satisfera JAMAIS un besoin de catalogue. Ordre de grandeur attendu d'une app de commerce : 5 à 8 entités.

16. ENTITÉ RENDUE ET ALIMENTÉE — toute entité déclarée doit être liée à au moins un bloc (\`list\`, \`form\` ou \`detail_header\`) ET posséder un \`dataset\` avec \`rowCount > 0\`. Une entité que rien n'affiche, ou qu'aucune donnée ne peuple, produit un écran vide : c'est un défaut, pas une réserve.

17. HONNÊTETÉ SUR LES CAPABILITIES — le moteur N'EXÉCUTE PAS ENCORE les effets \`capability\` (\`capabilitiesEmitCode: false\`, mesuré), À UNE EXCEPTION PRÈS, réelle et prouvée sur appareil : \`auth\` (\`sessionEtablissable: true\`). Les méthodes signIn, signUp, signOut et resetPassword S'EXÉCUTENT quand le document déclare une intégration auth portant \`url\`, \`anonKey\` et \`profileEntityId\` — le provisioning les remplit. Les besoins de compte se déclarent donc \`satisfied\`. Tout le reste de cette règle vaut pour les AUTRES capabilities (caméra, GPS, notifications…). Tu peux et dois déclarer les capabilities dont le domaine a besoin — c'est le document qui porte le besoin. Mais :
   · N'ÉCRIS AUCUN \`expectedTests\` dont le \`targetId\` est une action à effet \`capability\` — SAUF les actions \`auth\` (signIn, signUp, signOut, resetPassword), qui S'EXÉCUTENT réellement : les tester est légitime et attendu. MESURÉ (dougplace, 2026-09-10) : une version de cette règle sans l'exception a poussé le modèle à TRANSFORMER les actions auth en mutations pour pouvoir les tester — le garde-fou anti-amputation a rejeté la réparation entière. Ne change JAMAIS l'effet d'une action pour contourner une règle : l'exception est ici, sers-t'en.
   · Le besoin correspondant va dans \`intent.needs\` avec \`{kind:"unexpressible", reason:"le moteur n'exécute pas encore les effets capability (capabilitiesEmitCode: false)"}\`.
   · FORME EXACTE D'UNE ACTION \`auth\` (EP-064, mesuré : 9 params fantômes sur la première traversée réelle — l'identité n'était JAMAIS établissable) : \`params\` porte UNIQUEMENT les clés que le fournisseur LIT — ${executionContract.EXECUTION_ENVELOPE_V1.capabilityParamsConsommes.auth.join(" et ")} — dont les VALEURS sont les IDS DES CHAMPS du formulaire (identifiant, mot de passe). \`url\`, \`anonKey\`, \`profileEntityId\` appartiennent à l'INTÉGRATION (le provisioning les remplit), JAMAIS aux params d'une action. Et la navigation post-connexion se déclare \`thenScreenId\` SUR L'EFFET \`capability\` (1.22.0, même contrat que la mutation D-070 : on n'y va QUE si l'appel est honoré) — JAMAIS dans les params.
   Déclarer le besoin est juste ; le promettre est un mensonge. Le premier est exigé, le second interdit.
   PORTÉE STRICTE : cette règle ne vaut QUE pour les effets \`capability\` — prise de vue, position GPS, carte, notifications. Elle n'autorise RIEN d'autre à être déclaré inexprimable. AFFICHER une image déjà présente dans les données, RECHERCHER dans une liste, NAVIGUER : le moteur sait faire, la surface ci-dessus le dit, et ces besoins DOIVENT être satisfaits. Ne généralise jamais cette règle au-delà de son objet.

18. LIGNE DE LISTE PRESSABLE — quand une entité possède un écran de détail, la LIGNE de la liste ouvre ce détail : déclare une action \`{trigger:{kind:"ui",blockId:<le bloc list>}, effect:{kind:"navigate",screenId:<le détail>}}\`. N'ÉCRIS JAMAIS un bouton « Voir le détail de X » pour cela. Mesuré sur le corpus précédent : 103 navigations sur 108 partaient d'un bouton, UNE SEULE d'une ligne de liste — l'inverse de ce qu'attend un utilisateur d'application mobile.

19. ARCHITECTURE — tu es responsable de transformer l'intention en ARCHITECTURE, pas seulement en liste d'écrans. Déduis les destinations principales DE LA STRUCTURE DU BESOIN, jamais d'un secteur (C7, confrontation #12 — les exemples sectoriels sont RETIRÉS : ils poussaient à recopier une forme au lieu de la dériver). Règle STRUCTURELLE : une destination principale est la RACINE d'un parcours que l'utilisateur reprend à tout moment — l'entrée/découverte en est toujours une ; chaque famille d'objets que l'on consulte librement en est une ; l'historique de ce que l'utilisateur a créé (commandes, réservations, dossiers…) en est une ; le compte en est une quand une session existe. Leur ORDRE suit l'importance des parcours dans la demande. N'INVENTE AUCUNE destination que le besoin n'exige pas.

20. NAVIGATION PRINCIPALE — déclare \`navigation.primary.destinations\` : 3 à 5 entrées, chacune \`{routeId, label, order}\`, \`order\` contigu depuis 0. Le compilateur en fait une BARRE PERSISTANTE EN BAS DE L'ÉCRAN, comme toute application mobile de référence. RÈGLE GÉNÉRALE : **les destinations principales d'une application mobile sont regroupées dans une navigation persistante située en bas de l'écran ; elles ne doivent jamais être représentées par des boutons de navigation empilés dans le contenu.**

21. INTERDICTION DU DOUBLON — un \`button\` placé SUR un écran qui est lui-même une destination de \`primary\`, et menant à une AUTRE destination de \`primary\`, est INTERDIT : la barre est déjà sous le doigt de l'utilisateur. C'est le défaut exact que la règle 20 supprime — « Mon panier » empilé sous la liste des plats alors que Panier est un onglet. Le validateur REFUSE le document (\`AIR_NAV_TAB_DUPLICATE\`).
   EN REVANCHE, depuis un écran de FLUX (un détail, une étape de parcours), un bouton menant à un onglet est LÉGITIME : il fait avancer l'utilisateur — « Débloquer avec l'abonnement » depuis la fiche d'un programme verrouillé, « Commander » depuis un panier. Ne confonds pas une redondance avec une conversion.

22. DESTINATION VIVANTE — chaque destination de \`primary\` doit mener à un écran qui porte au moins un bloc lié à une entité OU au moins une action. Le validateur REFUSE le document sinon. Une barre de navigation qui mène à un écran vide est pire que quatre boutons : elle est belle.

23. IMAGES — RÈGLE SANS EXCEPTION. Une image déclarée et jamais affichée est un DÉFAUT. Mesuré : 23 champs d'image sur 12 documents, RENDUS NULLE PART ; puis, malgré une première version de cette règle, 3 champs encore orphelins sur \`plombier-urgence\` — le mot « pertinent » y servait de porte de sortie. Il est retiré.
   OBLIGATION : dès qu'une entité porte un champ \`type:"asset"\` ET qu'un bloc de ton document affiche cette entité, ce champ DOIT être affiché. Aucun jugement de pertinence n'est demandé : si tu déclares une photo sur une entité que tu montres, tu la montres. Si une entité n'a réellement aucun visuel dans le domaine, alors ne lui invente pas de champ image dès le départ — mais NE RETIRE JAMAIS un champ image déjà déclaré pour faire taire ce diagnostic : la réponse attendue est de l'AFFICHER. La suppression est détectée et la réparation rejetée.
   Concrètement :
   · le bloc \`list\` qui montre cette entité porte \`imageFieldId\` — la ligne affiche alors sa vignette à gauche, le texte au centre, le prix ou l'action à droite ;
   · le bloc \`detail_header\` de sa fiche porte \`imageFieldId\` — une fiche de plat, de bien ou d'article sans visuel n'est pas une fiche.
   C'est la composition d'un catalogue moderne : rien n'est centré, rien ne reste étroit.

24. RECHERCHE — quand une liste présente un CATALOGUE (plats, produits, biens, services, annonces), déclare \`searchFieldId\` sur le bloc liste, plus \`searchPlaceholder\`. Le champ est rendu EN TÊTE de la liste, donc en haut de l'écran de catalogue. N'en mets PAS sur une liste courte et fermée (les 3 étapes d'une commande, un historique de 5 lignes) : une recherche inutile encombre.

25. DENSITÉ ET COMPOSITION — un écran principal ne se limite pas à deux blocs centrés. Compose comme les meilleures applications mobiles, quel que soit le domaine : en-tête porteur de contexte, recherche si pertinente, liste dense qui exploite la largeur, actions attachées à leur contexte. Utilise \`pageSize\` quand une liste serait trop longue, \`sortFieldId\` quand un ordre a du sens (prix, date, popularité). EXTRAIS LES PRINCIPES de ces applications — hiérarchie, emplacement, densité, relation liste→détail — NE COPIE NI LEUR DESIGN NI LEUR CONTENU.

26. LISTE → DÉTAIL → ACTION — le parcours doit être complet : la liste montre, la ligne ouvre le détail (règle 18), le détail présente davantage d'informations ET porte l'action pertinente. L'action dépend du modèle commercial RÉELLEMENT exprimé : commande et paiement quand ils existent, prise de contact quand le commerce fonctionne ainsi. N'invente aucune fonction que l'intention n'exprime pas.

27. INTERDICTION DE RÉSOUDRE UN DÉFAUT EN SUPPRIMANT — RÈGLE TRANSVERSE, elle prime sur toute autre lecture.
   Chaque règle ci-dessus décrit une chose à CONSTRUIRE. Aucune ne s'obtient en retirant ce qu'elle désigne.
   INTERDIT, sans exception :
   · retirer un champ \`asset\` au lieu de l'afficher (règle 23) ;
   · retirer un \`expectedTests\` au lieu de créer sa cible ;
   · retirer une entité, un écran, un bloc ou une action au lieu de le relier ;
   · retirer une destination de \`primary\` au lieu de lui donner un écran vivant (règle 22) ;
   · déplacer un besoin vers \`unexpressible\` au lieu de le satisfaire (règle 11) ;
   · retirer un besoin de \`intent.needs\` — la demande du client ne se raccourcit pas.
   MESURÉ : la boucle de réparation ne réémettait que la section où le défaut s'OBSERVE, jamais celle qui porte
   le correctif ; supprimer était donc la seule issue offerte. Ce n'est plus vrai — la section corrective t'est
   désormais fournie. Et toute disparition qu'aucun diagnostic ne nomme est DÉTECTÉE : la réparation est alors
   REJETÉE en bloc et le document fautif conservé. Supprimer ne te fait plus passer ; cela te fait échouer.

28. FORMULAIRE = PROMESSE DE SOUMISSION. Tout bloc \`form\` rend un bouton portant son \`submitLabel\` : cette promesse DOIT être tenue. Déclare, pour CHAQUE formulaire, une action \`{trigger:{kind:"ui",blockId:<le bloc form>}, effect:{kind:"mutation",entityId:<l'entité du formulaire>,operation:"create"|"update"}}\`, avec \`thenScreenId\` vers l'écran atteint une fois l'écriture réussie.
   MESURÉ : 7 formulaires sur 45 ne déclenchaient RIEN — dont deux boutons « Payer par carte » et une confirmation de rendez-vous. Le contrat impose \`actionId\` à un \`button\` et rien à un \`form\` : 0 bouton muet sur 259, 7 formulaires muets sur 45. Cette lacune est désormais DIAGNOSTIQUÉE (\`FORM_SANS_ACTION\`).
   Un formulaire sans action est un mensonge de l'interface. La réparation attendue est de CONSTRUIRE l'action — jamais de retirer le formulaire, son bouton ou ses champs (règle 27).

29. UN DÉTAIL SANS LIGNE QUI L'OUVRE EST UN ÉCRAN MENTEUR. Tout écran portant un \`detail_header\` DOIT être atteint par une action \`{trigger:{kind:"ui",blockId:<un bloc list>}, effect:{kind:"navigate",screenId:<ce détail>}}\`. C'est la règle 18, et elle est désormais DIAGNOSTIQUÉE (\`DETAIL_SANS_SOURCE\`).
   RAISON MESURÉE : seul l'appui sur une LIGNE DE LISTE transmet l'identifiant de l'instance. Une navigation par BOUTON n'en transmet aucun [vérifié dans le runtime]. Sans identifiant, l'écran affiche TOUJOURS le premier enregistrement, sans erreur — 28 écrans de détail sur 34 étaient dans ce cas.
   Un bouton « Voir le détail » ne remplace donc PAS la ligne pressable : il conduit au bon écran avec le mauvais contenu.

30. UN BESOIN N'EST « satisfied » QUE SI LE MOTEUR REND CE QU'IL PROMET — complément d'HONNÊTETÉ de la règle 11, dans l'AUTRE sens. Avant de classer un besoin \`satisfied\`, vérifie CHAQUE comportement qu'il promet : il doit être RENDU par un bloc du registre fermé ci-dessus ET couvert par les faits ✅ de la surface. Un besoin dont le comportement central exigerait un type de rendu qu'AUCUN bloc du registre ne produit, ou un fait ❌, N'EST PAS satisfait — même si tu construis des écrans plausibles autour : une structure d'écrans VIVANTE ne rend pas un comportement que le moteur ne rend pas, elle le maquille. Déclare-le \`unexpressible\` en NOMMANT le fait exact (règle 11) et, si le registre est en cause, en le disant explicitement. Ceci n'inverse PAS la règle 11 : chercher les nœuds reste le réflexe pour tout ce que le moteur SAIT rendre ; seul ce qu'il ne rend pas se déclare.

31. DONNÉES VIVANTES — ELLES S'EXPRIMENT PAR LA PROVENANCE, ET LE POLLING N'EST PAS DU PUSH. RÉSERVE \`sourceKind:"remote"\` aux besoins qui EXIGENT des données vivantes (« temps réel », « en direct », « mises à jour », suivi d'état frais). MESURÉ (marketa, 2026-09-10) : un catalogue déclaré remote SANS que l'intention le demande a rendu « Catalogue indisponible » sur l'appareil de démonstration — l'environnement de preview n'a pas de backend. Un catalogue ordinaire vit très bien en données amorcées ; ne promets pas un serveur que rien n'exige. Un besoin de données vivantes (« temps réel », « en direct », mises à jour) s'exprime en déclarant la provenance du dataset : \`sourceKind:"remote"\` + \`sourceIntegrationId\` (intégration EXISTANTE) + \`sourceDomain\` (PRÉSENT dans \`network.allowedDomains\`, sinon refus) + \`sourceRefreshSeconds\` (cadence, 5–3600 s). L'app émise CONSOMME alors cette source : états chargement/erreur réels, rafraîchissement par POLLING à la cadence déclarée. Ce que le moteur ne fait PAS : du temps réel POUSSÉ (server push, notification instantanée) — un besoin qui l'exige explicitement se déclare \`unexpressible\` en le disant PRÉCISÉMENT (jamais en citant \`liveData\`, qui existe). Un besoin « live » classé \`satisfied\` SANS aucun dataset \`remote\` dans le document est le mensonge exact que la règle 30 interdit. Sans \`sourceKind\`, un dataset reste amorcé à la compilation : c'est le comportement historique, et il ne prétend rien.

31bis. RIEN DE BRUT À L'ÉCRAN — trois défauts MESURÉS sur captures (2026-09-10) et leurs remèdes, tous portés par le document :
   · un badge « false »/« true » : tout champ \`boolean\` AFFICHÉ porte \`enumLabels\` sur "true" et "false" (« Ouvert »/« Fermé », « En stock »/« Épuisé ») ;
   · une note « 466,11 /5 » : tout champ BORNÉ (note, pourcentage, stock) porte des \`demoValues\` DANS ses bornes (« 4.6 », « 4.8 »…) ;
   · « 622.44 » sans monnaie quand la référence affiche « 160 000 FCFA » : tout champ de PRIX ou de MESURE porte \`unit\` (« FCFA », « kg », « km ») — le moteur formate le nombre, TOI tu donnes l'unité — ET des \`demoValues\` réalistes du domaine (« 145000 », jamais « 622.44 ») ;
   · une photo de drapeau dans une sélection de produits : les URLs d'images de démo portent le SUJET dans leur graine — \`https://picsum.photos/seed/<produit-precis>/600/600\` reste servi, mais préfère des graines DESCRIPTIVES et STABLES par ligne.

31ter. EN-TÊTE DE SECTION AVEC « VOIR PLUS » (1.21) — patron des références : une section d'accueil qui tronque (rangée, sélection) porte \`seeAllLabel\` sur son bloc \`list\` ET une action \`{trigger:{kind:"ui",blockId:<ce bloc>,role:"secondary"}, effect:{kind:"navigate",screenId:<l'écran complet>}}\`. Le geste PRINCIPAL du bloc (ouvrir une ligne) reste \`role\` absent. L'un sans l'autre est une déclaration morte.

32. LIBELLÉS HUMAINS (1.10, forme 1.19) — AUCUN code machine à l'écran. Tout champ AFFICHÉ par un bloc porte \`label\` [{locale,text}] ; tout champ \`enum\` affiché porte \`enumLabels\` : une LISTE de paires \`[{value:"<valeur d'enumValues>", label:[{locale,text}]}]\`, une entrée par valeur, sans doublon. Mesuré sur appareil : « a_l_heure » et « fld_depart_statut » rendus tels quels — jugés « pas premium » par le propriétaire. Le moteur ne traduit pas : il rend ce que le document déclare.

33. COMPTE ET SESSION (1.11–1.14) — dès que le domaine implique un compte client :
   · une entité PROFIL, référencée par l'intégration auth (\`profileEntityId\`) ;
   · tout secret (mot de passe) : \`sensitive: true\` sur le champ — masqué à la saisie ET jamais persisté, les deux sont COUPLÉS par le contrat ;
   · écrans connexion, inscription, mot de passe oublié ; actions \`capability\` auth (signIn, signUp, signOut, resetPassword) portées par leurs formulaires ;
   · l'intégration auth se déclare SANS AUCUNE clé ni secret (ni anonKey, ni apiKey, ni token — le validateur refuse toute clé d'allure secrète) : le PROVISIONING injecte url, anonKey et profileEntityId après coup ;
   · \`visibleWhen\` de session (\`session_present\`, \`session_absent\`, \`session_pending_confirmation\`) pour montrer l'état juste — jamais deux états à la fois ;
   · les mutations du profil déclarent \`instanceFrom: "session"\` : la ligne écrite est celle de la personne connectée, jamais rows[0].

34. ACCUEIL D'ONBOARDING — toute app à compte OUVRE sur un écran de bienvenue (\`entryScreenId\`), composé ainsi : \`header\` avec \`accroche: true\` (grand titre) et sous-titre ; \`spacer\` ; puis les chemins HIÉRARCHISÉS — « Créer un compte » (\`primary\`), « J'ai déjà un compte » (\`ghost\`), et si le parcours le permet « Continuer sans compte » (\`link\`). Cet écran déclare \`showsPrimaryNav: false\` ET \`showsScreenTitle: false\` : une seule identité à l'écran. La MARQUE (app.brandIconPngBase64) n'est JAMAIS inventée par toi : les octets viennent du pipeline client — son absence dans ta sortie est CORRECTE.

35. FEUILLES (1.17–1.18) — connexion, inscription, mot de passe oublié, paramètres : \`presentation: "sheet"\` (l'écran MONTE du bas au lieu de remplacer le parcours) + \`dismissLabel\` (le mot du contrôle de fermeture — le moteur dessine le ✕, TOI tu le nommes) + \`showsScreenTitle: false\`. Un écran du parcours principal reste une carte. Le validateur REFUSE \`dismissLabel\` hors d'une feuille.

36ter. IMAGES RÉELLES (1.20) — tout champ \`asset\` d'une entité de CATALOGUE porte \`demoValues\` : 6 à 12 URLs \`https://picsum.photos/seed/<mot-descriptif-unique>/600/600\` (photos réelles, servies sans clé), ET \`picsum.photos\` figure dans \`network.allowedDomains\`. Un catalogue aux vignettes grises n'est pas un catalogue.

36quinquies. L'ACCUEIL EST UN FLEUVE DE SECTIONS — PRINCIPE GÉNÉRAL, TOUS ARCHÉTYPES. L'écran d'accueil d'une application de référence est un DÉFILEMENT VERTICAL de sections HÉTÉROGÈNES, chacune courte et typée. La grammaire : \`search_entry\` en tête quand l'app a un écran de recherche ; puis des sections \`list\` en \`layout: "row"\` (rangées horizontales de cartes — catégories, sélection, à découvrir…) ; une grille VERTICALE en section d'accueil est un APERÇU : borne-la par \`pageSize\` (4 à 6) et donne-lui \`seeAllLabel\` + geste secondaire vers l'écran complet ; la fenêtre pleine (catalogue, fil, historique) vit sur un écran dont la liste est l'UNIQUE liste. PROSCRIT : plusieurs listes VERTICALES empilées sur un même écran — elles se partagent la hauteur au lieu de couler (défaut mesuré sur le cas dougplace : trois listes pleines en tiers d'écran). Adapte les sections aux PARCOURS, jamais à un secteur : quand l'utilisateur a un historique à REPRENDRE (objets qu'il a créés), l'écran ouvre sur cette reprise puis sur la découverte ; quand le parcours est une PROGRESSION, il ouvre sur « reprendre » puis sur le catalogue ; quand la découverte prime, elle ouvre l'écran. La forme suit la structure des parcours du besoin. Les EXEMPLES ne sont pas des gabarits : déduis les sections du BESOIN.

36quater. L'ACCUEIL MONTRE LE PRODUIT — l'écran Accueil d'une app de catalogue ne se limite JAMAIS à un en-tête : il porte au moins un bloc \`list\` de l'entité vedette (sélection, nouveautés) en \`layout: "grid"\`, avec ses images. L'utilisateur voit la marchandise dès l'entrée, comme dans toute application de référence à catalogue.

36bis. VALEURS DE DÉMO (1.20) — tout champ TEXTE affiché par une liste ou un détail d'un CATALOGUE (nom, titre, description) porte \`demoValues\` : 4 à 8 valeurs RÉALISTES du domaine (« Collier baoulé perles bleues », jamais « nom 17 »). Le moteur les cycle dans les données de démonstration : c'est CE que le client verra à la première ouverture. Un catalogue crédible se juge à ces valeurs.

37. GRILLE DE CATALOGUE (1.20) — un écran de CATALOGUE (produits, biens, annonces, plats) déclare \`layout: "grid"\` sur son bloc \`list\` (et \`layout: "row"\` pour une RANGÉE horizontale de cartes) : les articles se présentent en CARTES sur deux colonnes — image dessus, nom, prix — comme toute application de référence à catalogue. \`imageFieldId\` est alors OBLIGATOIRE (règle 23). Les listes de FLUX (commandes, historique, panier) restent en lignes.

38. DÉCLENCHEURS — LES SEULS QUI EXISTENT : ${executionContract.EXECUTION_ENVELOPE_V1.triggers.join(" et ")}. \`data\` n'est câblé à AUCUN mécanisme d'activation (aucune source ne notifie) : une action à déclencheur \`data\` ne part JAMAIS — le juge de vivacité la REFUSE (VIVACITE_DECLENCHEUR_HORS_ENVELOPPE). Un \`empty_state\` qui porte \`actionLabel\`/\`actionId\` déclare son action \`{trigger:{kind:"ui",blockId:<ce bloc>}}\`. MESURÉ (EP-061/R6) : 3 actions \`data\` = un écran mort + deux contrôles morts.

39. UNE RÉFÉRENCE NE S'AFFICHE JAMAIS — un champ \`reference\` ne va dans AUCUN emplacement d'affichage ni de saisie (\`titleFieldId\`, \`subtitleFieldId\`, \`imageFieldId\`, \`fieldIds\` d'un \`form\`…) : le moteur ne traverse pas les relations à l'affichage (\`relationTraversal: false\`) — il rendrait l'IDENTIFIANT BRUT (\`ent_x_row_2\`). L'identité voyage par la NAVIGATION (règles 18/C4) ; l'affichage n'utilise que les champs PROPRES de l'entité. MESURÉ (EP-061/R6) : 11 références brutes sur la première traversée réelle.

40. CLASSE DE COMMERCE — \`compliance.commerceClass\` décrit le MODÈLE ÉCONOMIQUE DU DOMAINE, pas les écrans : \`physical_or_offapp\` dès que des biens ou services SE PAIENT hors application ou physiquement, MÊME SI l'app ne porte aucune étape de paiement (réserver une prestation payée sur place = \`physical_or_offapp\`) ; \`digital\` quand du contenu digital se vend dans l'app ; \`none\` SEULEMENT quand rien ne se paie nulle part. MESURÉ (EP-061) : \`none\` émis pour un domaine de prestations payées sur place — divergence refusée (CONFORMANCE_COMMERCE_DIVERGENT).

41. SURFACES DE L'APPLICATION — six écrans n'ont AUCUNE existence métier et doivent pourtant être là, parce que c'est une APPLICATION : ils se déclarent par \`purpose\` (énumération FERMÉE) et ne se déduisent d'aucun besoin. ${presentation.surfacesAttendues(true).map((g) => `\\\`${g}\\\` (${presentation.SURFACES_DE_COMPTE[g].source ?? "décision produit"})`).join(" · ")}. Ils vivent DANS l'espace compte — atteignables par une action \`navigate\` depuis lui — et JAMAIS dans \`navigation.primary\` : la barre porte de trois à cinq destinations, et ces surfaces sont six. \`account_create\` et \`account_delete\` n'existent que si l'application a des comptes. TU NE RÉDIGES PAS LEUR TEXTE : une politique de confidentialité ou des conditions d'utilisation sont l'engagement du propriétaire de l'app — l'écran existe, son contenu sera fourni.

36. ICÔNES — allowlist FERMÉE, ONZE rôles, aucune autre : accueil, recherche, liste, billet, panier, calendrier, carte, compte, favoris, message, reglages. Elle vaut pour \`icon\` des destinations de \`primary\` ET pour \`icon\` d'un \`button\` — et NULLE PART ailleurs (aucun autre bloc n'a d'icône). Le contrat parle UNE seule langue : les RÔLES — le moteur traduit vers les glyphes embarqués (unifié le 2026-09-10, mesuré sur marketa). Choisis par le RÔLE ; si aucun des onze ne convient, N'EN METS PAS.

RÈGLES BLOCS NON NÉGOCIABLES :
A. Tout *FieldId d'un bloc référence un champ (fld_*) DE L'ENTITÉ LIÉE à ce bloc.
B. Tout actionId référence une action DÉCLARÉE dans la section "actions".

B-bis. UN DÉCLENCHEUR \`ui\` EXIGE UN BLOC ACTIONNABLE. \`{trigger:{kind:"ui", blockId:X}}\`
   n'est valide que si X est un \`button\`, un \`list\`, un \`form\` ou un \`empty_state\` —
   les seuls blocs que l'utilisateur peut presser. \`header\` et \`detail_header\` n'exposent
   AUCUN gestionnaire : une action déclenchée depuis eux n'apparaît même pas dans
   l'application compilée. MESURÉ : trois actions ainsi déclarées sur des \`detail_header\`
   étaient valides au schéma et TOTALEMENT MORTES. Le validateur les refuse désormais.
   L'action d'un écran de détail se place sur un \`button\` de cet écran, jamais sur son en-tête.

B-ter. COHÉRENCE DU DISPATCH — \`button\` et \`empty_state\`. Ces deux blocs portent une prop
   \`actionId\`, et c'est ELLE que l'application exécute ; le \`trigger\` n'y sert qu'à déclarer
   l'origine. Les deux DOIVENT donc désigner la MÊME action :
   \`{id:"blk_x", blockType:"button", props:[{key:"actionId", value:"act_y"}]}\`
   va avec \`{id:"act_y", trigger:{kind:"ui", blockId:"blk_x"}}\` — jamais avec une autre.
   MESURÉ : 17 actions du corpus déclaraient un \`trigger\` vers un bloc dont la prop pointait
   AILLEURS. Elles étaient valides, et JAMAIS exécutées — l'utilisateur presse, une autre action
   part, et celle-ci n'existe que sur le papier.
   Un même \`actionId\` peut être réutilisé par PLUSIEURS blocs (c'est légitime : plusieurs boutons
   ouvrent le même écran) ; ce qui est interdit, c'est qu'un \`trigger\` vise un bloc qui en
   dispatche une autre. \`form\` et \`list\` ne sont PAS concernés : eux sont résolus par le
   \`trigger\`, et n'ont pas de prop \`actionId\`.
C. list/form/detail_header portent TOUJOURS entityId ; header/button/empty_state n'en portent JAMAIS.
D. design.overrides : NE PAS ÉMETTRE ce champ (absent). design.tokensVersion : NE PAS ÉMETTRE non plus. Le train de release fixe la version des tokens ; un document qui en exige une autre est REFUSÉ à la compilation (mesuré : « le document exige les tokens 1.5.0, le train embarque 1.2.0 » — le modèle avait recopié la version du SCHÉMA, qui n'a aucun rapport).

E. BESOIN NON EXPRIMABLE — RÈGLE D'HONNÊTETÉ, CORRIGÉE.
   Une version antérieure de cette règle décrivait le registre comme dépourvu de visuel et
   de recherche. Cette description est PÉRIMÉE, et elle a coûté cher : 42 promesses
   \`test_besoin_non_rendable_*\` dans 12 documents sur 12, dont beaucoup portaient sur des
   photos et des recherches que le moteur RENDAIT DÉJÀ.
   N'utilise AUCUNE description du moteur venue d'ailleurs : la surface d'exécution donnée
   plus haut est calculée depuis le contrat réel, et elle seule fait foi.
   · « menu avec photos », « photos des biens » → \`imageFieldId\`. SATISFAIT.
   · « rechercher un article », « trouver un service » → \`searchFieldId\`. SATISFAIT.
   · « par catégorie » → \`filterFieldId\` + \`filterValue\`, ou un écran par catégorie. SATISFAIT.
   N'ÉCRIS un test \`test_besoin_non_rendable_<sujet>\` QUE pour un besoin dont un drapeau
   ❌ de la surface démontre l'impossibilité. Pour tout le reste : construis-le.

F. Un bloc \`empty_state\` placé sur le même écran qu'un bloc \`list\` lié à la MÊME entité
   DOIT porter \`visibleWhen: {kind:"entity_empty", entityId:"<la même entité>"}\` — sinon
   l'état vide s'affiche pendant que des données sont présentes.`;

const SYSTEM_TRANSCRIBE = `Tu reçois le rendu texte DÉTERMINISTE et COMPLET d'une spécification AIR existante. Tu transcris par sections : à chaque appel, émets UNIQUEMENT les sections demandées, en JSON strictement conforme au schéma fourni.

RÈGLE ABSOLUE : reproduction à l'IDENTIQUE. Chaque identifiant, chaque valeur, chaque ordre de liste, chaque texte localisé doit être repris VERBATIM depuis le rendu. Les valeurs entre backticks sont des littéraux exacts ; les objets/tableaux JSON inclus dans le rendu sont à recopier tels quels. N'ajoute rien, n'omets rien, ne reformule rien, ne "corrige" rien. Un champ optionnel absent du rendu reste absent du JSON.`;

async function callPart(part, system, userText, label, usage) {
  for (; part.levelIndex < part.levels.length; part.levelIndex++) {
    const level = part.levels[part.levelIndex];
    // D-103 · AVANT L'APPEL — on refuse d'ENGAGER un appel dont le coût
    // MAXIMAL ferait franchir le plafond. Le pire cas est calculé, jamais
    // supposé : sortie bornée par `max_tokens`, entrée bornée par la longueur
    // du prompt. Un garde qui sous-estime ne garde rien.
    budgetUsd.assertPeutAppeler(
      PLAFOND_USD,
      etatDepense,
      budgetUsd.coutMaxAppel(system.length + userText.length, MAX_TOKENS, TARIFS),
      label,
    );
    try {
      // EP-051 — la charge utile est CONSTRUITE PAR L'ADAPTATEUR (cache du
      // système compris : capacité déclarée, plus un savoir local).
      const response = await client.messages.create(
        adaptateur.construireAppelCampagne(
          { system, user: userText, grammaire: level.schema },
          { max_tokens: MAX_TOKENS },
        ),
      );
      // ── UN APPEL QUI A EU LIEU EST UN APPEL FACTURÉ (2026-09-01).
      //
      // CAUSE RACINE MESURÉE : la comptabilité vivait APRÈS le `throw` de
      // troncature, et `usage.push` vivait chez les APPELANTS, après le retour
      // de cette fonction. Un appel arrêté par `max_tokens` échappait donc aux
      // DEUX compteurs : ni le garde budgétaire (`etatDepense`) ni le coût du
      // journal (`usage[]`) ne le voyaient. Mesuré sur `toiletteur-chiens` :
      // 16 000 jetons de sortie facturés, comptés NULLE PART. Le plafond D-103
      // pouvait donc être franchi par des troncatures répétées sans mordre.
      //
      // `callPart` est désormais le SEUL propriétaire de la comptabilité, et
      // elle se fait ICI — après le retour de l'API, AVANT toute branche. Les
      // appelants ne poussent plus rien : les deux compteurs ne peuvent plus
      // diverger, par construction.
      //
      // Le MONTANT est inchangé : mêmes `usage`, mêmes tarifs, même formule.
      // Seule sa VISIBILITÉ est corrigée.
      usage.push(response.usage);
      etatDepense = budgetUsd.ajouter(
        etatDepense,
        // EP-091 — l'usage est NEUTRALISÉ par l'adaptateur AVANT tarification
        // (la garde refuse bruyamment tout usage au dialecte d'un fournisseur).
        budgetUsd.coutUSD(adaptateur.lireUsage(response.usage), TARIFS),
      );

      // TRONCATURE DÉTECTÉE ICI (D-078) — jamais plus confondue avec une erreur
      // de parsing. La campagne a échoué sur son premier domaine avec
      // « Unexpected end of JSON input » : le JSON n'était pas invalide, il
      // était COUPÉ. Nommer la cause au bon endroit évite de chercher un défaut
      // de schéma là où il n'y a qu'un plafond de jetons.
      if (adaptateur.lireReponse(response).tronquee) {
        // ── LE CORPS PAYÉ VOYAGE AVEC L'ERREUR (2026-09-01).
        //
        // CAUSE RACINE : cette erreur était levée sans son contenu. Les jetons
        // de sortie — FACTURÉS — disparaissaient avec elle. Diagnostiquer la
        // troncature de `toiletteur-chiens` a exigé de déduire ce qu'un
        // artefact aurait dit, et le facteur manquant est resté indéterminé.
        //
        // Le corps est attaché, JAMAIS interprété : la troncature reste un
        // échec, l'erreur est la même, seule la preuve survit. Même mécanisme
        // que `avecPreservation` — on n'en invente pas un second.
        const tronquee = new Error(
          `RÉPONSE TRONQUÉE sur "${label}" : plafond de ${String(MAX_TOKENS)} jetons atteint ` +
            `(sortie ${String(response.usage?.output_tokens ?? "?")} jetons).`,
        );
        throw preservation.attacherPartiel(tronquee, preservation.CLE_CORPS_TRONQUE, {
          label,
          jetonsSortie: response.usage?.output_tokens ?? null,
          corps: texteBrut(response),
        });
      }
      // D-103 · APRÈS L'APPEL — le plafond est revérifié une fois le coût
      // comptabilisé ci-dessus. Le contrôle reste sur le chemin NOMINAL : une
      // troncature lève son erreur propre, qui doit atteindre l'appelant AVEC
      // son corps. La remplacer par une erreur budgétaire ferait perdre la
      // preuve. Le plafond mord malgré tout — `assertPeutAppeler` voit la
      // dépense mise à jour dès l'appel suivant.
      budgetUsd.assertNonDepasse(PLAFOND_USD, etatDepense, label);
      if (!alerteNeufDixiemesEmise && etatDepense.depense >= 0.9 * PLAFOND_USD) {
        alerteNeufDixiemesEmise = true;
        console.log(
          `  ⚠ ALERTE 90 % (EP-050) — dépensé $${etatDepense.depense.toFixed(4)} / plafond $${PLAFOND_USD} après ${label}`,
        );
      }
      return response;
    } catch (error) {
      const msg = String(error?.message ?? error);
      if (adaptateur.estErreurGrammaire(error) && part.levelIndex < part.levels.length - 1) {
        console.log(`  [${label}] niveau "${level.name}" refusé — dégradation : ${msg.slice(0, 140)}`);
        continue;
      }
      throw error;
    }
  }
  throw new Error(`tous les niveaux de schéma refusés pour ${part.name}`);
}

/**
 * TEXTE REÇU, VERBATIM. Ni `trim`, ni retrait de clôture Markdown, ni
 * complétion : `extractJson` répare pour parser, celle-ci ne répare RIEN.
 * Un corps tronqué doit être conservé tel qu'il est arrivé, sinon il ne
 * témoigne plus de ce que le modèle a réellement produit.
 */
function texteBrut(response) {
  return (response?.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function extractJson(response) {
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  const cleaned = text.startsWith("```")
    ? text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
    : text;
  return JSON.parse(cleaned);
}

// Validation locale fail-closed sur le document COMPLET assemblé.
// EP-073 · ② — LES JUGES D'ACCEPTATION VIVENT DANS UN MODULE IMPORTABLE :
// mesurer la convergence des réparations sur les ARCHIVES exige de re-juger
// des artefacts SANS lancer de campagne — or ce fichier refuse tout import
// (garde EP-065, à raison). Les juges n'ont aucun dialecte ni dépense : ils
// sortent. emit-v3 les CONSOMME — mêmes objets, mêmes appels, zéro dérive.
const acceptation = await import(join(HERE, "acceptation.mjs"));
const { validateLocal, jugerAcceptation, perimetreDeJugement, elargit } = acceptation;

async function emitSections(system, contextText, label, usage, refusals, accumulateur, prescriptif) {
  const assembled = accumulateur ?? {};
  for (const part of PARTS) {
    // Étape ⑤ — les OBLIGATIONS dérivées mécaniquement des sections émises :
    // identifiants promis, cibles autorisées. Zéro coût, zéro supposition.
    const obligations = [
      obligationsPourPasse(part.name, assembled),
      // R5 — quand un modèle existe, la STRUCTURE est PRESCRITE.
      prescriptif === undefined
        ? ""
        : modeleMetier.obligationsPrescriptives(part.name, prescriptif.modele, prescriptif.plan),
    ].filter((x) => x !== "").join("\n\n");
    const user =
      `${contextText}\n\nSECTIONS À ÉMETTRE MAINTENANT : ${part.keys.join(", ")}.` +
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
    Object.assign(assembled, extractJson(response));
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
        : modeleMetier.obligationsPrescriptives(part.name, prescriptif.modele, prescriptif.plan);
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
      `DEMANDE DU CLIENT :\n${intention.text}`,
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
          prescriptif = { modele: verdictP0.modele, plan };
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
      `DEMANDE DU CLIENT :\n${intention.text}`,
      intention.slug,
      usage,
      refusals,
      prescriptif,
    );
    let { air, diagnostics } = validateLocal(document);
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
        `DEMANDE DU CLIENT :\n${intention.text}`,
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
      ({ air, diagnostics } = validateLocal(document));
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
        ({ air, diagnostics } = validateLocal(document));
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
console.log(
  `\nBILAN tranche [${start},${end}) : ${valid}/${summary.length} AIR valides · ` +
    `${bilanP0} · ${rtBilan} · ` +
    `coût ~$${etatDepense.depense.toFixed(4)} · ${etatDepense.appels} appels · journal ${JOURNAL}`,
);
