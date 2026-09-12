// CONTRAT DU MODÈLE MÉTIER v1 (confrontation #9, F1/F4/F5/F7 — 2026-09-11).
//
// LE seul artefact que P0 produit et que TOUTES les dérivations consomment.
// Le texte libre meurt à P0 : aucune fonction de ce module n'accepte de
// brief — uniquement le modèle (cliquet suppression-texte.test).
//
// F1 — la COUVERTURE appartient au contrat (couverts traçables vers des
// nœuds, nonRetenus à raisons FERMÉES, « ambigu » BLOQUANT) et P1 valide
// forme + références + SUFFISANCE — déterministe, jamais un jugement.
// F4 — `visuel` N'EST PAS un champ : il se DÉRIVE d'un attribut média
// requis (le schéma strict REFUSE la clé `visuel`).
// F5 — la maille GRILLE se décide par (visuel ∧ accès catalogue) — le
// producteur n'est PAS un discriminant (un acteur consulte en grille ce
// qu'il produit : mes annonces, mes véhicules, ses publications).
// F7 — l'état VIDE est obligatoire si la collection naît vide OU peut le
// devenir (étape mutante réductrice `retirer`) — dérivé du modèle.
// AMENDEMENT (forme normale « décisions, pas conclusions ») : `producteur`
// et `strategieInitiale` ne sont PLUS déclarés — ils se DÉRIVENT des
// parcours (une création in-app est une étape `saisir` ; son acteur est le
// producteur ; sans elle, le concept est amorcé).
import { z } from "zod";

const ID = /^[a-z][a-z0-9_]*$/;
const id = z.string().regex(ID);

/** F1 — raisons FERMÉES de non-rétention. `ambigu` est BLOQUANT (P1). */
export const RAISONS_NON_RETENUE = [
  "hors_perimetre_mobile",
  "expression_visuelle",
  "doublon",
  "capacite_hors_enveloppe",
  "infrastructure_technique",
  "ambigu",
];

// « intervalle » entre par l'amendement 2.1 d'EP-030 (ratifié) ; « duree »
// entre par la D6 d'O-1 (EP-035) : la série de tirages a DÉMONTRÉ que le
// mot seul était ambigu (le même prompt a produit les deux lectures). Le
// GLOSSAIRE tranche — et l'alternative existe désormais dans le vocabulaire.
export const NATURES_ATTRIBUT = ["texte", "nombre", "media", "date", "intervalle", "duree", "booleen", "reference"];

/** D6 O-1 — le GLOSSAIRE des natures TEMPORELLES, interpolé dans le prompt
 * P0 : la définition vit ICI, une fois. */
export const GLOSSAIRE_NATURES_TEMPORELLES = {
  date: "un POINT dans le temps (jour, éventuellement heure)",
  intervalle: "une PLAGE SITUÉE dans le temps — un début ET une fin (ce qui borne une ressource réservable)",
  duree: "une LONGUEUR de temps SANS position (90 minutes) — jamais ce qui situe une ressource",
};

/**
 * TABLE DES GESTES — patrons structurels FERMÉS, dérivés de l'enveloppe
 * (confrontations #4/#6/#8). `retirer` entre par F7 : l'enveloppe exécute
 * `mutation delete`, une étape peut donc RÉDUIRE une collection.
 */
// EP-081 — TRANSITION EXOGÈNE : l'état peut changer SANS acte d'utilisateur
// (le hold-out l'a prouvé inexprimable : un système qui agit seul se faisait
// domestiquer en gestes). La nature est NOMMÉE — un booléen « systeme »
// réintroduirait ce qu'O-2 interdit : une transition dont personne ne répond.
// Les gestes restent des actes UTILISATEUR ; l'exogène est une propriété de
// la TRANSITION, jamais un 10e geste.
export const NATURES_EXOGENES = ["temps", "evenement_externe", "condition_donnees"];

// EP-134 · COLONNE `capacite` — LA CAPACITÉ EST UNE PROPRIÉTÉ DU GESTE.
//
// AVANT : `capacitesDe` dérivait par des `if (gestesPresents.has(...))` écrits
// à la main. C'était EXACTEMENT le chemin par lequel un geste à capacité peut
// entrer sans que sa capacité suive — la faute que le cliquet EP-068 a déjà
// fermée pour les listes de gestes, restée ouverte ici. Un onzième geste s'y
// serait glissé silencieusement. La colonne ferme ce chemin : la dérivation
// LIT la table, et un test recalcule.
//
// TROIS FORMES, et pas une quatrième : `null` (aucune capacité), un
// identifiant (capacité fixe), `{ selonCommerce }` (la variante dépend du
// discriminant — `payer` est le seul cas, et le diagnostic d'absence reste).
export const TABLE_GESTES = {
  decouvrir:            { bloc: "list",         declencheur: null, effet: null,         transport: null,      terminal: false, capacite: null, role: "decouverte", cardinalite: "collection", preuve: "section rendue, données présentes" },
  chercher:             { bloc: "search_entry", declencheur: "ui", effet: "navigate",   transport: null,      terminal: false, capacite: null, role: "recherche", cardinalite: "collection", preuve: "paire structurelle complète" },
  consulter:            { bloc: "list",         declencheur: "ui", effet: "navigate",   transport: "itemId",  terminal: true,  capacite: null, role: "detail", cardinalite: "instance", preuve: "détail de l'instance identifiée" },
  choisir:              { bloc: "list",         declencheur: "ui", effet: "navigate",   transport: "itemId",  terminal: false, capacite: null, role: "choix", cardinalite: "collection", preuve: "identité élue consommée en aval" },
  saisir:               { bloc: "form",         declencheur: "ui", effet: "mutation",   transport: "instance",terminal: false, capacite: null, role: "saisie", cardinalite: "instance", preuve: "écriture réelle (règle 13)" },
  confirmer:            { bloc: null,           declencheur: null, effet: "mutation",   transport: null,      terminal: true,  capacite: null, role: "confirmation", cardinalite: "singleton", preuve: "écran de confirmation atteint (thenScreenId)" },
  consulter_historique: { bloc: "list",         declencheur: "ui", effet: "navigate",   transport: null,      terminal: true,  capacite: null, role: "historique", cardinalite: "collection", preuve: "collection filtrée sur l'état nommé" },
  s_identifier:         { bloc: "form",         declencheur: "ui", effet: "capability", transport: null,      terminal: false, capacite: "auth", role: "identite", cardinalite: "singleton", preuve: "méthode auth exécutée (enveloppe véridique R1)" },
  payer:                { bloc: "form",         declencheur: "ui", effet: "mutation",   transport: null,      terminal: false, capacite: { selonCommerce: { digital: "payments.iap", physique_ou_hors_app: "payments.psp" } }, role: "paiement", cardinalite: "collection", preuve: "capacité déclarée, honnêteté règle 17" },
  retirer:              { bloc: "list",         declencheur: "ui", effet: "mutation",   transport: "itemId",  terminal: false, capacite: null, role: "retrait", cardinalite: "collection", preuve: "collection réduite, état vide atteignable" },
  // EP-134 — LA PRISE DE CONTACT. Le geste se nomme par sa TRANSFORMATION :
  // l'échange QUITTE l'application. Aucun canal dans ce nom — « appeler »,
  // « écrire », « messagerie » seraient des outils, et un geste qui nomme un
  // outil est un template déguisé (EP-005). Le canal vit dans la capacité,
  // qui est le seul étage où il a le droit d'être nommé.
  //
  // `transport: "itemId"` n'est pas décoratif : c'est LUI qui fait que
  // `consommateursDIdentite()` compte ce geste — donc que le juge d'identité
  // perdue (EP-118/EP-122) le couvre SANS une règle de plus. Contacter le
  // vendeur d'une fiche transporte l'identité de CE vendeur, ou est refusé.
  //
  // `terminal: true` : la preuve est observable et c'est une FIN de parcours —
  // l'utilisateur sort de l'application. Un parcours peut donc s'y achever,
  // ce qu'un modèle `physique_ou_hors_app` exige : sans paiement en ligne,
  // aucun autre geste terminal ne conclut la vente.
  contacter:            { bloc: null,           declencheur: "ui", effet: "capability", transport: "itemId",  terminal: true,  capacite: "external_contact", role: "contact", cardinalite: "instance", preuve: "canal ouvert vers l'instance identifiée (enveloppe véridique)" },
};

// EP-134 — `GESTES` EST DÉRIVÉ, IL N'EST PLUS ÉCRIT.
//
// LE CHEMIN QUI RESTAIT OUVERT, trouvé en appliquant la règle d'EP-132 :
// `GESTES` et `TABLE_GESTES` étaient DEUX listes indépendantes, déclarées à
// six cents lignes d'écart. Ajouter un geste à la table sans l'ajouter ici ne
// déclenchait RIEN — le geste existait pour les dérivations et n'existait pas
// pour le schéma. Mesuré en direct pendant cette passe : `contacter` ajouté à
// la table n'apparaissait nulle part, en silence.
//
// C'est la quatrième occurrence du motif « une liste écrite deux fois
// diverge » (prompt v3-v4, J3/EP-059, retirer-source/EP-067). Le cliquet
// EP-068 refusait déjà toute NOUVELLE liste de gestes à la main ; il ne
// pouvait rien contre celle qui était là avant lui. Une dérivation le peut.
export const GESTES = Object.keys(TABLE_GESTES);

