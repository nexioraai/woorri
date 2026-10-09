// ============================================================
// LA GATE ANTI-OSCILLATION — DEMENAGEE DE `emit-v3.mjs` LE 2026-10-09.
//
// ── CE QU'ELLE DECIDE (EP-073 · D-088 · EP-102).
//
// Une reparation qui INTRODUIT des diagnostics absents de la base detruit
// en reparant : elle est REJETEE, la base conservee. SAUF revelation : si la
// reparation ELARGIT le perimetre de jugement (elle rend jugeable ce qui ne
// l'etait pas), les diagnostics apparus sont REVELES, pas introduits — elle
// est retenue et devient la nouvelle base.
//
// ── POURQUOI ELLE DEMENAGE : le defaut mesure au tir reel n°2.
//
// La campagne portait cette gate ; le pipeline du produit N'EN AVAIT PAS —
// une reparation qui n'ampute pas remplacait le document SANS EXAMEN, meme
// pire qu'avant. La regle doit etre UNE : elle vit ici, la campagne et le
// produit la consomment tous deux.
//
// ── VERBATIM MODULO RENOMMAGES DECLARES — et c'est dit, pas maquille.
//
// Le noyau lisait des noms locaux de campagne (`journal.attempt1`,
// `avantReparation`). Un byte-identique strict est donc impossible, et le
// pretendre serait un faux. `extraction-gate.verif.mjs` porte la TABLE des
// cinq renommages, l'applique MECANIQUEMENT en sens inverse, et exige
// l'egalite A L'OCTET avec le texte d'origine (empreinte 832851e5…). Tout
// ecart hors de la table est un refus. L'indentation d'origine est
// conservee — les instruments de ce depot lisent le source comme du texte.
// ============================================================

/** Construit la gate. Dependances injectees : rien ne se construit a l'import. */
export function creerGateReparation({ validateLocal, perimetreDeJugement, elargit }) {
  /**
   * Le verdict d'un tour de reparation.
   *
   * `diagnosticsAvant` : la base (code|path). `diagnosticsApres` : apres
   * revalidation du candidat. `documentAvant` : la base brute (son air est
   * recalcule ici, comme dans la campagne). `airApres` : l'air du candidat.
   */
  function verdict({ diagnosticsAvant, diagnosticsApres, documentAvant, airApres, prescriptif }) {
    // ── NOYAU DEMENAGE — DEBUT (ne pas reformater : l'empreinte le lit) ──
      const clesAttempt1 = new Set(
        (diagnosticsAvant ?? []).map((x) => `${x.code}|${x.path}`),
      );
      const introduits = diagnosticsApres.filter((x) => !clesAttempt1.has(`${x.code}|${x.path}`));
      // EP-102 · ① — L'OSCILLATION NE SE JUGE QU'ENTRE DOCUMENTS COMPARABLES.
      // Si la réparation ÉLARGIT le périmètre de jugement (elle rend jugeable
      // ce qui ne l'était pas), les diagnostics qui apparaissent sont RÉVÉLÉS,
      // pas introduits : la retenir, et son résultat devient la nouvelle base.
      // Périmètre ÉGAL ⇒ la gate juge comme avant (L-098-C inchangé) ;
      // périmètre RÉTRÉCI ⇒ régression franche, rejet.
      const perimetreAvant = perimetreDeJugement(
        validateLocal(documentAvant).air,
        prescriptif,
      );
      const perimetreApres = perimetreDeJugement(airApres, prescriptif);
      const revelation = elargit(perimetreAvant, perimetreApres);
    // ── NOYAU DEMENAGE — FIN ──
    // La condition du `if` de la campagne, relevee telle quelle.
    const rejetee = introduits.length > 0 && !revelation;
    return { introduits, revelation, rejetee, perimetreAvant, perimetreApres };
  }
  return { verdict };
}
