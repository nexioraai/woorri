import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchSite, resolveSiteBaseUrl } from '../themes/shared'
import BlocsDePage from '../pages/BlocsDePage'
import { fetchBlogIndex, type BlogPostCard, type CategorieArticle } from '../blog/fetchPosts'
import { fetchPage, fetchFilDAriane, fetchEnfants } from '../pages/fetchPage'
import { ogLocaleFor } from '@/lib/i18n/supportedLanguages'
import HtmlLang from '../themes/HtmlLang'
import JsonLdScript from '../themes/JsonLdScript'

// ============================================================
// LOT 1 -- LA ROUTE QUI RESOUT AU LIEU DE MOURIR.
//
// CE QUE CE FICHIER CONTENAIT, ET DEPUIS TOUJOURS :
//     export default function SiteCatchAll() { notFound() }
// Une ligne. TOUT chemin inconnu d'un site rendait 404, et le moteur ne
// servait que SIX formes d'adresse -- `/`, `/blog`, `/blog/<titre>`,
// `/produits/<id>`, `/appels-offres`, `/appels-offres/<reference>`.
//
// Un site institutionnel en demande des dizaines. EPSS, la centrale
// pharmaceutique ethiopienne equivalente a la CPA, en sert 29 rien que dans
// son menu. C'etait le verrou de tout le chantier.
//
// ── CE QUI N'A PAS CHANGE, ET QUI EST GARDE PAR UNE MESURE.
//
// Les segments STATIQUES l'emportent sur ce catch-all dans l'ordre de routage
// de Next.js : `/blog`, `/produits`, `/appels-offres` continuent d'etre
// servis par leurs propres fichiers. Ce catch-all ne voit que ce qu'AUCUNE
// route ne reclame.
//
// Releve de base pris AVANT ce lot : 63 mesures sur les 9 sites servis --
// 27 x HTTP 200, 36 x HTTP 404. Apres, les 27 doivent etre IDENTIQUES, code
// ET titre. Un chemin qui passerait de 200 a 404 serait une regression ; de
// 404 a 200 sans page declaree, une fuite.
//
// ── LES DEUX REFUS, EXPLICITES.
//
//   ① une adresse qui n'est PAS une page declaree -> 404, jamais une page
//      vide. Un 200 sur une adresse inventee dirait aux moteurs qu'elle
//      existe, et la ferait indexer.
//   ② une page declaree mais NON PUBLIEE -> non servie. Ce n'est pas ce
//      fichier qui l'assure : la vue `site_pages_public` ne la rend pas.
//      L'invariant vit en base, pas ici.
// ============================================================

type Props = { params: Promise<{ slug: string; rest: string[] }> }

/** Le chemin demande, normalise comme la base l'exige : sans barre initiale,
 *  sans barre finale. `decodeURIComponent` par segment -- un chemin encode
 *  doit resoudre la meme page que sa forme claire. */
