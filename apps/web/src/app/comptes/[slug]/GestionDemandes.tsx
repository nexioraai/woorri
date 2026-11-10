'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 14.2 — LA CENTRALE TRAITE LES DEMANDES ET RÉCLAMATIONS.
//
// Au tableau de bord : répondre à un hôpital ne se voit pas sur le site.
// Rien n'écrivait `etat` avant ce lot — chaque demande restait « reçue ».
// L'écran ne décide rien ; il relit après chaque geste.
// ============================================================================

type Demande = {
  id: string; reference: string | null; name: string; email: string; message: string
  type: 'demande' | 'reclamation'; etat: 'recu' | 'en_cours' | 'repondu' | 'clos'
  reponse: string | null; repondu_le: string | null; created_at: string
}

const ETAT = { recu: 'Reçue', en_cours: 'En cours', repondu: 'Répondue', clos: 'Close' } as const
const TEINTE = { recu: '#b45309', en_cours: '#1d4ed8', repondu: '#16794a', clos: '#6b7280' } as const

export default function GestionDemandes({ slug }: { slug: string }) {
  const [liste, setListe] = useState<Demande[] | null>(null)
  const [brouillons, setBrouillons] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const base = `/api/sites/${encodeURIComponent(slug)}/demandes`

  const appel = useCallback(async (methode: string, corps?: unknown) => {
    const { data } = await supabase.auth.getSession()
    const r = await fetch(base, {
      method: methode, cache: 'no-store',
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}`, 'content-type': 'application/json' },
      ...(corps ? { body: JSON.stringify(corps) } : {}),
    })
    return { ok: r.ok, d: await r.json().catch(() => ({})) }
  }, [base])

  const relire = useCallback(async () => {
    const { ok, d } = await appel('GET')
    if (ok) setListe(d.demandes ?? [])
  }, [appel])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : l'état posé ne redéclenche aucun effet ; la liste se lit avec le jeton du navigateur.
    void relire()
  }, [relire])

  async function changer(id: string, corps: Record<string, unknown>) {
    setMessage(null)
    const { ok, d } = await appel('PATCH', { id, ...corps })
    if (!ok) { setMessage(typeof d.error === 'string' ? d.error : 'Refusé.'); return }
    await relire()
  }

  const bouton = (c: string): React.CSSProperties => ({
    padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
    background: 'transparent', color: c, border: `1px solid ${c}66`,
  })
  const enAttente = (liste ?? []).filter((d) => d.etat === 'recu' || d.etat === 'en_cours').length

  return (
    <section style={{ marginTop: 44 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>
        Demandes et réclamations {enAttente > 0 && <span style={{ color: '#b45309' }}>({enAttente} à traiter)</span>}
      </h2>
      <p style={{ fontSize: 14, opacity: 0.65, margin: '0 0 16px' }}>
        Les messages reçus par le formulaire de contact. Votre réponse s’affiche dans l’espace du demandeur.
      </p>
      {message && <p role="alert" style={{ color: '#f87171' }}>{message}</p>}
      {liste && liste.length === 0 && <p style={{ opacity: 0.55 }}>Aucune demande.</p>}

      {(liste ?? []).map((d) => (
        <div key={d.id} style={{ padding: '14px 16px', marginBottom: 10, borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>
                {d.type === 'reclamation' && <span style={{ color: '#f87171', marginInlineEnd: 6 }}>Réclamation ·</span>}
                {d.name}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, opacity: 0.55 }}>
                {d.email} · {d.reference ?? 'sans référence'} · {d.created_at.slice(0, 10)}
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEINTE[d.etat] }}>{ETAT[d.etat]}</span>
          </div>
          <p style={{ margin: '10px 0', fontSize: 14.5, lineHeight: 1.55, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{d.message}</p>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {(Object.keys(ETAT) as Demande['etat'][]).filter((e) => e !== d.etat).map((e) => (
              <button key={e} type="button" style={bouton(TEINTE[e])} onClick={() => void changer(d.id, { etat: e })}>
                {ETAT[e]}
              </button>
            ))}
          </div>
          <textarea rows={2} defaultValue={d.reponse ?? ''} placeholder="Votre réponse au demandeur"
            onChange={(e) => setBrouillons({ ...brouillons, [d.id]: e.target.value })}
            style={{ width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9,
              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)', color: '#ededed' }} />
          <button type="button" style={{ ...bouton('#FA5D1E'), marginTop: 6 }}
            onClick={() => void changer(d.id, { reponse: brouillons[d.id] ?? d.reponse ?? '' })}>
            Enregistrer la réponse{d.repondu_le ? ` (dernière : ${d.repondu_le.slice(0, 10)})` : ''}
          </button>
        </div>
      ))}
    </section>
  )
}
