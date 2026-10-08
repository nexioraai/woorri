// ============================================================
// LE CŒUR DE L'ÉMISSION — EXTRAIT DE `emit-v3.mjs` LE 2026-10-07.
//
// ── POURQUOI CE FICHIER EXISTE.
//
// Ces 620 lignes vivaient dans un SCRIPT qui s'exécute au chargement. Le
// produit ne pouvait donc pas les appeler : importer `emit-v3.mjs` depuis une
// route aurait lancé la campagne entière, avec ses appels payants.
//
// Elles sont ici TELLES QUELLES — Y COMPRIS LEUR INDENTATION.
//
// Ce dernier point n'est pas de la coquetterie. Première tentative : j'avais
// indenté le bloc de deux espaces pour qu'il « rentre » dans la fabrique. Deux
// cliquets sont tombés aussitôt : ils DÉCOUPENT ce source par repères
// textuels — ils cherchent la déclaration d'une fonction, puis l'accolade
// fermante en début de ligne — pour l'évaluer hors du module. Ma mise en page
// a déplacé leur repère de fin.
//
// SECONDE LEÇON, DE LA MÊME FAMILLE : la première version de ce commentaire
// CITAIT le repère exact entre guillemets. L'index le trouvait donc dans la
// prose avant de le trouver dans le code, et la fonction évaluée était ma
// propre explication. Dans un fichier qu'un instrument lit comme du TEXTE,
// un commentaire n'est pas inerte.
//
// ── POURQUOI UNE FABRIQUE PLUTÔT QUE DES EXPORTS DIRECTS.
//
// Ce code dépend de seize choses que le script construisait AU CHARGEMENT —
// dont un client d'API. Les exporter directement aurait reconduit le défaut
// qu'on corrige : un import suffirait à construire un client et à engager une
// dépense. La fabrique les reçoit ; rien ne se construit tant que personne
// n'appelle.
//
// ── CE QUI N'EST PAS PROUVÉ ICI, ET QUI DOIT L'ÊTRE.
//
// Qu'un déplacement soit textuellement exact ne prouve pas que la campagne
// rend le même résultat : la preuve de comportement demande un tirage, donc
// des appels payants. Elle n'est pas faite. `extraction-coeur.verif.mjs` dit
// ce qu'il sait — le texte est intact — et rien de plus.
// ============================================================

