import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchSite, resolveSiteBaseUrl } from '../themes/shared'
import { getDict } from '../themes/i18n'
import HtmlLang from '../themes/HtmlLang'
import JsonLdScript from '../themes/JsonLdScript'
import ContactForm from '../ContactForm'
import { ogDePage } from '../themes/metadonneesDuSite'
import { pageWeb } from '../themes/filDAriane'

// ============================================================================
// LOT 18 — « CONTACT » EST UNE VRAIE PAGE, PAS SEULEMENT UNE ANCRE.
//
// L'entrée « Contact » du menu menait à `/#contact`, une ancre de l'accueil.
// Une ancre ne s'indexe pas séparément : Google ne peut ni la proposer en
// lien de site, ni la classer. Cette page porte la MÊME section (formulaire
// et coordonnées) à sa propre adresse, avec son titre, sa description, sa
// canonique et son fil d'Ariane. La section de l'accueil reste : le
// visiteur qui y descend la trouve toujours.
// ============================================================================

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await fetchSite(slug)
  if (!site) return {}
  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  const t = getDict(site.lang)
  const title = `${t.nav.contact} — ${site.name}`
  const description = `${t.sections.contactSubtitle}`.slice(0, 160)
  return {
    title, description,
    alternates: { canonical: `${base}/contact` },
    ...ogDePage(site, `${base}/contact`, title, description),
  }
}

export default async function PageContact({ params }: Props) {
  const { slug } = await params
  const site = await fetchSite(slug)
  if (!site) notFound()
  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  const t = getDict(site.lang)
  const accent = site.primary_color || '#111111'
  const contact = (site.contact || {}) as { phone?: string; email?: string; address?: string }
  const tel = contact.phone ? contact.phone.replace(/[^+\d]/g, '') : ''

  const ligne = (libelle: string, valeur: string, href?: string) => (
    <div style={{ padding: '16px 18px', borderRadius: 14, background: '#f6f6f7' }}>
      <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6b6b', marginBottom: 4 }}>{libelle}</div>
      {href ? <a href={href} style={{ color: '#111', fontWeight: 600 }}>{valeur}</a> : <div style={{ fontWeight: 600 }}>{valeur}</div>}
    </div>
  )

  return (
    <div lang={site.lang ?? 'fr'} style={{ background: '#ffffff', color: '#111111' }}>
      <HtmlLang lang={site.lang} />
      <JsonLdScript data={pageWeb(site.name, base, site.lang, t.nav.contact, `${base}/contact`, [{ nom: t.nav.contact, url: `${base}/contact` }])} />
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}>
          <Link href={base} style={{ color: accent }}>← {site.name}</Link>
        </p>
        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 10px' }}>{t.sections.contactTitle}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.75, margin: '0 0 32px', maxWidth: '62ch' }}>{t.sections.contactSubtitle}</p>
        <div style={{ display: 'grid', gap: 28, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start' }}>
          <div style={{ border: '1px solid #e5e5e5', borderRadius: 20, padding: 24 }}>
            <ContactForm slug={site.slug} brand={accent} lang={site.lang} />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {contact.phone && ligne(t.labels.phone, contact.phone, tel ? `tel:${tel}` : undefined)}
            {contact.email && ligne(t.labels.email, contact.email, `mailto:${contact.email}`)}
            {contact.address && ligne(t.labels.address, contact.address)}
          </div>
        </div>
      </main>
    </div>
  )
}
