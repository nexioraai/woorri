import { pictogrammeDe, type NomDePictogramme } from './pictogrammeMenu'

// ============================================================================
// LOT 15.7 — LES PICTOGRAMMES DU MENU SONT DES DESSINS.
//
// ── POURQUOI PAS DES CARACTÈRES.
//
// Le lot 15.1 posait des signes typographiques : ▣ ◈ ▤ ◆ ◉ ✆. Mesuré le
// 2026-11-09 sur `cpa-tchad.deribfy.app`, rendu Safari : les quatre premiers
// s'affichent en carrés gris — la police de la vitrine n'a pas de glyphe
// dessiné pour eux, elle sert sa forme la plus pauvre. Un pictogramme
// confié à la police du lecteur n'est pas un pictogramme : c'est un pari.
//
// Un tracé SVG est le MÊME partout, parce qu'il ne dépend d'aucune police.
//
// ── ET TOUJOURS RIEN À TÉLÉCHARGER.
//
// La raison qui avait fait choisir des caractères reste servie : le tracé est
// EN LIGNE dans la page. Aucune requête, aucune image manquante sur une
// connexion lente, rien qui arrive après le texte.
//
// ── LA CORRESPONDANCE RESTE FERMÉE, ET LE DESSIN AUSSI.
//
// `pictogrammeMenu.ts` nomme ; ce fichier dessine. Un nom sans dessin ne
// rendrait rien et personne ne le verrait : le cliquet énumère les deux
// listes et exige qu'elles coïncident.
// ============================================================================

/**
 * Les tracés, un par nom. 24×24, en traits — jamais en aplats : un aplat
 * noir dans une barre de menu pèse visuellement autant qu'un mot.
 */
