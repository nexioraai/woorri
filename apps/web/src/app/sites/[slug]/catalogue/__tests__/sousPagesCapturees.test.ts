import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(join(__dirname, '..', '[reference]', 'page.tsx'), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

// ============================================================
// UN SEGMENT DYNAMIQUE CAPTURE LES SOUS-PAGES DÉCLARÉES.
//
// LE DÉFAUT, MESURÉ À L'ADRESSE PUBLIQUE le 2026-11-08 :
//   /catalogue/categories  → 404
//   /catalogue/commander   → 404
// Deux pages PUBLIÉES de la CPA, tombées en ajoutant la route
// /catalogue/<référence> du lot 6. Un segment dynamique passe AVANT le
// catch-all, donc ces chemins n'atteignaient plus la page déclarée.
//
// AUCUN DES 5 816 TESTS NE L'AVAIT VU : ils mesuraient chaque lot isolément,
// jamais la COLLISION entre deux lots. C'est ce que ce cliquet garde.
// ============================================================

describe('la route produit ne mange pas les sous-pages déclarées', () => {
  it('🔴 elle cherche une page déclarée quand aucune référence ne correspond', () => {
    expect(SRC).toMatch(/fetchPage\(/);
    expect(SRC).toMatch(/catalogue\/\$\{ref\}/);
  });

  it('🔴 elle RÉEMPLOIE le rendu de la page déclarée, elle ne le recopie pas', () => {
    // Deux rendus de la même page divergeraient, et c'est celui qu'on ne
    // relit pas qui afficherait faux.
    expect(SRC).toMatch(/PageDeclaree\(/);
    expect(SRC).not.toMatch(/BlocsDePage/);
  });

  it('🔴 ni produit ni page → le MÊME 404 qu’une référence inexistante', () => {
    // Deux refus différents révéleraient qu'une référence existe en
    // préparation.
    // `indexOf('if (!p)')` trouve D'ABORD celui de `generateMetadata`,
    // qui rend `{}` et n'a rien à voir. On part donc de la fonction de
    // RENDU — deuxième fois que ce repère me trompe.
    const depart = SRC.indexOf('export default async function');
    const d = SRC.indexOf('if (!p)', depart);
    const bloc = SRC.slice(d, SRC.indexOf('const base', d));
    expect(bloc).toMatch(/notFound\(\)/);
    expect(bloc).not.toMatch(/4\d\d/);
  });

  it('🔴 le chemin délégué porte bien le préfixe `catalogue`', () => {
    // Déléguer vers `/<ref>` au lieu de `/catalogue/<ref>` afficherait une
    // page d'une autre rubrique sous une adresse du catalogue.
    expect(SRC).toMatch(/rest:\s*\['catalogue',\s*ref\]/);
  });
});
