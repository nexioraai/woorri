import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import RevenirEnHaut from '../RevenirEnHaut';

const i18n = readFileSync(join(__dirname, '..', 'i18n.ts'), 'utf-8');
const theme = (f: string) =>
  readFileSync(join(__dirname, '..', f), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

// ============================================================
// LOT 15.6 — REVENIR EN HAUT, SANS JAVASCRIPT.
//
// C'est un LIEN vers le haut de page : le navigateur sait remonter depuis
// toujours. Un bouton qui appellerait `window.scrollTo` ferait la même
// chose en moins bien — et pas du tout si le script échoue.
// ============================================================

describe('c’est un lien, pas un bouton', () => {
  const html = () => renderToStaticMarkup(<RevenirEnHaut libelle="Revenir en haut" />);

  it('🔴 aucun script, aucun gestionnaire', () => {
    const h = html();
    expect(h).not.toMatch(/<script/);
    expect(h).not.toMatch(/onclick/i);
    expect(h).not.toMatch(/scrollTo/);
  });

  it('🔴 un vrai lien, nommé pour le lecteur d’écran', () => {
    const h = html();
    expect(h).toMatch(/<a[^>]*href="#"/);
    expect(h).toContain('aria-label="Revenir en haut"');
  });

  it('🔴 il ne paraît PAS avant qu’on ait défilé', () => {
    // Un bouton « revenir en haut » visible en haut de page ne sert à rien
    // et mange un coin de l'écran.
    expect(html()).toMatch(/\.revenirHaut\s*\{[^}]*opacity:\s*0/);
    expect(html()).toMatch(/pointer-events:\s*none/);
  });

  it('🔴 le défilement doux se coupe si le lecteur le demande', () => {
    // Un saut brutal désoriente autant qu'une animation non voulue.
    expect(html()).toMatch(/prefers-reduced-motion[\s\S]*scroll-behavior:\s*auto/);
  });

  it('🔴 la couleur vient du SITE, jamais d’une valeur en dur dans les thèmes', () => {
    expect(renderToStaticMarkup(
      <RevenirEnHaut libelle="x" couleur="#1F6B4A" />,
    )).toContain('#1F6B4A');
  });
});

describe('il est monté partout, et traduit partout', () => {
  it('🔴 les QUATRE thèmes le servent — pas trois', () => {
    // Le poser sur un thème et pas les autres, c'est GEN-D049 : corriger à
    // la page, donc corriger pour une fois.
    for (const f of ['EditorialTheme.tsx', 'VifTheme.tsx', 'NoirTheme.tsx', 'AuroraTheme.tsx']) {
      expect(theme(f), `${f} ne monte pas le bouton`).toMatch(/<RevenirEnHaut/);
    }
  });

  it('🔴 les quatre langues ont leur libellé', () => {
    // Un bouton non traduit paraîtrait en français sur un site anglophone.
    expect((i18n.match(/^\s*revenirHaut:\s*'/gmu) ?? []).length).toBe(4);
  });

  it('🔴 aucun thème ne replie sur un texte en dur', () => {
    // Un repli masque l'absence le jour où une langue l'oublie — et le
    // type l'impose déjà.
    for (const f of ['EditorialTheme.tsx', 'VifTheme.tsx', 'NoirTheme.tsx', 'AuroraTheme.tsx']) {
      expect(theme(f), `${f} replie sur un texte en dur`)
        .not.toMatch(/revenirHaut\s*\?\?/);
    }
  });
});
