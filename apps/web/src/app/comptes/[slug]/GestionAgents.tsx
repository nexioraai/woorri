'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LES AGENTS DE LA DIVISION DDM — nommés depuis le tableau de bord
// (CPA, 2026-11-19 : « l'espace client est dédié à un service de la DDM »).
//
// Le propriétaire saisit le nom et l'adresse d'un agent. Si cette adresse n'a
// pas encore d'accès, il est créé : l'agent choisit son mot de passe par
// « Mot de passe oublié » sur la page « Se connecter » du site. Il trouve
// ensuite, dans son espace client, « Gestion des commandes » et « Comptes
// clients ». Retirer un agent : le suspendre ou le supprimer dans la liste des
// comptes ci-dessus.
// ============================================================================

type Agent = { id: string; email: string; nom: string | null; etat: string; service: string | null }

export default function GestionAgents({ slug }: { slug: string }) {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [ouvert, setOuvert] = useState(true)
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const api = `/api/sites/${encodeURIComponent(slug)}/agents`

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
    if (!ok) return
    setOuvert(d.ouvert !== false)
    setAgents(d.agents ?? [])
  }, [appel])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : la liste se lit avec le jeton du navigateur.
    void relire()
  }, [relire])

  async function nommer(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null); setEnvoi(true)
    try {
      const { ok, d } = await appel('POST', { nom, email })
      if (!ok) { setMessage({ ok: false, texte: typeof d.error === 'string' ? d.error : 'Refusé.' }); return }
      setMessage({ ok: true, texte: d.nouvelAcces
        ? `${nom} est agent DDM. Son accès est créé : sur le site, page « Se connecter » puis « Connexion agent », il choisit « Mot de passe oublié » avec ${email} pour définir son mot de passe (10 caractères minimum, avec majuscule, minuscule, chiffre et signe).`
        : `${nom} est agent DDM. Il se connecte sur le site avec son mot de passe habituel.` })
      setNom(''); setEmail('')
      await relire()
    } finally { setEnvoi(false) }
  }

  if (!ouvert) return null
  const champ: React.CSSProperties = { flex: '1 1 200px', padding: '9px 11px', fontSize: 14, borderRadius: 9,
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)', color: '#ededed' }

  return (
    <section style={{ marginTop: 44 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Agents de la division DDM</h2>
      <p style={{ fontSize: 14, opacity: 0.65, margin: '0 0 14px' }}>
        L’espace client est géré par la DDM. Ses agents traitent les commandes et les comptes clients depuis leur espace sur le site.
      </p>
      <form onSubmit={nommer} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input required minLength={2} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de l’agent" aria-label="Nom de l’agent" style={champ} />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse électronique" aria-label="Adresse électronique de l’agent" style={champ} />
        <button type="submit" disabled={envoi} style={{ padding: '9px 16px', borderRadius: 999, border: 'none', background: '#FA5D1E', color: '#1A0A03', fontWeight: 700, cursor: 'pointer', opacity: envoi ? 0.7 : 1 }}>
          {envoi ? 'Envoi…' : 'Nommer agent DDM'}
        </button>
      </form>
      {message && <p role={message.ok ? 'status' : 'alert'} style={{ color: message.ok ? '#4ade80' : '#f87171', fontSize: 14, lineHeight: 1.5 }}>{message.texte}</p>}
      {agents && agents.length === 0 && <p style={{ opacity: 0.55 }}>Aucun agent pour l’instant.</p>}
      {agents && agents.length > 0 && (
        <ul style={{ padding: 0, margin: 0 }}>
          {agents.map((a) => (
            <li key={a.id} style={{ listStyle: 'none', padding: '10px 14px', marginBottom: 8, borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)', fontSize: 14 }}>
              <strong>{a.nom ?? a.email}</strong> · {a.email} · {a.service === 'ddm' ? 'DDM' : 'sans service'} ·{' '}
              <span style={{ color: a.etat === 'actif' ? '#4ade80' : '#f87171' }}>{a.etat === 'actif' ? 'actif' : a.etat}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
