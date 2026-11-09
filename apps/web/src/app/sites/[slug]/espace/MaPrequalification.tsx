'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { etatDuDossier, type PieceExigee } from './piecesFournisseur'

// ============================================================================
// LOT 12.3 — OÙ EN EST MON EXAMEN.
//
// ── DEUX CHOSES QUI NE SE CONFONDENT PAS.
//
// Le DOSSIER est à moi : complet ou non, c'est un fait que je constate. La
// QUALIFICATION est à la Centrale : c'est un verdict qu'elle prononce. Un
// dossier complet ne qualifie personne, et un dossier incomplet ne
// disqualifie pas — il n'a simplement pas encore été examiné.
//
// Les afficher ensemble sans les distinguer ferait croire qu'avoir déposé
// ses pièces suffit.
//
// ── « NON EXAMINÉ » SE DIT, IL NE SE TAIT PAS.
//
// C'est l'état le plus fréquent et le plus inquiétant pour celui qui
// attend. Une page qui n'afficherait rien tant qu'aucun verdict n'est tombé
// ferait croire à une panne.
//
// ── ET CET ÉCRAN NE VOIT QUE SON PROPRE COMPTE.
//
// La route cherche la ligne par l'identifiant du jeton. Exigence du
// propriétaire : « les fournisseurs ne devraient pas vu par d'autres
// fournisseurs, si c prequalifié ou qualifié ou rejeté. »
// ============================================================================

type Compte = {
  etat: 'en_attente' | 'actif' | 'suspendu'
  qualification: 'non_examinee' | 'prequalifie' | 'qualifie' | 'rejete'
  qualification_le: string | null
  role: string
}

export type MotsPrequalification = {
  chargement: string
  refus: string
  verdict: string
  prononceLe: string
  dossier: string
  dossierComplet: string
  dossierIncomplet: string
  aucuneExigence: string
  versLeDossier: string
  etats: Record<string, string>
  explications: Record<string, string>
}

export default function MaPrequalification({
  slug, base, pieces, mots, primary,
}: { slug: string; base: string; pieces: PieceExigee[]; mots: MotsPrequalification; primary: string }) {
  const [compte, setCompte] = useState<Compte | null>(null)
  const [documents, setDocuments] = useState<{ piece: string | null; retire_le: string | null }[]>([])
  const [refus, setRefus] = useState(false)

  const charger = useCallback(async (encoreLa: () => boolean = () => true) => {
    const { data } = await supabase.auth.getSession()
    const j = data.session?.access_token
    if (!encoreLa()) return
    if (!j) { setRefus(true); return }
    const entete = { Authorization: `Bearer ${j}` }
    try {
      const [rc, rd] = await Promise.all([
        fetch(`/api/sites/${encodeURIComponent(slug)}/mon-compte`, { headers: entete, cache: 'no-store' }),
        fetch(`/api/sites/${encodeURIComponent(slug)}/documents`, { headers: entete, cache: 'no-store' }),
      ])
      if (!encoreLa()) return
      if (!rc.ok) { setRefus(true); return }
      const dc = await rc.json()
      if (!encoreLa()) return
      setCompte((dc.compte ?? null) as Compte | null)
      // LES DOCUMENTS SONT FACULTATIFS ICI : un compte non actif ne les
      // obtient pas, et ce n'est pas une panne — c'est son état.
      if (rd.ok) {
        const dd = await rd.json()
        if (encoreLa()) setDocuments(dd.documents ?? [])
      }
    } catch { if (encoreLa()) setRefus(true) }
  }, [slug])

  useEffect(() => {
    let vivant = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : cet effet ne tourne qu'au montage et l'état posé ne redéclenche aucun effet. L'état se lit par une requête portant le jeton, qui n'existe que dans le navigateur.
    void charger(() => vivant)
    return () => { vivant = false }
  }, [charger])

  if (refus) return <p role="alert" style={{ color: '#9b1c1c', lineHeight: 1.6 }}>{mots.refus}</p>
  if (!compte) return <p style={{ opacity: 0.6 }}>{mots.chargement}</p>

  const q = compte.qualification
  const teinte = q === 'qualifie' ? '#16794a' : q === 'rejete' ? '#9b1c1c' : q === 'prequalifie' ? '#1d4ed8' : '#b45309'
  const { manquantes, complet } = etatDuDossier(pieces, documents)

  const carte: React.CSSProperties = {
    padding: '20px 22px', borderRadius: 14, border: '1px solid #e6e6e6',
    background: '#fff', marginBottom: 18, lineHeight: 1.65,
  }

  return (
    <div>
      {/* LE VERDICT DE LA CENTRALE. Ce qu'ELLE a prononcé, et quand. */}
      <section style={{ ...carte, background: `color-mix(in srgb, ${teinte} 6%, #ffffff)` }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', opacity: 0.6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {mots.verdict}
        </h2>
        <p style={{ margin: 0, fontSize: 21, fontWeight: 700, color: teinte }}>
          {mots.etats[q] ?? q}
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 15 }}>{mots.explications[q] ?? ''}</p>
        {compte.qualification_le && (
          <p style={{ margin: '10px 0 0', fontSize: 13.5, opacity: 0.62 }}>
            {mots.prononceLe} {compte.qualification_le.slice(0, 10)}
          </p>
        )}
      </section>

      {/* LE DOSSIER, QUI EST À MOI. Un fait, pas un verdict. */}
      <section style={carte}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', opacity: 0.6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {mots.dossier}
        </h2>
        <p style={{ margin: 0, fontSize: 15.5 }}>
          {pieces.length === 0
            ? mots.aucuneExigence
            : complet
              ? mots.dossierComplet
              : mots.dossierIncomplet.replace('{n}', String(manquantes.length))}
        </p>
        {pieces.length > 0 && (
          <p style={{ margin: '12px 0 0' }}>
            <a href={`${base}/mon-dossier`} style={{ color: primary, fontWeight: 600 }}>
              {mots.versLeDossier} →
            </a>
          </p>
        )}
      </section>
    </div>
  )
}
