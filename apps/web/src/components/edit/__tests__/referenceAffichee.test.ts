import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(__dirname, '..', '..', '..');
const code = (p: string) =>
  readFileSync(join(RACINE, p), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const FORM = code('app/sites/[slug]/ContactForm.tsx');
const I18N = code('app/sites/[slug]/themes/i18n.ts');

// ============================================================
// LOT 8 — UNE TRACE QUE PERSONNE NE PEUT DÉSIGNER N'EST PAS UNE TRACE.
//
// Le formulaire disait « envoyé » et rien d'autre. Le demandeur n'avait RIEN
// à noter, donc rien à citer en rappelant la Centrale — et la Centrale
// n'avait rien à chercher.
// ============================================================

describe('la référence arrive jusqu’à l’écran', () => {
  it('🔴 le formulaire LIT la référence de la réponse', () => {
    expect(FORM).toMatch(/data\.reference/);
    expect(FORM).toMatch(/setReference\(/);
  });

  it('🔴 et il l’AFFICHE', () => {
    expect(FORM).toMatch(/\{reference\}/);
  });

  it('🔴 elle survit au retour à l’état initial', () => {
    // Quatre secondes ne suffisent pas pour recopier un code à la main :
    // le message de succès part, la référence reste.
    expect(FORM).toMatch(/status === 'success' && !reference/);
  });

  it('🔴 elle est sélectionnable d’un geste', () => {
    expect(FORM).toContain('select-all');
  });
});

describe('les quatre langues ont leurs libellés', () => {
  it('🔴 aucune langue ne verrait la référence en français', () => {
    // Le type l'impose déjà à la compilation ; ce point le dit à voix haute
    // et compte les occurrences, parce qu'un `reference:` ajouté à une seule
    // langue compilerait... et les trois autres rougiraient. Ici on exige 4.
    const n = (I18N.match(/^\s*reference:\s*'/gmu) ?? []).length;
    expect(n).toBe(4);
    const a = (I18N.match(/^\s*referenceAide:\s*'/gmu) ?? []).length;
    expect(a).toBe(4);
  });
});
