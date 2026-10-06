import Image from 'next/image'

// ════════════════════════════════════════════════════════════════════
//  UNE PHOTO DE MARCHAND DANS UN CADRE QUI N'EST PAS LE SIEN.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT, DÉCRIT PAR LES MARCHANDS EUX-MÊMES.
//
// Ils photographient au téléphone — donc en PORTRAIT, souvent petit — et
// envoient tel quel. Le cadre de la vitrine, lui, est carré ou paysage.
// Résultat chez le visiteur : la photo au milieu, et DEUX BANDES VIDES de
// part et d'autre. La boutique a l'air inachevée.
//
// ── POURQUOI ON NE PASSE PAS EN `object-cover`.
//
// Ce serait la correction évidente, et elle serait pire. `cover` remplit le
// cadre en RECOGNANT : une chaussure photographiée en pied sort coupée en
// deux, un vêtement perd ses manches. Pour une photo de PRODUIT, montrer
// l'objet entier n'est pas négociable — c'est ce que le visiteur achète.
//
// Les bandes ne sont donc pas un défaut de cadrage : c'est une place vide
// qu'il faut REMPLIR.
//
// ── LA SOLUTION, ET POURQUOI ELLE EST GRATUITE.
//
// La MÊME photo est posée deux fois : une copie agrandie et floutée qui
// remplit le cadre derrière, puis la photo entière par-dessus. Les bandes
// deviennent un fond doux tiré de la photo elle-même — la teinte s'accorde
// toujours, puisqu'elle en vient.
//
// C'est ce que font Shopify, Amazon et Instagram devant le même problème.
//
// Et c'est GRATUIT à deux titres : le navigateur ne télécharge l'image
// qu'UNE fois (même URL, même cache), et surtout **les photos déjà en ligne
// sont corrigées sans que personne ne ré-envoie quoi que ce soit**.
//
// ── LE CAS OÙ LE FOND NE SERT À RIEN.
//
// Une photo déjà au format du cadre le remplit entièrement : le fond est
// alors invisible, et son coût est nul. Inutile de le conditionner — on ne
// connaît pas les proportions avant le chargement, et les deviner côté
// serveur demanderait de lire chaque fichier.

export interface PhotoProduitProps {
  readonly src: string
  readonly alt: string
  /** Tailles candidates, pour que le navigateur choisisse la bonne variante. */
  readonly sizes?: string
  /** Classes de l'image de premier plan (animations de survol, etc.). */
  readonly className?: string
  /** `priority` pour la première image visible — jamais pour une grille. */
  readonly priority?: boolean
}

export function PhotoProduit({
  src,
  alt,
  sizes = '(max-width: 640px) 100vw, 33vw',
  className = '',
  priority = false,
}: PhotoProduitProps) {
  return (
    <>
      {/*
        LE FOND. `aria-hidden` et `alt=""` : c'est une texture, pas une
        information — un lecteur d'écran annoncerait deux fois la même photo.

        `scale-110` AVANT le flou : un flou gaussien éclaircit les bords d'une
        image, et sans cet agrandissement on verrait un liseré pâle tout
        autour du cadre. L'agrandissement pousse ce liseré hors champ.
      */}
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        sizes="400px"
        className="object-cover scale-110 blur-2xl opacity-60 select-none pointer-events-none"
        // Le fond n'est JAMAIS prioritaire : il ne doit pas retarder la photo
        // que le visiteur vient voir.
        priority={false}
      />
      {/*
        LA PHOTO. `object-contain` : l'objet reste ENTIER. C'était déjà le
        choix du thème, et il était le bon — il manquait seulement de quoi
        occuper la place qu'il laisse.
      */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-contain ${className}`}
      />
    </>
  )
}
