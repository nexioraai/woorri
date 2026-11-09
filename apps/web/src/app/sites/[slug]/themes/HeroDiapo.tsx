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
  photos, className = '', priority = true, sizes = '100vw', libelles,
}: {
  photos: string[]
  className?: string
  priority?: boolean
  sizes?: string
  /** Traduits par l'appelant : rien d'ecrit en dur ici. */
  libelles?: { precedente: string; suivante: string; aller: string }
}) {
  if (photos.length === 0) return null
  if (photos.length === 1) {
    return <Image src={photos[0]} alt="" fill priority={priority} sizes={sizes} className={className} />
  }
  const n = photos.length
  const duree = n * 6
  const part = 100 / n
  const L = libelles ?? { precedente: 'Photo precedente', suivante: 'Photo suivante', aller: 'Aller a la photo' }

  return (
    <>
      {/* LOT 15.2 et 15.3 — LES COMMANDES, SANS JAVASCRIPT.
          Des boutons radio caches portent le choix ; `:has()` le lit. La
          page reste entiere sans script, et les commandes fonctionnent au
          clavier comme au doigt.

          L'ENCHAINEMENT S'ARRETE DES QU'ON TOUCHE UNE COMMANDE. Sans ca la
          photo changerait sous le doigt, et choisir ne servirait a rien. */}
      <style>{`
        @keyframes heroDiapo {
          0% { opacity: 0 } 4% { opacity: 1 }
          ${(part - 4).toFixed(2)}% { opacity: 1 }
          ${part.toFixed(2)}% { opacity: 0 } 100% { opacity: 0 }
        }
        .heroDiapo > .vue { animation: heroDiapo ${duree}s linear infinite; }
        .heroCadre:has(input:checked) .heroDiapo > .vue { animation: none; opacity: 0 }
        ${photos.map((_, i) => `.heroCadre:has(#hp${i}:checked) .heroDiapo > .vue:nth-child(${i + 1}) { opacity: 1 }`).join('\n        ')}
        ${photos.map((_, i) => `.heroCadre:has(#hp${i}:checked) .heroPoints label:nth-child(${i + 1}) { opacity: 1; width: 26px }`).join('\n        ')}
        .heroFleche { opacity: 0; transition: opacity .25s ease }
        .heroCadre:hover .heroFleche, .heroCadre:focus-within .heroFleche { opacity: 1 }
        @media (hover: none) { .heroFleche { opacity: .85 } }
        @media (prefers-reduced-motion: reduce) {
          .heroDiapo > .vue { animation: none; opacity: 0 }
          .heroDiapo > .vue:first-child { opacity: 1 }
        }
      `}</style>

      <span className="heroCadre" style={{ position: 'absolute', inset: 0, display: 'block' }}>
        {/* Les radios portent le choix. Ils sont HORS de l'ecran, jamais
            `display:none` : un element masque n'est pas focusable, et le
            clavier perdrait les commandes. */}
        {photos.map((_, i) => (
          <input key={`r${i}`} type="radio" name="heroDiapo" id={`hp${i}`} readOnly
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
        ))}

        <span className="heroDiapo" style={{ position: 'absolute', inset: 0, display: 'block' }}>
          {photos.map((u, i) => (
            <span key={u} className="vue" style={{ position: 'absolute', inset: 0, display: 'block', animationDelay: `${(i * duree / n).toFixed(2)}s` }}>
              <Image src={u} alt="" fill priority={priority && i === 0} sizes={sizes} className={className} />
            </span>
          ))}
        </span>

        {/* 15.2 — LES DEUX FLECHES. Ce sont des `label` : elles cochent un
            radio, donc aucun script. */}
        <label htmlFor={`hp${n - 1}`} className="heroFleche" aria-label={L.precedente}
          style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)',
            width: 42, height: 42, borderRadius: 999, cursor: 'pointer', zIndex: 2,
            background: 'rgba(255,255,255,.88)', color: '#111', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, userSelect: 'none' }}>‹</label>
        <label htmlFor="hp1" className="heroFleche" aria-label={L.suivante}
          style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)',
            width: 42, height: 42, borderRadius: 999, cursor: 'pointer', zIndex: 2,
            background: 'rgba(255,255,255,.88)', color: '#111', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, userSelect: 'none' }}>›</label>

        {/* 15.3 — LES POINTS. Ils disent COMBIEN de photos il y a : sans
            eux, le lecteur ne sait pas si le bandeau a fini de tourner. */}
        <span className="heroPoints" style={{ position: 'absolute', insetInline: 0, bottom: 16,
          display: 'flex', gap: 7, justifyContent: 'center', zIndex: 2 }}>
          {photos.map((_, i) => (
            <label key={`p${i}`} htmlFor={`hp${i}`} aria-label={`${L.aller} ${i + 1}`}
              style={{ width: 9, height: 9, borderRadius: 999, cursor: 'pointer',
                background: '#ffffff', opacity: 0.55,
                transition: 'opacity .25s ease, width .25s ease' }} />
          ))}
        </span>
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
