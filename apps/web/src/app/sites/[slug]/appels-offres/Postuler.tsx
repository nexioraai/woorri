'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 13.1 — POSTULER À UN APPEL D'OFFRES.
//
// ── CE QUE LE PROPRIÉTAIRE A DÉCRIT, 2026-11-09.
//
// « les fournisseurs proposent leur prix, upload leur pdf, un champ de leur
// nom, contact, puis postuler et cpa reçoit. »
//
// ── IL FAUT UN COMPTE ACTIF, ET L'ÉCRAN LE DIT AVANT LE FORMULAIRE.
//
// « postuler doit exiger création d'un compte auprès de cpa, car cpa doit
// savoir c'est qui. » Montrer le formulaire à quelqu'un qui sera refusé à
// l'envoi lui fait remplir six champs pour rien. On lui dit d'abord où il
// en est, et quoi faire.
//
// ── ET CET ÉCRAN NE DÉCIDE RIEN.
//
// Il lit l'état du compte par la route, et laisse la route refuser. Masquer
// un bouton ne protège pas : il suffirait d'appeler l'API à la main.
// ============================================================================

export type MotsPostuler = {
  titre: string
  chargement: string
  connectezVous: string
  seConnecter: string
  demandezAcces: string
  versEspace: string
  enAttente: string
  suspendu: string
  ferme: string
  nom: string
  nomAide: string
  contact: string
  contactAide: string
  prix: string
  prixAide: string
  devise: string
  fichier: string
  fichierAide: string
  envoyer: string
  envoi: string
  deposee: string
  deposeeDetail: string
  erreur: string
}

type Compte = { etat: 'en_attente' | 'actif' | 'suspendu' } | null

