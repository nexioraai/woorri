import { describe, it, expect } from 'vitest';
import { partagerArchive, anneesArchivees, parAnnee, lireAnnee, anneeDeClassement, estClos } from '../archiver';

// ============================================================
// LOT 5d — L'ARCHIVE DES CONSULTATIONS CLOSES.
//
// La coupure est l'ANNÉE CIVILE, décidée sur l'ÉCHÉANCE et non sur la date
// de publication : un avis publié en décembre dont la remise tombe en
// janvier n'est pas « de l'année dernière ».
//
// Le moment est REÇU, jamais lu de l'horloge : un test qui dépend de l'heure
// réelle passe cette année et rougit le 1er janvier.
// ============================================================

const T = new Date('2026-11-08T12:00:00Z');

const AVIS = [
  { etat: 'ouvert',   remise_le: '2026-03-01T00:00:00Z' },  // clos, année courante
  { etat: 'attribue', remise_le: '2026-01-15T00:00:00Z' },  // attribué, année courante
  { etat: 'ouvert',   remise_le: '2025-09-01T00:00:00Z' },  // clos, 2025 → archive
  { etat: 'attribue', remise_le: '2024-04-02T00:00:00Z' },  // attribué, 2024 → archive
  { etat: 'ouvert',   remise_le: null },                    // sans échéance
];

describe('la coupure est l’année civile, décidée sur l’échéance', () => {
  it('🔴 les avis clos de l’année courante RESTENT sur la page', () => {
    const { recents } = partagerArchive(AVIS, T);
    expect(recents.map((a) => a.remise_le)).toContain('2026-03-01T00:00:00Z');
    expect(recents.map((a) => a.remise_le)).toContain('2026-01-15T00:00:00Z');
  });

  it('🔴 les plus anciens passent à l’archive', () => {
    const { archives } = partagerArchive(AVIS, T);
    expect(archives).toHaveLength(2);
    expect(archives.map((a) => anneeDeClassement(a))).toEqual([2025, 2024]);
  });

  it('🔴 un avis SANS échéance reste sur la page principale', () => {
    // Le reléguer à l'archive serait le ranger dans une année inconnue.
    const { recents, archives } = partagerArchive(AVIS, T);
    expect(recents.some((a) => a.remise_le === null)).toBe(true);
    expect(archives.some((a) => a.remise_le === null)).toBe(false);
  });

  it('🔴 aucun avis n’est perdu : récents + archives = tout', () => {
    const { recents, archives } = partagerArchive(AVIS, T);
    expect(recents.length + archives.length).toBe(AVIS.length);
  });

  it('🔴 une date illisible ne range pas au hasard', () => {
    expect(anneeDeClassement({ etat: 'ouvert', remise_le: 'pas une date' })).toBeNull();
    const { recents } = partagerArchive([{ etat: 'ouvert', remise_le: 'pas une date' }], T);
    expect(recents).toHaveLength(1);
  });

  it('🔴 le 1er janvier, l’année précédente bascule', () => {
    const nouvelAn = new Date('2027-01-01T00:00:00Z');
    const { recents, archives } = partagerArchive(AVIS, nouvelAn);
    // MON PREMIER ATTENDU DISAIT « 3 » ET MESURAIT 4. Au 1er janvier 2027,
    // les deux avis de 2026 rejoignent 2025 et 2024 : quatre archivés. Un
    // attendu qui ne correspond pas à son instrument est un faux rouge, et
    // j'avais écrit le doute en commentaire sans le lever.
    expect(archives).toHaveLength(4);
    expect(anneesArchivees(archives)).toEqual([2026, 2025, 2024]);
    // Celui sans échéance ne bascule JAMAIS : aucune année ne le range.
    expect(recents.some((a) => a.remise_le === null)).toBe(true);
    expect(recents).toHaveLength(1);
  });
});

describe('l’archive se parcourt par année', () => {
  const { archives } = partagerArchive(AVIS, T);

  it('🔴 les années vont de la plus récente à la plus ancienne', () => {
    expect(anneesArchivees(archives)).toEqual([2025, 2024]);
  });

  it('🔴 une année donnée ne rend que les siens', () => {
    expect(parAnnee(archives, 2025)).toHaveLength(1);
    expect(parAnnee(archives, 2024)).toHaveLength(1);
    expect(parAnnee(archives, null)).toHaveLength(2);
  });

  it('🔴 une année ABSENTE de l’archive retombe sur « toutes »', () => {
    const dispo = anneesArchivees(archives);
    expect(lireAnnee('2025', dispo)).toBe(2025);
    expect(lireAnnee('1999', dispo)).toBeNull();
    expect(lireAnnee('<script>', dispo)).toBeNull();
    expect(lireAnnee(undefined, dispo)).toBeNull();
    expect(lireAnnee('20255', dispo)).toBeNull();
  });
});

describe('l’archive ne parle que des avis clos', () => {
  it('🔴 un avis encore ouvert n’y entre pas', () => {
    expect(estClos({ etat: 'ouvert', remise_le: '2027-01-01T00:00:00Z' }, T)).toBe(false);
  });

  it('un avis dont l’échéance est passée est clos, même marqué « ouvert »', () => {
    expect(estClos({ etat: 'ouvert', remise_le: '2025-01-01T00:00:00Z' }, T)).toBe(true);
  });

  it('un avis attribué est clos, échéance passée ou non', () => {
    expect(estClos({ etat: 'attribue', remise_le: '2030-01-01T00:00:00Z' }, T)).toBe(true);
  });

  it('une procédure en préparation n’est pas close', () => {
    expect(estClos({ etat: 'preparation', remise_le: '2020-01-01T00:00:00Z' }, T)).toBe(false);
  });
});
