// M2-201 — LA DEVISE VIENT DE LA BOUTIQUE, PAS D'UNE CONSTANTE.
//
// DÉFAUT VU SUR UNE BOUTIQUE RÉELLE À N'DJAMENA : les prix s'affichaient en
// « $ » alors que la boutique vend en francs CFA. La cause était une seule
// ligne — `currency: 'CAD'` dans l'état initial du formulaire — et le
// marchand devait corriger la devise à CHAQUE produit, ou ne pas la voir.
import { describe, expect, it } from 'vitest';
import { deviseParDefaut, draftVierge, EMPTY_DRAFT } from '../productDraft';

describe('M2-201 · la devise par défaut se déduit de la boutique', () => {
  it('UNE BOUTIQUE QUI VEND EN XAF PROPOSE XAF', () => {
    expect(deviseParDefaut([{ currency: 'XAF' }, { currency: 'XAF' }])).toBe('XAF');
  });

  it('UNE BOUTIQUE VIDE N INVENTE AUCUNE DEVISE', () => {
    // LE DÉFAUT QUE CE CAS GARDE : proposer une monnaie au hasard serait
    // reproduire l'erreur en changeant seulement de défaut. Un marchand
    // tchadien n'a pas plus de raison de voir « CAD » que l'inverse.
    expect(deviseParDefaut([])).toBe('');
    expect(draftVierge([]).currency).toBe('');
  });

  it('LA DEVISE LA PLUS RÉPANDUE GAGNE — une saisie isolée ne fait pas loi', () => {
    // Un produit saisi par erreur dans une autre monnaie ne doit pas devenir
    // la référence de toute la boutique.
    const produits = [
      { currency: 'XAF' },
      { currency: 'XAF' },
      { currency: 'XAF' },
      { currency: 'EUR' },
    ];
    expect(deviseParDefaut(produits)).toBe('XAF');
  });

  it('LES VALEURS MAL FORMÉES SONT IGNORÉES, JAMAIS PROPAGÉES', () => {
    expect(deviseParDefaut([{ currency: '' }, { currency: null }, { currency: 'x' }])).toBe('');
    expect(deviseParDefaut([{ currency: 'eur' }])).toBe('EUR');
  });

  it("LE RESTE DE L'ÉTAT INITIAL EST INTACT — aucune régression", () => {
    // `published: true`, `for_sale: false` : la décision d'EP « DETTE 6c »
    // n'est pas touchée par ce changement de devise.
    const d = draftVierge([{ currency: 'XAF' }]);
    expect(d.published).toBe(EMPTY_DRAFT.published);
    expect(d.for_sale).toBe(EMPTY_DRAFT.for_sale);
    expect(d.name).toBe('');
    expect(d.price).toBe('');
    expect(d.images).toEqual([]);
  });

  it("AUCUNE DEVISE N'EST CODÉE EN DUR DANS L'ÉTAT INITIAL", () => {
    // Le cliquet : si quelqu'un remet une monnaie par défaut, ce test tombe.
    expect(EMPTY_DRAFT.currency).toBe('');
  });
});
