'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// LOT 14.3 — LE JOURNAL D'AUDIT, LU PAR LA CENTRALE. Qui a fait quoi, quand.
// Immuable en base : cet écran ne propose aucune action, il n'y en a aucune.

type Entree = { id: number; le: string; acteur: string; via_admin: boolean; action: string; cible: string }

const LIBELLE: Record<string, string> = {
  'compte.etat': 'a changé l’état du compte', 'compte.qualifier': 'a prononcé une qualification',
  'avis.creer': 'a créé l’avis', 'avis.modifier': 'a modifié l’avis', 'avis.etat': 'a changé l’état de l’avis',
  'avis.publier': 'a publié ou dépublié l’avis',
  'offre.decider': 'a décidé d’une offre', 'offre.repondre': 'a répondu à une offre',
  'demande.etat': 'a changé l’état de la demande', 'demande.repondre': 'a répondu à la demande',
}

export default function Journal({ slug }: { slug: string }) {
  const [entrees, setEntrees] = useState<Entree[] | null>(null)

  useEffect(() => {
    let vivant = true
    void (async () => {
      const { data } = await supabase.auth.getSession()
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/journal`, {
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` }, cache: 'no-store',
      })
      const d = await r.json().catch(() => ({}))
      if (vivant && r.ok) setEntrees(d.entrees ?? [])
    })()
    return () => { vivant = false }
  }, [slug])

  return (
    <section style={{ marginTop: 44 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Journal d’audit</h2>
      <p style={{ fontSize: 14, opacity: 0.65, margin: '0 0 14px' }}>
        Chaque geste qui engage la Centrale, avec son auteur et son heure. Personne ne peut modifier ni effacer une entrée.
      </p>
      {entrees && entrees.length === 0 && <p style={{ opacity: 0.55 }}>Aucune entrée.</p>}
      <ol style={{ padding: 0, margin: 0 }}>
        {(entrees ?? []).map((e) => (
          <li key={e.id} style={{ listStyle: 'none', padding: '9px 0', fontSize: 14,
            borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ opacity: 0.5, fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>
              {e.le.slice(0, 16).replace('T', ' ')}
            </span>{' '}
            <strong>{e.acteur}</strong>
            {e.via_admin && <span style={{ color: '#f0b67a' }}> (administrateur Deribfy)</span>}{' '}
            {LIBELLE[e.action] ?? e.action} — <span style={{ opacity: 0.8 }}>{e.cible}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
