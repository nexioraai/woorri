import Link from 'next/link'
import type { Site } from './shared'
import { resolveSiteBaseUrl } from './shared'
import { CHEMIN_ACTUALITES, libellesActualites, type CarteActualite } from '../pages/actualites'
import { formatDate } from '../blog/labels'

// ============================================================
// « DERNIÈRES ACTUALITÉS » SUR L'ACCUEIL (2026-11-26).
//
// La garde est chez l'APPELANT (`actualites && …`) : le module est allumé
// (page `actualites` déclarée) ET au moins une publication existe. Une
// section d'accueil VIDE est pire qu'une section absente (arbitrage du
// propriétaire, 2026-11-06) — même règle que les appels d'offres.
//
// IL NE LIT RIEN : les publications arrivent par la route de l'accueil, un
// thème est synchrone. Couleur du texte HÉRITÉE du thème (clair ou sombre),
// la teinte du site seulement pour la date et le bouton.
// ============================================================

export default function SectionActualites({
  site, primary, host, posts,
}: {
  site: Site
  primary: string
  host: string | null
  posts: CarteActualite[]
}) {
  const t = libellesActualites(site.lang)
  const base = resolveSiteBaseUrl(site, host)
  const rtl = (site.lang || 'fr').slice(0, 2) === 'ar'
  return (
    <section id="actualites" aria-labelledby="actualites-titre" className="py-24 md:py-32" dir={rtl ? 'rtl' : 'ltr'} data-dernieres-actualites="">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <h2 id="actualites-titre" className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">{t.dernieres}</h2>
          <Link href={`${base}/${CHEMIN_ACTUALITES}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white transition hover:-translate-y-0.5"
            style={{ backgroundColor: primary }}>
            {t.voirTout}<span aria-hidden="true">{rtl ? '←' : '→'}</span>
          </Link>
        </div>
        <ul className="grid gap-6 md:grid-cols-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {posts.map((p) => {
            const date = formatDate(p.published_at, site.lang)
            return (
              <li key={p.slug} className="rounded-2xl overflow-hidden border border-current/10" style={{ borderColor: 'color-mix(in srgb, currentColor 14%, transparent)' }}>
                <Link href={`${base}/blog/${encodeURIComponent(p.slug)}`} className="block h-full" style={{ textDecoration: 'none', color: 'inherit' }}>
                  {p.cover_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_image} alt="" loading="lazy" className="w-full aspect-[16/9] object-cover block" />
                  )}
                  <span className="block p-5">
                    <span className="block text-xs font-semibold uppercase tracking-wider" style={{ color: primary }}>
                      {t[p.categorie]}{date ? ` · ${date}` : ''}
                    </span>
                    <span className="block mt-2 text-lg font-semibold leading-snug">{p.title}</span>
                    {p.excerpt && <span className="block mt-2 text-[15px] leading-relaxed opacity-70">{p.excerpt}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
