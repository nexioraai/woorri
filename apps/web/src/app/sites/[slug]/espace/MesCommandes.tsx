'use client'

import { useCallback, useEffect, useState } from 'react'
import { vider } from '../catalogue/bon'
import { supabase } from '@/lib/supabase'
import type { MotsCommandes } from './motsCommandes'
import SuiviCommande from './SuiviCommande'

// ============================================================================
// MES COMMANDES — le bon de commande du client, et son suivi (CPA, 2026-11-19).
//
// Un formulaire de LIGNES (produit, quantité, unité) : le produit se choisit
// dans le catalogue publié s'il y en a, ou s'écrit librement — le catalogue de
// la CPA est vide au 2026-11-19, et une commande impossible ne sert à rien.
// Sous le formulaire, les commandes passées, leur état et la réponse de la
// Centrale. L'écran ne décide rien : il relit après chaque envoi.
// ============================================================================

type Ligne = { produit_reference: string | null; designation: string; quantite: number; unite: string | null }
type Commande = {
  id: string; reference: string; etat: string; note: string | null
  reponse: string | null; repondu_le: string | null; cree_le: string; maj_le: string
  lignes: Ligne[]
}
type Produit = { reference: string; denomination: string; forme: string | null; dosage: string | null; conditionnement: string | null }
type Saisie = { designation: string; quantite: string; unite: string }

const VIDE: Saisie = { designation: '', quantite: '', unite: '' }

/** Ce que le client voit d'un produit du catalogue dans la liste de choix. */
export function libelleProduit(p: Produit): string {
  return [p.denomination, p.dosage, p.forme].filter(Boolean).join(' · ')
}

