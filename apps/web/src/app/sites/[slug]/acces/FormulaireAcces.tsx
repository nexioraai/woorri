'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 11 — LES TROIS ÉCRANS D'ACCÈS, UN SEUL COMPOSANT.
//
// ── POURQUOI PAS TROIS.
//
// Connexion, inscription et mot de passe oublié partagent la même boîte, le
// même bouton, les mêmes refus. Trois copies, c'est trois endroits où le
// message d'erreur diverge — et ce dossier a déjà payé ça avec `ctaHref`,
// recopié dans quatre thèmes jusqu'à ce que deux d'entre eux ne disent plus
// la même chose.
//
// ── L'INSCRIPTION PASSE PAR UNE SEULE ROUTE, ET C'EST ELLE QUI CRÉE TOUT.
//
// LOT 17, décision du propriétaire (2026-11-10) : pas de courriel de
// confirmation, pas d'examen par la Centrale. L'écran envoie nom,
// organisation, type, téléphone, adresse et mot de passe à
// `/api/sites/<slug>/inscription` ; la route crée l'accès ET le compte de
// site. L'écran, lui, ne décide de rien : il se connecte ensuite avec le mot
// de passe saisi, comme n'importe quelle connexion.
//
// La connexion et l'oubli, eux, parlent toujours à l'authentification seule.
//
// ── « UN COURRIEL VOUS A ÉTÉ ENVOYÉ », MÊME QUAND NON.
//
// Pour l'oubli du mot de passe, la réponse est la MÊME que l'adresse soit
// connue ou non. Distinguer ferait de cette page un testeur d'adresses : on
// y saisirait des courriels un par un pour savoir qui travaille avec la
// Centrale. C'est la règle de `fetchPage` et du suivi de demande, appliquée
// ici.
// ============================================================================

export type EcranAcces = 'connexion' | 'inscription' | 'oubli'

export type LibellesAcces = {
  courriel: string
  motDePasse: string
  envoyer: string
  envoi: string
  /** Ce qu'on affiche quand tout s'est bien passé. */
  succes: string
  /** Le refus, le MÊME quelle qu'en soit la cause. */
  refus: string
  minimum: string
}

/** Les champs propres à l'inscription (LOT 17). */
export type ChampsInscription = {
  nom: string; organisation: string; role: string; fournisseur: string; structure: string
  telephone: string
  /** Quand l'adresse a déjà un compte. */
  deja: string
}

