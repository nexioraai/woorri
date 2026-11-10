// ============================================================================
// LOT 15.5 / 15.7 — LE BANDEAU DES PARTENAIRES.
//
// IL DÉFILE SANS JAVASCRIPT. La bande est dupliquée une fois et glisse de
// moitié : quand elle arrive au bout, elle est exactement revenue à son
// point de départ, et la boucle ne se voit pas.
//
// IL S'ARRÊTE AU SURVOL ET AU CLAVIER. Un logo qui s'enfuit sous le curseur
// ne se clique pas, et une bande qui défile pendant qu'on tabule rend la
// page inutilisable au clavier.
//
// LE LOGO EST FACULTATIF. Sans fichier, la tuile porte le MONOGRAMME de
// l'organisation et son nom : le bandeau tient debout dès le premier jour,
// et l'organisation téléverse ses logos quand elle les a.
//
// ── CE QUE LE 15.7 A REPRIS, ET POURQUOI.
//
// La première version posait le nom en petit gris dans un rectangle bordé.
// Ça ne se lisait pas comme un partenaire : ça se lisait comme une image qui
// n'avait pas chargé. Un emplacement vide fait douter de tout le reste de la
// page. Le monogramme, lui, est une FORME : il occupe la tuile pour de bon,
// et personne n'attend qu'autre chose arrive à sa place.
//
// LA DUPLICATION EST MASQUÉE AU LECTEUR D'ÉCRAN. `aria-hidden` sur la copie :
// sans ça, il annoncerait deux fois chaque partenaire.
// ============================================================================

export type Partenaire = { nom: string; logo?: string; url?: string }

const TRAIT = '#e6e6e6'
const ENCRE = '#1c1c1c'
const SOURDINE = '#6b6b6b'

/** Les mots qui ne portent pas l'identité d'une organisation. */
const VIDES = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'au', 'aux', 'pour',
  'of', 'the', 'and', 'for', 'a', 'd', 'l',
])

/**
 * LE MONOGRAMME D'UN PARTENAIRE.
 *
 * MÊME RÈGLE QU'EN BASE, pour la même raison. `initiales_du_site()` préfère
 * déjà un sigle entre parenthèses aux initiales calculées : « Organisation
 * mondiale de la santé (OMS) » doit donner OMS, et non OMDLS. Reproduire ici
 * la règle choisie là-bas évite qu'un partenaire et un site portent deux
 * abréviations différentes du même nom.
 *
 * DEUX PLAFONDS, PAS UN. Un sigle ÉCRIT par l'organisation est son nom :
 * couper UNICEF en « UNIC » serait l'estropier, donc il garde jusqu'à six
 * signes. Des initiales CALCULÉES, elles, n'engagent que nous : au-delà de
 * trois ce n'est plus un monogramme, c'est un mot mal composé.
 */
