// ============================================================================
// LOT 15.13 — L'ANIMATION AU SURVOL, À LA RACINE.
//
// ── CE QUI A ÉTÉ DEMANDÉ, ET POURQUOI UNE SEULE FEUILLE.
//
// Propriétaire, 2026-11-09 : « les animations il faut que tu les mettes
// partout dans chaque pages ou sous pages chaque buttons quand on place le
// curseur doit animer — y compris accueil, qui sommes nous, nos activités,
// catalogues, contacts, et leur sous-boutons ».
//
// Retoucher chaque bouton serait cinquante modifications, dont quarante
// divergeraient au premier ajout. Ce fichier pose UNE règle, montée là où
// les pages sont rendues : l'accueil ET les pages déclarées. Un écran neuf
// en hérite sans que personne y pense — c'est la différence entre une règle
// et une habitude.
//
// ── CE QU'ELLE NE FAIT PAS.
//
// Elle n'anime pas « tout ce qui bouge ». Un lien dans un paragraphe ne doit
// pas sauter : il change de couleur et souligne. Ce qui SE SOULÈVE, ce sont
// les surfaces qu'on clique — boutons, tuiles, cartes. Confondre les deux
// donne une page qui frétille, et une page qui frétille se lit moins bien
// qu'une page morte.
//
// ── ET ELLE SE TAIT QUAND ON LE DEMANDE.
//
// `prefers-reduced-motion` coupe les déplacements et les durées. Il ne coupe
// PAS les changements de couleur : sans eux, plus rien n'indiquerait qu'un
// élément est survolable, et le réglage deviendrait une punition.
//
// ── AUCUN JAVASCRIPT.
//
// Même règle que tout ce dossier : le survol est du CSS depuis toujours, et
// un script qui l'imiterait ne marcherait pas sur une connexion lente.
// ============================================================================

export default function SurvolVivant({ primary }: { primary: string }) {
  return (
    <style>{`
      /* ── LA BASE : tout ce qui se clique répond. */
      .vivant a,
      .vivant button,
      .vivant summary,
      .vivant [role="button"] {
        transition: color .2s ease, background-color .2s ease,
                    border-color .2s ease, box-shadow .25s ease,
                    transform .25s cubic-bezier(.22,.8,.3,1), opacity .2s ease;
      }

      /* ── LES SURFACES QU'ON CLIQUE SE SOULÈVENT.
         Une tuile, une carte, un bouton rond : ce sont des objets, et un
         objet qu'on désigne se détache. Repérées par leur forme — un rayon
         d'angle — plutôt que par une classe, pour que les écrans à venir en
         héritent sans rien déclarer. */
      .vivant a[class*="rounded"],
      .vivant button[class*="rounded"],
      .vivant a[style*="border-radius"],
      .vivant button[style*="border-radius"] {
        will-change: transform;
      }
      .vivant a[class*="rounded"]:hover,
      .vivant button[class*="rounded"]:hover,
      .vivant a[style*="border-radius"]:hover,
      .vivant button[style*="border-radius"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 26px -14px color-mix(in srgb, ${primary} 70%, transparent);
      }
      .vivant a[class*="rounded"]:active,
      .vivant button[class*="rounded"]:active {
        transform: translateY(0);
        transition-duration: .08s;
      }

      /* ── LES LIENS DE TEXTE SE SOULIGNENT, ILS NE SAUTENT PAS.
         Le trait pousse depuis la gauche : on voit d'où il vient, donc on
         comprend que c'est le survol qui l'a fait. */
      .vivant p a:not([class*="rounded"]),
      .vivant li a:not([class*="rounded"]) {
        background-image: linear-gradient(currentColor, currentColor);
        background-size: 0% 1px;
        background-position: 0 calc(100% - 1px);
        background-repeat: no-repeat;
        transition: background-size .25s ease, color .2s ease;
      }
      .vivant p a:not([class*="rounded"]):hover,
      .vivant li a:not([class*="rounded"]):hover {
        background-size: 100% 1px;
      }

      /* ── LE DÉPLIANT TOURNE SA FLÈCHE, et le survol l'annonce. */
      .vivant summary { cursor: pointer; }
      .vivant summary:hover { opacity: .82; }
      .vivant details[open] > summary svg { transform: rotate(180deg); }
      .vivant summary svg { transition: transform .25s ease; }

      /* ── LE CLAVIER VOIT LA MÊME CHOSE QUE LA SOURIS.
         Un effet réservé au survol laisse qui tabule sans aucun repère. */
      .vivant a:focus-visible,
      .vivant button:focus-visible,
      .vivant summary:focus-visible {
        outline: 2px solid ${primary};
        outline-offset: 3px;
        border-radius: 4px;
      }

      /* ── ET ON SE TAIT QUAND ON LE DEMANDE.
         Les DÉPLACEMENTS partent ; les couleurs restent, sinon plus rien
         n'indiquerait qu'un élément est survolable. */
      @media (prefers-reduced-motion: reduce) {
        .vivant a, .vivant button, .vivant summary, .vivant [role="button"] {
          transition: color .2s ease, background-color .2s ease, border-color .2s ease;
        }
        .vivant a[class*="rounded"]:hover,
        .vivant button[class*="rounded"]:hover,
        .vivant a[style*="border-radius"]:hover,
        .vivant button[style*="border-radius"]:hover {
          transform: none;
        }
        .vivant p a:not([class*="rounded"]),
        .vivant li a:not([class*="rounded"]) {
          background-size: 100% 1px;
          transition: none;
        }
        .vivant summary svg { transition: none; }
      }
    `}</style>
  )
}
