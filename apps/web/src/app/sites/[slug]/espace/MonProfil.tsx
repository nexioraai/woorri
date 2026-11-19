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
  modifier: string; annuler: string; membreDepuis: string; ong: string; nonRenseigne: string; courriel: string
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
  // CPA, 2026-11-19 — les coordonnées se LISENT d'abord ; « Modifier » ouvre le formulaire.
  const [edition, setEdition] = useState(false)
  const [typeClient, setTypeClient] = useState<string | null>(null)

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
      setTypeClient(typeof d.typeClient === 'string' ? d.typeClient : null)
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
      setEtat('fait'); setEdition(false)
    } catch { setEtat('erreur'); setMessage(mots.refus) }
  }

  const champ: React.CSSProperties = {
    width: '100%', maxWidth: 420, padding: '12px 14px', fontSize: 16, marginTop: 6,
    border: '1px solid #d9d9d9', borderRadius: 10, background: '#fff', color: '#111',
  }

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

  const qualite = compte.role === 'structure' && typeClient === 'ong' ? mots.ong : (mots.roles[compte.role] ?? compte.role)
  const motsNom = (compte.nom || compte.organisation || '?').trim().split(/\s+/).filter(Boolean)
  const initiales = ((motsNom[0]?.[0] ?? '?') + (motsNom.length > 1 ? motsNom[motsNom.length - 1][0] : '')).toUpperCase()
  const depuis = (() => { try { return new Date(compte.cree_le).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' } })()
  const valeur = (v: string | null | undefined) => v?.trim() ? v : <span style={{ color: '#9ca3af' }}>{mots.nonRenseigne}</span>

  return (
    <div className="monProfil">
      <style>{`
        .monProfil .pCarte { border: 1px solid #e8eaee; border-radius: 20px; background: #fff; padding: 22px 24px; margin-bottom: 18px;
          box-shadow: 0 18px 40px -34px rgba(17,24,39,.35) }
        .monProfil .pTete { display: flex; align-items: center; gap: 16px; flex-wrap: wrap }
        .monProfil .pAvatar { width: 64px; height: 64px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 800; color: #fff; background: linear-gradient(140deg, ${primary}, color-mix(in srgb, ${primary} 55%, #22c55e)) }
        .monProfil .pNom { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.01em }
        .monProfil .pSous { margin: 2px 0 0; color: #4b5563; font-size: 14.5px }
        .monProfil .pEtat { margin-inline-start: auto; display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px;
          font-size: 12.5px; font-weight: 700; color: #166534; background: #dcfce7 }
        .monProfil .pGrille { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 18px }
        .monProfil .pInfo { padding: 12px 14px; border-radius: 14px; background: #f8f9fb; border: 1px solid #eef0f3 }
        .monProfil .pInfo small { display: block; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6b7280; margin-bottom: 4px }
        .monProfil .pInfo span { font-size: 15px; overflow-wrap: anywhere }
        .monProfil .pEnTete { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 4px }
        .monProfil .pBouton { padding: 9px 16px; border-radius: 999px; cursor: pointer; font-weight: 700; font-size: 14px;
          background: transparent; color: ${primary}; border: 1px solid ${primary}; transition: background .18s ease, color .18s ease, transform .18s ease }
        .monProfil .pBouton:hover { background: ${primary}; color: #fff; transform: translateY(-1px) }
        .monProfil .pForm { animation: pOuvre .32s cubic-bezier(.22,.8,.3,1) both }
        @keyframes pOuvre { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .monProfil .pForm { animation: none } .monProfil .pBouton { transition: none } }
      `}</style>

      <section className="pCarte">
        <div className="pTete">
          <span className="pAvatar" aria-hidden>{initiales}</span>
          <div style={{ minWidth: 0 }}>
            <h2 className="pNom">{compte.nom || compte.organisation || compte.email}</h2>
            <p className="pSous">{compte.organisation}{compte.organisation ? ' · ' : ''}{qualite}</p>
          </div>
          <span className="pEtat" style={compte.etat === 'actif' ? undefined : { color: '#9b1c1c', background: '#fee2e2' }}>
            {mots.etat} : {mots.etats[compte.etat] ?? compte.etat}
          </span>
        </div>
        <div className="pGrille">
          <div className="pInfo"><small>{mots.courriel}</small><span>{compte.email}</span></div>
          {depuis && <div className="pInfo"><small>{mots.membreDepuis}</small><span>{depuis}</span></div>}
          {compte.reference && <div className="pInfo"><small>{mots.reference}</small><span style={{ fontFamily: 'ui-monospace, monospace' }}>{compte.reference}</span></div>}
        </div>
      </section>

      <section className="pCarte">
        <div className="pEnTete">
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{mots.coordonnees}</h2>
          {modifiable && !edition && (
            <button type="button" className="pBouton" onClick={() => { setEdition(true); setEtat('repos'); setMessage(null) }}>{mots.modifier}</button>
          )}
        </div>
        {etat === 'fait' && !edition && <p role="status" style={{ color: '#16794a', fontSize: 14, margin: '8px 0 0' }}>{mots.enregistre}</p>}
        {!modifiable && <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.7, lineHeight: 1.6 }}>{mots.figee}</p>}
        {!edition ? (
          <div className="pGrille">
            <div className="pInfo"><small>{mots.nom}</small><span>{valeur(compte.nom)}</span></div>
            <div className="pInfo"><small>{mots.organisation}</small><span>{valeur(compte.organisation)}</span></div>
            <div className="pInfo"><small>{mots.telephone}</small><span>{valeur(compte.telephone)}</span></div>
          </div>
        ) : (
          <form onSubmit={enregistrer} className="pForm">
            {([[mots.nom, nom, setNom, 'name', 'text'], [mots.organisation, organisation, setOrganisation, 'organization', 'text'], [mots.telephone, telephone, setTelephone, 'tel', 'tel']] as const).map(([libelle, v, poser, auto, type]) => (
              <label key={libelle} style={{ display: 'block', marginTop: 12, fontSize: 14, fontWeight: 600 }}>
                {libelle}
                <input type={type} autoComplete={auto} required={auto === 'organization'} minLength={2} value={v} style={{ ...champ, display: 'block' }}
                  onChange={(e) => { poser(e.target.value); if (etat !== 'repos') setEtat('repos') }} />
              </label>
            ))}
            <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="submit" disabled={etat === 'envoi'} style={{
                padding: '11px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14.5, background: primary, color: '#fff', opacity: etat === 'envoi' ? 0.7 : 1,
              }}>{etat === 'envoi' ? mots.enregistrement : mots.enregistrer}</button>
              <button type="button" onClick={() => { setEdition(false); setNom(compte.nom ?? ''); setOrganisation(compte.organisation ?? ''); setTelephone(compte.telephone ?? ''); setMessage(null) }}
                style={{ padding: '11px 18px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14.5 }}>
                {mots.annuler}
              </button>
            </div>
            {message && <p role="alert" style={{ color: '#9b1c1c', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>{message}</p>}
          </form>
        )}
      </section>

      <section className="pCarte">
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>{mots.motDePasse}</h2>
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
      <section className="pCarte" style={{ borderColor: '#f1d5d5' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>{mots.supprimerTitre}</h2>
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