/** Construit le cœur de l'émission à partir des dépendances du script. */
export function creerCoeurEmission({
  airSchema,
  registry,
  blocksRegistry,
  presentation,
  ROLES_ICONES,
  adaptateur,
  client,
  MAX_TOKENS,
  coutUSD,
  capacitesDeService,
  etatDepense,
  PLAFOND_USD,
  budgetUsd,
  CONTRAT_CIBLE,
  TARIFS,
  executionContract,
  preservation,
  modeleMetier,
  surfaceEnveloppe,
  PRIX,
  z,
}) {

// ── L'ALERTE DES 90 % EST UN ÉTAT INTERNE, ET ELLE VIENT ICI.
//
// Le script la déclarait ; seul ce code la lit ET l'écrit. Laissée dehors,
// elle aurait été la deuxième variable mutable à ne pas traverser la fabrique
// — après `etatDepense`, qui a arrêté le premier tirage. Celle-ci n'a pas
// besoin d'un accesseur : personne au-dehors ne la consulte.
let alerteNeufDixiemesEmise = false;

const PARTS = [
  // ── SCISSION DE `base` (2026-10-08) — MESUREE, pas supposee.
  //
  // Sonde a COUT NUL (une grammaire refusee est un 400, aucun jeton
  // facture) : `base` etait refusee a SES TROIS NIVEAUX de degradation —
  // « The compiled grammar is too large ». Le moteur ne pouvait donc plus
  // rien emettre DU TOUT, des la premiere passe, et ce pour n'importe quelle
  // demande. La derniere campagne date du 2026-09-12 ; le schema a grossi
  // depuis, et personne ne s'en etait apercu parce que le site n'appelait
  // pas le moteur.
  //
  // CE N'EST PAS UNE QUESTION D'OCTETS : `base` faisait 5 ko et etait
  // refusee, `actions` en fait 4 et passe a son niveau 2. C'est la
  // COMPLEXITE compilee — unions, enums, imbrication — qui compte.
  //
  // MEME REMEDE QUE D-078 ET QUE LA SCISSION `entites`/`donnees` : on coupe.
  // L'identite du projet et sa navigation d'un cote ; les contrats
  // transverses — rendu, reseau, plateforme, conformite — de l'autre. Chacun
  // porte alors une grammaire que le service accepte, verifie par la meme
  // sonde.
  {
    name: "base",
    keys: ["airSchemaVersion", "projectId", "app", "navigation"],
  },
  {
    name: "socle",
    keys: ["design", "network", "native", "compliance"],
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


/**
 * EP-173 — LE SEGMENT `ecrans` SE SCINDE PAR PARCOURS.
 *
 * MESURÉ (EP-172) : `ecrans` concentre 4 des 11 arrêts, et la cause n'est pas
 * sa grammaire — les dégradations se concentrent sur `base` (79) et `entites`
 * (42), pas sur lui (25). C'est son VOLUME EN UN SEUL APPEL : 49 % du
 * document, médiane 15 écrans, jusqu'à 28.
 *
 * SURCOÛT CHIFFRÉ : un appel de plus renvoie les sections déjà émises en
 * contexte — 2 678 tokens, soit $0,0134. En face, 40 runs échoués ont perdu
 * $52,75, soit $1,32 par échec. RAPPORT 1 POUR 98.
 *
 * LE DERNIER LOT EST CELUI DES SURFACES, ET IL EST INDISPENSABLE : les écrans
 * de `purpose` ne sont dans AUCUN plan — le plan dérive du modèle métier, qui
 * les ignore (EP-165 ③a). Sans un lot qui leur soit propre, ils
 * DISPARAÎTRAIENT entre deux lots.
 *
 * SANS MODÈLE, RIEN NE CHANGE : le segment reste entier. L'ignorance ne
 * réorganise pas l'émission.
 */
function partsPour(prescriptif) {
  if (prescriptif?.modele === undefined || prescriptif?.plan === undefined) return PARTS;
  const lots = modeleMetier.lotsDEcrans(prescriptif.modele, prescriptif.plan);
  if (lots.length <= 1) return PARTS;
  const i = PARTS.findIndex((x) => x.name === "ecrans");
  const modele = PARTS[i];
  // EP-175 ② — L'ÉCHELLE SE DESCEND UNE FOIS POUR TOUS LES LOTS.
  //
  // MESURÉ SUR EP-174 : les dégradations sont passées de 4 à 12 — `base` ×2
  // puis CHAQUE lot ×2. Mon chiffrage d'EP-172 ne l'avait pas prévu
  // [L-174-A] : chaque lot repayait le même escalier de grammaire.
  //
  // VÉRIFIÉ AVANT DE PARTAGER, comme demandé : les lots portent le MÊME
  // schéma. Ils sont tous construits par `{...PARTS[ecrans]}`, donc mêmes
  // `keys: ["screens"]`, donc même `pick` Zod, donc le MÊME JSON Schema —
  // 2 362 octets identiques. Seuls diffèrent `name`, `ecransAttendus`,
  // `surfaces` et `accumule`, dont AUCUN n'entre dans la grammaire. Une
  // échelle commune ne peut donc dégrader aucun lot à tort.
  //
  // LE PARTAGE PASSE PAR UN ACCESSEUR, jamais par une copie : `{...modele}`
  // copie `levelIndex` par VALEUR, et chaque lot repartait de zéro. Les lots
  // lisent et écrivent désormais le MÊME compteur.
  const etatEchelle = { levelIndex: modele.levelIndex ?? 0 };
  const eclates = lots.map((lot) => ({
    ...modele,
    name: `ecrans:${lot.parcours}`,
    base: "ecrans",
    ecransAttendus: lot.ecrans,
    accumule: "screens",
    get levelIndex() { return etatEchelle.levelIndex; },
    set levelIndex(v) { etatEchelle.levelIndex = v; },
  }));
  // LE LOT DES SURFACES, en dernier : il ne vient pas du plan mais de la
  // règle 41, et il est le seul à n'avoir aucune liste d'écrans attendus.
  eclates.push({
    ...modele,
    get levelIndex() { return etatEchelle.levelIndex; },
    set levelIndex(v) { etatEchelle.levelIndex = v; },
    name: "ecrans:surfaces",
    base: "ecrans",
    ecransAttendus: [],
    surfaces: true,
    accumule: "screens",
  });
  return [...PARTS.slice(0, i), ...eclates, ...PARTS.slice(i + 1)];
}

for (const part of PARTS) {
  const pick = Object.fromEntries(part.keys.map((k) => [k, true]));
  part.zod = airSchema.projectAirSchema.pick(pick);
  // EP-051 — l'ÉCHELLE de dégradation est DÉCLARÉE par l'adaptateur.
  part.levels = adaptateur.degradationsPourEchelle(z.toJSONSchema(part.zod, { target: "draft-2020-12" }));
  part.levelIndex = 0;
}

// EP-154 — LES SURFACES ET LEURS CONDITIONS, DÉRIVÉES.
//
// NEUVIÈME OCCURRENCE, ET LA TROISIÈME CONSÉCUTIVE. La règle 41 interpolait
// `surfacesAttendues(true)` — le RÉSULTAT de la condition pour un cas
// particulier — puis réécrivait une partie des conditions en français. Les
// genres liés au PARTAGE n'apparaissaient donc nulle part, et le générateur
// ne pouvait pas savoir qu'il les devait : mesuré en EP-152, un document qui
// partage des données sans rien en dire.
//
// LE PROMPT NE PEUT PAS CONNAÎTRE LE DOCUMENT — il est construit une fois, au
// chargement, avant toute génération. Il ne doit donc pas énoncer un
// RÉSULTAT mais la RÈGLE : chaque genre avec SA condition, dérivée de la
// table qui la porte déjà (`exigeIdentite`, `exigePartage`).
function surfacesDigest() {
  const condition = (fiche) =>
    fiche.exigePartage === true
      ? "SI l'application partage des données avec un tiers (toute intégration)"
      : fiche.exigeIdentite === true
        ? "SI l'application a des comptes"
        : "TOUJOURS";
  const lignes = [];
  for (const [genre, fiche] of Object.entries(presentation.SURFACES_DE_COMPTE)) {
    lignes.push(
      `   · \`${genre}\` — ${condition(fiche)} — ` +
        (fiche.source === null ? "décision produit" : `OBLIGATION : ${fiche.source}`),
    );
  }
  for (const genre of presentation.GENRES_HORS_COMPTE) {
    lignes.push(
      `   · \`${genre}\` — SI l'application partage des données avec un tiers — ` +
        "OBLIGATION : Google Play, User Data (divulgation proéminente)",
    );
  }
  return lignes.join("\n");
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
- UN TITRE, UNE FOIS. L'en-tête NATIVE porte déjà \`screen.title\` sur tout écran qui ne la masque pas. Un bloc \`header\` qui REDIT ce titre l'affiche DEUX fois, l'une sous l'autre — mesuré sur 10 écrans d'une génération réelle. Le bloc \`header\` porte une accroche, un sous-titre, une phrase à LUI : jamais le titre de l'écran.
- \`showsScreenTitle: false\` SUPPRIME le retour. L'en-tête native porte la flèche que la plateforme fournit ; la masquer en prive l'écran. Ne le fais QUE sur une destination de la barre — elle n'a rien derrière elle. Sur un écran atteint par \`navigate\`, c'est un cul-de-sac : on y entre, on n'en sort plus.

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

17ter. L'ESPACE COMPTE A DEUX ÉTATS, ET LE CONTRAT SAIT DÉJÀ LE DIRE — le prédicat de session existe (\`session_anonymous\`, \`session_authenticated\`) et AUCUN écran ne s'en sert pour porter deux visages. ANONYME : l'espace compte montre DEUX BOUTONS, « Se connecter » et « Créer un compte », et RIEN D'AUTRE — chacun OUVRE sa fiche, par une action \`navigate\`. N'Y POSE PAS DE FORMULAIRE : un champ de mot de passe offert à quelqu'un qui n'a pas encore choisi entre se connecter et s'inscrire lui demande de deviner ce qu'il est en train de faire. CONNECTÉ : l'espace compte montre ce qui le concerne — ce qu'il a publié, ce qu'il gère, et ses réglages. Les surfaces obligatoires (aide, contact, conditions, confidentialité, suppression) restent TOUT EN BAS, dans les deux états.
17bis. UNE CAPACITÉ DE SERVICE DÉSIGNE SON INTÉGRATION — ces capacités s'appuient sur un service EXTERNE et le moteur doit savoir OÙ le joindre : ${capacitesDeService()}. Pour CHACUNE que tu déclares, l'intégration qui la sert porte \`capability: "<id>"\`. Sans ce lien, le moteur NE CÂBLE RIEN : la capacité reste déclarée et sans effet, et l'utilisateur voit un bouton qui ne fait rien. N'ÉCRIS AUCUN SECRET dans \`config\` — ni clé, ni jeton : l'adresse et la clé du service viennent du provisioning, jamais de toi. Les autres capacités (caméra, biométrie, position) vivent dans l'appareil et n'exigent AUCUNE intégration.
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

24bis. ET COMMENT ELLE LIT LA QUESTION — \`searchMode\` (registre de blocs 1.15.0). Par défaut la recherche cherche la saisie ENTIÈRE comme sous-chaîne : « filtre toyota » ne trouve donc PAS « filtre à huile toyota », les deux mots y étant séparés par « à huile ». MESURE SUR UN COMPTOIR RÉEL : l'employé voyait un écran vide alors que la pièce était en stock, et le client attendait. POSE \`searchMode: "tous_les_mots"\` dès que les gens TAPENT PLUSIEURS MOTS pour désigner une chose — un catalogue de pièces, de produits, de biens, d'annonces : chaque mot doit s'y trouver, dans n'importe quel ordre, un mot ramène large et trois resserrent. GARDE-LE EN SOUS-CHAÎNE quand on cherche une SUITE exacte et non des mots : un numéro de facture, une référence, une plaque. Sans \`searchFieldId\`, ce mode n'a aucun sens et ne se pose pas.

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

36quinquies. NOMBRES VRAISEMBLABLES — tout champ \`number\` ou \`decimal\` porte \`demoValues\` : 6 à 12 valeurs PLAUSIBLES pour ce que le champ MESURE. Sans elles le moteur tire un entier entre 1 et 999, quel que soit le sens du champ — et cela a produit un bureau de 907 PIÈCES pour 933 m², et un terrain à 628 FCFA. UNE SURFACE, UN NOMBRE DE PIÈCES ET UN PRIX N'ONT PAS LA MÊME ÉCHELLE : le moteur ne peut pas la deviner, TOI SI. Et les valeurs d'un même objet doivent être COHÉRENTES ENTRE ELLES — un logement de 3 pièces fait 60 à 90 m², pas 900. Un relecteur de magasin ouvre l'application et voit ces chiffres.
36ter. IMAGES RÉELLES (1.20) — tout champ \`asset\` d'une entité de CATALOGUE porte \`demoValues\` : 6 à 12 URLs \`https://picsum.photos/seed/<mot-descriptif-unique>/600/600\` (photos réelles, servies sans clé), ET \`picsum.photos\` figure dans \`network.allowedDomains\`. Un catalogue aux vignettes grises n'est pas un catalogue.

36quinquies. L'ACCUEIL EST UN FLEUVE DE SECTIONS — PRINCIPE GÉNÉRAL, TOUS ARCHÉTYPES. L'écran d'accueil d'une application de référence est un DÉFILEMENT VERTICAL de sections HÉTÉROGÈNES, chacune courte et typée. La grammaire : \`search_entry\` en tête quand l'app a un écran de recherche ; puis des sections \`list\` en \`layout: "row"\` (rangées horizontales de cartes — catégories, sélection, à découvrir…) ; une grille VERTICALE en section d'accueil est un APERÇU : borne-la par \`pageSize\` (4 à 6) et donne-lui \`seeAllLabel\` + geste secondaire vers l'écran complet ; la fenêtre pleine (catalogue, fil, historique) vit sur un écran dont la liste est l'UNIQUE liste. PROSCRIT : plusieurs listes VERTICALES empilées sur un même écran — elles se partagent la hauteur au lieu de couler (défaut mesuré sur le cas dougplace : trois listes pleines en tiers d'écran). Adapte les sections aux PARCOURS, jamais à un secteur : quand l'utilisateur a un historique à REPRENDRE (objets qu'il a créés), l'écran ouvre sur cette reprise puis sur la découverte ; quand le parcours est une PROGRESSION, il ouvre sur « reprendre » puis sur le catalogue ; quand la découverte prime, elle ouvre l'écran. La forme suit la structure des parcours du besoin. Les EXEMPLES ne sont pas des gabarits : déduis les sections du BESOIN.

36quater. L'ACCUEIL MONTRE LE PRODUIT — l'écran Accueil d'une app de catalogue ne se limite JAMAIS à un en-tête : il porte au moins un bloc \`list\` de l'entité vedette (sélection, nouveautés) en \`layout: "grid"\`, avec ses images. L'utilisateur voit la marchandise dès l'entrée, comme dans toute application de référence à catalogue.

36bis. VALEURS DE DÉMO (1.20) — tout champ TEXTE affiché par une liste ou un détail d'un CATALOGUE (nom, titre, description) porte \`demoValues\` : 4 à 8 valeurs RÉALISTES du domaine (« Collier baoulé perles bleues », jamais « nom 17 »). Le moteur les cycle dans les données de démonstration : c'est CE que le client verra à la première ouverture. Un catalogue crédible se juge à ces valeurs.

37. GRILLE DE CATALOGUE (1.20) — un écran de CATALOGUE (produits, biens, annonces, plats) déclare \`layout: "grid"\` sur son bloc \`list\` (et \`layout: "row"\` pour une RANGÉE horizontale de cartes) : les articles se présentent en CARTES sur deux colonnes — image dessus, nom, prix — comme toute application de référence à catalogue. \`imageFieldId\` est alors OBLIGATOIRE (règle 23). Les listes de FLUX (commandes, historique, panier) restent en lignes.

38. DÉCLENCHEURS — LES SEULS QUI EXISTENT : ${executionContract.EXECUTION_ENVELOPE_V1.triggers.join(" et ")}. \`data\` n'est câblé à AUCUN mécanisme d'activation (aucune source ne notifie) : une action à déclencheur \`data\` ne part JAMAIS — le juge de vivacité la REFUSE (VIVACITE_DECLENCHEUR_HORS_ENVELOPPE). Un \`empty_state\` qui porte \`actionLabel\`/\`actionId\` déclare son action \`{trigger:{kind:"ui",blockId:<ce bloc>}}\`. MESURÉ (EP-061/R6) : 3 actions \`data\` = un écran mort + deux contrôles morts.

39. UNE RÉFÉRENCE NE S'AFFICHE JAMAIS — un champ \`reference\` ne va dans AUCUN emplacement d'affichage ni de saisie (\`titleFieldId\`, \`subtitleFieldId\`, \`imageFieldId\`, \`fieldIds\` d'un \`form\`…) : le moteur ne traverse pas les relations à l'affichage (\`relationTraversal: false\`) — il rendrait l'IDENTIFIANT BRUT (\`ent_x_row_2\`). L'identité voyage par la NAVIGATION (règles 18/C4) ; l'affichage n'utilise que les champs PROPRES de l'entité. MESURÉ (EP-061/R6) : 11 références brutes sur la première traversée réelle.

40. CLASSE DE COMMERCE — \`compliance.commerceClass\` décrit le MODÈLE ÉCONOMIQUE DU DOMAINE, pas les écrans : \`physical_or_offapp\` dès que des biens ou services SE PAIENT hors application ou physiquement, MÊME SI l'app ne porte aucune étape de paiement (réserver une prestation payée sur place = \`physical_or_offapp\`) ; \`digital\` quand du contenu digital se vend dans l'app ; \`none\` SEULEMENT quand rien ne se paie nulle part. MESURÉ (EP-061) : \`none\` émis pour un domaine de prestations payées sur place — divergence refusée (CONFORMANCE_COMMERCE_DIVERGENT).

41. SURFACES DE L'APPLICATION — des écrans n'ont AUCUNE existence métier et doivent pourtant être là, parce que c'est une APPLICATION : ils se déclarent par \`purpose\` (énumération FERMÉE) et ne se déduisent d'aucun besoin. CHACUN A SA CONDITION — ne pose que ceux que ton application appelle :
${surfacesDigest()}
   Ils vivent DANS l'espace compte, atteignables par une action \`navigate\` depuis lui, et JAMAIS dans \`navigation.primary\`.

43. AGIR AU NOM D'UN AUTRE (1.29) — \`access.delegation\`. Certains métiers confient à quelqu'un le soin d'agir POUR un autre : un membre sans téléphone remet son argent en espèces à un mandataire, qui cotise à sa place et encaisse son tour. MESURÉ sur un cahier des charges réel : sans ce bloc, la colonne « mandataire » existe dans les données et RIEN ne l'autorise ni ne l'encadre — et un reçu qui ne porte qu'un seul nom ne prouve rien. DÉCLARE \`delegation\` quand, et seulement quand, le domaine fait agir quelqu'un pour autrui : \`subjectEntityId\` (l'entité des PERSONNES), \`holderFieldId\` (le champ qui dit qui est le mandataire de qui — il vit SUR cette entité et POINTE VERS ELLE, car le mandataire d'une personne est une personne), et \`delegatableRightIds\`, une LISTE BLANCHE. Jamais tous les droits : « ce mandataire peut tout faire pour moi » est une procuration générale que personne ne signe en connaissance de cause. Un droit qu'aucun rôle n'accorde ne se délègue pas — le validateur le refuse, car le mandataire exercerait un pouvoir que son mandant n'a pas.

44. CE QUI NE SE RÉÉCRIT PAS (1.30) — \`appendOnly\` sur une entité. Un JOURNAL ne se corrige pas en place : mouvements de stock, écritures comptables, cotisations, décaissements, votes. Déclare \`appendOnly: true\` sur ces entités, et le validateur REFUSE toute action qui les modifie ou les efface — la seule correction devient une ligne NOUVELLE qui annule la première, ce que la comptabilité appelle une contre-passation. Mesuré sur deux métiers : un mouvement efface fait mentir la comptabilité des la premiere erreur corrigée. NE LE POSE PAS sur une fiche qu'on édite normalement (un profil, un article, un réglage) : y interdire la modification obligerait à créer une ligne a chaque correction de faute de frappe.

45. CE QUI SUCCÈDE À QUOI (1.30) — \`transitions\` sur un champ \`enum\`. Une énumération liste des états et ne dit RIEN de leur ordre : rien n'empêche de repasser une commande livrée en « en attente », ni un paiement réussi en « bloqué ». Déclare les passages PERMIS — \`[{from, to}]\` — dès que les valeurs se succèdent dans le temps plutôt que de se choisir librement. LA PREMIÈRE VALEUR DE L'ÉNUMÉRATION EST L'ÉTAT INITIAL, et tout autre état doit être atteint par au moins une transition : un état que rien ne mène est une promesse qui ne se tiendra jamais, et le validateur le refuse. N'en pose PAS sur une énumération de CATÉGORIE (une famille d'article, un genre littéraire) : celles-là se choisissent, elles ne se succèdent pas.

46. UN CHAMP QUI EST LE RÉSULTAT D'AUTRES LIGNES (1.31) — \`derived\`. Certaines valeurs ne se SAISISSENT pas : elles se CALCULENT. Un stock est la somme des mouvements d'entrée et de sortie ; une cagnotte est la somme des versements ; un nombre de membres est le compte des inscriptions. Ecrire une telle valeur à la main la fait diverger de ce dont elle dérive, sans que rien ne le signale — defaut paye dans un systeme reel. POSE \`derived\` sur ces champs : \`{kind:"sum", relationId, fieldId}\` ou \`{kind:"count", relationId}\`. La relation doit PARTIR de l'entité qui porte le champ, et pour une somme le champ visé doit être un nombre. DEUX OPÉRATIONS SEULEMENT : un taux sur une durée (« 2 % par jour »), un partage (« 70/30 »), une projection — tout cela appartient au SERVEUR, pas au document. ET UN CHAMP CALCULÉ NE SE MET JAMAIS DANS UN FORMULAIRE : le validateur refuse un \`fieldIds\` qui le propose à la saisie.

47. UN GESTE QUI ATTEND UNE CONFIRMATION RECUE AILLEURS (1.32) — \`confirmation\` sur une action. Certains gestes ne s'annulent pas : virer de l'argent, supprimer definitivement, valider un paiement. Un bouton « etes-vous sur » se clique par reflexe ; un code recu SUR UN AUTRE CANAL — SMS, messagerie — prouve au passage que la personne detient ce canal. POSE \`confirmation: {kind:"code_hors_application", digits}\` sur ces gestes-la, et SEULEMENT sur eux : le validateur refuse une confirmation sur une simple navigation, parce qu'une confirmation qui protege un geste sans consequence apprend a les expedier. Le document dit que le geste est SUSPENDU et combien de chiffres sont attendus ; il ne dit ni par quel canal le code part ni comment il est verifie — une application qui verifierait elle-meme un secret le detiendrait, et un secret que le verificateur detient ne prouve plus rien.

48. DONNEES FINANCIERES (1.32) — \`compliance.dataCollected\` accepte \`financial_info\`. Declare-le des que l'application fait circuler de l'argent entre des personnes : cotisations, virements, remboursements, prets. NE DECLARE PAS \`purchases\` a sa place : « purchases » designe un ACHAT, et dans une tontine ou un systeme de prets personne n'achete rien. Une declaration FAUSSE a un magasin se paie plus cher qu'une incomplete — l'une est une erreur, l'autre devient un mensonge quand on la decouvre.

49. UN DOCUMENT QUI ENGAGE (1.3 du registre) — \`document.export\`. Un proces-verbal fait foi, un recu prouve une remise d'argent, un rapport se classe. Declare cette capacite quand l'application doit REMETTRE un tel document. Elle ne le COMPOSE pas : le serveur le produit, l'application le recoit et le remet. Un document fabrique sur un telephone dependrait de la version de l'app, de la police installee, de la taille de l'ecran — et ne serait archive nulle part, alors qu'un document qui engage doit rester consultable apres coup.

51. QUI ECRIT LE SERVEUR (1.34) — \`backend\`. Une application sans backend ne sert a rien : elle affiche des donnees de demonstration et ne garde rien. DECLARE TOUJOURS ce noeud. Deux reponses, et c'est le CLIENT qui tranche : \`{kind:"genere", stack:"spring_boot"}\` quand il n'exige rien de particulier — Deribfy ecrit le serveur, c'est le DEFAUT ; \`{kind:"externe"}\` quand il tient deja son propre backend ou en exige un dans une pile que le moteur ne sait pas ecrire — Deribfy n'emet alors AUCUN code serveur, seulement le contrat que ce serveur doit honorer. N'invente pas de pile : l'enumeration est FERMEE, et ce que le moteur ne sait pas ecrire, le format ne doit pas savoir le dire. \`domain\` ne se renseigne QUE si l'adresse du serveur existe deja — et elle doit alors figurer dans \`network.allowedDomains\`, sans quoi l'application ne joindra jamais son propre serveur.

41bis. LE GENRE DE L'ESPACE COMPTE LUI-MÊME — \`${presentation.GENRE_RACINE_COMPTE}\`. Les genres ci-dessus nomment ce qui VIT dans le compte ; celui-ci nomme le LIEU qui les héberge. IL EST LE SEUL DE SON ESPÈCE : le seul qui ait sa place dans \`navigation.primary\`, là où les autres y sont interdits. POSE-LE SUR L'ÉCRAN QUI EST L'ESPACE COMPTE — un seul, exactement, dès que ton application a des comptes. CE QU'IL COMMANDE : le moteur intitule cette destination « Compte », quel que soit le libellé que tu écris. Sans ce genre, le moteur ne SAIT PAS lequel de tes écrans est le compte, et il n'en devine aucun — la destination garde alors ton libellé, et ce n'est pas celui que l'utilisateur cherche. SEULE EXCEPTION, et elle est imposée : la DIVULGATION du partage se rencontre dans l'usage NORMAL — atteignable depuis l'écran d'ENTRÉE, jamais seulement depuis un menu ou l'espace compte (Google Play, User Data : « must be displayed in the normal usage of the app and not require the user to navigate into a menu or settings »). 41ter. ET TU RÉDIGES LEUR TEXTE — DÉCISION DE YOUSSOUF, 2026-09-18, QUI RENVERSE LA CONSIGNE PRÉCÉDENTE. Jusqu'ici l'instruction disait « tu ne rédiges pas leur texte, l'écran existe, son contenu sera fourni » — et les écrans produits annonçaient donc « le texte complet des conditions est fourni par le propriétaire ». Un écran qui promet un texte n'est pas une surface, c'est une page blanche avec une excuse. DÉSORMAIS : chaque écran de surface qui porte un ENGAGEMENT (conditions, confidentialité, mentions légales, partage des données, retrait du consentement, suppression du compte) porte un bloc \`prose\` avec un texte RÉEL ET COMPLET, écrit pour CE domaine et CE qu'il collecte vraiment — les catégories de données que TES entités déclarent, les intégrations que TU as posées, rien d'inventé. CE TEXTE EST UN BROUILLON, ET IL LE DIT : pose \`brouillon: true\` sur ces blocs. Un texte juridique ENGAGE le propriétaire ; il doit le relire, l'adapter à son pays et le remplacer. Le déclarer brouillon n'est pas une précaution de forme — c'est la condition pour que le rédiger soit acceptable. N'écris JAMAIS \`brouillon: true\` sur un texte qui n'engage personne (une page d'aide, un mode d'emploi) : celui-là est définitif.

42. QUI A LE DROIT DE VOIR QUOI (1.28) — \`access\` et \`requiredRightId\`.

   Une application de GESTION — stock, caisse, atelier, école, clinique — n'a pas un seul
   utilisateur : elle a un patron et des employés, et ils ne voient pas la même chose. Déclare
   alors \`access\` : \`rights\` (un droit par domaine : \`right_stock\`, \`right_caisse\`,
   \`right_rentabilite\`), \`roles\` (celui qui dirige porte \`grantsAllRights: true\` ; les autres
   une LISTE BLANCHE, vide par défaut), et \`defaultRoleId\` — ce qu'un compte reçoit quand rien ne
   lui a été accordé.

   Chaque écran réservé porte \`requiredRightId\`. Chaque geste réservé aussi : un même écran de
   scan peut servir à l'inventaire, à la vente et au transfert, qui ne font PAS la même chose au
   stock — ce sont trois droits, portés par trois actions, pas par l'écran.

   ⚠️ L'ÉCRAN D'ENTRÉE N'EN PORTE AUCUN. Le validateur refuse un \`entryScreenId\` qui exige un
   droit que le rôle par défaut n'a pas (AIR_ACCESS_ENTRY_UNREACHABLE), et il a une raison
   mesurée : dans un système réel, un employé dont les droits n'étaient pas encore accordés était
   mis dehors DÈS L'OUVERTURE — à la connexion, puis à chaque lancement de l'application
   installée. Le patron ne pouvait pas le voir : il voit tout.

   Une application sans employés n'écrit PAS \`access\` — un modèle d'accès inventé est pire
   qu'absent, car il se croit tenu.

35bis. UNE FICHE, UN SEUL BUT — ET C'EST LA RÈGLE LA PLUS SOUVENT ENFREINTE. Un écran ne porte JAMAIS deux \`form\`. Mesuré trois runs de suite : l'écran « Se connecter » portait « J'ai déjà un compte » ET « Créer un compte », l'un sous l'autre, et l'utilisateur devait deviner lequel le concernait. Le choix se fait AVANT, par un BOUTON qui ouvre la fiche voulue — deux boutons sur l'espace compte, deux écrans distincts, un formulaire chacun.

35ter. CE QU'UNE FICHE D'IDENTITÉ DEMANDE, ET RIEN DE PLUS. Un \`form\` qui porte un champ \`sensitive\` est une fiche d'authentification. Elle porte AU PLUS TROIS champs :
   · SE CONNECTER — l'identifiant et le secret. DEUX champs, pas un de plus, plus un bouton « mot de passe oublié » à côté.
   · CRÉER UN COMPTE — le nom, l'identifiant, le secret. TROIS champs, et le rôle \`confirmation\` dans \`saisieRoles\` pour faire ressaisir le secret.
   CE QUI RELÈVE DU PROFIL NE S'Y TROUVE PAS. Ville, téléphone, type, catégorie, photo : ces champs se remplissent APRÈS, dans l'espace compte, et seulement si ton domaine en a besoin. Mesuré : une fiche d'inscription portait SEPT champs — quatre questions posées avant même que la personne ait un compte, quand rien ne les exige pour en ouvrir un.
   UN SECRET QUI S'ENREGISTRE SE CONFIRME. Sans le rôle \`confirmation\`, une faute de frappe enferme la personne dehors et rien ne le lui dit. La fiche de CONNEXION, elle, ne confirme pas : elle VÉRIFIE (rôle \`verification\`).

35quinquies. L'ESPACE COMPTE NE POSE PAS DE FORMULAIRE D'EMBLÉE — POSE DEUX BOUTONS. Sur l'écran de genre \`account_home\`, un visiteur anonyme ne doit PAS trouver un champ de saisie déjà ouvert : il n'a pas encore choisi entre SE CONNECTER et CRÉER UN COMPTE, et il ne sait donc pas ce qu'il remplit. Pose DEUX BOUTONS et rien d'autre ; chacun NAVIGUE vers son propre écran, où sa fiche l'attend seule. Mesuré deux runs de suite : un formulaire de connexion posé directement dans l'espace compte, et l'inscription reléguée dessous.

35quater. L'ESPACE COMPTE SERT LES DEUX ÉTATS. Pose \`visibleWhen\` sur ses blocs : ce qui fait ENTRER en \`session_anonymous\`, ce qui fait GÉRER et SORTIR en \`session_authenticated\`. Sans les deux, un visiteur trouve une porte sans poignée, ou un utilisateur connecté n'a aucune sortie.

37. LE CATALOGUE N'EST PAS UN ÉCHANTILLON — PLANCHER DE TRENTE-CINQ. Quand ton application présente un catalogue de produits, d'articles ou de biens, émets AU MOINS 35 valeurs de démonstration pour l'entité qui le porte. AUCUNE LIMITE HAUTE : davantage est toujours mieux. Mesuré à l'écran : une boutique livrée avec six articles ne se juge pas, ne se fait pas défiler, et ne montre ni la recherche ni les filtres à l'œuvre — elle a l'air d'une maquette. CHAQUE ENTRÉE EST DISTINCTE ET PLAUSIBLE : des noms réels du domaine, des prix qui varient de façon crédible, des descriptions différentes. Jamais « Produit 1, Produit 2 ».

37bis. CE QU'UN PRODUIT PORTE. Une entité de catalogue déclare AU MINIMUM : une image (champ \`asset\` avec ses \`demoValues\`), un titre, une description, un prix — et les déclinaisons qui font sens dans ce domaine, quand il y en a (taille, poids, durée, format). La FICHE de détail affiche tout cela : l'image en tête, puis la description, les déclinaisons, et le prix. Un prix est un nombre PRÉCIS, jamais arrondi au hasard : il doit être vraisemblable pour ce produit et cette monnaie. AUTANT DE VALEURS QUE DE LIGNES, SUR CHAQUE CHAMP AFFICHÉ — c'est la règle la plus souvent enfreinte et la plus visible à l'écran. Si ton catalogue porte 35 titres, il porte 35 images ET 35 prix ET 35 descriptions. Mesuré sur un run réel : 8 titres, 8 photos, 6 descriptions et ZÉRO prix, alors que le prix était affiché sur chaque ligne — huit produits se montraient sans leur prix. Un champ que tu DÉSIGNES pour l'affichage (\`titleFieldId\`, \`subtitleFieldId\`, \`trailingFieldId\`, \`badgeFieldId\`, \`imageFieldId\`) et que tu laisses court est un TROU VISIBLE, pas une discrétion.

37ter. LA DEVISE EST DÉCLARÉE UNE FOIS, ET ELLE VAUT PARTOUT. \`app.currency\` porte le code ISO 4217 de la monnaie — trois lettres majuscules, par exemple EUR, USD, XAF, XOF. TU NE L'INVENTES PAS : elle t'est donnée, ou elle n'existe pas. N'ÉCRIS AUCUN SYMBOLE NI AUCUN NOM DE MONNAIE DANS LES VALEURS DE PRIX : un prix est un NOMBRE, la devise est déclarée à part, et c'est le moteur qui les met en forme. Écrire « 45 000 FCFA » dans une valeur de prix fige un mot qui varie selon la langue, et interdit tout reformatage — le document porte le code, le moteur dessine le reste.

37quater. QUAND LE PAIEMENT SE CONCLUT HORS DE L'APPLICATION. Si le besoin dit que l'acheteur paie AILLEURS — par transfert, de la main à la main, par un moyen que le vendeur utilise déjà — alors la capacité est \`payments.offapp_transfer\`, et surtout PAS un encaissement par carte. TU NE CHOISIS PAS : ce choix est dans le besoin qui t'est donné, ou il n'y est pas. N'INVENTE JAMAIS un moyen de paiement à partir d'un pays, d'une ville ou d'une monnaie — un marchand peut encaisser par carte n'importe où, et de la main à la main n'importe où.
   L'ÉCRAN DE PAIEMENT PORTE ALORS TROIS CHOSES, et elles se suivent : ① la coordonnée d'encaissement du vendeur, affichée en clair et lisible — elle vient des DONNÉES, une seule pour toute la boutique, jamais une par produit ; ② un récapitulatif de ce qui est commandé et du montant ; ③ un bouton qui OUVRE le canal de contact vers cette même coordonnée, avec le récapitulatif déjà écrit dans le message, plus un second bouton pour appeler. Les deux passent par \`external_contact\`.
   CE QUE TU NE PROMETS PAS : l'application ne VOIT PAS le paiement passer et ne peut donc RIEN confirmer automatiquement. Aucun texte ne doit laisser croire le contraire. Ce qui suit le paiement est humain — l'acheteur envoie sa preuve au vendeur par le canal de contact, et le vendeur livre.

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

return {
  PARTS, partsPour, surfacesDigest, blocsDigest, registryDigest,
  SYSTEM_EMIT, callPart, texteBrut, extractJson,
  // ── L'ÉTAT DE DÉPENSE SE LIT PAR ICI, ET C'EST OBLIGATOIRE.
  //
  // Le code déplacé RÉASSIGNE `etatDepense` à chaque appel payant, et le
  // script le relit pour afficher le coût et faire mordre le plafond. Une
  // fabrique n'en reçoit qu'une COPIE : les mutations ne traverseraient pas,
  // et le plafond comparerait éternellement zéro.
  //
  // Ce défaut n'a pas été trouvé en relisant : le premier tirage s'est arrêté
  // dessus, AVANT le moindre appel payant. Un accesseur garde le texte
  // déplacé intact et rend la mutation visible là où elle doit l'être.
  lireEtatDepense: () => etatDepense,
};
}