// `.strict()` PARTOUT : toute clé hors contrat est un REFUS — c'est le
// verrou F4 (un `visuel` déclaré ne passe pas) et l'anti-fourre-tout.
export const modeleMetierSchema = z
  .object({
    version: z.literal("modele-metier/1.2.0"),
    /**
     * D6 EP-029 (payer) — LE FAIT que la variante de paiement exige : ce
     * qui est vendu est-il consommé DANS l'app (digital) ou hors d'elle
     * (physique/service) ? C'est un fait du BRIEF, décidé par P0 —
     * REQUIS si un parcours paie, INTERDIT sinon (aucun fait sans
     * consommateur) : deux invariants dédiés.
     */
    commerce: z.enum(["digital", "physique_ou_hors_app"]).optional(),
    couverture: z
      .object({
        couverts: z.array(
          z.object({ terme: z.string().min(1), noeuds: z.array(id).min(1) }).strict(),
        ),
        nonRetenus: z.array(
          z
            .object({
              terme: z.string().min(1),
              raison: z.enum(RAISONS_NON_RETENUE),
            })
            .strict(),
        ),
      })
      .strict(),
    acteurs: z.array(z.object({ id, nom: z.string().min(1) }).strict()).min(1),
    concepts: z.array(
      z
        .object({
          id,
          nom: z.string().min(1),
          donnees: z.boolean(),
          /** R2 — l'attribut qui IDENTIFIE une instance (optionnel, additif). */
          identifiant: id.optional(),
          attributs: z
            .array(
              z
                .object({
                  id,
                  nature: z.enum(NATURES_ATTRIBUT),
                  requis: z.boolean(),
                  cardinalite: z.number().int().min(1).optional(),
                  /** R2 — l'acteur qui PRODUIT la valeur (optionnel, additif). */
                  producteur: id.optional(),
                })
                .strict(),
            )
            .optional(),
          /**
           * R2 — ÉTATS MÉTIER STRUCTURÉS : un état porte ses TRANSITIONS
           * (vers quel état, par quel geste). Les invariants E (#6) deviennent
           * vérifiables : atteignable, sortie des non-finaux, déclencheur
           * cohérent, transition représentée par un parcours.
           */
          etats: z
            .array(
              z
                .object({
                  id: z.string().min(1),
                  transitions: z
                    .array(
                      z.union([
                        z.object({ vers: z.string().min(1), geste: z.enum(GESTES) }).strict(),
                        // EP-081 — exogène : nature fermée, pas de geste.
                        z.object({ vers: z.string().min(1), exogene: z.enum(NATURES_EXOGENES) }).strict(),
                      ]),
                    )
                    .optional(),
                })
                .strict(),
            )
            .optional(),
        })
        .strict(),
    ),
    relations: z.array(
      z.object({ de: id, vers: id, nature: z.enum(["possede", "reference"]) }).strict(),
    ),
    parcours: z.array(
      z
        .object({
          id,
          besoin: z.string().min(1),
          acteur: id,
          /** R2 — priorité EXPLICITE (additive ; l'ordre du tableau fait foi sinon). */
          priorite: z.number().int().min(0).optional(),
          etapes: z
            .array(
              z
                .object({
                  concept: id,
                  geste: z.enum(GESTES),
                  etat: z.string().optional(),
                  /** R2 — acteur de l'étape s'il diffère de celui du parcours. */
                  acteur: id.optional(),
                  /** R2 — préconditions STRUCTURELLES (référencées, validées). */
                  preconditions: z
                    .array(z.object({ concept: id, etat: z.string().min(1) }).strict())
                    .optional(),
                })
                .strict(),
            )
            .min(2),
        })
        .strict(),
    ),
  })
  .strict();

// ────────────── EP-135 — LA CLASSE VIT AVEC LE DIAGNOSTIC ──
//
// OBJET : partitionner les diagnostics en DEUX classes, pour qu'un refus
// sache s'il doit être RE-TIRÉ (le brief disait assez, la machine a mal
// travaillé) ou DEMANDÉ (la machine ne pouvait pas savoir). Cette passe pose
// la classification ; elle ne l'exerce pas — aucun dialogue, aucune question.
//
// LE CRITÈRE, ET LUI SEUL : si le moteur posait la question correspondante à
// un humain, celui-ci pourrait-il y répondre SANS connaître le fonctionnement
// interne du moteur ? Oui ⇒ intention manquante. Non ⇒ faute de production.
// Ni la gravité, ni la fréquence n'entrent en ligne de compte.
//
// ASYMÉTRIE DE PRUDENCE, appliquée aux cas douteux : un diagnostic mal classé
// en « intention manquante » ferait porter à un humain une erreur de machine —
// c'est le pire résultat possible. Mal classé en « faute de production », il ne
// produit que le comportement ACTUEL (re-tirage), dont le coût pour l'humain
// est nul. Tout doute est donc tranché vers `faute_de_production`, et DIT.
//
// LA CLASSE VIT ICI, AVEC LE DIAGNOSTIC — pas dans une table parallèle. La
// leçon d'EP-134 a coûté quatre tables qui ne se parlaient pas ; celle-ci
// n'aura pas de jumelle. Et le cliquet n'est PAS un test : `d()` REFUSE un
// code inconnu de cette table. Un diagnostic sans classe ne peut pas être
// émis — il n'existe pas.
export const CLASSES_DIAGNOSTIC = ["faute_de_production", "intention_manquante"];

const FP = "faute_de_production";
const IM = "intention_manquante";

export const DIAGNOSTICS = {
  // ── LES 19 DIAGNOSTICS DE MODÈLE ──
  MODELE_SCHEMA: { classe: FP, pourquoi: "le document ne respecte pas sa propre forme : aucune question adressée à un humain n'aurait de sens" },
  MODELE_REFERENCE_INCONNUE: { classe: FP, pourquoi: "un identifiant interne pointe dans le vide — l'humain n'a jamais vu ces identifiants" },
  MODELE_ETAT_INCONNU: { classe: FP, pourquoi: "un état référencé n'existe pas dans le concept : incohérence interne, invisible depuis le brief" },
  MODELE_IDENTIFIANT_INCONNU: { classe: FP, pourquoi: "l'identifiant d'un concept désigne un attribut inexistant — même nature que la référence morte" },
  MODELE_TRANSITION_INCONNUE: { classe: FP, pourquoi: "une transition vise un état qui n'existe pas : le graphe est faux, pas l'intention" },
  MODELE_ETAT_SUR_GESTE_MUTANT: { classe: FP, pourquoi: "savoir OÙ se déclare un état-cible est une règle de forme du moteur ; y répondre exigerait de le connaître" },
  MODELE_TRANSITION_DECLENCHEE_PAR_LECTURE: { classe: FP, pourquoi: "distinguer les gestes qui mutent de ceux qui lisent est une connaissance interne" },
  MODELE_TRANSITION_NON_REPRESENTEE: { classe: FP, pourquoi: "exiger qu'une transition ait son étape est une règle du moteur, que l'humain n'a pas à connaître" },
  MODELE_ETAT_INATTEIGNABLE: { classe: FP, pourquoi: "cohérence du graphe d'états : ni cible ni consommé se constate sur le modèle, jamais sur le besoin" },
  MODELE_ETAT_NON_OBSERVABLE: { classe: FP, pourquoi: "répondre exigerait de savoir ce qu'est une surface — vocabulaire du moteur" },
  MODELE_PARCOURS_SANS_PREUVE: { classe: FP, pourquoi: "répondre exigerait de savoir ce qu'est un geste terminal — vocabulaire du moteur" },
  MODELE_TERME_NON_JUSTIFIE: { classe: FP, pourquoi: "le terme VIENT du brief : ne pas l'avoir traité est un manquement du générateur à sa redevabilité, pas une lacune de l'humain" },

  // ── LES QUATRE DOUTEUX, tranchés par prudence et DITS ──
  MODELE_COUVERTURE_VIDE: { classe: FP, discutable: true, pourquoi: "DOUTEUX — un brief très pauvre pourrait le causer ; mais le brief EXISTE et le modèle ne s'y rapporte à rien : c'est d'abord un défaut de redevabilité du générateur" },
  MODELE_SANS_PARCOURS: { classe: FP, discutable: true, pourquoi: "DOUTEUX — « que doit-on pouvoir faire ? » est parfaitement répondable ; mais si le brief le disait déjà, poser la question ferait porter une erreur de machine. Le re-tirage est sans coût, la question ne l'est pas" },
  MODELE_ACTEUR_MUET: { classe: FP, discutable: true, pourquoi: "DOUTEUX — « que fait cet acteur ? » est répondable ; mais l'acteur a été déclaré par le générateur, qui devait aussi le faire agir" },
  MODELE_CONCEPT_MORT: { classe: FP, discutable: true, pourquoi: "DOUTEUX — même nature que l'acteur muet : le concept vient du générateur, qui devait le faire traverser" },
  MODELE_COMMERCE_SANS_OBJET: { classe: FP, discutable: true, pourquoi: "DOUTEUX — pourrait révéler un paiement voulu mais non modélisé ; la correction évidente reste de retirer un fait sans consommateur" },

  // ── LES DEUX SEULS CERTAINS : le moteur ne POUVAIT PAS savoir ──
  MODELE_TERME_AMBIGU: { classe: IM, pourquoi: "le moteur dit LUI-MÊME qu'il ne sait pas trancher un terme du brief ; seul celui qui l'a écrit peut le lever — c'est le cas fondateur d'EP-089" },
  MODELE_COMMERCE_ABSENT: { classe: IM, pourquoi: "la variante du paiement se demande en mots ordinaires, sans rien savoir du moteur, et la réponse a une destination structurelle : le fait `commerce`" },

  // ── DIAGNOSTICS DE DÉRIVATION ET DE PLAN ──
  // Ils sont calculés APRÈS le modèle, SUR un modèle déjà valide : ils
  // constatent une incohérence que le générateur a produite, jamais un manque
  // du brief. Aucun humain n'a de prise sur eux — tous `faute_de_production`,
  // et c'est le classement, pas un défaut de classement.
  DERIVATION_IDENTITE_SANS_SOURCE: { classe: FP, pourquoi: "un geste consomme une identité que rien n'a élue : chaînage produit par le générateur" },
  DERIVATION_IDENTITE_NON_CONSOMMEE: { classe: FP, pourquoi: "une identité est élue puis abandonnée : même nature, sens inverse" },
  DERIVATION_CONFIRMATION_SANS_ECRITURE: { classe: FP, pourquoi: "une confirmation sans écriture amont est une incohérence de parcours produite" },
  DERIVATION_ETAPE_SANS_ECRAN: { classe: FP, pourquoi: "une étape sans surface est un défaut de dérivation interne" },
  DERIVATION_TRAVERSEE_ACTEUR: { classe: FP, pourquoi: "un parcours qui change d'acteur en cours de route est une incohérence produite" },
  DISCRIMINANT_ABSENT: { classe: FP, pourquoi: "le fait discriminant manque au modèle — déjà refusé en amont par le diagnostic de modèle correspondant" },
  PLAN_ECRAN_SANS_JUSTIFICATION: { classe: FP, pourquoi: "un écran qu'aucune étape n'exige vient du plan, pas du besoin" },
  NAVIGATION_BARRE_HORS_PLAN: { classe: FP, pourquoi: "écart entre le document et le plan prescrit : produit, jamais voulu" },
  NAVIGATION_DESTINATIONS_HORS_PLAN: { classe: FP, pourquoi: "écart entre le document et le plan prescrit : produit, jamais voulu" },
  NAVIGATION_ECRAN_HORS_PLAN: { classe: FP, pourquoi: "écart entre le document et le plan prescrit : produit, jamais voulu" },
  NAVIGATION_ECRAN_PRESCRIT_MANQUANT: { classe: FP, pourquoi: "le document omet un écran que le plan prescrit : omission de production" },
  NAVIGATION_ENTREE_HORS_PLAN: { classe: FP, pourquoi: "écart entre le document et le plan prescrit : produit, jamais voulu" },
  NAVIGATION_ROUTE_HORS_PLAN: { classe: FP, pourquoi: "écart entre le document et le plan prescrit : produit, jamais voulu" },
  NAVIGATION_ROUTE_PRESCRITE_MANQUANTE: { classe: FP, pourquoi: "le document omet une route que le plan prescrit : omission de production" },
};

