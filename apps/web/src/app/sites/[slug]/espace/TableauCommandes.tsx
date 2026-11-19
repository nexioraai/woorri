'use client'

import { useEffect, useState } from 'react'
import { Clock, Truck, ShoppingBag, Package, Inbox, Users, ArrowRight, CirclePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { lireAvecJeton } from './lectureEspace'
import type { MotsCommandes } from './motsCommandes'
import { MiniBarres, CourbeAire, BarresMois, Anneau, BarresHorizontales } from './Graphiques'
import {
  derniersMois, commandesParMois, unitesParMois, repartitionEtats, produitsLesPlusCommandes,
  clientsLesPlusActifs, TEINTES_ETAT, EN_COURS, type CommandeStat,
} from './statsCommandes'

// ============================================================================
// LE TABLEAU DE BORD DES COMMANDES (CPA, 2026-11-19).
//
// « Compare bien avec le tableau de bord des applis Deribfy : ce que tu as
// fait n'est pas un vrai dashboard. » Même langage : quatre cartes chiffrées
// avec mini-barres, une grande carte sombre du mois, la courbe d'évolution,
// les barres par mois, l'anneau des statuts, les classements, les dernières
// commandes avec leur statut.
//
// DEUX REGARDS (`regard`), UNE SEULE MÉCANIQUE :
//   · `client` — SES commandes (route `mes-commandes`, filtrée sur son compte) ;
//   · `ddm`    — TOUTES les commandes du site (route `commandes`, propriétaire
//                ou agent de la Division DDM).
// Les chiffres viennent des commandes rendues ; aucun n'est inventé.
// ============================================================================

const MOIS = 6

export default function TableauCommandes({
  slug, base, accent, mots, regard, lang,
}: { slug: string; base: string; accent: string; mots: MotsCommandes; regard: 'client' | 'ddm'; lang: string | null }) {
  const [cs, setCs] = useState<CommandeStat[] | null>(null)
  const [ferme, setFerme] = useState(false)

  useEffect(() => {
    let vivant = true
    void (async () => {
      const j = (await supabase.auth.getSession()).data.session?.access_token
      if (!j || !vivant) return
      try {
        // LA MÊME LECTURE que la barre latérale : déjà partie, souvent déjà là.
        const r = await lireAvecJeton(`/api/sites/${encodeURIComponent(slug)}/${regard === 'client' ? 'mes-commandes' : 'commandes'}`, j)
        if (!r.ok || !vivant || !r.d) return
        const d = r.d
        if (d.ouvert === false) { setFerme(true); return }
        setCs((d.commandes ?? []) as CommandeStat[])
      } catch { /* le tableau reste en chargement ; la navigation reste là */ }
    })()
    return () => { vivant = false }
  }, [slug, regard])

  if (ferme) return null
  const t = mots.tdb
  const liste = cs ?? []
  const mois = derniersMois(MOIS)
  const libMois = mois.map((m) => { try { return new Date(`${m}-15T00:00:00Z`).toLocaleDateString(lang ?? undefined, { month: 'short' }) } catch { return m.slice(5) } })
  const parMois = commandesParMois(liste, mois)
  const unites = unitesParMois(liste, mois)
  const ceMois = parMois[MOIS - 1], avant = parMois[MOIS - 2]
  const etats = repartitionEtats(liste)
  const n = (f: (c: CommandeStat) => boolean) => liste.filter(f).length
  const totalUnites = liste.filter((c) => c.etat !== 'annulee').reduce((t2, c) => t2 + c.lignes.reduce((s, l) => s + (Number(l.quantite) || 0), 0), 0)
  const v = (x: number): React.ReactNode => (cs ? x.toLocaleString(lang ?? undefined) : <span className="tdbAttente" aria-label="…" />)

  const cartes = regard === 'client'
    ? [
        { titre: mots.tableau.enCours, valeur: v(n((c) => EN_COURS.has(c.etat))), sous: t.total6, I: Clock, serie: parMois },
        { titre: mots.tableau.livrees, valeur: v(n((c) => c.etat === 'livree')), sous: t.total6, I: Truck, serie: mois.map((m) => liste.filter((c) => c.etat === 'livree' && c.cree_le.startsWith(m)).length) },
        { titre: mots.tableau.total, valeur: v(liste.length), sous: t.total6, I: ShoppingBag, serie: parMois },
        { titre: t.unites, valeur: v(totalUnites), sous: t.total6, I: Package, serie: unites },
      ]
    : [
        { titre: t.aTraiter, valeur: v(n((c) => c.etat === 'recue')), sous: mots.etats.recue, I: Inbox, serie: mois.map((m) => liste.filter((c) => c.etat === 'recue' && c.cree_le.startsWith(m)).length) },
        { titre: mots.tableau.enCours, valeur: v(n((c) => c.etat === 'en_cours' || c.etat === 'validee')), sous: t.total6, I: Clock, serie: parMois },
        { titre: mots.tableau.livrees, valeur: v(n((c) => c.etat === 'livree')), sous: t.total6, I: Truck, serie: mois.map((m) => liste.filter((c) => c.etat === 'livree' && c.cree_le.startsWith(m)).length) },
        { titre: t.clients, valeur: v(new Set(liste.map((c) => c.client?.organisation ?? c.id)).size), sous: t.total6, I: Users, serie: parMois },
      ]

  const lienListe = `${base}/${regard === 'client' ? 'mes-commandes' : 'gestion-commandes'}`
  const date = (iso: string) => { try { return new Date(iso).toLocaleDateString(lang ?? undefined, { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso.slice(0, 10) } }

  return (
    <div className="tdb">
      <style>{STYLE(accent)}</style>

      <div className="tdbCartes">
        {cartes.map(({ titre, valeur, sous, I, serie }) => (
          <div key={titre} className="tdbCarte">
            <div className="tdbCarteTete"><span className="tdbIc"><I size={17} aria-hidden /></span><span>{titre}</span></div>
            <div className="tdbChiffre">{valeur}</div>
            <div className="tdbSous">{sous}</div>
            <MiniBarres valeurs={serie} couleur={accent} />
          </div>
        ))}
      </div>

      <div className="tdbRangee">
        <div className="tdbSombre">
          <span className="tdbSombreTitre">{t.ceMois}</span>
          <div className="tdbSombreChiffre">{cs ? ceMois : <span className="tdbAttente tdbAttenteClair" />}</div>
          <span className="tdbSombreSous">{v(unites[MOIS - 1])} {t.lignes}</span>
          <div className="tdbSombreLigne"><span>{t.moisPrecedent}</span><strong>{cs ? avant : '—'}</strong></div>
          <a className="tdbSombreBouton" href={regard === 'client' ? `${base}/mes-commandes#nouvelle` : lienListe}>
            {regard === 'client' ? <CirclePlus size={18} aria-hidden /> : <Inbox size={18} aria-hidden />}
            <span>{regard === 'client' ? mots.tableau.passer : t.traiter}</span>
            <ArrowRight size={18} aria-hidden style={{ marginInlineStart: 'auto' }} />
          </a>
        </div>
        <div className="tdbBloc">
          <h3>{t.evolution}</h3>
          <p className="tdbBlocSous">{t.evolutionSous}</p>
          <div className="tdbGrand">{cs ? liste.length : <span className="tdbAttente" />}</div>
          <CourbeAire valeurs={parMois} libelles={libMois} couleur={accent} titre={t.evolution} />
        </div>
      </div>

      <div className="tdbRangee">
        <div className="tdbBloc">
          <h3>{t.parMois}</h3>
          <p className="tdbBlocSous">{t.parMoisSous}</p>
          <div className="tdbGrand">{v(unites.reduce((a, b) => a + b, 0))}</div>
          <BarresMois valeurs={unites} libelles={libMois} couleur={accent} titre={t.parMois} />
        </div>
        <div className="tdbBloc">
          <h3>{t.statuts}</h3>
          <p className="tdbBlocSous">{mots.titre}</p>
          <div style={{ marginTop: 18 }}>
            <Anneau parts={etats.map((e) => ({ cle: e.etat, n: e.n, couleur: TEINTES_ETAT[e.etat] }))} libelles={{ ...mots.etapes, annulee: mots.etats.annulee }}
              total={liste.length} sousTitre={t.auTotal} />
          </div>
        </div>
      </div>

      <div className={regard === 'ddm' ? 'tdbRangee' : ''}>
        <div className="tdbBloc">
          <h3>{t.produits}</h3>
          <p className="tdbBlocSous">{t.produitsSous}</p>
          <div style={{ marginTop: 16 }}>
            <BarresHorizontales couleur={accent} vide={t.videProduits}
              lignes={produitsLesPlusCommandes(liste).map((p) => ({ nom: p.nom, valeur: p.quantite, suffixe: p.unite ?? undefined }))} />
          </div>
        </div>
        {regard === 'ddm' && (
          <div className="tdbBloc">
            <h3>{t.topClients}</h3>
            <p className="tdbBlocSous">{t.topClientsSous}</p>
            <div style={{ marginTop: 16 }}>
              <BarresHorizontales couleur={accent} vide={t.videClients}
                lignes={clientsLesPlusActifs(liste).map((c) => ({ nom: c.nom, valeur: c.commandes }))} />
            </div>
          </div>
        )}
      </div>

      <div className="tdbBloc tdbListe">
        <div className="tdbListeTete">
          <h3>{t.recentes}</h3>
          <a href={lienListe}>{t.voirTout} →</a>
        </div>
        {cs && liste.length === 0 && <p style={{ margin: '6px 24px 22px', color: '#6b7280' }}>{mots.tableau.aucune}</p>}
        {liste.slice(0, 5).map((c) => {
          const qui = regard === 'ddm' ? (c.client?.organisation ?? '—') : c.reference
          return (
            <a key={c.id} href={lienListe} className="tdbLigne">
              <span className="tdbPastille" aria-hidden>{(qui || '?').trim()[0]?.toUpperCase()}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{regard === 'ddm' ? `${qui} · ${c.reference}` : c.reference}</strong>
                <small>{c.lignes.map((l) => `${l.designation} × ${l.quantite}`).join(' · ')}</small>
              </span>
              <span className="tdbStatut" style={{ color: TEINTES_ETAT[c.etat], background: `color-mix(in srgb, ${TEINTES_ETAT[c.etat] ?? '#6b7280'} 12%, #ffffff)` }}>
                {mots.etapes[c.etat] ?? mots.etats[c.etat] ?? c.etat}
              </span>
              <span className="tdbDate">{date(c.cree_le)}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

const STYLE = (a: string) => `
  .tdb { display: flex; flex-direction: column; gap: 18px }
  .tdbCartes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px }
  .tdbCarte, .tdbBloc { background: #ffffff; border: 1px solid #e8eaee; border-radius: 20px; padding: 22px 22px 20px;
    box-shadow: 0 1px 0 rgba(17,24,39,.03), 0 18px 40px -34px rgba(17,24,39,.35); transition: transform .2s ease, box-shadow .2s ease }
  .tdbCarte:hover { transform: translateY(-3px); box-shadow: 0 24px 40px -30px color-mix(in srgb, ${a} 60%, #000) }
  .tdbCarteTete { display: flex; align-items: center; gap: 10px; font-size: 12.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #374151 }
  .tdbIc { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px;
    color: ${a}; background: color-mix(in srgb, ${a} 10%, #ffffff) }
  .tdbChiffre { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; margin-top: 14px; color: #111827; font-variant-numeric: tabular-nums }
  .tdbSous { font-size: 14px; color: #6b7280; margin-top: 2px }
  .tdbRangee { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px }
  .tdbSombre { position: relative; overflow: hidden; border-radius: 22px; padding: 26px 26px 22px; color: #fff; display: flex; flex-direction: column;
    background: linear-gradient(150deg, color-mix(in srgb, ${a} 82%, #000) 0%, color-mix(in srgb, ${a} 45%, #000) 100%) }
  .tdbSombre::before { content: ''; position: absolute; width: 300px; height: 300px; border-radius: 50%; right: -110px; top: -120px; border: 1px solid rgba(255,255,255,.14) }
  .tdbSombre::after { content: ''; position: absolute; width: 180px; height: 180px; border-radius: 50%; right: -40px; top: -50px; background: radial-gradient(circle, rgba(255,255,255,.10), transparent 70%) }
  .tdbSombreTitre { font-size: 15px; font-weight: 600; opacity: .85 }
  .tdbSombreChiffre { font-size: 58px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin: 10px 0 4px }
  .tdbSombreSous { font-size: 14px; opacity: .78 }
  .tdbSombreLigne { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.16); font-size: 14px }
  .tdbSombreLigne span { opacity: .8 }
  .tdbSombreBouton { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 14px; background: #ffffff; color: ${a};
    font-weight: 700; text-decoration: none; position: relative; z-index: 1; transition: transform .2s ease }
  .tdbSombreBouton:hover { transform: translateY(-2px) }
  .tdbSombreLigne + .tdbSombreBouton { margin-top: 26px }
  .tdbBloc h3 { margin: 0; font-size: 18px; font-weight: 800; color: #111827 }
  .tdbBlocSous { margin: 2px 0 0; font-size: 14px; color: #6b7280 }
  .tdbGrand { font-size: 30px; font-weight: 800; margin: 12px 0 10px; color: #111827; font-variant-numeric: tabular-nums }
  .tdbListe { padding: 0; overflow: hidden }
  .tdbAttente { display: inline-block; width: 64px; height: .8em; border-radius: 8px; vertical-align: middle;
    background: linear-gradient(90deg, #eef0f3, #f8f9fb, #eef0f3); background-size: 200% 100%; animation: tdbOnde 1.2s linear infinite }
  .tdbAttenteClair { background: linear-gradient(90deg, rgba(255,255,255,.12), rgba(255,255,255,.28), rgba(255,255,255,.12)); background-size: 200% 100% }
  @keyframes tdbOnde { from { background-position: 200% 0 } to { background-position: -200% 0 } }
  .tdbListeTete { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 14px; border-bottom: 1px solid #eef0f3 }
  .tdbListeTete a { color: ${a}; font-weight: 600; font-size: 14px; text-decoration: none }
  .tdbLigne { display: flex; align-items: center; gap: 14px; padding: 14px 24px; color: inherit; text-decoration: none; border-bottom: 1px solid #f1f2f5; transition: background .15s ease }
  .tdbLigne:last-child { border-bottom: none }
  .tdbLigne:hover { background: #f8f9fb }
  .tdbLigne strong { display: block; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
  .tdbLigne small { display: block; font-size: 13.5px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
  .tdbPastille { flex: 0 0 auto; width: 38px; height: 38px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    font-weight: 800; color: ${a}; background: color-mix(in srgb, ${a} 10%, #ffffff) }
  .tdbStatut { flex: 0 0 auto; font-size: 12.5px; font-weight: 700; padding: 4px 11px; border-radius: 999px }
  .tdbDate { flex: 0 0 auto; font-size: 13.5px; color: #6b7280 }
  @media (max-width: 1100px) { .tdbCartes { grid-template-columns: repeat(2, minmax(0, 1fr)) } }
  @media (max-width: 760px) {
    .tdbRangee { grid-template-columns: 1fr }
    .tdbSombreChiffre { font-size: 46px }
    .tdbDate { display: none }
    .tdbLigne { padding: 12px 16px }
  }
  @media (max-width: 420px) { .tdbCartes { grid-template-columns: 1fr 1fr; gap: 10px } .tdbCarte { padding: 16px } .tdbChiffre { font-size: 26px } }
  @media (prefers-reduced-motion: reduce) { .tdbAttente { animation: none } .tdbCarte, .tdbSombreBouton, .tdbLigne { transition: none } .tdbCarte:hover, .tdbSombreBouton:hover { transform: none } }
`
