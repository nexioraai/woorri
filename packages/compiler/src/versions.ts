/**
 * UNE RÈGLE QUI CHANGE AVEC LE TEMPS.
 *
 * MESURE, cahier des charges réel, section 7 : « stocker les barèmes comme
 * des règles VERSIONNÉES (date de début, date de fin, portée et source).
 * NE PAS APPLIQUER AUTOMATIQUEMENT UNE ANCIENNE MESURE À UNE AUTRE
 * PÉRIODE. »
 *
 * ── LA DÉCISION QUI COMPTE : PAS D'HORLOGE.
 *
 * La version applicable se choisit sur un CHAMP DE DATE DE LA LIGNE, pas
 * sur la date du jour. Recalculer une facture de l'an dernier doit
 * appliquer le tarif de l'an dernier — avec une horloge, elle changerait
 * de montant à chaque relecture, et personne ne saurait pourquoi. C'est
 * aussi ce qui garde le calcul PUR : même ligne, même résultat, toujours.
 *
 * ── ET SI AUCUNE VERSION NE COUVRE LA DATE : AUCUNE VALEUR.
 *
 * Pas de repli sur la version la plus proche. Le cahier le dit — « ne pas
 * supposer ». Un montant calculé avec le mauvais tarif a l'air juste, et
 * c'est exactement ce qu'on refuse.
 */
import { evaluerBareme, emettreBaremeTs, type Bareme } from "./bareme.ts";
import { evaluerExpression, emettreExpressionTs, type Expression } from "./expression.ts";

export type RegleDatee =
  | { readonly kind: "calcul"; readonly expression: Expression }
  | ({ readonly kind: "bareme"; readonly fieldId: string } & Bareme);

export interface Version {
  /** Inclusif. Absent = depuis toujours. */
  readonly depuis?: string;
  /** EXCLUSIF — deux versions qui se touchent ne se chevauchent pas. */
  readonly jusqua?: string;
  /** D'où vient la règle. Une règle sans source ne se conteste pas. */
  readonly source?: string;
  readonly regle: RegleDatee;
}

export interface Versionne {
  readonly dateFieldId: string;
  readonly versions: readonly Version[];
}

/** La version qui couvre cette date, ou `null`. Les dates civiles se
 *  comparent comme du texte : `AAAA-MM-JJ` est ordonné par construction. */
export function versionPour(v: Versionne, date: string | null): Version | null {
  if (date === null || !/^\d{4}-\d{2}-\d{2}/u.test(date)) return null;
  const jour = date.slice(0, 10);
  return (
    v.versions.find(
      (x) => (x.depuis === undefined || jour >= x.depuis) && (x.jusqua === undefined || jour < x.jusqua),
    ) ?? null
  );
}

export function evaluerVersionne(
  v: Versionne,
  ligne: Readonly<Record<string, unknown>>,
): number | null {
  const brut = ligne[v.dateFieldId];
  const choisie = versionPour(v, typeof brut === "string" ? brut : null);
  if (choisie === null) return null;
  const r = choisie.regle;
  if (r.kind === "calcul") {
    return evaluerExpression(r.expression, ligne as Record<string, number | null | undefined>);
  }
  const q = ligne[r.fieldId];
  return typeof q === "number" && Number.isFinite(q)
    ? evaluerBareme(r, q)
    : evaluerBareme(r, 0);
}

/** Le même choix, écrit dans l'application générée. Les sources partent en
 *  commentaire : on relit d'où vient chaque tarif sans ouvrir le contrat. */
export function emettreVersionneTs(v: Versionne, nom: string): string {
  const branches = v.versions.map((x, i) => {
    const conditions = [
      x.depuis === undefined ? null : `jour >= ${JSON.stringify(x.depuis)}`,
      x.jusqua === undefined ? null : `jour < ${JSON.stringify(x.jusqua)}`,
    ].filter((c) => c !== null);
    const test = conditions.length === 0 ? "true" : conditions.join(" && ");
    const corps =
      x.regle.kind === "calcul"
        ? `return ${emettreExpressionTs(x.regle.expression)};`
        : `return ${nom}_v${String(i)}(n(ligne[${JSON.stringify(x.regle.fieldId)}]) ?? 0);`;
    const source = x.source === undefined ? "" : `  // source : ${x.source}\n`;
    return `${source}  if (${test}) { ${corps} }`;
  });

  const baremes = v.versions
    .map((x, i) =>
      x.regle.kind === "bareme" ? emettreBaremeTs(x.regle, `${nom}_v${String(i)}`) : null,
    )
    .filter((b) => b !== null)
    .join("\n");

  return `${baremes}
export function ${nom}(ligne: Record<string, unknown>): number | null {
  const brut = ligne[${JSON.stringify(v.dateFieldId)}];
  const jour = typeof brut === "string" ? brut.slice(0, 10) : null;
  // AUCUNE VERSION NE COUVRE CETTE DATE → aucune valeur. Pas de repli sur
  // la plus proche : un montant calculé avec le mauvais tarif a l'air juste.
  if (jour === null) return null;
${branches.join("\n")}
  return null;
}
`;
}
