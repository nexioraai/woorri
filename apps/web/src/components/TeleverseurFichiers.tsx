'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 5 — DÉPOSER, LISTER, RETIRER UN FICHIER.
//
// POURQUOI IL EXISTE. Le bloc « documents » n'affichait que des liens vers des
// URL. Sans écran de dépôt, le client devait héberger ses PDF ailleurs puis
// recopier une adresse — c'est-à-dire : il ne le faisait pas, et les liens
// restaient morts. C'est ce que montrait /fournisseurs/documents.
//
// L'EN-TÊTE `Authorization` EST OBLIGATOIRE sur les trois appels. Le cliquet
// `appelsAuthentifies` existe parce que ce défaut exact a déjà été payé en
// production : l'écran semblait marcher, la route répondait 401, et le client
// concluait que la fonctionnalité ne marchait pas. Elle ne marchait pas.
//
// IL NE SAIT PAS ÉCRIRE DANS LE STOCKAGE. Aucune écriture n'est accordée dans
// le compartiment — mesuré, anon dépose → refusé. Tout passe par la route,
// qui vérifie la propriété du site avant d'employer le rôle de service.
// ============================================================================

export type Fichier = { nom: string; url: string; taille: number | null; type: string | null; maj: string | null }

const poids = (o: number | null) =>
  o === null ? '' : o < 1024 ? `${o} o` : o < 1048576 ? `${Math.round(o / 1024)} Ko` : `${(o / 1048576).toFixed(1)} Mo`

export default function TeleverseurFichiers({
  slug, dossier = 'documents', onChoisir,
}: { slug: string; dossier?: 'documents' | 'photos' | 'appels-offres'; onChoisir?: (f: Fichier) => void }) {
  const [fichiers, setFichiers] = useState<Fichier[]>([])
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const entete = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    const jeton = data.session?.access_token
    return jeton ? { Authorization: `Bearer ${jeton}` } : undefined
  }, [])

  const recharger = useCallback(async () => {
    const h = await entete()
    const r = await fetch(`/api/sites/${slug}/fichiers?dossier=${dossier}`, { headers: h })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setErreur(j.error ?? 'Lecture impossible.'); return }
    setErreur(null)
    setFichiers(j.fichiers ?? [])
  }, [slug, dossier, entete])

  useEffect(() => { let vivant = true; void (async () => { if (vivant) await recharger() })(); return () => { vivant = false } }, [recharger])

  const deposer = async (f: File) => {
    setOccupe(true); setErreur(null)
    const corps = new FormData()
    corps.append('fichier', f); corps.append('dossier', dossier)
    const r = await fetch(`/api/sites/${slug}/fichiers`, { method: 'POST', headers: await entete(), body: corps })
    const j = await r.json().catch(() => ({}))
    setOccupe(false)
    if (!r.ok) { setErreur(j.error ?? 'Dépôt refusé.'); return }
    // On RECHARGE depuis la route au lieu d'ajouter la réponse à la liste :
    // afficher ce qu'on croit avoir envoyé, c'est afficher son intention.
    await recharger()
  }

  const retirer = async (nom: string) => {
    setOccupe(true); setErreur(null)
    const r = await fetch(`/api/sites/${slug}/fichiers?dossier=${dossier}&nom=${encodeURIComponent(nom)}`,
      { method: 'DELETE', headers: await entete() })
    const j = await r.json().catch(() => ({}))
    setOccupe(false)
    if (!r.ok) { setErreur(j.error ?? 'Retrait refusé.'); return }
    await recharger()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className={`text-xs px-3 py-2 rounded-lg border border-white/15 cursor-pointer hover:bg-white/10 transition ${occupe ? 'opacity-50 pointer-events-none' : ''}`}>
          {occupe ? 'Envoi en cours…' : 'Téléverser un fichier'}
          <input type="file" className="hidden" disabled={occupe}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void deposer(f) }} />
        </label>
        <span className="text-[11px] opacity-50">PDF, Word, Excel, CSV, JPEG, PNG, WebP, AVIF — 25 Mo maximum</span>
      </div>

      {erreur && <p className="text-xs text-red-400">{erreur}</p>}

      {fichiers.length === 0 && !erreur && <p className="text-xs opacity-55">Aucun fichier dans « {dossier} ».</p>}

      {fichiers.map((f) => (
        <div key={f.nom} className="flex items-center gap-2 rounded-lg border border-white/12 px-3 py-2">
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm truncate hover:underline">{f.nom}</a>
          <span className="text-[11px] opacity-50 tabular-nums">{poids(f.taille)}</span>
          {onChoisir && (
            <button type="button" onClick={() => onChoisir(f)}
              className="text-[11px] px-2 py-1 rounded-md border border-white/15 hover:bg-white/10">employer</button>
          )}
          <button type="button" aria-label={`Retirer ${f.nom}`} disabled={occupe}
            onClick={() => void retirer(f.nom)} className="px-1.5 text-red-400 hover:text-red-300 disabled:opacity-40">✕</button>
        </div>
      ))}
    </div>
  )
}
