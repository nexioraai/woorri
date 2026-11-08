import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ============================================================
// UN FOND FIGÉ EXIGE UN TEXTE FIGÉ.
//
// LE DÉFAUT, VU À L'ÉCRAN le 2026-11-08 : le blog de la plateforme servait
// du texte presque noir sur fond presque noir. `background` était figé à
// #0a050e — voulu, c'est l'identité de marque — mais `color` lisait
// `var(--foreground)`, que le segment engendré bascule à #171717 sous
// `prefers-color-scheme: LIGHT`. Un visiteur en mode CLAIR recevait donc
// #171717 sur #0a050e.
//
// LA DIVERGENCE ENTRE LES DEUX EST LE DÉFAUT, pas l'une des deux valeurs.
// Ce cliquet garde l'ACCORD, pas une couleur : un fond qui ne suit pas le
// réglage du visiteur impose un texte qui ne le suit pas non plus.
//
// RIEN N'EMPÊCHAIT de les faire diverger — et c'est exactement ce qui s'est
// produit. Maintenant si.
// ============================================================

const CSS = readFileSync(join(__dirname, '..', '..', '..', '..', 'globals.css'), 'utf-8');

/** La règle `body { … }` seule, sans ses commentaires. */
function regleBody(): string {
  // L'ACCOLADE OUVRANTE EST LE VRAI DÉPART. Ma première version partait du
  // `}` de la règle PRÉCÉDENTE, donc `indexOf('}')` retombait dessus et
  // rendait une chaîne vide : trois faux rouges sur un CSS correct.
  const sans = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = /(?:^|\})\s*body\s*\{/.exec(sans);
  expect(m, 'la règle body doit exister').not.toBeNull();
  const d = (m as RegExpExecArray).index + (m as RegExpExecArray)[0].length;
  return sans.slice(d, sans.indexOf('}', d));
}

describe('le fond et le texte du `body` sont du même registre', () => {
  it('🔴 le fond est une couleur FIGÉE, pas un jeton qui suit le réglage', () => {
    expect(regleBody()).toMatch(/background:\s*#[0-9a-f]{6}/i);
  });

  it('🔴 le texte est FIGÉ lui aussi — jamais `var(--foreground)`', () => {
    // C'est le défaut exact : un fond qui ne bouge pas et un texte qui bouge.
    expect(regleBody()).not.toMatch(/color:\s*var\(--foreground\)/);
    expect(regleBody()).toMatch(/color:\s*#[0-9a-f]{6}/i);
  });

  it('🔴 les deux CONTRASTENT — un fond sombre veut un texte clair', () => {
    const b = regleBody();
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      // Luminance perçue, approchée : suffisant pour trancher clair/sombre.
      return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    };
    const fond = b.match(/background:\s*(#[0-9a-f]{6})/i)?.[1] ?? '#ffffff';
    const texte = b.match(/color:\s*(#[0-9a-f]{6})/i)?.[1] ?? '#ffffff';
    expect(Math.abs(lum(fond) - lum(texte)),
      `fond ${fond} et texte ${texte} sont du même registre — illisible`).toBeGreaterThan(0.4);
  });

  it('le segment ENGENDRÉ n’a pas été touché pour autant', () => {
    // Il vient de packages/design-tokens/tokens.json et un cliquet CI rougit
    // s'il diverge. La bascule claire/sombre doit RESTER disponible.
    expect(CSS).toMatch(/prefers-color-scheme:\s*dark/);
    expect(CSS).toMatch(/--foreground:\s*#171717/);
    expect(CSS).toMatch(/--foreground:\s*#ededed/);
  });
});
