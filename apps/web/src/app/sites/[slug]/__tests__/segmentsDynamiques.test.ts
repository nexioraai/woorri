import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SEGMENT = join(__dirname, '..');

/** Toutes les routes dynamiques `[x]` qui servent une page. */
function routesDynamiques(): string[] {
  const out: string[] = [];
  (function walk(d: string, rel: string) {
    for (const e of readdirSync(d)) {
      const f = join(d, e);
      if (!statSync(f).isDirectory() || e === '__tests__') continue;
      const r = rel ? `${rel}/${e}` : e;
      // `[...rest]` est LE catch-all : c'est lui qui sert les pages
      // déclarées, il ne capture rien à son détriment.
      if (/^\[[^.]/.test(e) && existsSync(join(f, 'page.tsx'))) out.push(r);
      walk(f, r);
    }
  })(SEGMENT, '');
  return out;
}

const code = (r: string) => readFileSync(join(SEGMENT, r, 'page.tsx'), 'utf-8');

// ============================================================
// GEN-D052 — UN SEGMENT DYNAMIQUE PREND TOUTES LES ADRESSES DE SA
// PROFONDEUR, PAS SEULEMENT CELLES QU'IL SERT.
//
// MESURÉ À L'ADRESSE PUBLIQUE le 2026-11-08 : quatre pages PUBLIÉES
// rendaient 404 —
//   /catalogue/categories · /catalogue/commander
//   /appels-offres/calendrier · /appels-offres/comment-repondre
// — parce qu'un segment `[reference]` passe AVANT le catch-all.
//
// Aucun des 5 820 tests ne l'avait vu : chaque lot mesure SON lot, et le
// défaut est dans leur COLLISION. Ce cliquet garde la FORME, pas un cas :
// toute route dynamique future y entre d'elle-même.
// ============================================================

describe('un segment dynamique ne mange pas les pages déclarées', () => {
  const routes = routesDynamiques().filter((r) => !r.includes('[...'));

  it('🔴 le dénominateur est réel — on énumère, on ne suppose pas', () => {
    expect(routes.length).toBeGreaterThanOrEqual(2);
  });

  for (const r of routes) {
    it(`🔴 « ${r} » délègue à la page déclarée avant de refuser`, () => {
      const src = code(r);
      expect(src, `${r} ne cherche aucune page déclarée`).toMatch(/fetchPage\(/);
      expect(src, `${r} ne réemploie pas le rendu des pages déclarées`).toMatch(/PageDeclaree\(/);
    });
  }
});
