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

// ============================================================
// LOT 15.2 et 15.3 — LES COMMANDES DU DIAPORAMA.
//
// Il tournait tout seul depuis le 8 novembre, mais on ne pouvait ni
// l'avancer ni savoir où on en était. Les commandes sont en CSS : des
// radios cachés que `:has()` lit. Aucun script.
// ============================================================

describe('on peut avancer à la main, sans JavaScript', () => {
  const html = () => renderToStaticMarkup(<HeroDiapo photos={['/a.jpg', '/b.jpg', '/c.jpg']} />);

  it('🔴 deux flèches, nommées pour le lecteur d’écran', () => {
    expect(html()).toContain('aria-label="Photo precedente"');
    expect(html()).toContain('aria-label="Photo suivante"');
  });

  it('🔴 un point par photo — le lecteur sait combien il y en a', () => {
    const n = (html().match(/aria-label="Aller a la photo \d"/gu) ?? []).length;
    expect(n).toBe(3);
  });

  it('🔴 les commandes sont des LABELS sur des radios — aucun script', () => {
    const h = html();
    expect(h).toMatch(/type="radio"/);
    expect(h).toMatch(/<label/);
    expect(h).not.toMatch(/onclick/i);
    expect(h).not.toMatch(/<script/);
  });

  it('🔴 l’enchaînement S’ARRÊTE dès qu’une commande est touchée', () => {
    // Sans ça la photo changerait sous le doigt, et choisir ne servirait
    // à rien.
    expect(html()).toMatch(/:has\(input:checked\)[^}]*animation:\s*none/);
  });

  it('🔴 les radios restent FOCUSABLES — jamais `display:none`', () => {
    // Un élément masqué n'est pas focusable, et le clavier perdrait les
    // commandes.
    const h = html();
    expect(h).not.toMatch(/type="radio"[^>]*display:none/);
    expect(h).toMatch(/type="radio"[^>]*opacity:0/);
  });

  it('🔴 UNE seule photo n’a ni flèches ni points', () => {
    const h = renderToStaticMarkup(<HeroDiapo photos={['/a.jpg']} />);
    expect(h).not.toContain('aria-label="Photo suivante"');
    expect(h).not.toMatch(/type="radio"/);
  });
});
