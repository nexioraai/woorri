/**
 * LA PAGE « COMPTE » D'UNE APPLI PUBLIÉE — SERVIE PAR DERIBFY, PAS ÉCRITE DANS L'APPLI
 * (option B du propriétaire, 2026-11-18).
 *
 * ── POURQUOI SERVIE ET PAS COULÉE DANS CHAQUE APPLI.
 *
 * « Mes 10 applis sont ma seule preuve que Deribfy marche. Toute amélioration
 * qui ne les atteint pas fait reculer ma preuve d'une génération. » Une page
 * dans la bibliothèque n'aurait atteint que les applis NEUVES ; servie depuis
 * `<nom>.deribfy.app/compte`, elle atteint les dix dès le déploiement — pharma,
 * la démo du festival, comprise.
 *
 * ── CE QU'ELLE FAIT.
 *
 * Même ORIGINE que l'appli : la session qu'elle a ouverte est la même ici.
 *   · connecté : l'adresse du compte, changer le mot de passe, se déconnecter ;
 *   · « Supprimer cette application et ses données » n'existe PAS ici — un
 *     seul compte par appli : le supprimer enfermerait le commerçant dehors
 *     avec ses données dedans. La page renvoie au tableau de bord Deribfy ;
 *   · non connecté : se connecter, et « mot de passe oublié » — par l'espace
 *     Deribfy, parce que `admin@<nom>.deribfy.app` n'est pas une vraie boîte :
 *     aucun e-mail n'y arriverait jamais (décision du propriétaire).
 *
 * Elle est assemblée par le MÊME assembleur que les applis, et servie par le
 * même `pageAutonome` : même base, même couleur du propriétaire.
 */

/** L'espace Deribfy du propriétaire : là où vivent la suppression et « Refaire le mot de passe ». */
import { ADRESSE_GESTION } from './entites-declarees'

export const URL_ESPACE_DERIBFY = 'https://www.deribfy.com/dashboard'

const COMPTE_TSX = `
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

declare global {
  interface Window { DERIBFY_BASE: { url: string; clePubliable: string; options: Record<string, unknown> } }
}

const b = window.DERIBFY_BASE
const enBase = b.url !== '' && window.origin !== 'null'
const base = enBase ? createClient(b.url, b.clePubliable, b.options) : null
const ESPACE = ${JSON.stringify(URL_ESPACE_DERIBFY)}
const GESTION = ${JSON.stringify('/' + ADRESSE_GESTION)}

const carte = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'grid', gap: 12 } as const
const champ = { padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--input)', fontSize: 'var(--text-base)', background: 'var(--background)', color: 'var(--foreground)' } as const
const bouton = (principal: boolean, attente = false) => ({
  padding: '10px 16px', borderRadius: 'var(--radius-md)', border: principal ? 'none' : '1px solid var(--border)',
  background: principal ? 'var(--primary)' : 'transparent', color: principal ? 'var(--primary-foreground)' : 'var(--foreground)',
  fontSize: 'var(--text-base)', fontWeight: 600, cursor: attente ? 'wait' : 'pointer', opacity: attente ? 0.7 : 1,
}) as const

export default function Compte() {
  const [email, setEmail] = useState<string | null>(null)
  const [pret, setPret] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const [attente, setAttente] = useState(false)
  const [identifiant, setIdentifiant] = useState('')
  const [secret, setSecret] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (!base) { setPret(true); return }
    base.auth.getSession().then(({ data }) => { setEmail(data.session?.user.email ?? null); setPret(true) })
  }, [])

  const seConnecter = async () => {
    if (!base) return
    setAttente(true); setMessage(null)
    const { data, error } = await base.auth.signInWithPassword({ email: identifiant.trim(), password: secret })
    setAttente(false)
    if (error) { setMessage({ ok: false, texte: 'Identifiant ou mot de passe incorrect.' }); return }
    setEmail(data.user?.email ?? identifiant.trim()); setSecret('')
  }

  const changerMotDePasse = async () => {
    if (!base) return
    setMessage(null)
    if (nouveau.length < 8) { setMessage({ ok: false, texte: 'Le mot de passe doit faire au moins 8 caractères.' }); return }
    if (nouveau !== confirmation) { setMessage({ ok: false, texte: 'Les deux mots de passe ne sont pas identiques.' }); return }
    setAttente(true)
    const { error } = await base.auth.updateUser({ password: nouveau })
    setAttente(false)
    if (error) { setMessage({ ok: false, texte: 'Le mot de passe n’a pas pu être changé : ' + error.message }); return }
    setNouveau(''); setConfirmation('')
    setMessage({ ok: true, texte: 'Mot de passe changé. Utilisez-le à votre prochaine connexion.' })
  }

  const seDeconnecter = async () => {
    if (!base) return
    setAttente(true)
    await base.auth.signOut()
    setAttente(false)
    setEmail(null)
    setMessage({ ok: true, texte: 'Vous êtes déconnecté.' })
  }

  const avis = message === null ? null : (
    <p role="status" style={{ margin: 0, padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
      background: message.ok ? 'var(--accent)' : 'transparent', color: message.ok ? 'var(--accent-foreground)' : 'var(--destructive)',
      border: message.ok ? 'none' : '1px solid var(--destructive)' }}>{message.texte}</p>
  )

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', display: 'grid', gap: 16, fontFamily: 'inherit' }}>
      <a href={GESTION} style={{ color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>← Retour à l’application</a>
      <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)' }}>Compte</h1>
      {!pret ? <p style={{ color: 'var(--muted-foreground)' }}>Chargement…</p> : !base ? (
        <p style={{ color: 'var(--muted-foreground)' }}>Cette page sert le compte de l’application publiée.</p>
      ) : email !== null ? (
        <>
          <section style={carte}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>Connecté avec</div>
            <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{email}</div>
          </section>
          <section style={carte}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Changer le mot de passe</h2>
            <input aria-label="Nouveau mot de passe" type="password" autoComplete="new-password" placeholder="Nouveau mot de passe" value={nouveau} onChange={(e) => setNouveau(e.target.value)} style={champ} />
            <input aria-label="Confirmer le mot de passe" type="password" autoComplete="new-password" placeholder="Confirmer" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} style={champ} />
            <button type="button" disabled={attente} onClick={() => { void changerMotDePasse() }} style={bouton(true, attente)}>{attente ? 'Un instant…' : 'Changer le mot de passe'}</button>
            {avis}
          </section>
          <section style={carte}>
            <button type="button" disabled={attente} onClick={() => { void seDeconnecter() }} style={bouton(false, attente)}>Se déconnecter</button>
          </section>
          <section style={{ ...carte, gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Supprimer cette application et ses données</h2>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>
              Cela se fait depuis votre espace Deribfy, là où l’application a été créée — pas ici : ce compte est la seule clé de l’application, et le supprimer vous enfermerait dehors avec vos données dedans.
            </p>
            <a href={ESPACE} style={{ color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>Ouvrir mon espace Deribfy</a>
          </section>
        </>
      ) : (
        <>
          <section style={carte}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Se connecter</h2>
            <input aria-label="Identifiant" type="email" autoComplete="username" placeholder="admin@….deribfy.app" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} style={champ} />
            <input aria-label="Mot de passe" type="password" autoComplete="current-password" placeholder="Mot de passe" value={secret} onChange={(e) => setSecret(e.target.value)} style={champ} />
            <button type="button" disabled={attente} onClick={() => { void seConnecter() }} style={bouton(true, attente)}>{attente ? 'Un instant…' : 'Se connecter'}</button>
            {avis}
          </section>
          <section style={{ ...carte, gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Mot de passe oublié ?</h2>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>
              Connectez-vous à votre espace Deribfy, ouvrez cette application et choisissez « Refaire le mot de passe ». Aucun e-mail n’est envoyé : l’identifiant de l’application n’est pas une boîte aux lettres.
            </p>
            <a href={ESPACE} style={{ color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>Ouvrir mon espace Deribfy</a>
          </section>
        </>
      )}
    </main>
  )
}
`

