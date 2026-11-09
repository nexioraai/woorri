'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 11 — MON PROFIL.
//
// ── CE QUI SE MODIFIE, ET CE QUI NE SE MODIFIE PAS.
//
// L'organisation se corrige TANT QUE LA DEMANDE ATTEND : avant l'examen,
// c'est une faute de frappe. Après, c'est ce que la Centrale a approuvé, et
// la changer déplacerait silencieusement qui l'on représente — exactement la
// raison pour laquelle le rôle ne se modifie jamais.
//
// Le RÔLE et l'ÉTAT ne se touchent pas du tout : ils appartiennent à la
// Centrale. L'écran ne montre même pas de champ — un champ grisé invite à
// essayer, et le refus arrive trop tard.
//
// ── LE MOT DE PASSE PASSE PAR L'AUTHENTIFICATION, PAS PAR NOUS.
//
// Aucune de nos routes ne voit un mot de passe, et c'est la bonne place :
// ce que nous ne manipulons pas, nous ne pouvons pas le perdre.
// ============================================================================

type Compte = {
  id: string
  email: string
  role: 'structure' | 'fournisseur' | 'agent'
  etat: 'en_attente' | 'actif' | 'suspendu'
  organisation: string | null
  reference: string | null
  cree_le: string
}

export type MotsProfil = {
  chargement: string
  refus: string
  identite: string
  organisation: string
  role: string
  etat: string
  reference: string
  roles: Record<string, string>
  etats: Record<string, string>
  figee: string
  enregistrer: string
  enregistrement: string
  enregistre: string
  motDePasse: string
  changerMotDePasse: string
  courrielEnvoye: string
}

