import type { Bloc } from '../pages/blocs'

// ============================================================================
// LOT 17 — LES INTITULÉS DU FORMULAIRE D'INSCRIPTION, MODIFIABLES.
//
// « Tout ce qui est visible sur le site doit être éditable » (propriétaire,
// 2026-11-10). Les intitulés vivent dans une page de l'éditeur, NON PUBLIÉE,
// au chemin `inscription/formulaire` : un bloc TABLEAU à deux colonnes,
// « Champ » (la clé, à ne pas changer) et « Texte affiché » (à changer).
//
// POURQUOI UNE CLÉ ÉCRITE ET PAS UN ORDRE : une ligne déplacée ou supprimée
// ne décale pas les autres. Une clé inconnue est ignorée ; une clé absente
// garde le mot par défaut. Le formulaire ne peut donc jamais perdre un
// intitulé à cause d'une modification.
// ============================================================================

export const CHEMIN_INTITULES = 'inscription/formulaire'

export type CleIntitule = 'nom' | 'organisation' | 'role' | 'fournisseur' | 'structure' | 'telephone' | 'courriel' | 'motDePasse' | 'bouton'

/** Les clés telles qu'écrites dans la première colonne, et leur sens. */
export const CLES: [libelle: string, cle: CleIntitule][] = [
  ['Nom', 'nom'], ['Organisation', 'organisation'], ['Vous êtes', 'role'],
  ['Fournisseur', 'fournisseur'], ['Structure sanitaire', 'structure'], ['Téléphone', 'telephone'],
  ['Adresse électronique', 'courriel'], ['Mot de passe', 'motDePasse'], ['Bouton', 'bouton'],
]

const plat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Lit le premier tableau de la page ; rend seulement les intitulés non vides. */
export function lireIntitules(blocs: Bloc[]): Partial<Record<CleIntitule, string>> {
  const tableau = blocs.find((b): b is Extract<Bloc, { type: 'tableau' }> => b.type === 'tableau')
  if (!tableau) return {}
  const out: Partial<Record<CleIntitule, string>> = {}
  for (const ligne of tableau.lignes) {
    const cle = CLES.find(([l]) => plat(l) === plat(ligne[0] ?? ''))?.[1]
    const texte = (ligne[1] ?? '').trim()
    if (cle && texte) out[cle] = texte
  }
  return out
}