/** Les codes d'une classe — DÉRIVÉ, jamais écrit une seconde fois. */
export function diagnosticsDeClasse(classe) {
  return Object.keys(DIAGNOSTICS).filter((code) => DIAGNOSTICS[code].classe === classe);
}

/** EP-135 — LE CLIQUET N'EST PAS UN TEST, C'EST UNE IMPOSSIBILITÉ.
 *  Tout diagnostic passe par ici ; un code sans classe ne peut pas naître. */
const d = (code, path, message) => {
  if (!(code in DIAGNOSTICS)) {
    throw new Error(
      `EP-135 — diagnostic "${code}" émis sans classe. Tout diagnostic se classe ` +
        `(${CLASSES_DIAGNOSTIC.join(" | ")}) dans DIAGNOSTICS, avec sa justification.`,
    );
  }
  return { code, path, message };
};

/**
 * R2 — MIGRATION 1.0.0 → 1.1.0, même patron que l'AIR : additive, jamais
 * inventive. Seule transformation : les états chaînes deviennent des états
 * structurés SANS transitions (aucune n'est inventée).
 */
export function migrerModele(brut) {
  if (brut === null || typeof brut !== "object") return brut;
  // EP-081 — 1.1.0 → 1.2.0 : montée ADDITIVE (variante exogène des
  // transitions) ; un 1.1.0 est un 1.2.0 valide, copie par liste fermée.
  if (brut.version === "modele-metier/1.1.0") {
    return {
      version: "modele-metier/1.2.0",
      ...(brut.commerce === undefined ? {} : { commerce: brut.commerce }),
      couverture: brut.couverture,
      acteurs: brut.acteurs,
      concepts: brut.concepts,
      relations: brut.relations,
      parcours: brut.parcours,
    };
  }
  if (brut.version !== "modele-metier/1.0.0") return brut;
  // COPIE PAR LISTE FERMÉE de clés — jamais un spread : une migration qui
  // recopierait des clés inconnues BLANCHIRAIT un champ étranger (mesuré :
  // le piège C3 a vu le spread énumérer `texteOriginal`). Les clés hors
  // contrat meurent ici ; le schéma strict refuse de toute façon.
  return migrerModele({
    version: "modele-metier/1.1.0",
    // F-R4-1 : `commerce` manquait à cette liste (ajouté au contrat APRÈS
    // elle) — un 1.0.0 portant le fait le perdait EN SILENCE. La liste est
    // désormais tenue par un CLIQUET DE COMPLÉTUDE (test : clés de
    // migration ≡ clés du schéma).
    ...(brut.commerce === undefined ? {} : { commerce: brut.commerce }),
    couverture: brut.couverture,
    acteurs: brut.acteurs,
    concepts: (brut.concepts ?? []).map((c) =>
      Array.isArray(c?.etats) && c.etats.every((e) => typeof e === "string")
        ? { ...c, etats: c.etats.map((e) => ({ id: e })) }
        : c,
    ),
    relations: brut.relations,
    parcours: brut.parcours,
  });
}

/**
 * P1 — validation DÉTERMINISTE : forme, références, SUFFISANCE (F1).
 * Aucun jugement libre : chaque refus est un invariant nommé.
 */
export function validerModele(brut) {
  const parsed = modeleMetierSchema.safeParse(migrerModele(brut));
  if (!parsed.success) {
    return parsed.error.issues.map((i) => d("MODELE_SCHEMA", i.path.join("."), i.message));
  }
  const m = parsed.data;
  const out = [];
  const idsConcepts = new Set(m.concepts.map((c) => c.id));
  const idsActeurs = new Set(m.acteurs.map((a) => a.id));
  const tousIds = new Set([
    ...idsConcepts,
    ...idsActeurs,
    ...m.parcours.map((p) => p.id),
    ...m.concepts.flatMap((c) => (c.attributs ?? []).map((a) => a.id)),
  ]);

  // ── RÉFÉRENCES STRUCTURELLES ──
  for (const [ri, r] of m.relations.entries()) {
    for (const bout of ["de", "vers"]) {
      if (!idsConcepts.has(r[bout]))
        out.push(d("MODELE_REFERENCE_INCONNUE", `relations[${ri}].${bout}`, r[bout]));
    }
  }
  for (const p of m.parcours) {
    if (!idsActeurs.has(p.acteur))
      out.push(d("MODELE_REFERENCE_INCONNUE", `parcours[${p.id}].acteur`, p.acteur));
    for (const [ei, e] of p.etapes.entries()) {
      const concept = m.concepts.find((c) => c.id === e.concept);
      if (concept === undefined) {
        out.push(d("MODELE_REFERENCE_INCONNUE", `parcours[${p.id}].etapes[${ei}].concept`, e.concept));
      } else if (
        e.etat !== undefined &&
        !(concept.etats ?? []).some((x) => x.id === e.etat)
      ) {
        out.push(d("MODELE_ETAT_INCONNU", `parcours[${p.id}].etapes[${ei}].etat`, e.etat));
      } else if (e.etat !== undefined && TABLE_GESTES[e.geste]?.effet === "mutation") {
        // D6 (EP-058, usage réel observé : confirmer créneau [etat=reserve]) —
        // les DEUX sens sont légitimes et ont CHACUN leur champ : le FILTRE
        // consommé vit sur l'étape (gestes de LECTURE) ; l'état-CIBLE d'une
        // écriture vit dans concept.etats[].transitions — le redéclarer sur
        // l'étape serait une conclusion dupliquée (forme normale).
        out.push(
          d("MODELE_ETAT_SUR_GESTE_MUTANT", `parcours[${p.id}].etapes[${ei}].etat`,
            `${e.geste} est une écriture : son état-cible se déclare dans les transitions du concept, pas sur l'étape`),
        );
      }
    }
  }
  for (const [ci, entree] of m.couverture.couverts.entries()) {
    for (const n of entree.noeuds) {
      if (!tousIds.has(n))
        out.push(d("MODELE_REFERENCE_INCONNUE", `couverture.couverts[${ci}]`, n));
    }
  }

  // ── SUFFISANCE (déterministe — F1) ──
  if (m.parcours.length === 0) out.push(d("MODELE_SANS_PARCOURS", "parcours", "aucun parcours"));
  for (const p of m.parcours) {
    const dernier = p.etapes[p.etapes.length - 1];
    if (dernier !== undefined && !GESTES_TERMINAUX.includes(dernier.geste)) {
      out.push(
        d(
          "MODELE_PARCOURS_SANS_PREUVE",
          `parcours[${p.id}]`,
          `se termine par "${dernier.geste}" — aucun résultat observable (attendu : ${GESTES_TERMINAUX.join("|")})`,
        ),
      );
    }
  }
  const traverses = new Set(m.parcours.flatMap((p) => p.etapes.map((e) => e.concept)));
  for (const c of m.concepts) {
    if (c.donnees && !traverses.has(c.id))
      out.push(d("MODELE_CONCEPT_MORT", `concepts[${c.id}]`, "porte des données qu'aucune étape ne traverse"));
  }
  const acteursActifs = new Set(m.parcours.map((p) => p.acteur));
  for (const a of m.acteurs) {
    if (!acteursActifs.has(a.id))
      out.push(d("MODELE_ACTEUR_MUET", `acteurs[${a.id}]`, "aucun parcours ne le fait agir"));
  }
  // ── R3 — RÉFÉRENCES INTERNES DES CONCEPTS ──
  for (const c of m.concepts) {
    const idsAttributs = new Set((c.attributs ?? []).map((a) => a.id));
    if (c.identifiant !== undefined && !idsAttributs.has(c.identifiant))
      out.push(d("MODELE_IDENTIFIANT_INCONNU", `concepts[${c.id}].identifiant`, c.identifiant));
    for (const a of c.attributs ?? []) {
      if (a.producteur !== undefined && !idsActeurs.has(a.producteur))
        out.push(d("MODELE_REFERENCE_INCONNUE", `concepts[${c.id}].attributs[${a.id}].producteur`, a.producteur));
    }
  }
  // ── R2 — INVARIANTS DES ÉTATS MÉTIER (E, #6) ──
  for (const c of m.concepts) {
    const etats = c.etats ?? [];
    const ids = new Set(etats.map((x) => x.id));
    const atteints = new Set(etats.flatMap((x) => (x.transitions ?? []).map((t) => t.vers)));
    for (const e of etats) {
      for (const [ti, t] of (e.transitions ?? []).entries()) {
        if (!ids.has(t.vers))
          out.push(d("MODELE_TRANSITION_INCONNUE", `concepts[${c.id}].etats[${e.id}].transitions[${ti}]`, t.vers));
        // O-2 (EP-036, dégelée post-tirage-3) : une transition d'état est
        // causée par une ÉCRITURE — un geste de LECTURE qui transite un
        // état est un non-sens des patrons (mesuré : a_venir→passe via
        // consulter_historique au tirage 1, accepté à tort par P1).
        // EP-081 — une transition EXOGÈNE n'a pas de geste : personne ne
        // l'accomplit, O-2 et la représentation ne s'appliquent pas. Son
        // OBSERVABILITÉ reste jugée par V4 (état atteint ⇒ distingué par une
        // surface) — l'exogène est une troisième voie, pas une porte de
        // sortie : un geste de LECTURE ne transite toujours jamais un état.
        if (t.exogene !== undefined) continue;
        if (TABLE_GESTES[t.geste]?.effet !== "mutation") {
          out.push(
            d("MODELE_TRANSITION_DECLENCHEE_PAR_LECTURE", `concepts[${c.id}].etats[${e.id}]`, `${t.geste}→${t.vers} : le geste ${t.geste} ne mute pas`),
          );
        }
        // Transition REPRÉSENTÉE : un parcours porte le geste sur ce concept.
        const representee = m.parcours.some((p) =>
          p.etapes.some((s2) => s2.concept === c.id && s2.geste === t.geste),
        );
        if (!representee)
          out.push(
            d("MODELE_TRANSITION_NON_REPRESENTEE", `concepts[${c.id}].etats[${e.id}]`, `${t.geste}→${t.vers} sans étape de parcours`),
          );
      }
    }
    // Atteignabilité : tout état non-initial (index > 0) doit être la cible
    // d'une transition OU être consommé par une étape (historique filtré).
    for (const [i, e] of etats.entries()) {
      if (i === 0 || atteints.has(e.id)) continue;
      const consomme = m.parcours.some((p) => p.etapes.some((s2) => s2.etat === e.id));
      if (!consomme)
        out.push(d("MODELE_ETAT_INATTEIGNABLE", `concepts[${c.id}].etats[${e.id}]`, "ni cible d'une transition, ni consommé"));
    }
    // R3-bis · V4 — OBSERVABILITÉ : un état ATTEINT par transition doit être
    // DISTINGUÉ par au moins une surface (étape consommant cet état) — le
    // cas mesuré du verdict : « annulé » atteint sans qu'aucune surface ne
    // le montre. Distinct de M4 (une transition représentée peut mener à un
    // état d'arrivée invisible).
    for (const e of etats) {
      if (!atteints.has(e.id)) continue;
      const observe = m.parcours.some((p) => p.etapes.some((s2) => s2.etat === e.id));
      if (!observe)
        out.push(d("MODELE_ETAT_NON_OBSERVABLE", `concepts[${c.id}].etats[${e.id}]`, "atteint par transition mais distingué par aucune surface"));
    }
  }
  // ── R2 — PRÉCONDITIONS : références valides ──
  for (const p2 of m.parcours) {
    for (const [ei, e] of p2.etapes.entries()) {
      for (const [pi, pre] of (e.preconditions ?? []).entries()) {
        const cible = m.concepts.find((c) => c.id === pre.concept);
        if (cible === undefined)
          out.push(d("MODELE_REFERENCE_INCONNUE", `parcours[${p2.id}].etapes[${ei}].preconditions[${pi}]`, pre.concept));
        else if (!(cible.etats ?? []).some((x) => x.id === pre.etat))
          out.push(d("MODELE_ETAT_INCONNU", `parcours[${p2.id}].etapes[${ei}].preconditions[${pi}]`, pre.etat));
      }
      if (e.acteur !== undefined && !idsActeurs.has(e.acteur))
        out.push(d("MODELE_REFERENCE_INCONNUE", `parcours[${p2.id}].etapes[${ei}].acteur`, e.acteur));
    }
  }
  // D6 EP-029 — commerce ⟺ payer, dans LES DEUX sens.
  const paie = m.parcours.some((p) => p.etapes.some((e) => e.geste === "payer"));
  if (paie && m.commerce === undefined)
    out.push(d("MODELE_COMMERCE_ABSENT", "commerce", "un parcours paie : la variante (digital | physique_ou_hors_app) est un fait requis du modèle"));
  if (!paie && m.commerce !== undefined)
    out.push(d("MODELE_COMMERCE_SANS_OBJET", "commerce", "aucun parcours ne paie : fait sans consommateur"));
  // F1 — le blocage sur `ambigu` est EXPLICITE : un terme ambigu ne se
  // classe pas en silence, il se résout (modèle) ou refuse (ici).
  for (const [ni, nr] of m.couverture.nonRetenus.entries()) {
    if (nr.raison === "ambigu")
      out.push(d("MODELE_TERME_AMBIGU", `couverture.nonRetenus[${ni}]`, nr.terme));
  }
  if (m.couverture.couverts.length === 0)
    out.push(d("MODELE_COUVERTURE_VIDE", "couverture.couverts", "aucun terme couvert"));
  return out;
}

