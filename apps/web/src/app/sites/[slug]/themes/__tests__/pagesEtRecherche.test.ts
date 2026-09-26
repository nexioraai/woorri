// ============================================================
// CLIQUET — UNE PAGE QUI PORTE DES PRODUITS, ET UNE BOUTIQUE QU'ON FOUILLE.
//
// TROIS DEMANDES DES MARCHANDS, ET TROIS DÉFAUTS DERRIÈRE.
//
// ── 1. « AJOUTER UNE PAGE NE FAIT RIEN. »
//
// C'était vrai à l'écran, et faux dans les données : la page était bien créée
// et enregistrée — mais VIDE. Or les quatre vitrines filtraient les pages sur
// `p.title || p.content || p.image`. Une page vide n'apparaissait nulle part.
// Le marchand cliquait, allait voir son site, ne trouvait rien, et concluait
// que le bouton était cassé. Il l'était, du seul point de vue qui compte.
//
// ── 2. « IL N'Y A PAS D'ENDROIT POUR METTRE DES PRODUITS DANS LA PAGE. »
//
// Exact. Une page ne portait qu'un titre, un texte et une image. La demande
// est pourtant simple et juste : « une page par article — page colliers, page
// chaussures, page t-shirts ». La sélection vit dans la PAGE (`productIds`)
// et non dans le produit : un collier peut légitimement figurer sur
// « Colliers » et sur « Nouveautés », et aucune colonne n'a été ajoutée.
//
// ── 3. « IL FAUT UNE RECHERCHE EN MODE 2. »
//
// `CatalogSearch` ne sert QUE le catalogue fournisseur, et n'est montée qu'en
// mode 3. Les boutiques qui vendent leur propre stock n'avaient aucune
// recherche : avec quarante articles, un visiteur qui cherche « chaussures »
// fait défiler toute la page ou s'en va.
// ============================================================
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { produitsDeLaPage } from '../PageProduits'
import { chercherDansLaBoutique, normaliserPourRecherche } from '../RechercheBoutique'

