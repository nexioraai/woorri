'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import type { Message } from '@/lib/commandes/messages'

// ============================================================================
// LE FIL DE MESSAGES (CPA, 2026-11-19) — le même écran pour le client et pour
// la Division DDM : bulles, jour par jour, envoi par Entrée (Maj+Entrée pour
// aller à la ligne), relecture toutes les 15 s tant que la page est ouverte.
// L'écran ne décide rien : il affiche ce que la route rend et relit après
// chaque envoi. `moi` dit de quel côté on est, pour placer les bulles.
// ============================================================================

export type MotsFil = { vide: string; placeholder: string; envoyer: string; ferme: string; moi: string; eux: string; lu: string }

export default function FilMessages({
  charger, envoyer, moi, accent, mots, cle, hauteur = 520,
}: {
  charger: () => Promise<{ messages: Message[]; ouvert: boolean } | null>
  envoyer: (texte: string) => Promise<string | null>
  moi: 'client' | 'centrale'
  accent: string
  mots: MotsFil
  /** Change quand le fil affiché change (autre client) : on recharge. */
  cle?: string
  hauteur?: number
}) {
  const [liste, setListe] = useState<Message[] | null>(null)
  const [ferme, setFerme] = useState(false)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const bas = useRef<HTMLDivElement>(null)
  const nb = useRef(0)

  const relire = useCallback(async () => {
    const r = await charger()
    if (!r) return
    if (!r.ouvert) { setFerme(true); return }
    setListe(r.messages)
  }, [charger])

  useEffect(() => {
    let vivant = true
    const tour = async () => { if (vivant) await relire() }
    void tour()
    const id = setInterval(() => { if (document.visibilityState === 'visible') void tour() }, 15000)
    return () => { vivant = false; clearInterval(id) }
  }, [relire, cle])

  // Descendre au dernier message quand il en arrive un.
  useEffect(() => {
    if (liste && liste.length !== nb.current) { nb.current = liste.length; bas.current?.scrollIntoView({ block: 'end' }) }
  }, [liste])

  async function partir() {
    const t = texte.trim()
    if (!t || envoi) return
    setEnvoi(true); setErreur(null)
    const e = await envoyer(t)
    setEnvoi(false)
    if (e) { setErreur(e); return }
    setTexte(''); await relire()
  }

  if (ferme) return <p style={{ color: '#6b7280' }}>{mots.ferme}</p>
  const jour = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) } catch { return iso.slice(0, 10) } }
  const heure = (iso: string) => { try { return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

  return (
    <div className="fil" style={{ display: 'flex', flexDirection: 'column', height: hauteur, border: '1px solid #e8eaee', borderRadius: 20, background: '#fff', overflow: 'hidden' }}>
      <style>{`
        .fil .bulles { flex: 1; overflow-y: auto; padding: 18px 18px 8px; background: linear-gradient(180deg, #f8f9fb, #ffffff) }
        .fil .jour { text-align: center; margin: 12px 0; font-size: 12px; color: #6b7280; text-transform: capitalize }
        .fil .ligne { display: flex; margin: 6px 0; animation: filArrive .35s cubic-bezier(.22,.8,.3,1) both }
        .fil .ligne.moi { justify-content: flex-end }
        .fil .bulle { max-width: min(78%, 560px); padding: 10px 14px; border-radius: 18px; font-size: 15px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere;
          box-shadow: 0 6px 16px -14px rgba(0,0,0,.4) }
        .fil .moi .bulle { background: ${accent}; color: #fff; border-bottom-right-radius: 6px }
        .fil .eux .bulle { background: #f1f3f6; color: #111827; border-bottom-left-radius: 6px }
        .fil .meta { display: block; margin-top: 4px; font-size: 11.5px; opacity: .7 }
        .fil .saisie { display: flex; gap: 10px; padding: 12px; border-top: 1px solid #eef0f3; background: #fff }
        .fil textarea { flex: 1; resize: none; min-height: 46px; max-height: 140px; padding: 12px 14px; border-radius: 14px; border: 1px solid #d4d4d8; font: inherit; font-size: 15px }
        .fil textarea:focus { outline: 2px solid color-mix(in srgb, ${accent} 40%, transparent); border-color: ${accent} }
        .fil .partir { width: 48px; height: 48px; border-radius: 14px; border: none; background: ${accent}; color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
          transition: transform .2s cubic-bezier(.34,1.56,.64,1), opacity .2s ease }
        .fil .partir:hover:not(:disabled) { transform: scale(1.08) rotate(-8deg) }
        .fil .partir:disabled { opacity: .5; cursor: default }
        @keyframes filArrive { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .fil .ligne { animation: none } .fil .partir { transition: none } }
      `}</style>
      <div className="bulles" aria-live="polite">
        {!liste && <p style={{ color: '#9ca3af', textAlign: 'center' }}>…</p>}
        {liste && liste.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>{mots.vide}</p>}
        {(liste ?? []).map((m, i) => {
          const deMoi = m.de === moi
          const nouveauJour = i === 0 || liste![i - 1].cree_le.slice(0, 10) !== m.cree_le.slice(0, 10)
          return (
            <div key={m.id}>
              {nouveauJour && <p className="jour">{jour(m.cree_le)}</p>}
              <div className={`ligne ${deMoi ? 'moi' : 'eux'}`}>
                <div className="bulle">
                  {m.texte}
                  <span className="meta">{deMoi ? mots.moi : mots.eux} · {heure(m.cree_le)}{deMoi && m.lu_le ? ` · ${mots.lu}` : ''}</span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bas} />
      </div>
      {erreur && <p role="alert" style={{ margin: 0, padding: '6px 14px', color: '#9b1c1c', fontSize: 13.5 }}>{erreur}</p>}
      <form className="saisie" onSubmit={(e) => { e.preventDefault(); void partir() }}>
        <textarea value={texte} maxLength={4000} placeholder={mots.placeholder} aria-label={mots.placeholder}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void partir() } }} />
        <button type="submit" className="partir" disabled={envoi || !texte.trim()} aria-label={mots.envoyer}><SendHorizontal size={20} aria-hidden /></button>
      </form>
    </div>
  )
}
