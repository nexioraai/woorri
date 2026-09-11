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

// `.strict()` PARTOUT : toute clé hors contrat est un REFUS — c'est le
// verrou F4 (un `visuel` déclaré ne passe pas) et l'anti-fourre-tout.
export const modeleMetierSchema = z
  .object({
    version: z.literal("modele-metier/1.1.0"),
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
  decouvrir:            { bloc: "list",         declencheur: null, effet: null,         transport: null,      terminal: false, preuve: "section rendue, données présentes" },
  chercher:             { bloc: "search_entry", declencheur: "ui", effet: "navigate",   transport: null,      terminal: false, preuve: "paire structurelle complète" },
  consulter:            { bloc: "list",         declencheur: "ui", effet: "navigate",   transport: "itemId",  terminal: true,  preuve: "détail de l'instance identifiée" },
  choisir:              { bloc: "list",         declencheur: "ui", effet: "navigate",   transport: "itemId",  terminal: false, preuve: "identité élue consommée en aval" },
  saisir:               { bloc: "form",         declencheur: "ui", effet: "mutation",   transport: "instance",terminal: false, preuve: "écriture réelle (règle 13)" },
  confirmer:            { bloc: null,           declencheur: null, effet: "mutation",   transport: null,      terminal: true,  preuve: "écran de confirmation atteint (thenScreenId)" },
  consulter_historique: { bloc: "list",         declencheur: "ui", effet: "navigate",   transport: null,      terminal: true,  preuve: "collection filtrée sur l'état nommé" },
  s_identifier:         { bloc: "form",         declencheur: "ui", effet: "capability", transport: null,      terminal: false, preuve: "méthode auth exécutée (enveloppe véridique R1)" },
  payer:                { bloc: "form",         declencheur: "ui", effet: "mutation",   transport: null,      terminal: false, preuve: "capacité déclarée, honnêteté règle 17" },
  retirer:              { bloc: "list",         declencheur: "ui", effet: "mutation",   transport: "itemId",  terminal: false, preuve: "collection réduite, état vide atteignable" },
};

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
  const gestesPresents = new Set(modele.parcours.flatMap((p) => p.etapes.map((e) => e.geste)));
  if (gestesPresents.has("s_identifier")) {
    const etape = modele.parcours
      .flatMap((p) => p.etapes)
      .find((e) => e.geste === "s_identifier");
    capacites.push({ capacite: "auth", profilConceptId: etape?.concept });
  }
  if (gestesPresents.has("payer")) {
    // D6 EP-029 : le discriminant EXISTE désormais au modèle (commerce).
    // Sans lui, P1 a déjà refusé (MODELE_COMMERCE_ABSENT) — ici, dériver.
    if (modele.commerce === "digital") {
      capacites.push({ capacite: "payments.iap" });
    } else if (modele.commerce === "physique_ou_hors_app") {
      capacites.push({ capacite: "payments.psp" });
    } else {
      diagnostics.push(
        d("DISCRIMINANT_ABSENT", "capacites[payer]",
          "commerce absent du modèle — refusé en amont par MODELE_COMMERCE_ABSENT"),
      );
    }
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
      // (a) `consulter` CONSOMME : source d'identité en amont PROPAGÉ (J1 —
      // les transparentes s'ignorent), du MÊME concept. J2 : un concept
      // d'IDENTITÉ DE L'ACTEUR (discriminant structurel s_identifier) se
      // consulte sans ligne — singleton de soi, aucune source exigée.
      if (e.geste === "consulter" && !estConceptIdentite(modele, e.concept)) {
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
    for (const e of plan.ecrans) {
      const acteurs = new Set(
        e.justification.map((j) => acteurDeParcours.get(j.parcours)).filter((a) => a !== undefined),
      );
      if (acteurs.size > 1)
        out.push(d("DERIVATION_TRAVERSEE_ACTEUR", `ecrans[${e.ecranId}]`, `écran traversé par ${acteurs.size} acteurs : ${[...acteurs].join(", ")}`));
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
export function obligationsPrescriptives(nomPasse, modele, plan) {
  const p = prescriptionsNavigation(plan);
  if (nomPasse === "base") {
    return [
      "PRESCRIPTIONS DE NAVIGATION (dérivées du plan — STRUCTURE NON NÉGOCIABLE, seuls les libellés t'appartiennent) :",
      `· entryScreenId = ${p.entree}`,
      `· écrans EXACTS du document : ${p.ecrans.join(", ")} — ni plus, ni moins`,
      `· une route par écran ; destinations principales DANS CET ORDRE : ${p.destinations.join(" → ")}${p.barre ? "" : " (AUCUNE barre primaire)"}`,
      "Toute divergence structurelle est REFUSÉE mécaniquement.",
    ].join("\n");
  }
  if (nomPasse === "entites") {
    const concepts = modele.concepts.filter((c) => c.donnees);
    return [
      "PRESCRIPTIONS D'ENTITÉS (dérivées du modèle — une entité PAR concept porteur de données) :",
      ...concepts.map((c) => `· ent_${c.id.slice(4)} ← concept « ${c.nom} » (${c.id})${(c.attributs ?? []).length ? " — attributs attendus : " + (c.attributs ?? []).map((a) => a.nature).join(", ") : ""}`),
      "N'en invente aucune autre porteuse de données ; n'en omets aucune.",
    ].join("\n");
  }
  if (nomPasse === "ecrans") {
    return [
      "PRESCRIPTIONS D'ÉCRANS (dérivés du plan — chaque écran est JUSTIFIÉ par ses étapes) :",
      ...plan.ecrans.map((e) => `· ${ecranAirDe(e.ecranId)} — surfaces : ${e.surfaces.join(", ")} (justifié par ${e.justification.length} étape(s))`),
      "Le NOMBRE d'écrans est une sortie du plan : ni écran libre, ni écran manquant.",
    ].join("\n");
  }
  return "";
}
