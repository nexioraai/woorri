import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import CarteAvis from '../CarteAvis';

// ============================================================
// LOT 5bis — UN AVIS EST UNE CARTE, PAS UNE LIGNE DE TABLEAU.
//
// Un fournisseur cherche d'abord DEUX choses : est-ce encore ouvert, et
// combien de temps lui reste-t-il. Une ligne de tableau met tout sur le même
// plan ; une carte peut hiérarchiser.
//
// Le moment est REÇU, jamais lu de l'horloge.
// ============================================================

const T = new Date('2026-11-08T12:00:00Z');
const dans = (j: number) => new Date(T.getTime() + j * 86400000).toISOString();

const L = { remise: 'Remise :', joursRestants: 'jours restants', nonRenseigne: 'Non renseignée' };
const base = {
  reference: 'CPA-2026-014', objet: 'Fourniture d’antipaludiques',
  methode: 'AOI', echeance: '15 décembre 2026', href: '/appels-offres/cpa-2026-014',
  maintenant: T, libelles: L, primary: '#1F6B4A',
};
/**
 * `??` NE DISTINGUE PAS « absent » DE « null ». Ma première version écrivait
 * `o.remiseLe ?? dans(30)` : passer `null` déclenchait le repli, et la carte
 * recevait une échéance à trente jours. Le test mesurait l'inverse de ce
 * qu'il croyait — un faux rouge de harnais, pas de composant.
 */
const rendre = (o: Record<string, unknown>) =>
  renderToStaticMarkup(<CarteAvis {...base} {...o} etatVisible={String(o.etatVisible ?? 'ouvert')}
    libelleEtat={String(o.libelleEtat ?? 'Ouvert')}
    remiseLe={('remiseLe' in o ? o.remiseLe : dans(30)) as string | null} />);

describe('le compte à rebours ne paraît que s’il informe', () => {
  it('🔴 il est ARRONDI au jour entier', () => {
    // EPSS affiche « 32.406850914144 jours restants ». Douze décimales sur
    // un portail d'État disent que personne n'a relu la page.
    const html = rendre({ remiseLe: dans(32.4068) });
    expect(html).toContain('33 jours restants');
    expect(html).not.toMatch(/\d+\.\d{3,}/);
  });

  it('🔴 une échéance PASSÉE ne l’affiche pas — « -3 jours » n’informe personne', () => {
    const html = rendre({ remiseLe: dans(-3), etatVisible: 'clos', libelleEtat: 'Clôturé' });
    expect(html).not.toContain('jours restants');
  });

  it('🔴 une échéance absente ne l’affiche pas non plus', () => {
    expect(rendre({ remiseLe: null })).not.toContain('jours restants');
  });
});

describe('l’urgence se voit sans lire', () => {
  it('🔴 à moins de sept jours, la pastille change de couleur', () => {
    const urgent = rendre({ remiseLe: dans(3) });
    const calme = rendre({ remiseLe: dans(30) });
    expect(urgent).toContain('#fdf0e1');
    expect(calme).not.toContain('#fdf0e1');
  });

  it('🔴 un avis CLOS n’est jamais « urgent », même à échéance proche', () => {
    // Un marché fermé ne devient pas urgent parce que sa date est récente.
    const html = rendre({ remiseLe: dans(2), etatVisible: 'clos', libelleEtat: 'Clôturé' });
    expect(html).not.toContain('#fdf0e1');
  });
});

describe('la carte porte ce qu’un fournisseur cherche', () => {
  it('🔴 la référence, l’objet et le lien vers la fiche', () => {
    const html = rendre({});
    expect(html).toContain('CPA-2026-014');
    expect(html).toContain('Fourniture d’antipaludiques');
    expect(html).toContain('/appels-offres/cpa-2026-014');
  });

  it('🔴 la méthode N’EST PAS inventée quand elle manque', () => {
    // Une étiquette vide vaut mieux qu'une étiquette fausse sur un marché.
    const html = rendre({ methode: null });
    expect(html).not.toContain('AOI');
  });

  it('🔴 une échéance absente le DIT, au lieu de laisser un blanc', () => {
    expect(rendre({ echeance: null, remiseLe: null })).toContain('Non renseignée');
  });

  it('la couleur de la méthode vient du SITE, pas d’une valeur en dur', () => {
    expect(rendre({})).toContain('#1F6B4A');
  });
});
