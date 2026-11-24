/**
 * QUELS MOYENS DE PAIEMENT POUR QUEL PRODUIT DERIBFY (2026-11-23).
 *
 * Décision du propriétaire : tout produit se paie par CARTE ; le MOBILE MONEY
 * aussi, SAUF le dropshipping — carte seulement. Le choix mobile money n'y
 * apparaît pas. Il ne s'agit que des ABONNEMENTS payés à Deribfy, jamais des
 * ventes des boutiques (contrat MoneRails, annexe 2).
 *
 * Aujourd'hui (mesuré), le mobile money n'est branché que pour l'APPLICATION
 * (atelier) ; les sites (vitrine, boutique) le seront au lot L5, par cette
 * règle. Un cliquet (moyens-par-produit.test.ts) refuse qu'un écran de site
 * ou de dropshipping importe le formulaire mobile money sans passer ici.
 * Fichier pur.
 */

export type ProduitDeribfy = 'vitrine' | 'boutique' | 'dropshipping' | 'application'
export type MoyenDePaiement = 'carte' | 'mobile_money'

export function moyensDePaiement(p: ProduitDeribfy): readonly MoyenDePaiement[] {
  return p === 'dropshipping' ? ['carte'] : ['carte', 'mobile_money']
}

export function mobileMoneyPermis(p: ProduitDeribfy): boolean {
  return moyensDePaiement(p).includes('mobile_money')
}
