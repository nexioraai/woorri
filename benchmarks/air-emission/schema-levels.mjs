// ÉCHELLE DE DÉGRADATION DU SCHÉMA DE SORTIE — module PUR, sans effet de bord.
//
// Extrait de `emit-v3.mjs` pour être TESTABLE. Le harnais exécute sa campagne au
// chargement : tant que ces fonctions y vivaient, seul un cliquet sur le texte
// du source pouvait les vérifier — jamais leur COMPORTEMENT.
//
// Aucun accès réseau, fichier, horloge ni aléa : ce module transforme un schéma
// JSON en une échelle de repli, rien d'autre.

export function stripKeys(node, keys) {
  if (Array.isArray(node)) return node.map((n) => stripKeys(n, keys));
  if (node !== null && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (keys.includes(k)) continue;
      out[k] = stripKeys(v, keys);
    }
    return out;
  }
  return node;
}

export function oneOfToAnyOf(node) {
  if (Array.isArray(node)) return node.map(oneOfToAnyOf);
  if (node !== null && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k === "oneOf" ? "anyOf" : k] = oneOfToAnyOf(v);
    return out;
  }
  return node;
}

export function clampMinItems(node) {
  if (Array.isArray(node)) return node.map(clampMinItems);
  if (node !== null && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = k === "minItems" && typeof v === "number" && v > 1 ? 1 : clampMinItems(v);
    }
    return out;
  }
  return node;
}

export function makeLevels(jsonSchema) {
  // EP-149 — L'ORDRE DE L'ÉCHELLE SUIT CE QUI EST RÉELLEMENT REFUSÉ.
  //
  // MESURÉ sur le run EP-148 : l'échelle retirait d'abord les bornes
  // NUMÉRIQUES — que le service n'a jamais refusées — et gardait `maxItems`
  // jusqu'au troisième niveau, alors que c'est précisément lui que le service
  // refuse. Deux appels perdus par segment, systématiquement, avant même
  // d'approcher le vrai problème.
  //
  // Le premier niveau neutralise donc les DEUX incompatibilités connues, et
  // les niveaux suivants attaquent la COMPLEXITÉ — longueurs, puis motifs —
  // qui est l'autre refus observé (« Schema is too complex » sur `ecrans`).
  const base = oneOfToAnyOf(jsonSchema);
  const L0 = stripKeys(clampMinItems(base), ["maxItems"]);
  const L1 = stripKeys(L0, ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"]);
  const L2 = stripKeys(L1, ["minLength", "maxLength", "minItems"]);
  const L3 = stripKeys(L2, ["pattern", "format"]);
  return [
    { name: "incompatibilites-connues", schema: L0 },
    { name: "sans-bornes-numeriques", schema: L1 },
    { name: "sans-longueurs", schema: L2 },
    { name: "sans-patterns", schema: L3 },
  ];
}
