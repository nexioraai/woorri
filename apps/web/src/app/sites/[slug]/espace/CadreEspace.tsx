'use client'

import { useEffect, useState } from 'react'
import { LogOut, Mail, Phone, CalendarDays, Building2, HeartHandshake, ShieldCheck, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motsEspace } from '../espace-client/motsEspace'
import { navigationEspace, estActif, ICONES } from './navigationEspace'

// ============================================================================
// LE CADRE DU TABLEAU DE BORD (CPA, 2026-11-19).
//
// « Fais un vrai dashboard, sidebar à gauche, et les informations comme
// e-mail, nom, etc. à leur place, à la pointe de la technologie. »
//
// Toutes les pages de l'espace (accueil, commandes, demandes, profil…) sont
// rendues DANS ce cadre : une barre latérale (navigation par groupes, selon
// le rôle), une carte d'identité (nom, structure, type, e-mail, téléphone,
// ancienneté), puis la page. Sur téléphone, la barre devient une rangée
// d'onglets qui défile.
//
// ── IL NE DÉCIDE RIEN. Le compte vient de `mon-compte`, avec le jeton du
// visiteur. Sans compte actif (visiteur, compte suspendu…), la page se rend
// SANS cadre, telle qu'avant : c'est elle qui dit quoi faire.
// ============================================================================

type Compte = {
  id: string; email: string; role: 'structure' | 'fournisseur' | 'agent'; etat: string
  organisation: string | null; nom?: string | null; telephone?: string | null; cree_le: string; reference: string | null
}


/** Deux initiales : du nom de la personne, sinon de sa structure. */
export function initiales(nom: string | null | undefined, repli: string | null | undefined): string {
  const mots = (nom || repli || '?').trim().split(/\s+/).filter(Boolean)
  return ((mots[0]?.[0] ?? '?') + (mots.length > 1 ? mots[mots.length - 1][0] : '')).toUpperCase()
}

