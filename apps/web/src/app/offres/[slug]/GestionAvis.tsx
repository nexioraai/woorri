'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LOT 14.1 — LA CENTRALE ÉCRIT, OUVRE, PUBLIE ET ATTRIBUE SES AVIS.
//
// Dans l'écran des offres, au tableau de bord : publier un marché et en
// recevoir les plis sont le même métier, et ce n'est pas du contenu.
//
// L'écran ne décide rien : la route force la naissance en préparation, le
// filtre par site, et refuse une date illisible. Il relit après chaque geste.
// ============================================================================

type Avis = {
  id: string; reference: string; objet: string; etat: 'preparation' | 'ouvert' | 'attribue'
  publie: boolean; portee: 'national' | 'international' | 'tous'
  description: string | null; remise_le: string | null; ouverture_plis: string | null
  criteres_elim: string | null; criteres_notes: string | null; soumission: string | null
  attributaire: string | null; montant_attribue: number | null; devise: string | null
}

const ETAT = { preparation: 'En préparation', ouvert: 'Ouvert aux offres', attribue: 'Attribué' }
const PORTEE = { national: 'National', international: 'International', tous: 'Ouvert à tous' }
const CHAMPS: [keyof Avis, string, 'texte' | 'long' | 'date'][] = [
  ['objet', 'Objet — ce que la Centrale achète', 'texte'],
  ['description', 'Description détaillée du besoin', 'long'],
  ['remise_le', 'Date limite de remise', 'date'],
  ['ouverture_plis', 'Ouverture des plis', 'date'],
  ['criteres_elim', 'Critères d’élimination', 'long'],
  ['criteres_notes', 'Critères de notation', 'long'],
  ['soumission', 'Modalités de soumission', 'long'],
]

const versLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : '')

