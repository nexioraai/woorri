import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ICI = join(__dirname, '..');
const code = (p: string) =>
  readFileSync(join(ICI, p), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const LISTE = code('page.tsx');
const FICHE = code('[reference]/page.tsx');
const LECTEUR = code('fetchCatalogue.ts');

// ============================================================
// LOT 6 — UN CATALOGUE DE CENTRALE N'EST PAS UNE BOUTIQUE.
//
// Le plan, §5 décision 1 : « Niveau du catalogue — information publique
// seule ? » (hypothèse retenue).
//
// La garantie PREMIÈRE est en base : la table n'a aucune colonne de prix,
// mesuré PGRST204 en production. Ce cliquet garde la SECONDE ligne — que
// les écrans ne réintroduisent pas par une autre porte.
// ============================================================

describe('ni prix, ni stock, ni achat', () => {
  for (const [nom, src] of [['la liste', LISTE], ['la fiche', FICHE], ['le lecteur', LECTEUR]] as const) {
    it(`🔴 ${nom} ne nomme aucun prix ni stock`, () => {
      for (const mot of [/\bprice\b/i, /\bprix\b/i, /\bstock\b/i, /\bpanier\b/i, /\bcart\b/i, /\bcheckout\b/i]) {
        expect(src, `« ${mot} » apparaît dans ${nom}`).not.toMatch(mot);
      }
    });
  }

  it('🔴 aucun écran ne lit `shop_products`', () => {
    // Réemployer la table de boutique aurait remis les colonnes de prix
    // à portée — c'est exactement ce que le lot refuse.
    for (const src of [LISTE, FICHE, LECTEUR]) expect(src).not.toMatch(/shop_products/);
  });

  it('🔴 le JSON-LD ne déclare PAS un produit en vente', () => {
    // schema.org rattacherait une Offer et un prix à ce qui n'en a pas.
    for (const src of [LISTE, FICHE]) {
      expect(src).not.toMatch(/"@type":\s*"Product"/);
      expect(src).not.toMatch(/\bOffer\b/);
    }
  });
});

describe('un produit non publié ne fuite pas', () => {
  it('🔴 la fiche rend 404, jamais une page vide', () => {
    expect(FICHE).toMatch(/if\s*\(!p\)\s*notFound\(\)/);
  });

  it('🔴 un seul refus — « absent » et « non publié » sont indistinguables', () => {
    // Deux refus différents révéleraient la référence d'un produit en
    // préparation par le code de retour.
    const refus = FICHE.match(/notFound\(\)/gu) ?? [];
    expect(refus.length).toBe(2);   // site absent, produit absent — rien de plus
    expect(FICHE).not.toMatch(/publie/);
  });

  it('🔴 le lecteur ne nomme JAMAIS la table, seulement la vue', () => {
    expect(LECTEUR).toMatch(/catalogue_produits_public/);
    expect(LECTEUR).not.toMatch(/from\(\s*['"]catalogue_produits['"]\s*\)/);
  });
});

describe('la liste marche sans JavaScript', () => {
  it('🔴 la recherche est un formulaire GET', () => {
    expect(LISTE).toMatch(/method="get"/);
  });

  it('🔴 les familles sont des LIENS, pas des boutons', () => {
    // L'adresse porte la famille : elle se partage et se met en favori.
    expect(LISTE).toMatch(/href=\{q\.toString\(\)/);
  });

  it('🔴 un catalogue vide le DIT au lieu de se taire', () => {
    expect(LISTE).toMatch(/n’est\s+pas\s+encore\s+publié/);
  });
});
