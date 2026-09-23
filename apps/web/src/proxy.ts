import { NextRequest, NextResponse } from 'next/server'
import {
  fetchLangueParSlug,
  fetchSiteEtLangueParDomaine,
} from './app/sites/[slug]/themes/shared'
import { varianteHote, cibleCanonique } from './lib/domains/canonicalHost'
import { EN_TETE_LANGUE, normaliserLangue } from './lib/seo/langueServie'

const INTERNAL_HOSTS = ['nexiora.ca', 'www.nexiora.ca', 'woorri.com', 'www.woorri.com', 'deribfy.com', 'www.deribfy.com', 'localhost']

// Sitemap par site : reecrit vers une route interne hors de
// src/app/sites/[slug]/ (voir api/internal/site-sitemap pour le pourquoi
// — un dossier "sitemap.xml" imbrique sous [slug] avec un catch-all frere
// provoquait un 404/500 specifique a la production Vercel).
const PLATFORM_SITE_SITEMAP = /^\/sites\/([^/]+)\/sitemap\.xml$/

/** Chemin plateforme servant un site marchand : `/sites/{slug}` ou `/preview/{slug}`. */
const CHEMIN_SITE_PLATEFORME = /^\/(?:sites|preview)\/([^/]+)/

/**
 * Pose la langue du site sur la REQUÊTE, pour que le layout racine écrive le
 * bon `<html lang>` DANS LE HTML SERVI.
 *
 * Le composant `HtmlLang` corrige déjà l'attribut — mais dans un `useEffect`,
 * donc après hydratation, donc jamais pour un moteur. Mesuré le 2026-09-23 :
 * 3 des 5 sites publiés sont en anglais et s'annonçaient tous en français.
 */
function avecLangue(req: NextRequest, lang: string | null) {
  const code = normaliserLangue(lang)
  if (!code) return undefined
  const entetes = new Headers(req.headers)
  entetes.set(EN_TETE_LANGUE, code)
  return { request: { headers: entetes } }
}

export async function proxy(req: NextRequest) {
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase()
  const pathname = req.nextUrl.pathname

  // Domaines internes ou Vercel → comportement normal, sauf le sitemap
  // d'un site precis (ex. www.deribfy.com/sites/{slug}/sitemap.xml)
  if (
    INTERNAL_HOSTS.includes(host) ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.nexiora.ca') ||
    host.endsWith('.woorri.com') ||
    host.endsWith('.deribfy.com')
  ) {
    const platformMatch = pathname.match(PLATFORM_SITE_SITEMAP)
    if (platformMatch) {
      const url = req.nextUrl.clone()
      url.pathname = `/api/internal/site-sitemap/${platformMatch[1]}`
      return NextResponse.rewrite(url)
    }
    // Sur l'origine plateforme, un site marchand est servi sous `/sites/{slug}`
    // — et il doit s'annoncer dans SA langue, pas dans celle de la plateforme.
    // La requête n'est faite QUE pour ces chemins : les pages de la plateforme
    // (accueil, tarifs, blog…) ne paient rien.
    const siteMatch = CHEMIN_SITE_PLATEFORME.exec(pathname)
    if (siteMatch) {
      const lang = await fetchLangueParSlug(siteMatch[1]!)
      return NextResponse.next(avecLangue(req, lang))
    }
    return NextResponse.next()
  }

  // Domaine perso d'un client → on cherche le site lié. `lang` voyage avec le
  // slug : même ligne, même requête, aucun coût supplémentaire.
  const resolu = await fetchSiteEtLangueParDomaine(host)
  const slug = resolu?.slug ?? null
  const langue = resolu?.lang ?? null

  // ============================================================
  // D-08 -- LA FORME NON STOCKEE REPONDAIT 404.
  //
  // Les instructions DNS demandent au marchand DEUX enregistrements, racine
  // et `www`. Il les pose tous les deux. Mais `custom_domain` ne stocke qu'UNE
  // valeur, et la resolution est une egalite stricte : l'autre forme ne
  // correspondait a aucun site. Le marchand suivait les instructions a la
  // lettre et la moitie de son trafic tombait.
  //
  // 308 PLUTOT QUE 302 : la relation apex/www d'un domaine ne change pas au
  // gre des requetes, et la methode doit etre preservee. Chemin et parametres
  // sont conserves -- une redirection qui perd la page demandee perd le
  // visiteur.
  //
  // AUCUNE BOUCLE : on ne redirige que depuis un hote qui ne resout PAS vers
  // un hote qui resout. Le tour suivant sert directement.
  // ============================================================
  if (!slug) {
    const variante = varianteHote(host)
    if (variante) {
      const slugVariante = await fetchSiteEtLangueParDomaine(variante)
      if (slugVariante) {
        return NextResponse.redirect(
          cibleCanonique(variante, req.nextUrl.pathname, req.nextUrl.search),
          308
        )
      }
    }
    return NextResponse.next()
  }

  // Favicon du domaine personnalise : l'icone du MARCHAND, jamais celle de la
  // plateforme. Sans cette reecriture, la boutique porte l'enseigne de son
  // fournisseur dans l'onglet du navigateur et dans les resultats Google.
  if (pathname === '/favicon.ico') {
    const url = req.nextUrl.clone()
    url.pathname = `/api/internal/site-icon/${slug}`
    url.search = '?f=ico'
    return NextResponse.rewrite(url)
  }

  // Sitemap du domaine personnalise (ex. mondomaine.com/sitemap.xml)
  if (pathname === '/sitemap.xml') {
    const url = req.nextUrl.clone()
    url.pathname = `/api/internal/site-sitemap/${slug}`
    return NextResponse.rewrite(url)
  }

  // Réécriture interne : le visiteur garde son domaine, on sert /sites/{slug}
  const url = req.nextUrl.clone()
  url.pathname = url.pathname === '/' ? `/sites/${slug}` : `/sites/${slug}${url.pathname}`
  return NextResponse.rewrite(url, avecLangue(req, langue))
}

export const config = {
  // `favicon.ico` N'EST PLUS EXCLU, et c'était la cause exacte du défaut :
  // mesuré le 2026-09-23, `chanorfie.com/favicon.ico` et
  // `alloufshop.com/favicon.ico` répondaient 200 avec 25 931 octets — le
  // favicon de `create-next-app`. La requête n'atteignait jamais le site
  // marchand ; elle tombait sur le fichier de la plateforme. Sur un hôte
  // interne, le comportement est rigoureusement inchangé (`next()`).
  matcher: ['/((?!api|_next/static|_next/image).*)'],
}
