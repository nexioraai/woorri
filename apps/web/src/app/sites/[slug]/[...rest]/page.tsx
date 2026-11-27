import { ogDePage } from '../themes/metadonneesDuSite'
import CadreInstitution from '../themes/institution/CadreInstitution'
import EnTetePage from '../themes/institution/EnTetePage'
import { blocsPourVisiteur, nonRempli } from '@/lib/sites/institutionVisiteur'
import { estProprietaireDuSite } from '@/lib/sites/proprietaireDuSite'
import { lirePagesLegales } from '../themes/pagesLegales'
import { lienContact } from '../themes/destinationBouton'
import { lireBlocs } from '../pages/blocs'
import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { resolveSiteBaseUrl } from '../themes/shared'
import { lireSite } from '../themes/lireSite'
import BlocsDePage from '../pages/BlocsDePage'
import SousPages from '../pages/SousPages'
import FicheResponsable, { estUneFiche } from '../pages/FicheResponsable'
import { fetchBlogIndex, type BlogPostCard, type CategorieArticle } from '../blog/fetchPosts'
import { fetchPage, fetchFilDAriane, fetchEnfants } from '../pages/fetchPage'
import type { PageSite } from '../pages/typesPage'
import { CHEMIN_ACTUALITES, libellesActualites, libelleOnglet, vueActualites } from '../pages/actualites'
import OngletsActualites from '../pages/OngletsActualites'
import ListeArticles from '../pages/ListeArticles'
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

/**
 * LA PAGE À CETTE ADRESSE, ET LE MODULE ACTUALITÉS S'IL EST ALLUMÉ.
 *
 * Le module ne s'allume que si le site DÉCLARE la page `actualites` (voir
 * `pages/actualites.ts`). Une sous-adresse `actualites/<onglet>` sans page
 * déclarée reçoit alors une page de titre seul, pour que l'onglet existe ;
 * sans page `actualites`, tout se passe exactement comme avant.
 */
async function resoudre(siteId: string, slug: string, lang: string | null | undefined, chemin: string): Promise<{
  page: PageSite | null
  actualites: { categorie: CategorieArticle | null; posts: BlogPostCard[] } | null
}> {
  const page = await fetchPage(siteId, chemin)
  const vue = vueActualites(chemin)
  if (vue === null) return { page, actualites: null }
  const racine = vue.categorie === null ? page : await fetchPage(siteId, CHEMIN_ACTUALITES)
  if (racine === null) return { page, actualites: null }
  const index = await fetchBlogIndex(slug, vue.categorie)
  const t = libellesActualites(lang)
  return {
    page: page ?? { chemin, parent: CHEMIN_ACTUALITES, titre: libelleOnglet(t, vue.categorie), chapeau: null, corps: null, maj_le: null, blocs: [] },
    actualites: { categorie: vue.categorie, posts: index?.posts ?? [] },
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, rest } = await params
  const site = await lireSite(slug)
  if (!site) return { title: 'Page introuvable' }

  const { page } = await resoudre(site.id, slug, site.lang, cheminDe(rest))
  // Pas de `robots: noindex` : la page rend 404 par `notFound()`, et une 404
  // est deja le signal correct. Annoncer `noindex` sur une page servie en 200
  // serait le defaut GEN-D033 a l'envers.
  if (!page) return { title: 'Page introuvable' }

  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  const url = `${base}/${page.chemin}`
  // LOT 18 — sans introduction, le premier paragraphe ; à défaut, le titre et
  // le site. Une page sans description laissait Google en inventer une.
  const premierTexte = lireBlocs(page.blocs).find((b): b is Extract<ReturnType<typeof lireBlocs>[number], { type: 'texte' }> => b.type === 'texte')?.texte
  const description = ((page.chapeau ?? '').trim() || (premierTexte ?? '').trim() || `${page.titre} — ${site.name}`).slice(0, 157)

  return {
    title: `${page.titre} — ${site.name}`,
    description,
    alternates: { canonical: url },
    // LOT 18 — l'image du site, pour qu'aucune page ne se partage sans visuel.
    ...ogDePage(site, url, page.titre, description),
  }
}