// ────────────────── DÉRIVATIONS (D1–D6 : modèle seul, jamais de texte) ──

/** F4 — `visuel` DÉRIVÉ : attribut média requis de cardinalité ≥ 1. */
export function estVisuel(concept) {
  return (concept.attributs ?? []).some(
    (a) => a.nature === "media" && a.requis === true && (a.cardinalite ?? 1) >= 1,
  );
}

/** Accès d'un geste : seul « catalogue » discrimine la maille (F5). */
export function accesDe(geste) {
  return geste === "decouvrir" || geste === "chercher" ? "catalogue" : "lecture";
}

/**
 * F5 — MAILLE : GRILLE ⇔ visuel ∧ accès catalogue. Le PRODUCTEUR n'entre
 * PAS : un flux/historique reste en lignes par son GESTE
 * (consulter_historique ⇒ accès lecture), jamais par qui produit.
 */
export function mailleDe(concept, geste) {
  return estVisuel(concept) && accesDe(geste) === "catalogue" ? "grille" : "lignes";
}

/**
 * AMENDEMENT — stratégie initiale DÉRIVÉE : une étape `saisir` sur le
 * concept = création in-app ⇒ la collection naît VIDE ; sinon amorcée.
 */
export function strategieInitiale(modele, conceptId) {
  const creeEnApp = modele.parcours.some((p) =>
    p.etapes.some((e) => e.concept === conceptId && e.geste === "saisir"),
  );
  return creeEnApp ? "vide" : "seed";
}

/** Le producteur DÉRIVÉ : l'acteur du parcours qui saisit (undefined = amorcé). */
export function producteurDe(modele, conceptId) {
  const p = modele.parcours.find((x) =>
    x.etapes.some((e) => e.concept === conceptId && e.geste === "saisir"),
  );
  return p?.acteur;
}

/**
 * F7 — état VIDE OBLIGATOIRE si la collection naît vide OU peut le
 * devenir : une étape `retirer` (mutation delete de l'enveloppe) réduit.
 */
export function etatVideObligatoire(modele, conceptId) {
  if (strategieInitiale(modele, conceptId) === "vide") return true;
  return modele.parcours.some((p) =>
    p.etapes.some((e) => e.concept === conceptId && e.geste === "retirer"),
  );
}

// ────────────────── C6/C9 (confrontation #12) — SURFACES, PORTÉE, RÉPÉTITION ──

// EP-134 — DEUXIÈME ET TROISIÈME CHEMINS FERMÉS. Ces deux tables étaient
// indexées par geste, indépendamment de `TABLE_GESTES` : un geste ajouté à la
// table y prenait un rôle `undefined` et la cardinalité PAR DÉFAUT, en
// silence. Mesuré en direct : `contacter` produisait une surface de
// cardinalité « collection » — c'est-à-dire, à l'écran, « contacter le
// vendeur » ouvrant la LISTE DE TOUS LES VENDEURS. Le défaut constaté à
// l'appareil n'était pas un accident du générateur : il était inscrit dans la
// structure, en attente d'un geste pour se manifester.
//
// Les valeurs sont RIGOUREUSEMENT celles d'avant — « collection » était le
// défaut implicite et devient explicite, rien d'autre ne change.

/** Rôle de surface DÉRIVÉ du geste (jamais déclaré, jamais sectoriel). */
export const ROLE_PAR_GESTE = Object.fromEntries(
  Object.entries(TABLE_GESTES).map(([g, patron]) => [g, patron.role]),
);

/** Cardinalité de la surface d'un geste : une instance identifiée, ou N. */
const CARDINALITE_PAR_GESTE = Object.fromEntries(
  Object.entries(TABLE_GESTES).map(([g, patron]) => [g, patron.cardinalite]),
);

// ── J1/J2/J3 (EP-059, fixture réelle kaviva-spa…modele-p0) — LE REGISTRE
// D'IDENTITÉ SE PROPAGE le long du parcours : une étape qui ne touche pas
// à l'identité est TRANSPARENTE (s_identifier, confirmer, payer) ; toute
// étape de DONNÉES (source, électeur, consommateur) la touche. Corrigé en
// HYPOTHÈSE, pas en exceptions : « choisir → se connecter → réserver » ne
// perd plus l'identité, et une étape interposée qui touche une AUTRE
// identité ROMPT la chaîne (mutation exigée).

/** J3 — les CONSOMMATEURS d'une identité élue, DÉRIVÉS DE LA TABLE (une
 * liste écrite deux fois diverge — précédent v3/v4) : gestes à transport
 * itemId qui ne sont pas eux-mêmes ÉLECTEURS, plus la saisie liée. */
export function consommateursDIdentite() {
  return GESTES.filter((g) => TABLE_GESTES[g].transport === "itemId" && g !== "choisir");
}

/** J2 — concept d'IDENTITÉ DE L'ACTEUR : discriminant STRUCTUREL (le
 * concept que s_identifier touche), jamais un nom. Singleton de soi :
 * aucune ligne à presser pour se consulter. */
export function estConceptIdentite(modele, conceptId) {
  return modele.parcours.some((p) =>
    p.etapes.some((e) => e.geste === "s_identifier" && e.concept === conceptId),
  );
}

/** L'étape IDENTITAIRE la plus proche en amont (transparentes ignorées). */
function amontIdentitaire(parcours, index) {
  for (let i = index - 1; i >= 0; i--) {
    const e = parcours.etapes[i];
    if (!GESTES_TRANSPARENTS.has(e.geste)) return e;
  }
  return undefined;
}

/** L'étape IDENTITAIRE la plus proche en aval (transparentes ignorées). */
function avalIdentitaire(parcours, index) {
  for (let i = index + 1; i < parcours.etapes.length; i++) {
    const e = parcours.etapes[i];
    if (!GESTES_TRANSPARENTS.has(e.geste)) return { etape: e, index: i };
  }
  return undefined;
}

/**
 * C6 — PORTÉE DÉRIVÉE (jamais un champ) :
 *  · `resultat:<concept>` pour un résultat de recherche (geste chercher) ;
 *  · `acteur:<id>` pour une collection PERSONNELLE — historique, ou concept
 *    produit en app par l'acteur du parcours (producteurDe) ;
 *  · `instance:<concept>` quand l'étape suit un consulter/choisir d'un
 *    concept RELIÉ (relation déclarée) — surface liée à une instance ;
 *  · `globale` sinon.
 */
export function porteeDe(modele, parcours, index) {
  const e = parcours.etapes[index];
  if (e === undefined) return "globale";
  if (e.geste === "chercher") return `resultat:${e.concept}`;
  if (e.geste === "consulter_historique") return `acteur:${parcours.acteur}`;
  if (producteurDe(modele, e.concept) === parcours.acteur && e.geste !== "saisir") {
    return `acteur:${parcours.acteur}`;
  }
  // J1 — PROPAGATION : l'étape identitaire la plus proche en amont (les
  // transparentes s'ignorent), plus jamais la seule adjacente.
  const prec = amontIdentitaire(parcours, index);
  if (
    prec !== undefined &&
    (prec.geste === "consulter" || prec.geste === "choisir") &&
    prec.concept !== e.concept &&
    modele.relations.some(
      (r) =>
        (r.de === e.concept && r.vers === prec.concept) ||
        (r.de === prec.concept && r.vers === e.concept),
    )
  ) {
    return `instance:${prec.concept}`;
  }
  return "globale";
}

/**
 * C9 — SURFACE CONTRACT (contrat de P2c, v0) : dérivé de MODEL × JOURNEY ×
 * STEP, RIEN d'autre. Chaque surface porte son rôle, sa cardinalité, son
 * identité, ses exclusions et son ORIGINE (les étapes qui la justifient).
 * Dédoublonnage par quadruplet (concept, geste, état, portée) — les
 * origines s'ACCUMULENT : une surface partagée sert N parcours (R-éc2).
 */
