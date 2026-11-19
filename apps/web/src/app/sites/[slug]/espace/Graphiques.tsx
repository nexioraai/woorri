// ============================================================================
// LES GRAPHIQUES DU TABLEAU DE BORD (CPA, 2026-11-19) — SVG, sans dépendance.
//
// Même langage que les tableaux de bord des applis Deribfy : mini-barres dans
// les cartes, courbe en aire, barres par mois, anneau de répartition, barres
// horizontales. Chaque graphique porte un `aria-label` qui dit ses valeurs :
// un lecteur d'écran ne lit pas une courbe.
// ============================================================================

export function MiniBarres({ valeurs, couleur }: { valeurs: number[]; couleur: string }) {
  const max = Math.max(1, ...valeurs)
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 34, marginTop: 14 }}>
      {valeurs.map((v, i) => (
        <span key={i} style={{
          flex: 1, borderRadius: 4, minHeight: 3, height: `${Math.max(8, (v / max) * 100)}%`,
          background: v === 0 ? '#e5e7eb' : i === valeurs.length - 1 ? couleur : `color-mix(in srgb, ${couleur} 55%, #ffffff)`,
        }} />
      ))}
    </div>
  )
}

export function CourbeAire({ valeurs, libelles, couleur, titre }: { valeurs: number[]; libelles: string[]; couleur: string; titre: string }) {
  const L = 600, H = 200, m = 8
  const max = Math.max(1, ...valeurs)
  const pts = valeurs.map((v, i) => [m + (i * (L - 2 * m)) / Math.max(1, valeurs.length - 1), H - m - (v / max) * (H - 2 * m)] as const)
  const ligne = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const aire = `${ligne} L${pts[pts.length - 1][0].toFixed(1)},${H - m} L${pts[0][0].toFixed(1)},${H - m} Z`
  const id = `aire-${couleur.replace(/[^a-z0-9]/gi, '')}`
  return (
    <figure style={{ margin: 0 }} aria-label={`${titre} : ${libelles.map((l, i) => `${l} ${valeurs[i]}`).join(', ')}`}>
      <svg viewBox={`0 0 ${L} ${H}`} width="100%" height="200" preserveAspectRatio="none" role="img" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={couleur} stopOpacity=".28" />
            <stop offset="100%" stopColor={couleur} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={m} x2={L - m} y1={m + f * (H - 2 * m)} y2={m + f * (H - 2 * m)} stroke="#e5e7eb" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={aire} fill={`url(#${id})`} />
        <path d={ligne} fill="none" stroke={couleur} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginTop: 8 }}>
        {libelles.map((l) => <span key={l}>{l}</span>)}
      </figcaption>
    </figure>
  )
}

export function BarresMois({ valeurs, libelles, couleur, titre }: { valeurs: number[]; libelles: string[]; couleur: string; titre: string }) {
  const max = Math.max(1, ...valeurs)
  return (
    <div aria-label={`${titre} : ${libelles.map((l, i) => `${l} ${valeurs[i]}`).join(', ')}`} role="img"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${valeurs.length}, 1fr)`, gap: 14, alignItems: 'end', height: 210 }}>
      {valeurs.map((v, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>{v}</span>
          <span style={{ width: '100%', maxWidth: 64, borderRadius: 10, height: `${v === 0 ? 4 : Math.max(8, (v / max) * 150)}px`,
            background: v === 0 ? '#e5e7eb' : couleur, transition: 'height .5s cubic-bezier(.22,.8,.3,1)' }} />
          <span style={{ fontSize: 13, color: '#6b7280' }}>{libelles[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function Anneau({ parts, libelles, total, sousTitre }: {
  parts: { cle: string; n: number; couleur: string }[]; libelles: Record<string, string>; total: number; sousTitre: string
}) {
  const r = 56, c = 2 * Math.PI * r
  let deja = 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
      <svg width="150" height="150" viewBox="0 0 150 150" role="img"
        aria-label={`${sousTitre} : ${parts.map((p) => `${libelles[p.cle] ?? p.cle} ${p.n}`).join(', ') || '0'}`}>
        <circle cx="75" cy="75" r={r} fill="none" stroke="#eef0f3" strokeWidth="18" />
        {parts.map((p) => {
          const long = total ? (p.n / total) * c : 0
          const el = <circle key={p.cle} cx="75" cy="75" r={r} fill="none" stroke={p.couleur} strokeWidth="18"
            strokeDasharray={`${long} ${c - long}`} strokeDashoffset={-deja} transform="rotate(-90 75 75)" />
          deja += long
          return el
        })}
        <text x="75" y="74" textAnchor="middle" fontSize="28" fontWeight="800" fill="#111827">{total}</text>
        <text x="75" y="96" textAnchor="middle" fontSize="12.5" fill="#6b7280">{sousTitre}</text>
      </svg>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {parts.map((p) => (
          <li key={p.cle} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5 }}>
            <span aria-hidden style={{ width: 11, height: 11, borderRadius: 3, background: p.couleur }} />
            <span style={{ flex: 1 }}>{libelles[p.cle] ?? p.cle}</span>
            <strong>{p.n}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BarresHorizontales({ lignes, couleur, vide }: { lignes: { nom: string; valeur: number; suffixe?: string }[]; couleur: string; vide: string }) {
  if (lignes.length === 0) return <p style={{ margin: 0, color: '#6b7280' }}>{vide}</p>
  const max = Math.max(1, ...lignes.map((l) => l.valeur))
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {lignes.map((l) => (
        <li key={l.nom}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14.5, marginBottom: 6 }}>
            <strong style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{l.nom}</strong>
            <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{l.valeur.toLocaleString('fr-FR')}{l.suffixe ? ` ${l.suffixe}` : ''}</span>
          </div>
          <div aria-hidden style={{ height: 6, borderRadius: 6, background: '#eef0f3' }}>
            <div style={{ height: '100%', width: `${(l.valeur / max) * 100}%`, borderRadius: 6, background: couleur }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
