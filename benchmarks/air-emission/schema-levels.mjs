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
/**
 * DEROULER UNE DEFINITION QUI SE CITE ELLE-MEME.
 *
 * ── LE DEFAUT, MESURE EN PRODUCTION LE 2026-10-14.
 *
 * La generation du proprietaire est morte en 400 :
 *   « output_config.format.schema: Invalid schema: Circular reference
 *     detected in schema definition »
 *
 * Le contrat decrit une expression de calcul ainsi : « une operation, c'est
 * deux expressions ». C'est une definition RECURSIVE, parfaitement legitime
 * cote contrat — et le service de sorties structurees la refuse.
 *
 * MESURE DE L'ETENDUE, faite avant d'ecrire une ligne : sur les huit passes
 * du moteur, UNE SEULE porte un cycle — `entites`. Les sept autres sont
 * propres. Le defaut existe depuis que les expressions sont entrees au
 * contrat ; aucune generation n'avait tourne depuis, donc personne ne
 * l'avait vu.
 *
 * ── POURQUOI ICI, ET PAS DANS LE CONTRAT.
 *
 * Un cycle n'est pas une faute du contrat : c'est un ECART DU DIALECTE,
 * exactement comme `maxItems` que ce fichier traite deja. Aplatir la
 * recursion dans `air.ts` mutilerait le format pour satisfaire un
 * fournisseur. La frontiere est la meme qu'en EP-049.
 *
 * ── CE QUE FAIT LE DEROULAGE, ET POURQUOI IL EST FIDELE.
 *
 * Il remplace le renvoi par le corps, `profondeur` fois, puis coupe au
 * dernier niveau les branches qui recursent — il ne reste que les feuilles.
 * Le schema obtenu accepte EXACTEMENT les expressions jusqu'a cette
 * profondeur, et aucune plus profonde.
 *
 * C'est une restriction REELLE et elle est assumee : la grammaire guide le
 * generateur, le validateur reste seul juge. Mesure sur les 46 documents du
 * corpus : les cinq expressions qui existent sont TOUTES de profondeur 1.
 * Le format en autorise 8 ; la grammaire en proposera moins, et l'echelle
 * de degradation descend encore si la taille devient le probleme.
 *
 * ── CE QU'IL REFUSE DE FAIRE.
 *
 * Si une definition cyclique n'a AUCUNE branche non recursive, la couper
 * produirait un schema que rien ne satisfait. On leve : un schema
 * impossible se decouvrirait en 400, loin d'ici, et coûterait un appel.
 */
/** Les definitions qui se citent elles-memes. Vide = rien a derouler. */
export function definitionsCycliques(node) {
  const defs = node?.$defs;
  if (defs === undefined || defs === null) return [];
  return Object.keys(defs).filter((k) =>
    JSON.stringify(defs[k]).includes(`"#/$defs/${k}"`),
  );
}

export function deroulerCycles(node, profondeur) {
  if (!Number.isInteger(profondeur) || profondeur < 0) {
    throw new Error("deroulerCycles : profondeur entiere et positive exigee");
  }
  const defs = node?.$defs;
  if (defs === undefined || defs === null) return node;
  const renvoi = (cle) => `#/$defs/${cle}`;
  const cycliques = definitionsCycliques(node);
  if (cycliques.length === 0) return node;

  // Remplace tout renvoi a `cle` par `corps`, partout dans l'arbre.
  const substituer = (n, cle, corps) => {
    if (Array.isArray(n)) return n.map((x) => substituer(x, cle, corps));
    if (n !== null && typeof n === "object") {
      if (n.$ref === renvoi(cle) && Object.keys(n).length === 1) {
        return JSON.parse(JSON.stringify(corps));
      }
      const out = {};
      for (const [k, v] of Object.entries(n)) out[k] = substituer(v, cle, corps);
      return out;
    }
    return n;
  };
  // Les branches qui NE recursent PAS : ce sont les feuilles, et elles seules
  // peuvent clore le deroulage.
  const feuilles = (corps, cle) => {
    const champ = Array.isArray(corps.oneOf) ? "oneOf" : Array.isArray(corps.anyOf) ? "anyOf" : null;
    if (champ === null) {
      throw new Error(
        `deroulerCycles : « ${cle} » se cite elle-meme sans etre une union — ` +
          "impossible de la clore sans deviner ce que le contrat voulait dire.",
      );
    }
    const gardees = corps[champ].filter((b) => !JSON.stringify(b).includes(`"${renvoi(cle)}"`));
    if (gardees.length === 0) {
      throw new Error(
        `deroulerCycles : « ${cle} » n'a AUCUNE branche non recursive. La ` +
          "clore produirait un schema que rien ne satisfait.",
      );
    }
    return { ...corps, [champ]: gardees };
  };

  let sortie = JSON.parse(JSON.stringify(node));
  for (const cle of cycliques) {
    const corps = defs[cle];
    let niveau = feuilles(corps, cle);
    for (let i = 0; i < profondeur; i += 1) {
      niveau = substituer(corps, cle, niveau);
    }
    sortie = substituer(sortie, cle, niveau);
    delete sortie.$defs[cle];
  }
  if (Object.keys(sortie.$defs).length === 0) delete sortie.$defs;
  return sortie;
}

