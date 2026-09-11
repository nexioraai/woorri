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

export const NATURES_ATTRIBUT = ["texte", "nombre", "media", "date", "booleen", "reference"];

/**
 * TABLE DES GESTES — patrons structurels FERMÉS, dérivés de l'enveloppe
 * (confrontations #4/#6/#8). `retirer` entre par F7 : l'enveloppe exécute
 * `mutation delete`, une étape peut donc RÉDUIRE une collection.
 */
export const GESTES = [
  "decouvrir",
  "chercher",
  "consulter",
  "choisir",
  "saisir",
  "confirmer",
  "consulter_historique",
  "s_identifier",
  "payer",
  "retirer",
];

/** Gestes dont la preuve est OBSERVABLE — un parcours doit finir par l'un d'eux. */
export const GESTES_TERMINAUX = ["confirmer", "consulter", "consulter_historique"];

// `.strict()` PARTOUT : toute clé hors contrat est un REFUS — c'est le
// verrou F4 (un `visuel` déclaré ne passe pas) et l'anti-fourre-tout.
export const modeleMetierSchema = z
  .object({
    version: z.literal("modele-metier/1.1.0"),
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
                      z.object({ vers: z.string().min(1), geste: z.enum(GESTES) }).strict(),
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

const d = (code, path, message) => ({ code, path, message });

/**
 * R2 — MIGRATION 1.0.0 → 1.1.0, même patron que l'AIR : additive, jamais
 * inventive. Seule transformation : les états chaînes deviennent des états
 * structurés SANS transitions (aucune n'est inventée).
 */
export function migrerModele(brut) {
  if (brut === null || typeof brut !== "object") return brut;
  if (brut.version !== "modele-metier/1.0.0") return brut;
  // COPIE PAR LISTE FERMÉE de clés — jamais un spread : une migration qui
  // recopierait des clés inconnues BLANCHIRAIT un champ étranger (mesuré :
  // le piège C3 a vu le spread énumérer `texteOriginal`). Les clés hors
  // contrat meurent ici ; le schéma strict refuse de toute façon.
  return {
    version: "modele-metier/1.1.0",
    couverture: brut.couverture,
    acteurs: brut.acteurs,
    concepts: (brut.concepts ?? []).map((c) =>
      Array.isArray(c?.etats) && c.etats.every((e) => typeof e === "string")
        ? { ...c, etats: c.etats.map((e) => ({ id: e })) }
        : c,
    ),
    relations: brut.relations,
    parcours: brut.parcours,
  };
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
  // ── R2 — INVARIANTS DES ÉTATS MÉTIER (E, #6) ──
  for (const c of m.concepts) {
    const etats = c.etats ?? [];
    const ids = new Set(etats.map((x) => x.id));
    const atteints = new Set(etats.flatMap((x) => (x.transitions ?? []).map((t) => t.vers)));
    for (const e of etats) {
      for (const [ti, t] of (e.transitions ?? []).entries()) {
        if (!ids.has(t.vers))
          out.push(d("MODELE_TRANSITION_INCONNUE", `concepts[${c.id}].etats[${e.id}].transitions[${ti}]`, t.vers));
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

/** Rôle de surface DÉRIVÉ du geste (jamais déclaré, jamais sectoriel). */
export const ROLE_PAR_GESTE = {
  decouvrir: "decouverte",
  chercher: "recherche",
  consulter: "detail",
  choisir: "choix",
  saisir: "saisie",
  confirmer: "confirmation",
  consulter_historique: "historique",
  s_identifier: "identite",
  payer: "paiement",
  retirer: "retrait",
};

/** Cardinalité de la surface d'un geste : une instance identifiée, ou N. */
const CARDINALITE_PAR_GESTE = {
  consulter: "instance",
  saisir: "instance",
  confirmer: "singleton",
  s_identifier: "singleton",
};

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
  const prec = parcours.etapes[index - 1];
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
  return [...table.values()];
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
export const TABLE_GESTES = {
  decouvrir:            { bloc: "list",         declencheur: null, effet: null,         transport: null,      preuve: "section rendue, données présentes" },
  chercher:             { bloc: "search_entry", declencheur: "ui", effet: "navigate",   transport: null,      preuve: "paire structurelle complète" },
  consulter:            { bloc: "list",         declencheur: "ui", effet: "navigate",   transport: "itemId",  preuve: "détail de l'instance identifiée" },
  choisir:              { bloc: "list",         declencheur: "ui", effet: "navigate",   transport: "itemId",  preuve: "identité élue consommée en aval" },
  saisir:               { bloc: "form",         declencheur: "ui", effet: "mutation",   transport: "instance",preuve: "écriture réelle (règle 13)" },
  confirmer:            { bloc: null,           declencheur: null, effet: "mutation",   transport: null,      preuve: "écran de confirmation atteint (thenScreenId)" },
  consulter_historique: { bloc: "list",         declencheur: "ui", effet: "navigate",   transport: null,      preuve: "collection filtrée sur l'état nommé" },
  s_identifier:         { bloc: "form",         declencheur: "ui", effet: "capability", transport: null,      preuve: "méthode auth exécutée (enveloppe véridique R1)" },
  payer:                { bloc: "form",         declencheur: "ui", effet: "mutation",   transport: null,      preuve: "capacité déclarée, honnêteté règle 17" },
  retirer:              { bloc: "list",         declencheur: "ui", effet: "mutation",   transport: "itemId",  preuve: "collection réduite, état vide atteignable" },
};

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
