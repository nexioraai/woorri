'use client'

import { useEffect, useRef, useState } from 'react'

// ============================================================================
// LOT 16 — LA BULLE DE L'ASSISTANT.
//
// ── REFAITE LE 2026-11-10 SUR LE MODÈLE EPSS, à la demande du propriétaire
// (« comparer les 2 […] il faut bien le faire ») : en-tête avec avatar et
// état « En ligne », message d'accueil, boutons de sujets, champ arrondi,
// bouton d'envoi rond, pastille « 1 » tant que la bulle n'a pas été ouverte.
//
// ── LES BOUTONS DE SUJETS NE COÛTENT RIEN. Leur réponse est écrite ici et
// ne part PAS chez le fournisseur : un visiteur qui clique « Créer un
// compte » obtient la réponse et le lien sans dépenser une question. Elles
// ne disent que ce que le site affiche déjà, et renvoient à la page.
// Elles ne sont jamais transmises dans l'historique envoyé au modèle.
//
// ── NI LE FOURNISSEUR, NI LE PLAFOND NE S'AFFICHENT DANS LA BULLE.
// Décision du propriétaire, 2026-11-10 : « il faut pas leur dire concernant
// les 10 questions, ni si c'est DeepSeek qui répond ». Les plafonds restent
// appliqués par le serveur ; seuls les messages se taisent sur les chiffres.
// Le fournisseur reste nommé dans la politique de confidentialité.
//
// ── ELLE NE GARDE RIEN. L'historique vit dans cette page et disparaît avec
// elle : aucune mémoire entre deux visites.
// ============================================================================

type Lien = { chemin: string; titre: string }
type Tour = { role: 'user' | 'assistant'; content: string; liens?: Lien[]; local?: boolean }
const MAX = 10

/** Les sujets, et leur réponse écrite d'avance. */
const SUJETS: { label: string; reponse: string; liens: Lien[] }[] = [
  { label: 'Appels d’offres',
    reponse: 'Tous les appels d’offres publiés sont sur cette page, avec leur date limite de remise et leur portée (nationale, internationale ou ouverte à tous).',
    liens: [{ chemin: '/appels-offres', titre: 'Voir les appels d’offres' }, { chemin: '/appels-offres/comment-repondre', titre: 'Comment répondre' }] },
  { label: 'Devenir fournisseur',
    reponse: 'Les conditions et les pièces demandées pour devenir fournisseur sont détaillées ici, ainsi que la marche à suivre pour vous enregistrer.',
    liens: [{ chemin: '/fournisseurs/enregistrement', titre: 'Devenir fournisseur' }, { chemin: '/fournisseurs/conditions', titre: 'Conditions d’achat' }] },
  { label: 'Créer un compte',
    reponse: 'Pour créer un compte : inscrivez-vous avec votre adresse électronique et un mot de passe, confirmez par le courriel reçu, puis connectez-vous et demandez votre rattachement depuis votre espace. La Centrale examine la demande avant d’ouvrir vos droits.',
    liens: [{ chemin: '/inscription', titre: 'Créer un compte' }, { chemin: '/connexion', titre: 'Se connecter' }] },
  { label: 'Actualités',
    reponse: 'Les communiqués, l’agenda et les dernières nouvelles de la Centrale sont publiés ici.',
    liens: [{ chemin: '/actualites/communiques', titre: 'Communiqués' }, { chemin: '/actualites/evenements', titre: 'Agenda' }, { chemin: '/blog', titre: 'Actualités' }] },
  { label: 'Recrutement',
    reponse: 'Pour une candidature ou une question sur le recrutement, écrivez-nous depuis la page Contact.',
    liens: [{ chemin: '/#contact', titre: 'Nous écrire' }] },
  { label: 'Contact',
    reponse: 'Les coordonnées de la Centrale et le formulaire de contact sont sur la page d’accueil. Pour les achats, la direction des achats a sa propre page.',
    liens: [{ chemin: '/#contact', titre: 'Contacter la Centrale' }, { chemin: '/fournisseurs/contact', titre: 'Direction des achats' }] },
]

/**
 * Seules les adresses que le SERVEUR a reconnues deviennent des liens : le
 * serveur ne rend que des pages lues ou les écrans du compte. Une adresse
 * inventée par le modèle reste du texte.
 */
