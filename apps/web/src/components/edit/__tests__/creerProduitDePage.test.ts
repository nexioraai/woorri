// ============================================================
// CLIQUET — ON CRÉE UN PRODUIT DEPUIS LA PAGE, ET C'EST UN VRAI PRODUIT.
//
// ── CE QUE J'AVAIS MAL COMPRIS.
//
// J'ai d'abord livré un SÉLECTEUR : cocher, parmi les articles existants,
// ceux qui figurent sur la page. Ce n'était pas la demande.
//
//     « Je ne cherche pas à ajouter des produits existants,
//       il faut pouvoir en ajouter d'autres. »
//
// Le marchand qui crée une page « Chaussures » veut y SAISIR ses chaussures.
// L'aller-retour — quitter la page, créer l'article ailleurs, revenir le
// cocher — c'est exactement le travail qu'on prétendait lui épargner.
//
// ── CE QUE CE CLIQUET GARDE, ET POURQUOI CHAQUE POINT COMPTE.
//
// 1. Le produit entre dans `shop_products` par la route normale. S'il n'était
//    qu'un bloc de page, il n'aurait ni fiche, ni adresse, ni boutons
//    WhatsApp / appel / Mobile Money — on ne pourrait ni l'acheter ni le
//    retrouver.
// 2. Il est PUBLIÉ d'emblée : un brouillon invisible rejouerait le défaut
//    d'origine — le marchand agit, et rien n'apparaît.
// 3. Les photos passent par la chaîne habituelle (orientation, métadonnées
//    GPS retirées). Deux chemins d'envoi divergeraient.
// 4. L'appel porte son jeton — le défaut payé le jour même sur le sélecteur.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const lire = (...p: string[]) =>
  readFileSync(join(process.cwd(), 'src', ...p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^[ \t]*\/\/.*$/gmu, '')

const CREATEUR = lire('components', 'edit', 'CreerProduitDePage.tsx')
const NAVBAR = lire('components', 'Navbar.tsx')

describe('le produit créé depuis une page est un VRAI produit', () => {
  it('il est créé par la route normale des produits', () => {
    // S'il n'était qu'un bloc de page, il n'aurait ni fiche, ni adresse, ni
    // boutons de contact : invendable et introuvable.
    expect(CREATEUR.includes("'/api/shop/products'"), 'le produit n’entre pas en boutique').toBe(true)
    expect(/method: 'POST'/u.test(CREATEUR)).toBe(true)
  })

  it('l’appel porte son JETON — le défaut payé le jour même', () => {
    // Le sélecteur envoyait `credentials: 'include'` : 401, et le marchand
    // voyait « Impossible de charger vos produits ».
    const i = CREATEUR.indexOf("'/api/shop/products'")
    expect(CREATEUR.slice(Math.max(0, i - 400), i + 400).includes('Authorization')).toBe(true)
  })

  it('il est PUBLIÉ d’emblée — sinon le marchand agit et rien n’apparaît', () => {
    expect(/published: true/u.test(CREATEUR), 'produit créé en brouillon invisible').toBe(true)
  })

  it('il ne NOMME PAS `for_sale` — le défaut SQL vaut `true`', () => {
    // Un cliquet du dépôt (`inventoryPolicyRatchets`) garde l'achetabilité
    // comme une décision rare et localisée : la seule exception concerne les
    // prix GÉNÉRÉS, qui naissent non achetables tant que le marchand ne les a
    // pas vérifiés. Ici, c'est le marchand lui-même qui tape le prix.
    expect(
      /for_sale/u.test(CREATEUR),
      'ce fichier nomme `for_sale` : il devient une seconde autorité sur l’achetabilité',
    ).toBe(false)
  })

  it('les photos passent par la chaîne habituelle', () => {
    // Orientation redressée, métadonnées retirées — un téléphone met des
    // coordonnées GPS dans une photo de produit.
    expect(CREATEUR.includes("'/api/images/upload'"), 'chemin d’envoi parallèle').toBe(true)
    expect(CREATEUR.includes('amelioration?.url'), 'la retouche n’est pas appliquée').toBe(true)
  })

  it('un ancien prix INFÉRIEUR au prix n’est pas envoyé', () => {
    // Sinon la fiche afficherait une « remise » négative.
    expect(/> Number\(prix/u.test(CREATEUR), 'l’ancien prix n’est pas comparé au prix').toBe(true)
  })

  it('le champ NOM et le champ PRIX sont exigés', () => {
    expect(CREATEUR.includes('labels.needName')).toBe(true)
    expect(CREATEUR.includes('labels.needPrice')).toBe(true)
  })

  it('la fiche porte bien une DESCRIPTION — c’est ce qui fait une fiche', () => {
    expect(/description: description\.trim\(\)/u.test(CREATEUR)).toBe(true)
  })
})

describe('le créateur est monté dans l’éditeur de page', () => {
  it('il y est, et il ajoute le produit créé À CETTE page', () => {
    expect(NAVBAR.includes('<CreerProduitDePage'), 'aucun créateur dans l’éditeur de page').toBe(true)
    const i = NAVBAR.indexOf('<CreerProduitDePage')
    const bloc = NAVBAR.slice(i, i + 900)
    expect(bloc.includes("updateArrayItem('pages'"), 'le produit créé n’est pas rattaché à la page').toBe(true)
    expect(bloc.includes('productIds'), 'le produit créé n’entre pas dans la sélection').toBe(true)
  })

  it('la liste des produits se RECHARGE après une création', () => {
    // Sans cela, l'article créé serait ajouté à la page mais absent de la
    // liste juste en dessous : « 1 produit sur cette page » et aucune ligne
    // cochée. Le marchand conclurait que ça n'a pas marché.
    expect(/setVersionProduits\(\(v\) => v \+ 1\)/u.test(NAVBAR), 'pas de rechargement').toBe(true)
    expect(/key=\{versionProduits\}/u.test(NAVBAR), 'la liste n’est pas remontée').toBe(true)
  })

  it('le sélecteur d’articles EXISTANTS reste disponible', () => {
    // On n'échange pas une fonction contre l'autre : créer un article ET
    // ranger sur la page un article déjà en boutique sont deux besoins
    // distincts, tous deux réels.
    expect(NAVBAR.includes('<ChoixProduitsDePage'), 'le sélecteur a disparu').toBe(true)
  })
})
