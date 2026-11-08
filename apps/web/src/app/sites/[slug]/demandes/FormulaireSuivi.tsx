'use client'
import { useState } from 'react'

// ============================================================================
// LOT 8 — L'ÉCRAN DE SUIVI D'UNE DEMANDE.
//
// IL NE SAIT RIEN. Toute la décision est dans la route : lui ne fait
// qu'afficher ce qu'elle rend. En particulier il ne distingue PAS « référence
// inconnue » de « courriel incorrect » — il ne reçoit qu'un seul message, et
// c'est voulu : distinguer les deux révélerait qu'une référence existe à
// quelqu'un qui n'en est pas l'auteur.
//
// IL N'AFFICHE JAMAIS LE MESSAGE. La route ne le rend pas ; cet écran n'a
// donc rien à cacher par lui-même, et c'est la bonne façon de s'en assurer.
// ============================================================================

type Reponse =
  | { trouve: true; reference: string; etat: string; deposee_le: string; maj_le: string }
  | { trouve: false; message: string }

export default function FormulaireSuivi({
  primary, libelles,
}: {
  primary: string
  libelles: {
    reference: string; email: string; chercher: string; cherche: string
    etat: string; deposee: string; majLe: string
    etats: Record<string, string>
    trop: string
  }
}) {
  const [reference, setReference] = useState('')
  const [email, setEmail] = useState('')
  const [etat, setEtat] = useState<'repos' | 'cherche'>('repos')
  const [reponse, setReponse] = useState<Reponse | null>(null)

  const chercher = async (e: React.FormEvent) => {
    e.preventDefault()
    setEtat('cherche')
    setReponse(null)
    try {
      const r = await fetch('/api/demandes/suivi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, email }),
      })
      if (r.status === 429) {
        setReponse({ trouve: false, message: libelles.trop })
      } else {
        setReponse((await r.json()) as Reponse)
      }
    } catch {
      // Une panne de réseau n'est pas une réponse de la route : on le dit
      // avec le MÊME message neutre plutôt que d'inventer un diagnostic.
      setReponse({ trouve: false, message: libelles.trop })
    }
    setEtat('repos')
  }

  const date = (iso: string) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('fr', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    }).format(d)
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <form onSubmit={chercher} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: 14, marginBottom: 5 }}>{libelles.reference}</span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
            placeholder="CPA-2026-XXXXXX"
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10,
              border: '1px solid #d8d8dc', fontFamily: 'ui-monospace, monospace',
              fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          />
        </label>

        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: 14, marginBottom: 5 }}>{libelles.email}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid #d8d8dc', fontSize: 16 }}
          />
        </label>

        <button
          type="submit"
          disabled={etat === 'cherche'}
          style={{
            padding: '12px 18px', borderRadius: 999, border: 'none',
            background: primary, color: '#fff', fontSize: 16, fontWeight: 600,
            cursor: etat === 'cherche' ? 'progress' : 'pointer',
            opacity: etat === 'cherche' ? 0.65 : 1,
          }}
        >
          {etat === 'cherche' ? libelles.cherche : libelles.chercher}
        </button>
      </form>

      {reponse && !reponse.trouve && (
        <p role="status" style={{
          marginTop: 16, padding: '12px 14px', borderRadius: 10,
          background: '#f4f4f5', color: '#5b5b5b', fontSize: 15, lineHeight: 1.5,
        }}>{reponse.message}</p>
      )}

      {reponse && reponse.trouve && (
        <dl role="status" style={{
          marginTop: 16, padding: '16px 18px', borderRadius: 12,
          border: `1px solid ${primary}`, background: `color-mix(in srgb, ${primary} 7%, white)`,
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', margin: '16px 0 0',
        }}>
          <dt style={{ fontSize: 14, color: '#5b5b5b' }}>{libelles.reference}</dt>
          <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{reponse.reference}</dd>

          <dt style={{ fontSize: 14, color: '#5b5b5b' }}>{libelles.etat}</dt>
          <dd style={{ margin: 0, fontWeight: 600, color: primary }}>
            {libelles.etats[reponse.etat] ?? reponse.etat}
          </dd>

          <dt style={{ fontSize: 14, color: '#5b5b5b' }}>{libelles.deposee}</dt>
          <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{date(reponse.deposee_le)}</dd>

          <dt style={{ fontSize: 14, color: '#5b5b5b' }}>{libelles.majLe}</dt>
          <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{date(reponse.maj_le)}</dd>
        </dl>
      )}
    </div>
  )
}
