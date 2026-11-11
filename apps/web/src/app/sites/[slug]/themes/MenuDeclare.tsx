import Link from 'next/link'
import type { Site } from './shared'
import DessinDeMenu from './DessinDeMenu'
import MenuSurvol, { ATTRIBUT_SURVOL } from './MenuSurvol'
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

export default function MenuDeclare({
  site,
  host,
  entrees,
  className,
  couleur,
}: {
  site: Site
  host: string | null
  entrees: EntreeMenu[]
  className?: string
  /**
   * LOT 15.7 — la teinte des pictogrammes.
   *
   * Seul le thème sait sur quel fond il pose sa barre. Celui qui la pose sur
   * du clair passe la couleur du site ; un thème sombre ne passe rien, et le
   * dessin reprend la couleur du texte. Décider ici aurait rendu les
   * pictogrammes invisibles sur le thème noir.
   */
  couleur?: string | null
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
            <Link
              key={r.chemin}
              href={`${base}/${r.chemin}`}
              className={className}
              // LOT 15.7 — `nowrap`. Sans lui, « Qui sommes-nous » se coupe en
              // deux lignes dès que la barre est serrée, et la dernière entrée
              // sort du cadre : mesuré en ligne le 2026-11-09, « Contact »
              // tranché par le bord de l'en-tête.
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
            >
              <DessinDeMenu chemin={r.chemin} couleur={couleur} />
              {r.titre}
            </Link>
          )
        }

        return (
          <details key={r.chemin} {...{ [ATTRIBUT_SURVOL]: '' }} style={{ position: 'relative', display: 'inline-block' }}>
            <summary
              className={className}
              style={{
                cursor: 'pointer', listStyle: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
              }}
            >
              <DessinDeMenu chemin={r.chemin} couleur={couleur} />
              {r.titre}
              {/* LE CHEVRON EST UN DESSIN LUI AUSSI. En caractère, il hérite
                  du même pari de police que les pictogrammes du 15.1. */}
              <svg aria-hidden="true" focusable="false" width="10" height="10" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth={2.6}
                strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, opacity: 0.55 }}>
                <path d="M5 8.5 12 15.5l7-7" />
              </svg>
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
      {/* Le survol ouvre les sous-menus (souris seulement) : une amélioration,
          le menu marche sans elle. */}
      <MenuSurvol />
    </>
  )
}
