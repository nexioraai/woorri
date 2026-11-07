import Link from 'next/link'
import type { Bloc } from './blocs'

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

export default function BlocsDePage({ blocs, base, primary = '#1e4d8c' }: { blocs: Bloc[]; base: string; primary?: string }) {
  if (blocs.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      {blocs.map((b, i) => {
        const k = `bloc-${i}`
        switch (b.type) {
          case 'titre':
            return b.niveau === 3
              ? <h3 key={k} style={{ fontSize: 21, fontWeight: 700, color: ENCRE, margin: '10px 0 0' }}>{b.texte}</h3>
              : <h2 key={k} style={{ fontSize: 27, fontWeight: 700, color: ENCRE, margin: '18px 0 0', paddingBottom: 10, borderBottom: `2px solid ${primary}` }}>{b.texte}</h2>

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
