import Link from 'next/link'
import type { LienLegal } from './pagesLegales'

// ============================================================================
// LOT 17 — LES PAGES LÉGALES ONT UN CHEMIN D'ACCÈS.
//
// Mesuré le 2026-11-10 sur le site de la CPA : `/mentions-legales`,
// `/confidentialite`, `/accessibilite` et `/plan-du-site` répondaient 200,
// mais AUCUN lien n'y menait. Une page légale qu'on ne peut pas trouver
// n'est pas publiée.
//
// DEUX ENDROITS, UNE SEULE LISTE (`lirePagesLegales`) :
//   · sur l'ACCUEIL, les liens sont DANS le pied de page du thème, à côté
//     du « © » (demande du propriétaire, 2026-11-10 : la bande grise sous le
//     pied noir faisait pièce rapportée) ;
//   · sur les AUTRES pages, qui n'ont pas de pied de page de thème, ce
//     bandeau les porte.
// Quand un pied de thème les porte (`footer[data-pied-legal]`), ce bandeau se
// retire — par CSS `:has`, donc sans que le gabarit ait à savoir quelle page
// il enveloppe.
// ============================================================================

export const PAGES_LEGALES = ['mentions-legales', 'confidentialite', 'accessibilite'] as const

export default function PiedLegal({ liens }: { liens: LienLegal[] }) {
  if (liens.length === 0) return null
  return (
    <nav aria-label="Informations légales" className="piedLegal" style={{
      borderTop: '1px solid rgba(0,0,0,0.08)', background: '#fafafa',
      padding: '14px 20px 18px', fontSize: 13.5, color: '#555',
    }}>
      <style>{`.vivant:has(footer[data-pied-legal]) .piedLegal { display: none }`}</style>
      <ul style={{ listStyle: 'none', margin: '0 auto', padding: 0, maxWidth: 1200,
        display: 'flex', flexWrap: 'wrap', gap: '6px 22px', justifyContent: 'center' }}>
        {liens.map((l) => (
          <li key={l.href}><Link href={l.href} style={{ color: 'inherit' }}>{l.titre}</Link></li>
        ))}
      </ul>
    </nav>
  )
}
