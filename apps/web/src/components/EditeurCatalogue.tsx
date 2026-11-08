'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 6 — L'ÉCRAN DU CATALOGUE.
//
// POURQUOI IL EXISTE. Sans lui, le catalogue est une table vide que personne
// ne peut remplir — et c'est GEN-D044 : poser une fonction sans le geste qui
// la rend utilisable. La CPA saisit ses références ici, et les retire ici.
//
// L'EN-TÊTE `Authorization` EST OBLIGATOIRE sur les quatre appels. Le cliquet
// `appelsAuthentifies` existe parce que ce défaut exact a été payé en
// production : l'écran semblait marcher, la route répondait 401, et le client
// concluait que la fonctionnalité ne marchait pas.
//
// IL N'Y A NI PRIX NI STOCK À SAISIR, et ce n'est pas un oubli : la table
// n'en porte pas. Sur un marché d'État, un prix public engage.
//
// CHAQUE ÉCRITURE RECHARGE DEPUIS LA ROUTE. Afficher ce qu'on croit avoir
// envoyé, c'est afficher son intention.
// ============================================================================

type Produit = {
  id: string
  reference: string
  denomination: string
  famille: string | null
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  chaine_du_froid: boolean
  note: string | null
  publie: boolean
  ordre: number
}

const VIDE = {
  reference: '', denomination: '', famille: '', forme: '',
  dosage: '', conditionnement: '', chaine_du_froid: false, note: '',
}

export default function EditeurCatalogue({ slug }: { slug: string }) {
  const [produits, setProduits] = useState<Produit[]>([])
  const [neuf, setNeuf] = useState({ ...VIDE })
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const entete = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    const jeton = data.session?.access_token
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (jeton) h.Authorization = `Bearer ${jeton}`
    return h
  }, [])

  const recharger = useCallback(async () => {
    const r = await fetch(`/api/sites/${slug}/catalogue`, { headers: await entete() })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setErreur(j.error ?? 'Lecture impossible.'); return }
    setErreur(null)
    setProduits(j.produits ?? [])
  }, [slug, entete])

  useEffect(() => {
    let vivant = true
    void (async () => { if (vivant) await recharger() })()
    return () => { vivant = false }
  }, [recharger])

  const appeler = async (methode: string, corps?: unknown, requete = '') => {
    setOccupe(true); setErreur(null)
    const r = await fetch(`/api/sites/${slug}/catalogue${requete}`, {
      method: methode, headers: await entete(),
      ...(corps ? { body: JSON.stringify(corps) } : {}),
    })
    const j = await r.json().catch(() => ({}))
    setOccupe(false)
    if (!r.ok) { setErreur(j.error ?? 'Action refusée.'); return false }
    await recharger()
    return true
  }

  const ajouter = async () => {
    const ok = await appeler('POST', {
      ...neuf,
      famille: neuf.famille || null, forme: neuf.forme || null,
      dosage: neuf.dosage || null, conditionnement: neuf.conditionnement || null,
      note: neuf.note || null,
    })
    if (ok) setNeuf({ ...VIDE })
  }

  const champ = (
    cle: keyof typeof VIDE, etiquette: string, large = false,
  ) => (
    <label className={large ? 'sm:col-span-2' : ''}>
      <span className="block text-[11px] uppercase tracking-wide opacity-55 mb-1">{etiquette}</span>
      <input
        value={String(neuf[cle] ?? '')}
        onChange={(e) => setNeuf({ ...neuf, [cle]: e.target.value })}
        className="w-full px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/15 text-sm"
      />
    </label>
  )

  return (
    <div className="space-y-4">
      {erreur && <p className="text-xs text-red-400">{erreur}</p>}

      <div className="rounded-xl border border-white/15 p-3 space-y-3">
        <p className="text-sm font-medium">Ajouter une référence</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {champ('reference', 'Référence')}
          {champ('denomination', 'Dénomination')}
          {champ('famille', 'Famille')}
          {champ('forme', 'Forme')}
          {champ('dosage', 'Dosage')}
          {champ('conditionnement', 'Conditionnement')}
          {champ('note', 'Note', true)}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={neuf.chaine_du_froid}
            onChange={(e) => setNeuf({ ...neuf, chaine_du_froid: e.target.checked })} />
          Chaîne du froid (2 à 8 °C)
        </label>
        <button type="button" disabled={occupe || !neuf.reference.trim() || !neuf.denomination.trim()}
          onClick={() => void ajouter()}
          className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:bg-white/10 transition disabled:opacity-40">
          Ajouter au catalogue
        </button>
      </div>

      {produits.length === 0 && !erreur && (
        <p className="text-sm opacity-60">Aucune référence. Le catalogue public affichera qu’il n’est pas encore publié.</p>
      )}

      {produits.map((p) => (
        <div key={p.id} className="flex items-center gap-2 rounded-lg border border-white/12 px-3 py-2">
          <span className="font-mono text-xs opacity-70">{p.reference}</span>
          <span className="flex-1 text-sm truncate">{p.denomination}</span>
          {p.chaine_du_froid && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">2–8 °C</span>}
          {/* PUBLIER EST UNE BASCULE EXPLICITE : rien ne paraît au public
              sans ce geste, et rien ne disparaît sans ce geste non plus. */}
          <button type="button" disabled={occupe}
            onClick={() => void appeler('PATCH', { id: p.id, publie: !p.publie })}
            className={`text-[11px] px-2 py-1 rounded-md border ${p.publie ? 'border-green-500/40 text-green-400' : 'border-white/15 opacity-70'}`}>
            {p.publie ? 'publié' : 'brouillon'}
          </button>
          <button type="button" aria-label={`Retirer ${p.reference}`} disabled={occupe}
            onClick={() => void appeler('DELETE', undefined, `?id=${encodeURIComponent(p.id)}`)}
            className="px-1.5 text-red-400 hover:text-red-300 disabled:opacity-40">✕</button>
        </div>
      ))}
    </div>
  )
}
