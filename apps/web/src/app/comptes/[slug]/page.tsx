'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { supabase } from '@/lib/supabase'
import GestionDemandes from './GestionDemandes'
import Journal from './Journal'
import DocumentsDuCompte from '@/app/sites/[slug]/espace/DocumentsDuCompte'
import { motsDocuments } from '@/app/sites/[slug]/espace/motsDocuments'

// ============================================================================
// LOT 11 — APPROUVER UN COMPTE. DANS LE TABLEAU DE BORD, PAS DANS `/edit`.
//
// ── LA RÈGLE QUE CET ÉCRAN RESPECTE.
//
// Arbitrage du propriétaire, 2026-11-09 : « dans edit on met seulement les
// trucs qu'on édite qui seront visibles sur le site, le reste il faut mettre
// dans dashboard ». Approuver un fournisseur ne se voit nulle part sur le
// site : ce n'est pas du contenu, c'est de l'administration. `/domaine/[slug]`
// avait déjà tranché pareil pour l'adresse.
//
// ── CET ÉCRAN NE DÉCIDE RIEN.
//
// Il affiche ce que la route rend, et renvoie les gestes à la route. Toute
// la garde est serveur : `requireSiteOwner`. Un écran qui masquerait un
// bouton croirait protéger quelque chose — alors qu'il suffirait d'appeler
// la route à la main.
//
// ── ON RELIT APRÈS CHAQUE GESTE.
//
// Afficher l'état qu'on vient de DEMANDER montrerait une activation qui a
// peut-être échoué. On recharge depuis la route, toujours.
// ============================================================================

type Compte = {
  id: string
  user_id: string
  email: string
  role: 'fournisseur' | 'structure' | 'agent'
  etat: 'en_attente' | 'actif' | 'suspendu'
  qualification: keyof typeof QUALIF
  qualification_le: string | null
  organisation: string | null
  reference: string | null
  cree_le: string
  maj_le: string
}

const ROLE = { fournisseur: 'Fournisseur', structure: 'Structure sanitaire', agent: 'Agent de la Centrale' }
const ETAT = { en_attente: 'En attente', actif: 'Actif', suspendu: 'Suspendu' }
// LOT 12.3 — LE VERDICT, QUI N'EST PAS L'ÉTAT.
//
// `etat` dit si le compte ENTRE ; `qualification` dit ce que la Centrale
// PENSE du fournisseur. Les confondre ferait qu'activer un compte vaudrait
// le qualifier — deux décisions, deux examens, deux dates.
const QUALIF = {
  non_examinee: 'Pas encore examinée',
  prequalifie: 'Préqualifié',
  qualifie: 'Qualifié',
  rejete: 'Rejeté',
} as const
const TEINTE_Q: Record<string, string> = {
  non_examinee: '#b45309', prequalifie: '#1d4ed8', qualifie: '#16794a', rejete: '#9b1c1c',
}
const TEINTE = { en_attente: '#b45309', actif: '#16794a', suspendu: '#9b1c1c' }