const DESSINS: Record<NomDePictogramme, React.ReactNode> = {
  // L'ACCUEIL — une maison. Le seul pictogramme que tout le monde lit sans
  // l'avoir appris.
  maison: (
    <>
      <path d="M3 10.6 12 3.2l9 7.4" />
      <path d="M5.6 9.4V20.2h12.8V9.4" />
      <path d="M9.9 20.2v-5.1h4.2v5.1" />
    </>
  ),

  // QUI NOUS SOMMES — un immeuble. L'institution, pas la personne.
  immeuble: (
    <>
      <path d="M4.2 20.6V5.4a1.4 1.4 0 0 1 1.4-1.4h7a1.4 1.4 0 0 1 1.4 1.4v15.2" />
      <path d="M14 10.2h4.4a1.4 1.4 0 0 1 1.4 1.4v9" />
      <path d="M7.1 7.8h3.8M7.1 11.4h3.8M7.1 15h3.8" />
      <path d="M16.6 14h1.1M16.6 17.2h1.1" />
      <path d="M2.6 20.6h18.8" />
    </>
  ),

  // CE QU'ELLE FAIT — la courbe d'activité. Un engrenage aurait dit
  // « réglages » ; ici il s'agit de ce qui est EN COURS.
  activite: <path d="M2.8 12h4.1l2.6-7.2 4.3 14.4 2.6-7.2h4.8" />,

  // CE QU'ELLE FOURNIT — un carton. Pour une centrale d'achat, le produit
  // arrive en colis avant d'arriver en rayon.
  colis: (
    <>
      <path d="M20.8 8.4 12 3.4 3.2 8.4v7.2l8.8 5 8.8-5z" />
      <path d="M3.2 8.4 12 13.4l8.8-5" />
      <path d="M12 13.4v7.2" />
      <path d="M7.6 5.9l8.8 5" />
    </>
  ),

  // SES FOURNISSEURS — un camion. Le fournisseur est celui qui livre.
  camion: (
    <>
      <path d="M2.8 7h10.4v9.4H2.8z" />
      <path d="M13.2 10.6h3.4l2.9 3v2.8h-6.3z" />
      <circle cx="6.9" cy="18.2" r="1.8" />
      <circle cx="16.6" cy="18.2" r="1.8" />
      <path d="M8.7 18.2h6" />
    </>
  ),

  // SES MARCHÉS — un document. L'avis d'appel d'offres EST une pièce écrite.
  document: (
    <>
      <path d="M13.9 3.2H7.6A1.5 1.5 0 0 0 6.1 4.7v14.6a1.5 1.5 0 0 0 1.5 1.5h8.8a1.5 1.5 0 0 0 1.5-1.5V7.1z" />
      <path d="M13.9 3.2v3.9h4" />
      <path d="M9 11.8h6M9 15.1h6M9 8.6h2.2" />
    </>
  ),

  // CE QU'ELLE PUBLIE — un journal. Daté, plié, lu puis jeté : c'est
  // exactement le statut d'une actualité.
  journal: (
    <>
      <path d="M4 5.9h12.4v13.1H5.5A1.5 1.5 0 0 1 4 17.5z" />
      <path d="M16.4 9.1h3.6v8.4a1.5 1.5 0 0 1-1.5 1.5h-2.1" />
      <path d="M6.9 9.3h6.6M6.9 12.6h6.6M6.9 15.8h4.1" />
    </>
  ),

  // SES RESSOURCES — un dossier. Ce qu'on ouvre pour y prendre une pièce.
  dossier: (
    <path d="M3.4 7.4A1.5 1.5 0 0 1 4.9 5.9h3.9l1.7 2.3h8.6a1.5 1.5 0 0 1 1.5 1.5v8.4a1.5 1.5 0 0 1-1.5 1.5H4.9a1.5 1.5 0 0 1-1.5-1.5z" />
  ),

  // COMMENT LA JOINDRE — un combiné. Pas une enveloppe : la page de contact
  // porte d'abord un numéro, et au Tchad on appelle avant d'écrire.
  telephone: (
    <path d="M6.6 3.5h3l1.5 3.9-2 1.5a12.4 12.4 0 0 0 6 6l1.5-2 3.9 1.5v3a1.5 1.5 0 0 1-1.6 1.5C10.4 18.3 5.7 13.6 5.1 5.1A1.5 1.5 0 0 1 6.6 3.5z" />
  ),

  // LES PAGES DE PIED — un écusson. L'engagement tenu, pas la contrainte.
  ecusson: (
    <>
      <path d="M12 3.3 19 6.1v5.4c0 4.3-2.9 7.8-7 9.2-4.1-1.4-7-4.9-7-9.2V6.1z" />
      <path d="M9.2 11.9l2 2 3.6-3.9" />
    </>
  ),

  // LE PLAN DU SITE — l'arborescence elle-même.
  plan: (
    <>
      <path d="M9.6 3.4h4.8v3.9H9.6zM3.1 16.7h4.8v3.9H3.1zM16.1 16.7h4.8v3.9h-4.8z" />
      <path d="M12 7.3v3.3M5.5 16.7v-3.3h13v3.3M12 10.6v2.8" />
    </>
  ),
}

/** Les noms qui ont un tracé. Exportée pour que le cliquet énumère. */
export const NOMS_DESSINES = Object.keys(DESSINS) as NomDePictogramme[]

/**
 * Le pictogramme d'une entrée de menu, ou RIEN.
 *
 * `aria-hidden` : le libellé dit déjà la rubrique. Un lecteur d'écran qui
 * annoncerait « image Nos activités » ajouterait du bruit, pas du sens.
 *
 * `currentColor` par défaut — la barre sombre d'un thème noir reprendrait un
 * bleu de marque en invisible. Le thème qui SAIT son fond clair passe la
 * couleur du site ; les autres ne passent rien.
 */
export default function DessinDeMenu({
  chemin,
  couleur,
  taille = 17,
}: {
  chemin: string
  couleur?: string | null
  taille?: number
}) {
  const nom = pictogrammeDe(chemin)
  if (!nom) return null

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke={couleur || 'currentColor'}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      // `flex-shrink: 0` : dans une barre serrée, un dessin qui rétrécit
      // devient une tache. Il garde sa taille, c'est le texte qui décide.
      style={{ flexShrink: 0, opacity: couleur ? 0.95 : 0.6, display: 'block' }}
    >
      {DESSINS[nom]}
    </svg>
  )
}
