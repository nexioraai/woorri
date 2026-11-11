// src/app/sites/[slug]/page.tsx
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchSite, resolveSiteBaseUrl } from './themes/shared'
import { metadonneesDuSite } from './themes/metadonneesDuSite'
import { logAnomaly } from '@/lib/anomaly'
import JsonLd from './themes/JsonLd'
import HtmlLang from './themes/HtmlLang'
import EditorialTheme from './themes/EditorialTheme'
import { avisDuSite } from './themes/avisDuSite'
import { fetchAvisEntries } from './appels-offres/fetchAvis'
import { fetchMenu, fetchPage } from './pages/fetchPage'
import NoirTheme from './themes/NoirTheme'
import VifTheme from './themes/VifTheme'
import AuroraTheme from './themes/AuroraTheme'
import CartShell from './themes/CartShell'
import { getCartLabels } from './themes/cartLabels'
import { resolveShopCurrency } from './themes/shopCurrency'
import ScrollRevealInit from './themes/ScrollRevealInit'
import CatalogSearch, { type ThemeKey } from './themes/CatalogSearch'
// LOT 1 / L1-02 -- la montee de la barre de recherche etait une NEGATION
// (`!== 'pod_brand'`) recopiee ici, dans l'apercu et dans AuroraTheme : un
// sous-type ABSENT y passait. Regle unique, allowlist positive. Et le repli
// `|| 'reseller'` sur la prop est retire : il fabriquait un sous-type que la
// base ne porte pas.
import { showsVisitorCatalogSearch } from '@/app/sites/[slug]/themes/catalogSearchVisibility'
import PromoBanner from './themes/PromoBanner'
import { lirePartenaires } from './themes/lirePartenaires'
import { lirePagesLegales } from './themes/pagesLegales'

// M1-08 : `revalidate` retire, il etait TROMPEUR. Cette page appelle
// `headers()` (resolution du domaine perso pour le canonical), ce qui la
// bascule en rendu dynamique : la revalidation ne s'appliquait jamais. La
// declarer laissait croire a une strategie de cache qui n'existait pas.
//
// Le rendu dynamique est CONSERVE volontairement : il garantit qu'aucune page
// d'un marchand ne peut etre servie depuis un cache partage avec un autre --
// la performance ne doit pas s'acheter au prix d'un risque inter-locataire.

const themes = {
  editorial: EditorialTheme,
  noir: NoirTheme,
  vif: VifTheme,
  aurora: AuroraTheme,
} as const

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ [key: string]: string | undefined }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await fetchSite(slug)

  if (!site) {
    return { title: 'Site introuvable' }
  }

  const title = site.slogan ? `${site.name} — ${site.slogan}` : site.name

  const rawDesc =
    site.hero_subtitle ?? site.about ?? site.slogan ?? `${site.name} — site officiel`
  const description =
    rawDesc.length > 160 ? rawDesc.slice(0, 157).trimEnd() + '…' : rawDesc

  const host = (await headers()).get('host')
  const url = resolveSiteBaseUrl(site, host)
  // LOT 18 — icônes, manifeste et carte de partage viennent de la MÊME
  // fonction que le gabarit du segment : une seule écriture de l'identité.
  return {
    title,
    description,
    alternates: { canonical: url },
    ...metadonneesDuSite(site, url, slug),
  }
}

export default async function SitePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams

