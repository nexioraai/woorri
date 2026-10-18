/**
 * EP-274 — L'OPTION 1 : L'IA ÉCRIT LE CODE, LE COMPILATEUR LUI RÉPOND.
 *
 * ── POURQUOI CETTE SECONDE ARCHITECTURE EXISTE, MESURÉ LE 2026-10-18.
 *
 * Le moteur actuel ne connaît que ONZE gestes et TREIZE formes d'écran.
 * Aucun geste ne s'appelle « calculer ». Aucune forme ne prend une photo.
 *
 * Sur la demande du propriétaire — « calculer ma facture SNE » — le bouton
 * émis « Calculer ma facture » NAVIGUE vers un formulaire ; les sept règles
 * du document sont toutes des validations ; 85, 125 et 402 n'y figurent que
 * comme texte. L'opération demandée n'existe nulle part. 13 tirs, 66 $, zéro
 * application livrée.
 *
 * On ne peut pas apprendre un geste par métier : la liste n'a pas de fin.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * Les deux moitiés que l'option 1 ajoute, et qui doivent être justes AVANT
 * qu'un seul appel payant ne parte :
 *
 *   ① LIRE ce que le modèle écrit — du texte libre, pas une grammaire ;
 *   ② REFUSER ce qui casserait un build natif, gratuitement et par son nom.
 *
 * ── CE QU'IL NE PROUVE PAS.
 *
 * 🟠 Que le modèle écrive du bon code. Ça se mesure sur un tir, et le
 *    propriétaire décidera quand. Ici on prouve que la MACHINE qui le reçoit
 *    est juste — et qu'elle ne laissera pas passer un import qui ferait
 *    casser un build EAS à quarante minutes.
 */
import { describe, expect, it } from 'vitest'
import {
  PAQUETS_AUTORISES,
  importsDe,
  importsInterdits,
  lireFichiers,
  paquetDe,
} from '../ecriture-directe'
import { assembler } from '../bac-a-sable'

describe('EP-274 · lire ce que le modèle écrit', () => {
  it('① PLUSIEURS FICHIERS, dans l’ordre, contenus intacts', () => {
    const f = lireFichiers(
      [
        '=== index.tsx ===',
        "import { facture } from './calcul'",
        'console.log(facture(159))',
        '=== calcul.ts ===',
        'export const facture = (kwh: number) =>',
        '  Math.min(kwh, 150) * 85 + Math.max(0, kwh - 150) * 125 + 402',
      ].join('\n'),
    )
    expect(f.length, 'les fichiers ne sont pas séparés').toBe(2)
    expect(f[0]?.chemin).toBe('index.tsx')
    expect(f[1]?.chemin).toBe('calcul.ts')
    // LE CONTENU N'EST PAS AMPUTÉ — la ligne du séparateur suivant ne doit
    // pas être emportée, et la dernière ligne du fichier doit survivre.
    expect(f[0]?.contenu).toContain('console.log(facture(159))')
    expect(f[0]?.contenu, 'le séparateur suivant a été avalé dans le contenu').not.toContain('===')
    expect(f[1]?.contenu).toContain('* 125 + 402')
  })

  it('② DU TEXTE SANS AUCUN FICHIER NE DONNE RIEN — et ne lève pas', () => {
    // Le modèle peut bavarder avant d'écrire, ou tout rater. Les deux cas
    // doivent rendre une liste vide, pas une exception : c'est la boucle de
    // réparation qui décide quoi faire, pas le lecteur.
    for (const t of ['', 'Bonjour ! Voici votre application.', '=== ===']) {
      expect(lireFichiers(t).length, `« ${t.slice(0, 20)} » a produit un fichier`).toBe(0)
    }
  })

  it('③ LES IMPORTS SE LISENT, paquets comme fichiers voisins', () => {
    const i = importsDe(
      [
        "import React from 'react'",
        "import { View } from 'react-native'",
        "import { calcul } from './calcul'",
        "export { x } from '../lib/x'",
      ].join('\n'),
    )
    expect(i).toContain('react')
    expect(i).toContain('react-native')
    expect(i).toContain('./calcul')
    expect(paquetDe('expo-font/build/x')).toBe('expo-font')
    expect(paquetDe('@react-navigation/native/dist/y')).toBe('@react-navigation/native')
  })
})

