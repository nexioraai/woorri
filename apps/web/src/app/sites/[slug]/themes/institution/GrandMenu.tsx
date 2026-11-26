'use client'
// LE GRAND MENU D'UN SITE INSTITUTIONNEL (lot 4b, 2026-11-26).
// Ordinateur : chaque rubrique ouvre un PANNEAU pleine largeur, à sa couleur,
// avec ses sous-pages en grand et sa photo. Téléphone : un bouton ☰ ouvre le
// menu en plein écran (jamais un menu sur deux lignes). Échap ferme ; le
// mouvement respecte `prefers-reduced-motion`.
import { useEffect, useState } from 'react'
import type { RubriqueInstitution } from './types'

export default function GrandMenu({ rubriques, base, contact, couleur }: {
  rubriques: RubriqueInstitution[]
  base: string
  contact: string
  couleur: string
}) {
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOuverte(null); setMobile(false) } }
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [])
  useEffect(() => { document.body.style.overflow = mobile ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [mobile])
  const r = rubriques.find((x) => x.chemin === ouverte) ?? null
  const lien = (chemin: string) => `${base}/${chemin}`

  return (
    <>
      <nav aria-label="Menu principal" className="hidden lg:flex items-stretch gap-1 h-full" onMouseLeave={() => setOuverte(null)} data-grand-menu="">
        {rubriques.map((x) => (
          <div key={x.chemin} className="flex items-stretch" onMouseEnter={() => setOuverte(x.enfants.length > 0 ? x.chemin : null)}>
            {x.enfants.length > 0 ? (
              <button type="button" aria-expanded={ouverte === x.chemin} aria-controls={`panneau-${x.chemin}`}
                onClick={() => setOuverte(ouverte === x.chemin ? null : x.chemin)} onFocus={() => setOuverte(x.chemin)}
                className="px-4 text-[15px] font-bold tracking-tight transition-colors"
                style={{ boxShadow: ouverte === x.chemin ? `inset 0 -4px 0 ${x.couleur}` : 'none' }}>
                {x.titre}<span aria-hidden="true" className="ml-1.5 text-xs opacity-60">▾</span>
              </button>
            ) : (
              <a href={lien(x.chemin)} className="flex items-center px-4 text-[15px] font-bold tracking-tight">{x.titre}</a>
            )}
          </div>
        ))}
        <a href={contact} className="ml-2 my-3 flex items-center rounded-full px-5 text-[15px] font-bold text-white" style={{ backgroundColor: couleur }}>Contact</a>
        {r && (
          <div id={`panneau-${r.chemin}`} role="region" aria-label={r.titre} data-panneau=""
            className="absolute left-0 right-0 top-full shadow-2xl motion-safe:animate-[panneau_.18s_ease-out]"
            style={{ backgroundColor: r.couleur, color: '#fff' }}>
            <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-[1.2fr_1fr] gap-12 items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-75">{r.titre}</p>
                {r.chapeau && <p className="mt-3 text-lg leading-relaxed opacity-90 max-w-xl">{r.chapeau}</p>}
                <ul className="mt-8 space-y-3" style={{ listStyle: 'none', padding: 0 }}>
                  <li><a href={lien(r.chemin)} className="text-3xl font-black tracking-tight hover:underline underline-offset-8">{r.titre} →</a></li>
                  {r.enfants.map((e) => (
                    <li key={e.chemin}><a href={lien(e.chemin)} className="text-3xl font-black tracking-tight hover:underline underline-offset-8">{e.titre}</a></li>
                  ))}
                </ul>
              </div>
              {r.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" className="w-full aspect-[4/3] object-cover rounded-2xl" />
              )}
            </div>
          </div>
        )}
      </nav>

      <button type="button" className="lg:hidden ml-auto flex items-center justify-center w-12 h-12 rounded-full text-white text-2xl"
        style={{ backgroundColor: couleur }} aria-label={mobile ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={mobile}
        onClick={() => setMobile(!mobile)} data-bouton-menu="">
        <span aria-hidden="true">{mobile ? '✕' : '☰'}</span>
      </button>
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-[80] overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-label="Menu" data-menu-mobile="">
          <div className="flex justify-end p-4">
            <button type="button" onClick={() => setMobile(false)} className="w-12 h-12 rounded-full text-white text-2xl" style={{ backgroundColor: couleur }} aria-label="Fermer le menu">✕</button>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: '0 20px 40px' }}>
            {rubriques.map((x) => (
              <li key={x.chemin} className="mb-4 rounded-2xl p-5 text-white" style={{ backgroundColor: x.couleur }}>
                <a href={lien(x.chemin)} className="block text-2xl font-black tracking-tight">{x.titre}</a>
                {x.enfants.length > 0 && (
                  <ul className="mt-3 space-y-2" style={{ listStyle: 'none', padding: 0 }}>
                    {x.enfants.map((e) => <li key={e.chemin}><a href={lien(e.chemin)} className="block text-lg font-semibold opacity-95">{e.titre}</a></li>)}
                  </ul>
                )}
              </li>
            ))}
            <li><a href={contact} className="block rounded-2xl p-5 text-2xl font-black text-white" style={{ backgroundColor: '#111' }}>Contact</a></li>
          </ul>
        </div>
      )}
    </>
  )
}
