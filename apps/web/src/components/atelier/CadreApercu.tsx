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
 */
import { useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { APPAREILS, appareilDe, legendeAppareil, type Appareil } from '@/lib/apps/appareils';

const ICONES: Record<Appareil['cle'], typeof Smartphone> = {
  telephone: Smartphone,
  tablette: Tablet,
  bureau: Monitor,
};

export function CadreApercu({
  titre,
  srcDoc,
  etat,
}: {
  titre: string;
  /** Le document assemblé. Vide = rien à montrer encore. */
  srcDoc: string;
  /** Ce qui s'affiche à la place quand il n'y a pas (encore) de document. */
  etat?: string;
}) {
  const [largeur, setLargeur] = useState<number>(1280);
  const courant = appareilDe(largeur);
  const IconeCourante = ICONES[courant.cle];

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      {/* ── LES BASCULES SONT EN HAUT À DROITE DE L'APERÇU, DISCRÈTES.
          C'est une bonne idée que la concurrence n'a pas : on la garde, mais
          elle ne doit pas se disputer la place avec l'application. Des
          tuiles d'icônes en grand conviennent à une page d'accueil ; dans la
          barre d'un atelier elles chasseraient le nom de l'application. */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <p className="min-w-0 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
          <IconeCourante size={12} strokeWidth={2} aria-hidden />
          <span className="tabular-nums">{legendeAppareil(courant)}</span>
        </p>
        <div role="group" aria-label="Taille de l’aperçu" className="flex shrink-0 items-center gap-1">
          {APPAREILS.map((a) => {
            const actif = a.largeur === largeur;
            const Icone = ICONES[a.cle];
            return (
              <button
                key={a.cle}
                type="button"
                aria-pressed={actif}
                title={legendeAppareil(a)}
                onClick={() => { setLargeur(a.largeur); }}
                className={`rounded-lg border p-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA5D1E] ${
                  actif
                    ? 'border-[#FA5D1E]/70 bg-[#FA5D1E]/[0.14] text-[#FA5D1E]'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <Icone size={16} strokeWidth={1.75} aria-hidden />
                <span className="sr-only">{a.libelle}</span>
              </button>
            );
          })}
        </div>
      </div>

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
