import { marcheSansCarte } from './whatsappOrder'

// ============================================================
// QUAND FAUT-IL MONTRER WHATSAPP, L'APPEL ET LE MOBILE MONEY ?
//
// ── CE QUI NE MARCHAIT PAS, ET POURQUOI C'ÉTAIT STRUCTUREL.
//
// La règle reposait sur la DEVISE, saisie en TEXTE LIBRE par le marchand.
// Mesuré sur `chanorfie.com`, trois produits ajoutés à la main, trois écritures
// différentes : `XAF`, `CFA`, puis `F`. À chaque fois les boutons
// disparaissaient, et à chaque fois j'élargissais le test de chaîne. Demain
// ce sera « Fr », « franc », « FCA ». Ce n'est pas un système, c'est du
// colmatage — et le marchand découvre la panne sur sa boutique en ligne.
//
// ── LE FAIT STRUCTUREL QUI EXISTAIT DÉJÀ, ET QUE PERSONNE N'INTERROGEAIT.
//
// `sites.payment_account_id` dit si la boutique a un compte d'encaissement.
// `api/shop/checkout` s'en sert DÉJÀ pour refuser une commande :
// « Paiements non configurés pour ce site » (route.ts:73).
//
// Autrement dit : **une boutique sans compte d'encaissement ne peut pas être
// payée en ligne, point.** Le seul canal qui lui reste est le contact direct.
// Les boutons ne sont alors pas une option régionale — ils sont LE parcours
// d'achat. Les cacher revient à publier une boutique où l'on ne peut rien
// acheter.
//
// Mesuré au 2026-09-23 : `chanorfie.com`, `alloufshop.com` et
// `yiaglobalcommodities.com` ont toutes `payment_account_id = null`.
//
// ── L'INVARIANT EST TENU, ET RENFORCÉ.
//
// « Le moteur ne connaît que la réponse structurelle ; les boutons ne se
// déclenchent JAMAIS sur "pays == Tchad" écrit en dur. » Aucun pays n'entre
// ici, et on cesse même de deviner une devise pour le cas principal : on lit
// une CAPACITÉ de la boutique. C'est plus structurel qu'avant, pas moins.
//
// La devise reste un signal SECONDAIRE, pour le cas où une boutique encaisse
// par carte tout en servant un marché sans carte — elle garde alors les deux
// chemins. Les marchés Stripe, eux, sont rigoureusement inchangés.
// ============================================================

export type ContexteContact = {
  /** La boutique a-t-elle un compte d'encaissement en ligne ? */
  readonly encaisseEnLigne: boolean
  /** Devise du produit, telle que saisie. Signal SECONDAIRE seulement. */
  readonly devise?: string | null
  /** Libellé de prix, repli quand la devise n'est pas renseignée. */
  readonly libellePrix?: string | null
  /** Un numéro existe-t-il pour joindre le vendeur ? */
  readonly numero?: string | null
}

/**
 * La boutique peut-elle encaisser en ligne ?
 *
 * Un identifiant de compte VIDE ou absent vaut « non » : c'est exactement la
 * lecture que fait `checkout`, et deux lectures divergentes du même champ sont
 * la façon la plus sûre de produire une boutique qui affiche un panier sans
 * pouvoir l'encaisser.
 */
export function encaisseEnLigne(paymentAccountId?: string | null): boolean {
  return typeof paymentAccountId === 'string' && paymentAccountId.trim() !== ''
}

/**
 * Faut-il montrer le contact direct (WhatsApp, appel, Mobile Money) ?
 *
 * DEUX CHEMINS, et le premier est celui qui manquait :
 *
 *   1. La boutique N'ENCAISSE PAS en ligne → OUI, toujours. C'est le seul
 *      moyen d'acheter. Aucune devise n'entre dans cette décision.
 *   2. Elle encaisse, mais sert un marché sans carte → OUI aussi : la carte
 *      n'y est pas le moyen usuel, le contact reste utile.
 *
 * Dans les deux cas, un NUMÉRO est exigé : un bouton qui ne compose rien est
 * pire que pas de bouton.
 */
export function contactDirectRequis(ctx: ContexteContact): boolean {
  if (!ctx.numero) return false
  if (!ctx.encaisseEnLigne) return true
  return marcheSansCarte(ctx.devise, ctx.libellePrix)
}
