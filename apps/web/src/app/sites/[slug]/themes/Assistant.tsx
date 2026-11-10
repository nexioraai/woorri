'use client'

import { useState } from 'react'

// ============================================================================
// LOT 16 — LA BULLE DE L'ASSISTANT.
//
// ── ELLE PRÉVIENT AVANT LA PREMIÈRE QUESTION.
// La question part chez DeepSeek, un service tiers. Le visiteur le lit AVANT
// d'écrire, pas dans une page qu'il n'ouvrira jamais.
//
// ── ELLE NE GARDE RIEN. L'historique vit dans cette page et disparaît avec
// elle : aucune mémoire entre deux visites.
// ============================================================================

type Lien = { chemin: string; titre: string }
type Tour = { role: 'user' | 'assistant'; content: string; liens?: Lien[] }
const MAX = 10

/**
 * Seules les adresses que le SERVEUR a reconnues deviennent des liens : le
 * serveur ne rend que des pages lues ou les écrans du compte. Une adresse
 * inventée par le modèle reste du texte.
 */
function avecLiens(texte: string, base: string, liens: Lien[]) {
  const connus = new Set(liens.map((l) => l.chemin))
  const morceaux = texte.split(/(\/[a-z0-9#][a-z0-9\-/#]*)/gi)
  return morceaux.map((m, i) =>
    connus.has(m)
      ? <a key={i} href={`${base}${m}`} style={{ color: 'inherit', fontWeight: 600 }}>{m}</a>
      : <span key={i}>{m}</span>)
}

export default function Assistant({ slug, base, primary }: { slug: string; base: string; primary: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [accepte, setAccepte] = useState(false)
  const [tours, setTours] = useState<Tour[]>([])
  const [question, setQuestion] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const posees = tours.filter((t) => t.role === 'user').length

  async function poser(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || envoi || posees >= MAX) return
    setEnvoi(true); setQuestion('')
    const historique = tours
    setTours([...historique, { role: 'user', content: q }])
    try {
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/assistant`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, historique }),
      })
      const d = await r.json().catch(() => ({}))
      const liens: Lien[] = Array.isArray(d.liens)
        ? d.liens.filter((l: unknown): l is Lien => !!l && typeof (l as Lien).chemin === 'string'
            && (l as Lien).chemin.startsWith('/') && !(l as Lien).chemin.startsWith('//') && typeof (l as Lien).titre === 'string')
        : []
      setTours((t) => [...t, { role: 'assistant', content: String(d.reponse ?? 'L’assistant est momentanément indisponible.'), liens }])
    } catch {
      setTours((t) => [...t, { role: 'assistant', content: 'L’assistant est momentanément indisponible.' }])
    } finally { setEnvoi(false) }
  }

  return (
    <div style={{ position: 'fixed', insetInlineEnd: 20, bottom: 20, zIndex: 60 }}>
      {ouvert && (
        <div role="dialog" aria-label="Assistant du site" style={{
          width: 'min(360px, calc(100vw - 40px))', maxHeight: '70vh', display: 'flex', flexDirection: 'column',
          marginBottom: 12, background: '#fff', color: '#111', borderRadius: 16,
          boxShadow: '0 18px 50px -12px rgba(0,0,0,0.35)', border: '1px solid #e6e6e6', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', background: primary, color: '#fff', fontWeight: 700 }}>Assistant du site</div>
          <div style={{ padding: 14, overflowY: 'auto', flex: 1, fontSize: 14.5, lineHeight: 1.55 }}>
            {!accepte ? (
              <div>
                <p style={{ margin: '0 0 10px' }}>
                  Je réponds à partir des pages de ce site, et je vous indique la page d’où vient la réponse.
                  Si l’information n’y est pas, je vous le dis.
                </p>
                {/* LA DONNÉE QUI SORT SE DIT AVANT, PAS APRÈS. */}
                <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.75 }}>
                  Votre question est transmise au service d’intelligence artificielle DeepSeek pour être traitée.
                  N’y écrivez pas d’informations personnelles. Rien n’est conservé après la fermeture de la page.
                </p>
                <button type="button" onClick={() => setAccepte(true)} style={{
                  padding: '9px 16px', borderRadius: 999, border: 'none', background: primary,
                  color: '#fff', fontWeight: 600, cursor: 'pointer' }}>J’ai compris</button>
              </div>
            ) : (
              <>
                {tours.length === 0 && <p style={{ opacity: 0.6, margin: 0 }}>Posez votre question.</p>}
                {tours.map((t, i) => (
                  <div key={i} style={{ margin: '0 0 10px' }}>
                    <p style={{
                      margin: 0, padding: '9px 12px', borderRadius: 12, whiteSpace: 'pre-wrap',
                      background: t.role === 'user' ? `color-mix(in srgb, ${primary} 10%, #fff)` : '#f4f4f5',
                      marginInlineStart: t.role === 'user' ? 30 : 0, marginInlineEnd: t.role === 'user' ? 0 : 30,
                    }}>{t.role === 'assistant' ? avecLiens(t.content, base, t.liens ?? []) : t.content}</p>
                    {/* LE LIEN EN BOUTON : plus facile à toucher qu'une adresse dans le texte. */}
                    {(t.liens ?? []).map((l) => (
                      <a key={l.chemin} href={`${base}${l.chemin}`} style={{
                        display: 'inline-block', marginTop: 6, marginInlineEnd: 6, padding: '7px 12px',
                        borderRadius: 999, background: primary, color: '#fff', fontSize: 13.5,
                        fontWeight: 600, textDecoration: 'none' }}>{l.titre} →</a>
                    ))}
                  </div>
                ))}
                {envoi && <p style={{ opacity: 0.6, margin: 0 }}>…</p>}
              </>
            )}
          </div>
          {accepte && (
            <form onSubmit={poser} style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid #eee' }}>
              <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={600}
                disabled={posees >= MAX}
                placeholder={posees >= MAX ? '10 questions atteintes' : `Votre question (${MAX - posees} restantes)`}
                style={{ flex: 1, padding: '9px 11px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14 }} />
              <button type="submit" disabled={envoi || posees >= MAX} style={{
                padding: '0 14px', borderRadius: 10, border: 'none', background: primary, color: '#fff',
                fontWeight: 600, cursor: 'pointer' }}>Envoyer</button>
            </form>
          )}
        </div>
      )}
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}
        aria-label={ouvert ? 'Fermer l’assistant' : 'Ouvrir l’assistant'}
        style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', background: primary, color: '#fff',
          cursor: 'pointer', boxShadow: '0 10px 28px -8px rgba(0,0,0,0.4)', marginInlineStart: 'auto', display: 'block' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ margin: 'auto', display: 'block' }}>
          {ouvert ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />}
        </svg>
      </button>
    </div>
  )
}
