// ============================================================================
// LES BONS DE COMMANDE DES STRUCTURES (CPA, 2026-11-19) — les règles partagées.
//
// Une commande, c'est des LIGNES (désignation + quantité, unité facultative),
// une note, et un ÉTAT que seule la Centrale fait avancer. Aucun prix, aucun
// paiement : c'est un bon de commande, pas un panier (voir
// `supabase/sql/commandes.sql`).
//
// Ces règles vivent ICI, pas dans les routes : la route du client et celle de
// la Centrale doivent dire la même chose des mêmes états.
// ============================================================================

export const ETATS_COMMANDE = ['recue', 'en_cours', 'validee', 'livree', 'annulee'] as const
export type EtatCommande = (typeof ETATS_COMMANDE)[number]

export const LIBELLES_ETAT: Record<EtatCommande, string> = {
  recue: 'Reçue', en_cours: 'En cours', validee: 'Validée', livree: 'Livrée', annulee: 'Annulée',
}

/** Bornes. Elles reprennent les contraintes de la base, pour refuser AVANT
 *  d'écrire avec un message lisible plutôt qu'une erreur de contrainte. */
export const MAX_LIGNES = 100
export const MAX_NOTE = 2000
export const MAX_REPONSE = 4000
export const MAX_QUANTITE = 1_000_000

export type LigneCommande = {
  produit_reference: string | null
  designation: string
  quantite: number
  unite: string | null
}

/**
 * Lit les lignes envoyées par le client. Rend les lignes propres, ou le
 * message à montrer. Les lignes entièrement vides (désignation vide) sont
 * ignorées : un formulaire laisse souvent une dernière ligne blanche.
 */
export function lireLignes(brut: unknown): { lignes: LigneCommande[] } | { erreur: string } {
  if (!Array.isArray(brut)) return { erreur: 'Ajoutez au moins un produit.' }
  const lignes: LigneCommande[] = []
  for (const b of brut) {
    if (!b || typeof b !== 'object') return { erreur: 'Ligne de commande illisible.' }
    const l = b as Record<string, unknown>
    const designation = typeof l.designation === 'string' ? l.designation.trim() : ''
    if (designation === '') continue
    if (designation.length < 2 || designation.length > 300) {
      return { erreur: 'Chaque produit doit avoir un nom de 2 à 300 caractères.' }
    }
    const q = typeof l.quantite === 'number' ? l.quantite : Number(String(l.quantite ?? '').trim())
    if (!Number.isInteger(q) || q < 1 || q > MAX_QUANTITE) {
      return { erreur: `Quantité invalide pour « ${designation} » : un nombre entier de 1 à ${MAX_QUANTITE.toLocaleString('fr-FR')}.` }
    }
    const unite = typeof l.unite === 'string' && l.unite.trim() !== '' ? l.unite.trim().slice(0, 40) : null
    const ref = typeof l.produit_reference === 'string' && l.produit_reference.trim() !== ''
      ? l.produit_reference.trim().slice(0, 120) : null
    lignes.push({ produit_reference: ref, designation, quantite: q, unite })
  }
  if (lignes.length === 0) return { erreur: 'Ajoutez au moins un produit.' }
  if (lignes.length > MAX_LIGNES) return { erreur: `Une commande compte au plus ${MAX_LIGNES} lignes.` }
  return { lignes }
}

/** La note du client : facultative, bornée. */
export function lireNote(brut: unknown): { note: string | null } | { erreur: string } {
  if (brut == null) return { note: null }
  if (typeof brut !== 'string') return { erreur: 'Note illisible.' }
  const t = brut.trim()
  if (t.length > MAX_NOTE) return { erreur: `La note fait au plus ${MAX_NOTE} caractères.` }
  return { note: t === '' ? null : t }
}

/** Alphabet sans 0/O ni 1/I/L : une référence se dicte au téléphone. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** « CMD-2026-7K4Q2M ». Six signes sur 31 : ~887 millions par an — une
 *  collision est refusée par la base (unique) et la route réessaie. */
export function nouvelleReference(maintenant: Date = new Date(), hasard: () => number = Math.random): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(hasard() * ALPHABET.length) % ALPHABET.length]
  return `CMD-${maintenant.getUTCFullYear()}-${s}`
}

/** La table n'existe pas encore (fichier SQL pas encore appliqué). */
export function tableAbsente(e: { code?: string; message?: string } | null | undefined): boolean {
  if (!e) return false
  return e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table/i.test(e.message ?? '')
}

export const PAS_ENCORE_OUVERT = 'Les commandes ne sont pas encore ouvertes sur ce site.'
