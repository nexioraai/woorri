'use client'

import { useState } from 'react'
import TeleverseurFichiers from '../TeleverseurFichiers'
import { monogrammeDe, type Partenaire } from '@/app/sites/[slug]/pages/Partenaires'

// ============================================================================
// LOT 15.13 — LES PARTENAIRES DE L'ACCUEIL, ÉDITABLES AVEC LEUR LOGO.
//
// ── CE QUE LE PROPRIÉTAIRE A DEMANDÉ.
//
// « il faut que tu mettes les symbole ou photo upload, ou pouvoir upload ».
// Un bandeau de partenaires sans logos reste un bandeau de monogrammes : il
// tient debout, mais ce n'est pas ce qu'on reconnaît sur la page d'EPSS.
//
// ── LE LOGO SE TÉLÉVERSE, L'ADRESSE SE TAPE.
//
// Ce sont deux natures différentes et l'écran ne les confond pas : le logo
// est un FICHIER qu'on nous confie ; l'adresse est le site du partenaire,
// CHEZ LUI. Proposer un téléverseur pour l'adresse ferait croire qu'il faut
// nous remettre le site d'autrui — c'est le défaut corrigé le même jour
// dans l'éditeur de blocs.
//
// ── ON MONTRE LE MONOGRAMME TANT QU'IL N'Y A PAS DE LOGO.
//
// Pas une case vide : la personne voit exactement ce que verra le visiteur,
// et comprend qu'un partenaire sans logo n'est pas un partenaire cassé.
// ============================================================================

export default function EditeurPartenaires({
  items, onChange, slug, primary = '#1F6B4A',
}: {
  items: Partenaire[]
  onChange: (p: Partenaire[]) => void
  slug: string
  primary?: string
}) {
  const [choix, setChoix] = useState<number | null>(null)

  const maj = (i: number, champ: keyof Partenaire, valeur: string) =>
    onChange(items.map((p, j) => (j === i ? { ...p, [champ]: valeur } : p)))

  const bouger = (i: number, pas: number) => {
    const j = i + pas
    if (j < 0 || j >= items.length) return
    const c = [...items]
    ;[c[i], c[j]] = [c[j], c[i]]
    onChange(c)
  }

  const champ = 'w-full mt-1 px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/15 text-sm'

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-white/50">
          Aucun partenaire. La section n’apparaît pas sur l’accueil tant qu’elle est vide.
        </p>
      )}

      {items.map((p, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-3 mb-3">
            {/* CE QUE VERRA LE VISITEUR, en petit. Un aperçu vaut mieux
                qu'une explication sur ce qui se passe sans logo. */}
            {p.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- l'URL vient du site, pas du loader
              <img src={p.logo} alt="" className="w-10 h-10 object-contain rounded bg-white p-1 shrink-0" />
            ) : (
              <span className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-bold"
                style={{ background: `color-mix(in srgb, ${primary} 22%, transparent)`, color: primary }}>
                {monogrammeDe(p.nom || '?')}
              </span>
            )}
            <span className="flex-1 text-sm font-semibold truncate">{p.nom || '(sans nom)'}</span>
            <button type="button" aria-label="Monter" onClick={() => bouger(i, -1)} className="px-2 opacity-70 hover:opacity-100">↑</button>
            <button type="button" aria-label="Descendre" onClick={() => bouger(i, 1)} className="px-2 opacity-70 hover:opacity-100">↓</button>
            <button type="button" aria-label="Retirer ce partenaire"
              onClick={() => { onChange(items.filter((_, j) => j !== i)); setChoix(null) }}
              className="px-2 text-red-400 hover:text-red-300">✕</button>
          </div>

          <label className="block mb-2">
            <span className="text-[11px] uppercase tracking-wide opacity-55">Nom (obligatoire)</span>
            <input value={p.nom} onChange={(e) => maj(i, 'nom', e.target.value)} className={champ} />
          </label>

          <label className="block mb-2">
            <span className="text-[11px] uppercase tracking-wide opacity-55">Adresse de leur site (facultative)</span>
            <input value={p.url ?? ''} placeholder="https://…" onChange={(e) => maj(i, 'url', e.target.value)} className={champ} />
          </label>

          <div>
            <span className="text-[11px] uppercase tracking-wide opacity-55">Logo (facultatif)</span>
            <div className="flex items-center gap-2 mt-1">
              <input value={p.logo ?? ''} onChange={(e) => maj(i, 'logo', e.target.value)} className={champ} />
              {p.logo && (
                <button type="button" onClick={() => maj(i, 'logo', '')}
                  className="text-[11px] px-2 py-1 rounded-md border border-white/15 hover:bg-white/10 shrink-0">retirer</button>
              )}
            </div>
            <button type="button" onClick={() => setChoix(choix === i ? null : i)}
              className="mt-1.5 text-[11px] px-2 py-1 rounded-md border border-white/15 hover:bg-white/10">
              {choix === i ? 'fermer' : 'téléverser ou choisir un logo'}
            </button>
            {choix === i && (
              <div className="mt-2 rounded-lg border border-white/12 p-2">
                <TeleverseurFichiers slug={slug} dossier="photos"
                  onChoisir={(f) => { maj(i, 'logo', f.url); setChoix(null) }} />
              </div>
            )}
          </div>
        </div>
      ))}

      <button type="button"
        onClick={() => onChange([...items, { nom: 'Nouveau partenaire' }])}
        className="text-sm px-3 py-2 rounded-lg border border-white/15 hover:bg-white/10">
        + Ajouter un partenaire
      </button>
    </div>
  )
}
