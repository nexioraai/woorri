import Link from 'next/link'
import type { BlogPostCard } from '../blog/fetchPosts'

// ============================================================================
// LOT 7 — LE RENDU D'UNE LISTE D'ARTICLES.
//
// IL NE LIT PAS LA BASE. Les articles lui sont DONNÉS : le bloc dit quelle
// catégorie, la page les charge, ce composant les dessine. Un composant qui
// irait chercher ses propres données rendrait le nombre de requêtes d'une
// page imprévisible -- une page à trois blocs « articles » ferait trois
// allers-retours sans que personne ne le voie.
//
// UNE LISTE VIDE DIT POURQUOI. « Aucun communiqué pour l'instant » informe ;
// une section qui disparaît laisse croire que la page est cassée. C'est la
// loi du lot A2 : les comptes ne mentent pas quand ils sont à zéro.
// ============================================================================

const ENCRE = '#111111'
const SOURDINE = '#5b5b5b'
const TRAIT = '#e3e3e3'

function dateCourte(iso: string | null, lang: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : lang || 'fr',
    { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d)
}

export default function ListeArticles({
  articles, base, lang, primary = '#1e4d8c', titre, vide,
}: {
  articles: BlogPostCard[]
  base: string
  lang: string | null | undefined
  primary?: string
  titre?: string
  vide: string
}) {
  return (
    <div>
      {titre && (
        <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: SOURDINE, margin: '0 0 14px' }}>
          {titre}
        </h3>
      )}

      {articles.length === 0 ? (
        <p style={{ fontSize: 16, color: SOURDINE, margin: 0 }}>{vide}</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {articles.map((a) => {
            const d = dateCourte(a.published_at, lang)
            return (
              <li key={a.slug} style={{ border: `1px solid ${TRAIT}`, borderRadius: 12, overflow: 'hidden' }}>
                <Link href={`${base}/blog/${a.slug}`} style={{ display: 'flex', gap: 14, alignItems: 'stretch', textDecoration: 'none' }}>
                  {a.cover_image && (
                    // eslint-disable-next-line @next/next/no-img-element -- l'URL vient du site, pas du loader
                    <img src={a.cover_image} alt="" loading="lazy"
                      style={{ width: 132, flex: '0 0 132px', objectFit: 'cover', display: 'block' }} />
                  )}
                  <span style={{ padding: '14px 16px', display: 'block' }}>
                    {d && (
                      <span style={{ display: 'block', fontSize: 13, color: primary, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {d}
                      </span>
                    )}
                    <span style={{ display: 'block', fontSize: 17, fontWeight: 600, color: ENCRE, marginTop: 2 }}>
                      {a.title}
                    </span>
                    {a.excerpt && (
                      <span style={{ display: 'block', fontSize: 15, lineHeight: 1.6, color: SOURDINE, marginTop: 5 }}>
                        {a.excerpt}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
