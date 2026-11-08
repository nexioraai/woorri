import Image from 'next/image'

// ============================================================================
// LOT 5 — L'ACCUEIL À PLUSIEURS PHOTOS.
//
// LE DÉFAUT. L'accueil ne montrait qu'UNE photo, figée. Un établissement qui
// a un entrepôt, une chaîne du froid et des équipes n'a aucune raison de n'en
// montrer qu'une.
//
// AUCUNE COLONNE NEUVE. Les photos viennent de `hero_image` suivie de
// `gallery` — deux champs qui existent déjà et que l'éditeur sait remplir.
// Poser une colonne pour une donnée qu'on a déjà, c'est créer une deuxième
// vérité qui divergera.
//
// EN CSS PUR. Pas une ligne de JavaScript : l'accueil tourne même si le
// script échoue, et `prefers-reduced-motion` fige la première photo.
//
// UNE SEULE PHOTO → AUCUNE ANIMATION. Un diaporama à une image est un
// clignotement, pas un diaporama.
// ============================================================================

export function photosDAccueil(site: { hero_image?: string; gallery?: unknown }, max = 4): string[] {
  const g = Array.isArray(site.gallery) ? site.gallery.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
  const vues = new Set<string>()
  const out: string[] = []
  for (const u of [site.hero_image, ...g]) {
    if (!u || vues.has(u)) continue
    vues.add(u); out.push(u)
    if (out.length >= max) break
  }
  return out
}

export default function HeroDiapo({
  photos, className = '', priority = true, sizes = '100vw',
}: { photos: string[]; className?: string; priority?: boolean; sizes?: string }) {
  if (photos.length === 0) return null
  if (photos.length === 1) {
    return <Image src={photos[0]} alt="" fill priority={priority} sizes={sizes} className={className} />
  }
  const n = photos.length
  const duree = n * 6
  const part = 100 / n
  return (
    <>
      <style>{`
        @keyframes heroDiapo {
          0% { opacity: 0 } 4% { opacity: 1 }
          ${(part - 4).toFixed(2)}% { opacity: 1 }
          ${part.toFixed(2)}% { opacity: 0 } 100% { opacity: 0 }
        }
        .heroDiapo > * { animation: heroDiapo ${duree}s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .heroDiapo > * { animation: none; opacity: 0 }
          .heroDiapo > *:first-child { opacity: 1 }
        }
      `}</style>
      <span className="heroDiapo" style={{ position: 'absolute', inset: 0, display: 'block' }}>
        {photos.map((u, i) => (
          <span key={u} style={{ position: 'absolute', inset: 0, display: 'block', animationDelay: `${(i * duree / n).toFixed(2)}s` }}>
            <Image src={u} alt="" fill priority={priority && i === 0} sizes={sizes} className={className} />
          </span>
        ))}
      </span>
    </>
  )
}

/**
 * La même chose pour un thème qui pose son image EN FLUX, pas en `fill`.
 * Vif cadre son accueil dans un carré et emploie `object-contain` : un
 * `next/image` en `fill` y casserait la mise en page.
 */
export function HeroDiapoLibre({
  photos, alt, className = '', style,
}: { photos: string[]; alt: string; className?: string; style?: React.CSSProperties }) {
  if (photos.length === 0) return null
  if (photos.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element -- l'URL vient du site, pas du loader
    return <img src={photos[0]} alt={alt} className={`relative w-full h-full ${className}`} style={style} />
  }
  const n = photos.length
  const duree = n * 6
  const part = 100 / n
  return (
    <span className="relative w-full h-full block">
      <style>{`
        @keyframes heroLibre {
          0% { opacity: 0 } 4% { opacity: 1 }
          ${(part - 4).toFixed(2)}% { opacity: 1 }
          ${part.toFixed(2)}% { opacity: 0 } 100% { opacity: 0 }
        }
        .heroLibre > img { animation: heroLibre ${duree}s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .heroLibre > img { animation: none; opacity: 0 }
          .heroLibre > img:first-child { opacity: 1 }
        }
      `}</style>
      <span className="heroLibre absolute inset-0 block">
        {photos.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- idem
          <img key={u} src={u} alt={i === 0 ? alt : ''} className={`absolute inset-0 w-full h-full ${className}`}
            style={{ ...style, animationDelay: `${(i * duree / n).toFixed(2)}s` }} />
        ))}
      </span>
    </span>
  )
}
