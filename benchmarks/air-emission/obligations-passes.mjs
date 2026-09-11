// OBLIGATIONS MÉCANIQUES PAR PASSE (étape ⑤, EP-005 — 2026-09-11).
//
// DÉPENDANCES DÉMONTRÉES entre passes (depuis le schéma, pas supposées) :
//   · actions.effect.capability → capability DÉCLARÉE  ⇒ `capacites` passe
//     AVANT `actions` (réordonné dans PARTS — c'était l'inverse) ;
//   · blocs (button/search_entry) → actionId  ET  actions.trigger → blockId :
//     le cycle écrans↔actions ne se RÉORDONNE pas — il se CONTRAINT.
//
// Ce module dérive MÉCANIQUEMENT des sections déjà émises ce que la passe
// suivante DOIT produire : les identifiants promis deviennent une liste
// d'obligations dans le message, les cibles autorisées une liste FERMÉE.
// Coût mesuré de leur absence : cibles mortes F1 (12 puis 8 refus payés en
// passes de réparation — gate:fidelite, EP-010).
//
// PUR : entrées → texte. Aucun réseau, aucune horloge. Testé sans campagne
// (packages/compiler/tests/obligations-passes.test.ts).

const prop = (b, k) => (b.props ?? []).find((p) => p.key === k)?.value;

/** Les actions PROMISES par les écrans émis : actionId de props + « Voir plus ». */
export function actionsPromises(screens) {
  const directes = [];
  const secondaires = [];
  for (const s of screens ?? []) {
    for (const b of s.blocks ?? []) {
      const actionId = prop(b, "actionId");
      if (typeof actionId === "string") {
        directes.push({ actionId, screenId: s.id, blockId: b.id, blockType: b.blockType });
      }
      if (b.blockType === "list" && typeof prop(b, "seeAllLabel") === "string") {
        secondaires.push({ screenId: s.id, blockId: b.id });
      }
    }
  }
  return { directes, secondaires };
}

/** Les identifiants VIVANTS ciblables par expectedTests/intent (liste fermée). */
export function ciblesVivantes(assembled) {
  const ids = [];
  for (const s of assembled.screens ?? []) {
    ids.push(s.id);
    for (const b of s.blocks ?? []) ids.push(b.id);
  }
  for (const a of assembled.actions ?? []) ids.push(a.id);
  for (const e of assembled.entities ?? []) {
    ids.push(e.id);
    for (const f of e.fields ?? []) ids.push(f.id);
  }
  for (const r of (assembled.navigation ?? {}).routes ?? []) ids.push(r.id);
  for (const d of assembled.datasets ?? []) ids.push(d.id);
  for (const c of assembled.capabilities ?? []) ids.push(typeof c === "string" ? c : c.id);
  return [...new Set(ids)];
}

/**
 * Le texte d'obligations à APPOSER au message utilisateur d'une passe.
 * Chaîne vide = aucune obligation dérivable (la passe n'en a pas besoin).
 */
export function obligationsPourPasse(nomPasse, assembled) {
  if (nomPasse === "actions") {
    const { directes, secondaires } = actionsPromises(assembled.screens);
    if (directes.length === 0 && secondaires.length === 0) return "";
    const lignes = [
      "OBLIGATIONS MÉCANIQUES (dérivées des écrans déjà émis — aucune n'est optionnelle) :",
    ];
    if (directes.length > 0) {
      lignes.push(
        "· Chaque identifiant ci-dessous est PROMIS par un bloc : définis une action portant EXACTEMENT cet id (caractère pour caractère) :",
        ...directes.map(
          (d) => `  - ${d.actionId} (promis par ${d.screenId}.${d.blockId}, ${d.blockType})`,
        ),
      );
    }
    if (secondaires.length > 0) {
      lignes.push(
        "· Chaque bloc list ci-dessous porte `seeAllLabel` : définis une action `{trigger:{kind:\"ui\",blockId:<le bloc>,role:\"secondary\"},effect:{kind:\"navigate\",...}}` (règle 31ter) :",
        ...secondaires.map((x) => `  - ${x.screenId}.${x.blockId}`),
      );
    }
    lignes.push(
      "Une promesse sans action est une cible morte — le validateur la refusera et la réparation sera FACTURÉE.",
    );
    return lignes.join("\n");
  }
  if (nomPasse === "cablage" || nomPasse === "intention") {
    const ids = ciblesVivantes(assembled);
    if (ids.length === 0) return "";
    const quoi =
      nomPasse === "cablage"
        ? "expectedTests[].targetId et integrations[].capability"
        : "intent.needs[].resolution.nodeIds";
    return [
      `CIBLES AUTORISÉES (liste FERMÉE, dérivée des sections émises) — ${quoi} ne peut viser QUE ces identifiants, recopiés caractère pour caractère :`,
      ids.join(", "),
      "Tout identifiant hors de cette liste est une cible morte : refus mécanique garanti.",
    ].join("\n");
  }
  return "";
}
