// ============================================================================
// LOT 15.6 — REVENIR EN HAUT.
//
// SANS JAVASCRIPT. C'est un lien vers `#` ancré en haut de page : le
// navigateur sait remonter tout seul depuis toujours. Un bouton qui appelle
// `window.scrollTo` ferait la même chose en moins bien, et pas du tout si le
// script échoue.
//
// IL NE PARAÎT QUE QUAND IL SERT. `position: sticky` dans un conteneur de
// hauteur nulle le fait apparaître après le premier écran — sans compteur de
// défilement, donc sans script.
//
// LE DÉFILEMENT RESTE DOUX, et il se coupe si le lecteur demande un
// mouvement réduit : un saut brutal désoriente autant qu'une animation.
// ============================================================================

export default function RevenirEnHaut({
  libelle, couleur = '#1e4d8c',
}: { libelle: string; couleur?: string }) {
  return (
    <>
      <style>{`
        html { scroll-behavior: smooth }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }
        .revenirHaut {
          position: fixed; inset-inline-end: 18px; bottom: 18px; z-index: 40;
          width: 44px; height: 44px; border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; text-decoration: none; font-size: 19px; line-height: 1;
          box-shadow: 0 8px 22px -8px rgba(0,0,0,.45);
          opacity: 0; pointer-events: none;
          transition: opacity .25s ease, transform .25s ease;
          transform: translateY(6px);
        }
        /* IL APPARAÎT APRÈS LE PREMIER ÉCRAN. animation-timeline
           le fait sans script là où le navigateur le sait ; ailleurs le lien
           reste simplement caché, et la page ne perd rien. */
        @supports (animation-timeline: scroll()) {
          .revenirHaut {
            animation: revenirParait linear both;
            animation-timeline: scroll();
            animation-range: 300px 700px;
          }
          @keyframes revenirParait {
            to { opacity: .92; pointer-events: auto; transform: none }
          }
        }
        .revenirHaut:hover, .revenirHaut:focus-visible { opacity: 1 }
      `}</style>
      <a href="#" className="revenirHaut" aria-label={libelle} title={libelle}
        style={{ backgroundColor: couleur }}>↑</a>
    </>
  )
}
