// M2-206 — LA COMMANDE PAR WHATSAPP ET L'APPEL DIRECT, EN UN SEUL ENDROIT.
//
// DEMANDE DE YOUSSOUF : quand l'acheteur clique un produit, la fiche montre
// un bouton d'APPEL DIRECT du marchand et un bouton WHATSAPP ; et quand il
// presse WhatsApp, le vendeur doit recevoir DE QUEL produit il s'agit —
// « c'est un produit précis avec description précise, comme ça le vendeur
// sait quoi préparer et expédier ».
//
// CE QUE WHATSAPP PERMET, ET CE QU'IL NE PERMET PAS. Un lien `wa.me` ne peut
// PAS joindre une image : seul du TEXTE se pré-remplit. Le vendeur voit la
// photo par un autre chemin, fiable : le message porte le LIEN DU PRODUIT,
// et WhatsApp déroule ce lien en aperçu — photo, nom, prix — parce que la
// page produit déclare son image en `og:image` (generateMetadata la fournit
// depuis `product.images[0]`). Même effet pour le vendeur, sans pièce jointe.
//
// DEUX SURFACES CONSOMMENT CE MODULE — la fiche produit et la modale de la
// vitrine — et c'est la raison de son existence : deux copies du même
// message auraient divergé au premier ajout de champ.

/** Le lien de commande : wa.me + récapitulatif pré-rempli. PURE. */
export function lienCommandeWhatsApp(args: {
  whatsapp: string
  productName: string
  size: string | null
  priceLabel: string
  url: string
}): string | null {
  const digits = args.whatsapp.replace(/\D/g, '')
  if (!digits) return null
  const lignes = [
    args.productName + (args.size ? ` (${args.size})` : ''),
    args.priceLabel,
    args.url,
  ].filter(Boolean)
  return `https://wa.me/${digits}?text=${encodeURIComponent(lignes.join('\n'))}`
}

/**
 * Le lien d'appel direct. `null` plutôt qu'un `tel:` vide : un bouton qui
 * compose le néant est pire que pas de bouton.
 */
export function lienAppel(numero: string | null | undefined): string | null {
  if (!numero) return null
  const garde = numero.replace(/[^\d+]/g, '')
  return garde.replace(/\D/g, '') === '' ? null : `tel:${garde}`
}

/**
 * L'URL absolue d'un produit, construite DEPUIS LA PAGE OÙ L'ON EST.
 *
 * Deux mondes servent la même vitrine : `deribfy.com/sites/<slug>` et le
 * domaine propre du marchand (racine). Résoudre RELATIVEMENT à la page
 * courante donne la bonne URL dans les deux, sans connaître le domaine.
 */
export function urlProduitDepuisLaPage(
  origin: string,
  pathname: string,
  productId: string,
): string {
  const base = pathname.replace(/\/+$/, '')
  const racine = base.includes('/produits/') ? base.slice(0, base.indexOf('/produits/')) : base
  return `${origin}${racine}/produits/${encodeURIComponent(productId)}`
}
