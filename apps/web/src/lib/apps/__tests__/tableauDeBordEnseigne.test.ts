// 2026-11-12 — « IL FAUT APPRENDRE À DERIBFY À FAIRE CE GENRE DE DASHBOARD ».
//
// Ce que ce fichier verrouille :
//   ① la bibliothèque injectée FOURNIT les pièces du tableau de bord et les
//      calculs sur les vraies données ;
//   ② la CONSIGNE enseigne au modèle quand les employer, et interdit les
//      chiffres en dur ;
//   ③ les fonds (blanc par défaut, beige, gris, nuit) existent ;
//   ④ l'état vide ne perd plus son texte (défaut mesuré en ligne, « asosa ») ;
//   ⑤ la dérogation « navigateur » de bibliotheque-ui.ts reste BORNÉE aux
//      chaînes émises.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fichiersSysteme, VARIABLES_CSS } from '../bibliotheque-ui'
import { CONSIGNE } from '../boucle-directe'
import { motifTexte } from './motif-texte'

const sys = fichiersSysteme('XAF')
const ui = sys.get('systeme/ui.tsx') ?? ''
const donnees = sys.get('systeme/donnees.ts') ?? ''

describe('le tableau de bord enseigné à Deribfy', () => {
  it('① les pièces et les calculs sont fournis', () => {
    for (const piece of ['CoqueGestion', 'GrilleTableau', 'CarteVedette', 'Courbe', 'Barres', 'Anneau', 'Classement', 'ListeRecente', 'ChoixApparence']) {
      expect(ui, `pièce absente : ${piece}`).toMatch(new RegExp(`export function ${piece}\\b`))
    }
    for (const calcul of ['parMois', 'parJour', 'sommeParMois', 'compterPar', 'somme', 'recents', 'tendance', 'plusRecents', 'ilYA']) {
      expect(donnees, `calcul absent : ${calcul}`).toMatch(new RegExp(`export function ${calcul}\\b`))
    }
  })

  it('② la consigne enseigne la composition et interdit les chiffres en dur', () => {
    expect(CONSIGNE).toMatch(motifTexte('UN ESPACE DE GESTION = <CoqueGestion>'))
    expect(CONSIGNE).toMatch(motifTexte('AUCUN chiffre en dur'))
    expect(CONSIGNE).toMatch(motifTexte('<ChoixApparence />'))
  })

  it('③ quatre fonds, blanc par défaut', () => {
    for (const fond of ['beige', 'gris', 'nuit']) expect(VARIABLES_CSS).toContain(`:root[data-fond="${fond}"]`)
    expect(ui).toMatch(motifTexte("fond: 'blanc', couleur: null"))
  })

  it('④ l’état vide accepte titre= et description=', () => {
    expect(ui).toMatch(motifTexte('const texte = message ?? titre'))
    expect(ui).toMatch(motifTexte('const sous = detail ?? description'))
  })

  it('⑤ hors des chaînes émises, aucune API de navigateur dans bibliotheque-ui.ts', () => {
    const source = readFileSync(join(__dirname, '..', 'bibliotheque-ui.ts'), 'utf8')
    // On retire les deux chaînes émises (UI et DONNEES) ; ce qui reste est
    // le code que Deribfy exécute lui-même.
    const reste = source
      .replace(/const UI = `[\s\S]*?\n`\n/, '')
      .replace(/const DONNEES = `[\s\S]*?\n`/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    expect(reste).not.toMatch(/\b(window|document|localStorage|location)\./)
  })
})
