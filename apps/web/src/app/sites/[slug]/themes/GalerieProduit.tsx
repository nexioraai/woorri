'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

// ============================================================
// TOUTES LES PHOTOS, EN GLISSANT — PAS UNE SEULE, PAS DES VIGNETTES.
//
// LE DÉFAUT SIGNALÉ PAR LE MARCHAND : « quand j'ajoute beaucoup de photos, les
// visiteurs n'en voient qu'une ». C'était exact, et deux fois :
//   · la projection de la boutique n'émettait que `images[0]` — les autres
//     n'atteignaient jamais la grille ni la modale ;
//   · la fiche les portait toutes, mais derrière des vignettes de 64 px qu'il
//     faut viser au doigt. Sur un téléphone, personne ne les voit.
//
// Un marchand qui prend sept vues de son article les prend pour qu'on les
// REGARDE. Sept photos stockées et jamais vues, c'est du travail payé pour
// rien — et un acheteur qui ne voit pas le dos de l'article n'achète pas.
//
// ── LE GESTE ATTENDU EST LE GLISSEMENT, PAS LE CLIC.
//
// Sur le marché visé, l'achat se fait au téléphone. Le geste naturel y est de
// faire défiler l'image de droite à gauche — celui de toutes les galeries que
// l'acheteur connaît déjà. Les flèches restent pour l'ordinateur, et les
// points disent COMBIEN il en reste : sans eux, on ne sait pas qu'il y en a
// d'autres, donc on ne glisse pas.
//
// `contain` ici aussi : une galerie qui rogne ne montre pas le produit —
// c'est le défaut qu'on a retiré de sept fichiers (M2-227).
// ============================================================

export type GalerieProduitProps = {
  images: readonly string[]
  alt: string
  /** Hauteur du cadre, en pixels. Ignorée si `ratio` est donné. */
  hauteur?: number
  /**
   * Cadre à RATIO plutôt qu'à hauteur fixe (« 1 / 1 », « 4 / 5 »).
   *
   * Préféré partout où la largeur varie — c'est-à-dire sur un téléphone. Une
   * hauteur fixe y donne des bandes énormes sur les petits écrans et une
   * image minuscule sur les grands.
   */
  ratio?: string
  /** Couleur des repères, pour rester dans la marque du site. */
  primary?: string
  /** Fond du cadre — `contain` laisse des bandes, elles ne doivent pas jurer. */
  fond?: string
  arrondi?: number
  /**
   * Rendre par `next/image` plutôt qu'une balise brute.
   *
   * INDISPENSABLE DANS UNE GRILLE : les photos stockées sont les ORIGINAUX
   * (qualité 95, pleine définition). Sans optimiseur, une grille de vingt
   * articles ferait télécharger vingt originaux — sur une 3G, la page ne
   * s'affiche pas. La fiche et la modale n'en ont pas besoin : elles ne
   * montrent qu'un article.
   */
  optimisee?: boolean
  /** Consigne de largeur, quand `optimisee`. */
  sizes?: string
}

/** Distance minimale d'un glissement, en pixels. */
const SEUIL_GLISSEMENT = 40

