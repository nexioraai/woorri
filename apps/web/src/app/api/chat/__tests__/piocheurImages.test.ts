import { describe, it, expect, vi } from 'vitest';

// route.ts instancie ses clients au chargement du module : mêmes mocks
// minimaux que les autres tests de cette route.
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));
vi.mock('@/lib/generationFailures', () => ({ logGenerationFailure: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: vi.fn() }; } }));

import { PiocheurImages, type PhotoPexels } from '../route';

// ════════════════════════════════════════════════════════════════════
//  « DERIBFY NE FAIT PAS DE BELLES IMAGES » — CE QUI ÉTAIT VRAI.
//
// Plainte d'utilisateurs, et elle était fondée. Le moteur de recherche était
// pourtant bon : une requête PRÉCISE par article écrite par le modèle,
// `orientation=landscape`, la couleur de la marque. Le défaut était dans le
// CHOIX, mesuré dans route.ts le 2026-10-06 :
//
//   · six photos récupérées, LA PREMIÈRE utilisée ;
//   · aucune mémoire entre les articles — ils étaient enrichis en
//     `Promise.all`, donc en parallèle et sans état partagé. Deux requêtes
//     voisines rendent souvent la même photo en tête, et elle sortait DEUX
//     FOIS sur la même page ;
//   · `src.large` (940 px) pour un hero plein écran : visiblement flou.
//
// Le prompt demandait déjà au modèle de ne pas répéter ses requêtes. C'est
// une consigne, pas une garantie — et Pexels n'a pas lu le prompt.
// ════════════════════════════════════════════════════════════════════

const photo = (n: string): PhotoPexels => ({
  standard: `https://img/${n}-940.jpg`,
  pleineLargeur: `https://img/${n}-1880.jpg`,
});

describe('le piocheur ne sert jamais deux fois la même photo', () => {
  it('deux requêtes qui rendent la MÊME tête donnent deux images différentes', () => {
    // Le cas exact qui enlaidissait les pages : « grilled chicken plate » et
    // « roast chicken plate » rendent souvent le même premier résultat.
    const resultat = [photo('a'), photo('b'), photo('c')];
    const p = new PiocheurImages();
    expect(p.choisir(resultat)).toBe(photo('a').standard);
    expect(p.choisir(resultat)).toBe(photo('b').standard);
    expect(p.choisir(resultat)).toBe(photo('c').standard);
  });

  it('une image DÉJÀ fournie est réservée, et ne ressort pas', () => {
    const p = new PiocheurImages();
    p.reserver(photo('a').standard);
    expect(p.choisir([photo('a'), photo('b')])).toBe(photo('b').standard);
  });

  it('quand tout est pris, il rend quand même une image', () => {
    // Une image répétée vaut mieux qu'une case VIDE : c'est le seul cas où la
    // répétition est le moindre mal, et il doit rester explicite.
    const p = new PiocheurImages();
    p.choisir([photo('a')]);
    expect(p.choisir([photo('a')])).toBe(photo('a').standard);
  });

  it('une liste vide rend une chaîne vide, jamais `undefined`', () => {
    // Le gabarit teste `site.hero_image ? …` : un `undefined` traverserait,
    // mais une valeur non-chaîne finirait dans la base.
    expect(new PiocheurImages().choisir([])).toBe('');
  });
});

describe("le hero est servi en PLEINE LARGEUR", () => {
  it('le hero prend la grande taille, les articles la standard', () => {
    // 940 px sur un écran moderne, c'est flou. Pexels publie `large2x`
    // (1880 px) pour exactement ce cas.
    const p = new PiocheurImages();
    expect(p.choisir([photo('a')], true)).toBe(photo('a').pleineLargeur);
    expect(p.choisir([photo('b')])).toBe(photo('b').standard);
  });

  it('la réservation porte sur la photo, quelle que soit la taille servie', () => {
    // Le hero sert `-1880` et réserve `-940` : sinon un article pourrait
    // reprendre la MÊME photo en petite taille, juste sous le hero.
    const p = new PiocheurImages();
    p.choisir([photo('a'), photo('b')], true);
    expect(p.choisir([photo('a'), photo('b')])).toBe(photo('b').standard);
  });
});
