'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MotsCommandes } from './motsCommandes'
import SuiviCommande from './SuiviCommande'

// ============================================================================
// LE TABLEAU DE BORD DU CLIENT (CPA, 2026-11-19).
//
// « Une fois le compte créé, les clients voient quoi ? leur propre tableau de
// bord, où ils peuvent commander, suivre… » C'est l'accueil de l'espace d'un
// client (structure sanitaire ou ONG) : trois chiffres, ses dernières
// commandes avec leur suivi, et le bouton pour en passer une.
//
// Il ne montre QUE ses commandes : il lit `mes-commandes`, filtrée sur son
// compte par la route. Il ne décide rien.
// ============================================================================

type Commande = { id: string; reference: string; etat: string; cree_le: string; lignes: { designation: string; quantite: number; unite: string | null }[] }

const EN_COURS = new Set(['recue', 'en_cours', 'validee'])

export default function TableauClient({ slug, base, accent, mots }: { slug: string; base: string; accent: string; mots: MotsCommandes }) {
  const [liste, setListe] = useState<Commande[] | null>(null)
  const [ferme, setFerme] = useState(false)

  useEffect(() => {
    let vivant = true
    void (async () => {
      const j = (await supabase.auth.getSession()).data.session?.access_token
      if (!j || !vivant) return
      try {
        const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/mes-commandes`, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
        if (!r.ok || !vivant) return
        const d = await r.json()
        if (!vivant) return
        if (d.ouvert === false) { setFerme(true); return }
        setListe((d.commandes ?? []) as Commande[])
      } catch { /* le tableau reste vide ; les liens restent là */ }
    })()
    return () => { vivant = false }
  }, [slug])

  if (ferme) return null
  const t = mots.tableau
  const tuiles: [string, number | string][] = [
    [t.enCours, liste ? liste.filter((c) => EN_COURS.has(c.etat)).length : '…'],
    [t.livrees, liste ? liste.filter((c) => c.etat === 'livree').length : '…'],
    [t.total, liste ? liste.length : '…'],
  ]
  const date = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso.slice(0, 10) } }

  return (
    <section className="tableauClient" aria-label={t.titre} style={{ marginBottom: 22 }}>
      <style>{`
        .tableauClient .tuiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px }
        @media (max-width: 560px) { .tableauClient .tuiles { grid-template-columns: 1fr 1fr } .tableauClient .tuiles > :last-child { grid-column: 1 / -1 } }
        .tableauClient .passer { transition: transform .18s ease, box-shadow .18s ease }
        .tableauClient .passer:hover { transform: translateY(-2px); box-shadow: 0 14px 26px -14px ${accent} }
        .tableauClient .cmd { transition: border-color .18s ease }
        .tableauClient .cmd:hover { border-color: ${accent} }
        @media (prefers-reduced-motion: reduce) { .tableauClient .passer, .tableauClient .cmd { transition: none } .tableauClient .passer:hover { transform: none } }
      `}</style>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>{t.titre}</h2>
      <div className="tuiles">
        {tuiles.map(([l, n]) => (
          <div key={l} style={{ padding: '14px 16px', borderRadius: 16, background: '#fff', border: '1px solid #e6e6e6', boxShadow: '0 10px 24px -22px rgba(0,0,0,.4)' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{n}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      <a className="passer" href={`${base}/mes-commandes`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '16px 20px', borderRadius: 16, background: accent, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 17, marginBottom: 18 }}>
        <span>＋ {t.passer}</span><span aria-hidden>→</span>
      </a>

      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>{t.dernieres}</h3>
      {liste && liste.length === 0 && (
        <p style={{ padding: '14px 16px', borderRadius: 14, background: `color-mix(in srgb, ${accent} 5%, #fff)`, border: '1px solid #e6e6e6', margin: 0, lineHeight: 1.6 }}>{t.aucune}</p>
      )}
      {(liste ?? []).slice(0, 3).map((c) => (
        <a key={c.id} className="cmd" href={`${base}/mes-commandes`} style={{ display: 'block', padding: '14px 16px', marginBottom: 10, borderRadius: 14,
          border: '1px solid #e6e6e6', background: '#fff', color: 'inherit', textDecoration: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: accent }}>{c.reference}</span>
            <span style={{ fontSize: 13, opacity: 0.6 }}>{date(c.cree_le)} · {c.lignes.length} {c.lignes.length > 1 ? 'produits' : 'produit'}</span>
          </div>
          <SuiviCommande etat={c.etat} libelles={mots.etapes} accent={accent} annulee={mots.annulee} />
        </a>
      ))}
      {liste && liste.length > 3 && (
        <a href={`${base}/mes-commandes`} style={{ color: accent, fontWeight: 600, fontSize: 14.5 }}>{t.toutes} →</a>
      )}
    </section>
  )
}
