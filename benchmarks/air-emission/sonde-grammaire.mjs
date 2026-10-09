// ============================================================
// LA SONDE DE GRAMMAIRE — on MESURE le niveau acceptable, on ne le devine pas.
//
// ── LE DEFAUT QU'ELLE FERME, MESURE LE 2026-10-08.
//
// L'echelle de `schema-levels.mjs` propose trois niveaux par passe. La
// descente d'un niveau au suivant n'est armee que par UN signal :
// `estErreurGrammaire(e)` → `e?.status === 400`.
//
// Or le service ne repond pas toujours 400 sur une grammaire qu'il refuse.
// Trois tirs par niveau, a cout nul :
//
//     entites niveau 0 → delai · trop complexe · delai
//     entites niveau 1 → delai · trop complexe · delai
//     entites niveau 2 → ACCEPTEE · ACCEPTEE · ACCEPTEE
//
// Deux refus sur trois arrivent donc sous forme de DELAI. Un delai n'a pas
// de `status 400` : `callPart` jette au niveau 0 au lieu de descendre au
// niveau 2, qui serait accepte. D'ou l'intermittence — meme demande, meme
// grammaire, une fois ca passe et une fois ca meurt.
//
// ── CE QU'ELLE N'EST PAS : UNE INFERENCE.
//
// Le depot interdit de deduire une incompatibilite du TEXTE d'une erreur, et
// cette sonde ne lit AUCUN texte. Elle pose une question au service — « ce
// schema, tu le prends ? » — et elle retient sa reponse. Un appel qui
// aboutit dit oui. Un appel qui echoue, quelle qu'en soit la raison, ne dit
// pas oui. C'est tout ce qu'on lui demande de savoir.
//
// C'est aussi pourquoi elle ne touche NI le contrat AIR, NI l'echelle, NI
// aucun module scelle : elle choisit un niveau DEJA construit par l'echelle,
// elle n'en fabrique pas.
//
// ── LE NIVEAU RETENU EST LE PLUS CONTRAINT QUI PASSE.
//
// Les niveaux sont ordonnes du plus contraint au plus degrade. La sonde
// monte dans cet ordre et S'ARRETE au premier accepte : jamais elle ne
// descend plus bas que necessaire. Affaiblir une grammaire qui serait passee
// telle quelle, ce serait perdre des garanties pour rien — un cliquet le
// verifie avec un service simule.
//
// ── PLUSIEURS TENTATIVES PAR NIVEAU, ET C'EST LA GARDE IMPORTANTE.
//
// Un delai reseau ordinaire ferait sinon descendre d'un cran une grammaire
// parfaitement acceptable : la sonde deviendrait le « refus silencieux »
// qu'on a justement ecarte. Un niveau n'est donc abandonne qu'apres
// PLUSIEURS echecs. La mesure le permet : un niveau acceptable repond
// instantanement, trois fois sur trois.
//
// ── COUT.
//
// Un refus ne facture rien. Une sonde acceptee facture l'entree du schema et
// UN jeton de sortie — mesure autour de 0,01 $ par passe. Elle protege une
// emission a plusieurs dollars, et supprime les delais de 45 a 90 secondes
// que la chaine subissait a chaque niveau refuse.
// ============================================================

/** Construit la sonde. Rien ne part tant que `sonder` n'est pas appelee. */
export function creerSondeGrammaire({ client, adaptateur, tentativesParNiveau = 2 }) {
  // La charge utile la plus courte possible : seul le SCHEMA est mesure.
  const essai = (schema) =>
    client.messages.create(
      adaptateur.construireAppelCampagne(
        { system: "x", user: "x", grammaire: schema },
        { max_tokens: 1 },
      ),
    );

  /**
   * Le premier niveau ACCEPTE d'une passe, ou `null` si aucun ne l'est.
   *
   * AUCUN TEXTE D'ERREUR N'EST LU — pas meme le statut. Seule compte la
   * question : l'appel a-t-il abouti ?
   */
  async function niveauAccepte(part) {
    const journal = [];
    for (let i = 0; i < part.levels.length; i++) {
      for (let t = 1; t <= tentativesParNiveau; t++) {
        try {
          const reponse = await essai(part.levels[i].schema);
          journal.push({ niveau: i, nom: part.levels[i].name, verdict: "accepte", tentatives: t });
          // L'USAGE DE LA SONDE ACCEPTEE EST RENDU — premier tir reel : la
          // tranche 1 a travaille 303 s et la table affichait 0,0000 $. Les
          // sondes ne passent pas par `callPart`, donc ni le compteur de
          // depense ni les jetons ne les voyaient : de l'argent reel non
          // enregistre. Un refus, lui, ne facture rien — rien a capturer.
          return { niveau: i, journal, usage: reponse?.usage ?? null };
        } catch {
          // Volontairement vide : la raison n'entre pas dans la decision.
        }
      }
      journal.push({ niveau: i, nom: part.levels[i].name, verdict: "refuse", tentatives: tentativesParNiveau });
    }
    return { niveau: null, journal };
  }

  /**
   * Sonde TOUTES les passes, EN PARALLELE.
   *
   * Les passes sont independantes : les sonder l'une apres l'autre
   * ajouterait leur latence bout a bout pour rien. A l'interieur d'une
   * passe, en revanche, l'ordre est la decision elle-meme — on monte du plus
   * contraint au plus degrade et on s'arrete.
   *
   * `part.levelIndex` est POSITIONNE sur le niveau retenu : `callPart`
   * commence sa boucle a cet indice, et sa degradation reste disponible
   * au-dela. La sonde avance le point de depart, elle ne retire rien.
   */
  async function sonder(parts) {
    const resultats = await Promise.all(
      parts.map(async (part) => ({ part, ...(await niveauAccepte(part)) })),
    );
    const rapport = [];
    for (const { part, niveau, journal, usage } of resultats) {
      if (niveau !== null) part.levelIndex = niveau;
      rapport.push({
        passe: part.name,
        niveau,
        nom: niveau === null ? null : part.levels[niveau].name,
        essais: journal.length,
        usage: usage ?? null,
      });
    }
    return rapport;
  }

  return { sonder, niveauAccepte };
}
