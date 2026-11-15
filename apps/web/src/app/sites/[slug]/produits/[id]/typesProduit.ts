// Types PURS (aucune lecture) — 2026-11-15. Séparés du module de lecture, qui est
// serveur (lecteurDuSite) : un composant navigateur peut les importer sans
// faire entrer un module `server-only` dans son graphe (cliquet DEBT-081).

export type ProductPage = {
  id: string
  name: string
  description: string
  priceNumber: number
  currency: string
  images: string[]
  inStock: boolean
  /**
   * DETTE 6c — ACHETABILITE, distincte de `inStock` et de `published`.
   *   `published` decide si cette page EXISTE (filtre de la requete) ;
   *   `inStock`   decide s'il en reste ;
   *   `forSale`   decide si le marchand accepte de le vendre.
   * Les produits de catalogue fournisseur n'ont pas cette notion : ils valent
   * `true`, comme avant cette dette.
   */
  forSale: boolean
  siteName: string
  siteSlug: string
  siteCustomDomain: string | null
  primary: string
  theme: string
  lang: string
  mode: number
  shippingFlat: number | null
  /**
   * LOT 4 / R4-01 -- de quoi offrir le MEME choix de variante que la modale
   * de la vitrine. `null` pour un produit du marchand (`shop_products`), qui
   * n'a pas de variantes fournisseur : la fiche se comporte alors comme avant.
   */
  supplierId: string | null
  supplierProductId: string | null
  /** `true` si la ligne catalogue est un PRODUIT (variante obligatoire). */
  requiresVariant: boolean
  /**
   * M2-202 — TAILLES du produit marchand (S, M, L, 42…). Vide pour un produit
   * de catalogue fournisseur : ses déclinaisons sont les VARIANTES, un autre
   * mécanisme, déjà porté par `requiresVariant`.
   */
  sizes: string[]
  /**
   * M2-202 — LE NUMÉRO DU VENDEUR (`social_links.whatsapp`). Il sert les DEUX
   * usages, et c'est la spécification : « ce numéro sera le même pour tous
   * vos produits, et servira aussi à vous joindre » — la commande par
   * WhatsApp ET l'encaissement par transfert mobile. `null` si le marchand ne
   * l'a pas renseigné : la fiche n'affiche alors ni l'un ni l'autre, rien
   * n'est inventé.
   */
  whatsapp: string | null
  /** M2-232 — la boutique a-t-elle un compte d'encaissement ?
   *
   *  `undefined` = INCONNU, et c'est l'état RÉEL aujourd'hui : la vue publique
   *  `sites_public` n'expose pas `payment_account_id` (colonne sensible,
   *  délibérément retenue). Le champ existe pour que la décision puisse s'y
   *  adosser dès qu'un booléen dérivé entrera à la vue ; d'ici là il vaut
   *  INCONNU, et `contactDirectRequis` retombe sur la devise en le sachant. */
  encaisseEnLigne?: boolean | null
  /** M2-210 — numéros d'encaissement {label, number}, libellés du marchand. */
  mobileMoney: { label: string; number: string }[]
  /** M2-217 — prix barré (nombre), présent seulement si > prix actuel. */
  compareAtPrice: number | null
  /**
   * LOT 5 / P5-02 -- `true` sur un site `pod_custom` : le visiteur doit
   * televerser SON design avant tout achat. La fiche produit ne l'offrait pas
   * du tout -- seule la modale de la vitrine portait le televerseur -- si bien
   * qu'un achat depuis la fiche partait TOUJOURS en fabrication sans design.
   */
  requiresDesign: boolean
}
