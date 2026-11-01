/**
 * EP-299 — LA BIBLIOTHÈQUE INJECTÉE : Deribfy fournit l'interface, le
 * modèle fournit le métier.
 *
 * Lot UI arbitré le 2026-10-31 (pari du propriétaire, amendé des données
 * cohérentes). Mesuré avant : 55 className sans AUCUNE feuille de style —
 * l'intention tombait dans le vide ; deux niveaux de typo ; zéro icône ;
 * EUR écrit par le modèle. La bibliothèque est injectée par le MOTEUR dans
 * chaque œuvre : corriger ici profite à toutes les générations futures, à
 * coût modèle nul — jamais un correctif dans une œuvre.
 */
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'
import { boucleEcriture, CONSIGNE } from '../boucle-directe'
import { fichiersSysteme } from '../bibliotheque-ui'

const APP_BIBLIOTHEQUE = `import { createRoot } from 'react-dom/client'
import { CarteDeChiffre, EtatVide } from './systeme/ui'
import { formaterMontant } from './systeme/argent'
export function monter(noeud: Element) {
  createRoot(noeud).render(
    <main>
      <CarteDeChiffre icone="argent" libelle="Encaissé ce mois" valeur={formaterMontant(25000)} contexte="+12 % vs octobre — prochaine échéance le 5" ton="succes" />
      <EtatVide message="Aucune réservation" detail="La première apparaîtra ici." />
    </main>,
  )
}`

describe('EP-299 · la bibliothèque injectée', () => {
  it('① LA DEVISE DU CLIENT EST CUITE DANS L’ARGENT — et l’invalide jamais', () => {
    expect(fichiersSysteme('XAF').get('systeme/argent.ts')).toContain("DEVISE = 'XAF'")
    expect(fichiersSysteme(undefined).get('systeme/argent.ts')).toContain('DEVISE = null')
    expect(fichiersSysteme('les 3').get('systeme/argent.ts')).toContain('DEVISE = null')
  })

  it('② UNE ŒUVRE QUI IMPORTE LA BIBLIOTHÈQUE S’ASSEMBLE — react embarqué compris', async () => {
    const carte = new Map([['index.tsx', APP_BIBLIOTHEQUE], ...fichiersSysteme('XAF')])
    const v = await assembler(carte)
    expect(v.ok, v.ok ? '' : v.erreur).toBe(true)
    if (v.ok) expect(v.code.length).toBeGreaterThan(400_000)
  })

  it('③ LE MODÈLE NE PEUT PAS RÉÉCRIRE LA BIBLIOTHÈQUE — l’injection écrase', async () => {
    const appeler = async () => ({
      texte:
        '=== index.tsx ===\n' + APP_BIBLIOTHEQUE +
        '\n=== systeme/argent.ts ===\nexport const DEVISE = "EUR"\nexport const formaterMontant = (n: number) => `${n} €`\n' +
        '\n=== PERIMETRE.md ===\n- rien d’autre : page unique.',
      tronquee: false, jetonsEntree: 1, jetonsSortie: 1,
    })
    const r = await boucleEcriture({
      demande: 'Une carte de chiffre.',
      configuration: { currency: 'XAF' },
      appeler: appeler as never,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.fichiers.get('systeme/argent.ts'), 'la version du modèle a survécu').toContain("DEVISE = 'XAF'")
      expect(r.fichiers.get('systeme/ui.tsx'), 'la bibliothèque n’est pas dans l’œuvre').toContain('CarteDeChiffre')
    }
  })

  it('④ UNE ŒUVRE D’AVANT LA BIBLIOTHÈQUE S’ASSEMBLE INCHANGÉE — non-régression', async () => {
    // Les œuvres stockées (CPA, plateforme) n'importent pas systeme/ : les
    // fichiers injectés inutilisés n'entrent pas dans le bundle.
    const ancienne = new Map([
      ['index.tsx', "import { createRoot } from 'react-dom/client'\nexport const m = (n: Element) => createRoot(n).render(<p>ancienne œuvre</p>)"],
      ...fichiersSysteme(undefined),
    ])
    const v = await assembler(ancienne)
    expect(v.ok).toBe(true)
  })

  it('⑥ AUCUNE PROP PRIVÉE SANS SA CONVENTION — le modèle réflexe React', () => {
    // MESURE DU 2026-11-01, tir 52f34017 : le modele a ecrit
    // <Bouton onClick={f}>Texte</Bouton> — la convention React. Notre
    // composant ne lisait que `texte` et `surClic` : LIBELLE ET
    // GESTIONNAIRE JETES, bouton rendu vide et inerte sur trois ecrans.
    //
    // LA DISTINCTION QUI GOUVERNE CE CLIQUET : les NOMS de nos props, le
    // modele les LIT (mesure : valeur, libelle, icone, contexte, nom,
    // titre — employes correctement, 3x chacun). Les CONVENTIONS, il les
    // REFLEXE (onClick x5, onChange x5, value x8 sur du HTML brut). Ce
    // controle ne touche donc pas aux noms francais : il exige que toute
    // prop privee de type GESTIONNAIRE ou CONTENU accepte AUSSI la forme
    // que React impose au doigt.
    const ui = fichiersSysteme('XAF').get('systeme/ui.tsx') ?? ''
    const CONVENTION_DE: Record<string, string> = {
      texte: 'children', enfant: 'children', enfants: 'children',
      surClic: 'onClick', surAction: 'onClick', onAction: 'onClick',
      surChangement: 'onChange', surSoumission: 'onSubmit',
    }
    const manques: string[] = []
    for (const m of ui.matchAll(/export function (\w+)\(\{([^}]*)\}/gu)) {
      const props = m[2]!.split(',').map((x) => x.split(/[:=]/)[0]!.trim()).filter((x) => x !== '')
      for (const prop of props) {
        const convention = CONVENTION_DE[prop]
        if (convention !== undefined && !props.includes(convention)) {
          manques.push(`${m[1]!} : « ${prop} » sans « ${convention} »`)
        }
      }
    }
    expect(
      manques,
      'un composant porte une prop privée sans accepter la convention que le modèle écrit par réflexe',
    ).toEqual([])
  })

  it('⑤ LA CONSIGNE IMPOSE LA BIBLIOTHÈQUE, l’alignement et les données cohérentes', () => {
    expect(CONSIGNE).toContain('./systeme/ui')
    expect(CONSIGNE).toContain('formaterMontant')
    expect(CONSIGNE, 'l’alignement à gauche n’est plus enseigné').toMatch(/GAUCHE partout/u)
    expect(CONSIGNE, 'les données cohérentes ne sont plus exigées').toMatch(/cas NON\s+NOMINAL/u)
    expect(CONSIGNE, 'la ligne de contexte n’est plus obligatoire').toMatch(/LIGNE DE CONTEXTE/u)
  })
})