export default function MonProfil({
  slug, mots, primary,
}: { slug: string; mots: MotsProfil; primary: string }) {
  const [compte, setCompte] = useState<Compte | null>(null)
  const [refus, setRefus] = useState(false)
  const [organisation, setOrganisation] = useState('')
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'fait' | 'erreur'>('repos')
  const [message, setMessage] = useState<string | null>(null)
  const [courrielEnvoye, setCourrielEnvoye] = useState(false)

  const jeton = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const charger = useCallback(async (encoreLa: () => boolean = () => true) => {
    const j = await jeton()
    if (!encoreLa()) return
    if (!j) { setRefus(true); return }
    try {
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/mon-compte`, {
        headers: { Authorization: `Bearer ${j}` }, cache: 'no-store',
      })
      if (!encoreLa()) return
      if (!r.ok) { setRefus(true); return }
      const d = await r.json()
      if (!encoreLa()) return
      const c = (d.compte ?? null) as Compte | null
      setCompte(c)
      setOrganisation(c?.organisation ?? '')
    } catch { if (encoreLa()) setRefus(true) }
  }, [slug, jeton])

  useEffect(() => {
    let vivant = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : cet effet ne tourne qu'au montage et l'état posé ne redéclenche aucun effet. Le compte se lit par une requête portant le jeton, qui n'existe que dans le navigateur.
    void charger(() => vivant)
    return () => { vivant = false }
  }, [charger])

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    if (etat === 'envoi') return
    setEtat('envoi'); setMessage(null)
    try {
      const j = await jeton()
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/mon-compte`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${j}`, 'content-type': 'application/json' },
        body: JSON.stringify({ organisation }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        // LE REFUS DE LA ROUTE EST AFFICHÉ TEL QUEL. Le réécrire ici en
        // ferait une deuxième vérité, qui divergerait de la première.
        setMessage(typeof d.error === 'string' ? d.error : mots.refus)
        setEtat('erreur'); return
      }
      // ON RELIT CE QUE LA ROUTE A RENDU, jamais ce qu'on a envoyé.
      const c = (d.compte ?? null) as Compte | null
      setCompte(c); setOrganisation(c?.organisation ?? '')
      setEtat('fait')
    } catch { setEtat('erreur'); setMessage(mots.refus) }
  }

  const champ: React.CSSProperties = {
    width: '100%', maxWidth: 420, padding: '12px 14px', fontSize: 16, marginTop: 6,
    border: '1px solid #d9d9d9', borderRadius: 10, background: '#fff', color: '#111',
  }
  const ligne = (cle: string, valeur: React.ReactNode) => (
    <p style={{ margin: '0 0 10px', fontSize: 15.5, lineHeight: 1.6 }}>
      <span style={{ opacity: 0.6 }}>{cle} : </span>{valeur}
    </p>
  )

  if (refus) return <p role="alert" style={{ color: '#9b1c1c' }}>{mots.refus}</p>
  if (!compte) return <p style={{ opacity: 0.6 }}>{mots.chargement}</p>

  const modifiable = compte.etat === 'en_attente'

  return (
    <div>
      <section style={{ padding: '20px 22px', border: '1px solid #e6e6e6', borderRadius: 14, background: '#fff', marginBottom: 22 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 14px' }}>{mots.identite}</h2>
        {ligne(mots.role, mots.roles[compte.role] ?? compte.role)}
        {ligne(mots.etat, <strong style={{ color: primary }}>{mots.etats[compte.etat] ?? compte.etat}</strong>)}
        {compte.reference && ligne(mots.reference, <code style={{ fontFamily: 'ui-monospace, monospace' }}>{compte.reference}</code>)}
        {ligne('Courriel', compte.email)}
      </section>

      <section style={{ padding: '20px 22px', border: '1px solid #e6e6e6', borderRadius: 14, background: '#fff', marginBottom: 22 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>{mots.organisation}</h2>
        {modifiable ? (
          <form onSubmit={enregistrer}>
            <input required minLength={2} value={organisation} style={champ}
              onChange={(e) => { setOrganisation(e.target.value); if (etat !== 'repos') setEtat('repos') }} />
            <div style={{ marginTop: 14 }}>
              <button type="submit" disabled={etat === 'envoi'} style={{
                padding: '11px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 14.5, background: primary, color: '#fff',
                opacity: etat === 'envoi' ? 0.7 : 1,
              }}>{etat === 'envoi' ? mots.enregistrement : mots.enregistrer}</button>
              {etat === 'fait' && <span style={{ marginInlineStart: 12, color: '#16794a', fontSize: 14 }}>{mots.enregistre}</span>}
            </div>
            {message && <p role="alert" style={{ color: '#9b1c1c', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>{message}</p>}
          </form>
        ) : (
          <>
            <p style={{ margin: '0 0 8px', fontSize: 15.5 }}>{compte.organisation || '—'}</p>
            {/* ON DIT POURQUOI C'EST FIGÉ. Un champ absent sans explication se
                lit comme une panne ; la phrase dit que c'est une décision. */}
            <p style={{ margin: 0, fontSize: 14, opacity: 0.7, lineHeight: 1.6 }}>{mots.figee}</p>
          </>
        )}
      </section>

      <section style={{ padding: '20px 22px', border: '1px solid #e6e6e6', borderRadius: 14, background: '#fff' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px' }}>{mots.motDePasse}</h2>
        {courrielEnvoye ? (
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{mots.courrielEnvoye}</p>
        ) : (
          <button type="button" onClick={async () => {
            // ON NE REGARDE PAS LA RÉPONSE : le message doit valoir pour une
            // adresse connue comme pour une adresse inconnue. Ici elle est
            // forcément connue, mais écrire deux comportements selon le cas
            // ferait diverger ce bouton de l'écran « mot de passe oublié ».
            await supabase.auth.resetPasswordForEmail(compte.email, {
              redirectTo: `${window.location.origin}/connexion`,
            })
            setCourrielEnvoye(true)
          }} style={{
            padding: '11px 20px', borderRadius: 999, cursor: 'pointer', fontWeight: 600,
            fontSize: 14.5, background: 'transparent', color: primary, border: `1px solid ${primary}`,
          }}>{mots.changerMotDePasse}</button>
        )}
      </section>
    </div>
  )
}
