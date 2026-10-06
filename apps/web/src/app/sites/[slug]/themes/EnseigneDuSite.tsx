// ============================================================
// L'ENSEIGNE DE LA BOUTIQUE — SON LOGO, OU SON NOM.
//
// ── POURQUOI UN SEUL COMPOSANT POUR QUATRE VITRINES.
//
// Les quatre en-têtes portaient la même ligne, recopiée quatre fois :
// `<Link href="#home">{site.name}</Link>`. Brancher le logo dans chacune
// aurait produit quatre implémentations qui divergent — c'est exactement ce
// qui vient de se passer avec la galerie, où une cinquième vitrine était
// restée en arrière sans que personne le voie.
//
// ── LE NOM NE DISPARAÎT PAS, IL DEVIENT L'ALTERNATIVE TEXTUELLE.
//
// Quand un logo est déposé, on montre le logo SEUL : la plupart des logos
// contiennent déjà le nom, et l'afficher deux fois côte à côte fait amateur.
// Mais le nom reste dans `alt` — donc lu par les lecteurs d'écran, et
// indexé. Une image sans texte alternatif effacerait le nom de la boutique
// des résultats de recherche : ce serait payer l'esthétique avec le
// référencement.
//
// ── `contain`, JAMAIS `cover`, ET UNE HAUTEUR PLAFONNÉE.
//
// Même règle que partout dans ce lot : une image de marque ne se rogne pas.
// La hauteur est contrainte, la largeur suit — un logo large s'étend, un logo
// carré reste carré, et aucun ne déborde de l'en-tête.
// ============================================================
import Link from 'next/link'

export type EnseigneDuSiteProps = {
  /** Le nom écrit de la boutique. Jamais vide en pratique, mais on se garde. */
  nom: string
  /** Le logo déposé par le marchand, s'il en a un. */
  logo?: string | null
  /**
   * Le slug de la boutique, pour servir l'enseigne NORMALISÉE.
   *
   * Sans lui, on affiche le fichier déposé tel quel — et c'est ce qui donnait,
   * mesuré le 2026-10-06 sur deux boutiques en ligne, un timbre-poste
   * illisible d'une photo de devanture, et un rectangle noir dans un en-tête
   * blanc. `/api/internal/site-logo/` serre la marge uniforme et remplace une
   * photo par le monogramme. Facultatif pour ne casser aucun appel existant.
   */
  slug?: string | null
  /** Destination du clic. Les vitrines pointent toutes vers leur ancre d'accueil. */
  href?: string
  /** Hauteur maximale du logo, en pixels — l'en-tête d'Aurora est plus bas. */
  hauteur?: number
  /** Classes appliquées au NOM quand il n'y a pas de logo (typographie du thème). */
  className?: string
  style?: React.CSSProperties
}

export default function EnseigneDuSite({
  nom,
  logo,
  slug,
  href = '#home',
  hauteur = 36,
  className,
  style,
}: EnseigneDuSiteProps) {
  if (logo) {
    // LE LOGO DÉPOSÉ DÉCIDE S'IL Y A UNE ENSEIGNE ; la route décide de ce
    // qu'on en montre. Garder la première condition sur `logo` évite d'appeler
    // la route pour les vingt-quatre boutiques sur vingt-sept qui n'ont aucun
    // logo — pour elles, le nom reste la bonne réponse.
    const source = typeof slug === 'string' && slug !== '' ? `/api/internal/site-logo/${slug}` : logo
    return (
      <Link href={href} className="shrink-0 flex items-center" aria-label={nom}>
        {/* `next/image` exige des dimensions connues ou un parent positionné ;
            ici la largeur dépend du logo et ne peut pas être devinée. Une
            balise simple, avec une hauteur bornée, est le choix juste. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source}
          alt={nom}
          // L'ARRONDI NE COÛTE RIEN ET RATTRAPE UN CAS RÉEL. Un logo à fond
          // transparent n'a pas de boîte : il ne change pas. Un logo à fond
          // plein — doré sur noir, mesuré sur une boutique en ligne — devient
          // un BADGE au lieu d'un rectangle égaré dans un en-tête blanc.
          style={{
            height: hauteur,
            width: 'auto',
            maxWidth: 200,
            objectFit: 'contain',
            borderRadius: 6,
          }}
          // L'enseigne est visible dès le premier écran : la charger
          // paresseusement la ferait apparaître après le reste.
          loading="eager"
          decoding="async"
        />
      </Link>
    )
  }

  return (
    <Link href={href} className={className} style={style}>
      {nom}
    </Link>
  )
}
