import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import HeroDiapo, { HeroDiapoLibre, photosDAccueil } from '../HeroDiapo';

// ============================================================
// LOT 5 — L'ACCUEIL À PLUSIEURS PHOTOS.
//
// Aucune colonne neuve : les photos viennent de `hero_image` puis de
// `gallery`, deux champs que l'éditeur sait déjà remplir. Poser une colonne
// pour une donnée qu'on a déjà, c'est créer une deuxième vérité.
// ============================================================

const G = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg'];

describe('quelles photos l’accueil montre', () => {
  it('🔴 la photo d’accueil vient EN PREMIER', () => {
    expect(photosDAccueil({ hero_image: '/hero.jpg', gallery: G })[0]).toBe('/hero.jpg');
  });

  it('🔴 un doublon entre l’accueil et la galerie n’est compté qu’une fois', () => {
    const p = photosDAccueil({ hero_image: '/a.jpg', gallery: G });
    expect(p.filter((u) => u === '/a.jpg')).toHaveLength(1);
  });

  it('🔴 au plus quatre photos — un diaporama de dix est une attente', () => {
    expect(photosDAccueil({ hero_image: '/hero.jpg', gallery: G }).length).toBeLessThanOrEqual(4);
  });

  it('🔴 une galerie absente ou mal formée ne casse rien', () => {
    expect(photosDAccueil({ hero_image: '/h.jpg' })).toEqual(['/h.jpg']);
    expect(photosDAccueil({ hero_image: '/h.jpg', gallery: 'pas un tableau' })).toEqual(['/h.jpg']);
    expect(photosDAccueil({})).toEqual([]);
  });
});

describe('ce que l’accueil rend', () => {
  it('🔴 UNE seule photo → aucune animation', () => {
    const html = renderToStaticMarkup(<HeroDiapo photos={['/a.jpg']} />);
    expect(html).not.toMatch(/@keyframes\s+heroDiapo/);
  });

  it('🔴 DEUX photos ou plus → les photos s’enchaînent', () => {
    const html = renderToStaticMarkup(<HeroDiapo photos={['/a.jpg', '/b.jpg', '/c.jpg']} />);
    expect(html).toMatch(/@keyframes\s+heroDiapo/);
    expect(html).toContain('infinite');
    expect(html).toContain('animation-delay');
  });

  it('🔴 le mouvement réduit fige la première photo', () => {
    const html = renderToStaticMarkup(<HeroDiapo photos={['/a.jpg', '/b.jpg']} />);
    expect(html).toContain('prefers-reduced-motion');
  });

  it('🔴 la variante en flux s’enchaîne aussi, et garde son texte de remplacement', () => {
    const html = renderToStaticMarkup(<HeroDiapoLibre photos={['/a.jpg', '/b.jpg']} alt="La Centrale" />);
    expect(html).toMatch(/@keyframes\s+heroLibre/);
    expect(html).toContain('alt="La Centrale"');
  });

  it('🔴 aucune photo → rien, pas un cadre vide', () => {
    expect(renderToStaticMarkup(<HeroDiapo photos={[]} />)).toBe('');
    expect(renderToStaticMarkup(<HeroDiapoLibre photos={[]} alt="x" />)).toBe('');
  });
});