export default function ComptesDuSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [comptes, setComptes] = useState<Compte[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)
  // QUEL DOSSIER EST OUVERT. Un seul à la fois : afficher les dossiers de
  // trente comptes ferait trente appels pour une page qu'on survole.
  const [dossier, setDossier] = useState<string | null>(null)

  const jeton = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const relire = useCallback(async (encoreLa: () => boolean = () => true) => {
    const j = await jeton()
    if (!encoreLa()) return
    if (!j) { setErreur('Connectez-vous pour administrer ce site.'); return }
    const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/comptes`, {
      headers: { Authorization: `Bearer ${j}` }, cache: 'no-store',
    })
    if (!encoreLa()) return
    if (!r.ok) { setErreur('Ce site ne vous appartient pas, ou le service est indisponible.'); return }
    const d = await r.json()
    if (!encoreLa()) return
    setComptes((d.comptes ?? []) as Compte[])
    setErreur(null)
  }, [slug, jeton])

  // ── POURQUOI CETTE EXEMPTION EST ÉCRITE, ET CE QU'ELLE NE COUVRE PAS.
  //
  // `set-state-in-effect` empêche les cascades de rendu : un effet qui pose
  // un état qui relance un effet. Ce n'est pas le cas ici — l'état posé ne
  // redéclenche rien, et la liste se lit par une requête portant le jeton du
  // propriétaire, qui n'existe que dans le navigateur.
  //
  // CE QU'ELLE NE COUVRE PAS : poser un état depuis un effet qui dépend d'un
  // autre état. Si cette page en arrive là, la règle doit reprendre la main.
  useEffect(() => {
    let vivant = true
    // L'ÉCRAN PEUT PARTIR AVANT LA RÉPONSE : sans ce garde, quitter la page
    // pendant l'appel écrirait un état sur un composant démonté.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial, voir ci-dessus
    void relire(() => vivant)
    return () => { vivant = false }
  }, [relire])

  async function changer(c: Compte, corps: { etat?: Compte['etat']; qualification?: Compte['qualification'] }) {
    setOccupe(c.id)
    try {
      const j = await jeton()
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/comptes`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${j}`, 'content-type': 'application/json' },
        body: JSON.stringify({ id: c.id, ...corps }),
      })
      if (!r.ok) { setErreur('Le changement a été refusé.'); return }
      // ON RELIT. Le PATCH rend la ligne, mais la relecture prouve l'état
      // RÉEL de la table — pas celui qu'on a demandé.
      await relire()
    } finally { setOccupe(null) }
  }

  const enAttente = (comptes ?? []).filter((c) => c.etat === 'en_attente')
  const reste = (comptes ?? []).filter((c) => c.etat !== 'en_attente')

  const carte = (c: Compte) => (
    <li key={c.id} style={{
      listStyle: 'none', padding: '16px 18px', marginBottom: 10,
      borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)',
      background: 'rgba(255,255,255,0.03)',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15.5 }}>{c.organisation || '—'}</p>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, opacity: 0.6 }}>
            {c.email} · {ROLE[c.role]}
            {c.reference ? ` · ${c.reference}` : ''}
          </p>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999,
          background: `color-mix(in srgb, ${TEINTE[c.etat]} 22%, transparent)`,
          color: TEINTE[c.etat], whiteSpace: 'nowrap',
        }}>{ETAT[c.etat]}</span>
      </div>

      {/* LE VERDICT, SÉPARÉ DE L'ÉTAT ET DIT COMME TEL. */}
      {c.role === 'fournisseur' && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: '0 0 9px', fontSize: 13, opacity: 0.6 }}>
            Qualification :{' '}
            <strong style={{ color: TEINTE_Q[c.qualification] ?? 'inherit' }}>
              {QUALIF[c.qualification] ?? c.qualification}
            </strong>
            {c.qualification_le ? ` · prononcée le ${c.qualification_le.slice(0, 10)}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {(Object.keys(QUALIF) as (keyof typeof QUALIF)[])
              .filter((q) => q !== c.qualification)
              .map((q) => (
                <button key={q} type="button" disabled={occupe === c.id}
                  onClick={() => void changer(c, { qualification: q })}
                  style={{
                    padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5,
                    fontWeight: 600, background: 'transparent',
                    color: TEINTE_Q[q], border: `1px solid ${TEINTE_Q[q]}55`,
                  }}>{QUALIF[q]}</button>
              ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {/* LE DOSSIER NE S'OUVRE QUE POUR UN COMPTE ACTIF. Déposer une pièce
            à quelqu'un qui n'est pas encore admis, c'est agir avant d'avoir
            décidé — et la route le refuserait de toute façon. */}
        {c.etat === 'actif' && (
          <button type="button" onClick={() => setDossier(dossier === c.id ? null : c.id)}
            style={{ padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 13.5, background: 'transparent', color: 'rgba(255,255,255,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}>
            {dossier === c.id ? 'Fermer le dossier' : 'Documents'}
          </button>
        )}
        {c.etat !== 'actif' && (
          <button type="button" disabled={occupe === c.id} onClick={() => void changer(c, { etat: 'actif' })}
            style={{ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13.5, background: '#16794a', color: '#fff' }}>
            Activer
          </button>
        )}
        {c.etat !== 'suspendu' && (
          <button type="button" disabled={occupe === c.id} onClick={() => void changer(c, { etat: 'suspendu' })}
            style={{ padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 13.5, background: 'transparent', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }}>
            Suspendre
          </button>
        )}
      </div>

      {dossier === c.id && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: '#ffffff', color: '#111111' }}>
          <DocumentsDuCompte slug={slug} compte={c.id} primary="#1F6B4A" mots={motsDocuments('fr')} />
        </div>
      )}
    </li>
  )

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px 80px', color: '#ededed' }}>
      <p style={{ fontSize: 14, margin: '0 0 18px' }}>
        <Link href="/dashboard" style={{ color: '#FA5D1E' }}>← Tableau de bord</Link>
      </p>
      <h1 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, margin: '0 0 8px' }}>
        Comptes du site
      </h1>
      <p style={{ fontSize: 15.5, lineHeight: 1.65, opacity: 0.7, margin: '0 0 30px', maxWidth: '62ch' }}>
        Les personnes qui ont demandé un accès à ce site. Un compte naît toujours
        <strong> en attente</strong> : c’est ici, et seulement ici, qu’il s’active.
      </p>

      {erreur && <p role="alert" style={{ color: '#f87171' }}>{erreur}</p>}
      {!comptes && !erreur && <p style={{ opacity: 0.6 }}>Chargement…</p>}

      {comptes && (
        <>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 12px' }}>
            En attente {enAttente.length > 0 && <span style={{ color: '#b45309' }}>({enAttente.length})</span>}
          </h2>
          {enAttente.length === 0
            // UNE LISTE VIDE SE DIT. Un espace blanc laisserait croire que la
            // page n'a pas chargé — c'est le défaut qu'on vient de corriger
            // sur le bandeau des partenaires.
            ? <p style={{ opacity: 0.55, margin: '0 0 30px' }}>Aucune demande en attente.</p>
            : <ul style={{ padding: 0, margin: '0 0 30px' }}>{enAttente.map(carte)}</ul>}

          <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 12px' }}>Comptes examinés</h2>
          {reste.length === 0
            ? <p style={{ opacity: 0.55 }}>Aucun compte pour l’instant.</p>
            : <ul style={{ padding: 0, margin: 0 }}>{reste.map(carte)}</ul>}
        </>
      )}
      <GestionDemandes slug={slug} />
      <Journal slug={slug} />
    </main>
  )
}
