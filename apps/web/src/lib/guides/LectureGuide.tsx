import type { ReactNode } from 'react'

// ============================================================================
// L'AFFICHAGE DU GUIDE — un lecteur Markdown MINIMAL, sans dépendance.
//
// Il ne couvre que ce que le guide emploie : titres `#` `##`, paragraphes,
// listes `-` (et leur second niveau) ou `1.`, tableaux `|`, `---`, et dans le
// texte **gras**, `code` et les adresses https. Le texte vient d'un fichier
// du dépôt (jamais d'un visiteur) : il est rendu en éléments React, jamais en
// HTML brut.
// ============================================================================

function enLigne(texte: string): ReactNode[] {
  const out: ReactNode[] = []
  const motif = /\*\*([^*]+)\*\*|`([^`]+)`|(https?:\/\/[^\s)]+)/g
  let dernier = 0
  let m: RegExpExecArray | null
  while ((m = motif.exec(texte))) {
    if (m.index > dernier) out.push(texte.slice(dernier, m.index))
    if (m[1]) out.push(<strong key={m.index}>{m[1]}</strong>)
    else if (m[2]) out.push(<code key={m.index} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.92em', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 5 }}>{m[2]}</code>)
    else if (m[3]) out.push(<a key={m.index} href={m[3]} target="_blank" rel="noopener noreferrer" style={{ color: '#FA5D1E' }}>{m[3]}</a>)
    dernier = motif.lastIndex
  }
  if (dernier < texte.length) out.push(texte.slice(dernier))
  return out
}

type Element =
  | { t: 'h1' | 'h2' | 'p'; texte: string }
  | { t: 'hr' }
  | { t: 'ul' | 'ol'; items: { texte: string; sous: string[] }[] }
  | { t: 'table'; lignes: string[][] }

export function analyser(md: string): Element[] {
  const lignes = md.split('\n')
  const out: Element[] = []
  let i = 0
  while (i < lignes.length) {
    const l = lignes[i]
    if (!l.trim()) { i++; continue }
    if (l.startsWith('# ')) { out.push({ t: 'h1', texte: l.slice(2) }); i++; continue }
    if (l.startsWith('## ')) { out.push({ t: 'h2', texte: l.slice(3) }); i++; continue }
    if (/^---\s*$/.test(l)) { out.push({ t: 'hr' }); i++; continue }
    if (l.startsWith('|')) {
      const rangs: string[][] = []
      while (i < lignes.length && lignes[i].startsWith('|')) {
        const cellules = lignes[i].split('|').slice(1, -1).map((c) => c.trim())
        if (!cellules.every((c) => /^-+$/.test(c))) rangs.push(cellules)
        i++
      }
      out.push({ t: 'table', lignes: rangs }); continue
    }
    const puce = /^(-|\d+\.) /
    if (puce.test(l)) {
      const ordonnee = /^\d+\./.test(l)
      const items: { texte: string; sous: string[] }[] = []
      while (i < lignes.length && (puce.test(lignes[i]) || /^\s{2,}\S/.test(lignes[i]))) {
        const x = lignes[i]
        if (puce.test(x)) items.push({ texte: x.replace(puce, ''), sous: [] })
        else if (/^\s+- /.test(x)) items[items.length - 1]?.sous.push(x.replace(/^\s+- /, ''))
        else if (items.length) {
          const dernier = items[items.length - 1]
          if (dernier.sous.length) dernier.sous[dernier.sous.length - 1] += ' ' + x.trim()
          else dernier.texte += ' ' + x.trim()
        }
        i++
      }
      out.push({ t: ordonnee ? 'ol' : 'ul', items }); continue
    }
    const para: string[] = []
    while (i < lignes.length && lignes[i].trim() && !/^(#|\||-|\d+\.|---)/.test(lignes[i])) { para.push(lignes[i].trim()); i++ }
    if (para.length) out.push({ t: 'p', texte: para.join(' ') })
    else i++
  }
  return out
}

export default function LectureGuide({ md }: { md: string }) {
  return (
    <div style={{ lineHeight: 1.7, fontSize: 15.5 }}>
      {analyser(md).map((e, k) => {
        switch (e.t) {
          case 'h1': return <h1 key={k} style={{ fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 800, margin: '0 0 14px' }}>{enLigne(e.texte)}</h1>
          case 'h2': return <h2 key={k} style={{ fontSize: 20, fontWeight: 700, margin: '36px 0 12px' }}>{enLigne(e.texte)}</h2>
          case 'p': return <p key={k} style={{ margin: '0 0 14px', opacity: 0.85 }}>{enLigne(e.texte)}</p>
          case 'hr': return <hr key={k} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.12)', margin: '28px 0' }} />
          case 'ul':
          case 'ol': {
            const Liste = e.t
            return (
              <Liste key={k} style={{ margin: '0 0 16px', paddingInlineStart: 22, opacity: 0.88 }}>
                {e.items.map((it, j) => (
                  <li key={j} style={{ marginBottom: 6 }}>
                    {enLigne(it.texte)}
                    {it.sous.length > 0 && <ul style={{ marginTop: 6, paddingInlineStart: 20 }}>{it.sous.map((s, n) => <li key={n} style={{ marginBottom: 4 }}>{enLigne(s)}</li>)}</ul>}
                  </li>
                ))}
              </Liste>
            )
          }
          case 'table': {
            const [tete, ...corps] = e.lignes
            return (
              <div key={k} style={{ overflowX: 'auto', margin: '0 0 18px' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14.5 }}>
                  <thead><tr>{tete.map((c, j) => <th key={j} style={{ textAlign: 'start', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.18)' }}>{enLigne(c)}</th>)}</tr></thead>
                  <tbody>{corps.map((r, j) => <tr key={j}>{r.map((c, n) => <td key={n} style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', verticalAlign: 'top' }}>{enLigne(c)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )
          }
        }
      })}
    </div>
  )
}
