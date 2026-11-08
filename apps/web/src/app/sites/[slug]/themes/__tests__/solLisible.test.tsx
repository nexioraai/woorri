import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ============================================================
// LOT 3c — UN SITE GÉNÉRÉ N'EST PAS LE TABLEAU DE BORD.
//
// LE DÉFAUT, VU À L'ÉCRAN : /appels-offres servait du texte presque noir sur
// fond presque noir. La racine n'était PAS la page : `globals.css` bascule
// `--background` en `#0a0a0a` sous `prefers-color-scheme: dark`, et il
// n'existait AUCUN layout pour `sites/[slug]` — donc chaque page devait
// peindre son fond, et deux sur huit le faisaient.
//
// CE CLIQUET GARDE LA RACINE, PAS LES PAGES. Il vérifie qu'un layout existe
// et qu'il pose un sol explicite. Corriger page par page, c'est corriger
// pour une fois : la neuvième page oubliera.
// ============================================================

const SEGMENT = join(__dirname, '..', '..');
const LAYOUT = join(SEGMENT, 'layout.tsx');

/**
 * Le layout PRIVÉ DE SES COMMENTAIRES.
 *
 * La première version lisait le fichier brut. Mon propre commentaire y cite
 * `colorScheme: 'light'` pour expliquer pourquoi il est là — donc retirer la
 * ligne de CODE laissait le test vert. Un cliquet qui confond « le mot est
 * écrit » et « le mot est employé » mesure la prose, pas le code. C'est la
 * deuxième fois sur ce chantier : même défaut sur `dangerouslySetInnerHTML`.
 */
const codeDuLayout = () =>
  readFileSync(LAYOUT, 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('le segment des sites générés pose son propre sol', () => {
  it('🔴 un layout existe à la racine de `sites/[slug]`', () => {
    expect(() => statSync(LAYOUT)).not.toThrow();
  });

  it('🔴 il peint un fond ET une couleur de texte, explicitement', () => {
    const src = codeDuLayout();
    expect(src).toMatch(/background:\s*'#ffffff'/);
    expect(src).toMatch(/color:\s*'#111111'/);
  });

  it('🔴 il fixe `colorScheme` — sinon les champs restent sombres', () => {
    // Le fond corrigé ne suffit pas : sans `color-scheme`, le navigateur
    // rend ses propres contrôles en sombre, et la saisie reste illisible
    // sur fond blanc.
    expect(codeDuLayout()).toMatch(/colorScheme:\s*'light'/);
  });

  it("🔴 `globals.css` n'est PAS modifié pour corriger ça", () => {
    // Son segment est ENGENDRÉ depuis packages/design-tokens/tokens.json, et
    // un cliquet CI rougit s'il diverge. On corrige au bon endroit, pas au
    // plus commode : la bascule sombre doit RESTER pour le tableau de bord.
    const css = readFileSync(join(__dirname, '..', '..', '..', '..', 'globals.css'), 'utf-8');
    expect(css).toMatch(/prefers-color-scheme:\s*dark/);
    expect(css).toMatch(/--background:\s*#0a0a0a/);
  });

  it('🔴 toutes les pages du segment sont couvertes par ce layout', () => {
    // Le dénominateur est RÉEL : on énumère les pages, on ne les suppose pas.
    const pages: string[] = [];
    (function walk(d: string) {
      for (const e of readdirSync(d)) {
        const f = join(d, e);
        if (statSync(f).isDirectory()) { if (e !== '__tests__') walk(f); }
        else if (e === 'page.tsx') pages.push(f.slice(SEGMENT.length + 1));
      }
    })(SEGMENT);
    expect(pages.length).toBeGreaterThanOrEqual(8);
    // Aucune page ne doit AVOIR BESOIN de peindre son fond : le layout le
    // fait. On ne l'interdit pas — un thème sombre peint par-dessus — mais
    // on exige que le layout existe au-dessus d'elles toutes.
    expect(() => statSync(LAYOUT)).not.toThrow();
  });
});
