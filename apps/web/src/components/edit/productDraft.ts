// DETTE 6c — LE PARCOURS DE MISE EN VENTE, EXTRAIT ET RENDU VERIFIABLE.
//
// POURQUOI CE FICHIER EXISTE. Avant cette dette, la seule couverture de
// `for_sale` cote marchand etait ceci :
//
//     expect(draft).toMatch(/for_sale: boolean;/)
//
// c'est-a-dire la PRESENCE D'UNE LIGNE DE CODE, jamais un comportement. Rien
// ne pouvait rougir si l'etat initial du formulaire changeait, si une
// sauvegarde cessait de transporter le champ, ou si l'ouverture d'un produit
// en dévendait un autre. Le depot n'a ni jsdom ni testing-library : un
// composant client n'y est pas interrogeable par simulation d'evenements.
//
// Ces trois decisions -- l'etat initial, la lecture d'un produit existant, la
// charge envoyee -- sont donc extraites ici, PURES. C'est le patron deja
// employe par `canTransact`, `productResolution` et `galleryResolution` : le
// point de decision sort du composant, et devient testable pour de vrai.
// `ProductManager` ne garde que le rendu et les appels reseau.

/**
 * ETAPE 7 — `stock` N'EST PAS ICI, et c'est structurel.
 *
 * Il y etait, et c'etait le defaut : le formulaire chargeait `stock` a
 * l'ouverture puis le renvoyait dans CHAQUE sauvegarde. Un marchand qui
 * comptait 50 unites, puis corrigeait le prix depuis un formulaire ouvert
 * AVANT le comptage, reecrivait silencieusement l'ancien stock -- le comptage
 * etait perdu sans qu'aucune erreur n'apparaisse. Le retirer rend cette perte
 * IMPOSSIBLE : la sauvegarde generale n'a plus de valeur de stock a envoyer.
 *
 * ETAPE 8, VOLET A — `for_sale`, LUI, Y EST.
 * `stock` en a ete retire parce qu'un comptage est un FAIT observe qu'une
 * sauvegarde generale ne doit jamais pouvoir ecraser. `for_sale` est une
 * INTENTION : le marchand la declare au meme moment et par le meme geste que
 * la visibilite. Rien ne se perd si l'une ecrase l'autre -- elles decrivent
 * l'instant present.
 */
export type ProductDraft = {
  name: string;
  description: string;
  price: string;
  currency: string;
  /**
   * M2-202 — TAILLES, saisies comme TEXTE LIBRE (« S, M, L » ou « 40, 42 »).
   * Le formulaire parle la langue du marchand ; la charge envoyée porte le
   * tableau. La conversion vit dans `paylodFromDraft`, PURE et testée.
   */
  sizes: string;
  /**
   * M2-234 — L'ANCIEN PRIX, celui qu'on montre BARRÉ à côté du prix actuel.
   *
   * C'est le geste le plus courant du commerce de détail : « avant 25 000,
   * aujourd'hui 20 000 ». Il existait en base (`compare_at_price`) et à
   * l'affichage, et l'outil Promo le posait EN MASSE — mais le marchand ne
   * pouvait pas le saisir PRODUIT PAR PRODUIT. Il ne pouvait donc pas solder
   * un seul article, ce qui est pourtant le cas le plus fréquent.
   *
   * TEXTE, comme `price` : le formulaire parle la langue du marchand, la
   * conversion vit dans `payloadFromDraft`, pure et testée. Chaîne vide =
   * aucun prix barré.
   */
  compare_at_price: string;
  images: string[];
  published: boolean;
  for_sale: boolean;
};

/** La forme minimale que ce module lit d'un produit deja enregistre. */
export type EditableProduct = {
  compare_at_price?: number | null;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  sizes?: string[] | null;
  images: string[];
  published: boolean;
  for_sale: boolean;
};

/**
 * M2-201 — LA DEVISE N'EST PLUS CODEE EN DUR, ET C'ETAIT UN VRAI DEFAUT.
 *
 * CE QUI ETAIT LA : `currency: 'CAD'` dans l'etat initial du formulaire. Tout
 * produit cree partait donc en dollars canadiens, quel que soit le marche du
 * marchand. MESURE SUR UNE BOUTIQUE REELLE A N'DJAMENA : les prix
 * s'affichaient en « $ » alors que la boutique vend en francs CFA, et le
 * marchand devait corriger la devise A CHAQUE produit -- ou ne pas la voir.
 *
 * CE QUI LA REMPLACE : la devise du formulaire se DEDUIT des produits deja
 * enregistres. Un marchand qui a vendu une fois en XAF cree son deuxieme
 * produit en XAF, sans rien retaper. C'est la boutique elle-meme qui porte la
 * reponse -- pas une constante ecrite par quelqu'un qui ne connait pas son
 * marche.
 *
 * ET SUR UNE BOUTIQUE VIDE ? Aucune valeur n'est inventee : le champ reste
 * VIDE et le marchand le renseigne. Proposer une devise au hasard serait
 * reproduire le defaut en changeant seulement de monnaie par defaut -- un
 * marchand tchadien n'a pas plus de raison de voir « CAD » que « XAF » de
 * s'imposer a un marchand canadien. L'ignorance ne fabrique rien.
 */