export default function FormulaireAcces({
  ecran, destination, libelles, primary, slug, champs, voir,
}: {
  ecran: EcranAcces
  /** Où aller une fois entré. Toujours une adresse DE CE SITE. */
  destination: string
  libelles: LibellesAcces
  primary: string
  /** Pour l'inscription : le site à qui s'adresser. */
  slug?: string
  champs?: ChampsInscription
  /** Les mots de l'œil du mot de passe. */
  voir?: { afficher: string; masquer: string }
}) {
  const [visible, setVisible] = useState(false)
  const [courriel, setCourriel] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'fait' | 'refus'>('repos')
  const [nom, setNom] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [role, setRole] = useState<'fournisseur' | 'structure'>('fournisseur')
  const [telephone, setTelephone] = useState('')
  const [piege, setPiege] = useState('')
  // Le refus de l'inscription dit SA cause : la personne doit savoir quel
  // champ corriger. (La connexion, elle, garde son refus unique.)
  const [message, setMessage] = useState('')

  const demandeUnMotDePasse = ecran !== 'oubli'

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (etat === 'envoi') return

    // HUIT SIGNES AU MOINS, vérifiés ICI AUSSI. Supabase les impose déjà,
    // mais son refus arrive en anglais et après un aller-retour : le dire
    // avant évite à quelqu'un de croire que le service est en panne.
    if (demandeUnMotDePasse && motDePasse.length < 8) { setEtat('refus'); return }

    setEtat('envoi')
    try {
      if (ecran === 'connexion') {
        const { error } = await supabase.auth.signInWithPassword({ email: courriel.trim(), password: motDePasse })
        if (error) { setEtat('refus'); return }
        window.location.assign(destination)
        return
      }

      if (ecran === 'inscription') {
        const site = encodeURIComponent(String(slug))
        const r = await fetch(`/api/sites/${site}/inscription`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nom, organisation, role, telephone, email: courriel.trim(), motDePasse, site_web: piege }),
        })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) {
          // Le serveur dit QUOI faire (mot de passe déjà utilisé, champ à corriger).
          setMessage(String(d.error ?? (r.status === 409 && champs ? champs.deja : libelles.refus)))
          setEtat('refus'); return
        }
        // LE COMPTE EST CRÉÉ : on entre avec le mot de passe saisi.
        const { error } = await supabase.auth.signInWithPassword({ email: courriel.trim(), password: motDePasse })
        if (error) { setEtat('fait'); return }
        window.location.assign(destination)
        return
      }

      // OUBLI — on ne regarde même pas la réponse. Elle est la même pour
      // une adresse connue et pour une adresse inventée.
      // LOT 19 — par la route du site, qui envoie le lien par Resend : le
      // courriel de l'authentification n'arrivait pas aux visiteurs.
      const site = encodeURIComponent(String(slug))
      await fetch(`/api/sites/${site}/mot-de-passe-oublie`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: courriel.trim() }),
      })
      setEtat('fait')
    } catch {
      setEtat('refus')
    }
  }

  const champ: React.CSSProperties = {
    width: '100%', padding: '12px 14px', fontSize: 16,
    border: '1px solid #d9d9d9', borderRadius: 10, background: '#fff',
    color: '#111', marginTop: 6,
  }

  if (etat === 'fait') {
    return (
      <p role="status" style={{
        padding: '16px 18px', borderRadius: 12, fontSize: 15, lineHeight: 1.6,
        background: `color-mix(in srgb, ${primary} 8%, #ffffff)`,
        border: `1px solid color-mix(in srgb, ${primary} 25%, #ffffff)`,
        color: '#111', margin: 0, maxWidth: '58ch',
      }}>{libelles.succes}</p>
    )
  }

  const inscription = ecran === 'inscription' && champs
  const effacer = () => { if (etat === 'refus') { setEtat('repos'); setMessage('') } }

  return (
    <form onSubmit={envoyer} style={{ maxWidth: 420 }}>
      {inscription && (<>
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{champs.nom}</span>
          <input type="text" required minLength={2} maxLength={120} autoComplete="name" value={nom} style={champ}
            onChange={(e) => { setNom(e.target.value); effacer() }} />
        </label>
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{champs.organisation}</span>
          <input type="text" required minLength={2} maxLength={300} autoComplete="organization" value={organisation} style={champ}
            onChange={(e) => { setOrganisation(e.target.value); effacer() }} />
        </label>
        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 14px' }}>
          <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{champs.role}</legend>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['fournisseur', 'structure'] as const).map((r) => (
              <label key={r} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${role === r ? primary : '#d9d9d9'}`,
                background: role === r ? `color-mix(in srgb, ${primary} 8%, #fff)` : '#fff', fontSize: 15,
              }}>
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
                {r === 'fournisseur' ? champs.fournisseur : champs.structure}
              </label>
            ))}
          </div>
        </fieldset>
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{champs.telephone}</span>
          <input type="tel" required autoComplete="tel" value={telephone} style={champ} placeholder="+235 …"
            onChange={(e) => { setTelephone(e.target.value); effacer() }} />
        </label>
        {/* LE PIÈGE À ROBOTS : invisible, jamais rempli par un humain. */}
        <input type="text" name="site_web" tabIndex={-1} autoComplete="off" aria-hidden="true" value={piege}
          onChange={(e) => setPiege(e.target.value)}
          style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />
      </>)}

      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{libelles.courriel}</span>
        <input type="email" required autoComplete="email" value={courriel} style={champ}
          onChange={(e) => { setCourriel(e.target.value); effacer() }} />
      </label>

      {demandeUnMotDePasse && (
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{libelles.motDePasse}</span>
          {/* L'ŒIL : voir ce qu'on tape, surtout sur un téléphone. */}
          <span style={{ position: 'relative', display: 'block' }}>
            <input type={visible ? 'text' : 'password'} required minLength={8} value={motDePasse}
              style={{ ...champ, paddingRight: 48 }}
              autoComplete={ecran === 'inscription' ? 'new-password' : 'current-password'}
              onChange={(e) => { setMotDePasse(e.target.value); effacer() }} />
            <button type="button" onClick={() => setVisible(!visible)}
              aria-label={visible ? (voir?.masquer ?? 'Masquer le mot de passe') : (voir?.afficher ?? 'Afficher le mot de passe')}
              aria-pressed={visible}
              style={{ position: 'absolute', right: 6, top: 'calc(50% + 3px)', transform: 'translateY(-50%)',
                width: 38, height: 38, border: 'none', background: 'transparent', cursor: 'pointer', color: '#555' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', margin: 'auto' }}>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
                {visible && <path d="M3 3l18 18" />}
              </svg>
            </button>
          </span>
          <span style={{ fontSize: 13, opacity: 0.65, display: 'block', marginTop: 5 }}>{libelles.minimum}</span>
        </label>
      )}

      {etat === 'refus' && (
        <p role="alert" style={{ fontSize: 14, color: '#9b1c1c', margin: '0 0 14px', lineHeight: 1.5 }}>
          {message || libelles.refus}
        </p>
      )}

      <button type="submit" disabled={etat === 'envoi'} style={{
        padding: '12px 22px', fontSize: 15, fontWeight: 600, borderRadius: 999,
        background: primary, color: '#fff', border: 'none',
        cursor: etat === 'envoi' ? 'progress' : 'pointer', opacity: etat === 'envoi' ? 0.7 : 1,
      }}>{etat === 'envoi' ? libelles.envoi : libelles.envoyer}</button>
    </form>
  )
}
