'use client'

import { useEffect, useRef, useState } from 'react'
import TexteQuiSEcrit from '../themes/TexteQuiSEcrit'

// ============================================================================
// L'ASSEMBLAGE AU DÉFILEMENT (demande CPA, 2026-11-11) — le bloc « etapes »
// quand il porte `affichage: 'assemblage'`. Le modèle : les sites « produit »
// premium où le bagel se construit couche par couche, sur un fond uni, avec
// de grandes lettres derrière l'objet.
//
// LES IMAGES SONT DES PIÈCES DÉTOURÉES (fond transparent), une par étape, et
// suivent une convention fixe :
//   · la 1re est le CONTENANT ouvert (il se pose) ;
//   · celles du milieu TOMBENT dedans, puis y disparaissent ;
//   · l'avant-dernière est le contenant FERMÉ (il remplace l'ouvert) ;
//   · la dernière est le VÉHICULE qui l'emporte.
// À la CPA : carton ouvert → boîtes → plaquette → vaccin et froid → carton
// scellé → camion.
//
// La progression est CONTINUE : chaque pièce avance avec le défilement, elle
// ne saute pas d'un état à l'autre. L'image est épinglée par le composant
// (pas de `position: sticky` : le <body> du site, en overflow-x: hidden, le
// rend inopérant — voir ParcoursDefilement).
//
// SANS JAVASCRIPT ou avec `prefers-reduced-motion` : une composition fixe (le
// carton scellé et le camion), un écran de haut, rien de caché.
// ============================================================================

export type PieceAssemblage = { titre: string; texte?: string; image?: string; libelle?: string }

const sure = (u?: string) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u : undefined)
const borne = (x: number) => Math.min(1, Math.max(0, x))
// Arrivée avec un léger rebond, comme un objet qu'on pose.
const rebond = (t: number) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
const doux = (t: number) => t * t * (3 - 2 * t)

