'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 19 — CHOISIR UN NOUVEAU MOT DE PASSE, depuis le lien reçu par courriel.
//
// Le lien porte un jeton HACHÉ (`?jeton=`). Il n'est vérifié qu'au moment où
// la personne VALIDE son nouveau mot de passe — pas à l'ouverture de la page :
// les robots qui « ouvrent » les liens des courriels pour les analyser ne
// consomment donc pas le jeton à sa place. Même principe que `/reset-password`.
// ============================================================================

export type MotsNouveau = {
  titre: string; phrase: string; motDePasse: string; confirmer: string; envoyer: string; envoi: string
  minimum: string; differents: string; lienInvalide: string; fait: string; afficher: string; masquer: string
}

export default function NouveauMotDePasse({ jeton, destination, mots, primary }: {
  jeton: string; destination: string; mots: MotsNouveau; primary: string
}) {
  const [mdp, setMdp] = useState('')
  const [mdp2, setMdp2] = useState('')
  const [visible, setVisible] = useState(false)
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'fait'>('repos')
  const [erreur, setErreur] = useState('')

  async function valider(e: React.FormEvent) {
    e.preventDefault()
    if (etat === 'envoi') return
    if (mdp.length < 8) { setErreur(mots.minimum); return }
    if (mdp !== mdp2) { setErreur(mots.differents); return }
    setEtat('envoi'); setErreur('')
    const { error: e1 } = await supabase.auth.verifyOtp({ token_hash: jeton, type: 'recovery' })
    if (e1) { setErreur(mots.lienInvalide); setEtat('repos'); return }
    const { error: e2 } = await supabase.auth.updateUser({ password: mdp })
    if (e2) { setErreur(mots.lienInvalide); setEtat('repos'); return }
    setEtat('fait')
    window.location.assign(destination)
  }

  const champ: React.CSSProperties = {
    width: '100%', padding: '12px 48px 12px 14px', fontSize: 16, border: '1px solid #d9d9d9',
    borderRadius: 10, background: '#fff', color: '#111', marginTop: 6,
  }

  if (!jeton) return <p role="alert" style={{ color: '#9b1c1c' }}>{mots.lienInvalide}</p>
  if (etat === 'fait') return <p role="status">{mots.fait}</p>

  return (
    <form onSubmit={valider} style={{ maxWidth: 420 }}>
      {[[mots.motDePasse, mdp, setMdp], [mots.confirmer, mdp2, setMdp2]].map(([libelle, valeur, poser], i) => (
        <label key={i} style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{libelle as string}</span>
          <span style={{ position: 'relative', display: 'block' }}>
            <input type={visible ? 'text' : 'password'} required minLength={8} autoComplete="new-password"
              value={valeur as string} style={champ}
              onChange={(e) => { (poser as (v: string) => void)(e.target.value); setErreur('') }} />
            {i === 0 && (
              <button type="button" onClick={() => setVisible(!visible)} aria-pressed={visible}
                aria-label={visible ? mots.masquer : mots.afficher}
                style={{ position: 'absolute', right: 6, top: 'calc(50% + 3px)', transform: 'translateY(-50%)',
                  width: 38, height: 38, border: 'none', background: 'transparent', cursor: 'pointer', color: '#555' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', margin: 'auto' }}>
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
                  {visible && <path d="M3 3l18 18" />}
                </svg>
              </button>
            )}
          </span>
        </label>
      ))}
      {erreur && <p role="alert" style={{ fontSize: 14, color: '#9b1c1c', margin: '0 0 14px' }}>{erreur}</p>}
      <button type="submit" disabled={etat === 'envoi'} style={{
        padding: '12px 22px', fontSize: 15, fontWeight: 600, borderRadius: 999, background: primary,
        color: '#fff', border: 'none', cursor: etat === 'envoi' ? 'progress' : 'pointer', opacity: etat === 'envoi' ? 0.7 : 1,
      }}>{etat === 'envoi' ? mots.envoi : mots.envoyer}</button>
    </form>
  )
}
