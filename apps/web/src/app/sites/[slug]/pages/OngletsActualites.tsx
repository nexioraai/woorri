import Link from 'next/link'
import { ONGLETS_ACTUALITES, lienOnglet, libelleOnglet, type CategorieArticle, type LibellesActualites } from './actualites'

/** Les onglets du module Actualités : « Tout », puis chaque catégorie. L'onglet courant est marqué. */
export default function OngletsActualites({
  base, courante, t, primary = '#1e4d8c',
}: {
  base: string
  courante: CategorieArticle | null
  t: LibellesActualites
  primary?: string
}) {
  const onglets: (CategorieArticle | null)[] = [null, ...ONGLETS_ACTUALITES.map((o) => o.categorie)]
  return (
    <nav aria-label={t.titre} data-onglets-actualites="" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 28px' }}>
      {onglets.map((c) => {
        const actif = c === courante
        return (
          <Link key={c ?? 'tout'} href={lienOnglet(base, c)} aria-current={actif ? 'page' : undefined}
            style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 15, fontWeight: 600, textDecoration: 'none',
              border: `1px solid ${actif ? primary : '#d9d9d9'}`,
              background: actif ? primary : '#ffffff', color: actif ? '#ffffff' : '#111111',
            }}>
            {libelleOnglet(t, c)}
          </Link>
        )
      })}
    </nav>
  )
}
