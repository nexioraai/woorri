import type { Metadata } from 'next'
import { ogLocaleFor } from '@/lib/i18n/supportedLanguages'
import { empreinteDuLogo } from '@/lib/images/favicon'

// ============================================================================
// LOT 18 — L'IDENTITÉ D'UN SITE GÉNÉRÉ, POUR TOUTES SES PAGES.
//
// MESURÉ le 2026-11-10 sur `cpa-tchad.deribfy.app` : `/catalogue` et
// `/plan-du-site` annonçaient aux réseaux sociaux « Deribfy — Créez votre
// boutique en ligne en 60 secondes », image et adresse de deribfy.com. Et
// TOUTES les pages internes déclaraient l'icône et le manifeste de la
// plateforme. Cause : seul l'accueil posait ces balises ; toute page qui ne
// les reposait pas héritait de celles du gabarit RACINE, celui de Deribfy.
//
// Ces valeurs sont désormais posées par le gabarit du SEGMENT des sites :
// une page qui oublie sa carte de partage montre celle DU SITE, jamais celle
// de la plateforme. Les pages qui ont la leur la gardent.
// ============================================================================

type SitePourMeta = {
  name: string; slogan?: string | null; hero_subtitle?: string | null; about?: string | null
  hero_image?: string | null; lang?: string | null; logo_url?: string | null
}

/** La description du site, bornée à 160 signes. */
export function descriptionDuSite(site: SitePourMeta): string {
  const brut = site.hero_subtitle ?? site.about ?? site.slogan ?? `${site.name} — site officiel`
  return brut.length > 160 ? brut.slice(0, 157).trimEnd() + '…' : brut
}

/** Icônes, manifeste, carte de partage et carte Twitter PAR DÉFAUT du site. */
export function metadonneesDuSite(site: SitePourMeta, base: string, slug: string): Metadata {
  const racine = base.replace(/\/$/, '')
  const v = empreinteDuLogo(site.logo_url)
  const icone = (t: number) => `${racine}/api/internal/site-icon/${slug}?t=${String(t)}&v=${v}`
  const titre = site.slogan ? `${site.name} — ${site.slogan}` : site.name
  const description = descriptionDuSite(site)
  return {
    icons: {
      icon: [
        { url: `${racine}/favicon.ico`, sizes: '16x16 32x32 48x48 96x96 144x144' },
        { url: icone(192), sizes: '192x192', type: 'image/png' },
        { url: icone(512), sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: icone(180), sizes: '180x180', type: 'image/png' }],
    },
    manifest: `${racine}/api/internal/site-manifest/${slug}?v=${v}`,
    ...ogDePage(site, base, titre, description, 'website'),
  }
}

/**
 * La carte de partage D'UNE PAGE : son titre, sa description, SON adresse —
 * et l'image du site, pour qu'aucune page ne se partage sans visuel.
 */
export function ogDePage(
  site: SitePourMeta, url: string, titre: string, description?: string, type: 'website' | 'article' = 'article',
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const images = site.hero_image ? [{ url: site.hero_image }] : undefined
  return {
    openGraph: { title: titre, description, url, siteName: site.name, images, type, locale: ogLocaleFor(site.lang) },
    twitter: { card: images ? 'summary_large_image' : 'summary', title: titre, description, images: site.hero_image ? [site.hero_image] : undefined },
  }
}
