/**
 * EP-294 — L'ASSEMBLAGE NE DÉPEND PLUS DU DISQUE DE LA FONCTION.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-31 (0,45 $).
 *
 * Tirs de 01:02 et 08:18 : trois tours chacun, tous morts sur « paquet(s)
 * non embarqué(s) : react, react-dom/client ». Le code produit arrivait
 * entier ; c'est le DISQUE de la fonction Vercel qui n'avait pas
 * node_modules/react — pendant que /p/[jeton] assemblait la même œuvre sur
 * le sien. Quatrième incident de la classe « vert local, mort en ligne »
 * en douze jours (avant/19-10, livraison/30-10, deux tirs/31-10).
 *
 * ── LA FERMETURE : les sources de la famille react sont EMBARQUÉES dans le
 * module généré `react-embarque.genere.ts` — l'empaqueteur du serveur les
 * résout à la construction depuis la version du lockfile ; personne ne
 * recopie, et le résolveur du bac à sable les sert depuis la mémoire.
 * Ce cliquet tient les trois promesses :
 *   · la copie commitée est IDENTIQUE À L'OCTET à ce que le lockfile
 *     installe (monter react sans régénérer ne merge pas) ;
 *   · un témoin react + react-dom/client s'assemble sans toucher au disque ;
 *   · un paquet PRÉSENT sur le disque local (zod) est QUAND MÊME refusé —
 *     le même code échoue au même endroit, local comme production.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'
import { MODULES_EMBARQUES, VERSIONS_EMBARQUEES } from '../react-embarque'
import { contenuGenere } from '../../../../scripts/generer-react-embarque.mjs'

const require = createRequire(import.meta.url)

describe('EP-294 · la famille react vit dans le bundle, pas sur le disque', () => {
  it('① LA COPIE COMMITÉE EST CELLE DU LOCKFILE, à l’octet près', () => {
    const commite = readFileSync(
      join(__dirname, '..', 'react-embarque.genere.json'),
      'utf8',
    )
    expect(
      commite === contenuGenere(),
      'react-embarque.genere.json dérive des paquets installés — relancez node scripts/generer-react-embarque.mjs',
    ).toBe(true)
  })

  it('② LES VERSIONS ÉPINGLÉES SONT LES VERSIONS INSTALLÉES', () => {
    for (const paquet of ['react', 'react-dom', 'scheduler']) {
      const installee = (
        JSON.parse(
          readFileSync(require.resolve(paquet + '/package.json'), 'utf8'),
        ) as { version: string }
      ).version
      expect(VERSIONS_EMBARQUEES[paquet], `${paquet} a bougé sans régénération`).toBe(installee)
    }
  })

  it('③ UN TÉMOIN REACT + REACT-DOM/CLIENT S’ASSEMBLE DEPUIS LA MÉMOIRE', async () => {
    const v = await assembler(
      new Map([
        [
          'index.tsx',
          "import { createRoot } from 'react-dom/client'\n" +
            "import { App } from './App'\n" +
            'export function monter(noeud: Element) {\n' +
            '  createRoot(noeud).render(<App />)\n' +
            '}\n',
        ],
        [
          'App.tsx',
          "import { useState } from 'react'\n" +
            'export function App() {\n' +
            '  const [n] = useState(12)\n' +
            '  return <p>témoin {n}</p>\n' +
            '}\n',
        ],
      ]),
    )
    expect(v.ok, v.ok ? '' : v.erreur).toBe(true)
    if (v.ok) {
      // react-dom/client pèse ~520 Ko : un bundle bien plus petit signifie
      // qu'on a résolu un react FANTÔME, pas embarqué le vrai.
      expect(v.code.length, 'bundle trop petit : react-dom n’est pas dedans').toBeGreaterThan(400_000)
    }
  })

  it('④ UN PAQUET PRÉSENT SUR LE DISQUE LOCAL EST QUAND MÊME REFUSÉ', async () => {
    // CONTRÔLE DISCRIMINANT : zod EST dans node_modules ici. S'il s'assemble,
    // le résolveur retombe sur le disque — et le même code mourrait en ligne.
    expect(require.resolve('zod'), 'le contrôle exige zod sur le disque').toBeTruthy()
    const v = await assembler(
      new Map([
        ['index.tsx', "import { z } from 'zod'\nexport const s = z.string()\n"],
      ]),
    )
    expect(v.ok, 'zod s’est assemblé depuis le disque : le vert local qui ment est revenu').toBe(false)
    if (!v.ok) expect(v.erreur).toMatch(/zod/u)
  })

  it('⑥ LE RÉSOLVEUR JUMEAU DE L’APERÇU SERT LA MÊME MÉMOIRE', () => {
    // apercu.ts a son propre résolveur rolldown (option 2, /p, sonde) : le
    // même défaut y vivait. Les deux crochets doivent lire la mémoire —
    // la résolution ET le chargement, sinon l'id embarqué ne charge rien.
    const src = readFileSync(join(__dirname, '..', 'apercu.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, ' ')
      .replace(/^\s*\/\/.*$/gmu, ' ')
    expect(src, 'la résolution n’interroge plus la mémoire').toContain('MODULES_EMBARQUES.has(')
    expect(src, 'le chargement ne sert plus la mémoire').toContain('MODULES_EMBARQUES.get(')
    expect(src, 'le préfixe commun n’est plus partagé').toContain('PREFIXE_EMBARQUE')
  })

  it('⑤ LES CINQ SPÉCIFICATEURS SONT SERVIS, ET EUX SEULS', () => {
    expect([...MODULES_EMBARQUES.keys()].sort()).toEqual([
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'scheduler',
    ])
    for (const src of MODULES_EMBARQUES.values()) {
      expect(src.length).toBeGreaterThan(500)
      // Les sources de production n'interrogent jamais process.env : le
      // navigateur n'en a pas, et le prélude n'a pas à mentir pour elles.
      expect(src).not.toMatch(/process\.env/u)
    }
  })
})