export default function GestionAvis({ slug }: { slug: string }) {
  const [avis, setAvis] = useState<Avis[] | null>(null)
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [brouillon, setBrouillon] = useState<Record<string, unknown>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [nouveau, setNouveau] = useState({ reference: '', objet: '' })
  const base = `/api/sites/${encodeURIComponent(slug)}/avis`

  const appel = useCallback(async (methode: string, corps?: unknown) => {
    const { data } = await supabase.auth.getSession()
    const r = await fetch(base, {
      method: methode, cache: 'no-store',
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}`, 'content-type': 'application/json' },
      ...(corps ? { body: JSON.stringify(corps) } : {}),
    })
    const d = await r.json().catch(() => ({}))
    return { ok: r.ok, d }
  }, [base])

  const relire = useCallback(async () => {
    const { ok, d } = await appel('GET')
    if (ok) setAvis(d.avis ?? [])
    else setMessage('Ce site ne vous appartient pas, ou le service est indisponible.')
  }, [appel])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : l'état posé ne redéclenche aucun effet ; la liste se lit avec le jeton du navigateur.
    void relire()
  }, [relire])

  async function envoyer(methode: 'POST' | 'PATCH', corps: Record<string, unknown>) {
    setMessage(null)
    const { ok, d } = await appel(methode, corps)
    if (!ok) { setMessage(typeof d.error === 'string' ? d.error : 'Refusé.'); return false }
    await relire()
    return true
  }

  const champ: React.CSSProperties = {
    width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, marginTop: 4,
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)', color: '#ededed',
  }
  const bouton = (c: string): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: 'transparent', color: c, border: `1px solid ${c}66`,
  })

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Vos appels d’offres</h2>
      <p style={{ fontSize: 14, opacity: 0.65, margin: '0 0 16px' }}>
        Un avis naît en préparation et invisible. Vous l’ouvrez aux offres, puis vous le publiez.
      </p>

      <form onSubmit={async (e) => {
        e.preventDefault()
        if (await envoyer('POST', nouveau)) setNouveau({ reference: '', objet: '' })
      }} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, marginBottom: 20 }}>
        <input placeholder="Référence (ex. 004/AONO/CPA/2026)" value={nouveau.reference} style={champ}
          onChange={(e) => setNouveau({ ...nouveau, reference: e.target.value })} />
        <input placeholder="Objet du marché" value={nouveau.objet} style={champ}
          onChange={(e) => setNouveau({ ...nouveau, objet: e.target.value })} />
        <button type="submit" style={{ ...bouton('#FA5D1E'), marginTop: 4 }}>+ Créer</button>
      </form>

      {message && <p role="alert" style={{ color: '#f87171', fontSize: 14 }}>{message}</p>}
      {avis && avis.length === 0 && <p style={{ opacity: 0.55 }}>Aucun avis pour l’instant.</p>}

      {(avis ?? []).map((a) => (
        <div key={a.id} style={{ padding: '14px 16px', marginBottom: 10, borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>{a.objet}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, opacity: 0.55, fontFamily: 'ui-monospace, monospace' }}>
                {a.reference} · {ETAT[a.etat]} · {PORTEE[a.portee]} · {a.publie ? 'PUBLIÉ' : 'non publié'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {a.etat === 'preparation' && <button type="button" style={bouton('#16794a')}
                onClick={() => void envoyer('PATCH', { id: a.id, etat: 'ouvert' })}>Ouvrir aux offres</button>}
              <button type="button" style={bouton(a.publie ? '#9b1c1c' : '#16794a')}
                onClick={() => void envoyer('PATCH', { id: a.id, publie: !a.publie })}>
                {a.publie ? 'Dépublier' : 'Publier'}</button>
              <button type="button" style={bouton('#9ecbff')}
                onClick={() => { setOuvert(ouvert === a.id ? null : a.id); setBrouillon({}) }}>
                {ouvert === a.id ? 'Fermer' : 'Détails'}</button>
            </div>
          </div>

          {ouvert === a.id && (
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <label style={{ fontSize: 13, opacity: 0.75 }}>Portée
                <select defaultValue={a.portee} style={champ}
                  onChange={(e) => setBrouillon({ ...brouillon, portee: e.target.value })}>
                  {Object.entries(PORTEE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              {CHAMPS.map(([k, libelle, forme]) => (
                <label key={k} style={{ fontSize: 13, opacity: 0.75 }}>{libelle}
                  {forme === 'long'
                    ? <textarea rows={3} defaultValue={(a[k] as string) ?? ''} style={champ}
                        onChange={(e) => setBrouillon({ ...brouillon, [k]: e.target.value })} />
                    : <input type={forme === 'date' ? 'datetime-local' : 'text'} style={champ}
                        defaultValue={forme === 'date' ? versLocal(a[k] as string | null) : ((a[k] as string) ?? '')}
                        onChange={(e) => setBrouillon({
                          ...brouillon,
                          // LA DATE PART EN ISO : l'heure locale saisie, convertie ici.
                          [k]: forme === 'date' && e.target.value ? new Date(e.target.value).toISOString() : e.target.value,
                        })} />}
                </label>
              ))}
              <fieldset style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 10 }}>
                <legend style={{ fontSize: 13, opacity: 0.75 }}>Attribution (passe l’avis en « Attribué »)</legend>
                <input placeholder="Attributaire" defaultValue={a.attributaire ?? ''} style={champ}
                  onChange={(e) => setBrouillon({ ...brouillon, etat: 'attribue', attributaire: e.target.value })} />
                <input placeholder="Montant attribué" defaultValue={a.montant_attribue ?? ''} style={champ}
                  onChange={(e) => setBrouillon({ ...brouillon, etat: 'attribue', montant_attribue: e.target.value })} />
              </fieldset>
              <button type="button" style={bouton('#FA5D1E')}
                onClick={async () => { if (await envoyer('PATCH', { id: a.id, ...brouillon })) setBrouillon({}) }}>
                Enregistrer
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
