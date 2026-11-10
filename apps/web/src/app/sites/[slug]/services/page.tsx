import { notFound } from 'next/navigation'
import { lireSectionPage, metadonneesSection, CadreSection } from '../themes/PageSection'

// LOT 21 — « Services » (le nom de la première section du site), vraie page
// indexable (voir themes/PageSection.tsx).
type Props = { params: Promise<{ slug: string }> }
type Element = { title?: string; description?: string; price?: string; image?: string }
type Section = { name?: string; items?: Element[] }

export async function generateMetadata({ params }: Props) {
  return metadonneesSection((await params).slug, 'services')
}

export default async function PageServices({ params }: Props) {
  const l = await lireSectionPage((await params).slug, 'services')
  if (!l) notFound()
  const { site, base } = l
  const sections = (site.sections ?? []) as Section[]
  return (
    <CadreSection site={site} base={base} quoi="services">
      {sections.map((sec, si) => (
        <section key={si} style={{ marginTop: si === 0 ? 0 : 44 }}>
          {si > 0 && sec.name && <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 16px' }}>{sec.name}</h2>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
            {(sec.items ?? []).map((it, i) => (
              <li key={i} style={{ border: '1px solid #e7e7e7', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- l'image vient du site, pas du chargeur */}
                {it.image && <img src={it.image} alt={it.title ?? ''} loading="lazy" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }} />}
                <div style={{ padding: '16px 18px' }}>
                  {it.title && <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>{it.title}</h3>}
                  {it.description && <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, opacity: 0.8 }}>{it.description}</p>}
                  {it.price && <p style={{ margin: '10px 0 0', fontWeight: 600 }}>{it.price}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </CadreSection>
  )
}
