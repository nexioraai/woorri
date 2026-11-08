import { describe, it, expect } from 'vitest';
import { lireFiltre, compter, filtrer, FILTRES } from '../filtrerAvis';

// ============================================================
// LOT 5 — LE FILTRE SE DÉCIDE SUR L'ÉTAT VISIBLE.
//
// Un avis « ouvert » en base dont l'échéance est PASSÉE doit se ranger dans
// « clos ». Filtrer sur la colonne brute aurait l'air de marcher et mentirait
// exactement sur le cas qui compte : un fournisseur croirait pouvoir encore
// répondre à une consultation fermée.
//
// Le moment est REÇU, jamais lu de l'horloge : un test qui dépend de l'heure
// réelle passe le matin et rougit le soir.
// ============================================================

const T = new Date('2026-11-08T12:00:00Z');
const hier = '2026-11-07T12:00:00Z';
const demain = '2026-11-09T12:00:00Z';

const AVIS = [
  { etat: 'ouvert', remise_le: demain },     // reste ouvert
  { etat: 'ouvert', remise_le: hier },       // échéance passée → clos
  { etat: 'ouvert', remise_le: null },       // sans échéance → ouvert
  { etat: 'attribue', remise_le: hier },     // terminal
  { etat: 'preparation', remise_le: hier },  // pas d'échéance opposable
];

describe('le filtre lit l’adresse sans jamais la croire', () => {
  it('🔴 un filtre inconnu retombe sur « tous »', () => {
    expect(lireFiltre('ouvert')).toBe('ouvert');
    expect(lireFiltre('<script>')).toBe('tous');
    expect(lireFiltre(undefined)).toBe('tous');
    expect(lireFiltre(['clos', 'ouvert'])).toBe('clos');
    expect(lireFiltre(42)).toBe('tous');
  });
});

describe('le filtre range sur l’état VISIBLE, pas sur la colonne', () => {
  it('🔴 un avis « ouvert » à échéance PASSÉE compte comme clos', () => {
    expect(filtrer(AVIS, 'clos', T)).toHaveLength(1);
    expect(filtrer(AVIS, 'clos', T)[0].remise_le).toBe(hier);
  });

  it('🔴 il ne paraît PAS dans « ouvert »', () => {
    const o = filtrer(AVIS, 'ouvert', T);
    expect(o).toHaveLength(2);
    expect(o.map((a) => a.remise_le)).not.toContain(hier);
  });

  it('un avis attribué le reste, échéance passée ou non', () => {
    expect(filtrer(AVIS, 'attribue', T)).toHaveLength(1);
  });

  it('une procédure en préparation n’est pas « close » par son échéance', () => {
    expect(filtrer(AVIS, 'preparation', T)).toHaveLength(1);
    expect(filtrer(AVIS, 'clos', T).some((a) => a.etat === 'preparation')).toBe(false);
  });
});

describe('les comptes ne mentent pas', () => {
  it('🔴 la somme des cases égale le total', () => {
    const n = compter(AVIS, T);
    expect(n.ouvert + n.clos + n.attribue + n.preparation).toBe(n.tous);
  });

  it('🔴 une case vide affiche zéro, pas rien', () => {
    const n = compter([{ etat: 'ouvert', remise_le: demain }], T);
    expect(n.clos).toBe(0);
    expect(n.attribue).toBe(0);
  });

  it('🔴 un état INCONNU de la base n’est pas avalé', () => {
    // Si la base gagnait un cinquième état, l'écran doit le montrer dans
    // « tous » au lieu de le faire disparaître.
    const avec = [...AVIS, { etat: 'annule', remise_le: hier }];
    const n = compter(avec, T);
    expect(n.tous).toBe(6);
    expect(n.ouvert + n.clos + n.attribue + n.preparation).toBe(5);
    expect(filtrer(avec, 'tous', T)).toHaveLength(6);
  });

  it('les cinq filtres sont ceux que l’écran propose', () => {
    expect([...FILTRES]).toEqual(['tous', 'ouvert', 'clos', 'attribue', 'preparation']);
  });
});