export default function GalerieProduit({
  images,
  alt,
  hauteur = 480,
  ratio,
  primary = '#FA5D1E',
  fond = 'rgba(128,128,128,0.08)',
  arrondi = 12,
  optimisee = false,
  sizes,
}: GalerieProduitProps) {
  const [index, setIndex] = useState(0)
  const depart = useRef<number | null>(null)
  // ── UN GLISSEMENT N'EST PAS UN CLIC, ET LA CARTE ENTIÈRE EST CLIQUABLE.
  //
  // Dans la grille, la galerie vit à l'intérieur d'une carte qui ouvre le
  // produit. Sans ce drapeau, chaque glissement pour voir la photo suivante
  // ouvrirait la fiche — le visiteur ne verrait jamais la deuxième vue, et
  // croirait l'avoir demandée par erreur.
  const aGlisse = useRef(false)

  const total = images.length
  // Un index qui déborde après un changement de produit afficherait du vide.
  useEffect(() => {
    if (index > total - 1) setIndex(0)
  }, [total, index])

  // Le cadre : ratio s'il est donné, hauteur sinon. JAMAIS rien — une case
  // sans hauteur désaligne toute la grille autour d'elle.
  const cadre: React.CSSProperties = ratio
    ? { width: '100%', aspectRatio: ratio }
    : { width: '100%', height: hauteur }

  if (total === 0) {
    return <div style={{ ...cadre, background: fond, borderRadius: arrondi }} aria-hidden="true" />
  }

  const aller = (n: number) => { setIndex(((n % total) + total) % total) }

  return (
    <div style={{ position: 'relative' }}>
      <div
        // Le glissement est écouté sur le CADRE, pas sur l'image : une image en
        // cours de chargement ne reçoit pas encore les événements, et le geste
        // serait perdu au moment précis où le visiteur attend.
        onTouchStart={(e) => {
          depart.current = e.touches[0]?.clientX ?? null
          aGlisse.current = false
        }}
        onTouchEnd={(e) => {
          const d = depart.current
          depart.current = null
          if (d === null || total < 2) return
          const ecart = (e.changedTouches[0]?.clientX ?? d) - d
          if (Math.abs(ecart) < SEUIL_GLISSEMENT) return
          aGlisse.current = true
          e.stopPropagation()
          aller(index + (ecart < 0 ? 1 : -1))
        }}
        // Le navigateur émet un `click` APRÈS le glissement : on l'avale, sinon
        // la carte s'ouvre quand même. Capture, pour arriver avant la carte.
        onClickCapture={(e) => {
          if (!aGlisse.current) return
          aGlisse.current = false
          e.stopPropagation()
          e.preventDefault()
        }}
        style={{
          ...cadre,
          background: fond,
          borderRadius: arrondi,
          overflow: 'hidden',
          // `next/image fill` exige un parent positionné.
          position: 'relative',
          // Le défilement vertical de la page reste possible ; seul le
          // glissement horizontal nous revient. Sans cela, la page se bloque
          // dès que le doigt passe sur une photo.
          touchAction: 'pan-y',
        }}
      >
        {optimisee ? (
          <Image
            src={images[index]!}
            alt={total > 1 ? `${alt} — vue ${String(index + 1)} sur ${String(total)}` : alt}
            fill
            sizes={sizes ?? '(max-width: 768px) 100vw, 33vw'}
            className="object-contain"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <img
            src={images[index]}
            alt={total > 1 ? `${alt} — vue ${String(index + 1)} sur ${String(total)}` : alt}
            // La première est immédiate, les suivantes attendent d'être utiles :
            // sur une connexion lente, charger sept photos d'un coup retarde
            // celle qu'on regarde.
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}
      </div>

      {total > 1 && (
        <>
          {/* Flèches — pour l'ordinateur, où l'on ne glisse pas. */}
          {([['‹', -1, 'left'], ['›', 1, 'right']] as const).map(([signe, pas, cote]) => (
            <button
              key={cote}
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); aller(index + pas) }}
              aria-label={pas < 0 ? 'Photo précédente' : 'Photo suivante'}
              style={{
                position: 'absolute', top: '50%', [cote]: 8, transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: 999, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.45)',
                color: '#fff', fontSize: 20, lineHeight: 1, padding: 0,
              }}
            >
              {signe}
            </button>
          ))}

          {/* Les points DISENT qu'il y en a d'autres. Sans eux, le visiteur ne
              sait pas qu'il peut glisser — et ne glisse donc jamais. */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); aller(i) }}
                aria-label={`Photo ${String(i + 1)}`}
                aria-current={i === index}
                style={{
                  width: i === index ? 20 : 7, height: 7, borderRadius: 999, padding: 0,
                  border: 'none', cursor: 'pointer', transition: 'width .2s',
                  background: i === index ? primary : 'rgba(128,128,128,0.4)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