/**
 * LE RENDU D'UNE PAGE DECLAREE, REEMPLOYABLE.
 *
 * Existe parce que la route `/catalogue/<reference>` du LOT 6 capture les
 * sous-pages declarees `/catalogue/categories` et `/catalogue/commander` :
 * un segment dynamique passe AVANT le catch-all. Mesure le 2026-11-08 :
 * les deux rendaient 404 alors qu'elles etaient publiees.
 *
 * La route produit delegue donc ICI quand aucune reference ne correspond.
 * Elle REEMPLOIE ce composant au lieu d'en recopier le rendu : deux rendus
 * de la meme page finiraient par diverger, et c'est celui qu'on ne relit
 * pas qui afficherait faux.
 */
export default async function PageDeclaree({ params }: Props) {
  const { slug, rest } = await params
  const site = await lireSite(slug)
  if (!site) notFound()

  const chemin = cheminDe(rest)
  const { page, actualites } = await resoudre(site.id, slug, site.lang, chemin)
  // REFUS ① : rien de declare a cette adresse -> 404, jamais une page vide.
  if (!page) notFound()

  // UNE FICHE (premier bloc = le mot d'un responsable, photo comprise) charge
  // aussi ses SŒURS : ce sont ses « pages liées ».
  const fiche = estUneFiche(page.blocs)
  const [fil, enfants, freres] = await Promise.all([
    fetchFilDAriane(site.id, chemin),
    fetchEnfants(site.id, chemin),
    fiche && page.parent ? fetchEnfants(site.id, page.parent) : Promise.resolve([]),
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

  // LOT 4b — UNE PAGE INTÉRIEURE D'INSTITUTION a l'en-tête (grand menu) et le pied du site :
  // un vrai site, pas une page isolée. Les autres thèmes (et la CPA) ne changent pas.
  const institution = site.theme === 'institution'
    ? { donnees: await (await import('../themes/institution/lireInstitution')).lireDonneesInstitution(site.id, site.primary_color), legaux: await lirePagesLegales(site.id, base, site.lang) }
    : null
  const enveloppe = (contenu: React.ReactNode) => institution === null ? contenu : (
    <CadreInstitution nom={site.name} logo={site.logo_url} slug={site.slug} base={base} couleur={site.primary_color || '#1e4d8c'}
      rubriques={institution.donnees.rubriques} contact={lienContact(site, host)} liensLegaux={institution.legaux}
      proprietaire={institution.donnees.proprietaire} apercu={institution.donnees.apercu ?? institution.donnees.proprietaire} social={site.social_links as Record<string, string | undefined> | null | undefined} recherche={institution.donnees.recherche ?? []}>
      {contenu}
    </CadreInstitution>
  )
  // LOT 4c — CE QU'UN VISITEUR VOIT d'une page d'institution : jamais une case
  // « À compléter » (le propriétaire, lui, les voit toutes) ; les sous-pages
  // sans rien de réel ne sont pas des cartes.
  // LOT 4c — TOUS LES THÈMES : une ligne « À compléter » n'est montrée qu'au propriétaire vérifié.
  const proprietaire = institution !== null ? institution.donnees.proprietaire : await estProprietaireDuSite(site.id)
  const visiteur = !proprietaire
  const racine = institution?.donnees.rubriques.find((r) => r.chemin === (fil[0]?.chemin ?? page.chemin)) ?? null
  const imageDeLaPage = lireBlocs(page.blocs).find((b): b is Extract<ReturnType<typeof lireBlocs>[number], { type: 'image' }> => b.type === 'image')?.url ?? null
  const imageDeTete = imageDeLaPage ?? racine?.image ?? null
  // La photo de la page monte dans l'en-tête : elle n'est pas répétée dessous.
  const sansPhotoDeTete = institution !== null && imageDeLaPage !== null
    ? page.blocs.filter((b, i) => !(b.type === 'image' && i === page.blocs.findIndex((x) => x.type === 'image')))
    : page.blocs
  const blocsAffiches = visiteur ? blocsPourVisiteur(sansPhotoDeTete) : sansPhotoDeTete
  const lisibles = new Set((institution?.donnees.recherche ?? []).map((e) => e.chemin))
  const enfantsAffiches = visiteur && institution !== null ? enfants.filter((e) => lisibles.has(e.chemin)) : enfants
  const chapeauAffiche = visiteur && institution !== null && nonRempli(page.chapeau) ? null : page.chapeau

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
      {/* `overflow-x: clip` : un bloc pleine largeur (100vw) déborderait de la
          largeur de la barre de défilement sous Windows. `clip` coupe sans
          créer de zone défilante : l'image collante du parcours tient. */}
      {enveloppe(<div style={{ minHeight: institution === null ? '100vh' : undefined, background: '#ffffff', color: '#111111', overflowX: 'clip' }}>
      {institution !== null && (
        <EnTetePage titre={page.titre} chapeau={chapeauAffiche} couleur={racine?.couleur ?? (site.primary_color || '#1e4d8c')} image={imageDeTete}
          base={base} accueil="Accueil" fil={fil} />
      )}
      <main
        dir={rtl ? 'rtl' : 'ltr'}
        style={{ maxWidth: fiche ? 1180 : 820, margin: '0 auto', padding: institution === null ? '64px 24px' : '48px 24px 8px' }}
      >
        {/* FIL D'ARIANE -- derive du chemin, et seuls les ancetres REELLEMENT
            publies y figurent. Un ancetre non publie n'y devient pas un lien
            mort : il n'y figure pas du tout. */}
        {institution === null && <nav aria-label="Fil d'Ariane" style={{ fontSize: 14, marginBottom: 24, opacity: 0.7 }}>
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
        </nav>}

        {fiche ? (
          <FicheResponsable
            site={site}
            titre={page.titre}
            chapeau={page.chapeau}
            blocs={blocsAffiches}
            base={base}
            accent={accent}
            parent={fil.length ? fil[fil.length - 1] : null}
            freres={freres}
            cheminCourant={page.chemin}
            proprietaire={proprietaire}
          />
        ) : (<>
        {institution === null && <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          {page.titre}
        </h1>}

        {institution === null && page.chapeau && (
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
        {/* LE MODULE ACTUALITÉS : les onglets, puis la liste de la catégorie.
            Il REMPLACE le bloc « articles » de la page (même liste, deux fois
            sinon) et ses cartes de sous-pages (les onglets les remplacent). */}
        {actualites !== null && (
          <div data-module-actualites="">
            <OngletsActualites base={base} courante={actualites.categorie} t={libellesActualites(site.lang)} primary={accent} />
            <ListeArticles articles={actualites.posts} base={base} lang={site.lang} primary={accent} vide={libellesActualites(site.lang).vide} />
          </div>
        )}

        {blocsAffiches.filter((b) => actualites === null || b.type !== 'articles').length > 0 && (
          <BlocsDePage
            blocs={blocsAffiches.filter((b) => actualites === null || b.type !== 'articles')}
            base={base}
            primary={site.primary_color || undefined}
            articles={parCategorie}
            lang={site.lang}
            proprietaire={proprietaire}
          />
        )}
        </>)}

        {/* LES ENFANTS -- une page d'entree ne porte qu'un chapeau et des
            cartes vers ses sous-pages. C'est le principe de la page dans la
            page. Aucune carte si aucun enfant : pas de section vide. */}
        {actualites === null && <SousPages enfants={enfantsAffiches} base={base} accent={accent} rtl={rtl} />}
      </main>
      </div>)}
    </>
  )
}