function cheminDe(rest: string[]): string {
  return rest.map((s) => decodeURIComponent(s)).filter(Boolean).join('/')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, rest } = await params
  const site = await fetchSite(slug)
  if (!site) return { title: 'Page introuvable' }

  const page = await fetchPage(site.id, cheminDe(rest))
  // Pas de `robots: noindex` : la page rend 404 par `notFound()`, et une 404
  // est deja le signal correct. Annoncer `noindex` sur une page servie en 200
  // serait le defaut GEN-D033 a l'envers.
  if (!page) return { title: 'Page introuvable' }

  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  const url = `${base}/${page.chemin}`
  const description = (page.chapeau ?? '').trim().slice(0, 157) || undefined

  return {
    title: `${page.titre} — ${site.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: page.titre, description, url,
      siteName: site.name, type: 'article', locale: ogLocaleFor(site.lang),
    },
    twitter: { card: 'summary', title: page.titre, description },
  }
}

export default async function PageDeclaree({ params }: Props) {
  const { slug, rest } = await params
  const site = await fetchSite(slug)
  if (!site) notFound()

  const chemin = cheminDe(rest)
  const page = await fetchPage(site.id, chemin)
  // REFUS ① : rien de declare a cette adresse -> 404, jamais une page vide.
  if (!page) notFound()

  const [fil, enfants] = await Promise.all([
    fetchFilDAriane(site.id, chemin),
    fetchEnfants(site.id, chemin),
  ])

  // LOT 7 — LES ARTICLES DES BLOCS « articles ».
  //
  // Ils sont chargés ICI, pas dans le composant de rendu : un composant qui
  // irait chercher ses propres données rendrait le nombre de requêtes d'une
  // page imprévisible -- trois blocs « articles » feraient trois allers-
  // retours sans que personne ne le voie.
  //
  // On DÉDUPLIQUE par catégorie : deux blocs visant la même catégorie ne
  // doivent faire qu'UNE lecture.
  const categories = [
    ...new Set(
      page.blocs
        .filter((b): b is Extract<typeof b, { type: 'articles' }> => b.type === 'articles')
        .map((b) => b.categorie),
    ),
  ]
  const parCategorie = new Map<CategorieArticle, BlogPostCard[]>()
  if (categories.length > 0) {
    const lots = await Promise.all(categories.map((c) => fetchBlogIndex(slug, c)))
    categories.forEach((c, i) => parCategorie.set(c, lots[i]?.posts ?? []))
  }

  const host = (await headers()).get('host')
  const base = resolveSiteBaseUrl(site, host)
  const accent = site.primary_color || '#111111'
  const lang = (site.lang || 'fr').slice(0, 2)
  const rtl = lang === 'ar'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.titre,
    url: `${base}/${page.chemin}`,
    inLanguage: site.lang || undefined,
    dateModified: page.maj_le || undefined,
    isPartOf: { '@type': 'WebSite', name: site.name, url: base },
    // Le fil d'Ariane est declare aux moteurs, pas seulement dessine.
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: site.name, item: base },
        ...fil.map((p, i) => ({
          '@type': 'ListItem', position: i + 2, name: p.titre, item: `${base}/${p.chemin}`,
        })),
        { '@type': 'ListItem', position: fil.length + 2, name: page.titre, item: `${base}/${page.chemin}` },
      ],
    },
  }

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <HtmlLang lang={site.lang} />
      {/* ── LA PAGE PEINT SON PROPRE FOND, ET CE N'EST PAS UN DÉTAIL.
          `globals.css` pose `body { background: #0a050e }` — un fond quasi
          noir. Les thèmes peignent le leur sur leur conteneur ; cette page
          est AUTONOME, elle n'en a pas. Rendue en `color: inherit`, elle
          affichait du texte sombre sur fond sombre : ILLISIBLE.
          Mesuré à l'écran le 2026-11-07, sur le site servi.
          Règle : un écran autonome déclare SON fond et SA couleur, il ne les
          hérite jamais. */}
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111111' }}>
      <main
        dir={rtl ? 'rtl' : 'ltr'}
        style={{ maxWidth: 820, margin: '0 auto', padding: '64px 24px' }}
      >
        {/* FIL D'ARIANE -- derive du chemin, et seuls les ancetres REELLEMENT
            publies y figurent. Un ancetre non publie n'y devient pas un lien
            mort : il n'y figure pas du tout. */}
        <nav aria-label="Fil d'Ariane" style={{ fontSize: 14, marginBottom: 24, opacity: 0.7 }}>
          <Link href={base} style={{ color: accent, textDecoration: 'none' }}>{site.name}</Link>
          {fil.map((p) => (
            <span key={p.chemin}>
              <span style={{ opacity: 0.4 }}> / </span>
              <Link href={`${base}/${p.chemin}`} style={{ color: accent, textDecoration: 'none' }}>
                {p.titre}
              </Link>
            </span>
          ))}
          <span style={{ opacity: 0.4 }}> / </span>
          <span aria-current="page">{page.titre}</span>
        </nav>

        <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          {page.titre}
        </h1>

        {page.chapeau && (
          <p style={{ fontSize: 19, lineHeight: 1.6, opacity: 0.75, margin: '0 0 40px' }}>
            {page.chapeau}
          </p>
        )}

        {/* LE CORPS EST DU TEXTE, PAS DU HTML. `dangerouslySetInnerHTML` est
            interdit ici : un corps editable par un client deviendrait une
            injection. Les sauts de ligne sont rendus par `white-space`. */}
        {page.corps && (
          <div style={{ fontSize: 17, lineHeight: 1.75, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {page.corps}
          </div>
        )}

        {/* LOT 4 — LE CORPS STRUCTURE. Il vient APRES le corps libre : une page
            qui portait deja du texte ne le perd pas en gagnant ses blocs. */}
        {page.blocs.length > 0 && (
          <BlocsDePage
            blocs={page.blocs}
            base={base}
            primary={site.primary_color || undefined}
            articles={parCategorie}
            lang={site.lang}
          />
        )}

        {/* LES ENFANTS -- une page d'entree ne porte qu'un chapeau et des
            cartes vers ses sous-pages. C'est le principe de la page dans la
            page. Aucune carte si aucun enfant : pas de section vide. */}
        {enfants.length > 0 && (
          <nav aria-label="Sous-pages" style={{ marginTop: 56, display: 'grid', gap: 12 }}>
            {enfants.map((e) => (
              <Link
                key={e.chemin}
                href={`${base}/${e.chemin}`}
                style={{
                  display: 'block', padding: '18px 20px', borderRadius: 14,
                  border: '1px solid rgba(0,0,0,0.12)', textDecoration: 'none',
                  color: 'inherit', fontWeight: 600,
                }}
              >
                {e.titre}
                <span aria-hidden="true" style={{ color: accent }}>{rtl ? ' ←' : ' →'}</span>
              </Link>
            ))}
          </nav>
        )}
      </main>
      </div>
    </>
  )
}
