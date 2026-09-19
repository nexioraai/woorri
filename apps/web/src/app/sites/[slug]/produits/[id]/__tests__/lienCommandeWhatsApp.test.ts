// M2-202 — LE LIEN DE COMMANDE WHATSAPP, PUR ET TESTÉ SANS JSDOM.
import { describe, expect, it } from 'vitest'
import { lienCommandeWhatsApp } from '../ProductPageView'

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
