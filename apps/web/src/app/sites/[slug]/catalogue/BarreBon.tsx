'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { ClipboardList, Plus, Minus, Check, X, Send, Trash2 } from 'lucide-react'
import { abonner, lireBrut, lignesDe, ajouter, changerQuantite, retirer, vider, lienEnvoi, type LigneBon } from './bon'

// ============================================================================
// LE BON EN PRÉPARATION, CÔTÉ ÉCRAN (CPA, 2026-11-20).
//
// `AjouterAuBon` : le bouton d'une carte du catalogue. `BarreBon` : la barre
// qui apparaît en bas dès qu'une ligne est dans le bon, et s'ouvre en volet
// pour ajuster les quantités avant l'envoi depuis « Mes commandes ».
// Le bon vit dans le navigateur (voir `bon.ts`) : aucune donnée ne part avant
// que le client connecté ne l'envoie.
// ============================================================================

const serveur = () => '[]'

export function useBon(slug: string): LigneBon[] {
  const brut = useSyncExternalStore(abonner, () => lireBrut(slug), serveur)
  return useMemo(() => lignesDe(brut), [brut])
}

export function AjouterAuBon({ slug, ligne, accent, actif }: { slug: string; ligne: LigneBon; accent: string; actif: boolean }) {
  const lignes = useBon(slug)
  const deja = lignes.find((l) => l.reference === ligne.reference)
  if (!actif) return <span className="ajBon off" aria-disabled="true">Indisponible</span>
  return (
    <button type="button" className={`ajBon${deja ? ' dedans' : ''}`} style={{ ['--a' as string]: accent }}
      onClick={() => ajouter(slug, ligne)}
      aria-label={deja ? `Ajouter encore 1 ${ligne.unite} de ${ligne.designation} (déjà ${deja.quantite})` : `Ajouter ${ligne.designation} au bon de commande`}>
      {deja ? <><Check size={16} aria-hidden /> Dans le bon · {deja.quantite}</> : <><Plus size={16} aria-hidden /> Ajouter au bon</>}
    </button>
  )
}

export default function BarreBon({ slug, base, accent }: { slug: string; base: string; accent: string }) {
  const lignes = useBon(slug)
  const [ouvert, setOuvert] = useState(false)
  if (lignes.length === 0) return null
  const total = lignes.length
  return (
    <>
      <style>{`
        .barreBon { position: fixed; left: 50%; bottom: calc(18px + var(--deribfy-bas, 0px)); transform: translateX(-50%); z-index: 60; width: min(720px, calc(100vw - 24px));
          background: #0f172a; color: #fff; border-radius: 18px; box-shadow: 0 24px 50px -18px rgba(15,23,42,.6); animation: bbMonte .35s cubic-bezier(.34,1.56,.64,1) }
        @keyframes bbMonte { from { transform: translate(-50%, 30px); opacity: 0 } to { transform: translate(-50%, 0); opacity: 1 } }
        .barreBon .tete { display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 18px }
        .barreBon .tete b { font-size: 15px }
        .barreBon .tete span.sous { display: block; font-size: 12.5px; color: #94a3b8 }
        .barreBon .btn { display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 12px; padding: 11px 16px; font: inherit; font-size: 14.5px; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap }
        .barreBon .voir { background: rgba(255,255,255,.1); color: #fff }
        .barreBon .voir:hover { background: rgba(255,255,255,.18) }
        .barreBon .envoyer { background: ${accent}; color: #fff; filter: saturate(1.1) }
        .barreBon .envoyer:hover { filter: brightness(1.12) }
        .barreBon .volet { border-top: 1px solid rgba(255,255,255,.1); max-height: min(52vh, 420px); overflow: auto; padding: 6px 12px 10px }
        .barreBon .ligne { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px; padding: 9px 6px; border-bottom: 1px solid rgba(255,255,255,.07) }
        .barreBon .ligne:last-child { border-bottom: none }
        .barreBon .ligne small { display: block; color: #94a3b8; font-size: 12px; font-family: ui-monospace, monospace }
        .barreBon .qte { display: inline-flex; align-items: center; background: rgba(255,255,255,.08); border-radius: 10px }
        .barreBon .qte button, .barreBon .suppr { width: 34px; height: 34px; border: none; background: transparent; color: #e2e8f0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px }
        .barreBon .qte button:hover, .barreBon .suppr:hover { background: rgba(255,255,255,.12) }
        .barreBon .qte input { width: 64px; height: 34px; background: transparent; border: none; color: #fff; text-align: center; font: inherit; font-weight: 700 }
        .barreBon .pied { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px 2px; font-size: 13px; color: #94a3b8 }
        .barreBon .pied button { background: none; border: none; color: #fca5a5; font: inherit; font-size: 13px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center }
        @media (max-width: 560px) { .barreBon { left: 10px; transform: none; width: calc(100vw - 96px); animation: none } .barreBon .tete .voir .txt, .barreBon .tete span.sous, .barreBon .tete > svg { display: none } .barreBon .tete { padding: 10px 10px 10px 14px; gap: 8px } .barreBon .tete b { font-size: 14px } .barreBon .btn { padding: 10px 12px } }
        @media (prefers-reduced-motion: reduce) { .barreBon { animation: none } }
        @media print { .barreBon { display: none } }
      `}</style>
      <section className="barreBon" aria-label="Bon de commande en préparation">
        {ouvert && (
          <div className="volet" id="volet-bon">
            {lignes.map((l) => (
              <div className="ligne" key={l.reference || l.designation}>
                <div><b style={{ fontSize: 14 }}>{l.designation}</b><small>{l.reference} · en {l.unite}</small></div>
                <div className="qte">
                  <button type="button" aria-label="Moins" onClick={() => changerQuantite(slug, l.reference, l.quantite - 1)}><Minus size={15} aria-hidden /></button>
                  <input type="number" min={1} value={l.quantite} aria-label={`Quantité de ${l.designation}`}
                    onChange={(e) => changerQuantite(slug, l.reference, Number(e.target.value))} />
                  <button type="button" aria-label="Plus" onClick={() => changerQuantite(slug, l.reference, l.quantite + 1)}><Plus size={15} aria-hidden /></button>
                </div>
                <button type="button" className="suppr" aria-label={`Retirer ${l.designation}`} onClick={() => retirer(slug, l.reference)}><X size={16} aria-hidden /></button>
              </div>
            ))}
            <div className="pied">
              <span>Les quantités se comptent en conditionnements.</span>
              <button type="button" onClick={() => { vider(slug); setOuvert(false) }}><Trash2 size={14} aria-hidden /> Vider le bon</button>
            </div>
          </div>
        )}
        <div className="tete">
          <ClipboardList size={22} aria-hidden style={{ flex: 'none', color: '#cbd5e1' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>Bon de commande · {total} produit{total > 1 ? 's' : ''}</b>
            <span className="sous">Rien n’est envoyé avant votre validation.</span>
          </div>
          <button type="button" className="btn voir" aria-expanded={ouvert} aria-controls="volet-bon" onClick={() => setOuvert((o) => !o)}>
            <span className="txt">{ouvert ? 'Fermer' : 'Voir et ajuster'}</span>{ouvert ? <X size={16} aria-hidden /> : <ClipboardList size={16} aria-hidden />}
          </button>
          <a className="btn envoyer" href={lienEnvoi(base, lignes)}><Send size={16} aria-hidden /> Envoyer</a>
        </div>
      </section>
    </>
  )
}