export default function Postuler({
  slug, base, avisId, etatAvis, remiseLe, mots, primary,
}: {
  slug: string
  base: string
  avisId: string
  /** L'état déclaré de l'avis. Le serveur le lit, il ne l'interprète pas. */
  etatAvis: string
  /**
   * La date limite de remise, telle quelle.
   *
   * ── POURQUOI L'ÉCRAN COMPARE, ET PAS LE SERVEUR.
   *
   * Le serveur rend une page qui peut être MISE EN CACHE : une comparaison
   * faite à son rendu dirait « ouvert » longtemps après l'échéance.
   * `react-hooks/purity` l'a refusée pour exactement cette raison, et elle
   * avait raison. Ici la comparaison se fait au montage, donc à l'heure où
   * quelqu'un regarde vraiment.
   *
   * ET CE N'EST PAS LA GARDE. La route refuse déjà après l'échéance :
   * l'écran évite un formulaire inutile, il n'autorise rien.
   */
  remiseLe: string | null
  mots: MotsPostuler
  primary: string
}) {
  const [etat, setEtat] = useState<'charge' | 'anonyme' | 'connu' | 'panne'>('charge')
  // L'HEURE SE LIT AU MONTAGE, jamais pendant le rendu. `null` tant qu'on
  // n'a pas regardé : on n'affirme pas « ouvert » avant d'avoir comparé.
  const [depasse, setDepasse] = useState<boolean | null>(null)
  const [compte, setCompte] = useState<Compte>(null)
  const [envoi, setEnvoi] = useState(false)
  const [faite, setFaite] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const form = useRef<HTMLFormElement>(null)

  const charger = useCallback(async (encoreLa: () => boolean = () => true) => {
    // LA DATE LIMITE, COMPARÉE À L'HEURE RÉELLE DU VISITEUR.
    setDepasse(remiseLe ? Date.parse(remiseLe) < Date.now() : false)
    const { data } = await supabase.auth.getSession()
    const j = data.session?.access_token
    if (!encoreLa()) return
    if (!j) { setEtat('anonyme'); return }
    try {
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/mon-compte`, {
        headers: { Authorization: `Bearer ${j}` }, cache: 'no-store',
      })
      if (!encoreLa()) return
      if (r.status === 403) { setEtat('anonyme'); return }
      if (!r.ok) { setEtat('panne'); return }
      const d = await r.json()
      if (!encoreLa()) return
      setCompte((d.compte ?? null) as Compte)
      setEtat('connu')
    } catch { if (encoreLa()) setEtat('panne') }
  }, [slug, remiseLe])

  useEffect(() => {
    let vivant = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : cet effet ne tourne qu'au montage et l'état posé ne redéclenche aucun effet. L'état du compte se lit par une requête portant le jeton, qui n'existe que dans le navigateur.
    void charger(() => vivant)
    return () => { vivant = false }
  }, [charger])

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (envoi) return
    setEnvoi(true); setMessage(null)
    try {
      const { data } = await supabase.auth.getSession()
      const j = data.session?.access_token
      const corps = new FormData(e.currentTarget)
      corps.append('avis', avisId)
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/offres`, {
        method: 'POST', headers: { Authorization: `Bearer ${j}` }, body: corps,
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setMessage(typeof d.error === 'string' ? d.error : mots.erreur); return }
      setFaite(true)
      form.current?.reset()
    } catch { setMessage(mots.erreur) } finally { setEnvoi(false) }
  }

  const cadre: React.CSSProperties = {
    marginTop: 40, padding: '24px 26px', borderRadius: 16,
    border: `1px solid color-mix(in srgb, ${primary} 22%, #ffffff)`,
    background: `color-mix(in srgb, ${primary} 4%, #ffffff)`,
  }
  const champ: React.CSSProperties = {
    width: '100%', maxWidth: 460, padding: '12px 14px', fontSize: 16, marginTop: 6,
    border: '1px solid #d9d9d9', borderRadius: 10, background: '#fff', color: '#111',
  }
  const aide: React.CSSProperties = { display: 'block', fontSize: 13, opacity: 0.62, marginTop: 5, lineHeight: 1.5 }
  const bouton: React.CSSProperties = {
    padding: '13px 26px', fontSize: 15.5, fontWeight: 600, borderRadius: 999,
    background: primary, color: '#fff', border: 'none', cursor: 'pointer',
  }

  const titre = <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 14px' }}>{mots.titre}</h2>

  // L'AVIS FERMÉ SE DIT, quel que soit l'état du compte : inutile de
  // demander à quelqu'un de se connecter pour un marché déjà clos.
  //
  // `depasse === null` veut dire « pas encore comparé » — on attend plutôt
  // que d'affirmer. Le confondre avec `false` afficherait le formulaire une
  // fraction de seconde sur un avis clos.
  const ouvert = etatAvis === 'ouvert' && depasse === false
  if (depasse !== null && !ouvert) {
    return <section style={cadre}>{titre}<p style={{ margin: 0, lineHeight: 1.65 }}>{mots.ferme}</p></section>
  }
  if (etat === 'charge') return <section style={cadre}>{titre}<p style={{ opacity: 0.6, margin: 0 }}>{mots.chargement}</p></section>
  if (etat === 'panne') return <section style={cadre}>{titre}<p role="alert" style={{ color: '#9b1c1c', margin: 0 }}>{mots.erreur}</p></section>

  if (etat === 'anonyme') {
    return (
      <section style={cadre}>
        {titre}
        <p style={{ margin: '0 0 16px', lineHeight: 1.65 }}>{mots.connectezVous}</p>
        <a href={`${base}/connexion`} style={{ ...bouton, display: 'inline-block', textDecoration: 'none' }}>
          {mots.seConnecter}
        </a>
      </section>
    )
  }

  if (!compte) {
    return (
      <section style={cadre}>
        {titre}
        <p style={{ margin: '0 0 16px', lineHeight: 1.65 }}>{mots.demandezAcces}</p>
        <a href={`${base}/espace-client`} style={{ ...bouton, display: 'inline-block', textDecoration: 'none' }}>
          {mots.versEspace}
        </a>
      </section>
    )
  }

  if (compte.etat !== 'actif') {
    return (
      <section style={cadre}>
        {titre}
        <p style={{ margin: 0, lineHeight: 1.65 }}>
          {compte.etat === 'en_attente' ? mots.enAttente : mots.suspendu}
        </p>
      </section>
    )
  }

  if (faite) {
    return (
      <section style={{ ...cadre, background: 'color-mix(in srgb, #16794a 7%, #ffffff)', borderColor: 'color-mix(in srgb, #16794a 30%, #ffffff)' }}>
        {titre}
        <p style={{ margin: 0, fontWeight: 600, color: '#115c38', lineHeight: 1.65 }}>{mots.deposee}</p>
        <p style={{ margin: '10px 0 0', lineHeight: 1.65 }}>{mots.deposeeDetail}</p>
      </section>
    )
  }

  return (
    <section style={cadre}>
      {titre}
      <form ref={form} onSubmit={envoyer}>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>{mots.nom}</span>
          <input name="nom" required minLength={2} style={champ} />
          <span style={aide}>{mots.nomAide}</span>
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>{mots.contact}</span>
          <input name="contact" required minLength={3} style={champ} />
          <span style={aide}>{mots.contactAide}</span>
        </label>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <label style={{ flex: '1 1 220px' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{mots.prix}</span>
            <input name="prix" inputMode="decimal" style={champ} />
            <span style={aide}>{mots.prixAide}</span>
          </label>
          <label style={{ flex: '0 1 140px' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{mots.devise}</span>
            <input name="devise" defaultValue="XAF" style={champ} />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>{mots.fichier}</span>
          <input type="file" name="fichier" required style={{ display: 'block', marginTop: 8, fontSize: 14 }} />
          <span style={aide}>{mots.fichierAide}</span>
        </label>

        {message && <p role="alert" style={{ color: '#9b1c1c', margin: '0 0 14px', lineHeight: 1.55 }}>{message}</p>}

        <button type="submit" disabled={envoi} style={{ ...bouton, opacity: envoi ? 0.7 : 1 }}>
          {envoi ? mots.envoi : mots.envoyer}
        </button>
      </form>
    </section>
  )
}
