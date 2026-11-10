'use client'

import { useCallback, useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import GestionAvis from './GestionAvis'

// ============================================================================
// LOT 13.2 — LES OFFRES REÇUES, VUES PAR LA CENTRALE.
//
// ── AU TABLEAU DE BORD, PAS DANS `/edit`.
//
// Règle du propriétaire, 2026-11-09 : « dans edit on met seulement les trucs
// qu'on édite qui seront visibles sur le site, le reste il faut mettre dans
// dashboard ». Ouvrir les plis d'un marché public ne se voit nulle part sur
// le site : ce n'est pas du contenu.
//
// ── CET ÉCRAN NE DÉCIDE RIEN.
//
// Toute la garde est serveur. Il affiche ce que la route rend, et renvoie
// les gestes à la route. Masquer un bouton ne protégerait rien.
//
// ── IL RAPPELLE L'HEURE D'OUVERTURE DES PLIS, SANS LA FAIRE RESPECTER.
//
// Arbitrage du propriétaire : « cpa ne mettra pas avant heure, si ça arrive
// c'est leur responsabilité, pas la nôtre. » Rien n'empêche techniquement de
// lire avant l'heure. L'écran le DIT — c'est tout ce qu'il peut faire
// honnêtement, et le taire reviendrait à faire croire à une protection qui
// n'existe pas.
//
// ── ET IL RELIT APRÈS CHAQUE GESTE.
//
// Afficher l'état qu'on vient de DEMANDER montrerait une décision qui a
// peut-être échoué.
// ============================================================================

type Offre = {
  id: string
  avis_id: string
  nom: string
  contact: string
  prix: number | null
  devise: string | null
  nom_fichier: string
  octets: number
  etat: 'recue' | 'retenue' | 'non_retenue'
  reponse: string | null
  repondu_le: string | null
  depose_le: string
  avis: { reference: string; objet: string } | null
}

const ETAT = { recue: 'Reçue', retenue: 'Retenue', non_retenue: 'Écartée' } as const
const TEINTE: Record<string, string> = { recue: '#b45309', retenue: '#16794a', non_retenue: '#9b1c1c' }

const poids = (o: number) =>
  o >= 1_048_576 ? `${(o / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`

export default function OffresDuSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [offres, setOffres] = useState<Offre[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)
  const [brouillons, setBrouillons] = useState<Record<string, string>>({})

  const base = `/api/sites/${encodeURIComponent(slug)}/offres`

  const jeton = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const relire = useCallback(async () => {
    const j = await jeton()
    if (!j) { setErreur('Connectez-vous pour administrer ce site.'); return }
    const r = await fetch(base, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
    if (!r.ok) { setErreur('Ce site ne vous appartient pas, ou le service est indisponible.'); return }
    const d = await r.json()
    setOffres((d.offres ?? []) as Offre[])
    setErreur(null)
  }, [base, jeton])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : cet effet ne tourne qu'au montage et l'état posé ne redéclenche aucun effet. La liste se lit par une requête portant le jeton, qui n'existe que dans le navigateur.
    void relire()
  }, [relire])

  async function decider(o: Offre, corps: { etat?: Offre['etat']; reponse?: string }) {
    setOccupe(o.id)
    try {
      const j = await jeton()
      const r = await fetch(base, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${j}`, 'content-type': 'application/json' },
        body: JSON.stringify({ id: o.id, ...corps }),
      })
      if (!r.ok) { setErreur('Le changement a été refusé.'); return }
      // ON RELIT : le PATCH rend la ligne, la relecture prouve l'état RÉEL.
      await relire()
    } finally { setOccupe(null) }
  }

  async function telecharger(o: Offre) {
    const j = await jeton()
    const r = await fetch(`${base}?telecharger=${encodeURIComponent(o.id)}`, {
      headers: { Authorization: `Bearer ${j}` }, cache: 'no-store',
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || typeof d.url !== 'string') { setErreur('Lien indisponible.'); return }
    window.open(d.url, '_blank', 'noopener,noreferrer')
  }

  const bouton = (couleur: string): React.CSSProperties => ({
    padding: '7px 15px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
    fontWeight: 600, background: 'transparent', color: couleur, border: `1px solid ${couleur}55`,
  })

  // LES OFFRES GROUPÉES PAR AVIS. Une liste à plat obligerait à relire la
  // référence sur chaque ligne pour savoir de quel marché on parle.
  const parAvis = new Map<string, Offre[]>()
  for (const o of offres ?? []) {
    const k = o.avis_id
    parAvis.set(k, [...(parAvis.get(k) ?? []), o])
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 80px', color: '#ededed' }}>
      <p style={{ fontSize: 14, margin: '0 0 18px' }}>
        <Link href="/dashboard" style={{ color: '#FA5D1E' }}>← Tableau de bord</Link>
      </p>
      <h1 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, margin: '0 0 8px' }}>
        Offres reçues
      </h1>
      <p style={{ fontSize: 15.5, lineHeight: 1.65, opacity: 0.7, margin: '0 0 14px', maxWidth: '64ch' }}>
        Les offres déposées sur vos appels d’offres, par marché. Retenir ou écarter
        est une décision que vous seul prenez ; le soumissionnaire voit votre réponse
        dans son espace.
      </p>
      {/* ON DIT CE QUI N'EST PAS PROTÉGÉ. Taire l'absence de verrou ferait
          croire à une protection qui n'existe pas. */}
      <p style={{
        fontSize: 14, lineHeight: 1.6, margin: '0 0 30px', padding: '12px 15px',
        borderRadius: 10, background: 'rgba(180,83,9,0.12)', color: '#f0b67a',
        border: '1px solid rgba(180,83,9,0.3)', maxWidth: '64ch',
      }}>
        Rien n’empêche techniquement de consulter une offre avant l’heure d’ouverture
        des plis. Le respect de cette heure vous appartient — c’est elle qui rend la
        procédure défendable.
      </p>

      <GestionAvis slug={slug} />

      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>Offres reçues</h2>
      {erreur && <p role="alert" style={{ color: '#f87171' }}>{erreur}</p>}
      {!offres && !erreur && <p style={{ opacity: 0.6 }}>Chargement…</p>}
      {offres && offres.length === 0 && (
        <p style={{ opacity: 0.55 }}>Aucune offre reçue pour l’instant.</p>
      )}

      {[...parAvis.entries()].map(([avisId, liste]) => (
        <section key={avisId} style={{ marginBottom: 34 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>
            {liste[0].avis?.objet ?? 'Marché'}
          </h2>
          <p style={{ fontSize: 13, opacity: 0.55, margin: '0 0 12px', fontFamily: 'ui-monospace, monospace' }}>
            {liste[0].avis?.reference ?? avisId} · {liste.length} offre{liste.length > 1 ? 's' : ''}
          </p>

          <ul style={{ padding: 0, margin: 0 }}>
            {liste.map((o) => (
              <li key={o.id} style={{
                listStyle: 'none', padding: '16px 18px', marginBottom: 10,
                borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.03)',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15.5 }}>{o.nom}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, opacity: 0.62 }}>
                      {o.contact} · déposée le {o.depose_le.slice(0, 10)}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap',
                    background: `color-mix(in srgb, ${TEINTE[o.etat]} 22%, transparent)`, color: TEINTE[o.etat],
                  }}>{ETAT[o.etat]}</span>
                </div>

                <p style={{ margin: '12px 0 0', fontSize: 15 }}>
                  {o.prix != null
                    ? <strong>{o.prix.toLocaleString()} {o.devise ?? ''}</strong>
                    // UN PRIX ABSENT SE DIT. Une case vide ferait croire à
                    // une donnée perdue, alors que le prix est peut-être
                    // dans le dossier joint.
                    : <span style={{ opacity: 0.6 }}>Montant non renseigné — voir le dossier joint</span>}
                </p>

                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => void telecharger(o)} style={bouton('#9ecbff')}>
                    {o.nom_fichier} ({poids(o.octets)})
                  </button>
                  {o.etat !== 'retenue' && (
                    <button type="button" disabled={occupe === o.id}
                      onClick={() => void decider(o, { etat: 'retenue' })} style={bouton('#16794a')}>
                      Retenir
                    </button>
                  )}
                  {o.etat !== 'non_retenue' && (
                    <button type="button" disabled={occupe === o.id}
                      onClick={() => void decider(o, { etat: 'non_retenue' })} style={bouton('#9b1c1c')}>
                      Écarter
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 13, opacity: 0.6, display: 'block', marginBottom: 6 }}>
                    Votre réponse au soumissionnaire
                    {o.repondu_le ? ` · envoyée le ${o.repondu_le.slice(0, 10)}` : ''}
                  </label>
                  <textarea
                    rows={2}
                    defaultValue={o.reponse ?? ''}
                    onChange={(e) => setBrouillons({ ...brouillons, [o.id]: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10,
                      background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)', color: '#ededed',
                    }} />
                  <button type="button" disabled={occupe === o.id}
                    onClick={() => void decider(o, { reponse: brouillons[o.id] ?? o.reponse ?? '' })}
                    style={{ ...bouton('#FA5D1E'), marginTop: 8 }}>
                    Enregistrer la réponse
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
