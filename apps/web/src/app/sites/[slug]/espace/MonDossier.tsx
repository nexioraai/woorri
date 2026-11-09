'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { etatDuDossier, type PieceExigee } from './piecesFournisseur'

// ============================================================================
// LOT 12.2 — MON DOSSIER : CE QUI EST FOURNI, ET CE QUI MANQUE.
//
// ── POURQUOI CET ÉCRAN EXISTE SÉPARÉMENT DE « MES DOCUMENTS ».
//
// `/mes-documents` est une CONVERSATION : tout ce qui a circulé, dans les
// deux sens. `/mon-dossier` est une LISTE À COCHER : ce que la Centrale
// exige, et où l'on en est. Les mélanger obligerait un fournisseur à
// retrouver son agrément au milieu de ses factures pour savoir s'il l'a
// déposé.
//
// ── CE QUI MANQUE SE DIT EN PREMIER.
//
// Un dossier incomplet qu'il faut déduire d'une liste de coches est un
// dossier qu'on croit complet. La phrase vient avant le détail.
//
// ── ET LE DÉPÔT SE FAIT PIÈCE PAR PIÈCE.
//
// Un seul champ « déposer un fichier » obligerait à choisir ensuite à quelle
// exigence il répond — un geste de plus, et une occasion de se tromper. Ici
// chaque ligne a son bouton, et le rattachement est décidé par l'endroit où
// l'on clique.
// ============================================================================

type Document = { id: string; piece: string | null; retire_le: string | null; nom: string }

export type MotsDossier = {
  chargement: string
  refus: string
  aucuneExigence: string
  complet: string
  incomplet: string
  fournie: string
  manquante: string
  facultative: string
  deposer: string
  depot: string
  remplacer: string
  erreur: string
}

export default function MonDossier({
  slug, pieces, mots, primary,
}: { slug: string; pieces: PieceExigee[]; mots: MotsDossier; primary: string }) {
  const [documents, setDocuments] = useState<Document[] | null>(null)
  const [refus, setRefus] = useState(false)
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const champs = useRef<Record<string, HTMLInputElement | null>>({})

  const base = `/api/sites/${encodeURIComponent(slug)}/documents`

  const jeton = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const charger = useCallback(async (encoreLa: () => boolean = () => true) => {
    const j = await jeton()
    if (!encoreLa()) return
    if (!j) { setRefus(true); return }
    try {
      const r = await fetch(base, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
      if (!encoreLa()) return
      if (!r.ok) { setRefus(true); return }
      const d = await r.json()
      if (!encoreLa()) return
      setDocuments((d.documents ?? []) as Document[])
    } catch { if (encoreLa()) setRefus(true) }
  }, [base, jeton])

  useEffect(() => {
    let vivant = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : cet effet ne tourne qu'au montage et l'état posé ne redéclenche aucun effet. Le dossier se lit par une requête portant le jeton, qui n'existe que dans le navigateur.
    void charger(() => vivant)
    return () => { vivant = false }
  }, [charger])

  async function deposer(cle: string, fichier: File) {
    setEnvoi(cle); setMessage(null)
    try {
      const j = await jeton()
      const form = new FormData()
      form.append('fichier', fichier)
      // LE RATTACHEMENT VIENT DE L'ENDROIT OÙ L'ON A CLIQUÉ, pas d'un choix
      // supplémentaire que le fournisseur pourrait rater.
      form.append('piece', cle)
      const r = await fetch(base, { method: 'POST', headers: { Authorization: `Bearer ${j}` }, body: form })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setMessage(typeof d.error === 'string' ? d.error : mots.erreur); return }
      // ON RELIT. Ajouter localement montrerait un dépôt qui a peut-être
      // échoué côté base.
      await charger()
    } catch { setMessage(mots.erreur) } finally {
      setEnvoi(null)
      const c = champs.current[cle]
      if (c) c.value = ''
    }
  }

  if (refus) return <p role="alert" style={{ color: '#9b1c1c', lineHeight: 1.6 }}>{mots.refus}</p>
  if (!documents) return <p style={{ opacity: 0.6 }}>{mots.chargement}</p>

  if (pieces.length === 0) {
    // AUCUNE EXIGENCE N'EST PAS UN DOSSIER VIDE : c'est l'absence de dossier.
    // Afficher une liste vide ferait chercher ce qui manque.
    return (
      <p style={{
        padding: '18px 20px', borderRadius: 14, border: '1px solid #e6e6e6',
        background: `color-mix(in srgb, ${primary} 5%, #ffffff)`, lineHeight: 1.65, margin: 0,
      }}>{mots.aucuneExigence}</p>
    )
  }

  const { etats, manquantes, complet } = etatDuDossier(pieces, documents)

  return (
    <div>
      {/* CE QUI MANQUE SE DIT EN PREMIER. Un dossier incomplet qu'il faut
          déduire d'une liste de coches est un dossier qu'on croit complet. */}
      <p style={{
        padding: '14px 18px', borderRadius: 12, marginBottom: 20, lineHeight: 1.6,
        background: complet ? 'color-mix(in srgb, #16794a 10%, #ffffff)' : 'color-mix(in srgb, #b45309 12%, #ffffff)',
        color: complet ? '#115c38' : '#8a3f07', fontWeight: 600,
      }}>
        {complet ? mots.complet : mots.incomplet.replace('{n}', String(manquantes.length))}
      </p>

      <ul style={{ padding: 0, margin: 0 }}>
        {etats.map((p) => (
          <li key={p.cle} style={{
            listStyle: 'none', padding: '15px 18px', marginBottom: 10,
            border: '1px solid #e6e6e6', borderRadius: 14, background: '#fff',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: '#1c1c1c' }}>
                {p.libelle}
                {!p.obligatoire && (
                  <span style={{ marginInlineStart: 8, fontSize: 13, fontWeight: 400, opacity: 0.6 }}>
                    {mots.facultative}
                  </span>
                )}
              </span>
              <span style={{
                fontSize: 12.5, fontWeight: 700, padding: '3px 11px', borderRadius: 999, whiteSpace: 'nowrap',
                background: p.fournie ? 'color-mix(in srgb, #16794a 15%, #ffffff)' : 'color-mix(in srgb, #b45309 15%, #ffffff)',
                color: p.fournie ? '#115c38' : '#8a3f07',
              }}>{p.fournie ? mots.fournie : mots.manquante}</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 13.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                {p.fournie ? mots.remplacer : mots.deposer}
              </label>
              <input type="file" disabled={envoi !== null}
                ref={(el) => { champs.current[p.cle] = el }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void deposer(p.cle, f) }}
                style={{ fontSize: 13.5 }} />
              {envoi === p.cle && <p style={{ margin: '8px 0 0', fontSize: 13.5, opacity: 0.7 }}>{mots.depot}</p>}
            </div>
          </li>
        ))}
      </ul>

      {message && <p role="alert" style={{ marginTop: 14, fontSize: 14, color: '#9b1c1c', lineHeight: 1.55 }}>{message}</p>}
    </div>
  )
}