export function surfacesDe(modele) {
  const table = new Map();
  for (const p of modele.parcours) {
    for (const [i, e] of p.etapes.entries()) {
      const portee = porteeDe(modele, p, i);
      const cle = `${e.concept}|${e.geste}|${e.etat ?? ""}|${portee}`;
      const origine = { parcours: p.id, etape: i };
      const existante = table.get(cle);
      if (existante !== undefined) {
        existante.origine.push(origine);
        continue;
      }
      const role = ROLE_PAR_GESTE[e.geste];
      const cardinalite = CARDINALITE_PAR_GESTE[e.geste] ?? "collection";
      table.set(cle, {
        surfaceId: `srf_${e.concept}_${e.geste}${e.etat ? `_${e.etat}` : ""}`,
        role,
        acteur: p.acteur,
        concept: e.concept,
        cardinalite,
        // R3-bis · V3 — l'obligation F7 VOYAGE avec la surface : une
        // collection vide-née OU vidable doit déclarer son état vide.
        ...(cardinalite === "collection"
          ? { videObligatoire: etatVideObligatoire(modele, e.concept) }
          : {}),
        // L'identité est CONSOMMÉE par une surface d'instance, PRODUITE par
        // la ligne d'une collection qui mène à un consulter/choisir.
        identite: cardinalite === "instance" ? "consommee" : "produite_ou_absente",
        etat: e.etat,
        portee,
        // EXCLUSIONS : ce que la surface NE DOIT PAS absorber (C5) —
        // une surface d'instance n'absorbe JAMAIS une collection pleine ;
        // une collection n'absorbe pas une autre identité.
        exclusions:
          cardinalite === "instance"
            ? ["collection_pleine", "autre_identite"]
            : ["exercice_plein_dautre_responsabilite"],
        origine: [origine],
      });
    }
  }
  // EP-099 (L-098-B) — L'IDENTIFIANT DOIT ÊTRE INJECTIF, ou le plan
  // collisionne. Mesuré à l'échelle (marketplace, 22 écrans) : deux surfaces
  // au même (concept, geste, état) mais de PORTÉES différentes (globale vs
  // acteur:vendeur) recevaient le MÊME surfaceId ⇒ deux plan.ecrans au même
  // ecranId ⇒ bijection prescrits/émis intenable (22 prescrits, 21
  // distincts). Le dédoublonnage C6 est par QUADRUPLET : l'identifiant doit
  // l'être aussi. DÉSAMBIGUÏSATION CHIRURGICALE : seules les COLLISIONS
  // RÉELLES reçoivent le suffixe de portée — tout identifiant sans
  // collision reste INCHANGÉ (aucune fixture antérieure ne bouge).
  const toutes = [...table.values()];
  const compte = new Map();
  for (const sf of toutes) compte.set(sf.surfaceId, (compte.get(sf.surfaceId) ?? 0) + 1);
  for (const sf of toutes) {
    if ((compte.get(sf.surfaceId) ?? 0) > 1 && sf.portee !== "globale") {
      sf.surfaceId = `${sf.surfaceId}_${sf.portee.replace(/[^a-z0-9]+/gi, "_")}`;
    }
  }
  return toutes;
}

/**
 * C6 — RÉPÉTITION SUSPECTE : deux surfaces au MÊME quadruplet
 * (concept, geste, état, portée) dans le même contexte. `surfacesDe`
 * dédoublonne par construction — cette fonction juge une liste de surfaces
 * DÉJÀ posées (un plan d'écran, une composition) : mêmes quadruplets = refus.
 */
export function repetitionsSuspectes(surfaces) {
  const vus = new Map();
  const out = [];
  for (const s of surfaces) {
    const cle = `${s.concept}|${s.geste ?? s.role}|${s.etat ?? ""}|${s.portee}`;
    if (vus.has(cle)) out.push({ cle, premiere: vus.get(cle), doublon: s });
    else vus.set(cle, s);
  }
  return out;
}

// ────────────────── R2 — LA TABLE DES GESTES, STRUCTURÉE ──
//
// Un geste EST un patron structurel (confrontations #4/#8) : le NOM n'est
// qu'une clé. transport/effet/résultat attendus par une étape se DÉRIVENT
// d'ici (forme normale : décisions dans le modèle, conclusions dans la
// table) — aucune étape ne les redéclare.


// ────────────────── EP-068 — LES LISTES DE GESTES SE DÉRIVENT DE LA TABLE ──
//
// TROISIÈME divergence liste-écrite-à-la-main / table (prompt v3-v4, J3/EP-059,
// retirer-source/EP-067) : le MOTIF est traité, plus seulement le cas. Un seul
// PRÉDICAT porte l'identité : un geste est SOURCE s'il TRANSPORTE une identité
// (colonne transport) ou s'il PRÉSENTE le concept (bloc de présentation :
// list, search_entry). Son COMPLÉMENT est exactement l'ensemble des gestes
// TRANSPARENTS (J1) — deux ensembles, une dérivation, zéro énumération.
// Le cliquet (tests) recalcule ces dérivations ET refuse toute nouvelle liste
// de gestes écrite à la main dans ce module.
export function estSourceDIdentite(geste) {
  const patron = TABLE_GESTES[geste];
  if (patron === undefined) return false;
  return patron.transport !== null || patron.bloc === "list" || patron.bloc === "search_entry";
}
export function sourcesDIdentite() {
  return GESTES.filter(estSourceDIdentite);
}
/** Gestes dont la preuve est OBSERVABLE — un parcours doit finir par l'un d'eux. */
export const GESTES_TERMINAUX = GESTES.filter((g) => TABLE_GESTES[g].terminal);
/** EP-070 — gestes qui PARCOURENT une collection (bloc de présentation) sans
 * exiger d'identité amont : les consommateurs (transport itemId hors électeur)
 * en sont EXCLUS — ils réclament leur propre instance, une portée ne suffit pas. */
export function gestesParcoursDeCollection() {
  const consommateurs = consommateursDIdentite();
  return GESTES.filter((g) => {
    const patron = TABLE_GESTES[g];
    return (
      (patron.bloc === "list" || patron.bloc === "search_entry") &&
      !consommateurs.includes(g)
    );
  });
}
/**
 * EP-118 — LE LIEN QUE LA CONSOMMATION-PAR-PORTÉE ÉTABLIT, EXPOSÉ.
 *
 * Mesuré : `ecransDe` ACCEPTE « élire X puis parcourir Y relié à X »
 * (EP-070) — donc le plan SAIT que les Y présentés sont ceux de l'instance
 * de X choisie — mais il ne CONSERVE ce lien nulle part : la surface de
 * `chercher` porte `resultat:Y`, jamais `instance:X`. Résultat mesuré : le
 * générateur produit une collection Y NON SCOPÉE, et C4 refuse l'identité
 * perdue (3 diagnostics, dernière famille bloquante). Le plan décidait sans
 * transmettre — 4e occurrence du motif. Dérivé du MÊME prédicat que la
 * décision : aucune donnée nouvelle, aucune liste à la main.
 */
export function consommationsParPortee(modele) {
  const out = [];
  const parcoursDeCollection = gestesParcoursDeCollection();
  for (const p of modele.parcours) {
    for (const [i, e] of p.etapes.entries()) {
      if (e.geste !== "choisir") continue;
      const suivant = avalIdentitaire(p, i);
      if (suivant === undefined) continue;
      const cible = suivant.etape;
      if (
        cible.concept === e.concept ||
        !parcoursDeCollection.includes(cible.geste) ||
        !conceptsRelies(modele, e.concept, cible.concept)
      ) {
        continue;
      }
      out.push({
        parcours: p.id,
        elu: e.concept,
        parcouru: cible.concept,
        etapeElection: i,
        etapeConsommation: suivant.index,
      });
    }
  }
  return out;
}

/** EP-070 — un lien structurel DÉCLARÉ entre deux concepts, dans l'un ou
 * l'autre sens (T3 écrit « creneau référence soin », T2 « categorie possède
 * soin » : même lien, deux sens — la déclaration fait foi, pas sa direction). */
export function conceptsRelies(modele, a, b) {
  return modele.relations.some(
    (r) => (r.de === a && r.vers === b) || (r.de === b && r.vers === a),
  );
}
/** J1 — les gestes SANS identité propre : le COMPLÉMENT du prédicat source. */
const GESTES_TRANSPARENTS = new Set(GESTES.filter((g) => !estSourceDIdentite(g)));

/** R2 — le CONTRAT D'UNE ÉTAPE : dérivé (table × modèle), jamais redéclaré. */
export function contratDEtape(modele, parcours, index) {
  const e = parcours.etapes[index];
  if (e === undefined) return undefined;
  const patron = TABLE_GESTES[e.geste];
  return {
    acteur: e.acteur ?? parcours.acteur,
    geste: e.geste,
    conceptCible: e.concept,
    preconditions: e.preconditions ?? [],
    transport: patron.transport,
    effet: patron.effet,
    resultatAttendu: patron.preuve,
    portee: porteeDe(modele, parcours, index),
  };
}

// ────────────────── R2/C1 — LEXICALISATION DÉTERMINISTE ──
//
// LA FRONTIÈRE : l'inventaire des termes du brief est produit par une règle
// FERMÉE, indépendante des décisions de P0 — P0 ne choisit jamais quels
// termes comptent. P1 compare ensuite inventaire ↔ couverture du modèle.
// LIMITE ASSUMÉE : c'est un mécanisme de RESPONSABILITÉ lexicale (M3),
// jamais une preuve sémantique — la suffisance réelle de P0 se juge en R8.
export const STOPWORDS_FR = new Set([
  "les", "des", "une", "aux", "est", "son", "ses", "leur", "leurs", "avec",
  "pour", "dans", "par", "sur", "qui", "que", "quoi", "dont", "mes", "mon",
  "ma", "ils", "elles", "elle", "lui", "nous", "vous", "tout", "tous",
  "toute", "toutes", "puis", "donc", "mais", "aussi", "ainsi", "etre",
  "avoir", "faire", "doit", "doivent", "peut", "peuvent", "veut", "veulent",
  "chaque", "leur", "cette", "ces", "cet", "sans", "sous", "plus", "tres",
  "bien", "comme", "afin", "ensuite", "apres", "avant", "entre", "chez",
  "dune", "dun", "lapp", "application", "appli", "app", "besoin", "exactement",
]);

const normaliser = (t) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ");

/** R2/C1 — l'inventaire : tokens normalisés ≥ 3 lettres, hors mots-outils. */
export function inventaireDe(brief) {
  const tokens = normaliser(brief).split(/[\s-]+/).filter((t) => t.length >= 3 && !/^\d+$/.test(t));
  return [...new Set(tokens.filter((t) => !STOPWORDS_FR.has(t)))].sort();
}

