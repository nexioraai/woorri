// ============================================================
// LE MOTEUR, MONTE POUR LE PRODUIT — 2026-10-08.
//
// ── CE QUE CE FICHIER EST.
//
// `emission-coeur.mjs` sait appeler UNE passe. `orchestration.mjs` sait les
// ENCHAINER. Les deux sont des fabriques : elles attendent les vingt et une
// dependances que `emit-v3.mjs` construisait au chargement — et c'est la que
// la chaine s'arretait pour le produit.
//
// Ce module les construit, et rend UNE fonction. Le site n'a plus a connaitre
// ni les passes, ni les registres, ni les tarifs.
//
// ── CE QU'IL REMPLACE, ET POURQUOI C'EST UN REMPLACEMENT.
//
// Le site appelait P0, puis `apps/web/src/lib/apps/derivation.ts` — 297
// lignes ecrites a la main. Tir reel sur la marketplace du proprietaire,
// 2026-10-08 :
//
//     entites 5 · ecrans 8 · compileWeb 72 fichiers
//     actions 0 · regles 0 · capacites 0 · intent ABSENT
//
// Huit ecrans qui s'affichent et ou il ne se passe RIEN. Les etats de
// commande, WhatsApp, l'appel direct, le mobile money — tout cela vit dans
// les quatre champs vides, c'est-a-dire dans les passes `capacites`,
// `actions`, `donnees` et `intention` que personne n'appelait.
//
// ── LES DEUX FONCTIONS CI-DESSOUS SONT DEPLACEES, PAS REECRITES.
//
// `capacitesDeService` et `surfaceEnveloppe` vivaient dans le preambule du
// script. Elles sont ici TELLES QUELLES, indentation comprise, et
// `extraction-moteur.verif.mjs` compare leurs empreintes a celles d'avant.
// Le reste du preambule n'est que des imports et des constantes : ils sont
// reconstruits a l'identique, et le verificateur compare la LISTE des
// dependances passees aux deux fabriques a celle du script.
//
// ── LA DEPENSE NE SE PRESUME TOUJOURS PAS.
//
// Aucun client n'est construit a l'import : `creerMoteur` doit etre appele,
// et il exige une cle. Importer ce module ne coute rien.
// ============================================================
import { z } from "zod";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

/**
 * AUCUN PLAFOND PAR DEFAUT — et c'est une correction.
 *
 * J'avais pose 6 $ par application. Le proprietaire :
 *
 *   « Si ce que demande l'utilisateur coute plus de 6 $, alors d'apres toi
 *     il faut empecher ? Retire-moi ce putain de plafond insense. »
 *
 * Il a raison, et c'est la MEME erreur que les 40 000 jetons : un nombre que
 * j'ai choisi, qui ne mesure rien, et qui refuse de construire ce que
 * quelqu'un demande. Une application riche coute plus cher — c'est une
 * information, pas une faute.
 *
 * `Infinity` traverse les gardes du budget sans jamais mordre
 * (`etat.depense <= Infinity`). Le budget n'est donc plus un REFUS : il reste
 * une MESURE, consignee a chaque generation et lisible dans l'administration.
 *
 * Un appelant qui veut vraiment borner passe `plafondUsd` ; personne ne le
 * fait, et c'est voulu.
 */
