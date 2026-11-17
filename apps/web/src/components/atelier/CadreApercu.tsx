'use client';

/**
 * L'APERÇU DE L'ATELIER — il remplit la hauteur, et il ne coupe plus rien.
 *
 * ── LE DÉFAUT, VU SUR LES CAPTURES DU PROPRIÉTAIRE.
 *
 * L'aperçu était greffé sur la page de création : l'application occupait un
 * quart de la fenêtre, flottait dans le fond violet, et était COUPÉE EN BAS.
 * Autour restaient la barre latérale marketing, le titre « Création sur
 * mesure » et le champ de création d'une nouvelle application.
 *
 * On ne peut pas juger une application dans ces conditions, et on ne peut
 * pas demander un changement en la regardant.
 *
 * ── CE QUI CHANGE, ET POURQUOI C'EST STRUCTUREL.
 *
 * La hauteur n'est plus un nombre en dur (`hauteur = 420`) : le cadre prend
 * TOUTE la hauteur disponible de sa colonne. Un nombre en dur coupe
 * forcément quelque part — il ne peut pas savoir dans quelle fenêtre il
 * s'affiche.
 *
 * Et le contenu DÉFILE DANS LE CADRE. Un `iframe` fait défiler son propre
 * document : en lui donnant la hauteur entière, l'application retrouve sa
 * barre de défilement à elle. Rien n'est tronqué, rien n'est mis à
 * l'échelle.
 *
 * ── LA LARGEUR EST RÉELLE, JAMAIS UNE MISE À L'ÉCHELLE.
 *
 * Invariant repris de l'aperçu de création : on règle la LARGEUR DU CADRE,
 * pas un `transform: scale`. Une mise à l'échelle tromperait — l'application
 * lirait `window.innerWidth` du conteneur et choisirait la mauvaise mise en
 * page. Ici, ce qu'elle lit est ce qu'on affiche.
 *
 * ── LA LARGEUR SE CHOISIT DANS LA BARRE DU HAUT (2026-11-17).
 *
 * Les bascules vivaient ici, en petit au-dessus de l'aperçu, et personne
 * ne les voyait. Elles sont montées au centre de la barre de l'atelier
 * (`ChoixAppareil`). Ce cadre ne CHOISIT plus la largeur : il l'APPLIQUE.
 */

export function CadreApercu({
  titre,
  srcDoc,
  etat,
  largeur,
}: {
  titre: string;
  /** La largeur réelle du cadre, choisie dans la barre (`ChoixAppareil`). */
  largeur: number;
  /** Le document assemblé. Vide = rien à montrer encore. */
  srcDoc: string;
  /** Ce qui s'affiche à la place quand il n'y a pas (encore) de document. */
  etat?: string;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* LE CADRE PREND LA HAUTEUR QUI RESTE : `min-h-0 flex-1`. Sans
          `min-h-0`, un enfant flex refuse de rétrécir sous sa taille de
          contenu et DÉBORDE la fenêtre — l'application serait coupée en bas,
          exactement le défaut qu'on corrige. */}
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/[0.07] bg-black/30 p-3">
        {/* La piste fait au moins la largeur du conteneur et centre ce
            qu'elle porte ; quand l'appareil est plus large, elle grandit et
            le défilement horizontal prend le relais sans rogner la gauche. */}
        <div className="flex h-full w-fit min-w-full justify-center">
          {srcDoc === '' ? (
            <div
              className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 px-8 text-center text-sm text-slate-400"
              style={{ width: `${String(largeur)}px` }}
            >
              {etat ?? 'Chargement de l’aperçu…'}
            </div>
          ) : (
            <iframe
              title={titre}
              srcDoc={srcDoc}
              // SANS `allow-same-origin` : l'application tourne en origine
              // opaque et ne peut pas lire la session deribfy.com de la
              // personne. Même garantie que l'aperçu de création.
              sandbox="allow-scripts"
              style={{ width: `${String(largeur)}px` }}
              className="h-full shrink-0 rounded-xl border border-white/10 bg-white shadow-2xl shadow-black/40"
            />
          )}
        </div>
      </div>
    </section>
  );
}
