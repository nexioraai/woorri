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
// ── CE COMPOSANT NE CRÉE AUCUN COMPTE DE SITE.
//
// Il parle à l'authentification, et à elle seule. Demander un accès À LA
// CENTRALE est un autre geste, sur un autre écran, avec une autre route :
// s'inscrire ne donne aucun droit, et l'écran ne doit pas laisser croire le
// contraire.
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

export default function FormulaireAcces({
  ecran, destination, libelles, primary,
}: {
  ecran: EcranAcces
  /** Où aller une fois entré. Toujours une adresse DE CE SITE. */
  destination: string
  libelles: LibellesAcces
  primary: string
}) {
  const [courriel, setCourriel] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'fait' | 'refus'>('repos')

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
        const { error } = await supabase.auth.signUp({
          email: courriel.trim(),
          password: motDePasse,
          // LE RETOUR SE FAIT SUR CE SITE, jamais sur la plateforme. Une
          // confirmation qui ramènerait sur `deribfy.app` sortirait la
          // personne du site de la Centrale sans qu'elle comprenne pourquoi.
          options: { emailRedirectTo: `${window.location.origin}${destination}` },
        })
        if (error) { setEtat('refus'); return }
        setEtat('fait')
        return
      }

      // OUBLI — on ne regarde même pas la réponse. Elle est la même pour
      // une adresse connue et pour une adresse inventée.
      await supabase.auth.resetPasswordForEmail(courriel.trim(), {
        redirectTo: `${window.location.origin}${destination}`,
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

  return (
    <form onSubmit={envoyer} style={{ maxWidth: 420 }}>
      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{libelles.courriel}</span>
        <input type="email" required autoComplete="email" value={courriel} style={champ}
          onChange={(e) => { setCourriel(e.target.value); if (etat === 'refus') setEtat('repos') }} />
      </label>

      {demandeUnMotDePasse && (
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{libelles.motDePasse}</span>
          <input type="password" required minLength={8} value={motDePasse} style={champ}
            autoComplete={ecran === 'inscription' ? 'new-password' : 'current-password'}
            onChange={(e) => { setMotDePasse(e.target.value); if (etat === 'refus') setEtat('repos') }} />
          <span style={{ fontSize: 13, opacity: 0.65, display: 'block', marginTop: 5 }}>{libelles.minimum}</span>
        </label>
      )}

      {etat === 'refus' && (
        <p role="alert" style={{ fontSize: 14, color: '#9b1c1c', margin: '0 0 14px', lineHeight: 1.5 }}>
          {libelles.refus}
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
