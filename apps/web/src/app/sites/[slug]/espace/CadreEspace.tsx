'use client'

import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motsEspace } from '../espace-client/motsEspace'
import type { Institution } from '@/lib/sites/institution'
import { navigationEspace, estActif, ICONES } from './navigationEspace'
import { lireAvecJeton } from './lectureEspace'

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
  slug, base, accent, lang, inst, actif, titre, phrase, retour, nomSite, children,
}: {
  slug: string; base: string; accent: string; lang: string | null
  /** Le nom de l'institution du site (2026-11-26) — plain object, sérialisable. */
  inst: Institution
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
  const mots = motsEspace(lang, inst)
  const [etat, setEtat] = useState<'charge' | 'sans' | 'pret'>('charge')
  const [compte, setCompte] = useState<Compte | null>(null)
  const [gestion, setGestion] = useState(false)
  const [compteurs, setCompteurs] = useState<Record<string, number>>({})

  useEffect(() => {
    let vivant = true
    void (async () => {
      const j = (await supabase.auth.getSession()).data.session?.access_token
      if (!vivant) return
      if (!j) { setEtat('sans'); return }
      const api = `/api/sites/${encodeURIComponent(slug)}`
      try {
        // EN PARALLÈLE : le compte, et (pour un client) ses commandes. La
        // seconde lecture est partagée avec le tableau de bord (lectureEspace).
        const [r, rc] = await Promise.all([lireAvecJeton(`${api}/mon-compte`, j), lireAvecJeton(`${api}/mes-commandes`, j)])
        if (!vivant) return
        const d = r.ok ? r.d : null
        const c = (d?.compte ?? null) as Compte | null
        if (!c || c.etat !== 'actif') { setEtat('sans'); return }
        const g = d?.gestionClients === true
        setCompte(c); setGestion(g)
        setEtat('pret')
        // LES COMPTEURS de la barre : ses commandes (client), celles à
        // traiter (DDM). Un compteur qui ne se lit pas n'est pas affiché.
        const n: Record<string, number> = {}
        if (c.role === 'structure' && rc.ok) n['mes-commandes'] = ((rc.d?.commandes ?? []) as unknown[]).length
        if (c.role === 'structure') {
          const rm = await lireAvecJeton(`${api}/mes-messages?compter=1`, j)
          if (rm.ok && typeof rm.d?.nonLus === 'number' && rm.d.nonLus > 0) n['mes-messages'] = rm.d.nonLus as number
        }
        if (g) {
          const rg = await lireAvecJeton(`${api}/commandes`, j)
          if (rg.ok) n['gestion-commandes'] = ((rg.d?.commandes ?? []) as { etat: string }[]).filter((x) => x.etat === 'recue').length
          const rf = await lireAvecJeton(`${api}/messages-clients`, j)
          if (rf.ok) {
            const nonLus = Object.values((rf.d?.fils ?? {}) as Record<string, { nonLus: number }>).reduce((t, f) => t + (f.nonLus || 0), 0)
            if (nonLus > 0) n['comptes-clients'] = nonLus
          }
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
          {groupes.map((g, gi) => (
            <div key={g.titre} className="ceGroupe">
              {g.entrees.length > 1 && <span className="ceGroupeTitre">{g.titre}</span>}
              {g.entrees.map((e, ei) => {
                const I = ICONES[e.icone]
                const on = estActif(e, actif)
                const compte2 = compteurs[e.chemin]
                return (
                  <a key={e.chemin} href={`${base}/${e.chemin}`} className={`ceLien${on ? ' ceActif' : ''}`} aria-current={on ? 'page' : undefined}
                    style={{ animationDelay: `${(gi * 4 + ei) * 55}ms` }}>
                    <span className="ceIcone"><I size={19} strokeWidth={1.9} aria-hidden /></span>
                    <span className="ceLienTexte">{e.libelle}</span>
                    {typeof compte2 === 'number' && <span className="ceCompteur">{compte2}</span>}
                  </a>
                )
              })}
            </div>
          ))}
        </nav>

        {/* LE BAS DE LA BARRE : l'état et la sortie, rien de personnel
            (CPA, 2026-11-19 : « les informations personnelles vont dans Mon
            profil »). */}
        {etat === 'pret' && compte && (
          <div className="ceCompte">
            <p className="ceCompteLigne"><i aria-hidden /> {mots.compteActif}</p>
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

const LARGEUR = 284

const STYLE = (a: string) => `
  .cadreEspace { width: 100vw; margin-inline-start: calc(50% - 50vw); min-height: 100vh; background: #f5f6f8 }
  /* LA BARRE RESTE FIXE pendant que la page défile (CPA, 2026-11-19). Le pied
     de page du site, en dessous, se décale de la même largeur. */
  body:has(.cadreEspace) footer { padding-inline-start: ${LARGEUR}px }
  .ceEntete { margin: 0 0 26px; animation: ceEntre .5s cubic-bezier(.22,.8,.3,1) both }
  .ceDate { margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #6b7280 }
  .ceTitre { font-size: clamp(30px, 3.6vw, 44px); font-weight: 800; letter-spacing: -0.035em; margin: 0; color: #111827; line-height: 1.05 }
  .cePhrase { font-size: 16px; line-height: 1.6; color: #4b5563; margin: 8px 0 0; max-width: 70ch }

  .ceBarre { position: fixed; inset-inline-start: 0; top: 0; z-index: 40; width: ${LARGEUR}px; height: 100vh; display: flex; flex-direction: column; gap: 18px;
    padding: 22px 16px 18px; background: rgba(251,251,252,.92); backdrop-filter: blur(10px); border-inline-end: 1px solid #e7e9ee; overflow-y: auto }
  .ceMarque { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 6px 8px; border-radius: 14px; color: inherit; text-decoration: none }
  .ceLogo { position: relative; overflow: hidden; flex: 0 0 auto; width: 44px; height: 44px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 800; font-size: 19px; background: linear-gradient(145deg, ${a}, color-mix(in srgb, ${a} 70%, #000));
    box-shadow: 0 10px 20px -12px ${a}; transition: transform .35s cubic-bezier(.34,1.56,.64,1) }
  .ceLogo::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.55) 50%, transparent 65%); transform: translateX(-120%) }
  .ceMarque:hover .ceLogo { transform: rotate(-6deg) scale(1.06) }
  .ceMarque:hover .ceLogo::after { transform: translateX(120%); transition: transform .8s ease }
  .ceMarqueTexte { display: flex; flex-direction: column; min-width: 0 }
  .ceMarqueTexte strong { font-size: 15px; line-height: 1.25; color: #111827; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden }
  .ceMarqueTexte small { font-size: 13px; color: #6b7280; margin-top: 2px }

  .ceNav { display: flex; flex-direction: column; gap: 18px; flex: 1 }
  .ceGroupe { display: flex; flex-direction: column; gap: 4px }
  .ceGroupeTitre { font-size: 11.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #6b7280; padding: 0 12px 6px }

  /* LES BOUTONS DE LA BARRE, ANIMÉS (« des animations qui font wow ») :
     entrée en cascade ; au survol, un voile de couleur glisse de gauche à
     droite, l'icône rebondit et pivote, le texte avance ; l'entrée active
     porte une barre qui pousse et une icône pleine. */
  .ceLien { position: relative; isolation: isolate; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 13px;
    color: #1f2937; text-decoration: none; font-size: 15px; font-weight: 500;
    animation: ceEntreLien .55s cubic-bezier(.22,.8,.3,1) both; transition: color .2s ease, box-shadow .25s ease }
  .ceLien::before { content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit;
    background: linear-gradient(90deg, color-mix(in srgb, ${a} 14%, #ffffff), color-mix(in srgb, ${a} 4%, #ffffff));
    transform: scaleX(0); transform-origin: left; transition: transform .35s cubic-bezier(.22,.8,.3,1) }
  .ceLien:hover::before { transform: scaleX(1) }
  .ceLien:hover { color: ${a}; box-shadow: 0 8px 22px -16px ${a} }
  .ceIcone { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px;
    background: #f0f2f5; color: inherit; transition: transform .45s cubic-bezier(.34,1.56,.64,1), background .25s ease, color .25s ease }
  .ceLien:hover .ceIcone { transform: scale(1.14) rotate(-8deg); background: #ffffff; color: ${a}; box-shadow: 0 6px 14px -8px ${a} }
  .ceLienTexte { flex: 1; min-width: 0; transition: transform .3s cubic-bezier(.22,.8,.3,1) }
  .ceLien:hover .ceLienTexte { transform: translateX(4px) }
  .ceLien:active { transform: scale(.98) }
  .ceLien:focus-visible { outline: 2px solid ${a}; outline-offset: 2px }
  .ceActif { color: ${a}; font-weight: 700; background: color-mix(in srgb, ${a} 9%, #ffffff); box-shadow: inset 0 0 0 1px color-mix(in srgb, ${a} 16%, transparent) }
  .ceActif .ceIcone { background: ${a}; color: #fff; box-shadow: 0 8px 16px -8px ${a} }
  .ceActif:hover .ceIcone { background: ${a}; color: #fff }
  .ceActif::after { content: ''; position: absolute; inset-inline-start: 0; top: 50%; width: 4px; height: 60%; border-radius: 0 4px 4px 0; background: ${a};
    transform: translateY(-50%) scaleY(0); animation: ceBarreActive .5s cubic-bezier(.34,1.56,.64,1) .3s forwards }
  @keyframes ceBarreActive { to { transform: translateY(-50%) scaleY(1) } }
  @keyframes ceEntreLien { from { opacity: 0; transform: translateX(-14px) } to { opacity: 1; transform: none } }
  @keyframes ceEntre { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
  .ceCompteur { min-width: 24px; padding: 1px 8px; border-radius: 999px; font-size: 12.5px; font-weight: 700; text-align: center;
    background: #eef0f3; color: #374151; transition: transform .3s cubic-bezier(.34,1.56,.64,1) }
  .ceLien:hover .ceCompteur { transform: scale(1.12) }
  .ceActif .ceCompteur { background: ${a}; color: #fff }
  .ceSquelette { display: block; height: 42px; border-radius: 12px; background: linear-gradient(90deg, #eef0f3, #f7f8fa, #eef0f3);
    background-size: 200% 100%; animation: ceOnde 1.3s linear infinite }
  @keyframes ceOnde { from { background-position: 200% 0 } to { background-position: -200% 0 } }

  .ceCompte { border: 1px solid #e7e9ee; background: #ffffff; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 10px }
  .ceCompteLigne { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: #166534; padding: 0 4px }
  .ceCompteLigne i { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 0 rgba(34,197,94,.5); animation: cePouls 2.4s ease-out 3 }
  @keyframes cePouls { 70% { box-shadow: 0 0 0 7px rgba(34,197,94,0) } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0) } }
  .ceSortir { display: inline-flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; border: 1px solid #e7e9ee;
    background: #fff; color: #374151; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .2s ease, color .2s ease, border-color .2s ease }
  .ceSortir svg { transition: transform .3s cubic-bezier(.34,1.56,.64,1) }
  .ceSortir:hover { background: #fef2f2; color: #b91c1c; border-color: #fecaca }
  .ceSortir:hover svg { transform: translateX(3px) }

  .ceContenu { min-width: 0; margin-inline-start: ${LARGEUR}px; padding: 40px clamp(18px, 3.4vw, 48px) 64px }

  @media (max-width: 900px) {
    body:has(.cadreEspace) footer { padding-inline-start: 0 }
    .ceBarre { position: sticky; width: auto; height: auto; padding: 12px 14px 10px; gap: 10px; border-inline-end: none; border-bottom: 1px solid #e7e9ee }
    .ceNav { flex-direction: row; overflow-x: auto; gap: 6px; scrollbar-width: none }
    .ceGroupe { flex-direction: row; gap: 6px }
    .ceGroupeTitre { display: none }
    .ceLien { white-space: nowrap; padding: 6px 10px 6px 6px; background: #fff; border: 1px solid #e7e9ee }
    .ceIcone { width: 28px; height: 28px }
    .ceActif::after { display: none }
    .ceCompte { flex-direction: row; align-items: center; justify-content: space-between; padding: 8px 10px }
    .ceContenu { margin-inline-start: 0; padding: 24px 16px 48px }
  }
  @media (prefers-reduced-motion: reduce) {
    .ceLien, .ceEntete, .ceActif::after, .ceCompteLigne i, .ceSquelette { animation: none !important }
    .ceActif::after { transform: translateY(-50%) }
    .ceLien, .ceLien::before, .ceIcone, .ceLienTexte, .ceLogo, .ceCompteur, .ceSortir, .ceSortir svg { transition: none !important }
  }
`
