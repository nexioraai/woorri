'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TableauClient from '../espace/TableauClient'
import { navigationEspace, ICONES } from '../espace/navigationEspace'
import type { MotsCommandes } from '../espace/motsCommandes'

// ============================================================================
// LOT 11 — L'ESPACE, ET LES QUATRE SITUATIONS QU'IL DOIT NOMMER.
//
// ── POURQUOI CET ÉCRAN NE REFUSE PAS.
//
// `requireSiteCompte` refuse uniformément quatre causes, et c'est juste pour
// tout ce qui protège une donnée. Appliqué ICI, ce refus enfermerait : une
// personne dont la demande attend l'examen de la Centrale n'apprendrait
// rien, donc elle redemanderait. Et redemanderait. Elle finirait par
// téléphoner au standard.
//
// Elle a prouvé qui elle est. Lui cacher SA PROPRE situation ne protège
// personne — ça désorganise seulement la Centrale.
//
// ── CE QUE L'ÉCRAN NE FAIT JAMAIS.
//
// Il ne décide rien. L'état vient de la route, qui le lit en base. Un écran
// qui déduirait « actif » d'un indice local donnerait l'espace à quelqu'un
// que la Centrale n'a pas admis — et les routes, elles, refuseraient : la
// personne verrait une porte ouverte sur un mur.
// ============================================================================

type Compte = {
  id: string
  email: string
  role: 'structure' | 'fournisseur' | 'agent'
  etat: 'en_attente' | 'actif' | 'suspendu'
  organisation: string | null
  /** LOT 17 — saisi à l'inscription ; absent des comptes plus anciens. */
  nom?: string | null
  reference: string | null
  cree_le: string
}

export type MotsEspace = {
  titre: string
  chargement: string
  // Non connecté
  entrezDabord: string
  seConnecter: string
  // Connecté, sans compte
  demanderTitre: string
  demanderPhrase: string
  jeSuis: string
  structure: string
  fournisseur: string
  organisation: string
  envoyer: string
  envoi: string
  // Les trois états
  enAttente: string
  suspendu: string
  bienvenue: string
  // Le cadre
  role: string
  deconnexion: string
  erreur: string
  suivreDemande: string
  // LOT 11 — les trois pages de l'espace. Une page qu'aucun lien n'atteint
  // n'existe pas : c'est le defaut qui avait laisse `/appels-offres` hors du
  // rideau du telephone pendant deux jours.
  mesCommandes: string
  agentDdm: string
  /** Le cadre du tableau de bord (CPA, 2026-11-19). */
  tableauDeBord: string; passerCommande: string
  navPrincipal: string; navGestion: string; navFournisseur: string; navEchanges: string; navCompte: string
  compteActif: string; membreDepuis: string; bonjour: string; accesRapides: string
  ong: string
  gestionCommandes: string
  comptesClients: string
  mesDemandes: string
  mesReclamations: string
  mesDocuments: string
  monDossier: string
  maPrequalification: string
  mesConsultations: string
  monProfil: string
}

