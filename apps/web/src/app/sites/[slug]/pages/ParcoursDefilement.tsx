'use client'

import { useEffect, useRef, useState } from 'react'

// ============================================================================
// LE PARCOURS AU DÉFILEMENT (demande CPA, 2026-11-11) — le bloc « etapes »
// quand il porte `affichage: 'parcours'` et une image par étape.
//
// L'image reste FIXE à l'écran pendant qu'on fait défiler ; chaque étape
// remplace la précédente en fondu, avec un lent recul de caméra. À gauche,
// le numéro, le titre et le texte de l'étape ; à droite, la ligne de
// progression. C'est la mise en scène des sites « produit » premium, appliquée
// au métier réel de la CPA : achat → chargement → acheminement → déchargement
// → distribution.
//
// SANS JAVASCRIPT : les étapes s'affichent l'une sous l'autre, chacune avec
// son image — rien n'est caché. Le rendu « défilement » n'est activé qu'une
// fois le script en place. `prefers-reduced-motion` : ni zoom ni fondu lent.
// ============================================================================

export type EtapeParcours = { titre: string; texte?: string; image?: string; libelle?: string }

const imageSure = (u?: string) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u : undefined)

export default function ParcoursDefilement({
  etapes, surtitre, accent,
}: { etapes: EtapeParcours[]; surtitre?: string; accent: string }) {
  const [rendu, setRendu] = useState<'empile' | 'defile'>('empile')
  const [actif, setActif] = useState(0)
  const zone = useRef<HTMLElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setRendu('defile'), 0)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (rendu !== 'defile') return
    const calculer = () => {
      const z = zone.current
      if (!z) return
      const r = z.getBoundingClientRect()
      const course = r.height - window.innerHeight
      const p = course > 0 ? Math.min(0.9999, Math.max(0, -r.top / course)) : 0
      setActif(Math.floor(p * etapes.length))
    }
    // Premier calcul au prochain rafraîchissement, pas dans le corps de l'effet.
    const premier = requestAnimationFrame(calculer)
    window.addEventListener('scroll', calculer, { passive: true })
    window.addEventListener('resize', calculer)
    return () => { cancelAnimationFrame(premier); window.removeEventListener('scroll', calculer); window.removeEventListener('resize', calculer) }
  }, [rendu, etapes.length])

  const allerA = (i: number) => {
    const z = zone.current
    if (!z) return
    const course = z.offsetHeight - window.innerHeight
    const haut = z.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: haut + (course * (i + 0.5)) / etapes.length, behavior: 'smooth' })
  }

  const css = `
    .parcours { --acc: ${accent}; position: relative; width: 100vw; margin-left: calc(50% - 50vw); color: #fff; background: #0c1410 }
    .parcours .scene { position: absolute; inset: 0; opacity: 0; transition: opacity .9s ease }
    .parcours .scene.on { opacity: 1 }
    .parcours .scene img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.1); transition: transform 7s cubic-bezier(.2,.6,.2,1) }
    .parcours .scene.on img { transform: scale(1) }
    .parcours .voile { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(5,12,8,.78) 0%, rgba(5,12,8,.45) 38%, rgba(5,12,8,0) 68%) }
    .parcours .voileBas { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(5,12,8,.65), rgba(5,12,8,0) 45%) }
    .parcours .texte { transition: opacity .6s ease, transform .6s ease }
    .parcours .rail button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 6px 0; color: rgba(255,255,255,.62); font-size: 14px; font-weight: 600 }
    .parcours .rail button:focus-visible { outline: 2px solid #fff; outline-offset: 4px; border-radius: 4px }
    .parcours .rail button[aria-current="step"] { color: #fff }
    .parcours .rail .pt { width: 10px; height: 10px; border-radius: 99px; border: 2px solid currentColor; transition: all .3s ease }
    .parcours .rail button[aria-current="step"] .pt { background: var(--acc); border-color: #fff; width: 26px }
    @media (max-width: 760px) {
      .parcours .rail { display: none !important }
      .parcours .voile { background: linear-gradient(0deg, rgba(5,12,8,.88) 0%, rgba(5,12,8,.5) 45%, rgba(5,12,8,.1) 75%) }
      .parcours .bloc { justify-content: flex-end !important; padding-bottom: 72px !important }
    }
    @media (prefers-reduced-motion: reduce) {
      .parcours .scene, .parcours .scene img, .parcours .texte { transition: none }
      .parcours .scene img, .parcours .scene.on img { transform: none }
    }
  `

  // ── SANS SCRIPT (et au premier rendu) : les étapes empilées, rien de caché.
  if (rendu === 'empile') {
    return (
      <section className="parcours" aria-label={surtitre || 'Parcours'}>
        <style>{css}</style>
        {etapes.map((e, i) => (
          <div key={i} style={{ position: 'relative', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
            {imageSure(e.image) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSure(e.image)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <div className="voile" />
            <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '0 24px', width: '100%' }}>
              <div style={{ fontSize: 14, letterSpacing: '.16em', textTransform: 'uppercase', opacity: .8 }}>{String(i + 1).padStart(2, '0')} · {e.libelle || e.titre}</div>
              <h2 style={{ fontSize: 'clamp(34px, 5vw, 64px)', lineHeight: 1.05, margin: '14px 0', maxWidth: 620 }}>{e.titre}</h2>
              {e.texte && <p style={{ fontSize: 19, lineHeight: 1.6, maxWidth: 520, opacity: .9 }}>{e.texte}</p>}
            </div>
          </div>
        ))}
      </section>
    )
  }

  const e = etapes[actif]
  return (
    <section ref={zone} className="parcours" aria-label={surtitre || 'Parcours'} style={{ height: `${etapes.length * 100}vh` }}>
      <style>{css}</style>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        {etapes.map((x, i) => imageSure(x.image) && (
          <div key={i} className={`scene${i === actif ? ' on' : ''}`} aria-hidden={i !== actif}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSure(x.image)} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
        <div className="voile" />
        <div className="voileBas" />

        <div className="bloc" style={{ position: 'relative', height: '100%', maxWidth: 1180, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {surtitre && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .85 }}>
              <span aria-hidden style={{ width: 36, height: 2, background: '#fff' }} /> {surtitre}
            </div>
          )}
          <div key={actif} className="texte" aria-live="polite" style={{ maxWidth: 600, marginTop: 22 }}>
            <div style={{ fontSize: 'clamp(54px, 7vw, 96px)', fontWeight: 800, lineHeight: 1, color: 'transparent', WebkitTextStroke: '1.5px rgba(255,255,255,.75)' }}>
              {String(actif + 1).padStart(2, '0')}
            </div>
            <h2 style={{ fontSize: 'clamp(34px, 5vw, 64px)', lineHeight: 1.04, fontWeight: 800, letterSpacing: '-0.02em', margin: '10px 0 16px', textShadow: '0 2px 28px rgba(0,0,0,.4)' }}>{e.titre}</h2>
            {e.texte && <p style={{ fontSize: 'clamp(16px, 1.5vw, 19px)', lineHeight: 1.65, opacity: .92, margin: 0, maxWidth: 520 }}>{e.texte}</p>}
          </div>
        </div>

        {/* LA LIGNE DE PROGRESSION — aussi un moyen d'aller droit à une étape. */}
        <nav className="rail" aria-label="Étapes du parcours" style={{ position: 'absolute', right: 'max(24px, calc((100vw - 1180px) / 2))', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {etapes.map((x, i) => (
            <button key={i} type="button" onClick={() => allerA(i)} aria-current={i === actif ? 'step' : undefined}>
              <span className="pt" aria-hidden /> {x.libelle || x.titre}
            </button>
          ))}
        </nav>

        <div aria-hidden style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${((actif + 1) / etapes.length) * 100}%`, background: accent, transition: 'width .5s ease' }} />
      </div>
    </section>
  )
}
