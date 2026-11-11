'use client'

import { useEffect, useRef, useState } from 'react'
import TexteQuiSEcrit from '../themes/TexteQuiSEcrit'

// ============================================================================
// LE HERO « VITRINE » (demande CPA, 2026-11-11) — modèle : les sites produit
// premium (café « Let it bloom », bagel « Lūme », « Cacao & Cream ») que le
// propriétaire a envoyés. Ce qu'ils ont en commun, et que ce composant reprend :
//   · UN SEUL ÉCRAN qui défile de lui-même (pastille de numéro, flèches,
//     points), pas une longue page ;
//   · l'OBJET EN GRAND au centre, qui s'assemble pièce par pièce, avec des
//     éclats qui flottent autour ;
//   · un GRAND MOT plein et coloré derrière l'objet (« LET IT BLOOM ») ;
//   · à gauche un titre court et gras, deux lignes, un bouton et un bouton
//     rond fléché ;
//   · les finitions : badge rond au texte tournant, grande forme teintée
//     derrière l'objet, ombre au sol.
//
// LES PIÈCES suivent la convention de l'assemblage : 1re = contenant ouvert,
// celles du milieu tombent dedans, avant-dernière = contenant fermé, dernière
// = véhicule qui l'emporte.
//
// SANS JAVASCRIPT ou avec `prefers-reduced-motion` : la dernière étape,
// composée et fixe. La lecture se met en pause au survol et au clavier.
// ============================================================================

export type PieceVitrine = { titre: string; texte?: string; image?: string; libelle?: string }

const sure = (u?: string) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u : undefined)
const borne = (x: number) => Math.min(1, Math.max(0, x))
const rebond = (t: number) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
const doux = (t: number) => t * t * (3 - 2 * t)

const ENTREE_MS = 1300   // durée d'arrivée d'une pièce
const TENUE_MS = 2900    // temps passé sur une étape une fois la pièce posée