const THEMES = join(process.cwd(), 'src', 'app', 'sites', '[slug]', 'themes')
const lire = (f: string) =>
  readFileSync(join(THEMES, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^[ \t]*\/\/.*$/gmu, '')

const VITRINES = ['EditorialTheme.tsx', 'NoirTheme.tsx', 'VifTheme.tsx', 'AuroraTheme.tsx']
const BOUTIQUES = [
  'EditorialShopSection.tsx',
  'VifShopSection.tsx',
  'NoirShopSection.tsx',
  'StorefrontDense.tsx', // la vitrine d'Aurora, qui lui délègue tout son Shop
]

describe('une page ajoutée APPARAÎT', () => {
  it('les quatre vitrines affichent une page qui ne porte QUE des produits', () => {
    // LE DÉFAUT EXACT : une page sans titre ni texte était filtrée. Une page
    // « Colliers » qui ne porte que des colliers doit s'afficher.
    for (const f of VITRINES) {
      expect(
        lire(f).includes('p.productIds?.length'),
        `${f} : une page qui ne porte que des produits reste invisible`,
      ).toBe(true)
    }
  })

  it('les quatre vitrines montent le MÊME composant de grille', () => {
    // Quatre copies divergent : la galerie photo vient de le démontrer, une
    // vitrine était restée en arrière pendant des semaines.
    for (const f of VITRINES) {
      expect(lire(f).includes('<PageProduits'), `${f} : pas de produits dans ses pages`).toBe(true)
      expect(lire(f).includes('produitsDeLaPage('), `${f} : ne résout pas la sélection`).toBe(true)
    }
  })

  it('AUCUNE vitrine n’échappe à la liste', () => {
    const vitrines = readdirSync(THEMES).filter((f) => /^[A-Z]\w+Theme\.tsx$/u.test(f))
    expect(vitrines.sort()).toEqual([...VITRINES].sort())
  })
})

describe('la sélection de produits d’une page', () => {
  const CATALOGUE = [
    { id: 'a', name: 'Collier or' },
    { id: 'b', name: 'Chaussures homme' },
    { id: 'c', name: 'T-shirt blanc' },
  ]

  it('rend les produits DANS L’ORDRE CHOISI, pas celui du catalogue', () => {
    // Le marchand qui range ses colliers attend de les retrouver rangés.
    expect(produitsDeLaPage(CATALOGUE, ['c', 'a']).map((p) => p.id)).toEqual(['c', 'a'])
  })

  it('ignore un identifiant qui ne correspond à RIEN', () => {
    // Article supprimé ou dépublié : une case vide dans la grille serait pire
    // que son absence.
    expect(produitsDeLaPage(CATALOGUE, ['a', 'disparu', 'b']).map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('ne montre pas deux fois le même produit', () => {
    expect(produitsDeLaPage(CATALOGUE, ['a', 'a', 'b']).map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('une page sans sélection ne montre RIEN — jamais tout le catalogue', () => {
    // La moitié qui compte : si l'absence de sélection valait « tout », une
    // page « À propos » afficherait soudain les 40 articles de la boutique.
    expect(produitsDeLaPage(CATALOGUE, undefined)).toEqual([])
    expect(produitsDeLaPage(CATALOGUE, [])).toEqual([])
    expect(produitsDeLaPage(CATALOGUE, 'pas un tableau')).toEqual([])
  })

  it('un produit SANS identifiant ne peut pas être attrapé par hasard', () => {
    const avecAnonyme = [...CATALOGUE, { name: 'Maquette POD' } as { id?: string; name: string }]
    expect(produitsDeLaPage(avecAnonyme, ['undefined', 'null', '']).map((p) => p.name)).toEqual([])
  })
})

describe('la recherche dans la boutique du marchand', () => {
  const CATALOGUE = [
    { name: 'Chaussures Oxford Homme', description: 'Cuir cognac' },
    { name: 'Collier Élégance', description: 'Plaqué or' },
    { name: 'Chemise en coton brodée', description: 'Blanc' },
  ]

  it('trouve malgré les accents et la casse — le visiteur ne les tape pas', () => {
    expect(chercherDansLaBoutique(CATALOGUE, 'elegance').map((p) => p.name)).toEqual(['Collier Élégance'])
    expect(chercherDansLaBoutique(CATALOGUE, 'CHAUSSURES')).toHaveLength(1)
  })

  it('TOUS les mots doivent correspondre — « chaussures homme » n’est pas « chaussures »', () => {
    expect(chercherDansLaBoutique(CATALOGUE, 'chaussures homme')).toHaveLength(1)
    expect(chercherDansLaBoutique(CATALOGUE, 'chaussures collier')).toHaveLength(0)
  })

  it('cherche AUSSI dans la description', () => {
    expect(chercherDansLaBoutique(CATALOGUE, 'cognac').map((p) => p.name)).toEqual(['Chaussures Oxford Homme'])
  })

  it('une requête vide rend TOUT — une boutique dont personne ne cherche ne change pas', () => {
    expect(chercherDansLaBoutique(CATALOGUE, '')).toHaveLength(3)
    expect(chercherDansLaBoutique(CATALOGUE, '   ')).toHaveLength(3)
  })

  it('n’invente AUCUN résultat', () => {
    // Pas de correspondance approximative : un article sans rapport qui
    // remonte fait perdre confiance dans la recherche entière.
    expect(chercherDansLaBoutique(CATALOGUE, 'téléphone')).toHaveLength(0)
  })

  it('la normalisation est réellement branchée — sinon ce cliquet ne garde rien', () => {
    expect(normaliserPourRecherche('  ÉLÉGANCE  ')).toBe('elegance')
  })
})

describe('la recherche est montée sur les quatre vitrines boutique', () => {
  it('chacune passe par le MÊME conteneur', () => {
    for (const f of BOUTIQUES) {
      expect(lire(f).includes('<GrilleCherchable'), `${f} : aucune recherche`).toBe(true)
    }
  })

  it('les cartes restent rendues PAR LE SERVEUR — le catalogue doit rester indexable', () => {
    // La moitié qui empêche de « corriger » en refaisant les cartes côté
    // client : Google ne lirait plus le catalogue, et la page n'afficherait
    // rien avant le premier script.
    for (const f of BOUTIQUES.filter((x) => x !== 'StorefrontDense.tsx')) {
      expect(
        lire(f).startsWith("'use client'"),
        `${f} : la section boutique est devenue un composant client`,
      ).toBe(false)
    }
  })

  it('les liens produits portent le chemin COMPLET', () => {
    // `/produits/x` marche sur un domaine personnalisé — `proxy.ts` y réécrit
    // tout — mais PAS sur le domaine de la plateforme, où la boutique vit
    // sous `/sites/{slug}`. Un lien relatif y mènerait à une page inexistante,
    // et le défaut ne se verrait QUE sur l'aperçu propriétaire.
    const src = lire('PageProduits.tsx')
    expect(
      /href=\{`\/sites\/\$\{slug\}\/produits\//u.test(src),
      'lien relatif : la page produit sera introuvable sur le domaine de la plateforme',
    ).toBe(true)
  })

  it('la barre ne s’affiche pas sur une toute petite boutique', () => {
    // Une recherche sur six articles est du bruit : le visiteur voit déjà tout.
    expect(lire('RechercheBoutique.tsx').includes('seuil = 6')).toBe(true)
  })
})
