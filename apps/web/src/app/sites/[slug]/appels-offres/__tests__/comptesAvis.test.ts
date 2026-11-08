import { describe, it, expect } from 'vitest';
import { compterAvis, joursRestants, JOURS_URGENCE } from '../comptesAvis';

// ============================================================
// LOT 5bis — UN CHIFFRE AFFICHÉ EST UN CHIFFRE MESURÉ.
//
// Les quatre compteurs se DÉDUISENT des avis réels. Aucun n'est saisissable :
// un compteur qu'on peut écrire à la main ment le jour où personne ne le met
// à jour — et sur un portail d'État, « 4 appels d'offres actifs » quand il
// n'y en a aucun fait perdre son temps à un fournisseur qui prépare un
// dossier.
//
// Le moment est REÇU, jamais lu de l'horloge.
// ============================================================

const T = new Date('2026-11-08T12:00:00Z');
const dans = (j: number) => new Date(T.getTime() + j * 86400000).toISOString();

const AVIS = [
  { etat: 'ouvert',      remise_le: dans(30) },   // actif + ouvert
  { etat: 'ouvert',      remise_le: dans(3) },    // actif + ouvert + urgent
  { etat: 'ouvert',      remise_le: dans(7) },    // actif + ouvert + urgent (borne)
  { etat: 'ouvert',      remise_le: dans(8) },    // actif + ouvert, PAS urgent
  { etat: 'preparation', remise_le: dans(60) },   // actif, PAS ouvert aux offres
  { etat: 'ouvert',      remise_le: dans(-2) },   // échéance passée → clos
  { etat: 'attribue',    remise_le: '2026-02-01T00:00:00Z' },  // terminé, année courante
  { etat: 'ouvert',      remise_le: '2025-05-01T00:00:00Z' },  // clos, ARCHIVÉ
  { etat: 'attribue',    remise_le: '2024-03-01T00:00:00Z' },  // terminé, ARCHIVÉ
];

describe('les quatre compteurs se déduisent, ils ne se saisissent pas', () => {
  const c = compterAvis(AVIS, T);

  it('🔴 « actifs » exclut tout ce qui est clos ou attribué', () => {
    expect(c.actifs).toBe(5);
  });

  it('🔴 « ouverts » exclut une procédure en PRÉPARATION', () => {
    // Elle est active, mais aucune offre n'y est encore recevable :
    // la compter dirait à un fournisseur qu'il peut répondre.
    expect(c.ouverts).toBe(4);
  });

  it('🔴 « clôture prochaine » se décide sur l’ÉCHÉANCE, pas sur un drapeau', () => {
    expect(c.clotureProchaine).toBe(2);
  });

  it('🔴 la borne des sept jours est INCLUSE', () => {
    const borne = compterAvis([{ etat: 'ouvert', remise_le: dans(JOURS_URGENCE) }], T);
    expect(borne.clotureProchaine).toBe(1);
    const juste = compterAvis([{ etat: 'ouvert', remise_le: dans(JOURS_URGENCE + 0.5) }], T);
    expect(juste.clotureProchaine).toBe(0);
  });

  it('🔴 « archivés » emploie la MÊME notion que la page d’archive', () => {
    // Deux définitions de « archive » finiraient par diverger, et c'est le
    // compteur qu'on ne regarde pas qui aurait tort.
    expect(c.archives).toBe(2);
  });

  it('🔴 un avis clos de l’ANNÉE COURANTE n’est pas « archivé »', () => {
    const seul = compterAvis([{ etat: 'attribue', remise_le: '2026-02-01T00:00:00Z' }], T);
    expect(seul.archives).toBe(0);
  });

  it('🔴 à zéro avis, les quatre comptes valent ZÉRO, pas rien', () => {
    expect(compterAvis([], T)).toEqual({ actifs: 0, ouverts: 0, clotureProchaine: 0, archives: 0 });
  });

  it('un avis sans échéance reste ouvert mais jamais « urgent »', () => {
    const sans = compterAvis([{ etat: 'ouvert', remise_le: null }], T);
    expect(sans.ouverts).toBe(1);
    expect(sans.clotureProchaine).toBe(0);
  });
});

describe('les jours restants', () => {
  it('🔴 sont ARRONDIS au jour entier', () => {
    // EPSS affiche « 32.406850914144 jours restants » : douze décimales sur
    // un portail d'État disent au lecteur que personne n'a relu la page.
    const j = joursRestants(dans(32.4068), T);
    expect(Number.isInteger(j)).toBe(true);
    expect(j).toBe(33);
  });

  it('🔴 une échéance PASSÉE ne rend rien — « -3 jours restants » n’informe personne', () => {
    expect(joursRestants(dans(-3), T)).toBeNull();
  });

  it('une échéance absente ou illisible ne rend rien', () => {
    expect(joursRestants(null, T)).toBeNull();
    expect(joursRestants('pas une date', T)).toBeNull();
  });
});
