// ============================================================
// CLIQUET — DEUX SURFACES, UNE SEULE RÈGLE.
//
// LE DÉFAUT SIGNALÉ PAR LE MARCHAND : il ajoute « Chaussures homme » à la
// boutique Chanorfie, et sa fiche n'a NI WhatsApp, NI appel, NI Mobile Money —
// alors que les produits générés les affichent dans la collection.
//
// DEUX CAUSES, et aucune n'était celle qu'on croyait :
//
//   1. IL AVAIT SAISI `CFA`, les produits générés portaient `XAF`. La porte ne
//      connaissait que le code ISO. Il n'avait pas tort : `CFA` EST le franc
//      CFA — personne ne tape un code ISO, on tape ce qu'on lit.
//
//   2. LA FICHE EXIGEAIT `for_sale`, LA MODALE NON. Or `for_sale` gouverne ce
//      qu'on peut PAYER (panier, carte), et ce bloc est le parcours des
//      marchés SANS carte. On cachait WhatsApp exactement là où il est le seul
//      moyen d'acheter. MESURÉ : 103 produits sur 105 ont `for_sale = false`.
//      Le bloc était donc invisible sur 98 % du catalogue.
//
// CE QUE CE CLIQUET GARDE : la porte reconnaît ce que les marchands ÉCRIVENT,
// et les deux surfaces posent la MÊME condition.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { marcheSansCarte, numerosDEncaissement } from '../whatsappOrder'

describe('la porte reconnaît ce que les marchands ÉCRIVENT', () => {
  it('accepte toutes les écritures réelles du franc CFA', () => {
    for (const d of ['XAF', 'XOF', 'CFA', 'FCFA', 'F CFA', 'cfa', '  CFA  ', 'francs CFA', 'Franc CFA']) {
      expect(marcheSansCarte(d), `« ${d} » refusé alors que c’est du franc CFA`).toBe(true)
    }
  })

  it('REFUSE les marchés à carte — la porte doit rester une porte', () => {
    // Sans cette moitié, on aurait « corrigé » en ouvrant à tout le monde, et
    // les marchés Stripe se seraient retrouvés avec des boutons WhatsApp.
    for (const d of ['EUR', 'USD', 'CAD', 'GBP', 'MAD', '', null, undefined]) {
      expect(marcheSansCarte(d), `« ${String(d)} » accepté à tort`).toBe(false)
    }
  })

  it('ne se déclenche pas sur un mot qui CONTIENT « cfa » par hasard', () => {
    // `SCAFFOLD` contient « cfa »… non, mais le motif doit être ancré quand
    // même : une devise est un mot entier, jamais un fragment.
    for (const d of ['SCAFFOLD', 'CFAB', 'XCFAX', 'AFRICA']) {
      expect(marcheSansCarte(d), `« ${d} » accepté à tort`).toBe(false)
    }
  })

  it('le LIBELLÉ de prix sert de repli quand la devise manque', () => {
    expect(marcheSansCarte(null, '20 000 FCFA')).toBe(true)
    expect(marcheSansCarte('', '450 000 XAF')).toBe(true)
    expect(marcheSansCarte(null, '20,00 €')).toBe(false)
  })
})

describe('les deux surfaces posent la MÊME condition', () => {
  const lire = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8')

  const FICHE = 'app/sites/[slug]/produits/[id]/ProductPageView.tsx'
  const MODALE = 'app/sites/[slug]/themes/MerchantProductModal.tsx'

  it('NI la fiche NI la modale n’exigent `forSale` pour ce bloc', () => {
    // LE CŒUR DU DÉFAUT. `for_sale` décide du PAIEMENT ; ce bloc est
    // l'alternative AU paiement en ligne. Les lier cache la fonctionnalité
    // précisément là où elle sert.
    for (const [nom, src] of [['fiche', lire(FICHE)], ['modale', lire(MODALE)]] as const) {
      const lignes = src.split('\n').filter((l) => l.includes('marcheSansCarte(') && l.includes('&&'))
      expect(lignes.length, `${nom} : aucune condition trouvée — la lecture a dérivé`).toBeGreaterThan(0)
      for (const l of lignes) {
        expect(
          /\bforSale\b|\bfor_sale\b/u.test(l),
          `${nom} : \`forSale\` est revenu dans la condition — ${l.trim().slice(0, 90)}`,
        ).toBe(false)
      }
    }
  })

  it('les deux exigent un NUMÉRO — on ne montre jamais un bouton mort', () => {
    for (const [nom, src] of [['fiche', lire(FICHE)], ['modale', lire(MODALE)]] as const) {
      const lignes = src.split('\n').filter((l) => l.includes('marcheSansCarte(') && l.includes('&&'))
      for (const l of lignes) {
        expect(/whatsapp/iu.test(l), `${nom} : condition sans numéro — ${l.trim().slice(0, 90)}`).toBe(true)
      }
    }
  })
})

describe('Mobile Money — jamais une liste vide quand un numéro existe', () => {
  it('à défaut de liste dédiée, le numéro de contact est proposé', () => {
    // Chanorfie a `mobile_money: []` : sans ce repli, la section Mobile Money
    // serait vide alors que le marchand a bien un numéro.
    expect(numerosDEncaissement([], '+23565926592')).toEqual([{ label: '', number: '+23565926592' }])
  })

  it('la liste du marchand a la priorité sur le repli', () => {
    const liste = [{ label: 'Airtel', number: '+23560000000' }]
    expect(numerosDEncaissement(liste, '+23565926592')).toEqual(liste)
  })

  it('aucun numéro nulle part → liste vide, jamais une invention', () => {
    expect(numerosDEncaissement([], null)).toEqual([])
  })
})
