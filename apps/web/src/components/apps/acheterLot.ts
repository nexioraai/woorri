/**
 * « AJOUTER DES MODIFICATIONS » — le lot payé par le client (décision du
 * propriétaire, 2026-11-24), par la MÊME fenêtre que « Publier » : étapes
 * Paiement › Confirmation, « Carte bancaire » ou « Mobile money ».
 *
 *   1. lire ce que le lot propose (`/api/generateur/lot`) : abonnement en cours
 *      exigé, moyens ouverts, taille du lot ;
 *   2. la fenêtre : carte → la page Stripe (paiement unique) ; mobile money →
 *      le formulaire, au prix unique du lot (3 500 FCFA pour 3 000 net).
 */
import type { DemandeFenetre } from '@/components/apps/publierAppli'
import type { MoyenPublication } from '@/lib/apps/compteur-phrases'

export const TITRE_FENETRE_LOT = 'Ajouter des modifications'
export const BOUTON_AJOUTER_MODIFICATIONS = 'Ajouter des modifications'
export const PHRASE_LOT_RECU = 'Paiement reçu : vos modifications s’ajoutent au compteur dans un instant.'
export const PHRASE_LOT_ANNULE = 'Paiement annulé : rien n’a été prélevé, aucune modification n’est ajoutée.'
export const BOUTON_LOT = 'Ajouter'
export const PHRASE_LOT_FERME = 'L’ajout de modifications n’est pas encore ouvert pour votre compte.'
export const phraseApresLot = (taille: number) => `Dès que vous validez le paiement sur votre téléphone, ${String(taille)} modifications s’ajoutent à votre compteur.`
export const phraseReussiteLot = (taille: number) => `Paiement reçu : ${String(taille)} modifications s’ajoutent à votre compteur.`
const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/gu, ' ')} FCFA`
export const phrasePrixLot = (taille: number) => (montant: number) => `Un lot de ${String(taille)} modifications : ${fcfa(montant)}.`

export type IssueLot =
  | { readonly type: 'impossible'; readonly message: string }
  | { readonly type: 'paiement' }
  | { readonly type: 'mobile_money' }
  | { readonly type: 'annulee' }
  | { readonly type: 'erreur'; readonly message: string }

type EtatLot = { possible: false; raison: string } | { possible: true; taille: number; moyens: MoyenPublication[] }

export async function lancerAchatLot(o: {
  readonly id: string
  readonly autorisation: string
  readonly ouvrirFenetre: (d: DemandeFenetre) => void
  readonly apresMobileMoney?: () => Promise<unknown>
  /** Pour les tests ; l'écran prend `window.location.assign`. */
  readonly ouvrir?: (url: string) => void
}): Promise<IssueLot> {
  const ouvrir = o.ouvrir ?? ((url: string) => { window.location.assign(url) })
  let etat: EtatLot
  try {
    const res = await fetch(`/api/generateur/lot?id=${encodeURIComponent(o.id)}`, { headers: { Authorization: o.autorisation } })
    const d = (await res.json().catch(() => ({}))) as Partial<EtatLot> & { error?: string }
    if (!res.ok) return { type: 'erreur', message: d.error ?? 'L’ajout de modifications ne répond pas. Réessayez.' }
    etat = d as EtatLot
  } catch {
    return { type: 'erreur', message: 'L’ajout de modifications ne répond pas. Réessayez.' }
  }
  if (!etat.possible) return { type: 'impossible', message: etat.raison }
  if (etat.moyens.length === 0) return { type: 'impossible', message: PHRASE_LOT_FERME }
  const taille = etat.taille
  const sansBearer = o.autorisation.replace(/^Bearer\s+/u, '')
  return new Promise<IssueLot>((resolve) => {
    o.ouvrirFenetre({
      titre: TITRE_FENETRE_LOT,
      adresseInitiale: '',
      adresseModifiable: false,
      listes: [],
      libelleBouton: BOUTON_LOT,
      moyens: etat.moyens,
      avecEtapes: true,
      compte: null,
      verifier: null,
      sansAdresse: { apresPaiement: phraseApresLot(taille), reussite: phraseReussiteLot(taille) },
      mobileMoney: etat.moyens.includes('mobile_money')
        ? { app: o.id, jeton: () => Promise.resolve(sansBearer), onPaye: o.apresMobileMoney ?? (() => Promise.resolve()), lireAdresse: () => Promise.resolve(null), objet: 'lot', phraseDuPrix: phrasePrixLot(taille) }
        : null,
      valider: async (_adresse, moyen) => {
        if (moyen === 'mobile_money') { resolve({ type: 'mobile_money' }); return 'mobile_money' }
        try {
          const res = await fetch(`/api/generateur/lot?id=${encodeURIComponent(o.id)}`, { method: 'POST', headers: { Authorization: o.autorisation } })
          const d = (await res.json().catch(() => ({}))) as { paiement?: string; error?: string }
          if (!res.ok || typeof d.paiement !== 'string') return d.error ?? 'La page de paiement n’a pas pu s’ouvrir.'
          ouvrir(d.paiement)
          resolve({ type: 'paiement' })
          return null
        } catch {
          return 'La page de paiement n’a pas pu s’ouvrir. Réessayez.'
        }
      },
      annuler: () => { resolve({ type: 'annulee' }) },
    })
  })
}
