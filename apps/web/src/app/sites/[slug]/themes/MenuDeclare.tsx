import Link from 'next/link'
import type { Site } from './shared'
import { pictogrammeDe } from './pictogrammeMenu'
import { resolveSiteBaseUrl } from './shared'
import type { EntreeMenu } from '../pages/fetchPage'

// ============================================================
// LOT 2 -- LE MENU A PLUSIEURS NIVEAUX.
//
// ── UN SEUL COMPOSANT, QUATRE INSERTIONS.
//
// Les quatre themes le rendent ; aucun ne le reecrit. L'ecrire quatre fois
// aurait recree exactement la forme que ce meme dossier a deja punie :
// `ctaHref` recopie dans quatre themes, avec une divergence survenue entre
// deux d'entre eux.
//
// ── IL NE LIT RIEN.
//
// Les entrees arrivent par la seule route posee en lot 1 : un theme est
// SYNCHRONE, il ne peut pas `await`, donc il ne peut que RECEVOIR. Ce
// composant ne doit pas devenir la faille par laquelle une seconde route
// s'ouvrirait.
//
// ── LE SOUS-MENU S'OUVRE SANS JAVASCRIPT.
//
// `<details>` natif plutot qu'un etat React : un theme est un composant
// serveur, il n'a pas d'etat, et un menu qui exige du JavaScript pour
// s'ouvrir est un menu que ne voit ni un lecteur d'ecran mal servi, ni une
// connexion lente, ni un moteur. Le cahier des charges exige WCAG 2.2 AA et
// « performante sur mobile ou connexion lente ».
// ============================================================

/**
 * LOT 15.1 — LE PICTOGRAMME D'UNE RUBRIQUE.
 *
 * `aria-hidden` : le libellé dit déjà la rubrique, et un lecteur d'écran
 * qui annoncerait « losange noir Nos activités » ajouterait du bruit, pas
 * de l'information.
 *
 * Rien ne s'affiche si le chemin est inconnu : aucun pictogramme vaut mieux
 * qu'un faux, parce que le lecteur croira le faux.
 */
function Pictogramme({ chemin }: { chemin: string }) {
  const signe = pictogrammeDe(chemin)
  if (!signe) return null
  return (
    <span aria-hidden="true" style={{ marginInlineEnd: 6, opacity: 0.65, fontSize: '0.95em' }}>
      {signe}
    </span>
  )
}

export default function MenuDeclare({
  site,
  host,
  entrees,
  className,
}: {
  site: Site
  host: string | null
  entrees: EntreeMenu[]
  className?: string
}) {
  if (!entrees.length) return null

  const base = resolveSiteBaseUrl(site, host)
  // Premier niveau = les entrees SANS parent. L'ordre vient du lecteur, pas
  // d'ici : retrier donnerait deux ordres pour le meme site selon le theme.
  const racines = entrees.filter((e) => !e.parent)
  const enfantsDe = (chemin: string) => entrees.filter((e) => e.parent === chemin)

  return (
    <>
      {racines.map((r) => {
        const enfants = enfantsDe(r.chemin)

        // Sans enfant, un lien simple. Un `<details>` vide serait une
        // fleche qui n'ouvre rien -- la promesse d'un contenu absent.
        if (!enfants.length) {
          return (
            <Link key={r.chemin} href={`${base}/${r.chemin}`} className={className}>
              <Pictogramme chemin={r.chemin} />
              {r.titre}
            </Link>
          )
        }

        return (
          <details key={r.chemin} style={{ position: 'relative', display: 'inline-block' }}>
            <summary className={className} style={{ cursor: 'pointer', listStyle: 'none' }}>
              <Pictogramme chemin={r.chemin} />
              {r.titre}
              <span aria-hidden="true" style={{ fontSize: '0.75em', marginInlineStart: 4 }}>▾</span>
            </summary>
            <div
              style={{
                position: 'absolute', insetInlineStart: 0, top: '100%', zIndex: 50,
                minWidth: 240, padding: 8, marginTop: 8,
                background: '#fff', borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.10)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
              }}
            >
              {/* LE PARENT EST LUI-MEME ATTEIGNABLE. Un sous-menu qui ne
                  donne acces qu'aux enfants rend la page d'entree
                  inatteignable -- c'est le defaut du matin, en plus petit. */}
              <Link
                href={`${base}/${r.chemin}`}
                style={{ display: 'block', padding: '10px 12px', borderRadius: 10, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
              >
                {r.titre}
              </Link>
              {enfants.map((e) => (
                <Link
                  key={e.chemin}
                  href={`${base}/${e.chemin}`}
                  style={{ display: 'block', padding: '10px 12px', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}
                >
                  {e.titre}
                </Link>
              ))}
            </div>
          </details>
        )
      })}
    </>
  )
}
