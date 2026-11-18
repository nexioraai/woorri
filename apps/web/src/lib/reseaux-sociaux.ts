/**
 * LES COMPTES DE DERIBFY SUR LES RÉSEAUX — la SEULE place où leurs adresses s'écrivent.
 *
 * Vides tant que le propriétaire ne les a pas donnés (Facebook et LinkedIn
 * arrivent avant Dary, décision du 2026-11-18). Une adresse vide n'affiche
 * AUCUNE icône : un bouton qui ne mène nulle part est une coquille vide.
 * Le jour où un compte existe, on remplit son `url` ici, et le pied de page
 * de toutes les pages publiques le montre.
 */
export type ReseauSocial = { readonly reseau: 'facebook' | 'linkedin'; readonly url: string }

export const RESEAUX_SOCIAUX: readonly ReseauSocial[] = [
  { reseau: 'facebook', url: '' },
  { reseau: 'linkedin', url: '' },
]
