import { describe, it, expect } from 'vitest';
import { methodesPresentes, SIGNE_FILTRE } from '../legendeMethodes';
import { FILTRES } from '../filtrerAvis';

// ============================================================
// LOT 5bis — LA LÉGENDE SE DÉDUIT, ELLE NE S'ÉCRIT PAS.
//
// EPSS affiche « ICB · BCN » : leur typologie. Écrire la nôtre en dur
// afficherait des sigles que la Centrale n'emploie PAS — et un sigle
// inconnu sur un portail d'achats publics fait douter le fournisseur de
// tout le reste de la page.
// ============================================================

describe('la légende ne montre que ce qui existe vraiment', () => {
  it('🔴 zéro avis → AUCUNE légende, pas un encart vide', () => {
    expect(methodesPresentes([])).toEqual([]);
  });

  it('🔴 une méthode absente ou vide n’entre pas', () => {
    expect(methodesPresentes([
      { methode: null }, { methode: '' }, { methode: '   ' }, {},
    ])).toEqual([]);
  });

  it('🔴 seules les méthodes RÉELLEMENT employées paraissent', () => {
    const l = methodesPresentes([{ methode: 'AOI' }, { methode: 'AON' }]);
    expect(l.map((m) => m.code).sort()).toEqual(['AOI', 'AON']);
    expect(l.map((m) => m.code)).not.toContain('ICB');
  });

  it('🔴 chaque sigle porte SON compte', () => {
    const l = methodesPresentes([{ methode: 'AOI' }, { methode: 'AOI' }, { methode: 'AON' }]);
    expect(l.find((m) => m.code === 'AOI')?.nombre).toBe(2);
    expect(l.find((m) => m.code === 'AON')?.nombre).toBe(1);
  });

  it('🔴 l’ordre est STABLE — deux chargements rendent le même', () => {
    // Un ordre instable rend la page immémorisable : le lecteur qui revient
    // ne retrouve pas ce qu'il avait vu.
    const avis = [{ methode: 'B' }, { methode: 'A' }, { methode: 'C' }, { methode: 'A' }];
    const un = methodesPresentes(avis).map((m) => m.code);
    const deux = methodesPresentes([...avis].reverse()).map((m) => m.code);
    expect(un).toEqual(deux);
    expect(un).toEqual(['A', 'B', 'C']);   // la plus employée, puis alphabétique
  });

  it('les espaces de bord sont retirés — « AOI » et « AOI » ne font qu’un', () => {
    expect(methodesPresentes([{ methode: ' AOI ' }, { methode: 'AOI' }])).toHaveLength(1);
  });
});

describe('chaque filtre a son pictogramme', () => {
  it('🔴 les cinq filtres sont couverts — aucun ne paraît sans signe', () => {
    for (const f of FILTRES) {
      expect(SIGNE_FILTRE[f], `« ${f} » n'a pas de pictogramme`).toBeTruthy();
    }
  });

  it('🔴 ce sont des CARACTÈRES, jamais une image à charger', () => {
    for (const f of FILTRES) {
      expect(SIGNE_FILTRE[f].length).toBeLessThanOrEqual(2);
      expect(SIGNE_FILTRE[f]).not.toContain('<');
      expect(SIGNE_FILTRE[f]).not.toContain('http');
    }
  });
});
