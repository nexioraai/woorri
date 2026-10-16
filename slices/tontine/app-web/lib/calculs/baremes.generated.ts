// ÉMIS DEPUIS LE CONTRAT — ne pas modifier à la main.
// Un barème ne dépend d'aucune base : il se calcule ici, pareil sur
// le téléphone et dans le navigateur.

type Nb = number | null;
const n = (v: unknown): Nb => (typeof v === "number" && Number.isFinite(v) ? v : null);
const op = (a: Nb, b: Nb, o: "+" | "-" | "*"): Nb =>
  a === null || b === null ? null : o === "+" ? a + b : o === "-" ? a - b : a * b;
const div = (a: Nb, b: Nb): Nb => (a === null || b === null || b === 0 ? null : a / b);
// Jours ENTIERS entre deux dates de la ligne, signé. Jamais la date du
// jour : même ligne, même résultat, toujours.
const jours = (de: unknown, a: unknown): Nb => {
  const j = (v: unknown): number | null => {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}/u.test(v)) return null;
    const t = Date.parse(v.slice(0, 10) + "T00:00:00Z");
    return Number.isFinite(t) ? t : null;
  };
  const d = j(de); const f = j(a);
  return d === null || f === null ? null : Math.round((f - d) / 86400000);
};

/** tontines · tour_courant — expression sur les champs de la ligne. */
export function calculer_fld_tontines_tour_courant(ligne: Record<string, unknown>): number | null {
  return op(n(ligne["fld_tontines_versements_reussis"]), 1, "+");
}

/** transactions · part_penalite_createur — expression sur les champs de la ligne. */
export function calculer_fld_transactions_part_penalite_createur(ligne: Record<string, unknown>): number | null {
  return op(n(ligne["fld_transactions_montant_penalite"]), 0.3, "*");
}

/** transactions · part_penalite_tontine — expression sur les champs de la ligne. */
export function calculer_fld_transactions_part_penalite_tontine(ligne: Record<string, unknown>): number | null {
  return op(n(ligne["fld_transactions_montant_penalite"]), 0.7, "*");
}