export function monogrammeDe(nom: string): string {
  const sigle = /\(([^)]{2,8})\)/.exec(nom)
  if (sigle) return sigle[1].toUpperCase().slice(0, 6)

  const mots = nom
    .replace(/\([^)]*\)/g, ' ')
    .split(/[\s'’\-–/]+/u)
    .map((m) => m.trim())
    .filter((m) => m.length > 0 && !VIDES.has(m.toLowerCase()))

  if (mots.length === 0) return nom.trim().slice(0, 2).toUpperCase()
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase()
  return mots.slice(0, 3).map((m) => m[0]).join('').toUpperCase()
}

/**
 * `fantome` — LA COPIE DU DÉFILEMENT (LOT 18). Mesuré le 2026-11-10 : la
 * copie qui rend la boucle invisible portait les MÊMES noms, liens et textes
 * alternatifs que l'original ; pour un moteur ou un lecteur de texte, chaque
 * partenaire apparaissait deux fois. La copie fantôme montre le même dessin,
 * mais ses textes sont DESSINÉS par la feuille de style (`attr(data-texte)`)
 * et ses logos n'ont pas de texte alternatif : il n'y a plus qu'une liste.
 */
function Tuile({ p, primary, fantome = false }: { p: Partenaire; primary: string; fantome?: boolean }) {
  const texte = (t: string) => fantome ? <span className="texteFantome" data-texte={t} /> : t
  const dedans = (
    <span className="tuilePartenaire" style={{
      display: 'flex', alignItems: 'center', gap: 11,
      width: 212, minHeight: 84, padding: '14px 16px',
      border: `1px solid ${TRAIT}`, borderRadius: 14, background: '#ffffff',
      boxSizing: 'border-box',
    }}>
      {p.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- l'URL vient du site, pas du loader
        <img className="logoPartenaire" src={p.logo} alt={fantome ? '' : p.nom} loading="lazy"
          style={{ maxWidth: '100%', maxHeight: 56, margin: '0 auto', objectFit: 'contain', display: 'block' }} />
      ) : (
        <>
          {/* LE MONOGRAMME. Pas un rectangle gris en attente d'image : une
              forme qui tient la tuile pour de bon. */}
          <span aria-hidden="true" style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 42, height: 42, borderRadius: 11,
            background: `color-mix(in srgb, ${primary} 12%, #ffffff)`,
            color: primary,
            fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
          }}>{texte(monogrammeDe(p.nom))}</span>
          {/* LE NOM ENTIER RESTE LISIBLE. Le monogramme abrège pour l'œil ;
              il ne remplace pas ce que l'organisation s'appelle. */}
          <span style={{
            fontSize: 12.5, fontWeight: 600, lineHeight: 1.32, color: ENCRE,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{texte(p.nom)}</span>
        </>
      )}
    </span>
  )

  if (!p.url || fantome) return dedans
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
  const duree = Math.max(22, items.length * 6)

  // LA MISE EN FORME DES TUILES EST LA MÊME DANS LES DEUX CAS. L'écrire deux
  // fois, c'est deux endroits où le survol divergera.
  const styleTuiles = `
    .tuilePartenaire { transition: border-color .25s, box-shadow .25s, transform .25s }
    .texteFantome::after { content: attr(data-texte) }
    a:hover > .tuilePartenaire, a:focus-visible > .tuilePartenaire {
      border-color: color-mix(in srgb, ${primary} 45%, #ffffff);
      box-shadow: 0 8px 22px color-mix(in srgb, ${primary} 14%, transparent);
      transform: translateY(-2px);
    }
    @media (prefers-reduced-motion: reduce) {
      .tuilePartenaire { transition: none }
      a:hover > .tuilePartenaire, a:focus-visible > .tuilePartenaire { transform: none }
    }
  `

  return (
    <div>
      {titre && (
        <h3 style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: SOURDINE, margin: '0 0 16px',
        }}>{titre}</h3>
      )}

      {!defile ? (
        <>
          <style>{styleTuiles}</style>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {items.map((p) => <Tuile key={p.nom} p={p} primary={primary} />)}
          </div>
        </>
      ) : (
        <>
          <style>{`
            ${styleTuiles}
            .bandePartenaires { overflow: hidden; position: relative; mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent) }
            .bandePartenaires > .rail { display: flex; gap: 14px; width: max-content; animation: defilePartenaires ${duree}s linear infinite }
            .bandePartenaires:hover > .rail,
            .bandePartenaires:focus-within > .rail { animation-play-state: paused }
            @keyframes defilePartenaires { to { transform: translateX(-50%) } }
            @media (prefers-reduced-motion: reduce) {
              .bandePartenaires { overflow-x: auto; mask-image: none }
              .bandePartenaires > .rail { animation: none }
            }
          `}</style>
          <div className="bandePartenaires" style={{
            borderBlock: `1px solid color-mix(in srgb, ${primary} 14%, #ffffff)`,
            background: `color-mix(in srgb, ${primary} 3%, #ffffff)`,
            borderRadius: 18, padding: '18px 0',
          }}>
            <div className="rail">
              {items.map((p) => <Tuile key={p.nom} p={p} primary={primary} />)}
              {/* LA COPIE, MASQUÉE AU LECTEUR D'ÉCRAN : elle n'existe que
                  pour que la boucle soit invisible. */}
              <span aria-hidden="true" style={{ display: 'flex', gap: 14 }}>
                {items.map((p) => <Tuile key={`bis-${p.nom}`} p={p} primary={primary} fantome />)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
