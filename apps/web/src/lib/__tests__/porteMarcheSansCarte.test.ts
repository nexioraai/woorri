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
import { contactDirectRequis, encaisseEnLigne } from '../contactDirect'
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

describe('les deux surfaces décident sur le FAIT, plus sur la devise', () => {
  /**
   * Le fichier SANS SES COMMENTAIRES.
   *
   * Sans cela, ce cliquet échouait sur sa propre justification : la fiche
   * explique en commentaire pourquoi elle N'APPELLE PLUS `marcheSansCarte`,
   * et le motif y voyait un appel. Le dépôt connaît déjà ce piège —
   * `jsonLdMounting.test.ts` le documente pour la même raison. On vérifie le
   * CODE, jamais la prose qui l'entoure.
   */
  const lire = (rel: string) =>
    readFileSync(join(process.cwd(), 'src', rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/^[ \t]*\/\/.*$/gmu, '')

  const FICHE = 'app/sites/[slug]/produits/[id]/ProductPageView.tsx'
  const MODALE = 'app/sites/[slug]/themes/MerchantProductModal.tsx'
  const SURFACES = [
    ['fiche', FICHE],
    ['modale', MODALE],
  ] as const

  it('aucune des deux n’appelle `marcheSansCarte` DIRECTEMENT', () => {
    // LE CŒUR DE LA CORRECTION. Tant que les surfaces décidaient sur une
    // chaîne de caractères, chaque orthographe nouvelle (`XAF`, `CFA`, `F`…)
    // faisait disparaître les boutons en silence, et il fallait élargir le
    // test à chaque fois. Elles passent désormais par `contactDirectRequis`,
    // qui lit d'abord une CAPACITÉ de la boutique.
    for (const [nom, rel] of SURFACES) {
      expect(
        /\bmarcheSansCarte\s*\(/u.test(lire(rel)),
        `${nom} : décide encore sur la devise — la prochaine orthographe cassera tout`,
      ).toBe(false)
    }
  })

  it('les deux passent par `contactDirectRequis`', () => {
    for (const [nom, rel] of SURFACES) {
      expect(lire(rel).includes('contactDirectRequis('), `${nom} : ne décide pas sur le fait`).toBe(true)
    }
  })

  it('les DEUX transmettent `encaisseEnLigne` — le fait, pas une devise seule', () => {
    // DETTE M2-233 REFERMÉE. La modale ne pouvait pas transmettre le fait :
    // elle est alimentée par `sites_public`, une VUE qui n'exposait pas
    // `payment_account_id` — colonne sensible, délibérément retenue.
    //
    // J'AI PAYÉ CETTE IGNORANCE PAR UNE PANNE : avoir ajouté la colonne à la
    // projection publique a fait échouer la requête (42703) et servi l'accueil
    // de la plateforme à la place de TOUTES les boutiques sur domaine
    // personnalisé.
    //
    // La vue expose désormais un BOOLÉEN DÉRIVÉ (`encaisse_en_ligne`,
    // `sites_public_encaisse_en_ligne.sql`) — un fait, jamais l'identifiant.
    for (const [nom, rel] of SURFACES) {
      const src = lire(rel)
      const i = src.indexOf('contactDirectRequis(')
      expect(i, `${nom} : appel introuvable`).toBeGreaterThan(-1)
      expect(
        src.slice(i, i + 420).includes('encaisseEnLigne'),
        `${nom} : appelle la décision SANS lui donner le fait qui la fonde`,
      ).toBe(true)
    }
  })

  it('AUCUNE projection publique ne demande `payment_account_id`', () => {
    // LE CLIQUET DE LA PANNE. La vue ne porte QUE le booléen dérivé ; nommer
    // l'identifiant dans une projection publique fait échouer la requête et
    // met les boutiques hors ligne. Ce test relit les deux lecteurs publics.
    for (const rel of [
      'app/sites/[slug]/themes/shared.tsx',
      'app/sites/[slug]/produits/[id]/fetchProduct.ts',
    ]) {
      const code = lire(rel)
      for (const appel of code.match(/\.select\((['"`])[\s\S]*?\1\)/gu) ?? []) {
        expect(
          appel.includes('payment_account_id'),
          `${rel} : une projection publique demande payment_account_id — ${appel.slice(0, 80)}`,
        ).toBe(false)
      }
    }
  })

  it('NI l’une NI l’autre n’exige `forSale` pour ce bloc', () => {
    // `for_sale` décide du PAIEMENT ; ce bloc est l'alternative AU paiement
    // en ligne. Les lier cachait la fonctionnalité là où elle sert —
    // mesuré : 103 produits sur 105 ont `for_sale = false`.
    for (const [nom, rel] of SURFACES) {
      const src = lire(rel)
      const i = src.indexOf('contactDirectRequis(')
      expect(
        /\bforSale\b|\bfor_sale\b/u.test(src.slice(Math.max(0, i - 220), i + 420)),
        `${nom} : \`forSale\` est revenu autour de la décision`,
      ).toBe(false)
    }
  })
})

describe('la décision structurelle — `contactDirectRequis`', () => {
  it('boutique SANS compte d’encaissement : contact affiché, QUELLE QUE SOIT la devise', () => {
    // LE DÉFAUT SIGNALÉ TROIS FOIS PAR LE MARCHAND, en trois orthographes :
    // `XAF`, puis `CFA`, puis `F`. Aucune ne doit plus compter.
    for (const devise of ['XAF', 'CFA', 'F', 'Fr', 'franc', '', null, undefined, 'EUR']) {
      expect(
        contactDirectRequis({ encaisseEnLigne: false, devise, numero: '+23565926592' }),
        `devise « ${String(devise)} » : le contact devrait s’afficher — la boutique ne peut PAS être payée en ligne`,
      ).toBe(true)
    }
  })

  it('boutique QUI encaisse et marché à carte : contact MASQUÉ', () => {
    // Sans cette moitié, on aurait « corrigé » en affichant WhatsApp sur
    // toutes les boutiques Stripe du monde.
    for (const devise of ['EUR', 'USD', 'CAD']) {
      expect(contactDirectRequis({ encaisseEnLigne: true, devise, numero: '+1' })).toBe(false)
    }
  })

  it('boutique qui encaisse MAIS sert un marché sans carte : les deux chemins', () => {
    expect(contactDirectRequis({ encaisseEnLigne: true, devise: 'XAF', numero: '+235' })).toBe(true)
  })

  it('AUCUN numéro : jamais de bouton, même sans encaissement', () => {
    // Un bouton qui ne compose rien est pire que pas de bouton.
    expect(contactDirectRequis({ encaisseEnLigne: false, devise: 'XAF', numero: null })).toBe(false)
    expect(contactDirectRequis({ encaisseEnLigne: false, devise: 'XAF', numero: '' })).toBe(false)
  })

  it('`encaisseEnLigne` lit le compte comme le fait `checkout`', () => {
    // Deux lectures divergentes du même champ produiraient une boutique qui
    // affiche un panier sans pouvoir l'encaisser.
    expect(encaisseEnLigne(null)).toBe(false)
    expect(encaisseEnLigne(undefined)).toBe(false)
    expect(encaisseEnLigne('   ')).toBe(false)
    expect(encaisseEnLigne('acct_123')).toBe(true)
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
