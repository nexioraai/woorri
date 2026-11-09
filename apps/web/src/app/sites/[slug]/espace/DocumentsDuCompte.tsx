'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 12.1 — LE DOSSIER D'UN COMPTE, VU DES DEUX CÔTÉS.
//
// ── UN SEUL COMPOSANT, DEUX AUDIENCES.
//
// La Centrale et le titulaire voient la MÊME conversation : ce qui a été
// adressé, ce qui a été remis. Deux écrans auraient produit deux lectures de
// la même règle, et c'est celle qu'on ne regarde pas qui finit par montrer
// une pièce de trop.
//
// ── IL NE DÉCIDE RIEN.
//
// Qui peut retirer, qui peut voir : la route tranche. L'écran n'affiche le
// bouton « retirer » que sur `parMoi`, que la route a calculé — masquer un
// bouton ne protège rien, mais proposer un geste qui sera refusé fait
// douter de tout le reste.
//
// ── LE TÉLÉCHARGEMENT DEMANDE UN LIEN À CHAQUE FOIS.
//
// Le seau est privé : il n'existe aucune adresse permanente. On demande une
// signature de soixante secondes au moment du clic. Garder le lien en
// mémoire pour « éviter un appel » le ferait expirer dans la main de
// quelqu'un qui n'aurait rien fait de mal.
//
// ── UN DOCUMENT RETIRÉ RESTE ÉCRIT.
//
// Barré, daté, non téléchargeable. Dans un marché public, « ce document a
// existé et a été retiré » est une information ; le faire disparaître
// permettrait de nier un dépôt.
// ============================================================================

export type Document = {
  id: string
  sens: 'vers_le_compte' | 'vers_la_centrale'
  nom: string
  octets: number
  type_mime: string
  depose_le: string
  retire_le: string | null
  parMoi: boolean
}

export type MotsDocuments = {
  chargement: string
  refus: string
  vide: string
  recus: string
  remis: string
  deposer: string
  depot: string
  telecharger: string
  retirer: string
  retireLe: string
  depuis: string
  erreur: string
  expire: string
}

const poids = (o: number) =>
  o >= 1_048_576 ? `${(o / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`

