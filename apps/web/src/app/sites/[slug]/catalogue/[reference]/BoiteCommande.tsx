'use client'

import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Printer, Copy, Check } from 'lucide-react'
import { ajouter } from '../bon'
import { useBon } from '../BarreBon'

// ============================================================================
// L'ENCADRÉ DE COMMANDE DE LA FICHE (CPA, 2026-11-19).
//
// Il reste visible en défilant (sticky). La quantité se compte en
// CONDITIONNEMENTS (boîtes, flacons…), comme sur un bon de commande ; « Ajouter
// au bon de commande » met la ligne dans le BON EN PRÉPARATION (le même que
// celui du catalogue, voir `bon.ts`) ; la barre du bas l'envoie ensuite vers
// « Mes commandes », toutes lignes remplies. Sans script, le lien d'origine
// (une seule ligne) reste la cible du bouton.
// Pas de prix, pas de paiement : un bon de commande.
// ============================================================================

export default function BoiteCommande({
  slug, base, denomination, reference, unite, accent, commandable, indisponible,
}: { slug: string; base: string; denomination: string; reference: string; unite: string; accent: string; commandable: boolean; indisponible: string }) {
  const [q, setQ] = useState(1)
  const [copie, setCopie] = useState(false)
  const deja = useBon(slug).find((l) => l.reference === reference)
  const lien = `${base}/mes-commandes?produit=${encodeURIComponent(denomination)}&quantite=${q}&unite=${encodeURIComponent(unite)}#nouvelle`
  return (
    <div className="boiteCmd">
      <style>{`
        .boiteCmd { position: sticky; top: 20px; border: 1px solid #e8eaee; border-radius: 22px; background: #fff; padding: 20px;
          box-shadow: 0 30px 60px -40px rgba(17,24,39,.45) }
        .boiteCmd .q { display: flex; align-items: center; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; margin: 8px 0 6px }
        .boiteCmd .q button { width: 46px; height: 46px; border: none; background: #f8f9fb; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #111 }
        .boiteCmd .q button:hover { background: #eef0f3 }
        .boiteCmd .q input { flex: 1; min-width: 0; height: 46px; border: none; text-align: center; font: inherit; font-size: 18px; font-weight: 700 }
        .boiteCmd .ajout { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 14px 18px; border-radius: 14px; border: none;
          background: ${accent}; color: #fff; font-weight: 800; font-size: 15.5px; text-decoration: none; cursor: pointer;
          transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease }
        .boiteCmd .ajout:hover { transform: translateY(-2px); box-shadow: 0 14px 26px -14px ${accent} }
        .boiteCmd .ajout[aria-disabled="true"] { background: #e5e7eb; color: #6b7280; pointer-events: none }
        .boiteCmd .actions { display: flex; gap: 8px; margin-top: 12px }
        .boiteCmd .actions button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 10px; border-radius: 12px;
          border: 1px solid #e5e7eb; background: #fff; font: inherit; font-size: 13.5px; font-weight: 600; color: #374151; cursor: pointer }
        .boiteCmd .actions button:hover { background: #f8f9fb }
        @media (max-width: 900px) { .boiteCmd { position: static } }
        @media print { .boiteCmd { display: none } }
        @media (prefers-reduced-motion: reduce) { .boiteCmd .ajout { transition: none } .boiteCmd .ajout:hover { transform: none } }
      `}</style>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6b7280' }}>Quantité</p>
      <div className="q">
        <button type="button" aria-label="Moins" onClick={() => setQ((x) => Math.max(1, x - 1))}><Minus size={18} aria-hidden /></button>
        <input type="number" min={1} max={1000000} value={q} aria-label="Quantité"
          onChange={(e) => setQ(Math.max(1, Math.min(1000000, Math.floor(Number(e.target.value) || 1))))} />
        <button type="button" aria-label="Plus" onClick={() => setQ((x) => Math.min(1000000, x + 1))}><Plus size={18} aria-hidden /></button>
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#6b7280' }}>en {unite}</p>
      <a className="ajout" href={lien} aria-disabled={!commandable}
        onClick={(e) => { e.preventDefault(); if (commandable) ajouter(slug, { reference, designation: denomination, quantite: q, unite }) }}>
        <ShoppingBag size={19} aria-hidden /> Ajouter au bon de commande
      </a>
      {deja && <p role="status" style={{ margin: '10px 0 0', fontSize: 13.5, color: '#166534', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Check size={16} aria-hidden /> Dans votre bon : {deja.quantite} {deja.quantite > 1 ? unite : unite.replace(/s$/, '')}
      </p>}
      {!commandable && <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#991b1b' }}>{indisponible}</p>}
      <p style={{ margin: '12px 0 0', fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 }}>
        Réservé aux structures sanitaires et ONG ayant un compte client. Aucun paiement en ligne.
      </p>
      <div className="actions">
        <button type="button" onClick={() => window.print()}><Printer size={16} aria-hidden /> Imprimer</button>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(reference); setCopie(true); setTimeout(() => setCopie(false), 1800) } catch { /* rien */ } }}>
          {copie ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copie ? 'Copiée' : 'Référence'}
        </button>
      </div>
    </div>
  )
}