export default function AssemblageDefilement({
  pieces, surtitre, accent,
}: { pieces: PieceAssemblage[]; surtitre?: string; accent: string }) {
  const n = pieces.length
  const [rendu, setRendu] = useState<'statique' | 'defile'>('statique')
  const [p, setP] = useState(0)                     // progression 0 → 1
  const [epingle, setEpingle] = useState<'avant' | 'fixe' | 'apres'>('avant')
  const zone = useRef<HTMLElement>(null)

  useEffect(() => {
    const sansMouvement = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => { if (!sansMouvement && n >= 4) setRendu('defile') }, 0)
    return () => clearTimeout(t)
  }, [n])

  useEffect(() => {
    if (rendu !== 'defile') return
    const calculer = () => {
      const z = zone.current
      if (!z) return
      const r = z.getBoundingClientRect()
      const course = r.height - window.innerHeight
      setP(course > 0 ? borne(-r.top / course) : 0)
      setEpingle(r.top > 0 ? 'avant' : r.bottom < window.innerHeight ? 'apres' : 'fixe')
    }
    const premier = requestAnimationFrame(calculer)
    window.addEventListener('scroll', calculer, { passive: true })
    window.addEventListener('resize', calculer)
    return () => { cancelAnimationFrame(premier); window.removeEventListener('scroll', calculer); window.removeEventListener('resize', calculer) }
  }, [rendu])

  const css = `
    .assemblage { --acc: ${accent}; position: relative; width: 100vw; margin-left: calc(50% - 50vw); color: #14211a;
      background: radial-gradient(120% 90% at 70% 40%, #fbf8f2 0%, #f3ede2 55%, #ebe3d4 100%) }
    .assemblage.defile { transform: none !important; animation: none !important }
    .assemblage .scene { position: relative; height: 100%; max-width: 1280px; margin: 0 auto; padding: 0 24px;
      display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); align-items: center; gap: 24px }
    .assemblage .plateau { position: relative; height: min(78vh, 720px); container-type: inline-size; overflow-x: clip }
    .assemblage .piece { position: absolute; left: 50%; will-change: transform, opacity; pointer-events: none }
    .assemblage .piece img { display: block; width: 100%; height: auto; filter: drop-shadow(0 28px 30px rgba(20,33,26,.22)) }
    .assemblage .geant { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; overflow: hidden }
    .assemblage .geant span { font-weight: 900; line-height: .9; letter-spacing: -0.03em; white-space: nowrap;
      color: var(--acc); opacity: .14; text-transform: uppercase; text-align: center; transition: opacity .4s ease }
    .assemblage .rail { display: flex; gap: 8px; margin-top: 30px }
    .assemblage .rail i { height: 4px; flex: 1; max-width: 46px; border-radius: 9px; background: rgba(20,33,26,.14); overflow: hidden }
    .assemblage .rail i b { display: block; height: 100%; background: var(--acc) }
    @media (max-width: 860px) {
      .assemblage .scene { grid-template-columns: 1fr; grid-template-rows: auto 1fr; align-content: start; padding-top: 84px; gap: 0 }
      .assemblage .plateau { height: 56vh }
      .assemblage .texteEtape h2 { font-size: 30px !important }
    }
  `

  // ── POSITION DE CHAQUE PIÈCE à la progression p. `seg` : quelle étape on
  //    traverse (0 … n), `t(i)` : où en est l'entrée de la pièce i.
  // Composition fixe : le camion arrivé, le carton scellé encore visible.
  const seg = rendu === 'defile' ? p * n : n - 0.35
  const t = (i: number) => borne(seg - i)
  const iFerme = n - 2
  const iVehicule = n - 1
  const actif = Math.min(n - 1, Math.floor(seg))

  const style = (i: number): React.CSSProperties => {
    const ti = t(i)
    // Le contenant ouvert : il se pose, puis s'efface quand le fermé arrive.
    if (i === 0) {
      const disparition = doux(t(iFerme))
      return { width: '62%', bottom: '10%', opacity: (ti > 0 ? 1 : 0) * (1 - disparition),
        transform: `translateX(-50%) translateY(${(1 - rebond(ti)) * -120}%)` }
    }
    // Le contenant fermé : il apparaît à la place de l'ouvert, puis rapetisse
    // et file vers le camion.
    if (i === iFerme) {
      const depart = doux(t(iVehicule))
      return { width: '62%', bottom: '10%', opacity: doux(ti) * (1 - borne((depart - 0.75) * 4)),
        transform: `translateX(calc(-50% + ${depart * 18}%)) translateY(${depart * 22}%) scale(${(0.92 + 0.08 * rebond(ti)) * (1 - 0.72 * depart)})` }
    }
    // Le véhicule : il entre par la gauche et s'arrête au centre.
    if (i === iVehicule) {
      // Il entre depuis le bord du plateau, en fondu : il ne passe plus sur le titre.
      return { width: '96%', bottom: '4%', opacity: doux(borne(ti * 1.6)),
        transform: `translateX(calc(-50% - ${(1 - doux(ti)) * 55}%))` }
    }
    // Les pièces du milieu : elles tombent dans le contenant, puis y entrent.
    const entree = rebond(ti)
    const rangement = doux(t(i + 1))
    const largeur = i === 2 ? '40%' : '36%'
    return { width: largeur, bottom: '46%', opacity: (ti > 0 ? 1 : 0) * (1 - rangement),
      transform: `translateX(-50%) translateY(${(1 - entree) * -160 + rangement * 70}%) rotate(${(1 - entree) * (i % 2 ? -24 : 20)}deg) scale(${1 - 0.55 * rangement})` }
  }

  const e = pieces[actif]
  const contenu = (
    <div className="scene">
      <div className="texteEtape" style={{ position: 'relative', zIndex: 2 }}>
        {surtitre && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--acc)' }}>
            <span aria-hidden style={{ width: 36, height: 2, background: 'var(--acc)' }} /> {surtitre}
          </div>
        )}
        <div style={{ marginTop: 18, fontSize: 15, fontWeight: 800, color: 'var(--acc)' }}>{String(actif + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</div>
        <h2 key={`t${actif}`} style={{ fontSize: 'clamp(36px, 4.6vw, 64px)', lineHeight: 1.02, fontWeight: 900, letterSpacing: '-0.025em', margin: '10px 0 16px', textWrap: 'balance' }}>
          {rendu === 'defile' ? <TexteQuiSEcrit texte={e.titre} msParLettre={30} /> : e.titre}
        </h2>
        {e.texte && <p style={{ fontSize: 'clamp(16px, 1.4vw, 19px)', lineHeight: 1.65, color: '#3c4a42', margin: 0, maxWidth: 440 }}>{e.texte}</p>}
        {rendu === 'defile' && (
          <div className="rail" aria-hidden>
            {pieces.map((_, i) => <i key={i}><b style={{ width: `${t(i) * 100}%` }} /></i>)}
          </div>
        )}
      </div>
      <div className="plateau" aria-hidden>
        {/* La taille suit la LONGUEUR du mot et la largeur du plateau : le mot
            tient toujours en entier (il était coupé sur « Acheter »). */}
        <div className="geant"><span style={{ fontSize: `min(170px, calc(100cqw / ${Math.max(4, (e.libelle || e.titre).length) * 0.66}))` }}>{e.libelle || e.titre}</span></div>
        {/* l'ombre au sol */}
        <div style={{ position: 'absolute', left: '50%', bottom: '6%', width: '58%', height: 30, transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(20,33,26,.22), transparent)' }} />
        {pieces.map((x, i) => sure(x.image) && (
          // eslint-disable-next-line @next/next/no-img-element
          <div key={i} className="piece" style={style(i)}><img src={sure(x.image)} alt="" loading="eager" /></div>
        ))}
      </div>
    </div>
  )

  if (rendu === 'statique') {
    return (
      <section className="assemblage" aria-label={surtitre || 'Assemblage'} style={{ height: '100vh', minHeight: 620, overflow: 'hidden' }}>
        <style>{css}</style>
        {contenu}
      </section>
    )
  }

  return (
    <section ref={zone} className="assemblage defile" aria-label={surtitre || 'Assemblage'} style={{ height: `${n * 90}vh` }}>
      <style>{css}</style>
      <div style={{
        height: '100vh', overflow: 'hidden', left: 0, width: '100%',
        ...(epingle === 'fixe' ? { position: 'fixed', top: 0 } : epingle === 'apres' ? { position: 'absolute', bottom: 0 } : { position: 'absolute', top: 0 }),
      }}>
        {contenu}
        <div aria-hidden style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${p * 100}%`, background: accent }} />
      </div>
    </section>
  )
}
