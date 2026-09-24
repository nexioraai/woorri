// ============================================================
// CLIQUET — UN PRIX BARRÉ QUI NE BARRE RIEN EST UN MENSONGE À L'ACHETEUR.
//
// LE DÉFAUT COMBLÉ : la colonne `compare_at_price` existait en base, la
// vitrine savait l'afficher, et l'outil Promo la posait EN MASSE — mais AUCUN
// champ ne permettait au marchand de la saisir PRODUIT PAR PRODUIT. Il ne
// pouvait donc pas solder un seul article, le cas pourtant le plus fréquent
// du commerce de détail.
//
// ET LE PIÈGE D'APRÈS : un ancien prix inférieur ou égal au prix actuel
// n'annonce aucune remise. L'affichage refusait déjà de le montrer — mais il
// était ENREGISTRÉ quand même, et le marchand croyait avoir posé une
// promotion invisible. On le neutralise donc à la SOURCE : ce qui est
// enregistré est ce qui sera montré, jamais autre chose.
// ============================================================
import { describe, expect, it } from 'vitest';
import { EMPTY_DRAFT, ancienPrixRetenu, payloadFromDraft } from '../productDraft';

describe('l’ancien prix retenu', () => {
  it('un ancien prix PLUS ÉLEVÉ est retenu — c’est une vraie remise', () => {
    expect(ancienPrixRetenu('25000', '20000')).toBe(25000);
    expect(ancienPrixRetenu('1.5', '1')).toBe(1.5);
  });

  it('un ancien prix ÉGAL OU INFÉRIEUR est REFUSÉ — il ne barre rien', () => {
    // Le montrer serait faire croire à une affaire qui n'existe pas ;
    // l'enregistrer sans le montrer serait pire : le marchand croirait avoir
    // posé une promotion, et n'en verrait jamais l'effet.
    expect(ancienPrixRetenu('20000', '20000')).toBeNull();
    expect(ancienPrixRetenu('15000', '20000')).toBeNull();
  });

  it('vide, illisible ou négatif → aucun prix barré, jamais une invention', () => {
    for (const v of ['', '   ', 'abc', '-5', '0']) {
      expect(ancienPrixRetenu(v, '20000'), `« ${v} »`).toBeNull();
    }
  });

  it('prix actuel absent : tout ancien prix positif devient une remise', () => {
    // `price` vide vaut 0 : un ancien prix de 20 000 y est bien supérieur.
    // Cohérent avec `payloadFromDraft`, qui écrit 0 dans ce cas.
    expect(ancienPrixRetenu('20000', '')).toBe(20000);
  });
});

describe('la charge envoyée', () => {
  it('porte `compare_at_price`, et il vaut `null` sans saisie', () => {
    expect(payloadFromDraft(EMPTY_DRAFT).compare_at_price).toBeNull();
  });

  it('porte la valeur quand la remise est RÉELLE', () => {
    const d = { ...EMPTY_DRAFT, price: '20000', compare_at_price: '25000' };
    expect(payloadFromDraft(d).compare_at_price).toBe(25000);
  });

  it('porte `null` quand la « remise » n’en est pas une', () => {
    const d = { ...EMPTY_DRAFT, price: '20000', compare_at_price: '19000' };
    expect(payloadFromDraft(d).compare_at_price).toBeNull();
  });
});