describe('EP-274 · refuser ce qui casserait un build natif', () => {
  it('④ UN PAQUET HORS LISTE EST REFUSÉ, ET NOMMÉ', () => {
    // ── POURQUOI CE REFUS EST LE CONTRÔLE LE PLUS IMPORTANT DU FICHIER.
    //
    // Le natif est la raison d'être du produit : Google Play et l'App Store.
    // Un paquet imprévu casse le build EAS à quarante minutes, change
    // l'empreinte native déclarée, et fait refuser une soumission.
    //
    // CODE LIBRE, DÉPENDANCES FERMÉES. L'IA écrit ce qu'elle veut ; elle
    // n'importe que ce que le train de release a déjà épinglé, construit et
    // prouvé sur les appareils du banc A1→A11.
    const mauvais = importsInterdits([
      { chemin: 'index.tsx', contenu: "import moment from 'moment'\nimport L from 'lodash'" },
    ])
    expect(mauvais, 'des paquets inconnus traversent jusqu’au build').toEqual(['lodash', 'moment'])
  })

  it('④bis UN IMPORT DYNAMIQUE NE PASSE PAS — trou trouvé dans mon propre code', () => {
    // ── CE CONTRÔLE N'EXISTAIT PAS, ET LE TROU ÉTAIT GRAND OUVERT.
    //
    // Mesuré le 2026-10-18 en cherchant mes propres défauts : `await
    // import('lodash')` et `require('moment')` ne voyaient RIEN passer —
    // zéro import lu, zéro refus. N'importe quel paquet pouvait atteindre un
    // build EAS par cette porte, casser à quarante minutes, et changer
    // l'empreinte native déclarée au magasin.
    //
    // Le garde-fou le plus strict ne vaut rien s'il regarde à côté.
    const sournois = [
      "const a = await import('lodash')",
      "const b = require('moment')",
      "const c = import( 'dayjs' )",
    ].join('\n')
    expect(importsInterdits([{ chemin: 'a.tsx', contenu: sournois }])).toEqual([
      'dayjs',
      'lodash',
      'moment',
    ])
    // Et un chargement différé LÉGITIME reste permis.
    expect(
      importsInterdits([{ chemin: 'b.tsx', contenu: "const d = await import('react-native-svg')" }]),
    ).toEqual([])
  })

  it('⑤ LES QUATORZE PAQUETS DU TRAIN PASSENT, et les fichiers voisins aussi', () => {
    // Contrôle NÉGATIF : sans lui, le ④ passerait même si TOUT était refusé.
    const fichiers = PAQUETS_AUTORISES.map((p, i) => ({
      chemin: `f${String(i)}.tsx`,
      contenu: `import x from '${p}'`,
    }))
    fichiers.push({ chemin: 'g.tsx', contenu: "import y from './voisin'\nimport z from '../lib/a'" })
    expect(importsInterdits(fichiers), 'un paquet légitime est refusé').toEqual([])
  })

  it('⑥ UN SOUS-CHEMIN D’UN PAQUET AUTORISÉ PASSE', () => {
    // `expo-font/build/x` et `@expo/vector-icons/Ionicons` sont des usages
    // réels du dépôt : les refuser interdirait ce que le moteur fait déjà.
    expect(
      importsInterdits([
        {
          chemin: 'a.tsx',
          contenu: "import a from 'expo-font/build/x'\nimport I from '@expo/vector-icons/Ionicons'",
        },
      ]),
    ).toEqual([])
  })
})

describe('EP-274 · le bac à sable juge, et il dit la vérité sur ce qu’il voit', () => {
  const carte = (o: Record<string, string>) => new Map(Object.entries(o))

  it('⑦ DU CODE QUI TIENT S’ASSEMBLE', async () => {
    const v = await assembler(
      carte({
        'index.tsx': "import { facture } from './calcul'\nconsole.log(facture(159))",
        'calcul.ts':
          'export const facture = (kwh: number) => Math.min(kwh,150)*85 + Math.max(0,kwh-150)*125 + 402',
      }),
    )
    expect(v.ok, v.ok ? '' : `refusé à tort : ${v.erreur}`).toBe(true)
    if (v.ok) expect(v.code.length, 'rien n’est produit').toBeGreaterThan(0)
  })

  it('⑧ UNE SYNTAXE CASSÉE EST ATTRAPÉE, et l’erreur est RENVOYABLE au modèle', async () => {
    const v = await assembler(carte({ 'index.tsx': 'const x = {{{ ;' }))
    expect(v.ok, 'du code invalide est accepté').toBe(false)
    if (!v.ok) {
      expect(v.erreur.length, 'l’erreur est vide : le modèle ne saura pas quoi corriger').toBeGreaterThan(10)
      // Elle est BORNÉE : chaque caractère renvoyé au modèle est payé, et une
      // pile d'appels de notre serveur ne l'aide en rien.
      expect(v.erreur.length).toBeLessThanOrEqual(1200)
    }
  })

  it('⑨ UN IMPORT QUI NE POINTE SUR RIEN EST REFUSÉ — le vert aveugle fermé', async () => {
    // ── SANS CE REFUS, L'APPLICATION SERAIT LIVRÉE ET PLANTERAIT.
    //
    // Un bundler traite par défaut un import non résolu comme une dépendance
    // EXTERNE : il assemble sans broncher. `./calcul` absent passerait, et le
    // défaut n'apparaîtrait qu'à l'ouverture, chez la personne.
    const v = await assembler(carte({ 'index.tsx': "import { f } from './absent'\nf()" }))
    expect(v.ok, 'un import vers un fichier inexistant traverse').toBe(false)
  })

  it('⑩ ET ON DIT CE QU’IL NE VOIT PAS — une variable inconnue PASSE', async () => {
    // Mesuré le 2026-10-18. Un assembleur assemble ; il ne vérifie pas les
    // types. Le taire livrerait une application qui se construit et plante.
    // `tsc` reste donc nécessaire après lui, et ce contrôle existe pour que
    // personne ne croie le contraire.
    const v = await assembler(carte({ 'index.tsx': 'console.log(TOTALEMENT_INCONNU)' }))
    expect(
      v.ok,
      'si ceci devient faux, l’assembleur attrape désormais les variables ' +
        'inconnues — bonne nouvelle, mais le commentaire ci-dessus ment',
    ).toBe(true)
  })

  it('⑪ UN FICHIER D’ENTRÉE ABSENT SE DIT, sans lever', async () => {
    const v = await assembler(carte({ 'autre.tsx': 'export const x = 1' }))
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.erreur).toContain('index.tsx')
  })
})
