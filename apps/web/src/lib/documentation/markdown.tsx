import type { ReactNode } from 'react'

// ============================================================
// LE MARKDOWN DU CORPUS, RENDU SANS DÉPENDANCE ET SANS HTML BRUT.
//
// ── POURQUOI PAS UNE BIBLIOTHÈQUE.
//
// Le corpus a été inventorié avant d'écrire une ligne : sur ses 24 fichiers il
// n'emploie que des titres, des paragraphes, des listes, des tableaux, des
// citations, du gras et de l'italique. AUCUN lien, AUCUNE image, AUCUN bloc de
// code. Le sous-ensemble est fermé et vérifiable — y ajouter une dépendance
// reviendrait à importer un analyseur complet, sa surface d'attaque et ses
// mises à jour pour une grammaire de six constructions.
//
// ── POURQUOI AUCUN `dangerouslySetInnerHTML`.
//
// Ce module ne produit JAMAIS de chaîne HTML : il construit des éléments React.
// Une balise écrite dans un fichier Markdown ne peut donc pas devenir une
// balise dans la page — React l'affichera comme du texte. L'injection n'est pas
// filtrée, elle est structurellement impossible.
//
// ── CE QU'IL FAUT SAVOIR SI LE CORPUS ÉVOLUE.
//
// Une construction non prévue ici n'est pas ignorée en silence : elle sort en
// paragraphe, telle quelle, visible. Un lien Markdown ajouté un jour se lirait
// donc « [texte](url) » à l'écran — laid, mais constaté du premier coup d'œil,
// là où un rendu partiel se serait fait oublier.
// ============================================================

/** Gras et italique. Le reste du texte passe sans transformation. */
function enLigne(texte: string): ReactNode[] {
  const noeuds: ReactNode[] = []
  // `**` est cherché AVANT `*` : l'alternance est ordonnée, sinon `**mot**`
  // se lirait comme un italique vide suivi d'un astérisque.
  const motif = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let curseur = 0
  let m: RegExpExecArray | null
  let n = 0
  while ((m = motif.exec(texte)) !== null) {
    if (m.index > curseur) noeuds.push(texte.slice(curseur, m.index))
    if (m[1] !== undefined) noeuds.push(<strong key={n++} className="text-white font-semibold">{m[1]}</strong>)
    else noeuds.push(<em key={n++} className="text-slate-300">{m[2]}</em>)
    curseur = m.index + m[0].length
  }
  if (curseur < texte.length) noeuds.push(texte.slice(curseur))
  return noeuds
}

/** Les cellules d'une ligne de tableau, sans les barres de bord. */
function cellules(ligne: string): string[] {
  return ligne.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
}

/** L'alignement déclaré par la ligne `|---|:---:|`. */
function alignements(ligne: string): ('left' | 'center' | 'right')[] {
  return cellules(ligne).map((c) => {
    const debut = c.startsWith(':')
    const fin = c.endsWith(':')
    if (debut && fin) return 'center'
    if (fin) return 'right'
    return 'left'
  })
}

const estTableau = (l: string) => l.startsWith('|')
const estListe = (l: string) => /^[-*] /.test(l)
const estNumerotee = (l: string) => /^\d+\. /.test(l)

export function RenduMarkdown({ markdown }: { markdown: string }) {
  const lignes = markdown.split('\n')
  const blocs: ReactNode[] = []
  let i = 0
  let cle = 0

  while (i < lignes.length) {
    const ligne = lignes[i]

    if (ligne.trim() === '') { i++; continue }

    // ── TITRES. Le `#` de tête sert de titre de page : il est rendu, et c'est
    // lui que les moteurs lisent comme premier niveau du document.
    if (ligne.startsWith('### ')) {
      blocs.push(<h3 key={cle++} className="text-lg font-bold text-white mt-10 mb-3">{enLigne(ligne.slice(4))}</h3>)
      i++; continue
    }
    if (ligne.startsWith('## ')) {
      blocs.push(
        <h2 key={cle++} className="text-2xl font-bold text-white mt-14 mb-4 scroll-mt-24"
          id={ligne.slice(3).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}>
          {enLigne(ligne.slice(3))}
        </h2>
      )
      i++; continue
    }
    if (ligne.startsWith('# ')) {
      blocs.push(<h1 key={cle++} className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight">{enLigne(ligne.slice(2))}</h1>)
      i++; continue
    }

    // ── CITATION DE TÊTE. C'est le résumé du chapitre, mis en avant.
    if (ligne.startsWith('> ')) {
      const parts: string[] = []
      while (i < lignes.length && lignes[i].startsWith('> ')) { parts.push(lignes[i].slice(2)); i++ }
      blocs.push(
        <p key={cle++} className="text-lg text-slate-300 leading-relaxed border-l-2 pl-5 my-8"
          style={{ borderColor: '#FA5D1E' }}>
          {enLigne(parts.join(' '))}
        </p>
      )
      continue
    }

    // ── TABLEAUX. Deuxième ligne = alignement, jamais affichée.
    if (estTableau(ligne)) {
      const brutes: string[] = []
      while (i < lignes.length && estTableau(lignes[i])) { brutes.push(lignes[i]); i++ }
      const entetes = cellules(brutes[0])
      const aligne = brutes.length > 1 && /^[|\s:-]+$/.test(brutes[1]) ? alignements(brutes[1]) : []
      const corps = brutes.slice(aligne.length ? 2 : 1).map(cellules)
      blocs.push(
        <div key={cle++} className="my-8 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-white/5">
                {entetes.map((h, k) => (
                  <th key={k} className="px-4 py-3 font-semibold text-white border-b border-white/10 whitespace-nowrap"
                    style={{ textAlign: aligne[k] ?? 'left' }}>{enLigne(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corps.map((r, k) => (
                <tr key={k} className="border-b border-white/5 last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className="px-4 py-3 text-slate-300 align-top"
                      style={{ textAlign: aligne[j] ?? 'left' }}>{enLigne(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // ── LISTES.
    if (estListe(ligne)) {
      const items: string[] = []
      while (i < lignes.length && estListe(lignes[i])) { items.push(lignes[i].slice(2)); i++ }
      blocs.push(
        <ul key={cle++} className="my-5 space-y-2.5">
          {items.map((it, k) => (
            <li key={k} className="flex gap-3 text-slate-300 leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#FA5D1E' }} />
              <span>{enLigne(it)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    if (estNumerotee(ligne)) {
      const items: string[] = []
      while (i < lignes.length && estNumerotee(lignes[i])) { items.push(lignes[i].replace(/^\d+\.\s/, '')); i++ }
      blocs.push(
        <ol key={cle++} className="my-5 space-y-2.5">
          {items.map((it, k) => (
            <li key={k} className="flex gap-3 text-slate-300 leading-relaxed">
              <span className="text-sm font-bold flex-shrink-0 w-5" style={{ color: '#FA5D1E' }}>{k + 1}.</span>
              <span>{enLigne(it)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // ── PARAGRAPHE. Les lignes consécutives forment un seul paragraphe, comme
    // en Markdown ; une ligne vide le termine.
    const parts: string[] = []
    while (
      i < lignes.length && lignes[i].trim() !== '' &&
      !lignes[i].startsWith('#') && !lignes[i].startsWith('> ') &&
      !estTableau(lignes[i]) && !estListe(lignes[i]) && !estNumerotee(lignes[i])
    ) { parts.push(lignes[i]); i++ }
    blocs.push(<p key={cle++} className="my-4 text-slate-300 leading-relaxed">{enLigne(parts.join(' '))}</p>)
  }

  return <>{blocs}</>
}