export default function CadreEspace({
  slug, base, accent, lang, actif, titre, phrase, retour, children,
}: {
  slug: string; base: string; accent: string; lang: string | null
  /** Le chemin de la page, pour marquer l'entrée active. */
  actif: string
  titre: string
  phrase?: string
  /** Le petit lien au-dessus du titre, quand la page est rendue sans cadre. */
  retour?: { href: string; libelle: string }
  children: React.ReactNode
}) {
  const mots = motsEspace(lang)
  const [etat, setEtat] = useState<'charge' | 'sans' | 'pret'>('charge')
  const [compte, setCompte] = useState<Compte | null>(null)
  const [gestion, setGestion] = useState(false)
  const [typeClient, setTypeClient] = useState<string | null>(null)

  useEffect(() => {
    let vivant = true
    void (async () => {
      const j = (await supabase.auth.getSession()).data.session?.access_token
      if (!vivant) return
      if (!j) { setEtat('sans'); return }
      try {
        const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/mon-compte`, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
        if (!vivant) return
        const d = r.ok ? await r.json() : null
        if (!vivant) return
        const c = (d?.compte ?? null) as Compte | null
        if (!c || c.etat !== 'actif') { setEtat('sans'); return }
        setCompte(c); setGestion(d.gestionClients === true); setTypeClient(typeof d.typeClient === 'string' ? d.typeClient : null)
        setEtat('pret')
      } catch { if (vivant) setEtat('sans') }
    })()
    return () => { vivant = false }
  }, [slug])

  const entete = (
    <>
      <h1 className="ceTitre">{titre}</h1>
      {phrase && <p className="cePhrase">{phrase}</p>}
    </>
  )

  // SANS COMPTE ACTIF : la page d'avant, sans cadre.
  if (etat === 'sans') {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <style>{STYLE(accent)}</style>
        {retour && <p style={{ fontSize: 14, margin: '0 0 18px' }}><a href={retour.href} style={{ color: accent }}>{retour.libelle}</a></p>}
        {entete}
        {children}
      </div>
    )
  }

  const role = compte?.role ?? 'structure'
  const groupes = compte ? navigationEspace({ role, gestion }, mots) : []
  const qualite = role === 'fournisseur' ? mots.fournisseur : role === 'agent' ? mots.agentDdm : typeClient === 'ong' ? mots.ong : mots.structure
  const IconeType = role === 'agent' ? ShieldCheck : role === 'fournisseur' ? Truck : typeClient === 'ong' ? HeartHandshake : Building2
  const depuis = (() => { try { return compte ? new Date(compte.cree_le).toLocaleDateString(lang ?? undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '' } catch { return '' } })()
  const prenom = (compte?.nom ?? '').trim().split(/\s+/)[0]

  return (
    <div className="cadreEspace">
      <style>{STYLE(accent)}</style>

      <aside className="ceBarre" aria-label={mots.titre}>
        <div className="ceMarque">
          <span className="ceAvatar" aria-hidden>{etat === 'pret' ? initiales(compte?.nom, compte?.organisation) : ''}</span>
          <span className="ceMarqueTexte">
            <strong>{etat === 'pret' ? (compte?.organisation ?? compte?.email) : ' '}</strong>
            <small>{etat === 'pret' ? qualite : ' '}</small>
          </span>
        </div>
        <nav className="ceNav">
          {etat === 'charge' && Array.from({ length: 6 }, (_, i) => <span key={i} className="ceSquelette" />)}
          {groupes.map((g) => (
            <div key={g.titre} className="ceGroupe">
              <span className="ceGroupeTitre">{g.titre}</span>
              {g.entrees.map((e) => {
                const I = ICONES[e.icone]
                const on = estActif(e, actif)
                return (
                  <a key={e.chemin} href={`${base}/${e.chemin}`} className={`ceLien${on ? ' ceActif' : ''}${e.icone === 'commander' ? ' ceAppel' : ''}`} aria-current={on ? 'page' : undefined}>
                    <I size={18} strokeWidth={2} aria-hidden />
                    <span>{e.libelle}</span>
                  </a>
                )
              })}
            </div>
          ))}
        </nav>
        {etat === 'pret' && (
          <button type="button" className="ceSortir"
            onClick={async () => { await supabase.auth.signOut(); window.location.assign(`${base}/connexion`) }}>
            <LogOut size={17} aria-hidden /> <span>{mots.deconnexion}</span>
          </button>
        )}
      </aside>

      <div className="ceContenu">
        {etat === 'pret' && compte && (
          <section className="ceIdentite" aria-label={compte.nom ?? compte.email}>
            <div className="ceIdHaut">
              <span className="ceAvatar ceAvatarGrand" aria-hidden>{initiales(compte.nom, compte.organisation)}</span>
              <div style={{ minWidth: 0 }}>
                <p className="ceBonjour">{mots.bonjour}{prenom ? `, ${prenom}` : ''} 👋</p>
                <p className="ceNom">{compte.nom || compte.organisation || compte.email}</p>
                <p className="ceOrg"><IconeType size={15} aria-hidden /> {compte.organisation}{compte.organisation ? ' · ' : ''}{qualite}</p>
              </div>
              <span className="ceEtat"><i aria-hidden /> {mots.compteActif}</span>
            </div>
            <div className="cePuces">
              <span><Mail size={15} aria-hidden /> {compte.email}</span>
              {compte.telephone && <span><Phone size={15} aria-hidden /> {compte.telephone}</span>}
              {depuis && <span><CalendarDays size={15} aria-hidden /> {mots.membreDepuis} {depuis}</span>}
              {compte.reference && <span>#{compte.reference}</span>}
            </div>
          </section>
        )}
        {entete}
        {children}
      </div>
    </div>
  )
}

const STYLE = (a: string) => `
  .cadreEspace { display: grid; grid-template-columns: 268px minmax(0, 1fr); gap: 28px; align-items: start }
  .ceTitre { font-size: clamp(24px, 3.2vw, 32px); font-weight: 800; margin: 6px 0 8px; letter-spacing: -0.01em }
  .cePhrase { font-size: 15.5px; line-height: 1.6; opacity: .72; margin: 0 0 24px; max-width: 64ch }

  .ceBarre { position: sticky; top: 20px; display: flex; flex-direction: column; gap: 14px; padding: 18px 14px;
    border-radius: 22px; color: #fff; overflow: hidden;
    background: radial-gradient(120% 60% at 0% 0%, color-mix(in srgb, ${a} 55%, #ffffff 0%) 0%, transparent 60%),
                linear-gradient(170deg, ${a} 0%, color-mix(in srgb, ${a} 72%, #000) 100%);
    box-shadow: 0 30px 60px -36px color-mix(in srgb, ${a} 80%, #000), inset 0 1px 0 rgba(255,255,255,.12) }
  .ceMarque { display: flex; align-items: center; gap: 11px; padding: 6px 6px 14px; border-bottom: 1px solid rgba(255,255,255,.14) }
  .ceMarqueTexte { display: flex; flex-direction: column; min-width: 0 }
  .ceMarqueTexte strong { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
  .ceMarqueTexte small { font-size: 12px; opacity: .72 }
  .ceAvatar { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px;
    font-weight: 800; font-size: 14px; letter-spacing: .02em; color: ${a};
    background: linear-gradient(140deg, #ffffff, color-mix(in srgb, ${a} 18%, #ffffff)); box-shadow: 0 6px 16px -8px rgba(0,0,0,.5) }
  .ceNav { display: flex; flex-direction: column; gap: 14px }
  .ceGroupe { display: flex; flex-direction: column; gap: 3px }
  .ceGroupeTitre { font-size: 10.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; opacity: .55; padding: 0 10px 4px }
  .ceLien { display: flex; align-items: center; gap: 11px; padding: 9px 11px; border-radius: 11px; color: rgba(255,255,255,.88);
    text-decoration: none; font-size: 14.5px; font-weight: 500; transition: background .18s ease, color .18s ease, transform .18s ease }
  .ceLien:hover { background: rgba(255,255,255,.10); color: #fff; transform: translateX(2px) }
  .ceLien:focus-visible { outline: 2px solid #fff; outline-offset: 2px }
  .ceActif { background: #ffffff; color: ${a}; font-weight: 700; box-shadow: 0 8px 20px -12px rgba(0,0,0,.55) }
  .ceActif:hover { background: #ffffff; color: ${a} }
  .ceAppel:not(.ceActif) { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.22) }
  .ceSortir { display: flex; align-items: center; gap: 10px; margin-top: 4px; padding: 10px 11px; border-radius: 11px; border: 1px solid rgba(255,255,255,.18);
    background: transparent; color: rgba(255,255,255,.85); font-size: 14px; cursor: pointer; transition: background .18s ease }
  .ceSortir:hover { background: rgba(255,255,255,.10) }
  .ceSquelette { display: block; height: 34px; border-radius: 10px; background: linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.18), rgba(255,255,255,.08));
    background-size: 200% 100%; animation: ceOnde 1.3s linear infinite }
  @keyframes ceOnde { from { background-position: 200% 0 } to { background-position: -200% 0 } }

  .ceContenu { min-width: 0 }
  .ceIdentite { position: relative; overflow: hidden; padding: 20px 22px; border-radius: 22px; margin-bottom: 22px;
    background: linear-gradient(135deg, #ffffff 0%, color-mix(in srgb, ${a} 6%, #ffffff) 100%);
    border: 1px solid color-mix(in srgb, ${a} 14%, #e5e7eb); box-shadow: 0 24px 48px -36px color-mix(in srgb, ${a} 70%, #000) }
  .ceIdentite::after { content: ''; position: absolute; width: 220px; height: 220px; border-radius: 50%; right: -70px; top: -90px;
    background: radial-gradient(circle, color-mix(in srgb, ${a} 16%, transparent), transparent 70%); pointer-events: none }
  .ceIdHaut { display: flex; align-items: center; gap: 16px; flex-wrap: wrap }
  .ceAvatarGrand { width: 58px; height: 58px; border-radius: 18px; font-size: 20px; color: #fff;
    background: linear-gradient(140deg, ${a}, color-mix(in srgb, ${a} 60%, #22c55e)) }
  .ceBonjour { margin: 0; font-size: 13.5px; opacity: .65 }
  .ceNom { margin: 2px 0 2px; font-size: 21px; font-weight: 800; letter-spacing: -0.01em; overflow-wrap: anywhere }
  .ceOrg { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 14px; color: #374151; flex-wrap: wrap }
  .ceEtat { margin-inline-start: auto; display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px;
    font-size: 12.5px; font-weight: 700; color: #166534; background: #dcfce7 }
  .ceEtat i { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.25) }
  .cePuces { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; position: relative; z-index: 1 }
  .cePuces span { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px; font-size: 13.5px;
    background: #ffffff; border: 1px solid #e5e7eb; color: #1f2937; max-width: 100%; overflow-wrap: anywhere }

  @media (max-width: 900px) {
    .cadreEspace { grid-template-columns: 1fr; gap: 16px }
    .ceBarre { position: static; padding: 12px; border-radius: 18px }
    .ceMarque { padding: 2px 4px 10px }
    .ceNav { flex-direction: row; overflow-x: auto; gap: 6px; padding-bottom: 4px; scrollbar-width: none }
    .ceGroupe { flex-direction: row; gap: 6px }
    .ceGroupeTitre { display: none }
    .ceLien { white-space: nowrap; padding: 8px 12px }
    .ceLien:hover { transform: none }
    .ceSortir { align-self: flex-start }
    .ceEtat { margin-inline-start: 0 }
  }
  @media (prefers-reduced-motion: reduce) {
    .ceLien, .ceSortir { transition: none } .ceLien:hover { transform: none } .ceSquelette { animation: none }
  }
`
