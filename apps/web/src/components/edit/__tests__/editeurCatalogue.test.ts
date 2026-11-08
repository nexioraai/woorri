import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(__dirname, '..', '..', '..');
const code = (p: string) =>
  readFileSync(join(RACINE, p), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const ECRAN = code('components/EditeurCatalogue.tsx');
const ROUTE = code('app/api/sites/[slug]/catalogue/route.ts');
const NAV = code('components/Navbar.tsx');

// ============================================================
// LOT 6 — CE QU'ON PEUT POSER, ON DOIT POUVOIR LE RETIRER.
//
// Sans écran, `catalogue_produits` serait une table que personne ne peut
// remplir : poser une fonction sans le geste qui la rend utilisable, c'est
// GEN-D044 — le défaut payé le 7 novembre.
// ============================================================

describe('ni prix ni stock, jusque dans l’éditeur', () => {
  it('🔴 l’écran ne propose AUCUN champ de prix ou de stock', () => {
    for (const mot of [/\bprix\b/i, /\bprice\b/i, /\bstock\b/i, /\btarif\b/i]) {
      expect(ECRAN, `« ${mot} » apparaît dans l'éditeur`).not.toMatch(mot);
    }
  });

  it('🔴 la liste blanche de la route n’en contient pas non plus', () => {
    const d = ROUTE.indexOf('const CHAMPS');
    const liste = ROUTE.slice(d, ROUTE.indexOf(']', d));
    for (const mot of ['prix', 'price', 'stock']) expect(liste).not.toContain(mot);
  });
});

describe('une seule porte, et elle est gardée', () => {
  it('🔴 les quatre verbes passent par requireSiteOwner', () => {
    expect((ROUTE.match(/requireSiteOwner\(/gu) ?? []).length).toBe(4);
  });

  it('🔴 `site_id` vient de la garde, jamais du corps', () => {
    expect(ROUTE).toMatch(/site_id:\s*garde\.site\.id/);
    expect(ROUTE).not.toMatch(/corps\.site_id/);
  });

  it('🔴 PATCH et DELETE filtrent par site MÊME avec un `id`', () => {
    // Un identifiant deviné ne doit pas suffire à toucher le catalogue
    // d'un autre locataire.
    const n = (ROUTE.match(/\.eq\('site_id',\s*garde\.site\.id\)/gu) ?? []).length;
    expect(n).toBeGreaterThanOrEqual(3);
  });

  it('🔴 DELETE relit la ligne avant d’annoncer le retrait', () => {
    const d = ROUTE.indexOf('export async function DELETE');
    expect(ROUTE.slice(d)).toMatch(/\.select\('id'\)/);
    expect(ROUTE.slice(d)).toMatch(/!data\?\.length/);
  });
});

describe('l’écran est utilisable et branché', () => {
  it('🔴 les quatre appels portent l’en-tête Authorization', () => {
    const appels = (ECRAN.match(/fetch\(/gu) ?? []).length;
    const entetes = (ECRAN.match(/headers:\s*await\s+entete\(\)/gu) ?? []).length;
    expect(appels).toBe(entetes);
    expect(appels).toBeGreaterThanOrEqual(2);
  });

  it('🔴 une référence peut être RETIRÉE', () => {
    expect(ECRAN).toMatch(/Retirer\s/);
    expect(ECRAN).toMatch(/'DELETE'/);
  });

  it('🔴 la liste est RECHARGÉE depuis la route après chaque écriture', () => {
    expect(ECRAN).toMatch(/await\s+recharger\(\)/);
  });

  it('🔴 l’écran est monté dans /edit — sinon il n’existe pas', () => {
    expect(NAV).toContain('EditeurCatalogue');
  });
});
