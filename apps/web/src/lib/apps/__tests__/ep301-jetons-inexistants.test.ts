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
  it('① L’ŒUVRE MORTE DU TIR 88c94164 EST TOUJOURS REFUSÉE — à l’import', () => {
    // Le vocabulaire a change le 2026-11-01 : GRIS, SEMANTIQUE, RAYON et
    // TYPO n'existent plus — les couleurs, rayons et tailles sont des
    // VARIABLES CSS aux noms de shadcn et de Tailwind. L'œuvre stockee, qui
    // les importe, est donc refusee a l'IMPORT (4 refus) la ou elle l'etait
    // au MEMBRE (11 refus). Meme defaut, grain plus grossier — et c'est
    // precisement pourquoi re-rendre un code deja ecrit ne peut pas prouver
    // le gain du nouveau vocabulaire : seul un tir le dira.
    const d = jugerJetons(OEUVRE_CASSEE, SYSTEME)
    const dits = d.map((x) => x.reference)
    expect(d.length, 'l’œuvre morte passe desormais').toBeGreaterThan(0)
    for (const disparu of ['jetons:GRIS', 'jetons:SEMANTIQUE', 'jetons:RAYON', 'jetons:TYPO']) {
      expect(dits, `${disparu} n’est plus signale`).toContain(disparu)
    }
  })

  it('①bis UNE VARIABLE CSS INVENTÉE EST REFUSÉE — elle rend du VIDE', () => {
    // Pire qu'un jeton invente : var(--primaire) ne PLANTE pas, il ne rend
    // rien. Defaut silencieux, et on sait ce que ca coute ici.
    const d = jugerJetons(
      new Map([['A.tsx', "export const s = { color: 'var(--primaire)', background: 'var(--primary)' }"]]),
      SYSTEME,
    )
    expect(d.map((x) => x.reference)).toContain('var(--primaire)')
    expect(d.map((x) => x.reference), '--primary existe pourtant').not.toContain('var(--primary)')
  })

  it('①ter AUCUN className — il n’existe AUCUNE feuille de style', () => {
    // MESURE : 55 className dans l'œuvre eb7b62b5, zero fichier CSS. Elles
    // ne rendaient rien, sans erreur. Classe maison ou classe Tailwind
    // (« bg-primary »), le resultat est le meme.
    for (const source of ['<div className="bg-primary">x</div>', '<div className={styles.a}>x</div>']) {
      const d = jugerJetons(new Map([['A.tsx', source]]), SYSTEME)
      expect(d.map((x) => x.reference), `« ${source} » est passe`).toContain('className')
    }
  })

  it('② LES VRAIS JETONS PASSENT — contrôle négatif', () => {
    const bonne = new Map([
      [
        'App.tsx',
        "import { ROLE, ESPACE } from './systeme/jetons'\n" +
          "export const s = { ...ROLE.surtitre, color: 'var(--muted-foreground)', padding: ESPACE.m }\n",
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
        "chapeau: { fontSize: 'var(--text-lg)' },\n  legende: {",
      ),
    )
    const oeuvre = new Map([
      ['A.tsx', "import { ROLE } from './systeme/jetons'\nexport const s = ROLE.chapeau\n"],
      ...avecNeuf,
    ])
    expect(jugerJetons(oeuvre, avecNeuf)).toEqual([])
  })
})
