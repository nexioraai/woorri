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
    version: z.literal("modele-metier/1.0.0"),
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
          attributs: z
            .array(
              z
                .object({
                  id,
                  nature: z.enum(NATURES_ATTRIBUT),
                  requis: z.boolean(),
                  cardinalite: z.number().int().min(1).optional(),
                })
                .strict(),
            )
            .optional(),
          etats: z.array(z.string().min(1)).optional(),
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
          etapes: z
            .array(
              z.object({ concept: id, geste: z.enum(GESTES), etat: z.string().optional() }).strict(),
            )
            .min(2),
        })
        .strict(),
    ),
  })
  .strict();

const d = (code, path, message) => ({ code, path, message });

/**
 * P1 — validation DÉTERMINISTE : forme, références, SUFFISANCE (F1).
 * Aucun jugement libre : chaque refus est un invariant nommé.
 */
export function validerModele(brut) {
  const parsed = modeleMetierSchema.safeParse(brut);
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
      } else if (e.etat !== undefined && !(concept.etats ?? []).includes(e.etat)) {
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
