'use client'

import { useEffect, useState } from 'react'

// ============================================================================
// LES GRAPHIQUES DU TABLEAU DE BORD (CPA, 2026-11-19) — SVG, sans dépendance.
//
// « Les commandes du mois, l'évolution, la répartition… ne s'animent pas :
// fais-les animés » (propriétaire, avec une capture de référence). Donc :
//   · la courbe est LISSÉE et se DESSINE, son aire apparaît, chaque point
//     montre sa valeur au survol ;
//   · les barres MONTENT l'une après l'autre ;
//   · l'anneau se REMPLIT part par part ;
//   · les chiffres DÉFILENT jusqu'à leur valeur.
// Tout est coupé sous `prefers-reduced-motion` : on montre alors l'état final.
// Chaque graphique porte un `aria-label` qui dit ses valeurs.
// ============================================================================

/** Vrai une image après le montage : de quoi déclencher les transitions CSS. */
export function useMonte(): boolean {
  const [m, setM] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return m
}

const reduit = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Un nombre qui défile jusqu'à sa valeur (ease-out, ~0,9 s). */
export function Defile({ valeur, lang }: { valeur: number; lang?: string | null }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (reduit()) { const id = requestAnimationFrame(() => setV(valeur)); return () => cancelAnimationFrame(id) }
    let id = 0
    const t0 = performance.now(), d = 900
    const pas = (t: number) => {
      const p = Math.min(1, (t - t0) / d)
      setV(Math.round(valeur * (1 - Math.pow(1 - p, 3))))
      if (p < 1) id = requestAnimationFrame(pas)
    }
    id = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(id)
  }, [valeur])
  return <>{v.toLocaleString(lang ?? undefined)}</>
}

export function MiniBarres({ valeurs, couleur }: { valeurs: number[]; couleur: string }) {
  const monte = useMonte()
  const max = Math.max(1, ...valeurs)
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 34, marginTop: 14 }}>
      {valeurs.map((v, i) => (
        <span key={i} style={{
          flex: 1, borderRadius: 4, minHeight: 3, height: monte ? `${Math.max(8, (v / max) * 100)}%` : '8%',
          transition: `height .7s cubic-bezier(.22,.8,.3,1) ${i * 60}ms`,
          background: v === 0 ? '#e5e7eb' : i === valeurs.length - 1 ? couleur : `color-mix(in srgb, ${couleur} 50%, #ffffff)`,
        }} />
      ))}
    </div>
  )
}

