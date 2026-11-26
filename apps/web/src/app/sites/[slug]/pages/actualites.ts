// LE MODULE ACTUALITÉS (2026-11-26) — règles PURES, sans lecture.
//
// OPT-IN, DÉCLARÉ PAR LES DONNÉES : le module s'allume quand le site déclare
// une page `actualites` (table `site_pages`), comme le hero « vitrine »
// s'allume avec `accueil-hero`. Sans elle, RIEN ne change : `/actualites`
// reste un 404, les pages `actualites/…` déjà déclarées gardent leur rendu.
// C'est ce qui permet de pousser le module sans toucher un site en ligne.
//
// Avec elle :
//   · `/actualites` liste TOUT, avec des onglets par catégorie ;
//   · `/actualites/articles|communiques|evenements` filtre — une page déclarée
//     à cette adresse (Agenda, Communiqués de la CPA) prête son titre et son
//     introduction ; absente, le titre vient du libellé ;
//   · l'entrée de menu est la page déclarée elle-même (`menu = true`) ;
//   · l'accueil montre « Dernières actualités » (3 au plus), jamais vide.
// Types déclarés ICI, pas importés de `blog/fetchPosts` (serveur) : un thème
// client importe ce module, et le cliquet DEBT-081 compte aussi les `import type`.
// Ils sont structurellement identiques à `CategorieArticle` / `BlogPostCard`.
export type CategorieArticle = 'article' | 'communique' | 'evenement'
export type CarteActualite = {
  slug: string
  title: string
  excerpt: string | null
  cover_image: string | null
  published_at: string | null
  categorie: CategorieArticle
}

export const CHEMIN_ACTUALITES = 'actualites'

/** L'onglet de chaque catégorie, dans l'ordre d'affichage. */
export const ONGLETS_ACTUALITES: readonly { readonly segment: string; readonly categorie: CategorieArticle }[] = [
  { segment: 'articles', categorie: 'article' },
  { segment: 'communiques', categorie: 'communique' },
  { segment: 'evenements', categorie: 'evenement' },
]

/** Ce que l'adresse demande au module : `null` hors module ; `categorie: null` = tout. */
export function vueActualites(chemin: string): { readonly categorie: CategorieArticle | null } | null {
  if (chemin === CHEMIN_ACTUALITES) return { categorie: null }
  const m = /^actualites\/([a-z]+)$/u.exec(chemin)
  if (m === null) return null
  const o = ONGLETS_ACTUALITES.find((x) => x.segment === m[1])
  return o === undefined ? null : { categorie: o.categorie }
}

/** L'adresse d'un onglet (`null` = tout). */
export function lienOnglet(base: string, categorie: CategorieArticle | null): string {
  const o = ONGLETS_ACTUALITES.find((x) => x.categorie === categorie)
  return o === undefined ? `${base}/${CHEMIN_ACTUALITES}` : `${base}/${CHEMIN_ACTUALITES}/${o.segment}`
}

export type LibellesActualites = {
  readonly titre: string
  readonly tout: string
  readonly article: string
  readonly communique: string
  readonly evenement: string
  readonly vide: string
  readonly dernieres: string
  readonly voirTout: string
}

const COPIE: Record<string, LibellesActualites> = {
  fr: { titre: 'Actualités', tout: 'Tout', article: 'Articles', communique: 'Communiqués', evenement: 'Agenda', vide: 'Aucune publication pour l’instant.', dernieres: 'Dernières actualités', voirTout: 'Toutes les actualités' },
  en: { titre: 'News', tout: 'All', article: 'Articles', communique: 'Press releases', evenement: 'Events', vide: 'Nothing published yet.', dernieres: 'Latest news', voirTout: 'All news' },
  es: { titre: 'Noticias', tout: 'Todo', article: 'Artículos', communique: 'Comunicados', evenement: 'Agenda', vide: 'Aún no hay publicaciones.', dernieres: 'Últimas noticias', voirTout: 'Todas las noticias' },
  ar: { titre: 'الأخبار', tout: 'الكل', article: 'مقالات', communique: 'بيانات صحفية', evenement: 'الفعاليات', vide: 'لا توجد منشورات بعد.', dernieres: 'آخر الأخبار', voirTout: 'كل الأخبار' },
}

/** Les libellés, dans la langue DU SITE (jamais celle du visiteur). */
export function libellesActualites(lang: string | null | undefined): LibellesActualites {
  return COPIE[(lang ?? 'fr').slice(0, 2)] ?? COPIE.fr
}

/** Le libellé d'un onglet. */
export function libelleOnglet(t: LibellesActualites, categorie: CategorieArticle | null): string {
  return categorie === null ? t.tout : t[categorie]
}

/** L'accueil ne montre que les 3 dernières — et rien si rien n'est publié. */
export const NOMBRE_DERNIERES = 3
