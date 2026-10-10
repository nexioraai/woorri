// ════════════════════════════════════════════════════════════════════
//  LE CLIQUET D'ÉMISSION — UN DOCUMENT NEUF DIT À QUI SONT SES DONNÉES.
//
// ── POURQUOI IL EXISTE ICI ET PAS DANS LE CONTRAT.
//
// Le juge du contrat (`validate.ts`) ne mord que sur les documents qui ont
// un modèle d'identité. Raison mesurée : quatorze documents du corpus GELÉ
// v3 n'en ont aucun — ils datent d'avant `instanceFrom: "session"` (1.13.0)
// et `access` (1.28.0). Les refuser casserait des empreintes figées sans
// bénéfice : ils ne sont jamais déployés.
//
// ⚠️ MAIS ILS PORTENT LA FAILLE EN SUBSTANCE : `bus-intercites` laisse
// modifier et SUPPRIMER la fiche de n'importe quel voyageur depuis le
// client. Ce ne sont PAS des exemples sûrs, et ce fichier existe pour
// qu'aucun document NEUF ne leur ressemble.
//
// ── CE QU'IL EXIGE, ET D'OÙ IL LE SAIT.
//
// Le MODÈLE est l'autorité : `estConceptIdentite` sait déjà quel concept
// porte les personnes (volet ② de la convergence, éprouvé au feu). Si le
// modèle en déclare un ET que le document émis mute l'entité correspondante
// SANS déclarer son modèle d'identité — ni `access`, ni une mutation
// `instanceFrom: "session"` — alors le document ne peut pas dire à qui
// appartient une ligne de personnes. Il est refusé à l'ÉMISSION.
//
// Ce cliquet ne juge JAMAIS un document importé : il n'est appelé que par le
// moteur, sur ce que le moteur vient d'émettre.
// ════════════════════════════════════════════════════════════════════

/** Le code de diagnostic — une seule famille, nommée. */
export const CODE_PROPRIETE_ABSENTE = "AIR_PROPRIETE_PERSONNES_INDECLAREE";

/**
 * @param {object} o
 * @param {Record<string, unknown>} o.air        le document émis (déjà valide au schéma)
 * @param {Record<string, unknown>} o.modele     le modèle P0, autorité de l'identité
 * @param {{ estConceptIdentite: Function, nomAirDe: Function }} o.derivations
 * @returns {{ code: string, path: string, message: string }[]}
 */
export function jugerProprieteDesPersonnes({ air, modele, derivations }) {
  const concepts = Array.isArray(modele?.concepts) ? modele.concepts : [];
  const identitaires = concepts
    .filter((c) => derivations.estConceptIdentite(modele, c.id))
    .map((c) => derivations.nomAirDe(c.id));
  if (identitaires.length === 0) return []; // pas de personnes : rien à posséder

  // LE MODÈLE D'IDENTITÉ DU DOCUMENT : un bloc `access`, ou une écriture qui
  // vise « la ligne de la PERSONNE CONNECTÉE ».
  const actions = Array.isArray(air?.actions) ? air.actions : [];
  const declareUneSession = actions.some(
    (a) => a?.effect?.kind === "mutation" && a.effect.instanceFrom === "session",
  );
  if (air?.access !== undefined || declareUneSession) return [];

  // Aucun modèle d'identité. Le document mute-t-il quand même une entité de
  // personnes ? Si oui, il ne peut pas dire à qui appartient cette ligne.
  const entites = Array.isArray(air?.entities) ? air.entities : [];
  const parNom = new Map(entites.map((e) => [e.name, e.id]));
  const diagnostics = [];
  for (const nom of identitaires) {
    const entiteId = parNom.get(nom);
    if (entiteId === undefined) continue;
    actions.forEach((a, i) => {
      if (a?.effect?.kind !== "mutation" || a.effect.entityId !== entiteId) return;
      diagnostics.push({
        code: CODE_PROPRIETE_ABSENTE,
        path: `actions[${String(i)}].effect`,
        message:
          `l'action "${String(a.id)}" ${String(a.effect.operation)} la table des personnes ` +
          `"${entiteId}" alors que le document ne déclare AUCUN modèle d'identité : ni bloc ` +
          `\`access\`, ni écriture \`instanceFrom: "session"\`. Rien ne dit donc à qui ` +
          `appartient une ligne — et une table de personnes modifiable sans propriétaire ` +
          `déclaré laisse n'importe qui modifier ou supprimer la fiche de n'importe qui ` +
          `(forme exacte de la faille qui a exposé 170 applications ailleurs). Déclarez ` +
          `\`instanceFrom: "session"\` sur les écritures de compte, ou un bloc \`access\`.`,
      });
    });
  }
  return diagnostics;
}
