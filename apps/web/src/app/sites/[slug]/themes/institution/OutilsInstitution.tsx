'use client'
// LES OUTILS D'UN SITE INSTITUTIONNEL (lot 4c, 2026-11-26) : la RECHERCHE
// interne (bouton, ou la touche « / » n'importe où hors d'un champ) et le
// CONTRASTE ÉLEVÉ (retenu par ce navigateur). La recherche ne parcourt que
// l'index fourni par le serveur : les pages publiées, leur texte réel.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EntreeRecherche } from './types'

const CLE_CONTRASTE = 'deribfy-contraste'

/** Minuscules, sans accents : « Ministère » se trouve en tapant « ministere ». */
export function normaliser(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase()
}

/** Les pages qui contiennent TOUS les mots tapés ; le titre compte double. */
export function chercher(index: readonly EntreeRecherche[], requete: string, max = 8): EntreeRecherche[] {
  const mots = normaliser(requete).split(/\s+/u).filter((m) => m.length > 0)
  if (mots.length === 0) return []
  return index
    .map((e) => {
      const titre = normaliser(e.titre)
      const tout = `${titre} ${normaliser(e.texte)}`
      if (!mots.every((m) => tout.includes(m))) return null
      return { e, score: mots.filter((m) => titre.includes(m)).length * 2 + 1 }
    })
    .filter((x): x is { e: EntreeRecherche; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.e)
}

/** Un extrait autour du premier mot trouvé. */
function extrait(texte: string, requete: string): string {
  const m = normaliser(requete).split(/\s+/u).find((x) => x.length > 0) ?? ''
  const i = Math.max(0, normaliser(texte).indexOf(m))
  const debut = Math.max(0, i - 60)
  return `${debut > 0 ? '…' : ''}${texte.slice(debut, debut + 160)}${texte.length > debut + 160 ? '…' : ''}`
}

export default function OutilsInstitution({ index, base, couleur }: { index: EntreeRecherche[]; base: string; couleur: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [requete, setRequete] = useState('')
  const [contraste, setContraste] = useState(false)
  const champ = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(CLE_CONTRASTE) === '1') setContraste(true)
    } catch { /* stockage indisponible : contraste normal */ }
  }, [])
  useEffect(() => {
    const racine = document.querySelector('[data-theme-institution]')
    if (contraste) racine?.setAttribute('data-contraste', '')
    else racine?.removeAttribute('data-contraste')
  }, [contraste])
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null
      const dansUnChamp = !!cible && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName))
      if (e.key === '/' && !dansUnChamp && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setOuvert(true) }
      if (e.key === 'Escape') setOuvert(false)
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [])
  useEffect(() => { if (ouvert) champ.current?.focus() }, [ouvert])

  const resultats = useMemo(() => chercher(index, requete), [index, requete])
  const basculer = () => {
    const v = !contraste
    setContraste(v)
    try { localStorage.setItem(CLE_CONTRASTE, v ? '1' : '0') } catch { /* rien à retenir */ }
  }

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} aria-label="Rechercher sur le site (touche /)" title="Rechercher (touche /)" data-bouton-recherche=""
        className="flex items-center justify-center w-11 h-11 rounded-full border border-neutral-300 text-neutral-800 hover:bg-neutral-100">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </button>
      <button type="button" onClick={basculer} aria-pressed={contraste} aria-label="Contraste élevé" title="Contraste élevé" data-bouton-contraste=""
        className="flex items-center justify-center w-11 h-11 rounded-full border border-neutral-300 text-neutral-800 hover:bg-neutral-100">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>
      </button>
      {ouvert && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[210] bg-black/60 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Rechercher sur le site"
          onClick={(e) => { if (e.target === e.currentTarget) setOuvert(false) }} data-recherche="">
          <div className="w-full max-w-2xl rounded-3xl bg-white text-neutral-900 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 border-b border-neutral-200">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input ref={champ} value={requete} onChange={(e) => setRequete(e.target.value)} placeholder="Rechercher une page, une mission, un document…"
                aria-label="Rechercher" className="flex-1 py-5 text-lg outline-none bg-transparent" />
              <button type="button" onClick={() => setOuvert(false)} className="text-sm font-bold opacity-60 hover:opacity-100">Échap</button>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="max-h-[55vh] overflow-y-auto">
              {resultats.map((r) => (
                <li key={r.chemin} className="border-b border-neutral-100 last:border-0">
                  <a href={`${base}/${r.chemin}`} className="block px-5 py-4 hover:bg-neutral-50">
                    <span className="block text-lg font-black tracking-tight" style={{ color: couleur }}>{r.titre}</span>
                    {r.texte && <span className="block mt-1 text-sm text-neutral-600">{extrait(r.texte, requete)}</span>}
                  </a>
                </li>
              ))}
            </ul>
            {requete.trim() !== '' && resultats.length === 0 && <p className="px-5 py-6 text-neutral-600">Aucune page ne contient « {requete.trim()} ».</p>}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