export function deviseParDefaut(produits: readonly { currency?: string | null }[]): string {
  // La devise la PLUS REPANDUE parmi les produits existants : un produit isole
  // saisi par erreur dans une autre monnaie ne doit pas devenir la reference.
  const comptes = new Map<string, number>();
  for (const p of produits) {
    const c = (p.currency ?? '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(c)) continue;
    comptes.set(c, (comptes.get(c) ?? 0) + 1);
  }
  let gagnante = '';
  let meilleur = 0;
  for (const [code, n] of comptes) {
    if (n > meilleur) {
      gagnante = code;
      meilleur = n;
    }
  }
  return gagnante;
}

/**
 * DETTE 6c — L'ETAT INITIAL DU FORMULAIRE DE CREATION.
 *
 * `published: true` — un produit qu'on cree, on le montre.
 * `for_sale: false` — MAIS on ne le VEND pas tant qu'on ne l'a pas dit.
 *
 * CE QUI CHANGE, ET CE QUI NE CHANGE PAS. Le `DEFAULT true` de la colonne
 * `shop_products.for_sale` est INTACT, et le restera : il est la reponse a
 * « que vaut ce champ pour un appelant qui l'omet ? », et sa reponse doit
 * rester « vendable », sans quoi toute ligne creee hors de ce formulaire
 * changerait de sens. Ce fichier ne repond pas a cette question-la : il
 * repond a « que propose le formulaire avant que le marchand ait parle ? ».
 * Le formulaire envoie donc TOUJOURS une valeur explicite -- il n'omet
 * jamais le champ, et ne s'appuie donc jamais sur le defaut SQL.
 *
 * POURQUOI L'ACTE PLUTOT QUE LE DEFAUT. Mettre en vente engage a encaisser.
 * Une case pre-cochee fait porter cet engagement par l'inaction ; une case
 * vide le fait porter par une decision. C'est la meme lecon que l'allowlist
 * de `canTransact` : on nomme ce qu'on autorise, jamais ce qu'on exclut.
 *
 * M2-201 — `currency` y est desormais VIDE. Voir `deviseParDefaut` : la
 * boutique porte sa propre reponse, et une boutique neuve n'en a pas encore.
 */
export const EMPTY_DRAFT: ProductDraft = {
  name: '',
  description: '',
  price: '',
  currency: '',
  sizes: '',
  compare_at_price: '',
  images: [],
  published: true,
  for_sale: false,
};

/** L'etat initial POUR CETTE BOUTIQUE — la devise vient de ses produits. */
export function draftVierge(produits: readonly { currency?: string | null }[]): ProductDraft {
  return { ...EMPTY_DRAFT, currency: deviseParDefaut(produits) };
}

/**
 * Ouverture d'un produit existant dans le formulaire.
 *
 * `for_sale: p.for_sale !== false` et non `=== true` : si le champ manquait
 * de la lecture -- projection modifiee, colonne renommee -- l'ouverture du
 * formulaire ne doit pas devendre le produit en silence. L'inconnu ne doit
 * pas se transformer en retrait de vente a l'insu du marchand.
 */
export function draftFromProduct(p: EditableProduct): ProductDraft {
  return {
    name: p.name,
    description: p.description ?? '',
    price: String(p.price),
    currency: p.currency,
    sizes: (p.sizes ?? []).join(', '),
    // Rouvrir un produit soldé doit remontrer SON ancien prix : sans cela,
    // la moindre modification du nom effacerait la promotion en silence.
    compare_at_price: p.compare_at_price != null ? String(p.compare_at_price) : '',
    images: p.images ?? [],
    published: p.published,
    for_sale: p.for_sale !== false,
  };
}

/**
 * La charge commune au POST et au PATCH.
 *
 * ETAPE 7 — `stock` en est ABSENT, delibarement : la sauvegarde generale ne
 * transporte aucune valeur de stock. Le stock initial est ajoute par le seul
 * appelant du POST, jamais ici.
 *
 * DETTE 6c — `for_sale` y est TOUJOURS present, dans les deux sens. Le
 * formulaire ne s'en remet pas au defaut de la colonne : il declare.
 */
/**
 * M2-202 — LE TEXTE LIBRE DEVIENT UN TABLEAU PROPRE. Virgules, espaces et
 * doublons sont absorbés ici, une fois : « S, M , L, S » → ["S","M","L"].
 * Le composant n'a rien à savoir de cette forme.
 */
export function taillesDepuisTexte(texte: string): string[] {
  const vues = new Set<string>();
  const out: string[] = [];
  for (const brut of texte.split(',')) {
    const t = brut.trim();
    if (t === '' || vues.has(t.toLowerCase())) continue;
    vues.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

/**
 * L'ancien prix RETENU, ou `null`.
 *
 * ── UN PRIX BARRÉ QUI NE BARRE RIEN EST UN MENSONGE À L'ACHETEUR.
 *
 * S'il est inférieur ou égal au prix actuel, il n'annonce aucune remise : il
 * fait croire à une affaire qui n'existe pas. L'affichage refusait déjà de le
 * montrer dans ce cas — mais il était alors ENREGISTRÉ sans effet, et le
 * marchand croyait avoir posé une promotion invisible.
 *
 * On le neutralise donc à la SOURCE : ce qui est enregistré est ce qui sera
 * montré, jamais autre chose.
 */
export function ancienPrixRetenu(compareAt: string, prix: string): number | null {
  const barre = parseFloat(compareAt)
  const actuel = parseFloat(prix) || 0
  if (!Number.isFinite(barre) || barre <= 0) return null
  return barre > actuel ? barre : null
}

export function payloadFromDraft(d: ProductDraft) {
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    price: parseFloat(d.price) || 0,
    currency: d.currency,
    sizes: taillesDepuisTexte(d.sizes),
    compare_at_price: ancienPrixRetenu(d.compare_at_price, d.price),
    images: d.images,
    published: d.published,
    for_sale: d.for_sale,
  };
}