function avecLiens(texte: string, base: string, liens: Lien[]) {
  const connus = new Set(liens.map((l) => l.chemin))
  const morceaux = texte.split(/(\/[a-z0-9#][a-z0-9\-/#]*)/gi)
  return morceaux.map((m, i) =>
    connus.has(m)
      ? <a key={i} href={`${base}${m}`} style={{ color: 'inherit', fontWeight: 600 }}>{m}</a>
      : <span key={i}>{m}</span>)
}

function Avatar({ primary, taille }: { primary: string; taille: number }) {
  return (
    <span aria-hidden="true" style={{
      width: taille, height: taille, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center',
      background: `color-mix(in srgb, ${primary} 14%, #fff)`, color: primary,
    }}>
      <svg width={taille * 0.55} height={taille * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16h5" />
      </svg>
    </span>
  )
}

export default function Assistant({ slug, base, primary, nom }: { slug: string; base: string; primary: string; nom: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [vu, setVu] = useState(false)
  const [tours, setTours] = useState<Tour[]>([])
  const [question, setQuestion] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const fil = useRef<HTMLDivElement>(null)

  const sigle = /\(([^)]+)\)/.exec(nom)?.[1]
  const titre = sigle ? `Assistant ${sigle}` : 'Assistant du site'
  const nomCourt = nom.replace(/\s*\([^)]*\)\s*$/, '')
  // Seules les questions TAPÉES comptent : les sujets ne partent pas.
  const posees = tours.filter((t) => t.role === 'user' && !t.local).length

  useEffect(() => { fil.current?.scrollTo({ top: fil.current.scrollHeight }) }, [tours, envoi])

  function ouvrir() { setOuvert(!ouvert); setVu(true) }

  function sujet(s: (typeof SUJETS)[number]) {
    setTours((t) => [...t,
      { role: 'user', content: s.label, local: true },
      { role: 'assistant', content: s.reponse, liens: s.liens, local: true }])
  }

  async function poser(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || envoi || posees >= MAX) return
    setEnvoi(true); setQuestion('')
    // L'historique transmis ne contient QUE les échanges réellement passés par le modèle.
    const historique = tours.filter((t) => !t.local).map(({ role, content }) => ({ role, content }))
    setTours((t) => [...t, { role: 'user', content: q }])
    try {
      const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/assistant`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, historique }),
      })
      const d = await r.json().catch(() => ({}))
      const liens: Lien[] = Array.isArray(d.liens)
        ? d.liens.filter((l: unknown): l is Lien => !!l && typeof (l as Lien).chemin === 'string'
            && (l as Lien).chemin.startsWith('/') && !(l as Lien).chemin.startsWith('//') && typeof (l as Lien).titre === 'string')
        : []
      setTours((t) => [...t, { role: 'assistant', content: String(d.reponse ?? 'L’assistant est momentanément indisponible.'), liens }])
    } catch {
      setTours((t) => [...t, { role: 'assistant', content: 'L’assistant est momentanément indisponible.' }])
    } finally { setEnvoi(false) }
  }

  const bulleBot = { margin: 0, padding: '10px 14px', borderRadius: '4px 16px 16px 16px', background: '#f3f4f6',
    color: '#111', whiteSpace: 'pre-wrap' as const, fontSize: 14.5, lineHeight: 1.55 }

  return (
    <div style={{ position: 'fixed', insetInlineEnd: 16, bottom: 16, zIndex: 60, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes assistant-point { 0%, 80%, 100% { opacity: .25 } 40% { opacity: 1 } }
        .assistant-point { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #9ca3af;
          margin-inline-end: 4px; animation: assistant-point 1.2s infinite ease-in-out; }
        .assistant-point:nth-child(2) { animation-delay: .15s } .assistant-point:nth-child(3) { animation-delay: .3s }
        .assistant-sujet:hover { background: color-mix(in srgb, ${primary} 10%, #fff) }
        .assistant-champ:focus { outline: none; border-color: ${primary}; box-shadow: 0 0 0 3px color-mix(in srgb, ${primary} 18%, transparent) }
        .assistant-panneau { animation: assistant-entree .18s ease-out }
        @keyframes assistant-entree { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .assistant-point, .assistant-panneau { animation: none } }
      `}</style>

      {ouvert && (
        <div role="dialog" aria-label={titre} className="assistant-panneau" style={{
          width: 'min(380px, calc(100vw - 32px))', height: 'min(560px, calc(100dvh - 110px))',
          display: 'flex', flexDirection: 'column', marginBottom: 14, background: '#fff', color: '#111',
          borderRadius: 20, boxShadow: '0 24px 60px -16px rgba(0,0,0,0.35)', border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          {/* EN-TÊTE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 14px 16px 18px', color: '#fff',
            background: `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 70%, #000))` }}>
            <span aria-hidden="true" style={{ width: 42, height: 42, flex: 'none', borderRadius: '50%', display: 'grid',
              placeItems: 'center', background: 'rgba(255,255,255,0.18)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16h5" />
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16.5 }}>{titre}</div>
              <div style={{ fontSize: 12.5, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flex: 'none' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>En ligne · {nomCourt}</span>
              </div>
            </div>
            <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer l’assistant" style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" aria-hidden="true" style={{ display: 'block', margin: 'auto' }}><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          {/* LE FIL */}
          <div ref={fil} aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Avatar primary={primary} taille={30} />
              <p style={bulleBot}>
                Bonjour, bienvenue sur le site de la <strong>{nomCourt}</strong>.{'\n\n'}
                Comment puis-je vous aider ?
              </p>
            </div>
            {tours.map((t, i) => t.role === 'user' ? (
              <p key={i} style={{ margin: 0, alignSelf: 'flex-end', maxWidth: '82%', padding: '10px 14px',
                borderRadius: '16px 16px 4px 16px', background: primary, color: '#fff', fontSize: 14.5, lineHeight: 1.5,
                whiteSpace: 'pre-wrap' }}>{t.content}</p>
            ) : (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '92%' }}>
                <Avatar primary={primary} taille={30} />
                <div>
                  <p style={bulleBot}>{avecLiens(t.content, base, t.liens ?? [])}</p>
                  {(t.liens ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {(t.liens ?? []).map((l) => (
                        <a key={l.chemin} href={`${base}${l.chemin}`} style={{
                          padding: '7px 13px', borderRadius: 999, background: primary, color: '#fff',
                          fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>{l.titre} →</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {envoi && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <Avatar primary={primary} taille={30} />
                <p style={bulleBot} aria-label="L’assistant écrit">
                  <span className="assistant-point" /><span className="assistant-point" /><span className="assistant-point" />
                </p>
              </div>
            )}
          </div>

          {/* LES SUJETS — réponse immédiate, sans question dépensée */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 14px 4px', borderTop: '1px solid #f0f0f0' }}>
            {SUJETS.map((s) => (
              <button key={s.label} type="button" className="assistant-sujet" onClick={() => sujet(s)} style={{
                padding: '7px 13px', borderRadius: 999, border: `1px solid color-mix(in srgb, ${primary} 35%, #fff)`,
                background: '#fff', color: primary, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>{s.label}</button>
            ))}
          </div>

          {/* LE CHAMP */}
          <form onSubmit={poser} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px 6px' }}>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={600}
              className="assistant-champ" disabled={posees >= MAX} aria-label="Votre question"
              placeholder={posees >= MAX ? 'Écrivez-nous depuis la page Contact' : 'Posez votre question…'}
              style={{ flex: 1, minWidth: 0, padding: '12px 16px', borderRadius: 999, border: '1.5px solid #d1d5db',
                fontSize: 15, background: '#fff', color: '#111' }} />
            <button type="submit" disabled={envoi || posees >= MAX || !question.trim()} aria-label="Envoyer" style={{
              width: 46, height: 46, flex: 'none', borderRadius: '50%', border: 'none', background: primary, color: '#fff',
              cursor: 'pointer', opacity: envoi || !question.trim() ? 0.55 : 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', margin: 'auto' }}>
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
          <div style={{ height: 8 }} />
        </div>
      )}

      <button type="button" onClick={ouvrir} aria-expanded={ouvert}
        aria-label={ouvert ? 'Fermer l’assistant' : 'Ouvrir l’assistant'}
        style={{ position: 'relative', width: 60, height: 60, borderRadius: '50%', border: 'none', background: primary,
          color: '#fff', cursor: 'pointer', boxShadow: '0 12px 30px -8px rgba(0,0,0,0.45)', marginInlineStart: 'auto', display: 'block' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ margin: 'auto', display: 'block' }}>
          {ouvert ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></>}
        </svg>
        {/* LA PASTILLE : un message d'accueil attend, tant que la bulle n'a pas été ouverte. */}
        {!vu && (
          <span aria-hidden="true" style={{ position: 'absolute', top: -2, insetInlineEnd: -2, minWidth: 20, height: 20,
            borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700,
            display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>1</span>
        )}
      </button>
    </div>
  )
}
