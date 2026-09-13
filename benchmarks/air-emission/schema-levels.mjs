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

/**
 * EP-151 — LE NIVEAU 0 EST DÉRIVÉ DES CONTRAINTES DÉCLARÉES.
 *
 * SIXIÈME OCCURRENCE DU MÊME MOTIF, et celle-ci a coûté un run : l'échelle et
 * `CONTRAINTES_GRAMMAIRE` étaient deux listes portant la même information. Le
 * dialecte déclarait trois incompatibilités ; le premier niveau n'en honorait
 * que deux, et la troisième — les bornes numériques sur les entiers — ne
 * partait qu'au niveau suivant. Un appel refusé par segment, invisible tant
 * qu'on ne lisait pas les deux listes côte à côte.
 *
 * `makeLevels` ne DÉCIDE plus ce qui est incompatible : il le REÇOIT. La
 * seule source est l'adaptateur, qui connaît son dialecte.
 */
export function incompatibilitesDe(contraintes) {
  const clefs = [];
  if (contraintes.maxItemsSupporte === false) clefs.push("maxItems");
  if (contraintes.bornesNumeriquesEntiers === false) {
    clefs.push("minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf");
  }
  return { clefs, clampMinItems: contraintes.minItemsMax === 1 };
}

export function makeLevels(jsonSchema, contraintes) {
  if (contraintes === undefined) {
    throw new Error(
      "EP-151 — `makeLevels` exige les contraintes du dialecte. Les deviner " +
        "ici recréerait la seconde liste que cette passe supprime.",
    );
  }
  const incompatibles = incompatibilitesDe(contraintes);
  const base = oneOfToAnyOf(jsonSchema);
  // NIVEAU 0 — TOUTES les incompatibilités déclarées, d'un coup. Ce qui est
  // connu du dialecte ne se découvre pas appel après appel.
  const L0 = stripKeys(
    incompatibles.clampMinItems ? clampMinItems(base) : base,
    incompatibles.clefs,
  );
  // Les niveaux suivants attaquent la COMPLEXITÉ, pas la compatibilité :
  // longueurs d'abord, motifs en dernier — ce sont eux qui portent le plus de
  // sens, et la mesure montre qu'ils sont peu nombreux mais décisifs.
  const L1 = stripKeys(L0, ["minLength", "maxLength", "minItems"]);
  const L2 = stripKeys(L1, ["pattern", "format"]);
  return [
    { name: "incompatibilites-connues", schema: L0 },
    { name: "sans-longueurs", schema: L1 },
    { name: "sans-patterns", schema: L2 },
  ];
}
