// M2-203 — LE CATALOGUE DE DÉPART DU MODE 2 EST RÉEL, PAS FANTÔME.
//
// MESURÉ SUR UNE BOUTIQUE GÉNÉRÉE (« Élégance Tchadienne », N'Djamena) :
// 6 cartes éditoriales, ZÉRO produit réel — la table `shop_products` était
// vide et le marchand repartait de zéro. Deux causes dans ce fichier :
// la règle disait « products: EMPTY array », et `enforceModeProducts`
// jetait ce qui aurait pu être semé.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// route.ts instancie ses clients au chargement — mocks minimaux, même patron
// que gallerySchema.test.ts.
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));
vi.mock('@/lib/generationFailures', () => ({ logGenerationFailure: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: vi.fn() }; } }));

import { enforceModeProducts } from '../route';

const SRC = readFileSync(join(__dirname, '..', 'route.ts'), 'utf8');

describe('M2-203 · le prompt du Mode 2 exige un vrai catalogue', () => {
  it('AU MOINS 35 PRODUITS — six articles font une maquette, pas une boutique', () => {
    expect(SRC).toContain('AT LEAST 35 realistic products');
    expect(SRC).not.toContain(
      'products: return an EMPTY array [] — the merchant adds their own products manually',
    );
  });

  it('PRIX NUMÉRIQUE + DEVISE ISO DU MARCHÉ — jamais un symbole dans la valeur', () => {
    expect(SRC).toContain('"priceNumber"');
    expect(SRC).toContain('ISO 4217');
    // La nuance géographique est dite au modèle, avec des exemples de
    // CONTEXTE (le marché du marchand), jamais une table pays→paiement.
    expect(SRC).toContain('N\'Djamena prices in XAF');
  });

  it('LES TAILLES FONT PARTIE DU PRODUIT GÉNÉRÉ', () => {
    expect(SRC).toContain('"sizes"');
  });

  it('LE RAIL DE PAIEMENT SUIT LE MARCHÉ — Stripe n\'est plus une supposition mondiale', () => {
    expect(SRC).not.toContain('secure payment (Stripe — the merchant\'s own Stripe account)');
    expect(SRC).toContain('NEVER assume one payment rail worldwide');
    expect(SRC).toContain('NEVER a worldwide assumption');
  });

  it('LE SEMIS EXISTE, ET IL EST FAIL-SAFE — jamais il ne fait échouer la création', () => {
    expect(SRC).toContain("from('shop_products').insert");
    expect(SRC).toContain('for_sale: false');
    expect(SRC).toContain('seed shop_products threw');
  });

  it('DOCTRINE 6c TENUE — semé visible, vendable après décision du marchand', () => {
    const semis = SRC.slice(SRC.indexOf('M2-203 — LE CATALOGUE'), SRC.indexOf('Increment du compteur'));
    expect(semis).toContain('published: true');
    expect(semis).toContain('for_sale: false');
  });
});

describe('M2-203 · enforceModeProducts — le jsonb reste vide, le semis est ailleurs', () => {
  it('MODE 2 : le jsonb `sites.products` reste [] (volet C intact)', () => {
    // Le semis va dans `shop_products` — la source canonique. Le jsonb ne
    // redevient pas une seconde vérité.
    expect(enforceModeProducts(2, [{ name: 'x' }])).toEqual([]);
  });
  it('MODE 3 : inchangé', () => {
    expect(enforceModeProducts(3, [{ name: 'x' }])).toEqual([]);
  });
  it('MODE 1 : inchangé — son catalogue jsonb est sa seule source', () => {
    expect(enforceModeProducts(1, [{ name: 'x' }])).toEqual([{ name: 'x' }]);
  });
});
