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

// LECTURE « auto » (accueil CPA, 2026-11-11) : un seul écran, la photo change
// d'elle-même toutes les AUTO_MS, en fondu, en boucle ; la ligne d'étapes reste
// cliquable ; aucun changement automatique si le visiteur a demandé moins de
// mouvement. Sans JavaScript : la première étape, fixe.
const AUTO_MS = 4000   // demande CPA : une photo toutes les 4 secondes, en boucle (2 s auparavant)

export default function ParcoursDefilement({
  etapes, surtitre, accent, lecture = 'defilement',
}: { etapes: EtapeParcours[]; surtitre?: string; accent: string; lecture?: 'defilement' | 'auto' }) {
  const auto = lecture === 'auto'
  const [rendu, setRendu] = useState<'empile' | 'defile'>(auto ? 'defile' : 'empile')
  const [tic, setTic] = useState(0)          // relance le minuteur après un clic
  const [actif, setActif] = useState(0)
  // OÙ EST L'IMAGE : avant la section, épinglée à l'écran, ou après.
  // Pas de `position: sticky` : le <body> du site a `overflow-x: hidden`, ce
  // qui en fait le conteneur de défilement de toute la page — or c'est la
  // FENÊTRE qui défile. Un sticky collé à un <body> qui ne défile pas ne colle
  // jamais (mesuré dans WebKit et Chromium le 2026-11-11). On épingle donc
  // nous-mêmes, à partir de la position déjà suivie.
  const [epingle, setEpingle] = useState<'avant' | 'fixe' | 'apres'>('avant')
  const zone = useRef<HTMLElement>(null)

  useEffect(() => {
    if (auto) return
    const t = setTimeout(() => setRendu('defile'), 0)
    return () => clearTimeout(t)
  }, [auto])

  // LECTURE AUTOMATIQUE : une étape toutes les AUTO_MS, sauf en pause.
  useEffect(() => {
    if (!auto || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    // PAS de pause au survol : le hero remplit l'écran, la souris y est presque
    // toujours — la lecture paraissait bloquée. Pas de pause au focus non plus :
    // après un clic sur une étape, le bouton garde le focus et figeait tout.
    const h = setInterval(() => setActif((a) => (a + 1) % etapes.length), AUTO_MS)
    return () => clearInterval(h)
  }, [auto, etapes.length, tic])

  useEffect(() => {
    if (auto || rendu !== 'defile') return
    const calculer = () => {
      const z = zone.current
      if (!z) return
      const r = z.getBoundingClientRect()
      const course = r.height - window.innerHeight
      const p = course > 0 ? Math.min(0.9999, Math.max(0, -r.top / course)) : 0
      setActif(Math.floor(p * etapes.length))
      setEpingle(r.top > 0 ? 'avant' : r.bottom < window.innerHeight ? 'apres' : 'fixe')
    }
    // Premier calcul au prochain rafraîchissement, pas dans le corps de l'effet.
    const premier = requestAnimationFrame(calculer)
    window.addEventListener('scroll', calculer, { passive: true })
    window.addEventListener('resize', calculer)
    return () => { cancelAnimationFrame(premier); window.removeEventListener('scroll', calculer); window.removeEventListener('resize', calculer) }
  }, [auto, rendu, etapes.length])

  const allerA = (i: number) => {
    if (auto) { setActif(i); setTic((t) => t + 1); return }
    const z = zone.current
    if (!z) return
    const course = z.offsetHeight - window.innerHeight
    const haut = z.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: haut + (course * (i + 0.5)) / etapes.length, behavior: 'smooth' })
  }

  const css = `
    .parcours { --acc: ${accent}; position: relative; width: 100vw; margin-left: calc(50% - 50vw); color: #fff; background: #0c1410 }
    /* Une animation d'apparition pose un transform sur les blocs ; un parent
       transformé ferait de l'image épinglée une image ABSOLUE dans la section. */
    .parcours.defile { transform: none !important; animation: none !important }
    .parcours .scene { position: absolute; inset: 0; opacity: 0; transition: opacity ${auto ? '.55s' : '.9s'} ease }
    .parcours .scene.on { opacity: 1 }
    .parcours .scene img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.1); transition: transform ${auto ? '2.4s' : '7s'} cubic-bezier(.2,.6,.2,1) }
    .parcours .scene.on img { transform: scale(1) }
    .parcours .voile { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(5,12,8,.78) 0%, rgba(5,12,8,.45) 38%, rgba(5,12,8,0) 68%) }
    .parcours .voileBas { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(5,12,8,.65), rgba(5,12,8,0) 45%) }
    .parcours .texte { transition: opacity ${auto ? '.35s' : '.6s'} ease, transform ${auto ? '.35s' : '.6s'} ease }
    /* Un fond sombre translucide : la ligne restait illisible sur un ciel clair. */
    .parcours .rail { background: rgba(5,12,8,.38); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); padding: 14px 18px; border-radius: 16px }
    .parcours .rail button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 6px 0; color: rgba(255,255,255,.62); font-size: 14px; font-weight: 600 }
    .parcours .rail button:focus-visible { outline: 2px solid #fff; outline-offset: 4px; border-radius: 4px }
    .parcours .rail button[aria-current="step"] { color: #fff }
    .parcours .rail .pt { width: 10px; height: 10px; border-radius: 99px; border: 2px solid currentColor; transition: all .3s ease }
    .parcours .rail button[aria-current="step"] .pt { background: var(--acc); border-color: #fff; width: 26px }
    .parcours .segments button { all: unset; cursor: pointer; padding: 10px 0; width: 34px }
    .parcours .segments button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; border-radius: 4px }
    .parcours .segments .piste { display: block; height: 2px; border-radius: 99px; background: rgba(255,255,255,.28); overflow: hidden }
    .parcours .segments .plein { display: block; height: 100%; background: #fff; border-radius: 99px; transform-origin: left center }
    .parcours .segments .plein.court { animation: parcours-remplir ${AUTO_MS}ms linear forwards }
    @keyframes parcours-remplir { from { transform: scaleX(0) } to { transform: scaleX(1) } }
    /* TÉLÉPHONE, LECTURE AUTO (CPA, 2026-11-11 : « ça n'a aucun sens »). Les
       photos sont en 3:2 ; recadrées en plein écran portrait, il n'en restait
       qu'un quart — un mur, une épaule. Ici : la photo ENTIÈRE en haut, le
       texte dessous sur le bleu du site. L'ordinateur ne change pas. */
    /* Aussi la tablette en PORTRAIT : en 768×1024, le recadrage gardait la
       moitié de la photo. La barre du haut est fixe (80 px + liseré) : la
       bande commence sous elle, sinon elle mange le haut de la photo. */
    @media (max-width: 760px), (orientation: portrait) and (max-width: 1100px) {
      .parcours.auto { height: auto !important; padding-top: 81px; background: color-mix(in srgb, var(--acc) 88%, #000) }
      .parcours.auto .rail { display: none !important }
      .parcours.auto .corps { height: auto !important }
      .parcours.auto .cadre { position: relative !important; inset: auto !important; aspect-ratio: 3 / 2; width: 100% }
      .parcours.auto .scene img { transform: none }
      .parcours.auto .voile, .parcours.auto .voileBas { display: none }
      .parcours.auto .bloc { height: auto !important; justify-content: flex-start !important; padding-top: 26px !important; padding-bottom: 64px !important; min-height: 330px }
    }
    @media (max-width: 760px) {
      .parcours .rail { display: none !important }
      .parcours .voile { background: linear-gradient(0deg, rgba(5,12,8,.88) 0%, rgba(5,12,8,.5) 45%, rgba(5,12,8,.1) 75%) }
      .parcours .bloc { justify-content: flex-end !important; padding-bottom: 72px !important }
    }
    @media (prefers-reduced-motion: reduce) {
      .parcours .scene, .parcours .scene img, .parcours .texte { transition: none }
      .parcours .scene img, .parcours .scene.on img { transform: none }
      .parcours .segments .plein.court { animation: none; transform: scaleX(1) !important }
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
    <section ref={zone} className={`parcours defile${auto ? ' auto' : ''}`} aria-label={surtitre || 'Parcours'}
      aria-roledescription={auto ? 'carrousel' : undefined}
      style={{ height: auto ? 'max(100vh, 620px)' : `${etapes.length * 100}vh` }}>
      <style>{css}</style>
      <div className="corps" style={{
        height: auto ? '100%' : '100vh', overflow: 'hidden', left: 0, width: '100%',
        ...(auto ? { position: 'relative' } : epingle === 'fixe' ? { position: 'fixed', top: 0 } : epingle === 'apres' ? { position: 'absolute', bottom: 0 } : { position: 'absolute', top: 0 }),
      }}>
        {/* LE CADRE DES PHOTOS. Sur ordinateur il couvre tout le hero ; sur
            téléphone (lecture auto) il devient une bande au format des photos
            (3:2), posée AU-DESSUS du texte : la photo se voit en entier. */}
        <div className="cadre" style={{ position: 'absolute', inset: 0 }}>
          {etapes.map((x, i) => imageSure(x.image) && (
            <div key={i} className={`scene${i === actif ? ' on' : ''}`} aria-hidden={i !== actif}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSure(x.image)} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
          <div className="voile" />
          <div className="voileBas" />
        </div>

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

        {/* LES SEGMENTS (façon « stories », demande CPA 2026-11-11 : la ligne
            pleine largeur qui se remplissait par paliers est retirée). Un
            segment par photo : celle à l'écran se remplit pendant ses AUTO_MS,
            les précédentes sont pleines. Cliquables : seul moyen d'aller à une
            étape sur téléphone, où le rail est masqué. */}
        <div className="segments" style={{ position: 'absolute', left: 0, right: 0, bottom: 22, maxWidth: 1180, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 6 }}>
          {etapes.map((x, i) => (
            <button key={i} type="button" onClick={() => allerA(i)} aria-label={`Étape ${i + 1} : ${x.libelle || x.titre}`}>
              <span className="piste">
                <span key={i === actif ? `${actif}-${tic}` : i}
                  className={`plein${i === actif && auto ? ' court' : ''}`}
                  style={{ transform: i < actif || (i === actif && !auto) ? 'scaleX(1)' : 'scaleX(0)' }} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
