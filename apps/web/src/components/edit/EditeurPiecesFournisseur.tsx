'use client'

import type { PieceExigee } from '@/app/sites/[slug]/espace/piecesFournisseur'

// ============================================================================
// LOT 12.2 — LA CENTRALE ÉCRIT ELLE-MÊME CE QU'ELLE EXIGE.
//
// ── POURQUOI PAS UNE LISTE EN DUR.
//
// Elle aurait voulu dire : agrément pharmaceutique, registre du commerce,
// attestation fiscale — devinés par moi, pour un pays dont je ne connais pas
// les formulaires. La Centrale sait ce qu'elle exige.
//
// ── LA CLÉ SE FABRIQUE, ELLE NE SE TAPE PAS.
//
// Elle doit traverser un formulaire et une URL. La demander à quelqu'un qui
// écrit « Attestation de régularité fiscale » produirait des espaces, des
// accents et des majuscules — et un rattachement qui échoue sans rien dire.
//
// ── ET ELLE NE CHANGE PLUS, UNE FOIS POSÉE.
//
// C'est elle qui rattache les documents déjà déposés. La modifier les
// détacherait tous, en silence : le fournisseur verrait son dossier
// redevenir incomplet sans avoir rien fait. Le LIBELLÉ, lui, se corrige
// librement.
// ============================================================================

/** La clé, fabriquée depuis le libellé : minuscules, sans accent, sans espace. */
function cleDepuis(libelle: string): string {
  return libelle
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'piece'
}

export default function EditeurPiecesFournisseur({
  items, onChange,
}: { items: PieceExigee[]; onChange: (p: PieceExigee[]) => void }) {
  const maj = (i: number, champ: 'libelle' | 'obligatoire', valeur: string | boolean) =>
    onChange(items.map((p, j) => (j === i ? { ...p, [champ]: valeur } : p)))

  const bouger = (i: number, pas: number) => {
    const j = i + pas
    if (j < 0 || j >= items.length) return
    const c = [...items]
    ;[c[i], c[j]] = [c[j], c[i]]
    onChange(c)
  }

  const ajouter = () => {
    const libelle = 'Nouvelle pièce'
    // UNE CLÉ UNIQUE, MÊME EN AJOUTANT DEUX FOIS LA MÊME CHOSE. Deux pièces
    // de même clé rendraient « est-elle fournie ? » ambigu.
    let cle = cleDepuis(libelle)
    let n = 2
    while (items.some((p) => p.cle === cle)) { cle = `${cleDepuis(libelle)}-${n}`; n++ }
    onChange([...items, { cle, libelle, obligatoire: true }])
  }

  const champ = 'w-full mt-1 px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/15 text-sm'

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-white/50">
          Aucune pièce exigée. L’écran « Mon dossier » dira aux fournisseurs que la liste n’est pas encore publiée.
        </p>
      )}

      {items.map((p, i) => (
        <div key={p.cle} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex-1 text-[11px] font-mono opacity-50 truncate" title="Clé stable — elle rattache les documents déjà déposés">
              {p.cle}
            </span>
            <button type="button" aria-label="Monter" onClick={() => bouger(i, -1)} className="px-2 opacity-70 hover:opacity-100">↑</button>
            <button type="button" aria-label="Descendre" onClick={() => bouger(i, 1)} className="px-2 opacity-70 hover:opacity-100">↓</button>
            <button type="button" aria-label="Retirer cette exigence"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="px-2 text-red-400 hover:text-red-300">✕</button>
          </div>

          <label className="block mb-2">
            <span className="text-[11px] uppercase tracking-wide opacity-55">Libellé vu par le fournisseur</span>
            <input value={p.libelle} onChange={(e) => maj(i, 'libelle', e.target.value)} className={champ} />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.obligatoire !== false}
              onChange={(e) => maj(i, 'obligatoire', e.target.checked)} />
            Obligatoire — son absence rend le dossier incomplet
          </label>
        </div>
      ))}

      <button type="button" onClick={ajouter}
        className="text-sm px-3 py-2 rounded-lg border border-white/15 hover:bg-white/10">
        + Ajouter une pièce exigée
      </button>
    </div>
  )
}
