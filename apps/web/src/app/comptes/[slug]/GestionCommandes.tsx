'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ETATS_COMMANDE, LIBELLES_ETAT, type EtatCommande } from '@/lib/commandes/commandes'

// ============================================================================
// LES COMMANDES REÇUES — au tableau de bord de la Centrale (CPA, 2026-11-19).
//
// « C'est cool qu'ils reçoivent leurs commandes depuis le dashboard. » Chaque
// bon de commande d'une structure sanitaire arrive ici : qui commande, quoi,
// combien. La Centrale le fait avancer et peut répondre ; la réponse et l'état
// s'affichent dans l'espace du client. L'écran ne décide rien : il relit.
// ============================================================================

type Ligne = { designation: string; quantite: number; unite: string | null; produit_reference: string | null }
type Commande = {
  id: string; reference: string; etat: EtatCommande; note: string | null
  reponse: string | null; repondu_le: string | null; cree_le: string
  client: { organisation: string | null; nom: string | null; email: string; telephone: string | null } | null
  lignes: Ligne[]
}

const TEINTE: Record<EtatCommande, string> = {
  recue: '#b45309', en_cours: '#1d4ed8', validee: '#7c3aed', livree: '#16794a', annulee: '#6b7280',
}

/** Deux surfaces : le tableau de bord (sombre) et l'espace client du site,
 *  où l'agent de la DDM traite les commandes (clair). Mêmes gestes, mêmes routes. */
const SOMBRE = { erreur: '#f87171', bord: 'rgba(255,255,255,0.10)', fond: 'rgba(255,255,255,0.03)', trait: 'rgba(255,255,255,0.08)', champFond: 'rgba(0,0,0,0.25)', champBord: 'rgba(255,255,255,0.15)', champTexte: '#ededed' }
const CLAIR = { erreur: '#9b1c1c', bord: '#e4e4e7', fond: '#ffffff', trait: '#ececf0', champFond: '#ffffff', champBord: '#d4d4d8', champTexte: '#111111' }

export default function GestionCommandes({ slug, clair = false, accent = '#FA5D1E', sansTitre = false }: { slug: string; clair?: boolean; accent?: string; sansTitre?: boolean }) {
  const T = clair ? CLAIR : SOMBRE
  const [liste, setListe] = useState<Commande[] | null>(null)
  const [ouvert, setOuvert] = useState(true)
  const [brouillons, setBrouillons] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const base = `/api/sites/${encodeURIComponent(slug)}/commandes`

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
    if (!ok) { setMessage(typeof d.error === 'string' ? d.error : 'Accès refusé.'); return }
    setOuvert(d.ouvert !== false)
    setListe(d.commandes ?? [])
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
  const aTraiter = (liste ?? []).filter((c) => c.etat === 'recue' || c.etat === 'en_cours').length

  // Avant que le fichier SQL soit appliqué, la section ne s'affiche pas :
  // un panneau qui ne peut rien recevoir ferait croire à une panne.
  if (!ouvert) return null

  return (
    <section style={{ marginTop: sansTitre ? 0 : 44 }}>
      {!sansTitre && (<>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>
        Commandes reçues {aTraiter > 0 && <span style={{ color: '#b45309' }}>({aTraiter} à traiter)</span>}
      </h2>
      <p style={{ fontSize: 14, opacity: 0.65, margin: '0 0 16px' }}>
        Les bons de commande des structures sanitaires, passés depuis leur espace client. L’état et votre réponse s’affichent chez le client.
      </p>
      </>)}
      {sansTitre && aTraiter > 0 && <p style={{ fontWeight: 700, color: '#b45309', margin: '0 0 14px' }}>{aTraiter} commande{aTraiter > 1 ? 's' : ''} à traiter</p>}
      {message && <p role="alert" style={{ color: T.erreur }}>{message}</p>}
      {liste && liste.length === 0 && <p style={{ opacity: 0.55 }}>Aucune commande pour l’instant.</p>}

      {(liste ?? []).map((c) => (
        <div key={c.id} style={{ padding: '14px 16px', marginBottom: 10, borderRadius: 14,
          border: `1px solid ${T.bord}`, background: T.fond }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', marginInlineEnd: 8 }}>{c.reference}</span>
                {c.client?.organisation ?? 'Client'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, opacity: 0.55 }}>
                {[c.client?.nom, c.client?.email, c.client?.telephone].filter(Boolean).join(' · ')} · {c.cree_le.slice(0, 10)}
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEINTE[c.etat] }}>{LIBELLES_ETAT[c.etat] ?? c.etat}</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'start', opacity: 0.6, fontSize: 12.5 }}>
                <th style={{ textAlign: 'start', padding: '4px 6px' }}>Produit</th>
                <th style={{ textAlign: 'end', padding: '4px 6px' }}>Quantité</th>
              </tr>
            </thead>
            <tbody>
              {c.lignes.map((l, k) => (
                <tr key={k} style={{ borderTop: `1px solid ${T.trait}` }}>
                  <td style={{ padding: '6px' }}>{l.designation}{l.produit_reference ? <span style={{ opacity: 0.5 }}> · {l.produit_reference}</span> : null}</td>
                  <td style={{ padding: '6px', textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{l.quantite.toLocaleString('fr-FR')}{l.unite ? ` ${l.unite}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {c.note && <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.5, opacity: 0.85, whiteSpace: 'pre-wrap' }}>Note du client : {c.note}</p>}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {ETATS_COMMANDE.filter((e) => e !== c.etat).map((e) => (
              <button key={e} type="button" style={bouton(TEINTE[e])} onClick={() => void changer(c.id, { etat: e })}>
                {LIBELLES_ETAT[e]}
              </button>
            ))}
          </div>
          <textarea rows={2} defaultValue={c.reponse ?? ''} placeholder="Votre réponse au client (disponibilité, date de livraison…)"
            onChange={(e) => setBrouillons({ ...brouillons, [c.id]: e.target.value })}
            style={{ width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9,
              background: T.champFond, border: `1px solid ${T.champBord}`, color: T.champTexte }} />
          <button type="button" style={{ ...bouton(accent), marginTop: 6 }}
            onClick={() => void changer(c.id, { reponse: brouillons[c.id] ?? c.reponse ?? '' })}>
            Enregistrer la réponse{c.repondu_le ? ` (dernière : ${c.repondu_le.slice(0, 10)})` : ''}
          </button>
        </div>
      ))}
    </section>
  )
}
