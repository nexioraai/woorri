// ============================================================
// L'ORCHESTRATION DES HUIT PASSES — EXTRAITE DE `emit-v3.mjs` LE 2026-10-08.
//
// ── POURQUOI, APRES `emission-coeur.mjs`.
//
// Le coeur a ete extrait le 2026-10-07 : il sait appeler UNE passe
// (`callPart`), lire un registre, degrader une grammaire. Il ne sait pas
// ENCHAINER les huit. Cette boucle-la — celle qui accumule les sections,
// pose les obligations de chaque passe, relance un refus, et repare ce que
// les juges refusent — etait restee dans le script.
//
// CONSEQUENCE MESUREE : le site a branche P0, puis une derivation ECRITE A
// LA MAIN (`apps/web/src/lib/apps/derivation.ts`, 297 lignes). Tir reel sur
// la marketplace du proprietaire :
//
//     entites 5 · ecrans 8 · compileWeb 72 fichiers
//     actions 0 · regles 0 · capacites 0 · intent ABSENT
//
// Huit ecrans qui s'affichent et ou il ne se passe RIEN. Les etats de
// commande, le bouton WhatsApp, l'appel direct, le paiement mobile money —
// tout cela vit dans `actions`, `rules`, `capabilities` et `intent`,
// c'est-a-dire dans les passes que personne n'appelait.
//
// ── TEL QUEL, Y COMPRIS L'INDENTATION.
//
// Meme regle que pour le coeur, et pour la meme raison : des controles
// DECOUPENT ce source par reperes textuels. La premiere extraction avait ete
// reindentee de deux espaces et deux cliquets sont tombes. Le bloc est
// deplace, pas remis en page.
//
// ── UNE FABRIQUE, PAS DES EXPORTS DIRECTS.
//
// Onze dependances, relevees dans le bloc par analyse de portee — pas
// supposees. Six viennent du script, cinq du coeur. Les exporter directement
// reconduirait le defaut qu'on corrige : un simple import suffirait a
// construire un client et a engager une depense.
// ============================================================

/** Construit l'orchestration des passes a partir des dependances du script. */
export function creerOrchestration({
  adaptateur,
  modeleMetier,
  presentation,
  preservation,
  acceptation,
  obligationsPourPasse,
  PARTS,
  partsPour,
  SYSTEM_EMIT,
  callPart,
  extractJson,
}) {

function contexteClient(intention) {
  const demande = `DEMANDE DU CLIENT :\n${intention.text}`;
  if (intention.preferences === undefined) return demande;
  return (
    `${demande}\n\n` +
    `PRÉFÉRENCES DE PRÉSENTATION DU PROPRIÉTAIRE — elles portent sur ce que ` +
    `l'on VOIT, jamais sur ce que l'application FAIT. Honore-les quand elles ` +
    `ne contredisent NI le plan prescrit, NI une règle de ce prompt : ` +
    `celles-là sont imposées par les magasins et ne se négocient pas. Si une ` +
    `préférence contredit une règle, SUIS LA RÈGLE et n'invente aucun ` +
    `compromis.\n${intention.preferences}`
  );
}

async function emitSections(system, contextText, label, usage, refusals, accumulateur, prescriptif) {
  const assembled = accumulateur ?? {};
  for (const part of partsPour(prescriptif)) {
    // Étape ⑤ — les OBLIGATIONS dérivées mécaniquement des sections émises :
    // identifiants promis, cibles autorisées. Zéro coût, zéro supposition.
    const obligations = [
      obligationsPourPasse(part.base ?? part.name, assembled),
      // R5 — quand un modèle existe, la STRUCTURE est PRESCRITE.
      prescriptif === undefined
        ? ""
        : modeleMetier.obligationsPrescriptives(part.base ?? part.name, prescriptif.modele, prescriptif.plan, presentation.DESTINATIONS_MIN),
    ].filter((x) => x !== "").join("\n\n");
    // EP-173 — UN LOT DIT EXACTEMENT CE QU'IL PORTE, et rien d'autre.
    const perimetreDuLot =
      part.base !== "ecrans"
        ? ""
        : part.surfaces === true
          ? `\n\nCE LOT PORTE UNIQUEMENT LES ÉCRANS DE SURFACE (règle 41 — ceux qui se déclarent par \`purpose\`). N'ÉMETS AUCUN écran de parcours : ils ont été émis dans les lots précédents et figurent dans les sections déjà émises.`
          : `\n\nCE LOT PORTE EXACTEMENT CES ÉCRANS, NI PLUS NI MOINS : ${part.ecransAttendus.map((e) => modeleMetier.ecranAirDe(e)).join(", ")}. Les autres écrans du plan sont émis dans d'autres lots — ne les émets pas ici, ne les anticipe pas.`;
    const user =
      `${contextText}\n\nSECTIONS À ÉMETTRE MAINTENANT : ${part.keys.join(", ")}.${perimetreDuLot}` +
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
    const emis = extractJson(response);
    if (part.accumule !== undefined) {
      // SANS CECI, CHAQUE LOT EFFACERAIT LE PRÉCÉDENT et le document ne
      // porterait que les écrans du dernier appel.
      const cle = part.accumule;
      assembled[cle] = [...(assembled[cle] ?? []), ...(emis[cle] ?? [])];
      for (const [k, v] of Object.entries(emis)) if (k !== cle) assembled[k] = v;
    } else {
      Object.assign(assembled, emis);
    }
    // EP-169 ① — LE VERDICT DE LA BASE EST RENDU DÈS LA BASE.
    //
    // MESURÉ sur EP-168 : le run s'est arrêté avant les écrans, et le
    // document portait DÉJÀ une barre fausse (« Rechercher » en première
    // destination, « Mon compte » au lieu de « Compte »). Les juges qui le
    // disent existaient, étaient branchés, et n'ont rien dit — parce qu'ils
    // ne sont appelés que sur un document COMPLET. 21 minutes et 1,21 $ plus
    // tard, personne n'avait ce verdict.
    //
    // PUBLIÉ, JAMAIS BLOQUANT : interrompre une émission à mi-course
    // changerait la dynamique du run, et EP-168 vient de rappeler ce qu'on
    // perd à modifier un comportement juste avant de payer.
    if (part.name === "base") {
      const verdictBase = acceptation.jugerBase(assembled, {
        ecransDIdentite: prescriptif?.ecransDIdentite ?? [],
      });
      for (const v of verdictBase) {
        console.log(`  ⚠ [base] ${v.code} — ${String(v.message ?? "").slice(0, 160)}`);
      }
      if (verdictBase.length > 0) refusals.verdictBase = verdictBase.map((v) => v.code);
    }
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
        : modeleMetier.obligationsPrescriptives(part.name, prescriptif.modele, prescriptif.plan, presentation.DESTINATIONS_MIN);
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
return { contexteClient, emitSections, emitSectionsAvecPartiel, repairSections, repairSectionsAvecPartiel };
}
