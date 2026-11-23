/**
 * L'ACCORD DE LECTURE PUBLIQUE, PORTÉ JUSQU'AU PAIEMENT (2026-11-22).
 *
 * La personne voit la liste des tables lisibles par tout le monde, et
 * l'accepte, AU CLIC sur « Publier » — avant Stripe. La publication, elle,
 * a lieu plus tard, dans le webhook, sans personne devant l'écran. L'accord
 * voyage donc avec l'abonnement (métadonnée Stripe), et il ne vaut que pour
 * la liste EXACTE qu'elle a vue : une retouche qui ajoute une table publique
 * entre-temps l'annule — la publication automatique s'arrête, et le prochain
 * « Publier » repose la question.
 */
export const CLE_ACCORD_LECTURE = 'deribfy_lecture_publique'

/** Stripe borne une valeur de métadonnée à 500 signes. */
const LONGUEUR_MAX = 500

/** La liste acceptée, sous la forme portée chez Stripe ; `null` si elle est vide ou trop longue. */
export function accordPourStripe(tables: readonly string[]): string | null {
  if (tables.length === 0) return null
  const v = [...tables].sort().join(',')
  return v.length <= LONGUEUR_MAX ? v : null
}

// ── L'ACCORD GARDÉ AVEC L'APPLI (2026-11-22). Mesuré : sans lui, la question
//    revenait à CHAQUE clic sur « Publier », même nom choisi et liste inchangée.
//    Il est rangé dans `sections_acquises` (la ligne de l'appli, aucune colonne
//    neuve) sous la forme portée chez Stripe : il ne vaut que pour la liste
//    EXACTE acceptée — une table publique de plus, et la question revient.
export const CLE_ACCORD_GARDE = 'accordLecturePublique'

/** L'accord gardé sur la ligne, ou null. */
export function accordGarde(sections: unknown): string | null {
  const a = (sections as Record<string, unknown> | null)?.[CLE_ACCORD_GARDE] as { tables?: unknown } | undefined
  return typeof a?.tables === 'string' && a.tables !== '' ? a.tables : null
}

/** L'accord porté couvre-t-il les tables publiques d'AUJOURD'HUI ? Aucune table : rien à accepter. */
export function accordCouvre(porte: string | null | undefined, tables: readonly string[]): boolean {
  if (tables.length === 0) return true
  return typeof porte === 'string' && porte !== '' && porte === accordPourStripe(tables)
}
