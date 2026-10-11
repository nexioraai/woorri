/**
 * LES EXPRESSIONS — CE QUI MANQUAIT VRAIMENT AU CONTRAT.
 *
 * MESURE SUR UN CAHIER DES CHARGES REEL : ce qui rendait l'application
 * entiere impossible n'etait pas exotique, c'etait une SOUSTRACTION
 * (« consommation = nouvel index − ancien index »). Et sur neuf anomalies
 * demandees, UNE SEULE etait exprimable — une assertion compare un champ a
 * une constante, jamais deux champs entre eux.
 *
 * ── UNE FORME, TOUTE LA CLASSE.
 *
 * Avec des expressions, les comparaisons n'ont PAS besoin d'un nouveau
 * vocabulaire de regles : on calcule la difference, puis on la compare a
 * une constante avec la regle qui existait deja.
 *
 *     « index nouveau < precedent »  →  ecart = nouveau − precedent
 *                                        puis  ecart ≥ 0
 *
 * C'est la difference entre ajouter une forme par regle metier — travail
 * sans fin — et couvrir la classe une fois.
 *
 * ── CE QUI RESTE DEHORS, ET C'EST CE QUI LA GARDE ANALYSABLE.
 *
 * Une expression ne voit QUE la ligne qu'elle calcule : pas d'autre ligne,
 * pas de boucle, pas d'horloge, pas d'appel de fonction. On sait
 * STATIQUEMENT quels champs elle lit. Agreger reste `sum` et `count`, qui
 * passent par une relation declaree.
 */

export type Expression =
  | { readonly kind: "champ"; readonly fieldId: string }
  | { readonly kind: "constante"; readonly valeur: number }
  | {
      readonly kind: "operation";
      readonly op: "+" | "-" | "*" | "/";
      readonly gauche: Expression;
      readonly droite: Expression;
    };

/**
 * LA REFERENCE. C'est elle que les preuves comparent aux attentes du
 * cahier, et c'est elle que le code emis doit reproduire.
 *
 * Une division par zero rend `null` plutot que l'infini : un montant
 * infini s'affiche, se stocke, et contamine tout ce qu'il touche. `null`
 * dit « pas de valeur », ce qui est la verite.
 */
export function evaluerExpression(
  e: Expression,
  ligne: Readonly<Record<string, number | null | undefined>>,
): number | null {
  if (e.kind === "constante") return e.valeur;
  if (e.kind === "champ") {
    const v = ligne[e.fieldId];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  const g = evaluerExpression(e.gauche, ligne);
  const d = evaluerExpression(e.droite, ligne);
  // UNE VALEUR MANQUANTE CONTAMINE, ET C'EST VOULU : calculer un ecart avec
  // un index absent donnerait un chiffre faux qui a l'air juste.
  if (g === null || d === null) return null;
  switch (e.op) {
    case "+": return g + d;
    case "-": return g - d;
    case "*": return g * d;
    default: return d === 0 ? null : g / d;
  }
}

/** La meme expression, en TypeScript, dans l'application generee. */
export function emettreExpressionTs(e: Expression): string {
  if (e.kind === "constante") return String(e.valeur);
  if (e.kind === "champ") return `n(ligne[${JSON.stringify(e.fieldId)}])`;
  const g = emettreExpressionTs(e.gauche);
  const d = emettreExpressionTs(e.droite);
  // La division se protege A L'ENDROIT ou elle se produit : une garde
  // globale laisserait passer une division imbriquee.
  return e.op === "/" ? `div(${g}, ${d})` : `op(${g}, ${d}, "${e.op}")`;
}

/** Les aides que le code emis utilise — ecrites UNE fois par fichier. */
export const PRELUDE_EXPRESSION = `type Nb = number | null;
const n = (v: unknown): Nb => (typeof v === "number" && Number.isFinite(v) ? v : null);
const op = (a: Nb, b: Nb, o: "+" | "-" | "*"): Nb =>
  a === null || b === null ? null : o === "+" ? a + b : o === "-" ? a - b : a * b;
const div = (a: Nb, b: Nb): Nb => (a === null || b === null || b === 0 ? null : a / b);
`;

/** La fonction complete, prete a etre ecrite dans le projet. */
export function emettreCalculTs(e: Expression, nom: string): string {
  return `export function ${nom}(ligne: Record<string, unknown>): number | null {
  return ${emettreExpressionTs(e)};
}
`;
}