/**
 * R2/C1 — P1 compare l'INVENTAIRE (déterministe) à la COUVERTURE du modèle.
 * Un terme est JUSTIFIÉ s'il apparaît (normalisé) dans un terme couvert,
 * un terme non retenu (raison fermée), ou le nom/id d'un nœud du modèle.
 * Sinon : MODELE_TERME_NON_JUSTIFIE — l'omission silencieuse est refusée.
 */
export function verifierCouvertureLexicale(inventaire, modele) {
  const textes = [
    ...modele.couverture.couverts.map((x) => x.terme),
    ...modele.couverture.nonRetenus.map((x) => x.terme),
    ...modele.concepts.flatMap((c) => [c.nom, c.id]),
    ...modele.acteurs.flatMap((a) => [a.nom, a.id]),
    // Les BESOINS (prose de P0) ne justifient PAS un terme : la
    // responsabilité passe par la couverture EXPLICITE ou un nœud NOMMÉ —
    // sinon une phrase suffirait à faire disparaître un concept (mesuré :
    // la mutation « créneau retiré » passait par la prose du besoin).
  ]
    .map(normaliser)
    .join(" ");
  const out = [];
  for (const terme of inventaire) {
    // Justifié si le corps du terme (ou son radical sans pluriel) apparaît.
    const radical = terme.replace(/s$/, "");
    if (!textes.includes(terme) && !textes.includes(radical)) {
      out.push(d("MODELE_TERME_NON_JUSTIFIE", `couverture[${terme}]`, "ni couvert, ni non-retenu, ni porté par un nœud"));
    }
  }
  return out;
}

// ────────────────── R3 — P2a : CAPACITÉS DÉRIVÉES DES GESTES ──
//
// s_identifier ⇒ auth (avec le concept de profil touché) ; payer ⇒ une
// capacité de paiement dont la VARIANTE (psp|iap) exige la classe commerce
// — ABSENTE du modèle : DISCRIMINANT_ABSENT, jamais un défaut silencieux.
export function capacitesDe(modele) {
  const capacites = [];
  const diagnostics = [];
  const etapes = modele.parcours.flatMap((p) => p.etapes);
  // EP-134 — DÉRIVÉ DE LA TABLE, dans son ordre : plus aucun `if` par geste.
  for (const geste of GESTES) {
    const declaree = TABLE_GESTES[geste].capacite;
    if (declaree === null) continue;
    const etape = etapes.find((e) => e.geste === geste);
    if (etape === undefined) continue;
    if (typeof declaree === "string") {
      // Le concept TOUCHÉ n'est transmis que pour l'identité : c'est la seule
      // capacité dont la configuration dépend d'un concept (le profil). Pour
      // les autres, l'identité voyage par le TRANSPORT du geste, pas par la
      // capacité — c'est précisément le mécanisme d'EP-118.
      capacites.push(
        declaree === "auth"
          ? { capacite: declaree, profilConceptId: etape.concept }
          : { capacite: declaree },
      );
      continue;
    }
    // D6 EP-029 : le discriminant EXISTE au modèle (commerce). Sans lui, P1 a
    // déjà refusé (MODELE_COMMERCE_ABSENT) — ici, dériver.
    const variante = declaree.selonCommerce[modele.commerce];
    if (variante === undefined) {
      diagnostics.push(
        d("DISCRIMINANT_ABSENT", `capacites[${geste}]`,
          "commerce absent du modèle — refusé en amont par MODELE_COMMERCE_ABSENT"),
      );
      continue;
    }
    capacites.push({ capacite: variante });
  }
  return { capacites, diagnostics };
}

// ────────────────── R3 — P2d : ÉCRANS + NAVIGATION DÉRIVÉS (v0) ──
//
// LE NOMBRE D'ÉCRANS EST UNE SORTIE. Chaque écran porte sa JUSTIFICATION
// (surfaces → origines/étapes) — un écran sans étape est irreprésentable
// par construction et REFUSÉ par le juge (jugerPlanEcrans). Règles v0 :
// l'ENTRÉE agrège les surfaces de découverte de l'étape 0 du PREMIER
// parcours + le chrome de recherche (R-chrome) ; toute autre surface a son
// écran ; les destinations suivent l'ORDRE des parcours (R-nav, ≥2 ⇒
// barre) ; les arcs relient les étapes consécutives, avec leur TRANSPORT
// (table des gestes) ; une identité produite DOIT être consommée en aval.
export function ecransDe(modele) {
  const surfaces = surfacesDe(modele);
  const diagnostics = [];
  const parSurface = new Map(surfaces.map((sf) => [sf.surfaceId, sf]));
  const surfaceDeLEtape = (parcoursId, index) =>
    surfaces.find((sf) => sf.origine.some((o) => o.parcours === parcoursId && o.etape === index));

  // ── chrome (R-chrome) : la recherche, hors du flux ──
  const chrome = surfaces.filter((sf) => sf.role === "recherche").map((sf) => sf.surfaceId);

  // ── écrans ──
  const premier = modele.parcours[0];
  const surfacesEntree = new Set(
    (premier === undefined ? [] : surfaces
      .filter((sf) => sf.role === "decouverte" &&
        sf.origine.some((o) => o.parcours === premier.id && o.etape === 0))
      .map((sf) => sf.surfaceId)),
  );
  const ecrans = [];
  if (surfacesEntree.size > 0) {
    ecrans.push({
      ecranId: "ecr_entree",
      surfaces: [...surfacesEntree, ...chrome.filter((c) => !surfacesEntree.has(c))],
      justification: [...surfacesEntree, ...chrome].flatMap(
        (id) => parSurface.get(id)?.origine ?? [],
      ),
    });
  }
  for (const sf of surfaces) {
    if (surfacesEntree.has(sf.surfaceId) || chrome.includes(sf.surfaceId)) continue;
    ecrans.push({
      ecranId: `ecr_${sf.surfaceId.slice(4)}`,
      surfaces: [sf.surfaceId],
      justification: sf.origine,
    });
  }
  // R3-bis · V1 — le CHROME est TOUJOURS hébergé : si aucune entrée de
  // découverte n'existe (premier parcours commençant autrement), l'entrée
  // est créée pour porter le chrome — aucune étape ne peut rester sans
  // écran, PAR CONSTRUCTION (prouvé par le test de couverture totale).
  if (chrome.length > 0 && !ecrans.some((e) => e.ecranId === "ecr_entree")) {
    ecrans.unshift({
      ecranId: "ecr_entree",
      surfaces: [...chrome],
      justification: chrome.flatMap((id) => parSurface.get(id)?.origine ?? []),
    });
  }
  const ecranDeSurface = new Map(
    ecrans.flatMap((e) => e.surfaces.map((sid) => [sid, e.ecranId])),
  );

  // ── navigation (R-nav) : racines = étape 0 de chaque parcours, dans l'ordre ──
  const destinations = [];
  for (const p of modele.parcours) {
    const sf = surfaceDeLEtape(p.id, 0);
    const ecran = sf === undefined ? undefined : ecranDeSurface.get(sf.surfaceId);
    if (ecran !== undefined && !destinations.includes(ecran)) destinations.push(ecran);
  }
  const barre = destinations.length >= 2;

  // ── arcs + invariants de chaîne ──
  const arcs = [];
  for (const p of modele.parcours) {
    for (let i = 0; i + 1 < p.etapes.length; i++) {
      const de = surfaceDeLEtape(p.id, i);
      const vers = surfaceDeLEtape(p.id, i + 1);
      const geste = p.etapes[i].geste;
      const transport = TABLE_GESTES[geste].transport;
      if (de === undefined || vers === undefined) continue;
      arcs.push({
        parcours: p.id,
        de: ecranDeSurface.get(de.surfaceId),
        vers: ecranDeSurface.get(vers.surfaceId),
        geste,
        transport,
      });
    }
    // C4 au niveau DÉRIVATION — LE SENS DU TRANSPORT (corrigé après preuve :
    // la première rédaction exigeait la consommation APRÈS `consulter`,
    // alors que `consulter` EST le consommateur — l'arc y entre).
    for (const [i, e] of p.etapes.entries()) {
      // (a) UN CONSOMMATEUR D'IDENTITÉ exige une source en amont PROPAGÉE
      // (J1 — les transparentes s'ignorent), du MÊME concept. J2 : un concept
      // d'IDENTITÉ DE L'ACTEUR (discriminant structurel s_identifier) se
      // consulte sans ligne — singleton de soi, aucune source exigée.
      //
      // EP-134 — QUATRIÈME CHEMIN FERMÉ. Ce juge nommait `consulter` en dur,
      // alors que la table sait déjà QUI consomme une identité
      // (`consommateursDIdentite`, dérivé de la colonne transport). Mesuré :
      // `retirer` en tête de parcours — retirer UNE instance que rien n'a
      // élue — passait sans un mot, et `contacter` aurait fait de même. Le
      // juge existait ; il ne regardait qu'un geste sur trois.
      if (consommateursDIdentite().includes(e.geste) && !estConceptIdentite(modele, e.concept)) {
        const prec = amontIdentitaire(p, i);
        const sourceValide =
          prec !== undefined &&
          prec.concept === e.concept &&
          estSourceDIdentite(prec.geste);
        if (!sourceValide) {
          diagnostics.push(
            d("DERIVATION_IDENTITE_SANS_SOURCE", `parcours[${p.id}].etapes[${i}]`,
              `consulter ${e.concept} sans étape de données du même concept en amont : aucune ligne ne fournit l'identité`),
          );
        }
      }
      // (b) `choisir` PRODUIT : l'identité élue se PROPAGE (J1) jusqu'à sa
      // consommation — par un consommateur DÉRIVÉ DE LA TABLE (J3 :
      // consulter, retirer — transport itemId non électeur) du même
      // concept, ou une saisie de portée instance. Une étape identitaire
      // interposée qui touche une AUTRE identité ROMPT la chaîne.
      if (e.geste === "choisir") {
        const suivant = avalIdentitaire(p, i);
        const consommateurs = consommateursDIdentite();
        const consomme =
          suivant !== undefined &&
          ((consommateurs.includes(suivant.etape.geste) && suivant.etape.concept === e.concept) ||
            (suivant.etape.geste === "saisir" &&
              surfaceDeLEtape(p.id, suivant.index)?.portee === `instance:${e.concept}`) ||
            // EP-070 · CONSOMMATION-PAR-PORTÉE — « élire X pour parcourir Y
            // relié à X » (trou d'expressivité démontré PAR LA VARIANCE,
            // T2 categorie→chercher(soin), T3 soin→decouvrir(creneau)).
            // La relation doit être DÉCLARÉE au modèle : sans elle, élire
            // n'importe quoi pour parcourir n'importe quoi serait légal et
            // le juge ne jugerait plus. porteeDe sait DÉJÀ dire
            // instance:X pour ces surfaces (C6) — aucun champ nouveau.
            (suivant.etape.concept !== e.concept &&
              gestesParcoursDeCollection().includes(suivant.etape.geste) &&
              conceptsRelies(modele, e.concept, suivant.etape.concept)));
        if (!consomme) {
          diagnostics.push(
            d("DERIVATION_IDENTITE_NON_CONSOMMEE", `parcours[${p.id}].etapes[${i}]`,
              `l'identité de ${e.concept} élue par choisir n'atteint aucun consommateur (${consommateursDIdentite().join("/")} du même concept, saisie de portée instance:${e.concept}, ou parcours de collection — ${gestesParcoursDeCollection().join("/")} — d'un concept RELIÉ par une relation déclarée) — la première étape identitaire aval la remplace ou la jette`),
          );
        }
      }
    }
    // Une CONFIRMATION observe une ÉCRITURE : sans saisir/payer/retirer en
    // amont dans le MÊME parcours, il n'y a rien à confirmer.
    for (const [i, e] of p.etapes.entries()) {
      if (e.geste !== "confirmer") continue;
      const ecritAvant = p.etapes.slice(0, i).some((x) =>
        x.geste === "saisir" || x.geste === "payer" || x.geste === "retirer",
      );
      if (!ecritAvant) {
        diagnostics.push(
          d("DERIVATION_CONFIRMATION_SANS_ECRITURE", `parcours[${p.id}].etapes[${i}]`,
            "confirmer sans écriture en amont : aucun résultat à observer"),
        );
      }
    }
  }
  return { ecrans, chrome, navigation: { destinations, barre, arcs }, diagnostics };
}

