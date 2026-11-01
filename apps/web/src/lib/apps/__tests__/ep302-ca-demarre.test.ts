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
      // L'OEUVRE EST JUGEE TELLE QU'ELLE A ETE LIVREE, avec SA bibliotheque.
      // Y injecter la bibliotheque COURANTE la rendrait inassemblable des
      // que le vocabulaire change — or ce n'est pas ce qui se passe en
      // production : les routes de relecture assemblent les fichiers
      // STOCKES, bibliotheque comprise (verifie le 2026-11-01). C'est ce
      // qui garde revisibles les oeuvres deja livrees.
      const oeuvre = new Map(
        Object.entries(
          JSON.parse(
            readFileSync(join(__dirname, 'fixtures', 'tir-88c94164.json'), 'utf8'),
          ) as Record<string, string>,
        ),
      )
      const v = await jugerExecution(await assembleOuEchoue(oeuvre))
      expect(v.indisponible, 'le juge devait se prononcer').toBeUndefined()
      expect(v.monteDansSimulateur, 'une application morte est déclarée vivante').toBe(false)
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
      expect(v.monteDansSimulateur, v.erreurs.map((e) => e.message).join(' | ')).toBe(true)
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
      expect(v.monteDansSimulateur, 'un écran mort est passé inaperçu').toBe(false)
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
      expect(v.monteDansSimulateur).toBe(false)
      expect(v.erreurs[0]?.quoi).toBe('plafond')
    },
    60_000,
  )

  it('⑧ UN JUGE INDISPONIBLE SE DIT — jamais un silence poli', () => {
    // Troisieme visage du meme defaut en une journee (le proprietaire l'a
    // nomme) : « indisponible » allait devenir ce que « hors perimetre »
    // allait devenir. Une oeuvre livree pendant qu'un juge ne tournait pas
    // est une oeuvre dont PERSONNE ne sait qu'elle n'a pas ete eprouvee.
    const nu = (p: string) =>
      readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
    const ROUTE = nu(join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'direct', 'route.ts'))
    expect(ROUTE, 'un juge indisponible ne remonte pas aux diagnostics').toMatch(
      /indisponible !== undefined[\s\S]{0,200}PAS/u,
    )
    const ECRAN = nu(
      join(__dirname, '..', '..', '..', 'components', 'onboarding', 'ConversationApplication.tsx'),
    )
    expect(ECRAN, 'l’écran tait le juge indisponible').toMatch(
      /exec\.indisponible !== undefined/u,
    )
  })

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

  it(
    '⑩ LES CONTRÔLES NÉS APRÈS NAVIGATION SONT VUS — et le reste est DIT',
    async () => {
      // MESURÉ le 2026-10-31 : la première version énumérait UNE SEULE FOIS,
      // avant tout clic. Un écran atteint depuis un autre écran n'était donc
      // JAMAIS ouvert, et le rapport disait « démarrage vérifié » sans un
      // mot. Sixième visage du même défaut.
      const code = await assembleOuEchoue(
        page(
          "import { useState } from 'react'\n" +
            'function App() {\n' +
            "  const [e, setE] = useState('accueil')\n" +
            "  if (e === 'second') { const t: any = undefined; return <p>{t.x}</p> }\n" +
            "  if (e === 'premier') return <button onClick={() => setE('second')}>Aller au second</button>\n" +
            "  return <button onClick={() => setE('premier')}>Aller au premier</button>\n" +
            '}',
        ),
      )
      const v = await jugerExecution(code)
      // Le contrôle fautif n'existe QU'APRÈS deux navigations : une
      // énumération unique ne l'aurait jamais ouvert.
      expect(v.monteDansSimulateur, 'un écran de second niveau est passé inaperçu').toBe(false)
      expect(v.erreurs.map((e) => e.quoi).join(' ')).toMatch(/second/u)
    },
    60_000,
  )

  it(
    '⑪ LE DÉNOMINATEUR EST TOUJOURS RENDU — visités ET découverts',
    async () => {
      const code = await assembleOuEchoue(
        page("function App() { return <nav><button>A</button><button>B</button></nav> }"),
      )
      const v = await jugerExecution(code)
      expect(v.ecransVisites, 'aucun contrôle ouvert').toBeGreaterThan(0)
      expect(v.ecransDecouverts, 'le dénominateur manque').toBeGreaterThanOrEqual(
        v.ecransVisites ?? 0,
      )
    },
    60_000,
  )

  it(
    '⑫ UN CONTRÔLE SANS NOM LISIBLE EST UN DÉFAUT — rendu, lié, et muet',
    async () => {
      // CLASSE NEUVE, vue sur trois ecrans du tir 52f34017 : une pilule
      // bleue sans texte. Le juge de demarrage disait vrai, le juge de
      // vivacite disait vrai, et le bouton restait inutilisable — personne
      // ne sait ce qu'il fait. Aucun des cinq juges ne regardait ca.
      const code = await assembleOuEchoue(
        page(
          'function App() {\n' +
            '  return <nav><button onClick={() => {}} /><button onClick={() => {}}>Payer</button>' +
            '<button onClick={() => {}} aria-label="Fermer" /></nav>\n' +
            '}',
        ),
      )
      const v = await jugerExecution(code)
      const muets = v.controlesMuets ?? []
      expect(muets.length, 'le bouton sans texte passe encore').toBe(1)
      expect(muets[0]!.balise).toBe('button')
    },
    60_000,
  )

  it(
    '⑬ LES ÉCRANS OUVERTS REMONTENT AVEC LEUR TEXTE, séparateurs compris',
    async () => {
      // textContent COLLE les elements : « Agent IA » + « Reglages » donnait
      // « agent iareglages », et toute frontiere de mot disparaissait. Le
      // juge de couverture declarait alors manquant un ecran pourtant ouvert.
      const code = await assembleOuEchoue(
        page("function App() { return <nav><span>Agent IA</span><span>Réglages</span></nav> }"),
      )
      const v = await jugerExecution(code)
      const textes = (v.ecrans ?? []).map((e) => e.texte).join(' ')
      expect(textes, 'les mots sont recolles entre eux').toMatch(/Agent IA\s+Réglages/u)
    },
    60_000,
  )

  it('⑭ AUCUNE SURFACE NE DIT « DÉMARRE » — le juge monte un SIMULATEUR', () => {
    // MESURE DU 2026-11-01 : l'œuvre 950e1b9e rend « demarre = true,
    // 0 erreur » dans happy-dom et affiche un écran d'erreur dans le Safari
    // du propriétaire. Le juge a laissé LIVRER DU CASSÉ en annonçant que ça
    // démarrait. Troisième écran de ce dépôt à dire le faux, après « TOUT
    // ROULE » et « indisponible » — et celui-ci était le nôtre.
    //
    // CONDITION DE RÉOUVERTURE : ce contrôle tombe le jour où un VRAI
    // NAVIGATEUR entre dans la chaîne de livraison. Alors seulement une
    // surface pourra écrire « vérifié » sans mentir.
    const nu = (p: string) =>
      readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
    const surfaces = {
      écran: nu(join(__dirname, '..', '..', '..', 'components', 'onboarding', 'ConversationApplication.tsx')),
      route: nu(join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'direct', 'route.ts')),
      boucle: nu(join(__dirname, '..', 'boucle-directe.ts')),
    }
    for (const [nom, source] of Object.entries(surfaces)) {
      expect(source, `${nom} annonce encore un « Démarrage vérifié »`).not.toMatch(
        /Démarrage vérifié/u,
      )
      expect(source, `${nom} dit « ne démarre pas » au lieu de « ne se monte pas »`).not.toMatch(
        /ne démarre pas/u,
      )
    }
    // Et l'écran DIT la limite, il ne se contente pas de l'éviter.
    expect(surfaces.écran, 'l’écran ne dit pas que rien n’a été vérifié dans un navigateur').toMatch(
      /NON VÉRIFIÉE DANS UN NAVIGATEUR/u,
    )
  })

  it('⑥ LE PLAFOND VIENT DE LA PRODUCTION, et il est large À DESSEIN', () => {
    // MESURÉ DANS LA LAMBDA le 2026-10-31, cinq œuvres réelles : 858, 1035,
    // 1057, 1345, 1850 ms. Pire cas réel 1850 ms ; plafond 15 s = 8,1×.
    //
    // Large à dessein, et l'asymétrie le commande : une boucle ne finit
    // jamais, donc TOUT plafond l'attrape — il ne décide que du délai de
    // détection. Trop serré, en revanche, un plafond refuse une œuvre saine
    // mais lente et fait repartir le modèle pour un tour : de l'argent réel
    // dépensé sur un faux défaut. Resserrer ce nombre sans une mesure de
    // production qui l'exige serait une régression, pas une rigueur.
    expect(PLAFOND_MS).toBeGreaterThanOrEqual(8 * 1850)
  })
})
