'use client'

import { useEffect, useState } from 'react'

// ============================================================================
// LE TEXTE QUI S'ÉCRIT (demande CPA, 2026-11-11, sur le modèle d'anie.td) :
// le titre de l'accueil apparaît lettre après lettre, puis le sous-titre.
//
// QUATRE GARANTIES :
//  · LE TEXTE N'EST DANS LA PAGE QU'UNE FOIS. Le titre complet est rendu par
//    le serveur, tel quel : moteurs et lecteurs d'écran le lisent entier. On le
//    rend seulement TRANSPARENT pendant la frappe (pas invisible : un lecteur
//    d'écran continue de le lire).
//  · AUCUN SAUT DE MISE EN PAGE. Ce texte transparent réserve sa place ; les
//    lettres s'écrivent PAR-DESSUS, dans une couche cachée aux lecteurs.
//  · SANS JAVASCRIPT, le texte apparaît de lui-même après RELAIS_SANS_JS (une
//    animation CSS lui rend sa couleur).
//  · `prefers-reduced-motion` : le texte s'affiche d'un coup, sans frappe.
// ============================================================================

const RELAIS_SANS_JS = '1.6s'

export default function TexteQuiSEcrit({
  texte, msParLettre = 38, delaiMs = 0,
}: { texte: string; msParLettre?: number; delaiMs?: number }) {
  // 'attente' : rendu serveur (texte transparent, relais CSS armé).
  // 'frappe'  : le script écrit par-dessus.  'fixe' : texte entier, visible.
  const [etat, setEtat] = useState<'attente' | 'frappe' | 'fixe'>('attente')
  const [n, setN] = useState(0)

  useEffect(() => {
    // Tout changement d'état passe par un minuteur, jamais directement dans
    // le corps de l'effet (règle react-hooks/set-state-in-effect).
    const sansMouvement = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let i = 0
    let minuteur: ReturnType<typeof setTimeout>
    const taper = () => {
      i += 1
      setN(i)
      if (i < texte.length) minuteur = setTimeout(taper, msParLettre)
      else minuteur = setTimeout(() => setEtat('fixe'), 1200)
    }
    minuteur = setTimeout(() => {
      if (sansMouvement) { setEtat('fixe'); return }
      setEtat('frappe')
      minuteur = setTimeout(taper, delaiMs)
    }, 0)
    return () => clearTimeout(minuteur)
  }, [texte, msParLettre, delaiMs])

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {/* `href` + `precedence` : React 19 range ce style dans <head>, une seule
          fois. Posé ici, dans le titre, son texte (« @keyframes… ») faisait
          partie du <h1> lu par les moteurs (mesuré en ligne le 2026-11-11). */}
      <style href="texte-qui-s-ecrit" precedence="default">{`
        @keyframes tqeRelais { to { color: inherit } }
        @keyframes tqeCurseur { 50% { opacity: 0 } }
        .tqeAttente { color: transparent; animation: tqeRelais 0s ${RELAIS_SANS_JS} forwards }
      `}</style>
      <span className={etat === 'attente' ? 'tqeAttente' : undefined}
        style={etat === 'frappe' ? { color: 'transparent' } : undefined}>
        {texte}
      </span>
      {etat === 'frappe' && (
        <span aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
          {texte.slice(0, n)}
          <span style={{ display: 'inline-block', width: '0.08em', height: '0.9em', marginInlineStart: '0.04em', background: 'currentColor', verticalAlign: '-0.08em', animation: 'tqeCurseur 0.9s steps(1) infinite' }} />
        </span>
      )}
    </span>
  )
}