export default function MesCommandes({
  slug, mots, primary, produitInitial, quantiteInitiale = '', uniteInitiale = '', lignesInitiales = [], viderBonApresEnvoi = false,
}: {
  slug: string; mots: MotsCommandes; primary: string; produitInitial?: string | null; quantiteInitiale?: string; uniteInitiale?: string
  /** Les lignes du bon préparé dans le catalogue (`?l=`). */
  lignesInitiales?: Saisie[]
  /** Le bon venait du catalogue : une fois la commande ENVOYÉE, il se vide. */
  viderBonApresEnvoi?: boolean
}) {
  const [etat, setEtat] = useState<'charge' | 'refus' | 'ferme' | 'pret'>('charge')
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [catalogue, setCatalogue] = useState<Produit[]>([])
  const [saisies, setSaisies] = useState<Saisie[]>(lignesInitiales.length > 0
    ? [...lignesInitiales, { ...VIDE }]
    : [{ designation: produitInitial ?? '', quantite: produitInitial ? quantiteInitiale : '', unite: produitInitial ? uniteInitiale : '' }, { ...VIDE }])
  const [note, setNote] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)
  const api = `/api/sites/${encodeURIComponent(slug)}/mes-commandes`

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token ?? null

  const charger = useCallback(async (encoreLa: () => boolean = () => true) => {
    const j = await jeton()
    if (!encoreLa()) return
    if (!j) { setEtat('refus'); return }
    try {
      const r = await fetch(api, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
      if (!encoreLa()) return
      if (!r.ok) { setEtat('refus'); return }
      const d = await r.json()
      if (!encoreLa()) return
      if (d.ouvert === false) { setEtat('ferme'); return }
      setCommandes((d.commandes ?? []) as Commande[])
      setCatalogue((d.catalogue ?? []) as Produit[])
      setEtat('pret')
    } catch { if (encoreLa()) setEtat('refus') }
  }, [api])

  useEffect(() => {
    let vivant = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : la liste se lit par une requête portant le jeton, qui n'existe que dans le navigateur.
    void charger(() => vivant)
    return () => { vivant = false }
  }, [charger])

  const poser = (i: number, champ: keyof Saisie, v: string) =>
    setSaisies((s) => s.map((x, k) => (k === i ? { ...x, [champ]: v } : x)))

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null); setSucces(null); setEnvoi(true)
    try {
      const parNom = new Map(catalogue.map((p) => [libelleProduit(p).toLowerCase(), p.reference]))
      const lignes = saisies
        .filter((s) => s.designation.trim() !== '')
        .map((s) => ({
          designation: s.designation.trim(),
          quantite: Number(s.quantite),
          unite: s.unite.trim() || null,
          produit_reference: parNom.get(s.designation.trim().toLowerCase()) ?? null,
        }))
      const j = await jeton()
      const r = await fetch(api, {
        method: 'POST', cache: 'no-store',
        headers: { Authorization: `Bearer ${j ?? ''}`, 'content-type': 'application/json' },
        body: JSON.stringify({ lignes, note }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErreur(typeof d.error === 'string' ? d.error : mots.refus); return }
      setSucces(`${mots.envoyee} ${d.commande?.reference ?? ''}`)
      setSaisies([{ ...VIDE }, { ...VIDE }]); setNote('')
      if (viderBonApresEnvoi) vider(slug)
      await charger()
    } finally { setEnvoi(false) }
  }

  const date = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' }) }
    catch { return iso.slice(0, 10) }
  }

  if (etat === 'refus') return <p role="alert" style={{ color: '#9b1c1c', lineHeight: 1.6 }}>{mots.refus}</p>
  if (etat === 'ferme') return <p style={{ lineHeight: 1.6, opacity: 0.8 }}>{mots.pasOuvert}</p>
  if (etat === 'charge') return <p style={{ opacity: 0.6 }}>{mots.chargement}</p>

  const champ: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 15, borderRadius: 10,
    border: '1px solid #d4d4d8', background: '#fff', boxSizing: 'border-box',
  }
  const carte: React.CSSProperties = {
    padding: '22px 22px', borderRadius: 16, border: '1px solid #e6e6e6', background: '#fff',
    boxShadow: '0 10px 30px -22px rgba(0,0,0,.35)',
  }

  return (
    <div className="mesCommandes">
      <style>{`
        .mesCommandes .ligneCmd { display: grid; grid-template-columns: 1fr 110px 130px auto; gap: 8px; align-items: end; margin-bottom: 10px }
        @media (max-width: 640px) { .mesCommandes .ligneCmd { grid-template-columns: 1fr 1fr; } .mesCommandes .ligneCmd .nomCmd { grid-column: 1 / -1 } }
        .mesCommandes button { transition: transform .15s ease, box-shadow .15s ease }
        .mesCommandes button:hover:not(:disabled) { transform: translateY(-1px) }
        @media (prefers-reduced-motion: reduce) { .mesCommandes button { transition: none } .mesCommandes button:hover { transform: none } }
      `}</style>

      <form id="nouvelle" onSubmit={envoyer} style={carte}>
        <h2 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 6px' }}>{mots.nouvelle}</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.7 }}>{mots.suggestions}</p>
        <datalist id="catalogue-cmd">
          {catalogue.map((p) => <option key={p.reference} value={libelleProduit(p)} />)}
        </datalist>
        {saisies.map((s, i) => (
          <div key={i} className="ligneCmd">
            <label className="nomCmd">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {mots.produit}</span>
              <input list="catalogue-cmd" value={s.designation} maxLength={300} style={champ}
                onChange={(e) => poser(i, 'designation', e.target.value)} />
            </label>
            <label>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{mots.quantite}</span>
              <input type="number" min={1} step={1} value={s.quantite} style={champ}
                required={s.designation.trim() !== ''}
                onChange={(e) => poser(i, 'quantite', e.target.value)} />
            </label>
            <label>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{mots.unite}</span>
              <input value={s.unite} maxLength={40} placeholder={mots.unitePlaceholder} style={champ}
                onChange={(e) => poser(i, 'unite', e.target.value)} />
            </label>
            <button type="button" aria-label={`${mots.retirer} ${i + 1}`} disabled={saisies.length === 1}
              onClick={() => setSaisies((x) => x.filter((_, k) => k !== i))}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e4e4e7', background: '#fafafa', cursor: 'pointer', fontSize: 13 }}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setSaisies((x) => [...x, { ...VIDE }])}
          style={{ background: 'none', border: 'none', color: primary, fontWeight: 600, cursor: 'pointer', padding: '4px 0', fontSize: 14.5 }}>
          {mots.ajouterLigne}
        </button>
        <label style={{ display: 'block', margin: '16px 0 18px' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{mots.note}</span>
          <textarea rows={3} maxLength={2000} value={note} placeholder={mots.notePlaceholder} style={{ ...champ, resize: 'vertical' }}
            onChange={(e) => setNote(e.target.value)} />
        </label>
        {erreur && <p role="alert" style={{ color: '#9b1c1c', margin: '0 0 12px' }}>{erreur}</p>}
        {succes && <p role="status" style={{ color: '#16794a', fontWeight: 600, margin: '0 0 12px' }}>{succes}</p>}
        <button type="submit" disabled={envoi}
          style={{ padding: '12px 22px', borderRadius: 999, border: 'none', background: primary, color: '#fff', fontWeight: 700, fontSize: 15.5, cursor: 'pointer', opacity: envoi ? 0.7 : 1 }}>
          {envoi ? mots.envoi : mots.envoyer}
        </button>
      </form>

      <h2 style={{ fontSize: 19, fontWeight: 700, margin: '34px 0 12px' }}>{mots.mesCommandes}</h2>
      {commandes.length === 0 ? (
        <p style={{ padding: '18px 20px', borderRadius: 14, background: `color-mix(in srgb, ${primary} 5%, #ffffff)`, border: '1px solid #e6e6e6', margin: 0 }}>
          {mots.vide}
        </p>
      ) : (
        <ul style={{ padding: 0, margin: 0 }}>
          {commandes.map((c) => (
            <li key={c.id} style={{ listStyle: 'none', padding: '16px 18px', marginBottom: 10, border: '1px solid #e6e6e6', borderRadius: 14, background: '#fff' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 700, color: primary }}>{c.reference}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `color-mix(in srgb, ${primary} 12%, #ffffff)`, color: primary }}>
                  {mots.etats[c.etat] ?? c.etat}
                </span>
              </div>
              <ul style={{ margin: '10px 0 0', paddingInlineStart: 20, fontSize: 15, lineHeight: 1.6 }}>
                {c.lignes.map((l, k) => (
                  <li key={k}>{l.designation} — <strong>{l.quantite.toLocaleString()}</strong>{l.unite ? ` ${l.unite}` : ''}</li>
                ))}
              </ul>
              {/* LE SUIVI, ÉTAPE PAR ÉTAPE (CPA, 2026-11-19). */}
              <SuiviCommande etat={c.etat} libelles={mots.etapes} accent={primary} annulee={mots.annulee} />
              {c.note && <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.75, whiteSpace: 'pre-wrap' }}>{c.note}</p>}
              {c.reponse && (
                <p style={{ margin: '10px 0 0', padding: '10px 12px', borderRadius: 10, fontSize: 14.5, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                  background: `color-mix(in srgb, ${primary} 7%, #ffffff)`, borderInlineStart: `3px solid ${primary}` }}>
                  <strong>{mots.reponse} :</strong> {c.reponse}
                </p>
              )}
              <p style={{ margin: '8px 0 0', fontSize: 13, opacity: 0.6 }}>
                {mots.passeeLe} {date(c.cree_le)}{c.maj_le && c.maj_le.slice(0, 16) !== c.cree_le.slice(0, 16) ? ` · ${mots.majLe} ${date(c.maj_le)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