/**
 * R3 — LE JUGE DU PLAN D'ÉCRANS : refuse un écran SANS justification par
 * une étape, une destination ou un arc HORS PLAN. Une gate refuse ou
 * valide — elle ne décide jamais.
 */
export function jugerPlanEcrans(plan, modele) {
  const out = [];
  const connus = new Set(plan.ecrans.map((e) => e.ecranId));
  if (modele !== undefined) {
    // R3-bis · V1 (sens direct) — CHAQUE étape de CHAQUE parcours doit être
    // matérialisée par un écran qui la justifie.
    for (const p of modele.parcours) {
      for (let i = 0; i < p.etapes.length; i++) {
        const materialisee = plan.ecrans.some((e) =>
          e.justification.some((j) => j.parcours === p.id && j.etape === i),
        );
        if (!materialisee)
          out.push(d("DERIVATION_ETAPE_SANS_ECRAN", `parcours[${p.id}].etapes[${i}]`, "aucun écran ne matérialise cette étape"));
      }
    }
    // R3-bis · V2 — TRAVERSABILITÉ PAR ACTEUR : un écran ne mélange pas les
    // acteurs (C1) — un chemin qui n'existe que pour un autre rôle ne compte
    // pas comme traversable.
    const acteurDeParcours = new Map(modele.parcours.map((p) => [p.id, p.acteur]));
    // EP-093 — L'ÉCRAN PARTAGÉ DE PORTÉE PUBLIQUE EXISTE (mesuré : la
    // marketplace t3, refusée à tort — acheteur ET vendeur parcourent
    // légitimement les écrans produit). V2 ne dit plus « jamais deux
    // acteurs » : il dit CE QU'IL A TOUJOURS VOULU DIRE — une étape posée
    // sur un écran qu'un acteur n'atteint jamais est une mort. Discriminant
    // STRUCTUREL, dérivé de l'existant (surfaces, origines, portées — 5e
    // vérification, aucune extension) :
    //   partageable ⇔ CHAQUE justification porte SA surface sur l'écran
    //   (l'acteur y accomplit une étape de SON parcours) ET toutes les
    //   portées sont PUBLIQUES (globale, resultat:*) — l'identité
    //   (acteur:*, instance:*) ne se partage JAMAIS.
    const surfacesParId = new Map(surfacesDe(modele).map((srf) => [srf.surfaceId, srf]));
    for (const e of plan.ecrans) {
      const acteurs = new Set(
        e.justification.map((j) => acteurDeParcours.get(j.parcours)).filter((a) => a !== undefined),
      );
      if (acteurs.size <= 1) continue;
      const etrangeres = e.justification.filter(
        (j) =>
          !e.surfaces.some((sid) =>
            (surfacesParId.get(sid)?.origine ?? []).some(
              (o) => o.parcours === j.parcours && o.etape === j.etape,
            ),
          ),
      );
      const privees = e.surfaces.filter((sid) => {
        const portee = surfacesParId.get(sid)?.portee ?? "";
        return !(portee === "globale" || portee.startsWith("resultat:"));
      });
      if (etrangeres.length > 0) {
        out.push(d("DERIVATION_TRAVERSEE_ACTEUR", `ecrans[${e.ecranId}]`,
          `étape étrangère à l'écran : ${etrangeres.map((j) => `${j.parcours}[${j.etape}]`).join(", ")} n'y porte aucune surface — un chemin qui n'existe que pour un autre rôle ne compte pas`));
      } else if (privees.length > 0) {
        out.push(d("DERIVATION_TRAVERSEE_ACTEUR", `ecrans[${e.ecranId}]`,
          `écran traversé par ${acteurs.size} acteurs avec surface NON publique (${privees.join(", ")}) — le partage vaut pour le public, jamais pour l'identité`));
      }
    }
  }
  for (const e of plan.ecrans) {
    if (e.justification.length === 0)
      out.push(d("PLAN_ECRAN_SANS_JUSTIFICATION", `ecrans[${e.ecranId}]`, "aucune étape de parcours ne justifie cet écran"));
  }
  for (const dst of plan.navigation.destinations) {
    if (!connus.has(dst))
      out.push(d("NAVIGATION_ROUTE_HORS_PLAN", `navigation.destinations[${dst}]`, "destination hors du plan"));
  }
  for (const [ai, arc] of plan.navigation.arcs.entries()) {
    if (arc.de !== undefined && !connus.has(arc.de))
      out.push(d("NAVIGATION_ROUTE_HORS_PLAN", `navigation.arcs[${ai}].de`, String(arc.de)));
    if (arc.vers !== undefined && !connus.has(arc.vers))
      out.push(d("NAVIGATION_ROUTE_HORS_PLAN", `navigation.arcs[${ai}].vers`, String(arc.vers)));
  }
  return out;
}

// ────────────────── R5 — NAVIGATION MÉCANISÉE DEPUIS P2d ──
//
// LE GÉNÉRATEUR PERD LE STYLO sur la STRUCTURE de navigation (F8/O.3) :
// entrée, jeu d'écrans, routes, destinations et leur ORDRE se PRESCRIVENT
// depuis le plan P2d, et toute divergence est REFUSÉE (fail-closed) — la
// gate de correspondance devient une vérification pure. ARBITRAGE CONSIGNÉ
// (L-R5-1) : les LIBELLÉS restent au générateur — le moteur n'écrit pas de
// texte naturel, et le modèle ne porte pas de libellés d'onglets ; le stylo
// COMPLET exigerait des libellés dérivables (AIR 2.x, décision séparée).

/** ecr_* du plan → scr_* de l'AIR — bijection MÉCANIQUE, zéro invention. */
export function ecranAirDe(ecranId) {
  return "scr_" + ecranId.slice(4);
}

/** Les PRESCRIPTIONS de navigation dérivées du plan P2d. */
export function prescriptionsNavigation(plan) {
  const ecrans = plan.ecrans.map((e) => ecranAirDe(e.ecranId));
  const destinations = plan.navigation.destinations.map(ecranAirDe);
  return {
    entree: destinations[0] ?? ecrans[0],
    ecrans,
    destinations,
    barre: plan.navigation.barre,
  };
}

/**
 * R5 — VÉRIFICATEUR FAIL-CLOSED : le document DOIT porter exactement la
 * structure prescrite (le générateur n'écrit que les libellés).
 */
