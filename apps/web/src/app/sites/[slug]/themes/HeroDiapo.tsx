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

  // ── LES FLECHES SONT RELATIVES, DONC IL EN FAUT UNE PAIRE PAR ETAT.
  //
  // Un `label` vise une cible FIXE. Ma premiere version faisait pointer
  // « suivante » sur la photo 2, toujours : un clic la cochait, un second ne
  // changeait rien -- elle l'etait deja. Le proprietaire l'a vu tout de
  // suite : « je clique mais rien ne se passe ».
  //
  // On rend donc n+1 paires -- une par photo cochee, plus celle d'avant tout
  // clic -- et `:has()` n'affiche que la bonne. Chacune vise i-1 et i+1, en
  // boucle.
  const paires = [
    { etat: null as number | null, prec: n - 1, suiv: 1 },
    ...photos.map((_, i) => ({ etat: i, prec: (i - 1 + n) % n, suiv: (i + 1) % n })),
  ]

  const styleFleche = (cote: 'debut' | 'fin') => ({
    position: 'absolute' as const,
    ...(cote === 'debut' ? { insetInlineStart: 14 } : { insetInlineEnd: 14 }),
    top: '50%', transform: 'translateY(-50%)',
    width: 44, height: 44, borderRadius: 999, cursor: 'pointer', zIndex: 3,
    background: 'rgba(255,255,255,.92)', color: '#111',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 21, lineHeight: 1, userSelect: 'none' as const,
    boxShadow: '0 4px 14px -6px rgba(0,0,0,.5)',
  })

  return (
    <>
      <style>{`
        @keyframes heroDiapo {
          0% { opacity: 0 } 4% { opacity: 1 }
          ${(part - 4).toFixed(2)}% { opacity: 1 }
          ${part.toFixed(2)}% { opacity: 0 } 100% { opacity: 0 }
        }
        .heroDiapo > .vue { animation: heroDiapo ${duree}s linear infinite; }

        /* ── LES POINTS SUIVENT L'ENCHAINEMENT.
           Chaque point porte la MEME animation et le MEME decalage que sa
           photo : il s'allume exactement quand elle parait. Sans ca, aucun
           point n'etait allume tant qu'on n'avait rien clique, et le lecteur
           ne savait pas ou il en etait. */
        @keyframes heroPoint {
          0% { opacity: .45; width: 9px } 4% { opacity: 1; width: 26px }
          ${(part - 4).toFixed(2)}% { opacity: 1; width: 26px }
          ${part.toFixed(2)}% { opacity: .45; width: 9px } 100% { opacity: .45; width: 9px }
        }
        .heroPoints > label { animation: heroPoint ${duree}s linear infinite; }

        /* DES QU'UNE COMMANDE EST TOUCHEE, tout s'arrete et c'est le choix
           qui decide -- photo comme point. */
        .heroCadre:has(input:checked) .heroDiapo > .vue,
        .heroCadre:has(input:checked) .heroPoints > label { animation: none }
        .heroCadre:has(input:checked) .heroDiapo > .vue { opacity: 0 }
        .heroCadre:has(input:checked) .heroPoints > label { opacity: .45; width: 9px }
${photos.map((_, i) => `        .heroCadre:has(#hp${i}:checked) .heroDiapo > .vue:nth-of-type(${i + 1}) { opacity: 1 }
        .heroCadre:has(#hp${i}:checked) .heroPoints > label:nth-of-type(${i + 1}) { opacity: 1; width: 26px }`).join('\n')}

        /* ── LES FLECHES : une seule paire visible a la fois. */
        .heroPaire { display: none }
        .heroCadre:not(:has(input:checked)) .heroPaire[data-etat="initial"] { display: contents }
${photos.map((_, i) => `        .heroCadre:has(#hp${i}:checked) .heroPaire[data-etat="${i}"] { display: contents }`).join('\n')}

        /* Elles PARAISSENT au survol de l'image, et restent visibles au
           doigt : sur telephone il n'y a pas de survol. */
        .heroFleche { opacity: 0; transition: opacity .2s ease }
        .heroCadre:hover .heroFleche, .heroCadre:focus-within .heroFleche { opacity: 1 }
        @media (hover: none) { .heroFleche { opacity: .9 } }

        @media (prefers-reduced-motion: reduce) {
          .heroDiapo > .vue, .heroPoints > label { animation: none }
          .heroDiapo > .vue { opacity: 0 }
          .heroDiapo > .vue:first-of-type { opacity: 1 }
          .heroPoints > label { opacity: .45; width: 9px }
          .heroPoints > label:first-of-type { opacity: 1; width: 26px }
        }
      `}</style>

      <span className="heroCadre" style={{ position: 'absolute', inset: 0, display: 'block' }}>
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

        {paires.map(({ etat, prec, suiv }) => (
          <span key={`pr${etat ?? 'i'}`} className="heroPaire" data-etat={etat === null ? 'initial' : String(etat)}>
            <label htmlFor={`hp${prec}`} className="heroFleche" aria-label={L.precedente} style={styleFleche('debut')}>‹</label>
            <label htmlFor={`hp${suiv}`} className="heroFleche" aria-label={L.suivante} style={styleFleche('fin')}>›</label>
          </span>
        ))}

        <span className="heroPoints" style={{ position: 'absolute', insetInline: 0, bottom: 16,
          display: 'flex', gap: 7, justifyContent: 'center', zIndex: 3 }}>
          {photos.map((_, i) => (
            <label key={`p${i}`} htmlFor={`hp${i}`} aria-label={`${L.aller} ${i + 1}`}
              style={{ width: 9, height: 9, borderRadius: 999, cursor: 'pointer',
                background: '#ffffff', opacity: 0.45,
                animationDelay: `${(i * duree / n).toFixed(2)}s`,
                boxShadow: '0 1px 4px rgba(0,0,0,.5)' }} />
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
