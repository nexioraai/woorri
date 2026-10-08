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
export async function creerMoteur({ cleApi, plafondUsd = Infinity }) {
  if (typeof cleApi !== "string" || cleApi.trim() === "") {
    throw new Error("MOTEUR_CLE_ABSENTE");
  }

  const airSchema = await import(join(REPO, "packages/air-schema/src/index.ts"));
  const registry = await import(join(REPO, "packages/capability-registry/src/index.ts"));
  const blocksRegistry = await import(join(REPO, "packages/blocks/src/registry.ts"));
  const presentation = await import(join(REPO, "packages/execution-contract/src/presentation.ts"));
  const { ROLES_ICONES } = await import(join(REPO, "packages/primitives/src/roles-icones.ts"));
  const { obligationsPourPasse } = await import(join(HERE, "obligations-passes.mjs"));
  const passe0 = await import(join(HERE, "passe0.mjs"));
  const modeleMetier = await import(join(HERE, "modele-metier.mjs"));
  const budgetUsd = await import(join(REPO, "packages/repair/src/budget-usd.ts"));
  const preservation = await import(join(REPO, "packages/repair/src/preservation.ts"));
  const executionContract = await import(join(REPO, "packages/execution-contract/src/envelope.ts"));
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
  const client = await adaptateur.creerClient(() => `ANTHROPIC_API_KEY=${cleApi}`, {
    timeout: 20 * 60 * 1000,
    maxRetries: 2,
  });
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
    obligationsPourPasse,
    PARTS: coeur.PARTS, partsPour: coeur.partsPour, SYSTEM_EMIT: coeur.SYSTEM_EMIT,
    callPart: coeur.callPart, extractJson: coeur.extractJson,
  });

  const { validateLocal, jugerAcceptation } = acceptation;

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
  async function emettreApplication({ brief, slug }) {
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
    const tirages = [];

    // ── P0 : comprendre AVANT d'emettre. Un modele refuse arrete l'intention
    // a ~0,2 $ au lieu de payer huit passes.
    let prescriptif;
    const requeteP0 = passe0.construireRequeteP0(brief);
    const { grammaire } = adaptateur.degraderGrammaire(requeteP0.grammaire);

    // ── LE RE-TIRAGE EST INFORME, PLUS AVEUGLE.
    //
    // MESURE DU 2026-10-08, deux tirages sur deux, meme demande :
    //   P2 · DERIVATION_IDENTITE_SANS_SOURCE
    //   P2 · DERIVATION_CONFIRMATION_SANS_ECRITURE
    //
    // Ce n'est pas de la variance, c'est systematique. Et les deux juges
    // disent EXACTEMENT ce qui manque : une etape qui elit l'instance avant
    // de la consulter, une ecriture avant la confirmation qui l'observe.
    // EP-135 les classe `faute_de_production` — « le generateur doit poser
    // l'etape manquante, pas l'humain repondre a une question ».
    //
    // Or personne ne la posait. La boucle re-tirait a l'identique, en
    // esperant un tirage plus chanceux : trois refus mesures a 0,8209 $, et
    // rien de produit. Un modele a qui l'on ne dit pas ce qu'on lui reproche
    // n'a aucune raison de corriger.
    //
    // Le reproche voyage donc avec la demande. C'est le MEME motif que
    // `repairSections`, qui existe depuis toujours pour les sections AIR :
    // on ne reemet pas au hasard, on reemet CE QUI A ETE REFUSE, en disant
    // pourquoi. Rien n'est assoupli — les juges sont les memes a chaque
    // tentative, seul le tirage est renseigne.
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

    for (let tentative = 1; ; tentative++) {
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
      const diagnosticsPlan = verdictP0.ok
        ? (() => {
            const plan = modeleMetier.ecransDe(verdictP0.modele);
            return [...plan.diagnostics, ...modeleMetier.jugerPlanEcrans(plan, verdictP0.modele)];
          })()
        : [];
      const arret = !verdictP0.ok ? "P1" : diagnosticsPlan.length > 0 ? "P2" : "passe";
      // Le reproche du PROCHAIN tirage : les diagnostics de celui-ci,
      // nommes avec leur chemin. Les juges, eux, ne bougent pas.
      dernierReproche = reproche(verdictP0.ok ? diagnosticsPlan : verdictP0.diagnostics);
      tirages.push({
        tentative,
        arret,
        coutUsd: Number((coeur.lireEtatDepense().depense - avant).toFixed(4)),
        diagnostics: (verdictP0.ok ? diagnosticsPlan : verdictP0.diagnostics).map((x) => x.code),
      });
      if (arret === "passe") {
        const plan = modeleMetier.ecransDe(verdictP0.modele);
        // EP-190 ② — le prescriptif porte les ECRANS D'IDENTITE. Derive,
        // jamais recopie : `estConceptIdentite` decide, `ecranAirDe` traduit.
        const conceptsIdentite = verdictP0.modele.concepts
          .map((c) => c.id)
          .filter((id) => modeleMetier.estConceptIdentite(verdictP0.modele, id));
        const surfacesModele = modeleMetier.surfacesDe(verdictP0.modele);
        const ecransDIdentite = plan.ecrans
          .filter((e) =>
            (e.surfaces ?? []).some((sid) =>
              conceptsIdentite.includes(surfacesModele.find((sf) => sf.surfaceId === sid)?.concept),
            ),
          )
          .map((e) => modeleMetier.ecranAirDe(e.ecranId));
        prescriptif = { modele: verdictP0.modele, plan, ecransDIdentite };
        break;
      }
      if (tentative >= (process.env.P0_TENTATIVES ? Number(process.env.P0_TENTATIVES) : 3)) {
        return {
          ok: false,
          raison: `P0 refuse ${String(tentative)} fois`,
          tirages,
          coutUsd: coeur.lireEtatDepense().depense,
          jetons: jetons(),
          diagnostics: [],
        };
      }
    }

    // ── LES HUIT PASSES.
    let document = await orchestration.emitSectionsAvecPartiel(
      coeur.SYSTEM_EMIT,
      orchestration.contexteClient(intention),
      slug,
      usage,
      refusals,
      prescriptif,
    );

    let { air, diagnostics } = validateLocal(document, prescriptif);
    diagnostics = [...diagnostics, ...jugerAcceptation(air, prescriptif, intention)];
    const premierePasse = diagnostics.length;

    // ── UNE REPARATION, comme la campagne : on ne reemet que les sections
    // que les diagnostics designent.
    if (air === null || diagnostics.length > 0) {
      const resultat = await orchestration.repairSectionsAvecPartiel(
        document,
        diagnostics,
        orchestration.contexteClient(intention),
        slug,
        usage,
        refusals,
        prescriptif,
      );
      document = resultat;
      ({ air, diagnostics } = validateLocal(document, prescriptif));
      diagnostics = [...diagnostics, ...jugerAcceptation(air, prescriptif, intention)];
    }

    return {
      ok: air !== null && diagnostics.length === 0,
      document: air ?? document,
      modele: prescriptif.modele,
      diagnostics: diagnostics.map((d) => ({ code: d.code, path: d.path })),
      premierePasse,
      tirages,
      refus: refusals.count,
      coutUsd: coeur.lireEtatDepense().depense,
      jetons: jetons(),
    };
  }

  return { emettreApplication, coeur, orchestration, passe0, adaptateur, modeleMetier, acceptation, airSchema, presentation };
}
