'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * LA PLACE DISPONIBLE POUR L'APERÇU, MESURÉE — et la réduction qui en découle.
 *
 * Vit HORS de `CadreApercu`, qui ne doit ni choisir ni importer (EP-317 ⑥,
 * barre de l'atelier ①). Rend une référence de rappel à poser sur la zone,
 * l'échelle (≤ 1) qui fait tenir un appareil de `largeur` px, et la hauteur
 * disponible. Suit le redimensionnement de la fenêtre.
 */
export function useEchelleApercu(largeur: number): {
  mesurer: (el: HTMLDivElement | null) => void;
  echelle: number;
  hauteur: number | null;
} {
  const [zone, setZone] = useState<HTMLDivElement | null>(null);
  const [dispo, setDispo] = useState<{ l: number; h: number } | null>(null);
  const mesurer = useCallback((el: HTMLDivElement | null) => setZone(el), []);
  useEffect(() => {
    if (zone === null || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entrees) => {
      const r = entrees[0]?.contentRect;
      if (r !== undefined) setDispo({ l: r.width, h: r.height });
    });
    ro.observe(zone);
    return () => ro.disconnect();
  }, [zone]);
  const echelle = dispo !== null && dispo.l > 0 && largeur > dispo.l ? dispo.l / largeur : 1;
  return { mesurer, echelle, hauteur: dispo?.h ?? null };
}
