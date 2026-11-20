import type { FamilleForme } from './VisuelProduit'

// ============================================================================
// LES ILLUSTRATIONS PAR FORME (CPA, 2026-11-20).
//
// Le catalogue de MSF (UniCat) montre chaque article par un DESSIN de sa forme
// (plaquette, flacon, poche, seringue) quand il n'y a pas de photo : on
// reconnaît la forme d'un coup d'œil sur une grille de cent produits. Même
// principe ici, en SVG inline (aucun fichier à charger, net à toute taille),
// teinté par la couleur du site. Décoratif : le nom du produit est écrit à
// côté, donc `aria-hidden`.
// ============================================================================

const TRAIT = '#1f2937'

export default function IllustrationForme({ forme, accent, taille }: { forme: FamilleForme; accent: string; taille: number | string }) {
  const doux = `color-mix(in srgb, ${accent} 22%, #ffffff)`
  const moyen = `color-mix(in srgb, ${accent} 55%, #ffffff)`
  const commun = { width: taille, height: taille, viewBox: '0 0 120 120', 'aria-hidden': true, focusable: false } as const

  if (forme === 'comprime') return (
    <svg {...commun}>
      {/* plaquette */}
      <rect x="16" y="50" width="72" height="50" rx="9" fill="#f8fafc" stroke={TRAIT} strokeWidth="3" />
      {[0, 1, 2].map((c) => [0, 1].map((l) => (
        <ellipse key={`${c}${l}`} cx={33 + c * 19} cy={66 + l * 19} rx="7" ry="6.5" fill={doux} stroke={TRAIT} strokeWidth="2.4" />
      )))}
      {/* gélule */}
      <g transform="rotate(-38 80 34)">
        <rect x="58" y="24" width="46" height="20" rx="10" fill="#fde68a" stroke={TRAIT} strokeWidth="3" />
        <path d="M81 24h13a10 10 0 0 1 0 20H81z" fill={moyen} stroke={TRAIT} strokeWidth="3" />
      </g>
      {/* comprimé rond */}
      <circle cx="98" cy="74" r="12" fill="#fca5a5" stroke={TRAIT} strokeWidth="3" />
      <path d="M90 82l16-16" stroke={TRAIT} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )

  if (forme === 'injectable') return (
    <svg {...commun}>
      {/* flacon */}
      <rect x="22" y="22" width="26" height="10" rx="3" fill={moyen} stroke={TRAIT} strokeWidth="3" />
      <path d="M26 32h18v8c6 3 8 7 8 13v42a7 7 0 0 1-7 7H25a7 7 0 0 1-7-7V53c0-6 2-10 8-13z" fill="#f8fafc" stroke={TRAIT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M19 70h32v25a6 6 0 0 1-6 6H25a6 6 0 0 1-6-6z" fill={doux} />
      <rect x="22" y="56" width="26" height="12" rx="2" fill="#fff" stroke={TRAIT} strokeWidth="2.2" />
      {/* seringue */}
      <g transform="rotate(35 82 62)">
        <rect x="74" y="28" width="16" height="52" rx="3" fill="#f8fafc" stroke={TRAIT} strokeWidth="3" />
        <rect x="76.5" y="52" width="11" height="26" rx="1.5" fill={moyen} />
        {[38, 46, 54, 62, 70].map((y) => <path key={y} d={`M74 ${y}h6`} stroke={TRAIT} strokeWidth="2" />)}
        <path d="M82 28V16M74 16h16M82 80v8M82 88v14" stroke={TRAIT} strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )

  if (forme === 'buvable') return (
    <svg {...commun}>
      {/* flacon de sirop */}
      <rect x="30" y="16" width="30" height="13" rx="3" fill={moyen} stroke={TRAIT} strokeWidth="3" />
      <path d="M34 29h22v7c9 4 13 10 13 18v40a8 8 0 0 1-8 8H29a8 8 0 0 1-8-8V54c0-8 4-14 13-18z" fill="#fef3c7" stroke={TRAIT} strokeWidth="3" strokeLinejoin="round" />
      <rect x="27" y="56" width="36" height="26" rx="3" fill="#fff" stroke={TRAIT} strokeWidth="2.4" />
      <path d="M34 65h22M34 73h14" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      {/* cuillère-mesure */}
      <path d="M72 92l26-26" stroke={TRAIT} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="102" cy="62" rx="11" ry="8" transform="rotate(-45 102 62)" fill={doux} stroke={TRAIT} strokeWidth="3" />
    </svg>
  )

  return (
    <svg {...commun}>
      {/* carton de matériel */}
      <path d="M18 44l42-20 42 20-42 20z" fill={doux} stroke={TRAIT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 44v42l42 20V64z" fill="#f8fafc" stroke={TRAIT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M102 44v42l-42 20V64z" fill={moyen} stroke={TRAIT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M39 34l42 20v14" stroke={TRAIT} strokeWidth="3" fill="none" strokeLinejoin="round" />
      {/* croix médicale */}
      <path d="M33 76h12M39 70v12" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
