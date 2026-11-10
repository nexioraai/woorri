import { notFound } from 'next/navigation'
import { lireSectionPage, metadonneesSection, CadreSection } from '../themes/PageSection'

// LOT 21 — « À propos », vraie page indexable (voir themes/PageSection.tsx).
type Props = { params: Promise<{ slug: string }> }

const MISSION: Record<string, string> = { fr: 'Notre mission', en: 'Our mission', es: 'Nuestra misión', ar: 'مهمتنا' }
const VISION: Record<string, string> = { fr: 'Notre vision', en: 'Our vision', es: 'Nuestra visión', ar: 'رؤيتنا' }

export async function generateMetadata({ params }: Props) {
  return metadonneesSection((await params).slug, 'a-propos')
}

export default async function PageAPropos({ params }: Props) {
  const l = await lireSectionPage((await params).slug, 'a-propos')
  if (!l) notFound()
  const { site, base } = l
  const lang = (site.lang ?? 'fr').slice(0, 2)
  const accent = site.primary_color || '#111111'
  const bloc = (titre: string, texte: string) => (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, margin: '0 0 8px' }}>{titre}</h2>
      <p style={{ fontSize: 17, lineHeight: 1.7, margin: 0, maxWidth: '68ch' }}>{texte}</p>
    </section>
  )
  return (
    <CadreSection site={site} base={base} quoi="a-propos">
      {site.about && <p style={{ fontSize: 18, lineHeight: 1.75, margin: 0, maxWidth: '68ch', whiteSpace: 'pre-line' }}>{site.about}</p>}
      {site.mission && bloc(MISSION[lang] ?? MISSION.fr, site.mission)}
      {site.vision && bloc(VISION[lang] ?? VISION.fr, site.vision)}
      {Array.isArray(site.whyus) && site.whyus.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '36px 0 0', display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
          {site.whyus.map((w, i) => (
            <li key={i} style={{ padding: '18px 20px', borderRadius: 14, background: '#f6f6f7' }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>{w.title}</strong>
              <span style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.8 }}>{w.text}</span>
            </li>
          ))}
        </ul>
      )}
    </CadreSection>
  )
}
