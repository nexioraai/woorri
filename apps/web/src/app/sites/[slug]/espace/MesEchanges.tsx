'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 11 — MES DEMANDES, MES RÉCLAMATIONS. UN SEUL COMPOSANT.
//
// Les deux listes ont la même forme, le même tri, les mêmes états. Deux
// copies, c'est deux endroits où l'un oubliera de dire qu'une ligne ancienne
// n'a pas de référence.
//
// ── CE QU'IL DIT QUAND IL NE PEUT PAS TOUT MONTRER.
//
// `messages.email` est l'adresse SAISIE dans le formulaire. Une demande
// envoyée depuis une autre adresse n'apparaît pas. La page le DIT : sans
// cette phrase, quelqu'un croirait sa demande perdue et la referait.
//
// ── ET QUAND UNE LIGNE N'A PAS DE RÉFÉRENCE.
//
// Mesuré le 2026-11-09 : les 37 messages existants sont antérieurs au lot 8
// qui a posé les références. Afficher une case vide ferait croire à une
// donnée manquante ; on écrit ce qui s'est passé.
// ============================================================================

export type Echange = {
  id: string
  reference: string | null
  subject: string | null
  type: 'demande' | 'reclamation'
  etat: string
  created_at: string
  maj_le: string | null
  extrait: string
}

export type MotsEchanges = {
  chargement: string
  refus: string
  vide: string
  autreAdresse: string
  sansReference: string
  deposee: string
  majLe: string
  etats: Record<string, string>
}

export default function MesEchanges({
  slug, type, mots, primary,
}: { slug: string; type: 'demande' | 'reclamation'; mots: MotsEchanges; primary: string }) {
  const [liste, setListe] = useState<Echange[] | null>(null)
  const [courriel, setCourriel] = useState<string | null>(null)
  const [refus, setRefus] = useState(false)

  const charger = useCallback(async (encoreLa: () => boolean = () => true) => {
    const { data } = await supabase.auth.getSession()
    const j = data.session?.access_token
    if (!encoreLa()) return
    if (!j) { setRefus(true); return }
    try {
      const r = await fetch(
        `/api/sites/${encodeURIComponent(slug)}/mes-demandes?type=${type}`,
        { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' },
      )
      if (!encoreLa()) return
      if (!r.ok) { setRefus(true); return }
      const d = await r.json()
      if (!encoreLa()) return
      setListe((d.demandes ?? []) as Echange[])
      setCourriel(typeof d.courriel === 'string' ? d.courriel : null)
    } catch { if (encoreLa()) setRefus(true) }
  }, [slug, type])

  useEffect(() => {
    let vivant = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : cet effet ne tourne qu'au montage et l'état posé ne redéclenche aucun effet. La liste se lit par une requête portant le jeton, qui n'existe que dans le navigateur.
    void charger(() => vivant)
    return () => { vivant = false }
  }, [charger])

  const date = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' }) }
    catch { return iso.slice(0, 10) }
  }

  if (refus) {
    return <p role="alert" style={{ color: '#9b1c1c', lineHeight: 1.6 }}>{mots.refus}</p>
  }
  if (!liste) return <p style={{ opacity: 0.6 }}>{mots.chargement}</p>

  return (
    <div>
      {liste.length === 0 ? (
        <p style={{
          padding: '18px 20px', borderRadius: 14, background: `color-mix(in srgb, ${primary} 5%, #ffffff)`,
          border: '1px solid #e6e6e6', lineHeight: 1.65, margin: 0,
        }}>{mots.vide}</p>
      ) : (
        <ul style={{ padding: 0, margin: 0 }}>
          {liste.map((e) => (
            <li key={e.id} style={{
              listStyle: 'none', padding: '16px 18px', marginBottom: 10,
              border: '1px solid #e6e6e6', borderRadius: 14, background: '#fff',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13.5, fontWeight: 700, color: primary }}>
                  {e.reference ?? <span style={{ fontFamily: 'inherit', fontWeight: 400, opacity: 0.6 }}>{mots.sansReference}</span>}
                </span>
                <span style={{
                  fontSize: 12.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                  background: `color-mix(in srgb, ${primary} 12%, #ffffff)`, color: primary,
                }}>{mots.etats[e.etat] ?? e.etat}</span>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: '#1c1c1c' }}>
                {e.subject || e.extrait}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13, opacity: 0.6 }}>
                {mots.deposee} {date(e.created_at)}
                {e.maj_le && e.maj_le !== e.created_at ? ` · ${mots.majLe} ${date(e.maj_le)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      {courriel && (
        <p style={{ marginTop: 22, fontSize: 13.5, lineHeight: 1.6, opacity: 0.7 }}>
          {mots.autreAdresse.replace('{adresse}', courriel)}
        </p>
      )}
    </div>
  )
}