const INDEX_TSX = `
import { createRoot } from 'react-dom/client'
import Compte from './Compte'

const racine = document.getElementById('racine')
if (!racine) throw new Error('Élément racine introuvable')
createRoot(racine).render(<Compte />)
`

/** Les fichiers de la page, assemblés comme une appli. */
export const FICHIERS_PAGE_COMPTE: ReadonlyMap<string, string> = new Map([
  ['index.tsx', INDEX_TSX.trimStart()],
  ['Compte.tsx', COMPTE_TSX.trimStart()],
])

/**
 * LE LIEN « COMPTE », injecté par `pageAutonome` dans une appli SERVIE.
 *
 * Hors de `#racine` (React effacerait ce qu'on y pose), discret, en bas à
 * gauche. Il n'apparaît que pour qui GÈRE : une session ouverte (la clé
 * `sb-…-auth-token` que gotrue range) ou l'appli ouverte sur sa gestion (`ADRESSE_GESTION`). Le
 * client d'une boutique ne le voit pas. Revérifié au changement d'ancre et
 * toutes les deux secondes : une connexion dans le même onglet ne déclenche
 * aucun événement `storage`.
 */
export const LIEN_COMPTE_EMIS =
  '<a id="deribfy-compte" href="/compte" style="position:fixed;left:12px;bottom:12px;z-index:2147483000;display:none;' +
  'padding:6px 12px;border-radius:999px;background:var(--card,#fff);color:var(--foreground,#111);' +
  'border:1px solid var(--border,#ddd);font:600 13px system-ui,-apple-system,sans-serif;text-decoration:none;' +
  'box-shadow:0 2px 8px rgba(0,0,0,.12)">Compte</a>' +
  '<script>(function(){var a=document.getElementById("deribfy-compte");if(!a)return;' +
  'function connecte(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||"";' +
  'if(/^sb-.+-auth-token$/.test(k))return true}}catch(e){}return false}' +
  'function voir(){a.style.display=(connecte()||location.hash===' + JSON.stringify(ADRESSE_GESTION) + ')?"inline-block":"none"}' +
  'voir();addEventListener("hashchange",voir);addEventListener("storage",voir);setInterval(voir,2000)})()</script>'
