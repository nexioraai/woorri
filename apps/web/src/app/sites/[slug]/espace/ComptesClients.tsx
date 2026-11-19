'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, HeartHandshake, Search, Mail, Phone, CalendarDays, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FilMessages from './FilMessages'
import SuiviCommande from './SuiviCommande'
import type { MotsMessages } from './motsMessages'
import type { MotsCommandes } from './motsCommandes'
import type { Message } from '@/lib/commandes/messages'

// ============================================================================
// « CLIENTS » — l'écran de la Division DDM (CPA, 2026-11-19).
//
// « Quand il clique sur Clients, il voit tous ses clients, avec leur nom —
// hôpital, ONG ou autre — ; il peut cliquer et communiquer : envoi,
// réception… » À gauche, tous les clients (recherche, filtre par type,
// dernier message, non-lus) ; à droite, le client choisi : ses messages, ses
// commandes, son compte (suspendre / réactiver).
//
// Ce que l'écran montre vient de trois routes, toutes gardées par
// `requireGestionClients` (propriétaire du site ou agent du service `ddm`).
// ============================================================================

type Client = {
  id: string; email: string; etat: 'actif' | 'suspendu' | 'en_attente'
  organisation: string | null; nom: string | null; telephone: string | null; cree_le: string; type_client?: string | null
}
type Fil = { dernier: string; dernierLe: string; dernierDe: string; nonLus: number }
type Commande = { id: string; reference: string; etat: string; cree_le: string; compte_id: string; lignes: { designation: string; quantite: number; unite: string | null }[] }

const initiales = (t: string) => { const m = t.trim().split(/\s+/).filter(Boolean); return ((m[0]?.[0] ?? '?') + (m.length > 1 ? m[m.length - 1][0] : '')).toUpperCase() }

