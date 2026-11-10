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
  nom?: string | null
  telephone?: string | null
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
  coordonnees: string; nom: string; telephone: string
  supprimerTitre: string; supprimerTexte: string; supprimerBouton: string; supprimerConfirmer: string; supprime: string
}

export default function MonProfil({
  slug, mots, primary, accueil = '/',
}: { slug: string; mots: MotsProfil; primary: string; accueil?: string }) {
  const [compte, setCompte] = useState<Compte | null>(null)
  const [refus, setRefus] = useState(false)
  const [organisation, setOrganisation] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [suppression, setSuppression] = useState<'repos' | 'envoi' | 'fait'>('repos')
  const [messageSuppr, setMessageSuppr] = useState<string | null>(null)
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
      setNom(c?.nom ?? '')
      setTelephone(c?.telephone ?? '')
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
        body: JSON.stringify({ organisation, nom, telephone }),
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
      setCompte(c); setOrganisation(c?.organisation ?? ''); setNom(c?.nom ?? ''); setTelephone(c?.telephone ?? '')
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

  // LOT 19 — tout compte non suspendu corrige ses coordonnées : depuis
  // l'inscription directe, plus aucun examen ne « fige » l'organisation.
  const modifiable = compte.etat !== 'suspendu'

  async function supprimer() {
    if (suppression === 'envoi' || !window.confirm(mots.supprimerConfirmer)) return
    setSuppression('envoi'); setMessageSuppr(null)
    try {
      const j = await jeton()
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/mon-compte`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${j}` },
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setMessageSuppr(typeof d.error === 'string' ? d.error : mots.refus); setSuppression('repos'); return }
      setSuppression('fait')
      await supabase.auth.signOut()
      window.location.assign(accueil)
    } catch { setMessageSuppr(mots.refus); setSuppression('repos') }
  }

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
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>{mots.coordonnees}</h2>
        {modifiable ? (
          <form onSubmit={enregistrer}>
            {([[mots.nom, nom, setNom, 'name', 'text'], [mots.organisation, organisation, setOrganisation, 'organization', 'text'], [mots.telephone, telephone, setTelephone, 'tel', 'tel']] as const).map(([libelle, valeur, poser, auto, type]) => (
              <label key={libelle} style={{ display: 'block', marginTop: 12, fontSize: 14, fontWeight: 600 }}>
                {libelle}
                <input type={type} autoComplete={auto} required={auto === 'organization'} minLength={2} value={valeur} style={{ ...champ, display: 'block' }}
                  onChange={(e) => { poser(e.target.value); if (etat !== 'repos') setEtat('repos') }} />
              </label>
            ))}
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
            // LOT 19 — par la route du site (Resend) : l'envoi de
            // l'authentification n'arrivait pas aux visiteurs.
            await fetch(`/api/sites/${encodeURIComponent(slug)}/mot-de-passe-oublie`, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email: compte.email }),
            })
            setCourrielEnvoye(true)
          }} style={{
            padding: '11px 20px', borderRadius: 999, cursor: 'pointer', fontWeight: 600,
            fontSize: 14.5, background: 'transparent', color: primary, border: `1px solid ${primary}`,
          }}>{mots.changerMotDePasse}</button>
        )}
      </section>

      {/* LOT 19 — « ce n'est pas une prison » : la personne peut partir. */}
      <section style={{ padding: '20px 22px', border: '1px solid #f1d5d5', borderRadius: 14, background: '#fff', marginTop: 22 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>{mots.supprimerTitre}</h2>
        <p style={{ margin: '0 0 14px', fontSize: 14.5, opacity: 0.75, lineHeight: 1.6 }}>{mots.supprimerTexte}</p>
        {suppression === 'fait' ? <p role="status">{mots.supprime}</p> : (
          <button type="button" onClick={() => void supprimer()} disabled={suppression === 'envoi'} style={{
            padding: '11px 20px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 14.5,
            background: 'transparent', color: '#9b1c1c', border: '1px solid #9b1c1c', opacity: suppression === 'envoi' ? 0.6 : 1,
          }}>{mots.supprimerBouton}</button>
        )}
        {messageSuppr && <p role="alert" style={{ color: '#9b1c1c', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>{messageSuppr}</p>}
      </section>
    </div>
  )
}
