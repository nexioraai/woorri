import GalerieProduit from './GalerieProduit'

// ============================================================
// LES PRODUITS D'UNE PAGE PERSONNALISÉE.
//
// ── LE BESOIN, TEL QUE POSÉ PAR LES MARCHANDS.
//
// « Une page par article : page colliers, page chaussures, page t-shirts. »
// Une page ne portait jusqu'ici qu'un titre, un texte et une image — rien
// qui permette d'y montrer ce qu'on vend. Le marchand créait la page, ne
// pouvait rien y mettre, et concluait que le bouton ne servait à rien.
//
// ── POURQUOI LA SÉLECTION VIT DANS LA PAGE, ET NON DANS LE PRODUIT.
//
// L'autre possibilité était d'étiqueter chaque produit d'une catégorie. Elle
// oblige à choisir UNE catégorie par article, et elle demande une colonne en
// base. Or un même collier peut légitimement figurer sur « Colliers » et sur
// « Nouveautés ». La page tient donc la liste des identifiants qu'elle
// montre : aucun produit n'est déplacé, aucun n'est exclusif, et rien ne
// change dans la base — `pages` est déjà du JSON.
//
// ── UN SEUL COMPOSANT POUR LES QUATRE VITRINES.
//
// La galerie photo vient de démontrer ce que coûtent quatre copies : une
// vitrine était restée en arrière pendant des semaines sans que personne le
// voie. Les thèmes passent donc tous par ici, et ne se distinguent que par
// les couleurs qu'ils transmettent.
// ============================================================

export type ProduitDePage = {
  /**
   * OPTIONNEL parce que `Product` l'est : le catalogue JSON du Mode 1 et les
   * maquettes POD n'ont pas d'identifiant. Un produit sans identifiant ne peut
   * pas être sélectionné dans une page — `produitsDeLaPage` l'écarte.
   */
  id?: string
  name: string
  price?: string | null
  compareAt?: string | null
  image?: string | null
  images?: readonly string[]
}

export type PageProduitsProps = {
  slug: string
  produits: readonly ProduitDePage[]
  primary: string
  /** Palette sombre (Noir) : le texte et les bordures s'inversent. */
  sombre?: boolean
}

export default function PageProduits({ slug, produits, primary, sombre = false }: PageProduitsProps) {
  if (produits.length === 0) return null

  const encre = sombre ? '#F5F3EE' : '#171717'
  const encreDouce = sombre ? 'rgba(245,243,238,0.55)' : 'rgba(23,23,23,0.55)'
  const bordure = sombre ? 'rgba(245,243,238,0.10)' : 'rgba(0,0,0,0.08)'
  const fond = sombre ? 'rgba(245,243,238,0.03)' : '#fff'

  return (
    <div className="mt-12 grid grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
      {produits.map((p) => {
        const photos = p.images ?? []
        return (
          <a
            key={p.id ?? p.name}
            // ── LE CHEMIN COMPLET, ET C'EST INDISPENSABLE.
            //
            // `/produits/x` fonctionne sur un domaine personnalisé — `proxy.ts`
            // y réécrit tout vers `/sites/{slug}` — mais PAS sur le domaine de
            // la plateforme, où la boutique vit sous `/sites/{slug}`. Un lien
            // relatif y mènerait à une page inexistante. Même calcul que
            // `ClickableProductCard`, seule forme éprouvée.
            href={`/sites/${slug}/produits/${encodeURIComponent(p.id ?? '')}`}
            className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 block"
            style={{ border: `1px solid ${bordure}`, background: fond, color: 'inherit', textDecoration: 'none' }}
          >
            {/* `contain` PARTOUT : une vitrine qui rogne ne montre pas le
                produit. Et la galerie dès qu'il y a plus d'une photo — le
                marchand qui en dépose cinq les dépose pour qu'on les voie. */}
            <div className="aspect-square relative overflow-hidden" style={{ background: sombre ? '#1F1810' : '#fafafa' }}>
              {photos.length > 1 ? (
                <GalerieProduit
                  points="bas"
                  images={photos}
                  alt={p.name}
                  ratio="1 / 1"
                  primary={primary}
                  fond="transparent"
                  arrondi={0}
                  optimisee
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              ) : p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full"
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold opacity-20" style={{ color: primary }}>
                  {(p.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="text-sm font-medium line-clamp-2 mb-1" style={{ color: encre }}>{p.name}</h3>
              {p.price && (
                <span className="flex items-baseline gap-2">
                  {/* La remise se voit SANS ouvrir la fiche : une remise qu'on
                      ne voit pas ne fait pas vendre. */}
                  {p.compareAt && (
                    <span className="text-xs line-through" style={{ color: encreDouce }}>{p.compareAt}</span>
                  )}
                  <span className="text-base font-semibold" style={{ color: primary }}>{p.price}</span>
                </span>
              )}
            </div>
          </a>
        )
      })}
    </div>
  )
}

/**
 * Les produits qu'une page doit montrer, dans l'ordre choisi par le marchand.
 *
 * ── DEUX PIÈGES, TOUS DEUX DÉJÀ PAYÉS AILLEURS DANS CE DÉPÔT.
 *
 * 1. Un identifiant qui ne correspond à AUCUN produit (article supprimé,
 *    dépublié) ne doit pas produire de case vide : il est simplement ignoré.
 * 2. L'ordre est celui de la SÉLECTION, pas celui du catalogue — le marchand
 *    qui range ses colliers attend de les retrouver rangés.
 */
export function produitsDeLaPage<T extends { id?: string | null }>(
  tous: readonly T[],
  identifiants: unknown,
): T[] {
  if (!Array.isArray(identifiants)) return []
  // Un produit SANS identifiant ne peut pas être désigné : l'écarter ici évite
  // qu'une clé `undefined` en attrape un au hasard.
  const index = new Map(tous.filter((p) => p.id).map((p) => [String(p.id), p]))
  const vus = new Set<string>()
  const retenus: T[] = []
  for (const brut of identifiants) {
    const id = String(brut)
    if (vus.has(id)) continue
    vus.add(id)
    const p = index.get(id)
    if (p) retenus.push(p)
  }
  return retenus
}