export default function ComptesClients({ slug, accent, mots, motsCmd }: { slug: string; accent: string; mots: MotsMessages; motsCmd: MotsCommandes }) {
  const M = mots.clients
  const [clients, setClients] = useState<Client[] | null>(null)
  const [fils, setFils] = useState<Record<string, Fil>>({})
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [filtre, setFiltre] = useState('')
  const [type, setType] = useState<'tous' | 'sante' | 'ong'>('tous')
  const [choisi, setChoisi] = useState<string | null>(null)
  const [onglet, setOnglet] = useState<'messages' | 'commandes' | 'infos'>('messages')
  const api = `/api/sites/${encodeURIComponent(slug)}`

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token ?? ''

  const relireListe = useCallback(async () => {
    const j = await jeton()
    const [rc, rf, rk] = await Promise.all([
      fetch(`${api}/clients`, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' }),
      fetch(`${api}/messages-clients`, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' }),
      fetch(`${api}/commandes`, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' }),
    ])
    if (!rc.ok) { const d = await rc.json().catch(() => ({})); setMessage(typeof d.error === 'string' ? d.error : 'Accès refusé.'); return }
    setClients(((await rc.json()).clients ?? []) as Client[])
    if (rf.ok) setFils(((await rf.json()).fils ?? {}) as Record<string, Fil>)
    if (rk.ok) setCommandes(((await rk.json()).commandes ?? []) as Commande[])
  }, [api])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial : la liste se lit avec le jeton du navigateur.
    void relireListe()
    const id = setInterval(() => { if (document.visibilityState === 'visible') void relireListe() }, 20000)
    return () => clearInterval(id)
  }, [relireListe])

  const q = filtre.trim().toLowerCase()
  const vus = useMemo(() => (clients ?? [])
    .filter((c) => type === 'tous' || (type === 'ong' ? c.type_client === 'ong' : c.type_client !== 'ong'))
    .filter((c) => !q || [c.organisation, c.nom, c.email, c.telephone].some((v) => (v ?? '').toLowerCase().includes(q)))
    // Les fils avec du non-lu d'abord, puis le plus récent message, puis l'inscription.
    .sort((a, b) => (fils[b.id]?.nonLus ?? 0) - (fils[a.id]?.nonLus ?? 0)
      || (fils[b.id]?.dernierLe ?? '').localeCompare(fils[a.id]?.dernierLe ?? '')
      || b.cree_le.localeCompare(a.cree_le)), [clients, fils, q, type])

  const client = (clients ?? []).find((c) => c.id === choisi) ?? null

  const charger = useCallback(async () => {
    if (!choisi) return null
    const j = await jeton()
    const r = await fetch(`${api}/messages-clients?compte=${encodeURIComponent(choisi)}`, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
    if (!r.ok) return null
    const d = await r.json()
    // Ouvrir le fil le marque lu : on efface le badge tout de suite.
    setFils((f) => (f[choisi] ? { ...f, [choisi]: { ...f[choisi], nonLus: 0 } } : f))
    return { messages: (d.messages ?? []) as Message[], ouvert: d.ouvert !== false }
  }, [api, choisi])

  const envoyer = useCallback(async (texte: string) => {
    const j = await jeton()
    const r = await fetch(`${api}/messages-clients`, { method: 'POST', headers: { Authorization: `Bearer ${j}`, 'content-type': 'application/json' }, body: JSON.stringify({ compte: choisi, texte }) })
    if (r.ok) { void relireListe(); return null }
    const d = await r.json().catch(() => ({}))
    return typeof d.error === 'string' ? d.error : 'Envoi impossible.'
  }, [api, choisi, relireListe])

  async function changerEtat(c: Client) {
    const j = await jeton()
    const r = await fetch(`${api}/clients`, { method: 'PATCH', headers: { Authorization: `Bearer ${j}`, 'content-type': 'application/json' },
      body: JSON.stringify({ id: c.id, etat: c.etat === 'actif' ? 'suspendu' : 'actif' }) })
    if (!r.ok) { const d = await r.json().catch(() => ({})); setMessage(typeof d.error === 'string' ? d.error : 'Refusé.'); return }
    await relireListe()
  }

  const heure = (iso: string) => { try { const d = new Date(iso); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) } catch { return '' } }
  const nom = (c: Client) => c.organisation || c.nom || c.email
  const pastilleType = (c: Client) => c.type_client === 'ong'
    ? <span className="ccType ong"><HeartHandshake size={12} aria-hidden /> ONG</span>
    : <span className="ccType"><Building2 size={12} aria-hidden /> {M.santeUn}</span>
  const sesCommandes = commandes.filter((k) => k.compte_id === choisi)

  return (
    <div className={`cc${client ? ' ccOuvert' : ''}`}>
      <style>{`
        .cc { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 18px; align-items: start }
        .ccListe, .ccDetail { background: #fff; border: 1px solid #e8eaee; border-radius: 20px; box-shadow: 0 18px 40px -34px rgba(17,24,39,.35) }
        .ccListe { overflow: hidden; position: sticky; top: 20px }
        .ccOutils { padding: 14px; border-bottom: 1px solid #eef0f3; display: flex; flex-direction: column; gap: 10px }
        .ccRecherche { display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8f9fb }
        .ccRecherche input { flex: 1; border: none; background: transparent; padding: 11px 0; font: inherit; font-size: 14.5px; outline: none }
        .ccFiltres { display: flex; gap: 6px; flex-wrap: wrap }
        .ccFiltres button { padding: 6px 12px; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; font-size: 13px; font-weight: 600; cursor: pointer; color: #374151; transition: all .18s ease }
        .ccFiltres button[aria-pressed="true"] { background: ${accent}; border-color: ${accent}; color: #fff }
        .ccItems { max-height: 64vh; overflow-y: auto }
        .ccItem { width: 100%; display: flex; gap: 12px; align-items: center; padding: 13px 14px; border: none; border-bottom: 1px solid #f1f2f5; background: #fff; cursor: pointer; text-align: start;
          transition: background .18s ease, transform .18s ease; font: inherit }
        .ccItem:hover { background: #f8f9fb }
        .ccItem[aria-current="true"] { background: color-mix(in srgb, ${accent} 8%, #ffffff); box-shadow: inset 3px 0 0 ${accent} }
        .ccAvatar { flex: 0 0 auto; width: 42px; height: 42px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;
          color: ${accent}; background: color-mix(in srgb, ${accent} 10%, #ffffff) }
        .ccAvatar.ong { color: #be185d; background: #fce7f3 }
        .ccTexte { flex: 1; min-width: 0 }
        .ccTexte strong { display: block; font-size: 14.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
        .ccTexte small { display: block; font-size: 13px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px }
        .ccDroite { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; font-size: 12px; color: #9ca3af }
        .ccBadge { min-width: 20px; padding: 1px 7px; border-radius: 999px; background: ${accent}; color: #fff; font-weight: 700; font-size: 12px; text-align: center; animation: ccPouls 1.6s ease-out 2 }
        @keyframes ccPouls { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, ${accent} 50%, transparent) } 100% { box-shadow: 0 0 0 8px transparent } }
        .ccType { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; color: #1d4ed8; background: #dbeafe }
        .ccType.ong { color: #be185d; background: #fce7f3 }
        .ccDetail { padding: 20px 22px; min-height: 420px; animation: ccEntre .35s cubic-bezier(.22,.8,.3,1) both }
        @keyframes ccEntre { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .ccTete { display: flex; align-items: center; gap: 14px; flex-wrap: wrap }
        .ccTete h2 { margin: 0; font-size: 20px; font-weight: 800 }
        .ccOnglets { display: flex; gap: 4px; margin: 18px 0 16px; padding: 4px; background: #f3f4f6; border-radius: 12px; width: fit-content }
        .ccOnglets button { padding: 8px 16px; border-radius: 9px; border: none; background: transparent; font: inherit; font-size: 14px; font-weight: 600; color: #4b5563; cursor: pointer; transition: all .2s ease }
        .ccOnglets button[aria-selected="true"] { background: #fff; color: ${accent}; box-shadow: 0 4px 12px -8px rgba(0,0,0,.4) }
        .ccInfos { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px }
        .ccInfo { padding: 12px 14px; border-radius: 14px; background: #f8f9fb; border: 1px solid #eef0f3; display: flex; gap: 10px; align-items: center; font-size: 14.5px; overflow-wrap: anywhere }
        .ccCmd { padding: 14px 16px; border: 1px solid #eef0f3; border-radius: 14px; margin-bottom: 10px }
        .ccVide { color: #6b7280; text-align: center; padding: 60px 20px }
        .ccRetour { display: none }
        @media (max-width: 1000px) {
          .cc { grid-template-columns: 1fr }
          .ccListe { position: static }
          .ccOuvert .ccListe { display: none }
          .cc:not(.ccOuvert) .ccDetail { display: none }
          .ccRetour { display: inline-flex; align-items: center; gap: 6px; border: none; background: none; color: ${accent}; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 12px; font: inherit }
        }
        @media (prefers-reduced-motion: reduce) { .ccDetail, .ccBadge { animation: none } .ccItem, .ccOnglets button, .ccFiltres button { transition: none } }
      `}</style>

      <aside className="ccListe" aria-label={M.titre}>
        <div className="ccOutils">
          <label className="ccRecherche"><Search size={16} aria-hidden color="#9ca3af" />
            <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder={M.recherche} aria-label={M.recherche} /></label>
          <div className="ccFiltres" role="group">
            {([['tous', M.tous], ['sante', M.sante], ['ong', M.ong]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>
            ))}
          </div>
        </div>
        {message && <p role="alert" style={{ color: '#9b1c1c', padding: '0 14px' }}>{message}</p>}
        {!clients && !message && <p style={{ padding: 14, color: '#9ca3af' }}>…</p>}
        <div className="ccItems">
          {clients && vus.length === 0 && <p style={{ padding: 18, color: '#6b7280' }}>{M.aucun}</p>}
          {vus.map((c) => {
            const f = fils[c.id]
            return (
              <button key={c.id} type="button" className="ccItem" aria-current={c.id === choisi} onClick={() => { setChoisi(c.id); setOnglet('messages') }}>
                <span className={`ccAvatar${c.type_client === 'ong' ? ' ong' : ''}`} aria-hidden>{initiales(nom(c))}</span>
                <span className="ccTexte">
                  <strong>{nom(c)}</strong>
                  <small>{f?.dernier ? `${f.dernierDe === 'centrale' ? `${M.filCentrale} : ` : ''}${f.dernier}` : (c.nom ?? c.email)}</small>
                </span>
                <span className="ccDroite">
                  {f?.dernierLe && <span>{heure(f.dernierLe)}</span>}
                  {f?.nonLus ? <span className="ccBadge">{f.nonLus}</span> : null}
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="ccDetail" key={choisi ?? 'aucun'}>
        {!client ? <p className="ccVide">{M.choisir}</p> : (<>
          <button type="button" className="ccRetour" onClick={() => setChoisi(null)}><ArrowLeft size={16} aria-hidden /> {M.titre}</button>
          <div className="ccTete">
            <span className={`ccAvatar${client.type_client === 'ong' ? ' ong' : ''}`} style={{ width: 52, height: 52, fontSize: 17 }} aria-hidden>{initiales(nom(client))}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2>{nom(client)}</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                {pastilleType(client)}
                <span style={{ fontSize: 12.5, fontWeight: 700, color: client.etat === 'actif' ? '#15803d' : '#b91c1c' }}>● {client.etat === 'actif' ? M.actif : M.suspendu}</span>
              </div>
            </div>
          </div>
          <div className="ccOnglets" role="tablist">
            {(['messages', 'commandes', 'infos'] as const).map((o) => (
              <button key={o} type="button" role="tab" aria-selected={onglet === o} onClick={() => setOnglet(o)}>
                {M.onglets[o]}{o === 'commandes' ? ` (${sesCommandes.length})` : ''}
              </button>
            ))}
          </div>
          {onglet === 'messages' && (
            <FilMessages cle={client.id} charger={charger} envoyer={envoyer} moi="centrale" accent={accent} hauteur={470}
              mots={{ ...mots.fil, moi: M.filCentrale, eux: nom(client) }} />
          )}
          {onglet === 'commandes' && (
            sesCommandes.length === 0 ? <p className="ccVide">{M.pasDeCommande}</p> : sesCommandes.map((k) => (
              <div key={k.id} className="ccCmd">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ fontFamily: 'ui-monospace, monospace', color: accent }}>{k.reference}</strong>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{k.cree_le.slice(0, 10)}</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#374151' }}>{k.lignes.map((l) => `${l.designation} × ${l.quantite}${l.unite ? ` ${l.unite}` : ''}`).join(' · ')}</p>
                <SuiviCommande etat={k.etat} libelles={motsCmd.etapes} accent={accent} annulee={motsCmd.annulee} />
              </div>
            ))
          )}
          {onglet === 'infos' && (<>
            <div className="ccInfos">
              <div className="ccInfo"><Mail size={16} aria-hidden color={accent} /> {client.email}</div>
              {client.telephone && <div className="ccInfo"><Phone size={16} aria-hidden color={accent} /> {client.telephone}</div>}
              <div className="ccInfo"><CalendarDays size={16} aria-hidden color={accent} /> {M.inscritLe} {client.cree_le.slice(0, 10)}</div>
              {client.nom && <div className="ccInfo">{client.nom}</div>}
            </div>
            <button type="button" onClick={() => void changerEtat(client)}
              style={{ marginTop: 18, padding: '10px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: 'transparent',
                color: client.etat === 'actif' ? '#b91c1c' : accent, border: `1px solid ${client.etat === 'actif' ? '#fecaca' : accent}` }}>
              {client.etat === 'actif' ? M.suspendre : M.reactiver}
            </button>
          </>)}
        </>)}
      </section>
    </div>
  )
}
