'use client'

import { useEffect, useState } from 'react'
import { LogOut, Building2, HeartHandshake, ShieldCheck, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motsEspace } from '../espace-client/motsEspace'
import { navigationEspace, estActif, ICONES } from './navigationEspace'

// ============================================================================
// LE CADRE DU TABLEAU DE BORD (CPA, 2026-11-19).
//
// « Compare bien avec le tableau de bord des applis Deribfy. » Même charpente :
//   · une barre latérale PLEINE HAUTEUR, claire, à gauche — l'enseigne en haut,
//     la navigation par groupes avec ses compteurs, le compte en bas
//     (nom, structure, type, e-mail, déconnexion) ;
//   · à droite, la date en surtitre, le grand titre, la phrase, puis la page.
// Sur téléphone, la barre devient une bande d'onglets en haut.
//
// ── IL NE DÉCIDE RIEN. Le compte vient de `mon-compte`, avec le jeton du
// visiteur ; les compteurs viennent des routes de commandes. Sans compte
// actif, la page se rend SANS cadre, comme avant.
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
  slug, base, accent, lang, actif, titre, phrase, retour, nomSite, children,
}: {
  slug: string; base: string; accent: string; lang: string | null
  /** Le chemin de la page, pour marquer l'entrée active. */
  actif: string
  titre: string
  phrase?: string
  /** Le petit lien au-dessus du titre, quand la page est rendue sans cadre. */
  retour?: { href: string; libelle: string }
  /** L'enseigne, en haut de la barre latérale. */
  nomSite?: string
  children: React.ReactNode
}) {
  const mots = motsEspace(lang)
  const [etat, setEtat] = useState<'charge' | 'sans' | 'pret'>('charge')
  const [compte, setCompte] = useState<Compte | null>(null)
  const [gestion, setGestion] = useState(false)
  const [typeClient, setTypeClient] = useState<string | null>(null)
  const [compteurs, setCompteurs] = useState<Record<string, number>>({})

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
        const g = d.gestionClients === true
        setCompte(c); setGestion(g); setTypeClient(typeof d.typeClient === 'string' ? d.typeClient : null)
        setEtat('pret')
        // LES COMPTEURS de la barre : ses commandes (client), celles à
        // traiter (DDM). Un compteur qui ne se lit pas n'est pas affiché.
        const n: Record<string, number> = {}
        if (c.role === 'structure') {
          const rc = await fetch(`/api/sites/${encodeURIComponent(slug)}/mes-commandes`, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
          if (rc.ok) n['mes-commandes'] = ((await rc.json()).commandes ?? []).length
        }
        if (g) {
          const rg = await fetch(`/api/sites/${encodeURIComponent(slug)}/commandes`, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
          if (rg.ok) n['gestion-commandes'] = ((await rg.json()).commandes ?? []).filter((x: { etat: string }) => x.etat === 'recue').length
        }
        if (vivant) setCompteurs(n)
      } catch { if (vivant) setEtat('sans') }
    })()
    return () => { vivant = false }
  }, [slug])

  const aujourdhui = (() => { try { return new Date().toLocaleDateString(lang ?? undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' } })()
  const entete = (
    <header className="ceEntete">
      <p className="ceDate">{aujourdhui}</p>
      <h1 className="ceTitre">{titre}{etat !== 'sans' ? '.' : ''}</h1>
      {phrase && <p className="cePhrase">{phrase}</p>}
    </header>
  )

  // SANS COMPTE ACTIF : la page d'avant, sans cadre.
  if (etat === 'sans') {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '56px 20px 80px' }}>
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

  return (
    <div className="cadreEspace">
      <style>{STYLE(accent)}</style>

      <aside className="ceBarre" aria-label={mots.titre}>
        <a className="ceMarque" href={base}>
          <span className="ceLogo" aria-hidden>{(nomSite ?? 'E').trim()[0]?.toUpperCase()}</span>
          <span className="ceMarqueTexte">
            <strong>{nomSite ?? mots.titre}</strong>
            <small>{mots.titre}</small>
          </span>
        </a>

        <nav className="ceNav">
          {etat === 'charge' && Array.from({ length: 7 }, (_, i) => <span key={i} className="ceSquelette" />)}
          {groupes.map((g) => (
            <div key={g.titre} className="ceGroupe">
              <span className="ceGroupeTitre">{g.titre}</span>
              {g.entrees.map((e) => {
                const I = ICONES[e.icone]
                const on = estActif(e, actif)
                const compte2 = compteurs[e.chemin]
                return (
                  <a key={e.chemin} href={`${base}/${e.chemin}`} className={`ceLien${on ? ' ceActif' : ''}${e.icone === 'commander' ? ' ceAppel' : ''}`} aria-current={on ? 'page' : undefined}>
                    <I size={19} strokeWidth={1.9} aria-hidden />
                    <span className="ceLienTexte">{e.libelle}</span>
                    {typeof compte2 === 'number' && <span className="ceCompteur">{compte2}</span>}
                  </a>
                )
              })}
            </div>
          ))}
        </nav>

        {etat === 'pret' && compte && (
          <div className="ceCompte">
            <div className="ceCompteHaut">
              <span className="ceAvatar" aria-hidden>{initiales(compte.nom, compte.organisation)}</span>
              <span style={{ minWidth: 0 }}>
                <strong>{compte.nom || compte.organisation}</strong>
                <small><IconeType size={13} aria-hidden /> {qualite}</small>
              </span>
            </div>
            <p className="ceCompteLigne"><i aria-hidden /> {mots.compteActif}</p>
            <p className="ceCompteMail">{compte.organisation}<br />{compte.email}{compte.telephone ? <><br />{compte.telephone}</> : null}</p>
            <button type="button" className="ceSortir"
              onClick={async () => { await supabase.auth.signOut(); window.location.assign(`${base}/connexion`) }}>
              <LogOut size={16} aria-hidden /> <span>{mots.deconnexion}</span>
            </button>
          </div>
        )}
      </aside>

      <div className="ceContenu">
        {entete}
        {children}
      </div>
    </div>
  )
}

const STYLE = (a: string) => `
  .cadreEspace { width: 100vw; margin-inline-start: calc(50% - 50vw); min-height: 100vh; display: grid;
    grid-template-columns: 284px minmax(0, 1fr); background: #f5f6f8; align-items: start }
  .ceEntete { margin: 0 0 26px }
  .ceDate { margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #6b7280 }
  .ceTitre { font-size: clamp(30px, 3.6vw, 44px); font-weight: 800; letter-spacing: -0.035em; margin: 0; color: #111827; line-height: 1.05 }
  .cePhrase { font-size: 16px; line-height: 1.6; color: #4b5563; margin: 8px 0 0; max-width: 70ch }

  .ceBarre { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 18px; padding: 22px 16px 18px;
    background: #fbfbfc; border-inline-end: 1px solid #e7e9ee; overflow-y: auto }
  .ceMarque { display: flex; align-items: center; gap: 12px; padding: 4px 8px 6px; color: inherit; text-decoration: none }
  .ceLogo { flex: 0 0 auto; width: 44px; height: 44px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 800; font-size: 19px; background: linear-gradient(145deg, ${a}, color-mix(in srgb, ${a} 70%, #000));
    box-shadow: 0 10px 20px -12px ${a} }
  .ceMarqueTexte { display: flex; flex-direction: column; min-width: 0 }
  .ceMarqueTexte strong { font-size: 15px; line-height: 1.25; color: #111827; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden }
  .ceMarqueTexte small { font-size: 13px; color: #6b7280; margin-top: 2px }

  .ceNav { display: flex; flex-direction: column; gap: 18px; flex: 1 }
  .ceGroupe { display: flex; flex-direction: column; gap: 3px }
  .ceGroupeTitre { font-size: 11.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #6b7280; padding: 0 12px 6px }
  .ceLien { position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; color: #1f2937;
    text-decoration: none; font-size: 15px; font-weight: 500; transition: background .16s ease, color .16s ease }
  .ceLien:hover { background: #f0f2f5 }
  .ceLien:focus-visible { outline: 2px solid ${a}; outline-offset: 2px }
  .ceLienTexte { flex: 1; min-width: 0 }
  .ceActif { background: color-mix(in srgb, ${a} 9%, #ffffff); color: ${a}; font-weight: 700 }
  .ceActif::before { content: ''; position: absolute; inset-inline-start: -16px; top: 9px; bottom: 9px; width: 4px; border-radius: 0 4px 4px 0; background: ${a} }
  .ceActif:hover { background: color-mix(in srgb, ${a} 12%, #ffffff) }
  .ceAppel:not(.ceActif) { color: ${a}; font-weight: 700 }
  .ceCompteur { min-width: 24px; padding: 1px 8px; border-radius: 999px; font-size: 12.5px; font-weight: 700; text-align: center;
    background: #eef0f3; color: #374151 }
  .ceActif .ceCompteur { background: ${a}; color: #fff }
  .ceSquelette { display: block; height: 38px; border-radius: 11px; background: linear-gradient(90deg, #eef0f3, #f7f8fa, #eef0f3);
    background-size: 200% 100%; animation: ceOnde 1.3s linear infinite }
  @keyframes ceOnde { from { background-position: 200% 0 } to { background-position: -200% 0 } }

  .ceCompte { border: 1px solid #e7e9ee; background: #ffffff; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 8px }
  .ceCompteHaut { display: flex; align-items: center; gap: 10px }
  .ceCompteHaut strong { display: block; font-size: 14.5px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
  .ceCompteHaut small { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: #6b7280 }
  .ceAvatar { flex: 0 0 auto; width: 38px; height: 38px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 13.5px; color: ${a}; background: color-mix(in srgb, ${a} 12%, #ffffff) }
  .ceCompteLigne { margin: 0; display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: #166534 }
  .ceCompteLigne i { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.2) }
  .ceCompteMail { margin: 0; font-size: 12.5px; line-height: 1.5; color: #4b5563; overflow-wrap: anywhere }
  .ceSortir { display: inline-flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; border: 1px solid #e7e9ee;
    background: #fff; color: #374151; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background .16s ease, color .16s ease }
  .ceSortir:hover { background: #fef2f2; color: #b91c1c; border-color: #fecaca }

  .ceContenu { min-width: 0; padding: 40px clamp(18px, 3.4vw, 48px) 64px }

  @media (max-width: 900px) {
    .cadreEspace { grid-template-columns: 1fr; min-height: 0 }
    .ceBarre { position: static; height: auto; padding: 14px 14px 10px; gap: 10px; border-inline-end: none; border-bottom: 1px solid #e7e9ee }
    .ceNav { flex-direction: row; overflow-x: auto; gap: 6px; scrollbar-width: none }
    .ceGroupe { flex-direction: row; gap: 6px }
    .ceGroupeTitre { display: none }
    .ceLien { white-space: nowrap; padding: 9px 13px; background: #fff; border: 1px solid #e7e9ee }
    .ceActif::before { display: none }
    .ceCompte { flex-direction: row; align-items: center; flex-wrap: wrap; padding: 10px 12px }
    .ceCompteLigne, .ceCompteMail { display: none }
    .ceSortir { margin-inline-start: auto }
    .ceContenu { padding: 24px 16px 48px }
  }
  @media (prefers-reduced-motion: reduce) { .ceLien, .ceSortir { transition: none } .ceSquelette { animation: none } }
`