export function incompatibilitesDe(contraintes) {
  const clefs = [];
  if (contraintes.maxItemsSupporte === false) clefs.push("maxItems");
  if (contraintes.bornesNumeriquesEntiers === false) {
    clefs.push("minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf");
  }
  return {
    clefs,
    clampMinItems: contraintes.minItemsMax === 1,
    // Une definition qui se cite elle-meme : refusee en 400, mesure du
    // 2026-10-14. On la deroule au lieu de la supprimer — voir
    // `deroulerCycles`.
    deroulerCycles: contraintes.referencesCirculairesSupportees === false,
  };
}

/**
 * LES PROFONDEURS DE L'ECHELLE, ET POURQUOI CES TROIS-LA.
 *
 * MESURE sur les 46 documents du corpus : les cinq expressions qui existent
 * sont TOUTES de profondeur 1. Le format en autorise 8.
 *
 * 2 au premier barreau : il couvre `(a - b) * c`, le besoin realiste
 * suivant, avec une marge sur ce que le corpus utilise. Les barreaux 1 et 0
 * existent parce que derouler ENFLE la grammaire — mesure sur `entites` :
 * 9 326 o avec le cycle, puis 12 599 / 18 575 / 30 527 aux profondeurs
 * 1 / 2 / 3. Si la taille devient le probleme, le moteur descend l'echelle
 * au lieu de mourir.
 *
 * Profondeur 0 n'est pas vide : elle garde les feuilles — un champ, une
 * constante, un nombre de jours. Elle perd les operations imbriquees, pas
 * les expressions.
 */
const PROFONDEURS_DEROULAGE = [2, 1, 0];

export function makeLevels(jsonSchema, contraintes) {
  if (contraintes === undefined) {
    throw new Error(
      "EP-151 — `makeLevels` exige les contraintes du dialecte. Les deviner " +
        "ici recréerait la seconde liste que cette passe supprime.",
    );
  }
  const incompatibles = incompatibilitesDe(contraintes);
  // LE DEROULAGE PASSE AVANT TOUT LE RESTE. Un cycle est refuse par le
  // service a TOUS les niveaux : le garder sur un seul barreau rendrait ce
  // barreau mort-ne, et la sonde brulerait un appel pour l'apprendre.
  const deroule = (profondeur) =>
    incompatibles.deroulerCycles ? deroulerCycles(jsonSchema, profondeur) : jsonSchema;
  const base = oneOfToAnyOf(deroule(PROFONDEURS_DEROULAGE[0]));
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
  // Les derniers barreaux reduisent la PROFONDEUR des expressions. Ils
  // n'existent que si CE schema porte reellement un cycle — mesure : sur les
  // huit passes du moteur, une seule en a un. Les ajouter partout donnait
  // quatre passes sur cinq avec DEUX barreaux identiques, soit deux sondes
  // brulees pour apprendre la meme chose.
  const aUnCycle = incompatibles.deroulerCycles && definitionsCycliques(jsonSchema).length > 0;
  const parProfondeur = aUnCycle
    ? PROFONDEURS_DEROULAGE.slice(1).map((profondeur) => ({
        name: `expressions-profondeur-${String(profondeur)}`,
        schema: stripKeys(
          incompatibles.clampMinItems
            ? clampMinItems(oneOfToAnyOf(deroule(profondeur)))
            : oneOfToAnyOf(deroule(profondeur)),
          [...incompatibles.clefs, "minLength", "maxLength", "minItems", "pattern", "format"],
        ),
      }))
    : [];
  return [
    { name: "incompatibilites-connues", schema: L0 },
    { name: "sans-longueurs", schema: L1 },
    { name: "sans-patterns", schema: L2 },
    ...parProfondeur,
  ];
}
