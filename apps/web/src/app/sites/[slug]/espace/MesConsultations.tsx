'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 12.4 — MES CONSULTATIONS : LES MARCHÉS OUVERTS, VUS PAR UN FOURNISSEUR.
//
// Les avis sont publics : la liste se montre à tout compte actif. Ce que
// l'espace AJOUTE, c'est la situation du fournisseur face à chacun — déjà
// répondu ou non — et son droit d'y répondre, qui suit sa qualification.
//
// L'HEURE SE LIT AU MONTAGE, jamais pendant le rendu : la page peut être en
// cache, et « ouvert » resterait affiché après la date limite. Leçon du 13.1.
// ============================================================================

export type AvisOuvert = { reference: string; reference_slug: string; objet: string; remise_le: string | null; etat: string }

export type MotsConsultations = {
  titre: string; phrase: string; chargement: string; aucune: string
  repondre: string; dejaRepondu: string; limite: string
  nonQualifie: string; versDossier: string; refus: string
}

export default function MesConsultations({
  slug, base, avis, mots, primary,
}: { slug: string; base: string; avis: AvisOuvert[]; mots: MotsConsultations; primary: string }) {
  const [etat, setEtat] = useState<'charge' | 'refus' | 'pret'>('charge')
  const [qualifie, setQualifie] = useState(false)
  const [repondus, setRepondus] = useState<Set<string>>(new Set())
  const [maintenant, setMaintenant] = useState<number | null>(null)

  useEffect(() => {
    let vivant = true
    void (async () => {
      const { data } = await supabase.auth.getSession()
      const j = data.session?.access_token
      if (!j) { if (vivant) setEtat('refus'); return }
      const h = { Authorization: `Bearer ${j}` }
      const [rc, ro] = await Promise.all([
        fetch(`/api/sites/${encodeURIComponent(slug)}/mon-compte`, { headers: h, cache: 'no-store' }),
        fetch(`/api/sites/${encodeURIComponent(slug)}/offres`, { headers: h, cache: 'no-store' }),
      ])
      const dc = await rc.json().catch(() => ({}))
      const dO = ro.ok ? await ro.json().catch(() => ({})) : {}
      if (!vivant) return
      if (!rc.ok || dc.compte?.etat !== 'actif') { setEtat('refus'); return }
      setQualifie(['prequalifie', 'qualifie'].includes(dc.compte?.qualification))
      setRepondus(new Set(((dO.offres ?? []) as { avis?: { reference?: string } }[])
        .map((o) => o.avis?.reference ?? '').filter(Boolean)))
      setMaintenant(Date.now())
      setEtat('pret')
    })()
    return () => { vivant = false }
  }, [slug])

  if (etat === 'charge') return <p style={{ opacity: 0.6 }}>{mots.chargement}</p>
  if (etat === 'refus') return <p role="alert" style={{ color: '#9b1c1c' }}>{mots.refus}</p>

  const ouverts = avis.filter((a) => a.etat === 'ouvert'
    && (!a.remise_le || (maintenant !== null && Date.parse(a.remise_le) >= maintenant)))

  return (
    <div>
      {!qualifie && (
        // LE DROIT DE RÉPONDRE SUIT LA QUALIFICATION, ET L'ÉCRAN LE DIT
        // AVANT LA LISTE plutôt que de laisser cliquer pour rien.
        <p style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 18, lineHeight: 1.6,
          background: 'color-mix(in srgb, #b45309 10%, #ffffff)', color: '#8a3f07' }}>
          {mots.nonQualifie}{' '}
          <a href={`${base}/mon-dossier`} style={{ color: primary, fontWeight: 600 }}>{mots.versDossier} →</a>
        </p>
      )}
      {ouverts.length === 0 && <p style={{ opacity: 0.6 }}>{mots.aucune}</p>}
      <ul style={{ padding: 0, margin: 0 }}>
        {ouverts.map((a) => (
          <li key={a.reference_slug} style={{ listStyle: 'none', padding: '15px 18px', marginBottom: 10,
            border: '1px solid #e6e6e6', borderRadius: 14, background: '#fff' }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15.5 }}>{a.objet}</p>
            <p style={{ margin: '4px 0 10px', fontSize: 13, opacity: 0.6, fontFamily: 'ui-monospace, monospace' }}>
              {a.reference}{a.remise_le ? ` · ${mots.limite} ${a.remise_le.slice(0, 10)}` : ''}
            </p>
            {repondus.has(a.reference)
              ? <span style={{ fontSize: 13, fontWeight: 700, color: '#16794a' }}>✓ {mots.dejaRepondu}</span>
              : <a href={`${base}/appels-offres/${a.reference_slug}`}
                  style={{ fontSize: 14, fontWeight: 600, color: primary }}>{mots.repondre} →</a>}
          </li>
        ))}
      </ul>
    </div>
  )
}
