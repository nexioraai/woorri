/**
 * EP-302 — « ÇA DÉMARRE » REJOINT LES CRITÈRES D'ACCEPTATION.
 *
 * Tir 88c94164 : assemblé, vivant, couvrant — et mort au démarrage sur
 * l'écran du propriétaire. Le critère est désormais QUADRUPLE. Ce juge monte
 * l'œuvre dans un processus cloisonné et visite TOUS ses écrans.
 *
 * ── LE CLOISONNEMENT, aux conditions du propriétaire (2026-10-31) :
 * ① environnement VIDE — rien à prendre ; ② REFUS RÉSEAU, le verrou qui
 * compte (mesuré : `--permission` ne couvre PAS le réseau) ; ③ permissions
 * en couche de plus ; ④ un processus par tour ; ⑤ plafond MESURÉ.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'
import { fichiersSysteme } from '../bibliotheque-ui'
import { jugerExecution, PLAFOND_MS } from '../juge-execution'

const assembleOuEchoue = async (fichiers: ReadonlyMap<string, string>) => {
  const v = await assembler(fichiers)
  if (!v.ok) throw new Error(`fixture inassemblable : ${v.erreur}`)
  return v.code
}

const page = (corps: string) =>
  new Map([
    [
      'index.tsx',
      "import { createRoot } from 'react-dom/client'\n" +
        `${corps}\n` +
        "export function monter(n: Element) { createRoot(n).render(<App />) }\n",
    ],
    ...fichiersSysteme('XAF'),
  ])

describe('EP-302 · le juge d’exécution', () => {
  it(
    '① L’ŒUVRE MORTE DU TIR 88c94164 NE DÉMARRE PAS, et la cause est nommée',
    async () => {
      const oeuvre = new Map([
        ...Object.entries(
          JSON.parse(
            readFileSync(join(__dirname, 'fixtures', 'tir-88c94164.json'), 'utf8'),
          ) as Record<string, string>,
        ),
        ...fichiersSysteme('XAF'),
      ])
      const v = await jugerExecution(await assembleOuEchoue(oeuvre))
      expect(v.indisponible, 'le juge devait se prononcer').toBeUndefined()
      expect(v.demarre, 'une application morte est déclarée vivante').toBe(false)
      expect(v.erreurs.map((e) => e.message).join(' ')).toMatch(/fontSize/u)
    },
    60_000,
  )

  it(
    '② UNE ŒUVRE SAINE DÉMARRE ET REND — contrôle négatif',
    async () => {
      const code = await assembleOuEchoue(
        page("function App() { return <main><h1>Bonjour</h1><p>25 000 FCFA</p></main> }"),
      )
      const v = await jugerExecution(code)
      expect(v.demarre, v.erreurs.map((e) => e.message).join(' | ')).toBe(true)
      expect(v.octetsRendus).toBeGreaterThan(10)
      expect(v.texte).toContain('Bonjour')
    },
    60_000,
  )

  it(
    '③ UN ÉCRAN QUI PLANTE EST ATTRAPÉ, même si l’accueil va bien',
    async () => {
      // La demi-preuve qui a coûté une journée : l'accueil démarre, l'écran
      // suivant meurt. Le juge ouvre les écrans, donc il le voit.
      const code = await assembleOuEchoue(
        page(
          "import { useState } from 'react'\n" +
            'function App() {\n' +
            "  const [e, setE] = useState('accueil')\n" +
            "  if (e === 'paiements') { const t: any = undefined; return <p>{t.montant}</p> }\n" +
            "  return <nav><button onClick={() => setE('paiements')}>Paiements</button></nav>\n" +
            '}',
        ),
      )
      const v = await jugerExecution(code)
      expect(v.demarre, 'un écran mort est passé inaperçu').toBe(false)
      expect(v.erreurs.map((e) => e.quoi).join(' '), 'l’écran fautif n’est pas nommé').toMatch(
        /Paiements/u,
      )
      expect((v.ecransVisites ?? 0), 'aucun écran n’a été ouvert').toBeGreaterThan(0)
    },
    60_000,
  )

  it(
    '④ LE RÉSEAU EST REFUSÉ — le verrou qui compte, les trois portes',
    async () => {
      const portes = [
        "await fetch('https://exemple.invalid/')",
        "await import('node:net')",
        'new XMLHttpRequest()',
      ]
      const codes = await Promise.all(
        portes.map((porte) =>
          assembleOuEchoue(page(`function App() { return <p>x</p> }\n;(async () => { ${porte} })()`)),
        ),
      )
      const verdicts = await Promise.all(codes.map((code) => jugerExecution(code)))
      verdicts.forEach((v, i) => {
        expect(
          v.erreurs.map((e) => e.message).join(' '),
          `la porte « ${portes[i]!} » n’a pas été refusée`,
        ).toMatch(/RESEAU_REFUSE/u)
      })
    },
    90_000,
  )

  it(
    '⑤ UNE BOUCLE INFINIE EST UN VERDICT, pas une panne du serveur',
    async () => {
      const code = await assembleOuEchoue(
        page('function App() { while (true) {} return <p>jamais</p> }'),
      )
      const v = await jugerExecution(code, { plafondMs: 600 })
      expect(v.demarre).toBe(false)
      expect(v.erreurs[0]?.quoi).toBe('plafond')
    },
    60_000,
  )

  it('⑦ LA PRODUCTION N’INJECTE AUCUN JUGE — le muet reste aux contrôles', () => {
    // Le juge est remplaçable pour que les cliquets de couverture ne paient
    // pas un processus par tour. Le jour où une route passerait `juger`, le
    // démarrage cesserait d'être vérifié SANS QUE RIEN NE LE DISE — c'est
    // exactement la forme de panne que ce dépôt passe ses journées à fermer.
    const nu = (p: string) =>
      readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
    const ROUTE = nu(join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'direct', 'route.ts'))
    expect(ROUTE, 'la route de production désarme le juge d’exécution').not.toMatch(/\bjuger\s*:/u)
    const MUET = nu(join(__dirname, 'juge-muet.ts'))
    expect(MUET, 'le juge muet a quitté le dossier des contrôles').toContain('jugeMuet')
  })

  it('⑥ LE PLAFOND EST MESURÉ — huit fois le pire cas des œuvres stockées', () => {
    // Mesuré : 786 à 1777 ms, visite des écrans comprise. Un plafond sous
    // 5 s serait « trop juste » sur un processeur de fonction plus lent.
    expect(PLAFOND_MS).toBeGreaterThanOrEqual(10_000)
  })
})
