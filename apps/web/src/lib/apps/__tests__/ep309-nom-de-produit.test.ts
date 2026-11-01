/**
 * EP-309 — LE PRODUIT A UN NOM, ET AUCUN LITTÉRAL NE LE REMPLACE.
 *
 * ── LE DÉFAUT QUE CES CLIQUETS TIENNENT FERMÉ.
 *
 * Vu par le propriétaire le 2026-11-01 : neuf cartes disant « Application »,
 * un onglet disant « Votre application », un manifeste d'installation du
 * même nom, et une adresse publique à taper à la main. Quatre symptômes,
 * UNE cause — le produit n'avait pas de nom, et trois littéraux cuits dans
 * le moteur tenaient la place d'une donnée.
 *
 * ── CE QU'UN TEST DOIT PROUVER ICI, ET PAS SEULEMENT CONSTATER.
 *
 * Qu'un remplissage est REFUSÉ (pas corrigé en silence), que les littéraux
 * ne sont plus dans le moteur (lu sur le disque, pas supposé), que le nom et
 * l'adresse sont DEUX choses, que le suffixe automatique s'arrête au lieu de
 * numéroter à l'infini, et que les trois phrases que la personne doit lire
 * existent là où elle décide.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  adresseDeSecours,
  adresseProposee,
  AVERTISSEMENT_MARQUE,
  CE_QUE_RENOMMER_CHANGE,
  nomProduitValide,
  REMPLISSAGES,
} from '../nom-produit'
import { NOMS_RESERVES } from '../sous-domaine'
import { verifierExtraction } from '../extraction-exigences'

const lire = (...bouts: string[]) => readFileSync(join(__dirname, '..', '..', '..', ...bouts), 'utf8')

describe('EP-309 — le nom du produit', () => {
  it('① NOS REMPLISSAGES SONT REFUSÉS, avec une phrase à lire', () => {
    for (const mot of REMPLISSAGES) {
      const v = nomProduitValide(mot)
      expect(v.ok, `« ${mot} » est accepté comme nom de produit`).toBe(false)
      // Un refus sans phrase est un mur : la personne doit savoir quoi faire.
      if (!v.ok) expect(v.erreur.length).toBeGreaterThan(30)
    }
    // La casse et les espaces ne doivent pas servir de porte de service.
    expect(nomProduitValide('  Application  ').ok).toBe(false)
    expect(nomProduitValide('APPLICATION').ok).toBe(false)
  })

  it('② LE VOCABULAIRE DES CLIENTS PASSE — on interdit ce qui est à nous', () => {
    // La même inversion que les noms réservés : si ce test rougit parce
    // qu'un nom de métier est refusé, c'est la liste qui a tort.
    for (const nom of ['Tontine', 'Hayine', 'Panier', 'Devis', 'Stock', 'Caisse', 'مركبة', 'Gestion RH']) {
      expect(nomProduitValide(nom).ok, `« ${nom} » refusé`).toBe(true)
    }
  })

  it('③ CE QUI CASSERAIT UN TITRE EST REFUSÉ', () => {
    // Le nom entre dans un `<title>` et dans le JSON du manifeste.
    for (const mauvais of ['Ton<script>', 'Ma "boutique"', 'A & B', 'nom`']) {
      expect(nomProduitValide(mauvais).ok, `« ${mauvais} » accepté`).toBe(false)
    }
    expect(nomProduitValide('a').ok).toBe(false)
    expect(nomProduitValide('x'.repeat(41)).ok).toBe(false)
  })

  it('④ LE NOM ET L’ADRESSE SONT DEUX CHOSES — l’adresse est proposée', () => {
    expect(adresseProposee('Tontine du Logone')).toBe('tontine-du-logone')
    // Un nom qui ne donne aucune adresse latine rend VIDE : l'écran demande
    // au lieu d'inventer `app-` suivi de rien.
    expect(adresseProposee('مركبة')).toBe('')
    // Un nom qui tomberait sur une route du produit ne devient pas une
    // adresse : la liste réservée garde la porte.
    for (const reserve of ['Admin', 'Support', 'Login']) {
      const a = adresseProposee(reserve)
      expect(NOMS_RESERVES.has(a), `« ${reserve} » devient l’adresse réservée « ${a} »`).toBe(false)
    }
  })

  it('⑤ LE SUFFIXE EST UN SECOURS, PAS UNE RÈGLE — il s’arrête', () => {
    expect(adresseDeSecours('Tontine', () => false)).toBe('tontine')
    expect(adresseDeSecours('Tontine', (a) => a === 'tontine')).toBe('tontine-2')
    // Tout pris jusqu'à 9 : on rend VIDE et l'appelant DEMANDE. `tontine-10`
    // ne distingue plus rien, et un nom publié ne se recycle jamais (EP-308)
    // donc la numérotation ne ferait que s'allonger.
    expect(adresseDeSecours('Tontine', () => true)).toBe('')
  })

  it('⑥ LE MOTEUR NE CUIT PLUS DE TITRE — lu sur le disque', () => {
    // C'EST LE CLIQUET CENTRAL. Les trois littéraux étaient à ces trois
    // endroits exacts ; s'ils reviennent, ce test rougit et nomme le fichier.
    const sources: readonly [string, string][] = [
      ['app/api/generateur/direct/route.ts', lire('app', 'api', 'generateur', 'direct', 'route.ts')],
      ['app/p/[jeton]/route.ts', lire('app', 'p', '[jeton]', 'route.ts')],
      ['app/api/generateur/deposer/route.ts', lire('app', 'api', 'generateur', 'deposer', 'route.ts')],
      [
        'components/onboarding/ConversationApplication.tsx',
        lire('components', 'onboarding', 'ConversationApplication.tsx'),
      ],
      ['app/dashboard/page.tsx', lire('app', 'dashboard', 'page.tsx')],
      // LE QUATRIEME ENDROIT, trouve en posant ce cliquet et pas avant :
      // rejouer une oeuvre sans nom lui recuisait « application ».
      ['lib/apps/travailleur.ts', lire('lib', 'apps', 'travailleur.ts')],
    ]
    for (const [chemin, code] of sources) {
      // On cherche le littéral EN POSITION D'ARGUMENT ou de valeur, pas dans
      // la prose des commentaires — qui raconte précisément ce défaut.
      const sansCommentaires = code
        .replace(/\/\*[\s\S]*?\*\//gu, '')
        .replace(/^\s*\/\/.*$/gmu, '')
      for (const litteral of ["'Votre application'", "'Application'", "'application'"]) {
        expect(
          sansCommentaires.includes(litteral),
          `${chemin} cuit encore ${litteral} à la place du nom du produit`,
        ).toBe(false)
      }
    }
  })

  it('⑦ LES TROIS PHRASES EXISTENT LÀ OÙ LA PERSONNE DÉCIDE', () => {
    // L'avertissement sur les marques : dit UNE FOIS, à l'endroit où le nom
    // se choisit. Aucune liste ne protégera d'une marque existante — on ne
    // promet donc rien, on prévient.
    expect(AVERTISSEMENT_MARQUE).toMatch(/marques/u)
    const ecran = lire('components', 'onboarding', 'ConversationApplication.tsx')
    expect(ecran.includes('AVERTISSEMENT_MARQUE'), 'l’écran de génération ne dit rien des marques').toBe(true)
    // Ce que renommer NE change PAS : affiché par le tableau de bord.
    expect(CE_QUE_RENOMMER_CHANGE).toMatch(/INTERIEUR|intérieur/u)
    const bord = lire('app', 'dashboard', 'page.tsx')
    expect(bord.includes('CE_QUE_RENOMMER_CHANGE'), 'renommer promet plus qu’il ne fait').toBe(true)
    // La route de renommage rend la phrase, donc tout autre écran l'aura.
    const route = lire('app', 'api', 'generateur', 'renommer', 'route.ts')
    expect(route.includes('ceQueCaNeChangePas')).toBe(true)
  })

  it('⑧ UNE SEULE RÈGLE D’ADRESSE — plus de slug maison', () => {
    // Le tableau de bord portait sa propre copie, qui ignorait les noms
    // réservés : il proposait une adresse que la route refusait ensuite.
    const bord = lire('app', 'dashboard', 'page.tsx')
    expect(bord.includes('adresseProposee')).toBe(true)
    // ON NE JUGE QUE LA PUBLICATION DES APPLICATIONS. Les SITES ont leur
    // propre proposition d'adresse, qui porte le même défaut (un slug maison
    // qui ignore les noms réservés) — c'est un autre chantier, et faire
    // rougir ce cliquet pour lui rendrait ce test illisible.
    const debut = bord.indexOf('const publier = async (a: Application)')
    // La borne est la DÉCLARATION SUIVANTE, pas une fonction choisie de
    // loin : entre les deux se glissait l'adresse des sites, et le cliquet
    // accusait la publication des applications d'un slug qui n'est pas le
    // sien.
    const fin = bord.indexOf('\n  const ', debut + 1)
    expect(debut, 'la publication des applications a changé de nom').toBeGreaterThan(0)
    expect(fin).toBeGreaterThan(debut)
    expect(
      /normalize\('NFD'\)/u.test(bord.slice(debut, fin)),
      'la publication d’une application refabrique un slug au lieu d’employer la porte unique',
    ).toBe(false)
  })

  it('⑨ L’EXTRACTION PROPOSE UN NOM, AVEC UNE PROVENANCE NUMÉROTÉE', () => {
    const cahier =
      '• Hayine permet aux membres de cotiser chaque semaine.\n' +
      '• Le gestionnaire suit les versements de chaque membre.'
    const ex = verifierExtraction(
      JSON.stringify({
        nomProduit: { nom: 'Hayine', enonce: 1 },
        exigences: [{ nom: 'Cotisations', enonces: [2] }],
        nonExigences: [],
      }),
      cahier,
    )
    expect(ex.nomProduit?.nom).toBe('Hayine')
    expect(ex.nomProduit?.enonce).toBe(1)
    // MESURÉ, PAS DÉCLARÉ : le nom est dans le document, donc on le REPREND.
    expect(ex.nomProduit?.dansLeDocument).toBe(true)
  })

  it('⑩ UN NOM INVENTÉ EST DIT INVENTÉ, et un remplissage est REFUSÉ', () => {
    const cahier =
      '• Les membres cotisent chaque semaine, par groupe.\n' +
      '• Le gestionnaire suit les versements de chacun.'
    const invente = verifierExtraction(
      JSON.stringify({ nomProduit: { nom: 'Koumra', enonce: 1 }, exigences: [{ nom: 'Suivi', enonces: [2] }] }),
      cahier,
    )
    // Le modèle ne peut pas se juger lui-même : c'est nous qui cherchons le
    // nom dans le cahier. L'écran doit pouvoir dire « proposé », pas « lu ».
    expect(invente.nomProduit?.dansLeDocument).toBe(false)

    const remplissage = verifierExtraction(
      JSON.stringify({ nomProduit: { nom: 'Application', enonce: 1 }, exigences: [{ nom: 'Suivi', enonces: [2] }] }),
      cahier,
    )
    expect(remplissage.nomProduit).toBeNull()
    // ET LE REFUS SE VOIT : sans cette ligne, la personne croirait que le
    // modèle n'a rien proposé.
    expect(remplissage.refus.some((r) => r.includes('nom de produit refusé'))).toBe(true)
  })

  it('⑪ L’ADRESSE RESTE SUR UN SEUL NIVEAU — le certificat l’exige', () => {
    // `*.deribfy.app` ne couvre qu'un niveau, et le certificat générique
    // nous est refusé (POST /v7/certs → 449, mesuré le 2026-11-01). Un point
    // dans l'adresse donnerait un nom sans certificat : navigateur rouge.
    expect(adresseProposee('Tontine.Moundou')).toBe('tontine-moundou')
    expect(adresseProposee('a.b.c')).toBe('a-b-c')
  })
})