export default function HeroVitrine({
  pieces, surtitre, accent, bouton, lienBouton, badge, titrePage,
}: {
  pieces: PieceVitrine[]; surtitre?: string; accent: string
  bouton?: string; lienBouton?: string; badge?: string
  /** Le titre de la page d'accueil : il reste LE h1, stable, lu par les moteurs. */
  titrePage?: string
}) {
  const n = pieces.length
  const [etape, setEtape] = useState(n - 1)   // rendu serveur : la composition finale
  const [t, setT] = useState(1)               // avancement de l'arrivée de la pièce `etape`
  const [vivant, setVivant] = useState(false)
  const pause = useRef(false)
  const depart = useRef(0)
  const etapeR = useRef(n - 1)
  const tR = useRef(1)

  // Le démarrage : seulement avec du mouvement autorisé.
  useEffect(() => {
    const sansMouvement = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const h = setTimeout(() => { if (!sansMouvement && n >= 4) { etapeR.current = 0; tR.current = 0; setEtape(0); setT(0); setVivant(true); depart.current = performance.now() } }, 0)
    return () => clearTimeout(h)
  }, [n])

  // La boucle : la pièce arrive (ENTREE_MS), tient (TENUE_MS), puis l'étape suivante.
  // UNE seule boucle, stable : l'étape et l'avancement vivent dans des refs.
  useEffect(() => {
    if (!vivant) return
    let raf = 0
    const tic = (now: number) => {
      if (pause.current) {
        // En pause, l'horloge recule d'autant : la reprise repart d'où on était.
        depart.current = now - (tR.current * ENTREE_MS)
        raf = requestAnimationFrame(tic); return
      }
      const ecoule = now - depart.current
      const nt = borne(ecoule / ENTREE_MS)
      if (nt !== tR.current) { tR.current = nt; setT(nt) }
      if (ecoule > ENTREE_MS + TENUE_MS + (etapeR.current === n - 1 ? 1800 : 0)) {
        depart.current = now
        etapeR.current = (etapeR.current + 1) % n
        tR.current = 0
        setT(0); setEtape(etapeR.current)
      }
      raf = requestAnimationFrame(tic)
    }
    raf = requestAnimationFrame(tic)
    return () => cancelAnimationFrame(raf)
  }, [vivant, n])

  const aller = (k: number) => {
    depart.current = performance.now()
    etapeR.current = ((k % n) + n) % n; tR.current = 0
    setT(0); setEtape(etapeR.current)
  }

  // ── POSITION DES PIÈCES : `seg` = étape courante + avancement.
  const seg = etape + t
  const tt = (i: number) => borne(seg - i)
  const iFerme = n - 2
  const iVehicule = n - 1
  const style = (i: number): React.CSSProperties => {
    const ti = tt(i)
    if (i === 0) {
      const dis = doux(tt(iFerme))
      return { width: '66%', bottom: '12%', zIndex: 2, opacity: (ti > 0 ? 1 : 0) * (1 - dis), transform: `translateX(-50%) translateY(${(1 - rebond(ti)) * -110}%)` }
    }
    if (i === iFerme) {
      const dep = doux(tt(iVehicule))
      return { width: '66%', bottom: '12%', zIndex: 3, opacity: doux(ti) * (1 - borne((dep - 0.7) * 3.4)),
        transform: `translateX(calc(-50% + ${dep * 20}%)) translateY(${dep * 24}%) scale(${(0.9 + 0.1 * rebond(ti)) * (1 - 0.7 * dep)})` }
    }
    if (i === iVehicule) {
      return { width: '100%', bottom: '6%', zIndex: 4, opacity: doux(borne(ti * 1.7)), transform: `translateX(calc(-50% - ${(1 - doux(ti)) * 60}%))` }
    }
    const e = rebond(ti)
    const r = doux(tt(i + 1))
    return { width: i === 2 ? '44%' : '40%', bottom: '50%', zIndex: 3, opacity: (ti > 0 ? 1 : 0) * (1 - r),
      transform: `translateX(-50%) translateY(${(1 - e) * -170 + r * 70}%) rotate(${(1 - e) * (i % 2 ? -26 : 22)}deg) scale(${1 - 0.55 * r})` }
  }

  const e = pieces[etape]
  const mot = (e.libelle || e.titre).toUpperCase()
  const css = `
    .vitrine { --acc: ${accent}; position: relative; overflow: hidden; color: #17201b;
      background: radial-gradient(110% 80% at 72% 45%, #fdfaf4 0%, #f4eee3 55%, #ece4d5 100%) }
    .vitrine .grille { position: relative; max-width: 1320px; margin: 0 auto; padding: 120px 28px 64px; min-height: max(100vh, 680px);
      display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 8fr); align-items: center; gap: 12px; box-sizing: border-box }
    .vitrine .plateau { position: relative; height: min(70vh, 640px); container-type: inline-size; overflow-x: clip }
    .vitrine .piece { position: absolute; left: 50%; will-change: transform, opacity; pointer-events: none }
    .vitrine .piece img { display: block; width: 100%; height: auto; filter: drop-shadow(0 30px 32px rgba(23,32,27,.24)) }
    .vitrine .forme { position: absolute; left: 50%; top: 50%; width: 78%; aspect-ratio: 1; border-radius: 50%; transform: translate(-50%, -52%);
      background: radial-gradient(closest-side, color-mix(in srgb, var(--acc) 16%, #fff), color-mix(in srgb, var(--acc) 6%, transparent) 70%, transparent) }
    .vitrine .geant { position: absolute; right: 1%; top: 4%; z-index: 1; text-align: right; pointer-events: none;
      font-weight: 900; line-height: .86; letter-spacing: -0.035em; color: var(--acc);
      text-shadow: 0 4px 0 color-mix(in srgb, var(--acc) 55%, #000), 0 18px 30px rgba(0,0,0,.18) }
    .vitrine .eclat { position: absolute; z-index: 5; width: 26px; height: 11px; border-radius: 99px; pointer-events: none;
      background: linear-gradient(90deg, var(--acc) 50%, #fff 50%); box-shadow: 0 6px 10px rgba(0,0,0,.15); animation: vitrineFlotte 6s ease-in-out infinite }
    @keyframes vitrineFlotte { 0%,100% { translate: 0 0 } 50% { translate: 0 -14px } }
    @keyframes vitrineTourne { to { rotate: 360deg } }
    .vitrine .badge { position: absolute; left: 2%; bottom: 4%; z-index: 6; width: 112px; height: 112px }
    .vitrine .badge svg { width: 100%; height: 100%; animation: vitrineTourne 18s linear infinite }
    .vitrine .fleche { all: unset; cursor: pointer; width: 44px; height: 44px; border-radius: 99px; display: grid; place-items: center;
      border: 1.5px solid rgba(23,32,27,.25); color: #17201b; font-size: 20px; background: rgba(255,255,255,.5); transition: background .2s }
    .vitrine .fleche:hover { background: #fff }
    .vitrine .fleche:focus-visible, .vitrine .cta:focus-visible { outline: 3px solid var(--acc); outline-offset: 3px }
    .vitrine .cta { display: inline-flex; align-items: center; gap: 10px; padding: 14px 26px; border-radius: 99px; background: #17201b; color: #fff;
      font-weight: 700; font-size: 15px; text-decoration: none; transition: transform .2s }
    .vitrine .cta:hover { transform: translateY(-2px) }
    .vitrine .points button { all: unset; cursor: pointer; width: 9px; height: 9px; border-radius: 99px; background: rgba(23,32,27,.22); transition: all .3s }
    .vitrine .points button[aria-current="true"] { width: 28px; background: var(--acc) }
    @media (max-width: 900px) {
      .vitrine .grille { grid-template-columns: 1fr; padding-top: 104px; gap: 0; align-content: start }
      .vitrine .plateau { height: 50vh }
      .vitrine .badge { width: 84px; height: 84px }
      .vitrine h2 { font-size: 34px !important }
    }
    @media (prefers-reduced-motion: reduce) {
      .vitrine .eclat, .vitrine .badge svg { animation: none }
    }
  `
  const eclats = [[14, 18, -20, 0], [80, 10, 28, 1.2], [88, 52, -12, 2.1], [10, 60, 34, 3], [62, 4, 8, 4.2], [30, 82, -30, .6]]

  return (
    <section className="vitrine" aria-roledescription="carrousel" aria-label={surtitre || 'Présentation'}
      onMouseEnter={() => { pause.current = true }} onMouseLeave={() => { pause.current = false }}
      onFocus={() => { pause.current = true }} onBlur={() => { pause.current = false }}>
      <style>{css}</style>
      <div className="grille">
        {/* ── LE TEXTE (gauche) */}
        <div style={{ position: 'relative', zIndex: 7 }}>
          {surtitre && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--acc)' }}>
              <span aria-hidden style={{ width: 36, height: 2, background: 'var(--acc)' }} /> {surtitre}
            </div>
          )}
          <div aria-hidden style={{ marginTop: 22, width: 46, height: 46, borderRadius: 99, border: '1.5px solid rgba(23,32,27,.3)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15 }}>
            {etape + 1}
          </div>
          {titrePage && <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{titrePage}</h1>}
          <h2 key={`t${etape}`} style={{ fontSize: 'clamp(40px, 4.6vw, 70px)', lineHeight: .98, fontWeight: 900, letterSpacing: '-0.03em', textTransform: 'uppercase', margin: '18px 0 18px', textWrap: 'balance' }}>
            {vivant ? <TexteQuiSEcrit texte={e.titre} msParLettre={34} /> : e.titre}
          </h2>
          {e.texte && <p style={{ fontSize: 17, lineHeight: 1.65, color: '#45524b', margin: 0, maxWidth: 420 }}>{e.texte}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 30 }}>
            {bouton && lienBouton && <a className="cta" href={lienBouton}>{bouton} <span aria-hidden>→</span></a>}
            <button type="button" className="fleche" aria-label="Étape suivante" onClick={() => aller(etape + 1)}>→</button>
          </div>
        </div>

        {/* ── LA SCÈNE (droite) */}
        <div className="plateau" aria-hidden>
          <div className="forme" />
          <div className="geant" style={{ fontSize: `min(150px, calc(100cqw / ${Math.max(4, mot.length) * 0.7}))` }}>{mot}</div>
          <div style={{ position: 'absolute', left: '50%', bottom: '8%', width: '60%', height: 34, transform: 'translateX(-50%)', borderRadius: '50%', zIndex: 1, background: 'radial-gradient(closest-side, rgba(23,32,27,.25), transparent)' }} />
          {pieces.map((x, i) => sure(x.image) && (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={i} className="piece" style={style(i)}><img src={sure(x.image)} alt="" loading="eager" /></div>
          ))}
          {eclats.map(([x, y, r, d], k) => (
            <span key={k} className="eclat" style={{ left: `${x}%`, top: `${y}%`, rotate: `${r}deg`, animationDelay: `-${d}s` }} />
          ))}
        </div>

        {badge && (
          <div className="badge" aria-hidden>
            <svg viewBox="0 0 120 120">
              <defs><path id="vitrineCercle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
              <circle cx="60" cy="60" r="58" fill="rgba(255,255,255,.65)" />
              <text fontSize="10.5" fontWeight="700" letterSpacing="2.4" fill="#17201b"><textPath href="#vitrineCercle">{badge}</textPath></text>
              <circle cx="60" cy="60" r="18" fill={accent} />
              <path d="M55 52 L67 60 L55 68 Z" fill="#fff" />
            </svg>
          </div>
        )}
      </div>

      {/* ── LES COMMANDES : flèches et points */}
      {vivant && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 22, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, zIndex: 8 }}>
          <button type="button" className="fleche" aria-label="Étape précédente" onClick={() => aller(etape - 1)}>←</button>
          <div className="points" style={{ display: 'flex', gap: 8 }}>
            {pieces.map((x, i) => (
              <button key={i} type="button" aria-label={`Étape ${i + 1} : ${x.libelle || x.titre}`} aria-current={i === etape} onClick={() => aller(i)} />
            ))}
          </div>
          <button type="button" className="fleche" aria-label="Étape suivante" onClick={() => aller(etape + 1)}>→</button>
        </div>
      )}
    </section>
  )
}
