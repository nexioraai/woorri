import Link from 'next/link'
import type { Bloc } from './blocs'
import ListeArticles from './ListeArticles'
import Organigramme from './Organigramme'
import type { BlogPostCard, CategorieArticle } from '../blog/fetchPosts'

// ============================================================================
// LOT 4 — LE RENDU DU CORPS STRUCTURÉ.
//
// Douze blocs, douze formes. AUCUN n'accepte de HTML : chaque champ traverse
// JSX comme du texte, donc React l'échappe. `dangerouslySetInnerHTML`
// n'apparaît pas une seule fois dans ce fichier, et le cliquet
// `corpsSansHtml.test.ts` rougit s'il y entre un jour.
//
// Les questions se déplient avec `<details>` natif — pas de JavaScript, donc
// la page reste entière sans script et le thème peut rester synchrone.
// ============================================================================

const ENCRE = '#111111'
const SOURDINE = '#5b5b5b'
const TRAIT = '#e3e3e3'
const FOND_DOUX = '#f7f7f8'

function TitreDeBloc({ texte }: { texte?: string }) {
  if (!texte) return null
  return <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: SOURDINE, margin: '0 0 14px' }}>{texte}</h3>
}

export default function BlocsDePage({
  blocs, base, primary = '#1e4d8c', articles, lang, videArticles = 'Aucune publication pour l’instant.',
}: {
  blocs: Bloc[]
  base: string
  primary?: string
  /** LOT 7 — les articles DÉJÀ chargés par la page, par catégorie. */
  articles?: Map<CategorieArticle, BlogPostCard[]>
  lang?: string | null
  videArticles?: string
}) {
  if (blocs.length === 0) return null
  return (
    <div className="blocs-page" style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      {/* L'ANIMATION ET LE MOBILE, SANS JAVASCRIPT.
          Chaque bloc apparait avec un leger decalage ; `prefers-reduced-motion`
          coupe tout. Les tailles passent en `clamp()` : ce que je lis sur un
          ecran de bureau n'est PAS ce que le proprietaire lit sur son telephone. */}
      <style>{`
        .blocs-page > * { animation: blocEntre .55s cubic-bezier(.22,.8,.3,1) both; }
        ${blocs.map((_, i) => `.blocs-page > *:nth-child(${i + 2}) { animation-delay: ${Math.min(i * 70, 560)}ms; }`).join('')}
        @keyframes blocEntre { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .blocs-page > * { animation: none !important; } }
        .blocs-page h2 { font-size: clamp(21px, 5.2vw, 27px); }
        .blocs-page h3 { font-size: clamp(18px, 4.4vw, 21px); }
        .blocs-page p, .blocs-page li, .blocs-page td { font-size: clamp(15.5px, 3.9vw, 17px); }
        @media (max-width: 520px) { .blocs-page { gap: 26px; } }
        .blocs-page .bloc-photo { transition: transform .45s cubic-bezier(.22,.8,.3,1), filter .45s ease; }
        .blocs-page a:hover .bloc-photo, .blocs-page a:focus-visible .bloc-photo { transform: scale(1.025); filter: brightness(1.04); }
        .blocs-page a:focus-visible { outline: 3px solid ${primary}; outline-offset: 3px; border-radius: 12px; }
        @media (prefers-reduced-motion: reduce) { .blocs-page .bloc-photo { transition: none; } }
      `}</style>
      {blocs.map((b, i) => {
        const k = `bloc-${i}`
        switch (b.type) {
          case 'titre':
            return b.niveau === 3
              ? <h3 key={k} style={{ fontSize: 21, fontWeight: 700, color: primary, margin: '10px 0 0' }}>{b.texte}</h3>
              : <h2 key={k} style={{ fontSize: 27, fontWeight: 700, color: primary, margin: '18px 0 0', paddingBottom: 10, borderBottom: `2px solid ${primary}` }}>{b.texte}</h2>

          case 'texte':
            return <p key={k} style={{ fontSize: 17, lineHeight: 1.75, color: ENCRE, margin: 0 }}>{b.texte}</p>

          case 'liste':
            return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <ul style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {b.items.map((it, j) => <li key={j} style={{ fontSize: 17, lineHeight: 1.65, color: ENCRE }}>{it}</li>)}
                </ul>
              </div>
            )

          case 'etapes':
            return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {b.items.map((it, j) => (
                    <li key={j} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <span aria-hidden style={{ flex: '0 0 30px', height: 30, borderRadius: 999, background: primary, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{j + 1}</span>
                      <span>
                        <strong style={{ fontSize: 17, color: ENCRE, display: 'block' }}>{it.titre}</strong>
                        {it.texte && <span style={{ fontSize: 16, lineHeight: 1.65, color: SOURDINE }}>{it.texte}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )

          case 'frise':
            return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <ul style={{ margin: 0, padding: '0 0 0 22px', listStyle: 'none', borderLeft: `2px solid ${TRAIT}`, display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {b.items.map((it, j) => (
                    <li key={j} style={{ position: 'relative' }}>
                      <span aria-hidden style={{ position: 'absolute', left: -29, top: 6, width: 12, height: 12, borderRadius: 999, background: primary, border: '2px solid #fff' }} />
                      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: primary }}>{it.date}</div>
                      <div style={{ fontSize: 17, fontWeight: 600, color: ENCRE, marginTop: 2 }}>{it.titre}</div>
                      {it.texte && <div style={{ fontSize: 16, lineHeight: 1.65, color: SOURDINE, marginTop: 4 }}>{it.texte}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )

          case 'chiffres':
            return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                  {b.items.map((it, j) => (
                    <div key={j} style={{ border: `1px solid ${TRAIT}`, borderRadius: 10, padding: '18px 16px', background: FOND_DOUX }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: primary, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{it.valeur}</div>
                      <div style={{ fontSize: 14, color: SOURDINE, marginTop: 6, lineHeight: 1.45 }}>{it.libelle}</div>
                    </div>
                  ))}
                </div>
              </div>
            )

          case 'tableau':
            return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <div style={{ overflowX: 'auto', border: `1px solid ${TRAIT}`, borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                    <thead>
                      <tr>{b.entetes.map((h, j) => (
                        <th key={j} scope="col" style={{ textAlign: 'left', padding: '12px 14px', background: FOND_DOUX, color: ENCRE, fontWeight: 700, borderBottom: `1px solid ${TRAIT}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {b.lignes.map((l, j) => (
                        <tr key={j}>{l.map((c, m) => (
                          <td key={m} style={{ padding: '12px 14px', borderBottom: `1px solid ${TRAIT}`, color: ENCRE, lineHeight: 1.55, fontVariantNumeric: 'tabular-nums' }}>{c}</td>
                        ))}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {b.note && <p style={{ fontSize: 13, color: SOURDINE, margin: '8px 0 0' }}>{b.note}</p>}
              </div>
            )

          case 'documents':
            return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {b.items.map((it, j) => (
                    <li key={j} style={{ border: `1px solid ${TRAIT}`, borderRadius: 10, padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <a href={it.url} style={{ color: primary, fontWeight: 600, fontSize: 16, textDecoration: 'underline' }}>{it.nom}</a>
                      <span style={{ fontSize: 13, color: SOURDINE, fontVariantNumeric: 'tabular-nums' }}>
                        {[it.format, it.poids].filter(Boolean).join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )

          case 'questions':
            return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {b.items.map((it, j) => (
                    <details key={j} style={{ border: `1px solid ${TRAIT}`, borderRadius: 10, padding: '13px 15px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: 16, fontWeight: 600, color: ENCRE, listStyle: 'revert' }}>{it.question}</summary>
                      <p style={{ fontSize: 16, lineHeight: 1.7, color: SOURDINE, margin: '10px 0 0' }}>{it.reponse}</p>
                    </details>
                  ))}
                </div>
              </div>
            )

          case 'encadre':
            return (
              <aside key={k} style={{ borderLeft: `4px solid ${b.ton === 'attention' ? '#b45309' : primary}`, background: FOND_DOUX, borderRadius: '0 10px 10px 0', padding: '15px 18px' }}>
                {b.titre && <div style={{ fontSize: 15, fontWeight: 700, color: ENCRE, marginBottom: 5 }}>{b.titre}</div>}
                <p style={{ fontSize: 16, lineHeight: 1.7, color: ENCRE, margin: 0 }}>{b.texte}</p>
              </aside>
            )

          case 'liens':
            return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 9 }}>
                  {b.items.map((it, j) => (
                    <li key={j}>
                      <Link href={`${base}/${it.chemin}`} style={{ display: 'block', border: `1px solid ${TRAIT}`, borderRadius: 10, padding: '13px 15px', color: primary, fontWeight: 600, fontSize: 16 }}>
                        {it.libelle} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )

          case 'image':
            return (
              <figure key={k} style={{ margin: 0 }}>
                {/* CLIQUABLE — l'image s'ouvre en grand dans un nouvel onglet.
                    Pas de visionneuse JavaScript : la page reste entiere sans
                    script, et le lecteur garde son bouton « retour ». */}
                <a href={b.url} target="_blank" rel="noopener noreferrer" aria-label={`Agrandir : ${b.alt}`} style={{ display: 'block' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- une URL fournie par le client ne passe pas par le loader d'images */}
                  <img src={b.url} alt={b.alt} loading="lazy" className="bloc-photo" style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block' }} />
                </a>
                {b.legende && <figcaption style={{ fontSize: 14, color: SOURDINE, marginTop: 8 }}>{b.legende}</figcaption>}
              </figure>
            )

          case 'galerie': {
            // TROIS PHOTOS OU PLUS → DIAPORAMA QUI TOURNE SEUL.
            // Entierement en CSS : pas de JavaScript, donc la page reste
            // entiere sans script et le diaporama demarre meme si le script
            // echoue. `prefers-reduced-motion` fige la premiere photo.
            const n = b.items.length
            if (n < 3) return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                  {b.items.map((it, j) => (
                    <figure key={j} style={{ margin: 0 }}>
                      <a href={it.url} target="_blank" rel="noopener noreferrer" aria-label={`Agrandir : ${it.alt}`} style={{ display: 'block' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- idem */}
                        <img src={it.url} alt={it.alt} loading="lazy" className="bloc-photo" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                      </a>
                      {it.legende && <figcaption style={{ fontSize: 13, color: SOURDINE, marginTop: 6 }}>{it.legende}</figcaption>}
                    </figure>
                  ))}
                </div>
              </div>
            )
            const duree = n * 4.5
            const part = 100 / n
            return (
              <div key={k}>
                <TitreDeBloc texte={b.titre} />
                <style>{`
                  @keyframes diapo${i} {
                    0% { opacity: 0 } 3% { opacity: 1 }
                    ${(part - 3).toFixed(2)}% { opacity: 1 }
                    ${part.toFixed(2)}% { opacity: 0 } 100% { opacity: 0 }
                  }
                  .diapo${i} > * { animation: diapo${i} ${duree}s linear infinite; }
                  @media (prefers-reduced-motion: reduce) {
                    .diapo${i} > * { animation: none; opacity: 0 }
                    .diapo${i} > *:first-child { opacity: 1 }
                  }
                `}</style>
                <div className={`diapo${i}`} style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', background: FOND_DOUX }}>
                  {b.items.map((it, j) => (
                    <a key={j} href={it.url} target="_blank" rel="noopener noreferrer" aria-label={`Agrandir : ${it.alt}`}
                      style={{ position: 'absolute', inset: 0, animationDelay: `${(j * duree / n).toFixed(2)}s`, display: 'block' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- une URL fournie par le client ne passe pas par le loader */}
                      <img src={it.url} alt={it.alt} loading={j === 0 ? 'eager' : 'lazy'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {it.legende && (
                        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 16px 12px', color: '#fff', fontSize: 14, background: 'linear-gradient(transparent, rgba(0,0,0,.62))' }}>{it.legende}</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )
          }

          case 'citation':
            return (
              <blockquote key={k} style={{ margin: 0, padding: '18px 22px', borderLeft: `4px solid ${primary}`, background: FOND_DOUX, borderRadius: '0 12px 12px 0' }}>
                <p style={{ fontSize: 19, lineHeight: 1.6, color: ENCRE, margin: 0, fontStyle: 'italic' }}>{b.texte}</p>
                {b.auteur && (
                  <footer style={{ fontSize: 14, color: SOURDINE, marginTop: 10 }}>
                    {b.auteur}{b.fonction ? ` · ${b.fonction}` : ''}
                  </footer>
                )}
              </blockquote>
            )

          case 'organigramme':
            return <Organigramme key={k} items={b.items} titre={b.titre} primary={primary} />

          case 'articles':
            // UNE LISTE VIDE DIT POURQUOI. Faire disparaître la section
            // laisserait croire que la page est cassée — les comptes ne
            // mentent pas quand ils sont à zéro.
            return (
              <ListeArticles
                key={k}
                articles={articles?.get(b.categorie) ?? []}
                base={base}
                lang={lang}
                primary={primary}
                titre={b.titre}
                vide={videArticles}
              />
            )

          case 'appel':
            return (
              <div key={k} style={{ border: `1px solid ${TRAIT}`, borderRadius: 12, padding: '20px 22px', background: FOND_DOUX }}>
                {b.texte && <p style={{ fontSize: 16, lineHeight: 1.7, color: ENCRE, margin: '0 0 14px' }}>{b.texte}</p>}
                <Link href={`${base}/${b.chemin}`} style={{ display: 'inline-block', background: primary, color: '#fff', fontWeight: 600, fontSize: 16, padding: '11px 20px', borderRadius: 999 }}>
                  {b.libelle}
                </Link>
              </div>
            )
        }
      })}
    </div>
  )
}
