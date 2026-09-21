// M2-202 — LE LIEN DE COMMANDE WHATSAPP, PUR ET TESTÉ SANS JSDOM.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { lienAppel, lienCommandeWhatsApp, marcheSansCarte, nettoieNumerosMobileMoney, numerosDEncaissement, urlProduitDepuisLaPage } from '@/lib/whatsappOrder'

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

  it("M2-213 — L'APERÇU N'EST PAS UNE ADRESSE PUBLIQUE : le lien vise /sites/<slug>", () => {
    // LE DÉFAUT VU EN VRAI : l'acheteur commande depuis /preview/<slug>, le
    // vendeur reçoit ce lien-là et tombe sur 404 — la page d'aperçu n'existe
    // que pour le propriétaire connecté.
    expect(urlProduitDepuisLaPage('https://deribfy.com', '/preview/ma-boutique', 'p-1', 'ma-boutique'))
      .toBe('https://deribfy.com/sites/ma-boutique/produits/p-1')
    expect(urlProduitDepuisLaPage('https://deribfy.com', '/edit/ma-boutique', 'p-1', 'ma-boutique'))
      .toBe('https://deribfy.com/sites/ma-boutique/produits/p-1')
    // Sur l'adresse publique, rien ne change.
    expect(urlProduitDepuisLaPage('https://deribfy.com', '/sites/ma-boutique', 'p-1', 'ma-boutique'))
      .toBe('https://deribfy.com/sites/ma-boutique/produits/p-1')
    // Sur un domaine propre (racine), rien ne change non plus.
    expect(urlProduitDepuisLaPage('https://maboutique.td', '/', 'p-1', 'ma-boutique'))
      .toBe('https://maboutique.td/produits/p-1')
  })

  it('LIEN APPEL — garde les chiffres et le +, refuse le vide', () => {
    expect(lienAppel('+235 66 00 00 00')).toBe('tel:+235660000 00'.replace(' ', ''))
    expect(lienAppel('rien')).toBeNull()
    expect(lienAppel(null)).toBeNull()
  })
})


describe('M2-210 · plusieurs numéros d\'encaissement, libellés par le marchand', () => {
  it('AIRTEL ET MOOV COEXISTENT — l\'acheteur paie sur SON opérateur', () => {
    const liste = nettoieNumerosMobileMoney([
      { label: 'Airtel Money', number: '+235 66 11 22 33' },
      { label: 'Moov Money', number: '+235 99 44 55 66' },
    ])
    expect(liste).toHaveLength(2)
    expect(liste[0]?.label).toBe('Airtel Money')
    expect(liste[1]?.label).toBe('Moov Money')
  })

  it('LES FORMES INATTENDUES SONT ABSORBÉES — jamais un plantage sur du JSON libre', () => {
    expect(nettoieNumerosMobileMoney(undefined)).toEqual([])
    expect(nettoieNumerosMobileMoney('texte')).toEqual([])
    expect(nettoieNumerosMobileMoney([null, 42, { label: 'x' }, { number: 'sans-chiffre' }])).toEqual([])
    expect(nettoieNumerosMobileMoney([{ number: ' +235 60 00 00 00 ' }])).toEqual([
      { label: '', number: '+235 60 00 00 00' },
    ])
  })

  it('SANS LISTE, LE REPLI EST LE NUMÉRO DE CONTACT — jamais zéro numéro quand un existe', () => {
    expect(numerosDEncaissement([], '+23566131260')).toEqual([{ label: '', number: '+23566131260' }])
    expect(numerosDEncaissement(undefined, null)).toEqual([])
  })

  it('LA LISTE PRIME SUR LE REPLI — le marchand a parlé, on l\'écoute', () => {
    const liste = numerosDEncaissement([{ label: 'Moov Money', number: '+235 99' }], '+235 66')
    expect(liste).toHaveLength(1)
    expect(liste[0]?.number).toBe('+235 99')
  })

  it('AUCUN OPÉRATEUR N\'EST ÉCRIT DANS LE CODE — le libellé vient du marchand', () => {
    // L\'invariant structurel : la structure est {label, number}, et le code
    // de production ne nomme aucun opérateur. Vérifié sur le module entier.
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..', 'lib', 'whatsappOrder.ts'), 'utf8')
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(code).not.toMatch(/[Aa]irtel|[Mm]oov|[Oo]range/)
  })
})
