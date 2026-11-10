import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'
import { fetchSite, resolveSiteBaseUrl, type Site } from './shared'
import { getDict } from './i18n'
import HtmlLang from './HtmlLang'
import JsonLdScript from './JsonLdScript'
import { ogDePage } from './metadonneesDuSite'
import { pageWeb } from './filDAriane'

// ============================================================================
// LOT 21 — « À PROPOS » ET « SERVICES » SONT DE VRAIES PAGES.
//
// Demande : « pas d'ancres #section à la place de vraies pages pour la
// navigation principale ». Le menu et le pied de page menaient à `#about` et
// `#services` — des morceaux de l'accueil qu'un moteur ne peut ni indexer ni
// proposer en lien de site. Ces deux écrans du moteur reprennent le MÊME
// contenu à leur propre adresse ; les sections de l'accueil restent.
//
// Une section MASQUÉE par le marchand ou VIDE n'a pas de page : 404 (le
// lien de menu, lui, n'est déjà pas affiché dans ce cas).
// ============================================================================

export type SectionPage = 'a-propos' | 'services'

/** Le site et son adresse, ou `null` si la page n'a pas lieu d'exister. */
export async function lireSectionPage(slug: string, quoi: SectionPage) {
  const site = await fetchSite(slug)
  if (!site) return null
  const masquees = (site.hidden_sections ?? []) as string[]
  const vide = quoi === 'a-propos'
    ? masquees.includes('About') || !(site.about || site.mission || site.vision)
    : masquees.includes('Services') || !(site.sections ?? []).length
  if (vide) return null
  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  return { site, base, t: getDict(site.lang) }
}

export function titreSection(site: Site, quoi: SectionPage): string {
  const t = getDict(site.lang)
  return quoi === 'a-propos' ? t.nav.about : ((site.sections ?? [])[0]?.name || t.nav.services)
}

export async function metadonneesSection(slug: string, quoi: SectionPage): Promise<Metadata> {
  const l = await lireSectionPage(slug, quoi)
  if (!l) return { title: 'Page introuvable' }
  const nom = titreSection(l.site, quoi)
  const title = `${nom} — ${l.site.name}`
  const brut = quoi === 'a-propos' ? (l.site.about || l.site.mission || '') : ((l.site.sections ?? []).map((s: { name?: string }) => s.name).filter(Boolean).join(', '))
  const description = `${brut}`.replace(/\s+/g, ' ').trim().slice(0, 157) || `${nom} — ${l.site.name}`
  const url = `${l.base}/${quoi}`
  return { title, description, alternates: { canonical: url }, ...ogDePage(l.site, url, title, description) }
}

export function CadreSection({ site, base, quoi, children }: { site: Site; base: string; quoi: SectionPage; children: ReactNode }) {
  const accent = site.primary_color || '#111111'
  const nom = titreSection(site, quoi)
  return (
    <div lang={site.lang ?? 'fr'} style={{ background: '#ffffff', color: '#111111' }}>
      <HtmlLang lang={site.lang} />
      <JsonLdScript data={pageWeb(site.name, base, site.lang, nom, `${base}/${quoi}`, [{ nom, url: `${base}/${quoi}` }])} />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}><Link href={base} style={{ color: accent }}>← {site.name}</Link></p>
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 700, margin: '0 0 22px' }}>{nom}</h1>
        {children}
      </main>
    </div>
  )
}
