'use client';

/**
 * LE CHOIX DE L'APPAREIL — au centre de la barre de l'atelier (2026-11-17).
 *
 * ── LE DÉFAUT, DIT PAR LE PROPRIÉTAIRE.
 *
 * Les bascules vivaient en petit au-dessus de l'aperçu, à droite, avec
 * « Bureau — 1280 px » écrit en gris à gauche : personne ne les voyait. La
 * barre du haut avait, elle, une zone vide entre le titre et les boutons.
 * Elles y montent, au centre.
 *
 * ── CE QUI NE CHANGE PAS.
 *
 * Une seule liste d'appareils (`APPAREILS`), la légende de
 * `legendeAppareil`, `aria-pressed` et le groupe nommé « Taille de
 * l'aperçu ». La largeur reste RÉELLE : ce composant ne fait que la choisir,
 * `CadreApercu` l'applique au cadre sans mise à l'échelle.
 */
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { APPAREILS, legendeAppareil, type Appareil } from '@/lib/apps/appareils';

const ICONES: Record<Appareil['cle'], typeof Smartphone> = {
  telephone: Smartphone,
  tablette: Tablet,
  bureau: Monitor,
};

export function ChoixAppareil({
  largeur,
  onChoisir,
}: {
  largeur: number;
  onChoisir: (largeur: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <div
        role="group"
        aria-label="Taille de l’aperçu"
        className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.03] p-0.5"
      >
        {APPAREILS.map((a) => {
          const actif = a.largeur === largeur;
          const Icone = ICONES[a.cle];
          return (
            <button
              key={a.cle}
              type="button"
              aria-pressed={actif}
              title={legendeAppareil(a)}
              onClick={() => { onChoisir(a.largeur); }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA5D1E] ${
                actif
                  ? 'bg-[#FA5D1E]/[0.16] text-[#FA5D1E]'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
              }`}
            >
              <Icone size={15} strokeWidth={1.75} aria-hidden />
              {/* Sous 1024 px, le mot n'est plus affiché : l'icône et le titre
                  restent, et le mot reste lu par un lecteur d'écran. */}
              <span className="sr-only lg:not-sr-only">{a.libelle}</span>
              {/* LA LARGEUR EXACTE, DANS LE BOUTON ACTIF : celle que
                  l'application LIT. Une légende à côté du groupe le
                  décentrait de 50 px (mesuré à 1440 px). */}
              {actif && (
                <span className="hidden tabular-nums text-[10px] opacity-70 xl:inline">{a.largeur} px</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
