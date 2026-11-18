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

/**
 * LA MISE À L'ÉCHELLE DU CADRE ENTIER — EP-317 LEVÉ PAR LA MESURE (2026-11-18).
 *
 * L'invariant interdisait toute mise à l'échelle : « l'application lirait
 * `window.innerWidth` du conteneur et choisirait la mauvaise mise en page ».
 * Mesuré dans Chromium et WebKit, sur la vraie page de pharma, dans un cadre de
 * 1 280 px réduit à 70 % (`docs/elite-protocol/evidence/ep317-echelle/`) :
 * l'application lit TOUJOURS 1 280 px, garde sa mise en page « bureau », et le
 * cadre n'occupe que 896 px à l'écran. C'est la LARGEUR DU CADRE qui reste
 * réelle, et c'est elle que l'application lit. On réduit, et on le dit.
 *
 * Le cadre ne MESURE rien lui-même — il n'a ni état ni import (EP-317 ⑥) :
 * `useEchelleApercu` mesure la place, la page lui passe l'échelle.
 */
export function CadreApercu({
  titre,
  srcDoc,
  etat,
  largeur,
  echelle = 1,
  hauteur = null,
  mesurer,
}: {
  titre: string;
  /** La largeur réelle du cadre, choisie dans la barre (`ChoixAppareil`). */
  largeur: number;
  /** Le document assemblé. Vide = rien à montrer encore. */
  srcDoc: string;
  /** Ce qui s'affiche à la place quand il n'y a pas (encore) de document. */
  etat?: string;
  /** La réduction à appliquer au cadre entier (1 = taille réelle). Mesurée par la page. */
  echelle?: number;
  /** La hauteur disponible, mesurée — `null` tant qu'elle n'est pas connue. */
  hauteur?: number | null;
  /** Reçoit la zone à mesurer (`useEchelleApercu`). */
  mesurer?: (el: HTMLDivElement | null) => void;
}) {
  const reduit = echelle < 1 && hauteur !== null && hauteur !== undefined;
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* LE CADRE PREND LA HAUTEUR QUI RESTE : `min-h-0 flex-1`. Sans
          `min-h-0`, un enfant flex refuse de rétrécir sous sa taille de
          contenu et DÉBORDE la fenêtre — l'application serait coupée en bas,
          exactement le défaut qu'on corrige. */}
      {/* Sous 1024 px, aucune marge ni bordure : un téléphone de 390 px
          affiche un aperçu de 390 px sans défilement horizontal. */}
      <div ref={mesurer} className="relative min-h-0 flex-1 overflow-auto bg-black/30 lg:rounded-2xl lg:border lg:border-white/[0.07] lg:p-3">
        {/* La piste fait au moins la largeur du conteneur et centre ce
            qu'elle porte. Quand l'appareil est plus large que la place, le
            cadre ENTIER est réduit — sa largeur réelle ne change pas. */}
        <div className="flex h-full w-fit min-w-full justify-center">
          {srcDoc === '' ? (
            <div
              className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 px-8 text-center text-sm text-slate-400"
              style={{ width: `${String(largeur * echelle)}px` }}
            >
              {etat ?? 'Chargement de l’aperçu…'}
            </div>
          ) : reduit ? (
            <div className="shrink-0 overflow-hidden" style={{ width: `${String(largeur * echelle)}px` }}>
              <iframe
                title={titre}
                srcDoc={srcDoc}
                // SANS `allow-same-origin` : l'application tourne en origine
                // opaque et ne peut pas lire la session deribfy.com de la
                // personne. `allow-modals` (⑪) : sans lui, `confirm()` rend
                // `false` sans rien afficher — « Retirer » ne marchait pas
                // non plus dans l'aperçu.
                sandbox="allow-scripts allow-modals"
                style={{
                  width: `${String(largeur)}px`,
                  height: `${String((hauteur ?? 0) / echelle)}px`,
                  transform: `scale(${String(echelle)})`,
                  transformOrigin: '0 0',
                }}
                className="shrink-0 rounded-xl border border-white/10 bg-white shadow-2xl shadow-black/40"
              />
            </div>
          ) : (
            <iframe
              title={titre}
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-modals"
              style={{ width: `${String(largeur)}px` }}
              className="h-full shrink-0 rounded-xl border border-white/10 bg-white shadow-2xl shadow-black/40"
            />
          )}
        </div>
        {reduit && (
          <div className="pointer-events-none absolute bottom-3 right-4 rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white/70">
            {`Largeur réelle ${String(largeur)} px · affichée à ${String(Math.round(echelle * 100))} %`}
          </div>
        )}
      </div>
    </section>
  );
}