// DETTE 3 -- `logAnomaly` est appele ICI, jamais dans `shared.tsx`.
// Ce dernier est bi-environnement (quatre composants 'use client'
// l'importent) et `anomaly.ts -> supabase-admin.ts -> server-only` fait
// echouer le build s'il y entre -- mesure, pas suppose. Le signal remonte
// donc par un tableau `diagnostics`, et seuls les appelants SERVEUR
// journalisent.
  const diagnostics: string[] = []
  const site = await fetchSite(slug, sp.paid === '1', diagnostics)
  // `notFound()` reste conditionne au SEUL site introuvable. Une panne de
  // catalogue n'a jamais produit de 404 et ne doit pas commencer.
  if (!site) notFound()
  if (diagnostics.length > 0) {
    await logAnomaly({
      type: 'storefront_query_failed',
      severity: 'warning',
      siteId: (site as { id?: string }).id ?? null,
      slug,
      details: { surface: 'storefront', failures: diagnostics },
    })
  }

  const host = (await headers()).get('host')
  const url = resolveSiteBaseUrl(site, host)

  // ── A2 d0/e0 — LA SEULE ROUTE PAR LAQUELLE UN THÈME APPREND LES AVIS.
  //
  // Un thème est SYNCHRONE : il ne peut ni `await` une requête ni appeler
  // `headers()`. Ces deux faits ne peuvent donc lui parvenir QUE d'ici. Ce
  // n'est pas une convention — c'est une impossibilité, et c'est ce qui rend
  // la route unique.
  //
  // `fetchAvisEntries` est le SEUL lecteur d'avis du dépôt pour une surface
  // dérivée, et il passe par la VUE `appels_offres_public` — jamais par la
  // table. Ce fichier ne réécrit pas sa requête : il l'appelle.
  // LOT 1 + 2 — les deux faits serveur, par la MÊME route unique.
  // LOT 1 + 2 + 15.13 — les faits serveur, par la MÊME route unique.
  const [{ hasAvis }, menu, partenaires, liensLegaux, pageHero] = await Promise.all([
    fetchAvisEntries(site.id).then(avisDuSite),
    fetchMenu(site.id),
    lirePartenaires(site.id),
    lirePagesLegales(site.id, url, site.lang),
    // Le hero « vitrine » est OPTIONNEL et DÉCLARÉ PAR LES DONNÉES : une page
    // `accueil-hero` dont le premier bloc est un bloc « etapes » en affichage
    // « vitrine ». Sans elle, l'accueil reste exactement celui d'avant.
    fetchPage(site.id, 'accueil-hero').catch(() => null),
  ])
  const premierBloc = pageHero?.blocs?.[0] as (Record<string, unknown> & { items?: unknown[] }) | undefined
  const heroVitrine = premierBloc?.type === 'etapes' && premierBloc.affichage === 'vitrine' && Array.isArray(premierBloc.items) && premierBloc.items.length >= 4
    ? {
        surtitre: typeof premierBloc.titre === 'string' ? premierBloc.titre : undefined,
        bouton: typeof premierBloc.bouton === 'string' ? premierBloc.bouton : undefined,
        lienBouton: typeof premierBloc.lien === 'string' && /^[a-z0-9][a-z0-9\-/]*$/i.test(premierBloc.lien) ? `${url}/${premierBloc.lien}` : undefined,
        badge: typeof premierBloc.badge === 'string' ? premierBloc.badge : undefined,
        pieces: premierBloc.items as { titre: string; texte?: string; image?: string; libelle?: string }[],
      }
    : null

  const key = (site.theme as keyof typeof themes) || 'editorial'
  const Theme = themes[key] ?? EditorialTheme

  const primary = site.primary_color || '#111111'
  const cartLabels = getCartLabels(site.lang)

  return (
    <>
      <HtmlLang lang={site.lang} />
      <JsonLd site={site} url={url} />
      <PromoBanner slug={site.slug} primary={primary} mode={site.mode} labels={cartLabels} currency={resolveShopCurrency(site.products)} />
      <CartShell primary={primary} labels={cartLabels} slug={site.slug} mode={site.mode} products={site.products} shippingFlat={site.shipping_flat} variant={key === 'noir' ? 'dark' : 'light'}>
        <Theme site={site} hasAvis={hasAvis} host={host} menu={menu} partenaires={partenaires} liensLegaux={liensLegaux} heroVitrine={heroVitrine} />
        {site.mode === 3 && showsVisitorCatalogSearch(site.dropship_type) && site.theme !== 'aurora' && <CatalogSearch slug={site.slug} primary={primary} lang={site.lang} theme={key as ThemeKey} dropshipType={site.dropship_type} />}
      </CartShell>
      <ScrollRevealInit />
    </>
  )
}
