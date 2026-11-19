'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LES COMPTES CLIENTS — l'écran de la division DDM (CPA, 2026-11-19).
//
// La DDM voit les structures sanitaires inscrites et peut suspendre ou
// réactiver un compte. Elle ne voit ni les fournisseurs ni les agents : la
// route ne les rend pas. L'écran ne décide rien ; il relit après chaque geste.
// ============================================================================

type Client = {
  id: string; email: string; etat: 'actif' | 'suspendu' | 'en_attente'
  organisation: string | null; nom: string | null; telephone: string | null; cree_le: string
  type_client?: string | null
}

export default function ComptesClients({ slug, accent }: { slug: string; accent: string }) {
  const [liste, setListe] = useState<Client[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [filtre, setFiltre] = useState('')
  const api = `/api/sites/${encodeURIComponent(slug)}/clients`

  const appel = useCallback(async (methode: string, corps?: unknown) => {
    const { data } = await supabase.auth.getSession()
    const r = await fetch(api, {
      method: methode, cache: 'no-store',
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}`, 'content-type': 'application/json' },
      ...(corps ? { body: JSON.stringify(corps) } : {}),
    })
    return { ok: r.ok, d: await r.json().catch(() => ({})) }
  }, [api])

  const relire = useCallback(async () => {
    const { ok, d } = await appel('GET')
    if (!ok) { setMessage(typeof d.error === 'string' ? d.error : 'Accès refusé.'); return }
    setListe(d.clients ?? [])
  }, [appel])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : la liste se lit avec le jeton du navigateur.
    void relire()
  }, [relire])

  async function changer(id: string, etat: 'actif' | 'suspendu') {
    setMessage(null)
    const { ok, d } = await appel('PATCH', { id, etat })
    if (!ok) { setMessage(typeof d.error === 'string' ? d.error : 'Refusé.'); return }
    await relire()
  }

  const q = filtre.trim().toLowerCase()
  const vus = (liste ?? []).filter((c) => !q || [c.organisation, c.nom, c.email, c.telephone].some((v) => (v ?? '').toLowerCase().includes(q)))
  const actifs = (liste ?? []).filter((c) => c.etat === 'actif').length

  return (
    <div>
      {message && <p role="alert" style={{ color: '#9b1c1c' }}>{message}</p>}
      {!liste && !message && <p style={{ opacity: 0.6 }}>Chargement…</p>}
      {liste && (<>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {[['Comptes clients', liste.length], ['Actifs', actifs], ['Suspendus', liste.length - actifs]].map(([l, n]) => (
            <div key={String(l)} style={{ flex: '1 1 140px', padding: '12px 14px', borderRadius: 14, border: '1px solid #e4e4e7', background: '#fff' }}>
              <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: accent }}>{n}</div>
              <div style={{ fontSize: 13, opacity: 0.65 }}>{l}</div>
            </div>
          ))}
        </div>
        <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Rechercher une structure, un nom, une adresse…"
          aria-label="Rechercher un client"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 15, borderRadius: 10, border: '1px solid #d4d4d8', marginBottom: 14 }} />
        {vus.length === 0 && <p style={{ opacity: 0.6 }}>{liste.length === 0 ? 'Aucun compte client pour l’instant.' : 'Aucun client ne correspond.'}</p>}
        <ul style={{ padding: 0, margin: 0 }}>
          {vus.map((c) => (
            <li key={c.id} style={{ listStyle: 'none', padding: '14px 16px', marginBottom: 10, borderRadius: 14, border: '1px solid #e4e4e7', background: '#fff',
              display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{c.organisation ?? 'Structure'}{c.type_client && <span style={{ marginInlineStart: 8, fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#334155' }}>{c.type_client === 'ong' ? 'ONG' : 'Structure sanitaire'}</span>}</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, opacity: 0.65 }}>
                  {[c.nom, c.email, c.telephone].filter(Boolean).join(' · ')} · inscrit le {c.cree_le.slice(0, 10)}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: c.etat === 'actif' ? '#16794a' : '#9b1c1c' }}>
                  {c.etat === 'actif' ? 'Actif' : c.etat === 'suspendu' ? 'Suspendu' : 'En attente'}
                </span>
                <button type="button" onClick={() => void changer(c.id, c.etat === 'actif' ? 'suspendu' : 'actif')}
                  style={{ padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'transparent',
                    color: c.etat === 'actif' ? '#9b1c1c' : accent, border: `1px solid ${c.etat === 'actif' ? '#9b1c1c55' : accent + '66'}` }}>
                  {c.etat === 'actif' ? 'Suspendre' : 'Réactiver'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </>)}
    </div>
  )
}