export default function DocumentsDuCompte({
  slug, compte, mots, primary,
}: {
  slug: string
  /** La Centrale désigne le compte ; le titulaire n'a pas à le faire. */
  compte?: string
  mots: MotsDocuments
  primary: string
}) {
  const [liste, setListe] = useState<Document[] | null>(null)
  const [refus, setRefus] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const champ = useRef<HTMLInputElement>(null)

  const base = `/api/sites/${encodeURIComponent(slug)}/documents`
  const suffixe = compte ? `?compte=${encodeURIComponent(compte)}` : ''

  const jeton = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const charger = useCallback(async (encoreLa: () => boolean = () => true) => {
    const j = await jeton()
    if (!encoreLa()) return
    if (!j) { setRefus(true); return }
    try {
      const r = await fetch(base + suffixe, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
      if (!encoreLa()) return
      if (!r.ok) { setRefus(true); return }
      const d = await r.json()
      if (!encoreLa()) return
      setListe((d.documents ?? []) as Document[])
      setRefus(false)
    } catch { if (encoreLa()) setRefus(true) }
  }, [base, suffixe, jeton])

  useEffect(() => {
    let vivant = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : cet effet ne tourne qu'au montage et l'état posé ne redéclenche aucun effet. La liste se lit par une requête portant le jeton, qui n'existe que dans le navigateur.
    void charger(() => vivant)
    return () => { vivant = false }
  }, [charger])

  async function deposer(fichier: File) {
    setEnvoi(true); setMessage(null)
    try {
      const j = await jeton()
      const form = new FormData()
      form.append('fichier', fichier)
      if (compte) form.append('compte', compte)
      const r = await fetch(base, { method: 'POST', headers: { Authorization: `Bearer ${j}` }, body: form })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setMessage(typeof d.error === 'string' ? d.error : mots.erreur); return }
      // ON RELIT LA LISTE. Ajouter localement ce qu'on vient d'envoyer
      // montrerait un dépôt qui a peut-être échoué côté base.
      await charger()
    } catch { setMessage(mots.erreur) } finally {
      setEnvoi(false)
      if (champ.current) champ.current.value = ''
    }
  }

  async function telecharger(d: Document) {
    const j = await jeton()
    const r = await fetch(`${base}?telecharger=${encodeURIComponent(d.id)}`, {
      headers: { Authorization: `Bearer ${j}` }, cache: 'no-store',
    })
    const rep = await r.json().catch(() => ({}))
    if (!r.ok || typeof rep.url !== 'string') { setMessage(typeof rep.error === 'string' ? rep.error : mots.erreur); return }
    window.open(rep.url, '_blank', 'noopener,noreferrer')
  }

  async function retirer(d: Document) {
    const j = await jeton()
    const r = await fetch(`${base}?id=${encodeURIComponent(d.id)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${j}` },
    })
    if (!r.ok) { setMessage(mots.erreur); return }
    await charger()
  }

  if (refus) return <p role="alert" style={{ color: '#9b1c1c', lineHeight: 1.6 }}>{mots.refus}</p>
  if (!liste) return <p style={{ opacity: 0.6 }}>{mots.chargement}</p>

  const recus = liste.filter((d) => d.sens === 'vers_le_compte')
  const remis = liste.filter((d) => d.sens === 'vers_la_centrale')

  const ligne = (d: Document) => (
    <li key={d.id} style={{
      listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 10,
      alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px', marginBottom: 8,
      border: '1px solid #e6e6e6', borderRadius: 12, background: '#fff',
      opacity: d.retire_le ? 0.62 : 1,
    }}>
      <span style={{ minWidth: 0 }}>
        <span style={{
          fontSize: 15, fontWeight: 600, color: '#1c1c1c',
          textDecoration: d.retire_le ? 'line-through' : 'none',
        }}>{d.nom}</span>
        <span style={{ display: 'block', fontSize: 13, opacity: 0.62, marginTop: 3 }}>
          {poids(d.octets)} · {mots.depuis} {d.depose_le.slice(0, 10)}
          {d.retire_le ? ` · ${mots.retireLe} ${d.retire_le.slice(0, 10)}` : ''}
        </span>
      </span>
      <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {!d.retire_le && (
          <button type="button" onClick={() => void telecharger(d)} style={{
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13.5,
            fontWeight: 600, background: 'transparent', color: primary, border: `1px solid ${primary}`,
          }}>{mots.telecharger}</button>
        )}
        {/* LE BOUTON NE PARAÎT QUE SUR `parMoi`, que la ROUTE a calculé.
            Proposer un geste qui sera refusé fait douter de tout le reste. */}
        {!d.retire_le && d.parMoi && (
          <button type="button" onClick={() => void retirer(d)} style={{
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13.5,
            background: 'transparent', color: '#9b1c1c', border: '1px solid rgba(155,28,28,0.35)',
          }}>{mots.retirer}</button>
        )}
      </span>
    </li>
  )

  const bloc = (titre: string, items: Document[]) => (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>{titre}</h2>
      {items.length === 0
        // UNE LISTE VIDE SE DIT. Un espace blanc laisserait croire que la
        // page n'a pas fini de charger.
        ? <p style={{ opacity: 0.58, margin: 0, fontSize: 14.5 }}>{mots.vide}</p>
        : <ul style={{ padding: 0, margin: 0 }}>{items.map(ligne)}</ul>}
    </section>
  )

  return (
    <div>
      {bloc(mots.recus, recus)}
      {bloc(mots.remis, remis)}

      <div style={{ padding: '16px 18px', border: '1px dashed #d4d4d4', borderRadius: 12 }}>
        <label style={{ fontSize: 14.5, fontWeight: 600, display: 'block', marginBottom: 8 }}>
          {mots.deposer}
        </label>
        <input ref={champ} type="file" disabled={envoi}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void deposer(f) }}
          style={{ fontSize: 14 }} />
        {envoi && <p style={{ margin: '10px 0 0', fontSize: 14, opacity: 0.7 }}>{mots.depot}</p>}
        {message && <p role="alert" style={{ margin: '10px 0 0', fontSize: 14, color: '#9b1c1c', lineHeight: 1.55 }}>{message}</p>}
      </div>
    </div>
  )
}
