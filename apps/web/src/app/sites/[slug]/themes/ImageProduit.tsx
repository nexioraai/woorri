import Image from 'next/image'

// ============================================================
// LA PHOTO D'UN MARCHAND NE SE FAIT JAMAIS ROGNER.
//
// LE DÉFAUT, ET IL EST PARTOUT. L'image principale d'une fiche produit était
// rendue en `objectFit: 'cover'` dans un cadre carré ; les grilles de toutes
// les vitrines aussi. `cover` REMPLIT le cadre et COUPE ce qui dépasse. Sur une
// photo prise au téléphone — donc en 3:4 ou 9:16 — cela ampute le haut et le
// bas de l'article. Un pantalon perd ses jambes, une robe son ourlet.
//
// POURQUOI C'EST GRAVE ICI EN PARTICULIER : les marchands visés
// photographient eux-mêmes, souvent une seule fois, sans retouche. La photo
// coupée est la SEULE que l'acheteur verra. Ce n'est pas un défaut esthétique,
// c'est le produit qu'on n'a pas montré.
//
// CE QUE FAIT CE COMPOSANT :
//   · `object-contain` — l'image entière tient dans le cadre, toujours ;
//   · un cadre à RATIO FIXE — les grilles restent alignées, ce qui était la
//     vraie raison d'être de `cover` ; on garde l'alignement, on abandonne la
//     coupe ;
//   · un FOND NEUTRE derrière — sans lui, `contain` laisse des bandes
//     transparentes qui révèlent le fond du thème et salissent la grille ;
//   · chargement paresseux et `srcset` — le contexte est la 3G tchadienne.
//
// `next/image` produit lui-même les variantes (AVIF, WebP, tailles) : aucune
// dépendance ajoutée, aucun service tiers, et l'encodeur est `sharp` — le même
// que celui de la chaîne d'envoi (`lib/images/traitement.ts`).
// ============================================================

export type RatioImage = 'carre' | 'portrait' | 'libre'

const RATIOS: Record<Exclude<RatioImage, 'libre'>, string> = {
  carre: '1 / 1',
  // 4:5 — le format conseillé au marchand. Une photo verticale y tient sans
  // marges, ce qui fait paraître le produit plus grand à surface d'écran égale.
  portrait: '4 / 5',
}

export type ImageProduitProps = {
  src: string | null | undefined
  alt: string
  /** Cadre. `libre` laisse l'image imposer sa hauteur (fiche produit). */
  ratio?: RatioImage
  /** Fond derrière l'image. DOIT venir du thème — voir `fondNeutre()`. */
  fond?: string
  /** Consigne de largeur pour le navigateur. */
  sizes?: string
  /** Vrai UNIQUEMENT pour l'image visible d'emblée. */
  priorite?: boolean
  className?: string
  /** Aperçu flou en data-URI (`apercuFlou()`), affiché pendant le chargement. */
  apercu?: string
  arrondi?: number
}

/**
 * Fond derrière une image `contain`.
 *
 * Un gris très clair sur thème clair, un gris très sombre sur thème sombre :
 * l'objectif est que les bandes ne se REMARQUENT pas. Un fond blanc pur sur un
 * thème sombre dessinerait un cadre lumineux autour de chaque produit.
 */
export function fondNeutre(themeSombre: boolean): string {
  return themeSombre ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
}

export default function ImageProduit({
  src,
  alt,
  ratio = 'carre',
  fond,
  sizes = '(max-width: 768px) 50vw, 33vw',
  priorite = false,
  className = '',
  apercu,
  arrondi = 12,
}: ImageProduitProps) {
  const cadre: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    background: fond ?? fondNeutre(false),
    borderRadius: arrondi,
    overflow: 'hidden',
    ...(ratio === 'libre' ? {} : { aspectRatio: RATIOS[ratio] }),
  }

  // Produit sans photo : un cadre VIDE au bon ratio, jamais rien du tout. Une
  // grille dont une case n'a pas de hauteur se désaligne entièrement, et le
  // marchand croit sa boutique cassée.
  if (!src) return <div style={cadre} aria-hidden="true" />

  return (
    <div style={cadre}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        // `priority` sur une image hors écran est une régression de
        // performance : elle prend la bande passante du contenu visible.
        priority={priorite}
        loading={priorite ? undefined : 'lazy'}
        placeholder={apercu ? 'blur' : 'empty'}
        blurDataURL={apercu}
        // LE CŒUR DE LA CORRECTION.
        className={`object-contain ${className}`}
        style={{ objectFit: 'contain' }}
      />
    </div>
  )
}