export default function EspaceClient({
  slug, base, primary, mots, motsCmd,
}: { slug: string; base: string; primary: string; mots: MotsEspace; motsCmd?: MotsCommandes }) {
  const [etat, setEtat] = useState<'charge' | 'anonyme' | 'connu' | 'panne'>('charge')
  const [compte, setCompte] = useState<Compte | null>(null)
  // CPA, 2026-11-19 — un agent de la DDM gère l'espace client (dit par la route).
  const [gestion, setGestion] = useState(false)
  const [typeClient, setTypeClient] = useState<string | null>(null)
  const [role, setRole] = useState<'structure' | 'fournisseur'>('structure')
  const [organisation, setOrganisation] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function jeton(): Promise<string | null> {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  async function relire(encoreLa: () => boolean = () => true) {
    const j = await jeton()
    if (!encoreLa()) return
    if (!j) { setEtat('anonyme'); return }
    try {
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/mon-compte`, {
        headers: { Authorization: `Bearer ${j}` }, cache: 'no-store',
      })
      if (!encoreLa()) return
      if (r.status === 403) { setEtat('anonyme'); return }
      if (!r.ok) { setEtat('panne'); return }
      const d = await r.json()
      if (!encoreLa()) return
      setCompte(d.compte ?? null)
      setGestion(d.gestionClients === true)
      setTypeClient(typeof d.typeClient === 'string' ? d.typeClient : null)
      setEtat('connu')
    } catch { if (encoreLa()) setEtat('panne') }
  }

  // ── POURQUOI CETTE EXEMPTION EST ÉCRITE, ET CE QU'ELLE NE COUVRE PAS.
  //
  // `set-state-in-effect` existe pour empêcher les cascades de rendu : un
  // effet qui pose un état qui relance un effet. Ce n'est pas le cas ici —
  // l'effet ne tourne qu'au montage, et l'état qu'il pose n'en redéclenche
  // aucun.
  //
  // Il n'y a pas d'autre chemin : l'état du compte se lit par une requête
  // portant le jeton du visiteur, et ce jeton n'existe que dans le
  // navigateur. Le serveur ne peut pas le faire — c'est noté dans la page.
  //
  // CE QUE L'EXEMPTION NE COUVRE PAS : poser un état depuis un effet qui
  // dépend d'un autre état. Si ce composant en arrive là, la règle doit
  // reprendre la main.
  useEffect(() => {
    let vivant = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial, voir ci-dessus
    void relire(() => vivant)
    // L'ÉCRAN PEUT PARTIR AVANT LA RÉPONSE. Sans ce garde, une personne qui
    // quitte la page pendant l'appel déclencherait une écriture d'état sur
    // un composant démonté.
    return () => { vivant = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function demander(e: React.FormEvent) {
    e.preventDefault()
    if (envoi) return
    setEnvoi(true)
    const j = await jeton()
    if (!j) { setEtat('anonyme'); setEnvoi(false); return }
    try {
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/mon-compte`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${j}`, 'content-type': 'application/json' },
        body: JSON.stringify({ role, organisation }),
      })
      if (!r.ok) { setEtat('panne'); return }
      // ON RELIT DEPUIS LA ROUTE. Afficher ce qu'on vient d'envoyer
      // montrerait l'état qu'on a DEMANDÉ, pas celui qui a été écrit — et
      // c'est le déclencheur de base qui décide, jamais nous.
      const d = await r.json()
      setCompte(d.compte ?? null)
      setGestion(d.gestionClients === true)
      setTypeClient(typeof d.typeClient === 'string' ? d.typeClient : null)
      setEtat('connu')
    } catch { setEtat('panne') } finally { setEnvoi(false) }
  }

  const carte: React.CSSProperties = {
    padding: '20px 22px', borderRadius: 14, border: '1px solid #e4e4e4',
    background: '#fff', maxWidth: 560, lineHeight: 1.65, fontSize: 15.5,
  }
  const bouton: React.CSSProperties = {
    padding: '12px 22px', fontSize: 15, fontWeight: 600, borderRadius: 999,
    background: primary, color: '#fff', border: 'none', cursor: 'pointer',
  }
  const champ: React.CSSProperties = {
    width: '100%', padding: '12px 14px', fontSize: 16, marginTop: 6,
    border: '1px solid #d9d9d9', borderRadius: 10, background: '#fff', color: '#111',
  }

  if (etat === 'charge') return <p style={{ opacity: 0.6 }}>{mots.chargement}</p>
  if (etat === 'panne') return <p role="alert" style={{ color: '#9b1c1c' }}>{mots.erreur}</p>

  if (etat === 'anonyme') {
    return (
      <div style={carte}>
        <p style={{ margin: '0 0 16px' }}>{mots.entrezDabord}</p>
        <a href={`${base}/connexion`} style={{ ...bouton, display: 'inline-block', textDecoration: 'none' }}>
          {mots.seConnecter}
        </a>
      </div>
    )
  }

  const deconnexion = (
    <p style={{ marginTop: 22, fontSize: 14 }}>
      <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: primary, cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}
        onClick={async () => { await supabase.auth.signOut(); setCompte(null); setEtat('anonyme') }}>
        {mots.deconnexion}
      </button>
    </p>
  )

  // CONNECTÉ, SANS RATTACHEMENT — on le demande ici, et nulle part ailleurs.
  if (!compte) {
    return (
      <div>
        <div style={carte}>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 8px' }}>{mots.demanderTitre}</h2>
          <p style={{ margin: '0 0 18px', opacity: 0.8 }}>{mots.demanderPhrase}</p>
          <form onSubmit={demander}>
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
              <legend style={{ fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 8 }}>{mots.jeSuis}</legend>
              {([['structure', mots.structure], ['fournisseur', mots.fournisseur]] as const).map(([v, l]) => (
                <label key={v} style={{ display: 'block', marginBottom: 7, fontSize: 15 }}>
                  <input type="radio" name="role" value={v} checked={role === v}
                    onChange={() => setRole(v)} style={{ marginInlineEnd: 9 }} />
                  {l}
                </label>
              ))}
            </fieldset>
            <label style={{ display: 'block', marginBottom: 18 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{mots.organisation}</span>
              <input required minLength={2} value={organisation} style={champ}
                onChange={(e) => setOrganisation(e.target.value)} />
            </label>
            <button type="submit" disabled={envoi} style={{ ...bouton, opacity: envoi ? 0.7 : 1 }}>
              {envoi ? mots.envoi : mots.envoyer}
            </button>
          </form>
        </div>
        {deconnexion}
      </div>
    )
  }

  if (compte.etat !== 'actif') {
    return (
      <div>
        <div style={{ ...carte, background: `color-mix(in srgb, ${primary} 5%, #ffffff)` }}>
          <p style={{ margin: 0 }}>{compte.etat === 'en_attente' ? mots.enAttente : mots.suspendu}</p>
          <p style={{ margin: '14px 0 0', fontSize: 14.5, opacity: 0.8 }}>
            {compte.nom ? `${compte.nom} · ` : ''}{compte.organisation} · {compte.email}
          </p>
        </div>
        {deconnexion}
      </div>
    )
  }

  // L'ACCUEIL DE L'ESPACE (CPA, 2026-11-19). L'identité, la navigation et la
  // déconnexion sont dans le CADRE (CadreEspace) ; ici, le contenu : le
  // tableau du client, puis des raccourcis en cartes vers chaque écran.
  const raccourcis = navigationEspace({ role: compte.role, gestion }, mots)
    .flatMap((g) => g.entrees)
    .filter((e) => e.icone !== 'tableau' && e.icone !== 'commander')
  return (
    <div className="accueilEspace">
      <style>{`
        .accueilEspace .raccourcis { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px }
        .accueilEspace .raccourci { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 16px; background: #fff;
          border: 1px solid #e6e6e6; color: #111; text-decoration: none; font-weight: 600; font-size: 15px;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease }
        .accueilEspace .raccourci:hover { transform: translateY(-3px); border-color: ${primary}; box-shadow: 0 16px 30px -22px ${primary} }
        .accueilEspace .raccourci .ic { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px;
          color: ${primary}; background: color-mix(in srgb, ${primary} 10%, #ffffff); flex: 0 0 auto }
        @media (prefers-reduced-motion: reduce) { .accueilEspace .raccourci { transition: none } .accueilEspace .raccourci:hover { transform: none } }
      `}</style>
      {/* LE TABLEAU DE BORD DU CLIENT : ses chiffres, ses dernières commandes
          et leur suivi, le bouton pour commander. */}
      {compte.role === 'structure' && motsCmd && <TableauClient slug={slug} base={base} accent={primary} mots={motsCmd} />}
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: '6px 0 12px' }}>{mots.accesRapides}</h2>
      <nav className="raccourcis" aria-label={mots.tableauDeBord}>
        {raccourcis.map((e) => {
          const I = ICONES[e.icone]
          return (
            <a key={e.chemin} href={`${base}/${e.chemin}`} className="raccourci">
              <span className="ic"><I size={20} aria-hidden /></span>
              <span>{e.libelle}</span>
            </a>
          )
        })}
      </nav>
    </div>
  )
}