/** Une courbe lisse passant par les points (Catmull-Rom → Bézier). */
function lisse(pts: (readonly [number, number])[]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

export function CourbeAire({ valeurs, libelles, couleur, titre, vide }: { valeurs: number[]; libelles: string[]; couleur: string; titre: string; vide?: string }) {
  const monte = useMonte()
  const [survol, setSurvol] = useState<number | null>(null)
  const L = 600, H = 220, mx = 14, my = 18
  const max = Math.max(1, ...valeurs)
  const pts = valeurs.map((v, i) => [mx + (i * (L - 2 * mx)) / Math.max(1, valeurs.length - 1), H - my - (v / max) * (H - 2 * my)] as const)
  const ligne = lisse(pts)
  const aire = `${ligne} L${pts[pts.length - 1][0]},${H - my} L${pts[0][0]},${H - my} Z`
  const id = `aire-${couleur.replace(/[^a-z0-9]/gi, '')}`
  const toutZero = valeurs.every((v) => v === 0)
  return (
    <figure className="gCourbe" style={{ margin: 0, position: 'relative' }}
      aria-label={`${titre} : ${libelles.map((l, i) => `${l} ${valeurs[i]}`).join(', ')}`}
      onMouseLeave={() => setSurvol(null)}>
      <svg viewBox={`0 0 ${L} ${H}`} width="100%" height="220" preserveAspectRatio="none" role="img" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={couleur} stopOpacity=".35" />
            <stop offset="100%" stopColor={couleur} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={mx} x2={L - mx} y1={my + f * (H - 2 * my)} y2={my + f * (H - 2 * my)} stroke="#e5e7eb" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={aire} fill={`url(#${id})`} style={{ opacity: monte ? 1 : 0, transition: 'opacity .9s ease .5s' }} />
        <path d={ligne} fill="none" stroke={couleur} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
          pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: monte ? 0 : 1, transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,.1,.2,1)' }} />
        {survol !== null && (
          <line x1={pts[survol][0]} x2={pts[survol][0]} y1={my} y2={H - my} stroke={couleur} strokeOpacity=".25" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {/* Les points en HTML : ronds quel que soit l'étirement du SVG. */}
      {pts.map(([x, y], i) => (
        <button key={i} type="button" className="gPoint" aria-label={`${libelles[i]} : ${valeurs[i]}`}
          onMouseEnter={() => setSurvol(i)} onFocus={() => setSurvol(i)} onBlur={() => setSurvol(null)}
          style={{ left: `${(x / L) * 100}%`, top: `${y}px`, borderColor: couleur, opacity: monte ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${survol === i ? 1.35 : 1})`, transition: `opacity .4s ease ${0.8 + i * 0.08}s, transform .18s ease` }}>
          {survol === i && <span className="gBulle" style={{ background: couleur }}>{libelles[i]} · <strong>{valeurs[i]}</strong></span>}
        </button>
      ))}
      {toutZero && vide && <p className="gVide">{vide}</p>}
      <figcaption style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginTop: 8 }}>
        {libelles.map((l) => <span key={l}>{l}</span>)}
      </figcaption>
    </figure>
  )
}

export function BarresMois({ valeurs, libelles, couleur, titre, vide }: { valeurs: number[]; libelles: string[]; couleur: string; titre: string; vide?: string }) {
  const monte = useMonte()
  const max = Math.max(1, ...valeurs)
  const toutZero = valeurs.every((v) => v === 0)
  return (
    <div style={{ position: 'relative' }}>
      <div aria-label={`${titre} : ${libelles.map((l, i) => `${l} ${valeurs[i]}`).join(', ')}`} role="img"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${valeurs.length}, 1fr)`, gap: 14, alignItems: 'end', height: 220 }}>
        {valeurs.map((v, i) => (
          <div key={i} className="gBarre" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#374151', opacity: monte ? 1 : 0, transition: `opacity .4s ease ${0.5 + i * 0.09}s` }}>{v}</span>
            <span className="gBarreCorps" style={{ width: '100%', maxWidth: 68, borderRadius: '12px 12px 6px 6px', height: `${v === 0 ? 4 : Math.max(10, (v / max) * 160)}px`,
              transformOrigin: 'bottom', transform: monte ? 'scaleY(1)' : 'scaleY(0)', transition: `transform .8s cubic-bezier(.22,.9,.3,1.15) ${i * 0.09}s`,
              background: v === 0 ? '#e5e7eb' : `linear-gradient(180deg, color-mix(in srgb, ${couleur} 75%, #ffffff), ${couleur})` }} />
            <span style={{ fontSize: 13, color: '#6b7280' }}>{libelles[i]}</span>
          </div>
        ))}
      </div>
      {toutZero && vide && <p className="gVide" style={{ top: '35%' }}>{vide}</p>}
    </div>
  )
}

export function Anneau({ parts, libelles, total, sousTitre, lang }: {
  parts: { cle: string; n: number; couleur: string }[]; libelles: Record<string, string>; total: number; sousTitre: string; lang?: string | null
}) {
  const monte = useMonte()
  const r = 58, c = 2 * Math.PI * r, ecart = parts.length > 1 ? 4 : 0
  // Le début de chaque part : la somme des parts qui la précèdent (calculée
  // d'avance — aucune variable ne se modifie pendant le rendu).
  const longueurs = parts.map((p) => (total ? (p.n / total) * c : 0))
  const debuts = longueurs.map((_, i) => longueurs.slice(0, i).reduce((a, b) => a + b, 0))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
      <svg width="160" height="160" viewBox="0 0 160 160" role="img"
        aria-label={`${sousTitre} : ${parts.map((p) => `${libelles[p.cle] ?? p.cle} ${p.n}`).join(', ') || '0'}`}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#eef0f3" strokeWidth="20" />
        {parts.map((p, i) => {
          const l = Math.max(0, longueurs[i] - ecart)
          return (
            <circle key={p.cle} cx="80" cy="80" r={r} fill="none" stroke={p.couleur} strokeWidth="20" strokeLinecap="butt"
              strokeDasharray={`${monte ? l : 0} ${c}`} strokeDashoffset={-debuts[i]} transform="rotate(-90 80 80)"
              style={{ transition: `stroke-dasharray .9s cubic-bezier(.22,.8,.3,1) ${0.15 + i * 0.18}s` }} />
          )
        })}
        <text x="80" y="80" textAnchor="middle" fontSize="30" fontWeight="800" fill="#111827"><tspan><Defile valeur={total} lang={lang} /></tspan></text>
        <text x="80" y="102" textAnchor="middle" fontSize="12.5" fill="#6b7280">{sousTitre}</text>
      </svg>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: '1 1 170px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {parts.map((p, i) => (
          <li key={p.cle} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, opacity: monte ? 1 : 0, transform: monte ? 'none' : 'translateX(-6px)',
            transition: `opacity .4s ease ${0.3 + i * 0.12}s, transform .4s ease ${0.3 + i * 0.12}s` }}>
            <span aria-hidden style={{ width: 11, height: 11, borderRadius: 3, background: p.couleur }} />
            <span style={{ flex: 1 }}>{libelles[p.cle] ?? p.cle}</span>
            <strong>{p.n}</strong>
            <span style={{ fontSize: 12.5, color: '#6b7280', minWidth: 38, textAlign: 'end' }}>{total ? Math.round((p.n / total) * 100) : 0} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BarresHorizontales({ lignes, couleur, vide }: { lignes: { nom: string; valeur: number; suffixe?: string }[]; couleur: string; vide: string }) {
  const monte = useMonte()
  if (lignes.length === 0) return <p style={{ margin: 0, color: '#6b7280' }}>{vide}</p>
  const max = Math.max(1, ...lignes.map((l) => l.valeur))
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {lignes.map((l, i) => (
        <li key={l.nom}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14.5, marginBottom: 6 }}>
            <strong style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{l.nom}</strong>
            <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{l.valeur.toLocaleString('fr-FR')}{l.suffixe ? ` ${l.suffixe}` : ''}</span>
          </div>
          <div aria-hidden style={{ height: 8, borderRadius: 8, background: '#eef0f3', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: monte ? `${(l.valeur / max) * 100}%` : '0%', borderRadius: 8,
              background: `linear-gradient(90deg, color-mix(in srgb, ${couleur} 65%, #ffffff), ${couleur})`,
              transition: `width 1s cubic-bezier(.22,.8,.3,1) ${i * 0.1}s` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Les styles partagés des graphiques (points, bulles, états vides). */
export const STYLE_GRAPHIQUES = `
  .gCourbe .gPoint { position: absolute; width: 13px; height: 13px; padding: 0; border-radius: 50%; background: #fff; border: 3px solid; cursor: pointer;
    box-shadow: 0 4px 10px -4px rgba(0,0,0,.35) }
  .gCourbe .gPoint:focus-visible { outline: 2px solid #111; outline-offset: 2px }
  .gBulle { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); white-space: nowrap; color: #fff;
    font-size: 12.5px; padding: 6px 10px; border-radius: 9px; box-shadow: 0 10px 20px -10px rgba(0,0,0,.5); pointer-events: none }
  .gBarre:hover .gBarreCorps { filter: brightness(1.12); box-shadow: 0 10px 20px -12px rgba(0,0,0,.45) }
  .gVide { position: absolute; left: 0; right: 0; top: 40%; margin: 0; text-align: center; font-size: 14px; color: #9ca3af; pointer-events: none }
  @media (prefers-reduced-motion: reduce) {
    .gCourbe *, .gBarre *, .tdb * { transition: none !important; animation: none !important }
  }
`
