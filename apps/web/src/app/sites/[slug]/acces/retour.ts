/**
 * LOT 19 — LE RETOUR APRÈS ENTRÉE (`?retour=/appels-offres/…`).
 *
 * Le visiteur qui voulait déposer une offre revient sur l'AVIS après avoir
 * créé son compte, pas dans son espace. N'est accepté qu'un CHEMIN de ce
 * site : une barre initiale, pas deux (`//autre.site`), pas de schéma, pas
 * d'antislash — sinon ce paramètre servirait à envoyer quelqu'un ailleurs
 * depuis une page de connexion, l'hameçonnage clé en main.
 */
export function retourValable(brut: unknown): string | null {
  if (typeof brut !== 'string') return null
  return /^\/(?!\/)[a-z0-9\-/]*$/i.test(brut) && !brut.includes('\\') ? brut : null
}
