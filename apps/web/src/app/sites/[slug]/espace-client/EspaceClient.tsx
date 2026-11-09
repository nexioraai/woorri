'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  mesDemandes: string
  mesReclamations: string
  mesDocuments: string
  monDossier: string
  monProfil: string
}

export default function EspaceClient({
  slug, base, primary, mots,
}: { slug: string; base: string; primary: string; mots: MotsEspace }) {
  const [etat, setEtat] = useState<'charge' | 'anonyme' | 'connu' | 'panne'>('charge')
  const [compte, setCompte] = useState<Compte | null>(null)
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
            {compte.organisation} · {compte.email}
          </p>
        </div>
        {deconnexion}
      </div>
    )
  }

  return (
    <div>
      <div style={carte}>
        <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>{mots.bienvenue}</p>
        <p style={{ margin: '0 0 18px', fontSize: 14.5, opacity: 0.8 }}>
          {compte.organisation} · {compte.email}
          <br />
          {mots.role} : {compte.role === 'fournisseur' ? mots.fournisseur : mots.structure}
          {compte.reference ? ` · ${compte.reference}` : ''}
        </p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([
            [`${base}/mes-demandes`, mots.mesDemandes],
            [`${base}/mes-reclamations`, mots.mesReclamations],
            [`${base}/mes-documents`, mots.mesDocuments],
            [`${base}/mon-dossier`, mots.monDossier],
            [`${base}/mon-profil`, mots.monProfil],
            [`${base}/demandes/suivi`, mots.suivreDemande],
          ] as const).map(([href, libelle]) => (
            <a key={href} href={href} style={{ color: primary, fontWeight: 600, textDecoration: 'none' }}>
              {libelle} →
            </a>
          ))}
        </nav>
      </div>
      {deconnexion}
    </div>
  )
}
