import Link from 'next/link'
import type { EntreeMenu } from './fetchPage'

// LES SOUS-PAGES D'UNE PAGE — une carte par enfant, rien si aucun enfant.
//
// LOT 18 — partagé par les pages déclarées ET par les écrans du moteur qui
// reprennent une page déclarée (`/catalogue`). Mesuré le 2026-11-10 : le
// texte du catalogue renvoyait à « la page Passer une commande ci-dessous »,
// et l'écran du moteur ne montrait pas les sous-pages — le renvoi tombait
// dans le vide. Une seule écriture : deux copies divergeraient.
export default function SousPages({ enfants, base, accent, rtl = false }: {
  enfants: EntreeMenu[]; base: string; accent: string; rtl?: boolean
}) {
  if (enfants.length === 0) return null
  return (
    <nav aria-label="Sous-pages" style={{ marginTop: 56, display: 'grid', gap: 12 }}>
      {enfants.map((e) => (
        <Link
          key={e.chemin}
          href={`${base}/${e.chemin}`}
          style={{
            display: 'block', padding: '18px 20px', borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.12)', textDecoration: 'none',
            color: 'inherit', fontWeight: 600,
          }}
        >
          {e.titre}
          <span aria-hidden="true" style={{ color: accent }}>{rtl ? ' ←' : ' →'}</span>
        </Link>
      ))}
    </nav>
  )
}
