// ÉTAPE 3a (2026-11-13) — CarteVedette : LA FORME QUE LE MODÈLE ÉCRIT, MONTÉE.
//
// MESURÉ (M7, 3 cas sur 3 : pharmacie f1b753a6, rejeux institution et
// réservation) : le modèle écrit `details={[{ libelle, valeur }, …]}` — des
// OBJETS ; la pièce exigeait des paires `[l, v]` (`details.map(([l, v]) => …)`,
// mes commits 6f870335 / 1a73ce63) et l'espace de gestion plantait sur
// « object is not iterable ». La consigne enseignait `details[]` sans la forme
// des éléments ; juge-contrat vérifiait le NOM du réglage, pas sa forme.
//
// Ici LA PIÈCE ASSEMBLÉE EST MONTÉE (assembleur réel, juge d'exécution réel) :
//   ① des objets { libelle, valeur } → l'écran se monte, les lignes s'affichent ;
//   ② des paires [l, v] (œuvres déjà écrites ainsi) → toujours lues ;
//   ③ la consigne enseigne la forme, LUE dans la signature : `details[{libelle, valeur}]`.
// Rouge-puis-vert : l'ancienne pièce (`details.map(([l, v])`) remise →
// ① rouge sur « object is not iterable ».
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'
import { CONSIGNE_BIBLIOTHEQUE, fichiersSysteme } from '../bibliotheque-ui'
import { jugerExecution } from '../juge-execution'
import { signaturesDe } from '../juge-contrat'
import { motifTexte } from './motif-texte'

const page = (carte: string) =>
  new Map([
    [
      'index.tsx',
      "import { createRoot } from 'react-dom/client'\n" +
        "import { CarteVedette } from './systeme/ui'\n" +
        `function App() { return <main>${carte}</main> }\n` +
        "createRoot(document.getElementById('racine')!).render(<App />)\n",
    ],
    ...fichiersSysteme('XAF'),
  ])

const monter = async (carte: string) => {
  const v = await assembler(page(carte))
  if (!v.ok) throw new Error(`fixture inassemblable : ${v.erreur}`)
  return jugerExecution(v.code)
}

describe('étape 3a · CarteVedette accepte la forme que le modèle écrit', () => {
  it(
    '① details en objets { libelle, valeur } : l’écran se monte et les lignes s’affichent',
    async () => {
      const v = await monter(
        `<CarteVedette libelle="Chiffre d'affaires" valeur="250 000 FCFA" contexte="cumul depuis l'ouverture" details={[{ libelle: 'Payées', valeur: '3 commandes' }, { libelle: 'Reste à encaisser', valeur: '1 commande' }]} />`,
      )
      expect(v.indisponible, 'le juge devait se prononcer').toBeUndefined()
      expect(v.erreurs.map((e) => e.message).join(' | ')).not.toMatch(/not iterable/u)
      expect(v.monteDansSimulateur, v.erreurs.map((e) => e.message).join(' | ')).toBe(true)
      expect(v.texte).toContain('Payées')
      expect(v.texte).toContain('3 commandes')
      expect(v.texte).toContain('Reste à encaisser')
    },
    60_000,
  )

  it(
    '② des paires [libellé, valeur] restent lues',
    async () => {
      const v = await monter(`<CarteVedette libelle="Stock" valeur="12" details={[['Entrées', '5'], ['Sorties', '7']]} />`)
      expect(v.monteDansSimulateur, v.erreurs.map((e) => e.message).join(' | ')).toBe(true)
      expect(v.texte).toContain('Entrées')
      expect(v.texte).toContain('Sorties')
    },
    60_000,
  )

  it('③ la consigne enseigne la forme des éléments, lue dans la signature', () => {
    const s = signaturesDe(fichiersSysteme(undefined)).get('CarteVedette')
    expect(s?.listes).toContain('details')
    expect(s?.formes.details).toEqual(['libelle', 'valeur'])
    expect(CONSIGNE_BIBLIOTHEQUE).toMatch(motifTexte('details[{libelle, valeur}]'))
    expect(CONSIGNE_BIBLIOTHEQUE).toMatch(motifTexte('jamais des paires [a, b]'))
  })
})
