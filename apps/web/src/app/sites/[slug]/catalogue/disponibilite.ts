// ============================================================================
// LA DISPONIBILITÉ D'UN PRODUIT (CPA, 2026-11-19).
//
// Un ÉTAT, en mots — jamais une quantité ni un prix (la règle du lot 6 tient :
// sur un marché d'État un chiffre affiché ENGAGE). La Centrale choisit l'un des
// quatre états ; le site l'affiche avec une icône ET un mot, jamais par la
// couleur seule (accessibilité).
// ============================================================================

export const DISPONIBILITES = ['en_stock', 'stock_limite', 'rupture', 'sur_commande'] as const
export type Disponibilite = (typeof DISPONIBILITES)[number]

export const LIBELLE_DISPO: Record<Disponibilite, string> = {
  en_stock: 'Disponible',
  stock_limite: 'Disponibilité limitée',
  rupture: 'Momentanément indisponible',
  sur_commande: 'Sur commande',
}

export const TEINTE_DISPO: Record<Disponibilite, { texte: string; fond: string; point: string }> = {
  en_stock: { texte: '#166534', fond: '#dcfce7', point: '#22c55e' },
  stock_limite: { texte: '#92400e', fond: '#fef3c7', point: '#f59e0b' },
  rupture: { texte: '#991b1b', fond: '#fee2e2', point: '#ef4444' },
  sur_commande: { texte: '#1e40af', fond: '#dbeafe', point: '#3b82f6' },
}

/** Une valeur lue en base, ramenée aux quatre états ; inconnue → « Disponible ». */
export function lireDisponibilite(v: unknown): Disponibilite {
  return (DISPONIBILITES as readonly unknown[]).includes(v) ? (v as Disponibilite) : 'en_stock'
}

/** Peut-on commander ? Tout sauf « momentanément indisponible ». */
export const commandable = (d: Disponibilite) => d !== 'rupture'
