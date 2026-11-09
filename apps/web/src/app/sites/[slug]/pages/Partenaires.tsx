// ============================================================================
// LOT 15.5 — LE BANDEAU DES PARTENAIRES.
//
// IL DÉFILE SANS JAVASCRIPT. La bande est dupliquée une fois et glisse de
// moitié : quand elle arrive au bout, elle est exactement revenue à son
// point de départ, et la boucle ne se voit pas.
//
// IL S'ARRÊTE AU SURVOL ET AU CLAVIER. Un logo qui s'enfuit sous le curseur
// ne se clique pas, et une bande qui défile pendant qu'on tabule rend la
// page inutilisable au clavier.
//
// LE LOGO EST FACULTATIF. Sans fichier, c'est le NOM qui s'affiche dans sa
// tuile : le bandeau fonctionne dès le premier jour, et l'organisation
// téléverse ses logos quand elle les a.
//
// LA DUPLICATION EST MASQUÉE AU LECTEUR D'ÉCRAN. `aria-hidden` sur la copie :
// sans ça, il annoncerait deux fois chaque partenaire.
// ============================================================================

export type Partenaire = { nom: string; logo?: string; url?: string }

const TRAIT = '#e3e3e3'
const SOURDINE = '#5b5b5b'

function Tuile({ p }: { p: Partenaire }) {
  const dedans = (
    <span style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 150, height: 76, padding: '10px 14px',
      border: `1px solid ${TRAIT}`, borderRadius: 12, background: '#ffffff',
      textAlign: 'center', lineHeight: 1.3,
    }}>
      {p.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- l'URL vient du site, pas du loader
        <img src={p.logo} alt={p.nom} loading="lazy"
          style={{ maxWidth: '100%', maxHeight: 54, objectFit: 'contain', display: 'block' }} />
      ) : (
        // SANS LOGO, LE NOM. Une tuile vide ne dirait rien, et un
        // emplacement gris ferait croire à une image qui n'a pas chargé.
        <span style={{ fontSize: 13, fontWeight: 600, color: SOURDINE }}>{p.nom}</span>
      )}
    </span>
  )

  if (!p.url) return dedans
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={p.nom}
      style={{ display: 'block', textDecoration: 'none' }}>
      {dedans}
    </a>
  )
}

export default function Partenaires({
  items, titre, primary = '#1e4d8c',
}: { items: Partenaire[]; titre?: string; primary?: string }) {
  if (items.length === 0) return null

  // EN DESSOUS DE QUATRE, ON NE FAIT PAS DÉFILER. Trois logos qui glissent
  // sur un écran large donnent un vide mouvant ; posés, ils se lisent.
  const defile = items.length >= 4
  const duree = Math.max(18, items.length * 5)

  return (
    <div>
      {titre && (
        <h3 style={{
          fontSize: 15, fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: SOURDINE, margin: '0 0 14px',
        }}>{titre}</h3>
      )}

      {!defile ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {items.map((p) => <Tuile key={p.nom} p={p} />)}
        </div>
      ) : (
        <>
          <style>{`
            .bandePartenaires { overflow: hidden; position: relative; mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent) }
            .bandePartenaires > .rail { display: flex; gap: 12px; width: max-content; animation: defilePartenaires ${duree}s linear infinite }
            .bandePartenaires:hover > .rail,
            .bandePartenaires:focus-within > .rail { animation-play-state: paused }
            @keyframes defilePartenaires { to { transform: translateX(-50%) } }
            @media (prefers-reduced-motion: reduce) {
              .bandePartenaires { overflow-x: auto; mask-image: none }
              .bandePartenaires > .rail { animation: none }
            }
          `}</style>
          <div className="bandePartenaires" style={{ borderBlock: `1px solid ${primary}1a`, padding: '14px 0' }}>
            <div className="rail">
              {items.map((p) => <Tuile key={p.nom} p={p} />)}
              {/* LA COPIE, MASQUÉE AU LECTEUR D'ÉCRAN : elle n'existe que
                  pour que la boucle soit invisible. */}
              <span aria-hidden="true" style={{ display: 'flex', gap: 12 }}>
                {items.map((p) => <Tuile key={`bis-${p.nom}`} p={p} />)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
