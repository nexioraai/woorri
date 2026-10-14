/**
 * LE BARÈME — LE SEUL CALCUL QUE LE COMPILATEUR PEUT ÉCRIRE EN ENTIER.
 *
 * ── CE QUI MANQUAIT, MESURÉ.
 *
 * Le contrat ne savait exprimer que `sum` et `count`. Et surtout : pour ces
 * deux-là, le compilateur n'écrit RIEN — il pose un trou (« 🔴 À ÉCRIRE.
 * Le document dit QUOI calculer ; la requête dépend de votre base »). Une
 * application generee n'a donc jamais su calculer quoi que ce soit.
 *
 * Un barème est différent, et c'est pour ça qu'il est traitable : il ne
 * regarde AUCUNE autre ligne, aucune base, aucune horloge. C'est une
 * fonction d'un nombre. Le compilateur peut donc l'écrire ENTIÈREMENT —
 * pas un stub, du code qui calcule.
 *
 * ── DEUX MODES, ET SE TROMPER CHANGE LE MONTANT.
 *
 * `global` — toute la quantité au prix du palier atteint. C'est le cas
 * mesuré sur un cahier des charges réel : « ≤ 150 kWh → 85 F/kWh ;
 * > 150 kWh → 125 F/kWh sur TOUT », et le cahier insiste — « il ne faut PAS
 * facturer les 150 premiers à 85 puis le surplus à 125 ».
 *
 * `par_tranche` — chaque tranche à son propre prix. C'est le barème de
 * l'impôt, et il existe tout autant.
 *
 * Les deux donnent des montants très différents : à 151 unités, 19 277
 * contre 13 152 + 125. Aucun défaut n'est donc proposé ; le document
 * choisit.
 */

export interface Palier {
  readonly jusqua?: number;
  readonly prixUnitaire: number;
}

export interface Bareme {
  readonly paliers: readonly Palier[];
  readonly mode: "global" | "par_tranche";
  readonly fraisFixes: number;
}

/**
 * LA RÉFÉRENCE. C'est elle que les preuves comparent au tableau du cahier,
 * et c'est elle que le code émis doit reproduire a l'unite pres.
 *
 * @param quantite négative ou absurde → seuls les frais fixes. On ne rend
 *        jamais un montant négatif : une facture négative n'existe pas, et
 *        la signaler est le travail des anomalies, pas du calcul.
 */
export function evaluerBareme(bareme: Bareme, quantite: number): number {
  const q = Number.isFinite(quantite) && quantite > 0 ? quantite : 0;
  if (q === 0) return bareme.fraisFixes;

  if (bareme.mode === "global") {
    // LE PALIER ATTEINT DONNE SON PRIX A TOUT. Le premier palier dont la
    // borne couvre la quantite ; a defaut, le dernier (il est ouvert).
    const palier =
      bareme.paliers.find((p) => p.jusqua !== undefined && q <= p.jusqua) ??
      bareme.paliers[bareme.paliers.length - 1];
    return q * (palier?.prixUnitaire ?? 0) + bareme.fraisFixes;
  }

  // PAR TRANCHE : chaque tranche a son prix, et on additionne.
  let reste = q;
  let bas = 0;
  let total = 0;
  for (const p of bareme.paliers) {
    if (reste <= 0) break;
    const haut = p.jusqua ?? Number.POSITIVE_INFINITY;
    const dans = Math.min(reste, haut - bas);
    total += dans * p.prixUnitaire;
    reste -= dans;
    bas = haut;
  }
  return total + bareme.fraisFixes;
}

/**
 * LE MÊME CALCUL, ÉCRIT EN TYPESCRIPT DANS L'APPLICATION GÉNÉRÉE.
 *
 * Le code émis est une TRANSCRIPTION de la déclaration, pas une
 * interprétation : les nombres du document apparaissent tels quels dans la
 * source. Un humain peut donc relire le barème dans le code sans avoir le
 * document sous les yeux — et les preuves comparent la sortie de ce code a
 * celle de la reference ci-dessus.
 */
/**
 * LES CONSTANTES VIVENT DANS LA FONCTION, ET C'EST UNE CORRECTION.
 *
 * MESURE du 2026-10-14 : `PALIERS` et `FRAIS_FIXES` etaient declares au
 * niveau du MODULE. Les emetteurs concatenent tous les baremes d'une
 * application dans UN SEUL fichier — un seul endroit ou les lire, ce qui est
 * le bon choix. Deux baremes produisaient donc deux `const PALIERS` et deux
 * `const FRAIS_FIXES` dans le meme module : TypeScript refuse, identifiant
 * duplique, et l'application ne compilait plus.
 *
 * Le defaut a survecu parce qu'UN SEUL document du corpus porte un bareme.
 * Il aurait eclate au premier cahier a deux tarifs — un social et un plein,
 * ce qui est banal. Mesure : un second bareme ajoute au document de Conterak
 * donnait `PALIERS x2`.
 */
export function emettreBaremeTs(bareme: Bareme, nom: string): string {
  const paliers = bareme.paliers
    .map(
      (p) =>
        `    { jusqua: ${p.jusqua === undefined ? "null" : String(p.jusqua)}, prixUnitaire: ${String(p.prixUnitaire)} },`,
    )
    .join("\n");
  const corps =
    bareme.mode === "global"
      ? `  const palier = PALIERS.find((p) => p.jusqua !== null && q <= p.jusqua) ?? PALIERS[PALIERS.length - 1];
  return q * (palier?.prixUnitaire ?? 0) + FRAIS_FIXES;`
      : `  let reste = q;
  let bas = 0;
  let total = 0;
  for (const p of PALIERS) {
    if (reste <= 0) break;
    const haut = p.jusqua === null ? Number.POSITIVE_INFINITY : p.jusqua;
    const dans = Math.min(reste, haut - bas);
    total += dans * p.prixUnitaire;
    reste -= dans;
    bas = haut;
  }
  return total + FRAIS_FIXES;`;

  return `// Barème émis depuis le contrat — ${bareme.mode === "global" ? "TOUTE la quantité au prix du palier atteint" : "chaque tranche à son prix"}.
// Les nombres viennent du document : relisez-les ici sans l'ouvrir.
export function ${nom}(quantite: number): number {
  const PALIERS: { jusqua: number | null; prixUnitaire: number }[] = [
${paliers}
  ];
  const FRAIS_FIXES = ${String(bareme.fraisFixes)};
  const q = Number.isFinite(quantite) && quantite > 0 ? quantite : 0;
  if (q === 0) return FRAIS_FIXES;
${corps}
}
`;
}
