// M2-202 — LE LIEN DE COMMANDE WHATSAPP, PUR ET TESTÉ SANS JSDOM.
import { describe, expect, it } from 'vitest'
import { lienAppel, lienCommandeWhatsApp, marcheSansCarte, urlProduitDepuisLaPage } from '@/lib/whatsappOrder'

describe('M2-202 · le récapitulatif de commande WhatsApp', () => {
  it('LE LIEN PORTE PRODUIT, TAILLE, PRIX ET URL — le vendeur sait quoi livrer', () => {
    const lien = lienCommandeWhatsApp({
      whatsapp: '+235 66 00 00 00',
      productName: 'Chemise coton',
      size: 'M',
      priceLabel: '15 000 XAF',
      url: 'https://deribfy.com/sites/x/produits/1',
    })
    expect(lien).toContain('https://wa.me/23566000000?text=')
    const texte = decodeURIComponent(String(lien).split('text=')[1])
    expect(texte).toContain('Chemise coton (M)')
    expect(texte).toContain('15 000 XAF')
    expect(texte).toContain('https://deribfy.com/sites/x/produits/1')
  })

  it('SANS TAILLE CHOISIE, AUCUNE PARENTHÈSE VIDE', () => {
    const lien = lienCommandeWhatsApp({
      whatsapp: '23566000000', productName: 'Sac', size: null, priceLabel: '9 000 XAF', url: '',
    })
    const texte = decodeURIComponent(String(lien).split('text=')[1])
    expect(texte).toContain('Sac')
    expect(texte).not.toContain('(')
  })

  it('UN NUMÉRO SANS CHIFFRES NE PRODUIT AUCUN LIEN — rien n’est inventé', () => {
    expect(
      lienCommandeWhatsApp({ whatsapp: 'bientôt', productName: 'x', size: null, priceLabel: '', url: '' }),
    ).toBeNull()
  })
})

describe('M2-207 · la porte du marché sans carte', () => {
  it('XAF ET XOF OUVRENT LES BOUTONS — le marché tchadien et la zone CFA', () => {
    expect(marcheSansCarte('XAF')).toBe(true)
    expect(marcheSansCarte('XOF')).toBe(true)
    expect(marcheSansCarte('xaf')).toBe(true)
  })

  it('LES MARCHÉS CARTE RESTENT INTACTS — Stripe ne voit aucun bouton', () => {
    for (const c of ['EUR', 'USD', 'CAD', 'GBP', 'MAD', 'NGN']) {
      expect(marcheSansCarte(c), c).toBe(false)
    }
    expect(marcheSansCarte(null)).toBe(false)
    expect(marcheSansCarte(undefined, '')).toBe(false)
  })

  it('UN LIBELLÉ DE PRIX SUFFIT — les cartes de collection n\'ont pas de champ devise', () => {
    expect(marcheSansCarte(null, '25 000 - 80 000 XAF')).toBe(true)
    expect(marcheSansCarte(null, '30 000 FCFA')).toBe(true)
    expect(marcheSansCarte(null, '$65 - $120')).toBe(false)
  })

  it("L'URL PRODUIT SE RÉSOUT DEPUIS LA PAGE — deribfy.com/sites/x ET domaine propre", () => {
    expect(urlProduitDepuisLaPage('https://deribfy.com', '/sites/ma-boutique', 'p-1'))
      .toBe('https://deribfy.com/sites/ma-boutique/produits/p-1')
    expect(urlProduitDepuisLaPage('https://maboutique.td', '/', 'p-1'))
      .toBe('https://maboutique.td/produits/p-1')
    expect(urlProduitDepuisLaPage('https://deribfy.com', '/sites/x/produits/p-9', 'p-1'))
      .toBe('https://deribfy.com/sites/x/produits/p-1')
  })

  it('LIEN APPEL — garde les chiffres et le +, refuse le vide', () => {
    expect(lienAppel('+235 66 00 00 00')).toBe('tel:+235660000 00'.replace(' ', ''))
    expect(lienAppel('rien')).toBeNull()
    expect(lienAppel(null)).toBeNull()
  })
})
