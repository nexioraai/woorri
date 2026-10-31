/**
 * EP-301 — UN JETON QUI N'EXISTE PAS NE PASSE PLUS, et rien ne s'exécute
 * pour l'attraper.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-31 SUR L'ÉCRAN DU PROPRIÉTAIRE.
 *
 * Tir 88c94164, livré par les trois juges — et MORT AU DÉMARRAGE :
 *
 *     Cannot read properties of undefined (reading 'fontSize')
 *
 * Le modèle avait écrit `TYPO.corps`, `TYPO.petit`, `TYPO.h1` : l'échelle
 * n'a QUE quatre niveaux (surtitre, libelle, valeur, legende). L'assembleur
 * ne vérifie pas les types — mesuré et écrit depuis le 2026-10-18 — et la
 * vivacité atteste la liaison, pas l'exécution.
 *
 * ── CE QUE CE CONTRÔLE FERME : LA FAMILLE, PAS L'EXEMPLAIRE.
 *
 * Toute référence à un membre inexistant d'un espace de noms de la
 * bibliothèque (TYPO, GRIS, SEMANTIQUE, ESPACE, RAYON, OMBRE), tout import
 * d'un nom qu'elle n'exporte pas, et toute icône hors des quatorze. Zéro
 * exécution, zéro bac à sable, microsecondes — arbitrage du propriétaire :
 * ce contrôle vient AVANT le juge d'exécution.
 *
 * ── ET LA LISTE SE DÉRIVE DES FICHIERS ÉMIS, jamais recopiée : une liste
 * écrite ici divergerait de la bibliothèque au premier jeton ajouté — c'est
 * la maladie même que ce chantier traite (une liste d'avance à la place de
 * la source).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fichiersSysteme } from '../bibliotheque-ui'
import { jugerJetons } from '../juge-jetons'

const SYSTEME = fichiersSysteme('XAF')

/**
 * L'œuvre RÉELLEMENT LIVRÉE par le tir 88c94164, versionnée au dépôt : une
 * fixture lue dans /tmp ne prouverait rien sur une autre machine — et ce
 * défaut-ci mérite de rester démontrable pour toujours.
 */
const OEUVRE_CASSEE: ReadonlyMap<string, string> = new Map(
  Object.entries(
    JSON.parse(
      readFileSync(join(__dirname, 'fixtures', 'tir-88c94164.json'), 'utf8'),
    ) as Record<string, string>,
  ),
)

describe('EP-301 · les jetons inventés sont refusés sans rien exécuter', () => {
  it('① L’ŒUVRE MORTE DU TIR 88c94164 EST NOMMÉE — TYPO.corps', () => {
    const d = jugerJetons(OEUVRE_CASSEE, SYSTEME)
    const dits = d.map((x) => x.reference)
    expect(dits, 'le jeton qui a tué l’application passe encore').toContain('TYPO.corps')
    expect(dits).toContain('TYPO.petit')
    expect(dits).toContain('TYPO.h1')
    // Et ce n'est pas que TYPO : le modèle a inventé dans TOUS les espaces
    // (GRIS.fond, SEMANTIQUE.attention, RAYON.moyen…). Onze références
    // mortes dans une œuvre déclarée livrée — la famille, pas l'exemplaire.
    expect(d.length, 'le juge n’attrape qu’une partie de la famille').toBeGreaterThanOrEqual(10)
    expect(dits).toContain('GRIS.fond')
    expect(dits).toContain('SEMANTIQUE.attention')
    expect(dits).toContain('RAYON.moyen')
    // Le reproche dit ce qui EXISTE : sinon le modèle devine au tour suivant.
    const typo = d.find((x) => x.reference === 'TYPO.corps')
    expect(typo?.connus).toContain('surtitre')
    expect(typo?.connus).toContain('legende')
  })

  it('② LES VRAIS JETONS PASSENT — contrôle négatif', () => {
    const bonne = new Map([
      [
        'App.tsx',
        "import { TYPO, GRIS, ESPACE } from './systeme/jetons'\n" +
          'export const s = { ...TYPO.surtitre, color: GRIS.g500, padding: ESPACE.m }\n',
      ],
      ...SYSTEME,
    ])
    expect(jugerJetons(bonne, SYSTEME)).toEqual([])
  })

  it('③ UN NOM QUE LA BIBLIOTHÈQUE N’EXPORTE PAS EST REFUSÉ', () => {
    const mauvaise = new Map([
      ['A.tsx', "import { Tableau, Carte } from './systeme/ui'\nexport const a = 1\n"],
      ...SYSTEME,
    ])
    const d = jugerJetons(mauvaise, SYSTEME)
    expect(d.map((x) => x.reference)).toContain('ui:Tableau')
    expect(d.map((x) => x.reference), 'Carte existe pourtant').not.toContain('ui:Carte')
  })

  it('④ UNE ICÔNE HORS DES QUATORZE EST REFUSÉE', () => {
    const mauvaise = new Map([
      ['A.tsx', '<Icone nom="fusee" /><Icone nom="argent" />'],
      ...SYSTEME,
    ])
    const d = jugerJetons(mauvaise, SYSTEME)
    expect(d.map((x) => x.reference)).toContain('Icone nom="fusee"')
    expect(d.map((x) => x.reference)).not.toContain('Icone nom="argent"')
  })

  it('⑤ LA BIBLIOTHÈQUE ELLE-MÊME N’EST PAS JUGÉE — elle est la source', () => {
    expect(jugerJetons(SYSTEME, SYSTEME)).toEqual([])
  })

  it('⑥ LA LISTE EST DÉRIVÉE, PAS RECOPIÉE — un jeton neuf est connu sans ce test', () => {
    // On ajoute un niveau à la VOLÉE dans la source : le juge doit l'accepter
    // aussitôt. S'il portait sa propre liste, il le refuserait.
    const avecNeuf = new Map(SYSTEME)
    avecNeuf.set(
      'systeme/jetons.ts',
      (SYSTEME.get('systeme/jetons.ts') ?? '').replace(
        'legende: {',
        "chapeau: { fontSize: 16 },\n  legende: {",
      ),
    )
    const oeuvre = new Map([
      ['A.tsx', "import { TYPO } from './systeme/jetons'\nexport const s = TYPO.chapeau\n"],
      ...avecNeuf,
    ])
    expect(jugerJetons(oeuvre, avecNeuf)).toEqual([])
  })
})
