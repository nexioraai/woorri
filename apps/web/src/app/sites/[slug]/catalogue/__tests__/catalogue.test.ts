import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { famillesPresentes, parFamille, lireFamille, chercher, type ProduitCatalogue } from '../fetchCatalogue';

// ============================================================
// LOT 6 — LE CATALOGUE D'UNE CENTRALE N'EST PAS UNE BOUTIQUE.
//
// Le plan, §5 décision 1 : « Niveau du catalogue — information publique
// seule ? » (hypothèse retenue). Donc ni prix, ni stock, ni commande.
//
// La garantie n'est PAS dans ce fichier : la table n'a aucune colonne de
// prix, mesuré PGRST204 en production. Ce qui est gardé ici, c'est que la
// recherche et le filtre ne mentent pas.
// ============================================================

const P = (o: Partial<ProduitCatalogue>): ProduitCatalogue => ({
  reference: 'R1', denomination: 'Produit', famille: null, forme: null,
  dosage: null, conditionnement: null, chaine_du_froid: false, note: null, maj_le: null, ...o,
});

const CAT = [
  P({ reference: 'MED-001', denomination: 'Paracétamol', famille: 'Antalgiques', forme: 'Comprimé' }),
  P({ reference: 'MED-002', denomination: 'Amoxicilline', famille: 'Anti-infectieux', forme: 'Gélule' }),
  P({ reference: 'MED-003', denomination: 'Artéméther', famille: 'Anti-infectieux', forme: 'Injectable' }),
  P({ reference: 'VAC-001', denomination: 'Vaccin antirougeoleux', famille: 'Chaîne du froid', chaine_du_froid: true }),
  P({ reference: 'DIV-001', denomination: 'Compresses', famille: null }),
];

describe('les familles se déduisent, elles ne s’écrivent pas', () => {
  it('🔴 seules les familles RÉELLEMENT employées paraissent', () => {
    const f = famillesPresentes(CAT).map((x) => x.nom);
    expect(f).toContain('Anti-infectieux');
    expect(f).not.toContain('Cardiovasculaire');
  });

  it('🔴 un produit sans famille n’en invente pas une', () => {
    expect(famillesPresentes(CAT)).toHaveLength(3);
  });

  it('🔴 l’ordre est STABLE — la plus fournie, puis alphabétique', () => {
    const un = famillesPresentes(CAT).map((x) => x.nom);
    const deux = famillesPresentes([...CAT].reverse()).map((x) => x.nom);
    expect(un).toEqual(deux);
    expect(un[0]).toBe('Anti-infectieux');
  });

  it('🔴 un catalogue vide ne rend AUCUNE famille', () => {
    expect(famillesPresentes([])).toEqual([]);
  });
});

describe('le filtre par famille ne perd personne', () => {
  it('🔴 une famille ne rend que les siens', () => {
    expect(parFamille(CAT, 'Anti-infectieux')).toHaveLength(2);
  });

  it('🔴 sans filtre, TOUT le catalogue — y compris les sans-famille', () => {
    expect(parFamille(CAT, null)).toHaveLength(5);
  });

  it('🔴 une famille inconnue de l’adresse retombe sur « toutes »', () => {
    const dispo = famillesPresentes(CAT).map((x) => x.nom);
    expect(lireFamille('Anti-infectieux', dispo)).toBe('Anti-infectieux');
    expect(lireFamille('Cardiovasculaire', dispo)).toBeNull();
    expect(lireFamille('<script>', dispo)).toBeNull();
    expect(lireFamille(undefined, dispo)).toBeNull();
  });
});

describe('la recherche trouve ce qu’un humain tape', () => {
  it('🔴 sans accent et sans majuscule', () => {
    // Un catalogue qu'on ne trouve qu'en tapant les accents justes n'est
    // pas cherchable dans un pays où l'on tape vite.
    expect(chercher(CAT, 'parACETAMOL')).toHaveLength(1);
    expect(chercher(CAT, 'artemether')).toHaveLength(1);
  });

  it('🔴 par référence aussi — c’est ce qu’on a sous les yeux', () => {
    expect(chercher(CAT, 'vac-001')).toHaveLength(1);
  });

  it('🔴 par forme', () => {
    expect(chercher(CAT, 'injectable')).toHaveLength(1);
  });

  it('🔴 une recherche vide rend TOUT, pas rien', () => {
    expect(chercher(CAT, '   ')).toHaveLength(5);
  });

  it('une recherche sans résultat rend une liste vide, pas une erreur', () => {
    expect(chercher(CAT, 'zzzz')).toEqual([]);
  });
});
