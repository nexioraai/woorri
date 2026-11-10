import Link from 'next/link'

// ============================================================================
// LOT 17 — LES PAGES LÉGALES ONT UN CHEMIN D'ACCÈS.
//
// Mesuré le 2026-11-10 sur le site de la CPA : `/mentions-legales`,
// `/confidentialite`, `/accessibilite` et `/plan-du-site` répondaient 200,
// mais AUCUN lien n'y menait — ni depuis l'accueil, ni depuis une autre page.
// Une page légale qu'on ne peut pas trouver n'est pas publiée.
//
// UN SEUL ENDROIT : le gabarit commun à toutes les pages du site, pas le
// pied de page de chaque thème. Quatre thèmes, c'est quatre endroits où le
// lien finit par manquer.
//
// SEULES LES PAGES QUI EXISTENT sont listées : un lien vers une page absente
// est pire que pas de lien. Le plan du site, lui, est un écran du moteur.
// ============================================================================

export const PAGES_LEGALES = ['mentions-legales', 'confidentialite', 'accessibilite'] as const

export default function PiedLegal({ base, pages, planDuSite }: {
  base: string
  /** Les pages légales DÉCLARÉES par le site, dans l'ordre voulu. */
  pages: { chemin: string; titre: string }[]
  planDuSite: string
}) {
  const liens = [...pages, { chemin: 'plan-du-site', titre: planDuSite }]
  return (
    <nav aria-label="Informations légales" style={{
      borderTop: '1px solid rgba(0,0,0,0.08)', background: '#fafafa',
      padding: '14px 20px 18px', fontSize: 13.5, color: '#555',
    }}>
      <ul style={{ listStyle: 'none', margin: '0 auto', padding: 0, maxWidth: 1200,
        display: 'flex', flexWrap: 'wrap', gap: '6px 22px', justifyContent: 'center' }}>
        {liens.map((l) => (
          <li key={l.chemin}>
            <Link href={`${base}/${l.chemin}`} style={{ color: 'inherit' }}>{l.titre}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