export function verifierNavigationPrescrite(air, prescriptions) {
  const out = [];
  if (air.navigation.entryScreenId !== prescriptions.entree)
    out.push(d("NAVIGATION_ENTREE_HORS_PLAN", "navigation.entryScreenId",
      `${air.navigation.entryScreenId} ≠ prescrit ${prescriptions.entree}`));
  const idsEcrans = new Set(air.screens.map((x) => x.id));
  for (const scr of prescriptions.ecrans) {
    if (!idsEcrans.has(scr))
      out.push(d("NAVIGATION_ECRAN_PRESCRIT_MANQUANT", `screens[${scr}]`, "écran du plan absent du document"));
  }
  for (const scr of idsEcrans) {
    if (!prescriptions.ecrans.includes(scr))
      out.push(d("NAVIGATION_ECRAN_HORS_PLAN", `screens[${scr}]`, "écran absent du plan — aucun stylo libre"));
  }
  const routesVers = new Set(air.navigation.routes.map((r) => r.screenId));
  for (const scr of prescriptions.ecrans) {
    if (!routesVers.has(scr))
      out.push(d("NAVIGATION_ROUTE_PRESCRITE_MANQUANTE", `navigation.routes[${scr}]`, "route du plan absente"));
  }
  const declarees = (air.navigation.primary?.destinations ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((dst) => air.navigation.routes.find((r) => r.id === dst.routeId)?.screenId);
  if (prescriptions.barre) {
    const attendues = prescriptions.destinations;
    if (JSON.stringify(declarees) !== JSON.stringify(attendues))
      out.push(d("NAVIGATION_DESTINATIONS_HORS_PLAN", "navigation.primary",
        `ordre déclaré [${declarees.join(",")}] ≠ prescrit [${attendues.join(",")}]`));
  } else if (air.navigation.primary !== undefined) {
    out.push(d("NAVIGATION_BARRE_HORS_PLAN", "navigation.primary", "barre déclarée alors que le plan n'en prescrit pas"));
  }
  return out;
}

/**
 * R5 — OBLIGATIONS PRESCRIPTIVES dérivées du MODÈLE + PLAN, par passe :
 * le générateur NOMME et REMPLIT ; il ne choisit plus la structure.
 */
/**
 * EP-122 · ① — CE QUE LE PLAN DÉCIDE, IL LE TRANSMET. LE PRINCIPE, PAS LA LISTE.
 *
 * Mesuré (EP-121) : sur les 11 propriétés qu'une surface porte, **2** étaient
 * transmises. Les 9 autres — rôle, acteur, cardinalité, état, portée,
 * obligation d'état vide, identité, exclusions — étaient DÉCIDÉES et jamais
 * dites, et le générateur devinait. Quatre symptômes d'usage en découlaient
 * (chrome mal placé, portée de saisie perdue, attributs manquants, contenu
 * d'écran inventé). Il n'existe AUCUNE raison de principe pour qu'une
 * décision reste muette : la correction est donc le PRINCIPE — toute
 * propriété décidée entre aux obligations — et un CLIQUET de partition
 * (transmise | exclue avec raison) rend la 7e occurrence impossible.
 */
export const PROPRIETES_SURFACE_NON_TRANSMISES = {
  surfaceId: "c'est l'identifiant lui-même, déjà en tête de ligne",
  origine: "traçabilité interne du plan (parcours/étape), résumée par le compte de justifications",
};

/** La décision PORTÉE PAR UNE SURFACE, énoncée en toutes lettres. */
export function decisionDeSurface(surface) {
  const dits = Object.entries(surface)
    .filter(([cle]) => !(cle in PROPRIETES_SURFACE_NON_TRANSMISES))
    .map(([cle, valeur]) => `${cle}=${Array.isArray(valeur) ? (valeur.length === 0 ? "aucune" : valeur.join("/")) : String(valeur)}`);
  return dits.join(" · ");
}

export function obligationsPrescriptives(nomPasse, modele, plan) {
  const p = prescriptionsNavigation(plan);
  if (nomPasse === "base") {
    return [
      "PRESCRIPTIONS DE NAVIGATION (dérivées du plan — STRUCTURE NON NÉGOCIABLE, seuls les libellés t'appartiennent) :",
      `· entryScreenId = ${p.entree}`,
      `· écrans EXACTS du document : ${p.ecrans.join(", ")} — ni plus, ni moins`,
      `· une route par écran ; destinations principales DANS CET ORDRE : ${p.destinations.join(" → ")}${p.barre ? "" : " (AUCUNE barre primaire)"}`,
      // EP-073 · ① — LES ARCS SONT TRANSMIS, plus seulement jugés. Le juge R6
      // exigeait l'exécutabilité d'arcs que le générateur ne recevait JAMAIS
      // (les prescriptions portaient entrée/écrans/destinations/barre, pas les
      // arcs) : 5 familles tenues par règles INTERPOLÉES, la seule rouge était
      // jugée sur une donnée non transmise — précédent v3/v4, une prose ne
      // transmet pas. La liste est DÉRIVÉE du plan (P2d), jamais recopiée.
      `· ARCS DE NAVIGATION EXACTS — chaque arc exige une action EXÉCUTABLE (déclencheur ui dispatché depuis l'écran source, ou thenScreenId d'une mutation/capability honorée) ; un navigate à déclencheur non câblé ne satisfait RIEN : ${[...new Set(plan.navigation.arcs.filter((a) => a.de !== a.vers).map((a) => `${ecranAirDe(a.de)}->${ecranAirDe(a.vers)}`))].join(", ")}`,
      "Toute divergence structurelle est REFUSÉE mécaniquement.",
    ].join("\n");
  }
  // EP-102 · ② — LES ARCS SONT PRESCRITS À LA PASSE QUI LES CÂBLE.
  //
  // CAUSE RACINE MESURÉE (6 arcs morts sur 20, marketplace) : les arcs
  // étaient transmis à la passe `base` — celle qui écrit routes et
  // navigation — jamais à la passe qui écrit les ACTIONS. Le générateur ne
  // pouvait pas câbler ce qu'il ne recevait pas : même motif qu'EP-073, un
  // étage plus loin (jugé puis transmis, mais à la mauvaise passe).
  // Ce n'est donc PAS une ligne de prompt : c'est la TRANSMISSION.
  // La liste est DÉRIVÉE du plan (auto-arcs filtrés), jamais recopiée.
  if (nomPasse === "actions") {
    const arcs = [
      ...new Set(
        plan.navigation.arcs
          .filter((a) => a.de !== a.vers)
          .map((a) => `${ecranAirDe(a.de)}->${ecranAirDe(a.vers)}`),
      ),
    ];
    if (arcs.length === 0) return "";
    // EP-115 — L'ORDRE EST DONNÉ PAR ÉCRAN SOURCE, IMPÉRATIVEMENT.
    //
    // Mesuré (enquête EP-114) : la source ÉTAIT transmise (membre gauche de
    // `a->b`) et la règle énoncée — mais comme RÈGLE GÉNÉRALE en fin de bloc,
    // jamais comme ORDRE PAR ARC, et sans interdit explicite. Résultat : le
    // générateur câblait la CIBLE depuis la source qu'il jugeait naturelle
    // (7 arcs morts sur 22, 4 actions visant une cible sans aucune depuis la
    // source prescrite). Aucune donnée nouvelle ici : le MÊME plan, énoncé
    // par écran porteur — la forme de l'ordre suit celle du travail demandé.
    const parSource = new Map();
    for (const a of arcs) {
      const [de, vers] = a.split("->");
      if (!parSource.has(de)) parSource.set(de, []);
      parSource.get(de).push(vers);
    }
    return [
      "PRESCRIPTIONS D'ACTIONS (dérivées du plan — chaque arc EXIGE une action qui le rende EXÉCUTABLE) :",
      ...[...parSource.entries()].map(
        ([de, cibles]) =>
          `· DEPUIS l'écran "${de}", l'utilisateur DOIT pouvoir atteindre : ${cibles.join(", ")} — le déclencheur de chaque action vit SUR CET ÉCRAN (trigger ui sur un de ses blocs, ou prop actionId d'un de ses blocs), ou bien l'action est le \`thenScreenId\` d'une écriture réussie depuis cet écran.`,
      ),
      "· INTERDIT — une action qui mène à la même cible DEPUIS UN AUTRE ÉCRAN ne satisfait PAS l'arc : elle peut exister en plus, elle ne le remplace jamais. C'est la SOURCE qui fait la traversée, pas la destination.",
      "Un arc prescrit sans action exécutable depuis SA source est REFUSÉ mécaniquement.",
    ].join("\n");
  }
  if (nomPasse === "entites") {
    const concepts = modele.concepts.filter((c) => c.donnees);
    return [
      "PRESCRIPTIONS D'ENTITÉS (dérivées du modèle — une entité PAR concept porteur de données) :",
      // EP-122 — les attributs sont NOMMÉS un par un : le modèle en portait 7,
      // l'entité émise en avait 4 (mesuré EP-121). Une liste de natures ne dit
      // pas COMBIEN ni LESQUELS.
      ...concepts.map((c) => `· ent_${c.id.slice(4)} ← concept « ${c.nom} » (${c.id})${(c.attributs ?? []).length ? ` — ${(c.attributs ?? []).length} attributs, TOUS OBLIGATOIRES : ` + (c.attributs ?? []).map((a) => `${a.id}:${a.nature}${a.requis ? " (requis)" : ""}`).join(", ") : ""}`),
      "N'en invente aucune autre porteuse de données ; n'en omets aucune.",
    ].join("\n");
  }
  if (nomPasse === "ecrans") {
    // EP-118 — CE QUE LE PLAN A DÉCIDÉ, IL LE TRANSMET. Les élections
    // consommées PAR PORTÉE (EP-070) établissent un lien élu→parcouru que le
    // plan utilisait pour ACCEPTER sans jamais le dire : la collection
    // présentée doit être SCOPÉE sur l'instance élue, sinon l'identité
    // transportée est perdue (C4, mesuré : dernière famille bloquante).
    // Le domaine est fourni avec l'ordre (leçon EP-113) : le concept élu est
    // nommé, la valeur attendue est le champ `reference` qui le vise.
    const portees = consommationsParPortee(modele).map((c) => {
      const ecran = plan.ecrans.find((e) =>
        e.justification.some(
          (j) => j.parcours === c.parcours && j.etape === c.etapeConsommation,
        ),
      );
      return ecran === undefined
        ? ""
        : `· ${ecranAirDe(ecran.ecranId)} présente les « ${c.parcouru} » DE L'INSTANCE de « ${c.elu} » choisie juste avant : sa liste DOIT porter \`scopeFieldId\` = le champ \`reference\` de ${c.parcouru} qui vise ${c.elu}. Sans lui, l'instance choisie est PERDUE et l'écran montre tout le catalogue.`;
    }).filter((l) => l !== "");
    const parSurface = new Map(surfacesDe(modele).map((sf) => [sf.surfaceId, sf]));
    return [
      "PRESCRIPTIONS D'ÉCRANS (dérivés du plan — chaque écran est JUSTIFIÉ par ses étapes) :",
      ...plan.ecrans.map((e) => {
        const decisions = e.surfaces
          .map((sid) => {
            const sf = parSurface.get(sid);
            return sf === undefined ? `${sid} (chrome)` : `${sid} [${decisionDeSurface(sf)}]`;
          })
          .join(" ; ");
        const porteLeChrome = plan.chrome.some((c) => e.surfaces.includes(c));
        return `· ${ecranAirDe(e.ecranId)} — surfaces : ${decisions} (justifié par ${e.justification.length} étape(s))${porteLeChrome ? " — PORTE LE CHROME" : " — SANS chrome"}`;
      }),
      // EP-125 — LA RÈGLE DU SCOPE DEVIENT UNE OBLIGATION PERMANENTE.
      //
      // Mesuré : EP-113 avait la BONNE règle (scoper et poser le détail sont
      // indissociables) — mais elle vivait UNIQUEMENT dans le message d'un
      // diagnostic RÉACTIF, donc transmise seulement si ce diagnostic était
      // émis. Le run 20-18 le prouve : attempt1 ne portait QUE des erreurs de
      // SCHÉMA, aucun AIR_CIBLE_IDENTITE_PERDUE ⇒ la règle n'a JAMAIS été
      // dite, et le générateur a scopé une liste sur un écran sans détail.
      // Le défaut n'était ni la règle ni le générateur : c'était le CANAL.
      // Principe EP-122 appliqué : ce que le moteur exige, il le dit TOUJOURS.
      "· PORTÉE D'UNE COLLECTION (`scopeFieldId`) — RÈGLE PERMANENTE : une liste ne porte `scopeFieldId` QUE sur un écran qui montre AUSSI le `detail_header` de l'instance visée ; la valeur est un champ `reference` de l'entité listée pointant l'entité de ce détail. Sur un écran SANS `detail_header`, un `scopeFieldId` est INVALIDE — la portée n'a aucune instance courante et l'émission entière est REFUSÉE.",
      `· CHROME : les surfaces persistantes (${plan.chrome.length === 0 ? "aucune" : plan.chrome.join(", ")}) ne vivent QUE sur les écrans marqués « PORTE LE CHROME » — nulle part ailleurs.`,
      `· BARRE PRIMAIRE : elle appartient aux écrans RACINES (${prescriptionsNavigation(plan).destinations.join(", ")}) ; les écrans de FLUX (saisie, confirmation, paiement, retrait) ne la portent PAS (showsPrimaryNav: false).`,
      ...(portees.length === 0
        ? []
        : ["PORTÉES OBLIGATOIRES (une élection consommée par portée se MATÉRIALISE) :", ...portees]),
      "Le NOMBRE d'écrans est une sortie du plan : ni écran libre, ni écran manquant.",
    ].join("\n");
  }
  return "";
}
