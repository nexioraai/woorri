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
  slug?: string,
): string {
  const base = pathname.replace(/\/+$/, '')
  const i = base.indexOf('/produits/')
  const racine = i !== -1 ? base.slice(0, i) : base
  // M2-213 — L'APERÇU N'EST PAS UNE ADRESSE PUBLIQUE, ET ÇA A CASSÉ UNE
  // VENTE RÉELLE : l'acheteur commande depuis /preview/<slug> (ou /edit),
  // le vendeur reçoit ce lien-là… et tombe sur 404 — la page d'aperçu
  // n'existe que pour le propriétaire connecté. Le lien envoyé vise
  // désormais TOUJOURS l'adresse publique canonique /sites/<slug>/…,
  // la seule que le destinataire peut ouvrir.
  if (slug && !racine.startsWith('/sites/') && racine !== '') {
    return `${origin}/sites/${encodeURIComponent(slug)}/produits/${encodeURIComponent(productId)}`
  }
  return `${origin}${racine}/produits/${encodeURIComponent(productId)}`
}


/**
 * M2-207 — LA PORTE DU MARCHÉ SANS CARTE, DITE PAR YOUSSOUF :
 * « les boutons WhatsApp et appel sur la fiche produit, marché tchadien
 * UNIQUEMENT — ça ne concerne pas les autres pays où on a intégré Stripe. »
 *
 * Le discriminant est la MONNAIE du produit : XAF et XOF sont les deux zones
 * franc CFA où le transfert mobile est la norme d'encaissement. EUR, USD,
 * CAD et le reste gardent leur parcours carte, strictement inchangé.
 * `texte` tolère un libellé de prix (« 28500.00 XAF », « 25 000 - 80 000
 * FCFA ») pour les cartes de collection qui n'ont pas de champ devise.
 */
/**
 * Les écritures RÉELLES du franc CFA, telles que les marchands les tapent.
 *
 * DÉFAUT MESURÉ le 2026-09-23 sur `chanorfie.com` : le marchand ajoute
 * « Chaussures homme », saisit la devise **`CFA`**, et ses boutons WhatsApp
 * disparaissent — alors que les produits générés, en `XAF`, les gardent. Du
 * point de vue du marchand, deux produits identiques se comportent
 * différemment sans raison visible.
 *
 * Il n'avait pas tort : `CFA` EST le franc CFA. C'est la porte qui était trop
 * étroite. Elle ne connaissait que le code ISO, alors que personne ne tape un
 * code ISO — on tape ce qu'on lit sur les étiquettes.
 *
 * L'INVARIANT TIENT : on reconnaît une DEVISE, jamais un pays. Aucun nom de
 * pays n'entre ici, et aucune règle ne se déclenche sur « Tchad ».
 */
const ECRITURES_FRANC_CFA = /^(XAF|XOF|F?\s*CFA|FRANCS?\s*CFA|CFA\s*FRANCS?)$/u

export function marcheSansCarte(currency?: string | null, texte?: string | null): boolean {
  const c = (currency ?? '').trim().toUpperCase().replace(/\s+/gu, ' ')
  if (ECRITURES_FRANC_CFA.test(c)) return true
  // Repli sur le LIBELLÉ de prix, quand la devise n'est pas renseignée : un
  // prix affiché « 20 000 FCFA » dit la même chose qu'un code.
  const t = (texte ?? '').toUpperCase()
  return /\b(XAF|XOF|FCFA|F CFA|CFA)\b/u.test(t)
}


/**
 * M2-210 — PLUSIEURS NUMÉROS D'ENCAISSEMENT, LIBELLÉS PAR LE MARCHAND.
 *
 * Youssouf : « le marchand peut avoir un numéro Moov Money ET un numéro
 * Airtel Money — on ne laisse pas passer un acheteur parce qu'on n'a pas
 * couvert son opérateur. » Le LIBELLÉ est un texte LIBRE saisi par le
 * marchand : aucun nom d'opérateur ne vit dans le code, la structure est
 * {label, number} et rien d'autre — l'invariant structurel est intact.
 */
export type NumeroMobileMoney = { label: string; number: string }

/** Nettoie une liste venue du JSON du site : formes inattendues absorbées,
 *  numéros sans chiffres écartés, jamais d'invention. PURE. */
export function nettoieNumerosMobileMoney(brut: unknown): NumeroMobileMoney[] {
  if (!Array.isArray(brut)) return []
  const out: NumeroMobileMoney[] = []
  for (const e of brut) {
    if (typeof e !== 'object' || e === null) continue
    const number = String((e as { number?: unknown }).number ?? '').trim()
    if (number.replace(/\D/g, '') === '') continue
    const label = String((e as { label?: unknown }).label ?? '').trim()
    out.push({ label, number })
  }
  return out.slice(0, 6)
}

/**
 * Les numéros à MONTRER à l'acheteur : la liste du marchand, sinon le repli
 * historique — son numéro de contact, sans libellé. Jamais une liste vide
 * quand un numéro existe quelque part.
 */
export function numerosDEncaissement(
  mobileMoney: unknown,
  whatsapp: string | null | undefined,
): NumeroMobileMoney[] {
  const liste = nettoieNumerosMobileMoney(mobileMoney)
  if (liste.length > 0) return liste
  return whatsapp ? [{ label: '', number: whatsapp }] : []
}