export async function creerMoteur({ cleApi, plafondUsd = Infinity, paquets, client: clientFourni }) {
  if (typeof cleApi !== "string" || cleApi.trim() === "") {
    throw new Error("MOTEUR_CLE_ABSENTE");
  }

  // ── LES PAQUETS VIENNENT DE L'APPELANT QUAND IL PEUT LES FOURNIR.
  //
  // DEFAUT MESURE EN PRODUCTION, 2026-10-08 : la route rendait « Lecture
  // impossible » INSTANTANEMENT. Cause — ce fichier importait HUIT fichiers
  // TypeScript par chemin absolu. Sous `tsx`, en local, ca marche. En
  // production, Node ne sait pas lire un `.ts`, et ces chemins ne sont meme
  // pas embarques dans la fonction.
  //
  // C'est la QUATRIEME fois aujourd'hui que le meme defaut passe : prouve en
  // local, mort deploye. Et je l'avais pousse sans un seul essai en ligne.
  //
  // LE SITE, LUI, SAIT LES RESOUDRE : `@deribfy/air-schema`,
  // `@deribfy/repair`… sont des paquets de l'espace de travail, et le
  // bundler suit leurs imports. Il les passe donc ICI, deja charges.
  //
  // LE REPLI PAR CHEMIN RESTE, et c'est voulu : la campagne en ligne de
  // commande tourne sous un chargeur TypeScript et n'a aucune raison de
  // changer. Un appelant qui ne fournit rien retombe dessus.
  const charger = async (cle, chemin) => {
    if (paquets?.[cle] !== undefined) return paquets[cle];
    if (paquets?.__strict === true) {
      throw new Error(`PAQUET_NON_INJECTE: ${cle} (${chemin}) — Node ne sait pas lire un .ts`);
    }
    return await import(join(REPO, chemin));
  };

  const airSchema = await charger("airSchema", "packages/air-schema/src/index.ts");
  const registry = await charger("registry", "packages/capability-registry/src/index.ts");
  const blocksRegistry = await charger("blocksRegistry", "packages/blocks/src/registry.ts");
  const presentation = await charger("presentation", "packages/execution-contract/src/presentation.ts");
  const primitives = await charger("primitives", "packages/primitives/src/roles-icones.ts");
  const { ROLES_ICONES } = primitives;
  const { obligationsPourPasse } = await import(join(HERE, "obligations-passes.mjs"));
  const passe0 = await import(join(HERE, "passe0.mjs"));
  const modeleMetier = await import(join(HERE, "modele-metier.mjs"));
  const budgetUsd = await charger("budgetUsd", "packages/repair/src/budget-usd.ts");
  const preservation = await charger("preservation", "packages/repair/src/preservation.ts");
  const executionContract = await charger("executionContract", "packages/execution-contract/src/envelope.ts");
  // ── LE REGISTRE EST POSE AVANT D'IMPORTER `acceptation.mjs`.
  //
  // Ce module importe NEUF fichiers TypeScript en top-level await : ils
  // s'executent AU CHARGEMENT, donc aucun argument ne peut les devancer. Le
  // registre global est le seul moyen de les devancer sans transformer ce
  // fichier en fabrique — ce qui casserait ses dix consommateurs, dont huit
  // tests. Pose ICI, au plus pres de l'import qu'il sert.
  if (paquets !== undefined) {
    globalThis.__DERIBFY_PAQUETS__ = { ...(globalThis.__DERIBFY_PAQUETS__ ?? {}), ...paquets };
  }
  const repairScope = await charger("repairScope", "packages/repair/src/repair-scope.ts");
  const acceptation = await import(join(HERE, "acceptation.mjs"));
  const { chargerAdaptateur } = await import(join(HERE, "adaptateurs.mjs"));
  const adaptateur = await chargerAdaptateur(process.env.ADAPTATEUR_FOURNISSEUR);

  const ENV = executionContract.EXECUTION_ENVELOPE_V1;

function capacitesDeService() {
  return registry.CAPABILITIES.filter((c) => c.implementation?.kind === "provider_service")
    .map((c) => `\`${c.id}\``)
    .join(", ");
}

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

  // Le client : meme reglage que la campagne — vingt minutes, deux reprises.
  // La cle vient de l'appelant, jamais d'un fichier : `.env.local` n'est pas
  // deploye, et l'adaptateur a ete ecrit pour une campagne lancee a la main.
  // ── LA COUTURE DU CLIENT (etage 2, mode a blanc).
  //
  // `client.messages.create` est LA frontiere payante — tout passe par elle,
  // les passes comme la sonde. Un client fourni la remplace EN ENTIER : c'est
  // ce qui permet d'eprouver la machinerie de continuation a cout nul, avec
  // un client a blanc qui vit dans le fichier de preuve, jamais dans un
  // chemin de production. Aucun appelant de production ne fournit de client.
  const client =
    clientFourni ??
    (await adaptateur.creerClient(() => `ANTHROPIC_API_KEY=${cleApi}`, {
      timeout: 20 * 60 * 1000,
      maxRetries: 2,
    }));
  const PRIX = {
    in: adaptateur.CONFIG.prixParMtok.entree,
    cacheWrite: adaptateur.CONFIG.prixParMtok.ecritureCache,
    cacheRead: adaptateur.CONFIG.prixParMtok.lectureCache,
    out: adaptateur.CONFIG.prixParMtok.sortie,
  };
  const TARIFS = { entree: PRIX.in, ecritureCache: PRIX.cacheWrite, lectureCache: PRIX.cacheRead, sortie: PRIX.out };
  const coutUSD = (u) => adaptateur.coutUsd(adaptateur.lireUsage(u));
  const CONTRAT_CIBLE = "1.34.0";
  const MAX_TOKENS = 40000;
  const PLAFOND_USD = plafondUsd;
  const etatDepense = budgetUsd.DEPENSE_INITIALE;

  const { creerCoeurEmission } = await import(join(HERE, "emission-coeur.mjs"));
  const coeur = creerCoeurEmission({
    PLAFOND_USD, CONTRAT_CIBLE, TARIFS, executionContract, preservation, airSchema,
    registry, blocksRegistry, presentation, ROLES_ICONES, adaptateur, client,
    MAX_TOKENS, coutUSD, capacitesDeService, etatDepense, budgetUsd, modeleMetier,
    surfaceEnveloppe, PRIX, z,
  });

  const { creerOrchestration } = await import(join(HERE, "orchestration.mjs"));
  const orchestration = creerOrchestration({
    adaptateur, modeleMetier, presentation, preservation, acceptation,
    obligationsPourPasse, repairScope,
    PARTS: coeur.PARTS, partsPour: coeur.partsPour, SYSTEM_EMIT: coeur.SYSTEM_EMIT,
    callPart: coeur.callPart, extractJson: coeur.extractJson,
  });

  const { validateLocal, jugerAcceptation, perimetreDeJugement, elargit } = acceptation;
  // ── LA GATE ANTI-OSCILLATION — la meme que la campagne, demenagee dans
  // `gate-reparation.mjs` (egalite a l'octet modulo renommages declares,
  // prouvee). Sans elle, une reparation qui n'ampute pas remplacait le
  // document SANS EXAMEN — meme pire qu'avant. Defaut mesure au tir n°2.
  const { creerGateReparation } = await import(join(HERE, "gate-reparation.mjs"));
  const gateReparation = creerGateReparation({ validateLocal, perimetreDeJugement, elargit });

  // ── LA SONDE DE GRAMMAIRE, UNE FOIS PAR MOTEUR.
  //
  // Mesure : deux refus de grammaire sur trois arrivent sous forme de DELAI,
  // et la degradation de `callPart` n'est armee que par le `status 400`. Le
  // moteur jetait donc au niveau 0 au lieu de descendre au niveau 2, qui est
  // accepte trois fois sur trois.
  //
  // La sonde POSITIONNE le point de depart de chaque passe sur le niveau le
  // plus contraint qui passe. Elle ne retire rien : la degradation de
  // `callPart` reste disponible au-dela.
  //
  // `PARTS` est un etat de module, partage entre les appels d'un meme
  // processus. C'est VOULU : le niveau acceptable est une propriete du
  // SCHEMA, pas de la demande. Deux generations simultanees mesureraient la
  // meme chose.
  const { creerSondeGrammaire } = await import(join(HERE, "sonde-grammaire.mjs"));
  const sondeGrammaire = creerSondeGrammaire({ client, adaptateur });
  let niveauxSondes = null;
  /** Rend aussi `fraiche` : seule la tranche qui a REELLEMENT sonde replie
   *  le cout des sondes — une reprise ne les compterait pas deux fois. */
  async function sonderUneFois() {
    if (niveauxSondes !== null) return { niveaux: niveauxSondes, fraiche: false };
    niveauxSondes = await sondeGrammaire.sonder(coeur.PARTS);
    return { niveaux: niveauxSondes, fraiche: true };
  }

  /**
   * UNE DEMANDE EN TEXTE LIBRE → UN DOCUMENT AIR COMPLET.
   *
   * La SEQUENCE est celle de `emit-v3.mjs`, reprise pas a pas : P0, le plan
   * d'ecrans, les huit passes, les juges, la reparation. Ce qui n'est pas
   * repris, ce sont les gestes de CAMPAGNE — journal, artefacts sur disque,
   * ecriture au corpus, aller-retour de transcription. Ils ne concernent pas
   * un utilisateur qui demande une application.
   *
   * TROIS TIRAGES P0 AU PLUS, comme la campagne (EP-070 ③) : la boucle ne
   * MASQUE pas la variance du modele, elle la COMPTE. A l'epuisement, arret
   * et rapport — jamais de juge assoupli pour « faire passer ».
   */
  // ════ L'EMISSION PAR TRANCHES — etage 2 du plan asynchrone (2026-10-08) ════
  //
  // Une emission complete dure ~28 minutes ; une invocation serverless en a
  // 300. L'emission devient donc CONTINUABLE : une tranche travaille dans un
  // budget temps, se suspend ENTRE deux appels, et rend un etat que la
  // tranche suivante reprend. L'etat est integralement serialisable — c'est
  // lui qui ira dans `sections_acquises` (etage travailleur).
  //
  // CE QUE CES ENTREES NE PROUVENT PAS ENCORE : le mode a blanc qui les
  // eprouve etablit « machinerie correcte », JAMAIS « pret pour la prod ».
  // Tant que l'async n'a pas tourne une fois contre le vrai service, un vert
  // a blanc n'est pas un vert reel.

  /**
   * Le prescriptif, RECALCULE depuis le modele — jamais serialise.
   *
   * Plan et ecrans d'identite se DERIVENT du modele par des fonctions pures
   * et gratuites. Les stocker dans l'etat, c'etait leur permettre de
   * diverger de leur source ; on ne stocke jamais ce qui se derive.
   *
   * EP-190 ② — le prescriptif porte les ECRANS D'IDENTITE. Derive,
   * jamais recopie : `estConceptIdentite` decide, `ecranAirDe` traduit.
   */
  function prescriptifDe(modeleP0) {
    const plan = modeleMetier.ecransDe(modeleP0);
    const conceptsIdentite = modeleP0.concepts
      .map((c) => c.id)
      .filter((id) => modeleMetier.estConceptIdentite(modeleP0, id));
    const surfacesModele = modeleMetier.surfacesDe(modeleP0);
    const ecransDIdentite = plan.ecrans
      .filter((e) =>
        (e.surfaces ?? []).some((sid) =>
          conceptsIdentite.includes(surfacesModele.find((sf) => sf.surfaceId === sid)?.concept),
        ),
      )
      .map((e) => modeleMetier.ecranAirDe(e.ecranId));
    return { modele: modeleP0, plan, ecransDIdentite };
  }

  /**
   * UNE TRANCHE D'EMISSION.
   *
   * `etat = null` : on demarre a P0. `etat` porte : on reprend ou la tranche
   * precedente s'est arretee. `budgetMs` : plus aucun NOUVEL appel payant une
   * fois le budget ecoule — un appel en vol se termine toujours, il n'est
   * jamais interrompu. C'est a l'appelant de dimensionner son budget sous
   * `maxDuration` moins le pire appel.
   *
   * Rend une union discriminee par `fini` :
   *   { fini: true,  resultat }                      — l'objet d'aujourd'hui
   *   { fini: false, etat, etape, raison: "budget_temps",
   *                  coutTrancheUsd, jetonsTranche }  — a reprendre
   *
   * Les ERREURS, elles, se propagent comme avant : la suspension n'existe
   * que pour le budget. Un refus de juge ou une panne restent des issues
   * que l'appelant traite — rien n'est avale.
   */
  async function poursuivreEmission({ brief, slug, etat = null, budgetMs = Infinity }) {
    const depart = Date.now();
    const budgetEpuise = () => Date.now() - depart >= budgetMs;

    const usage = [];
    const refusals = { count: 0 };
    // LES JETONS SE COMPTENT ICI : `callPart` les pousse dans `usage`, et
    // personne d'autre ne sait ce qui a ete reellement consomme.
    const jetons = () =>
      usage.reduce(
        (a, u) => {
          const n = adaptateur.lireUsage(u);
          return { entree: a.entree + (n.entree ?? 0), sortie: a.sortie + (n.sortie ?? 0) };
        },
        { entree: 0, sortie: 0 },
      );
    const intention = { text: brief, slug };

    // ── CE QUI EST REPRIS DE LA TRANCHE PRECEDENTE — et jamais re-paye.
    //
    // Le compteur de depense du coeur est PAR PROCESSUS : une tranche est un
    // processus neuf, le cumul voyage donc dans l'etat.
    const coutAnterieur = etat?.coutUsd ?? 0;
    let coutSondeTranche = 0;
    const jetonsAnterieurs = etat?.jetons ?? { entree: 0, sortie: 0 };
    const coutCumule = () =>
      Number((coutAnterieur + coutSondeTranche + coeur.lireEtatDepense().depense).toFixed(6));
    const jetonsCumules = () => {
      const j = jetons();
      return {
        entree: jetonsAnterieurs.entree + j.entree,
        sortie: jetonsAnterieurs.sortie + j.sortie,
      };
    };
    const tirages = [...(etat?.tirages ?? [])];
    let modeleP0 = etat?.modele ?? null;
    let acquis = { ...(etat?.acquis ?? {}) };
    let niveaux = etat?.niveaux ?? null;
    let premierePasse = etat?.premierePasse ?? null;
    // Le journal des TOURS de reparation — il voyage dans l'etat : le
    // plafond compte les tours ACHEVES, d'une tranche a l'autre.
    const tours = [...(etat?.tours ?? [])];
    let prescriptif = null;

    /** Les passes qu'il reste a emettre : celles dont une cle manque. */
    const restantes = (p) =>
      coeur.partsPour(p).filter((part) => !part.keys.every((k) => acquis[k] !== undefined));

    const suspendre = (phase) => ({
      fini: false,
      raison: "budget_temps",
      etape:
        phase === "emission" && prescriptif !== null
          ? (restantes(prescriptif)[0]?.name ?? "emission")
          : phase,
      etat: {
        phase,
        modele: modeleP0,
        acquis,
        tirages,
        niveaux,
        premierePasse,
        tours,
        coutUsd: coutCumule(),
        jetons: jetonsCumules(),
      },
      coutTrancheUsd: coeur.lireEtatDepense().depense,
      jetonsTranche: jetons(),
    });

    // ── LES NIVEAUX DE GRAMMAIRE : RE-APPLIQUES DEPUIS L'ETAT, OU SONDES.
    //
    // Le niveau acceptable est une propriete du SCHEMA, pas de la demande ni
    // de la tranche : re-sonder a chaque tranche paierait pour re-mesurer la
    // meme chose. L'etat le porte, et une reprise n'emet AUCUN appel de sonde.
    if (niveaux !== null) {
      niveauxSondes = niveaux;
      for (const n of niveaux) {
        if (n.niveau === null) continue;
        const part = coeur.PARTS.find((x) => x.name === n.passe);
        if (part !== undefined) part.levelIndex = n.niveau;
      }
    } else {
      if (budgetEpuise()) return suspendre("p0");
      const sonde = await sonderUneFois();
      niveaux = sonde.niveaux;
      // ── LE COUT DES SONDES ENTRE DANS LA COMPTABILITE (trou n°1 du
      // premier tir reel). Les sondes acceptees ont un usage ; il rejoint
      // les jetons de la tranche, et leur cout s'ajoute au cumul.
      if (sonde.fraiche) {
        for (const n of niveaux) {
          if (n.usage !== null && n.usage !== undefined) {
            usage.push(n.usage);
            coutSondeTranche += adaptateur.coutUsd(adaptateur.lireUsage(n.usage));
          }
        }
      }
    }

    // ── P0 : comprendre AVANT d'emettre — saute si l'etat porte deja le
    // modele : il a ete paye UNE fois, il ne se re-tire jamais.
    if (modeleP0 === null) {
      const requeteP0 = passe0.construireRequeteP0(brief);
      const { grammaire } = adaptateur.degraderGrammaire(requeteP0.grammaire);

      // ── LE RE-TIRAGE EST INFORME, PLUS AVEUGLE.
      //
      // MESURE DU 2026-10-08, deux tirages sur deux, meme demande :
      //   P2 · DERIVATION_IDENTITE_SANS_SOURCE
      //   P2 · DERIVATION_CONFIRMATION_SANS_ECRITURE
      //
      // EP-135 les classe `faute_de_production` — « le generateur doit poser
      // l'etape manquante, pas l'humain repondre a une question ». La boucle
      // re-tirait a l'identique : trois refus mesures a 0,8209 $, rien de
      // produit. Un modele a qui l'on ne dit pas ce qu'on lui reproche n'a
      // aucune raison de corriger. Le reproche voyage donc avec la demande —
      // les juges, eux, ne bougent pas.
      const reproche = (diags) =>
        diags.length === 0
          ? ""
          : `\n\nTON MODELE PRECEDENT A ETE REFUSE. Corrige EXACTEMENT ces points, ` +
            `sans rien retirer d'autre au brief :\n` +
            diags.map((x) => `- ${x.path} : ${x.message}`).join("\n") +
            `\n\nCes refus sont STRUCTURELS, jamais une question au client : un geste ` +
            `qui consulte une instance exige en amont, DANS LE MEME PARCOURS, une etape ` +
            `du MEME concept qui l'elit ; une confirmation exige une ecriture en amont. ` +
            `Ajoute les etapes manquantes plutot que de supprimer le parcours.`;
      let dernierReproche = "";

      for (let tentative = tirages.length + 1; ; tentative++) {
        // La suspension tombe ENTRE deux tirages, jamais pendant.
        if (budgetEpuise()) return suspendre("p0");
        const partP0 = {
          name: "p0",
          keys: ["modele"],
          levels: [{ name: "canonique-degradee-adaptateur", schema: grammaire }],
          levelIndex: 0,
        };
        const avant = coeur.lireEtatDepense().depense;
        const reponseP0 = await coeur.callPart(
          partP0,
          requeteP0.system,
          requeteP0.user + dernierReproche,
          `${slug}:p0#t${tentative}`,
          usage,
        );
        const neutreP0 = adaptateur.lireReponse(reponseP0);
        const verdictP0 = passe0.jugerSortieP0(neutreP0.texte, brief, { tronquee: neutreP0.tronquee });
        // ── LE GENERATEUR POSE L'ETAPE MANQUANTE AVANT DE JUGER (EP-135).
        //
        // `reparerPlan` est PURE et ne repare que ce que le juge NOMME, quand
        // la reparation est determinee par le modele lui-meme. Elle n'invente
        // aucun metier, et elle refuse de reparer ce qu'elle ne sait pas —
        // auquel cas le juge refuse, et c'est le bon comportement. LES JUGES
        // REPASSENT APRES, inchanges.
        let candidat = verdictP0.ok ? verdictP0.modele : undefined;
        let reparationsPlan = [];
        if (verdictP0.ok) {
          const r = modeleMetier.reparerPlan(verdictP0.modele);
          candidat = r.modele;
          reparationsPlan = r.reparations;
        }
        const diagnosticsPlan = verdictP0.ok
          ? (() => {
              const plan = modeleMetier.ecransDe(candidat);
              return [
                ...plan.diagnostics,
                ...modeleMetier.jugerPlanEcrans(plan, candidat),
                // ── VOLET ② : l'identite s'exige ICI, a 0,11 $ — pas au
                // document, a 2,94 $. Meme predicat que `jugerBase`
                // (`estConceptIdentite`), et le reproche informe porte le
                // message au tirage suivant sans toucher `passe0` (scelle).
                ...modeleMetier.jugerIdentiteDuModele(candidat),
              ];
            })()
          : [];
        const arret = !verdictP0.ok ? "P1" : diagnosticsPlan.length > 0 ? "P2" : "passe";
        dernierReproche = reproche(verdictP0.ok ? diagnosticsPlan : verdictP0.diagnostics);
        tirages.push({
          tentative,
          arret,
          coutUsd: Number((coeur.lireEtatDepense().depense - avant).toFixed(4)),
          diagnostics: (verdictP0.ok ? diagnosticsPlan : verdictP0.diagnostics).map((x) => x.code),
          // CE QUE LE GENERATEUR A CORRIGE LUI-MEME, dit et non tu.
          reparations: reparationsPlan.map((r) => r.action),
        });
        if (arret === "passe") {
          modeleP0 = candidat;
          break;
        }
        if (tentative >= (process.env.P0_TENTATIVES ? Number(process.env.P0_TENTATIVES) : 3)) {
          return {
            fini: true,
            resultat: {
              ok: false,
              raison: `P0 refuse ${String(tentative)} fois`,
              tirages,
              coutUsd: coutCumule(),
              jetons: jetonsCumules(),
              diagnostics: [],
              niveaux,
            },
          };
        }
      }
    }

    prescriptif = prescriptifDe(modeleP0);

    // ── LE BUDGET MORD ENTRE DEUX APPELS, PAR LA COUTURE EXISTANTE.
    //
    // `callPart` est une DEPENDANCE injectable de l'orchestration — la meme
    // couture que la reprise. L'enveloppe leve une sentinelle AVANT l'appel
    // si le budget est ecoule ; `emitSectionsAvecPartiel` fait alors ce pour
    // quoi D-103 existe : il attache l'assemblage partiel a l'erreur. Rien
    // dans le bloc scelle ne change — les empreintes le prouvent.
    const callPartBudgete = async (...args) => {
      if (budgetEpuise()) {
        const e = new Error("BUDGET_TEMPS — plus aucun nouvel appel dans cette tranche");
        e.budgetTemps = true;
        throw e;
      }
      return coeur.callPart(...args);
    };
    const orchestrationBudgetee = creerOrchestration({
      adaptateur, modeleMetier, presentation, preservation, acceptation,
      obligationsPourPasse, repairScope,
      PARTS: coeur.PARTS, partsPour: restantes, SYSTEM_EMIT: coeur.SYSTEM_EMIT,
      callPart: callPartBudgete, extractJson: coeur.extractJson,
    });

    // ── LES PASSES, ET ON NE REPAIE JAMAIS CE QUI EST DEJA PAYE.
    //
    // MESURE DU 2026-10-08 : un tir reel a emis SEIZE sections puis est mort
    // sur « Connection error », 2,6387 $ deja payes. La reprise par `acquis`
    // existe pour ca ; la continuation lui donne un second support — l'etat
    // d'une tranche a l'autre, en plus de la memoire d'un meme processus.
    //
    // DEUX REPRISES AU PLUS, et seulement sur une erreur TRANSITOIRE. Un
    // refus de grammaire ou un budget epuise ne se reprennent pas ici : le
    // premier se reproduirait a l'identique, le second est une SUSPENSION.
    const estTransitoire = (e) =>
      /Connection error|timed out|ECONNRESET|socket hang up|5\d\d/i.test(String(e?.message ?? e));

    let document;
    for (let reprise = 0; ; reprise++) {
      try {
        const obtenu = await orchestrationBudgetee.emitSectionsAvecPartiel(
          coeur.SYSTEM_EMIT,
          orchestration.contexteClient(intention),
          slug,
          usage,
          refusals,
          prescriptif,
        );
        document = { ...acquis, ...obtenu };
        break;
      } catch (e) {
        const partiel = e?.assemblagePartiel ?? e?.partiel;
        if (partiel !== undefined) acquis = { ...acquis, ...partiel };
        if (e?.budgetTemps === true) return suspendre("emission");
        const sections = Object.keys(acquis).length;
        if (reprise >= 2 || !estTransitoire(e) || sections === 0) {
          e.sectionsAcquises = sections;
          throw e;
        }
        console.log(
          `  [${slug}] reprise ${String(reprise + 1)}/2 apres « ${String(e?.message ?? e).slice(0, 60)} » — ` +
            `${String(sections)} section(s) deja payee(s) conservee(s)`,
        );
      }
    }
    acquis = document;

    let { air, diagnostics } = validateLocal(document, prescriptif);
    diagnostics = [...diagnostics, ...jugerAcceptation(air, prescriptif, intention)];
    if (premierePasse === null) premierePasse = diagnostics.length;

    // ══ LA BOUCLE DE CONVERGENCE — volet ① (2026-10-09). ══
    //
    // La campagne fait UN tour automatique puis des tours MANUELS
    // (`--reparer`) ; le produit n'a personne entre les tours. La boucle les
    // enchaine, bornee et surveillee :
    //   · 0 diagnostic                      → livree ;
    //   · gate : introduits sans revelation → rejet, base conservee, refusee ;
    //   · amputation (resultat.ampute)      → base conservee, refusee NOMMANT
    //     les identifiants — le tour a coute, il est consigne, jamais tu ;
    //   · revelation (perimetre elargi)     → retenue MEME si le compte
    //     monte : les diagnostics sont reveles, la base change ;
    //   · tour retenu sans reduction STRICTE→ stagnation, refusee qui le dit ;
    //   · plafond : 3 tours acheves.
    //
    // Le budget-temps decoupe la boucle en tranches GRATUITEMENT : une
    // suspension en plein tour replie le partiel (CLE_REPARATION), l'etat
    // porte `tours`, la reprise revalide (gratuit) et continue.
    const PLAFOND_TOURS = 3;
    let raisonRefus = null;
    while ((air === null || diagnostics.length > 0) && raisonRefus === null) {
      if (tours.length >= PLAFOND_TOURS) {
        raisonRefus = `non convergé en ${String(PLAFOND_TOURS)} tours : reste ${String(diagnostics.length)} diagnostic(s)`;
        break;
      }
      const baseDoc = document;
      const baseAir = air;
      const baseDiags = diagnostics;
      const coutAvantTour = coutCumule();
      let resultat;
      try {
        resultat = await orchestrationBudgetee.repairSectionsAvecPartiel(
          document,
          baseDiags,
          orchestration.contexteClient(intention),
          slug,
          usage,
          refusals,
          prescriptif,
        );
      } catch (e) {
        const partiel = e?.assemblagePartiel ?? e?.partiel;
        const partielDoc = partiel?.document ?? partiel;
        if (partielDoc !== undefined) acquis = { ...document, ...partielDoc };
        if (e?.budgetTemps === true) return suspendre("reparation");
        e.sectionsAcquises = Object.keys(acquis).length;
        throw e;
      }
      // L'enveloppe de la reparation : `document` est deja le choix SUR —
      // l'original si amputation, le repare sinon (D-093).
      const candidat = resultat.document ?? resultat;
      const ampute = resultat.ampute ?? [];
      ({ air, diagnostics } = validateLocal(candidat, prescriptif));
      diagnostics = [...diagnostics, ...jugerAcceptation(air, prescriptif, intention)];
      const verdict = gateReparation.verdict({
        diagnosticsAvant: baseDiags.map((x) => ({ code: x.code, path: x.path })),
        diagnosticsApres: diagnostics,
        documentAvant: baseDoc,
        airApres: air,
        prescriptif,
      });
      const tour = {
        n: tours.length + 1,
        avant: baseDiags.length,
        apres: diagnostics.length,
        coutUsd: Number((coutCumule() - coutAvantTour).toFixed(4)),
        revelation: verdict.revelation,
        introduits: verdict.revelation ? 0 : verdict.introduits.length,
        reveles: verdict.revelation ? verdict.introduits.length : 0,
        ampute,
      };
      tours.push(tour);
      if (ampute.length > 0) {
        // Le candidat EST la base (enveloppe D-093) : rien a restaurer, mais
        // l'etat de jugement doit redevenir celui de la base.
        document = baseDoc;
        air = baseAir;
        diagnostics = baseDiags;
        tour.rejet = "amputation";
        raisonRefus =
          `réparation rejetée au tour ${String(tour.n)} — amputation hors périmètre : ` +
          ampute.slice(0, 6).join(", ");
        break;
      }
      if (verdict.rejetee) {
        document = baseDoc;
        air = baseAir;
        diagnostics = baseDiags;
        tour.rejet = "oscillation";
        raisonRefus =
          `réparation oscillante au tour ${String(tour.n)} : ` +
          `${String(verdict.introduits.length)} diagnostic(s) introduit(s) ` +
          `(${[...new Set(verdict.introduits.map((x) => x.code))].slice(0, 5).join(", ")})`;
        break;
      }
      document = candidat;
      if (verdict.revelation) continue; // nouvelle base : le compte peut monter
      if (diagnostics.length >= baseDiags.length) {
        tour.rejet = "stagnation";
        raisonRefus =
          `stagnation au tour ${String(tour.n)} : ${String(baseDiags.length)} → ` +
          `${String(diagnostics.length)} diagnostic(s)`;
        break;
      }
    }

    return {
      fini: true,
      resultat: {
        ok: air !== null && diagnostics.length === 0,
        ...(raisonRefus === null ? {} : { raison: raisonRefus }),
        document: air ?? document,
        modele: prescriptif.modele,
        diagnostics: diagnostics.map((d) => ({ code: d.code, path: d.path })),
        premierePasse,
        tirages,
        tours,
        refus: refusals.count,
        coutUsd: coutCumule(),
        jetons: jetonsCumules(),
        // CE QUE LA SONDE A RETENU, dit et non tu : un niveau degrade est
        // une garantie perdue, et personne ne doit l'apprendre par surprise.
        niveaux,
      },
    };
  }

  /**
   * L'EMISSION D'UN TRAIT — l'entree d'aujourd'hui, comportement inchange.
   * En interne : la continuation avec budget infini, qui ne peut donc jamais
   * suspendre. Un seul pipeline, deux entrees : pas deux copies a faire
   * diverger.
   */
  async function emettreApplication({ brief, slug }) {
    const r = await poursuivreEmission({ brief, slug });
    return r.resultat;
  }

  return { emettreApplication, poursuivreEmission, coeur, orchestration, passe0, adaptateur, modeleMetier, acceptation, airSchema, presentation };
}
