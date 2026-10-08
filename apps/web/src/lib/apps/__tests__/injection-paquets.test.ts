/**
 * CLIQUET — LE MOTEUR NE CHERCHE PLUS UN SEUL `.ts` SUR LE DISQUE.
 *
 * ── LE DEFAUT, MESURE EN PRODUCTION.
 *
 * L'ecran rendait « Lecture impossible » INSTANTANEMENT. Cause : le moteur
 * importait dix-sept fichiers TypeScript PAR CHEMIN ABSOLU — huit dans
 * `moteur.mjs`, neuf dans `acceptation.mjs`. Sous `tsx` — la campagne, les
 * tests — cela fonctionne. Dans le runtime du site, Node ne sait pas lire un
 * `.ts`, et ces chemins ne sont meme pas embarques dans la fonction.
 *
 * QUATRIEME FOIS LE MEME JOUR que ce defaut passe : prouve en local, mort
 * deploye. Et pousse sans un seul essai en ligne.
 *
 * ── CE QUE CE TEST PROUVE, A COUT NUL.
 *
 * Le moteur se MONTE entierement — les deux fabriques, les vingt et une
 * dependances, les juges — en mode STRICT : tout repli par chemin LEVE au
 * lieu de reussir silencieusement. Sans ce mode, le test passerait sous
 * `tsx` meme avec une injection incomplete, et ne prouverait rien.
 *
 * Aucun appel n'est emis : monter ne coute pas un centime.
 */
import { describe, expect, it } from 'vitest'
import * as airSchema from '@deribfy/air-schema'
import * as registry from '@deribfy/capability-registry'
import * as blocksRegistry from '@deribfy/blocks/registry'
import * as executionContract from '@deribfy/execution-contract'
import * as primitives from '@deribfy/primitives/roles-icones'
import * as repair from '@deribfy/repair'
import * as compiler from '@deribfy/compiler'
import * as fidelity from '@deribfy/fidelity'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { sansCommentaires } from './sans-commentaires'

const RACINE = join(process.cwd(), '..', '..')

describe('CLIQUET — aucun fichier TypeScript cherche sur disque', () => {
  it('le moteur se monte ENTIEREMENT avec les paquets injectes, en strict', async () => {
    const { creerMoteur } = (await import(
      join(RACINE, 'benchmarks/air-emission/moteur.mjs')
    )) as { creerMoteur: (o: unknown) => Promise<{ emettreApplication: unknown }> }
    const m = await creerMoteur({
      cleApi: 'verification-aucun-appel',
      paquets: {
        __strict: true,
        airSchema, registry, blocksRegistry,
        presentation: executionContract, executionContract,
        primitives, budgetUsd: repair, preservation: repair, repairScope: repair,
        compiler, fidelity, executionGraph: executionContract, vivacite: executionContract,
      },
    })
    expect(typeof m.emettreApplication).toBe('function')
  }, 60_000)

  it('la liste du test et celle du site ne peuvent pas diverger', () => {
    // Ce fichier redeclare les paquets qu'il injecte : c'est une SECONDE
    // liste, et « une liste ecrite deux fois diverge » — quatre fois
    // constate ici. Le symptome serait le pire possible : un test vert sur
    // une injection que le site ne fait pas.
    const TS = readFileSync(join(RACINE, 'apps/web/src/lib/apps/moteur.ts'), 'utf8')
    const bloc = TS.slice(TS.indexOf('paquets: {'), TS.indexOf('},\n  })'))
    const duSite = [...bloc.matchAll(/^\s{6}(\w+)[,:]/gmu)].map((m) => m[1]).filter((k) => k !== '__strict')
    expect(duSite.length).toBeGreaterThan(8)
    const duTest = readFileSync(__filename, 'utf8')
    const injection = duTest.slice(duTest.indexOf('paquets: {'), duTest.indexOf('},\n    })'))
    for (const cle of duSite) expect(injection, `« ${cle} » injecte par le site, absent du test`).toContain(cle)
  })

  it('le site passe bien le mode strict — sinon le defaut reviendrait en silence', () => {
    const TS = sansCommentaires(
      readFileSync(join(RACINE, 'apps/web/src/lib/apps/moteur.ts'), 'utf8'),
    )
    expect(TS).toContain('__strict: true')
    // Et il importe les SOUS-CHEMINS, pas les index : ceux de `blocks` et de
    // `primitives` reexportent des composants React Native, dont les types
    // globaux ecrasent le `FormData` du DOM — sept erreurs mesurees dans des
    // routes qui n'ont rien a voir avec le generateur.
    expect(TS).toContain("from '@deribfy/blocks/registry'")
    expect(TS).toContain("from '@deribfy/primitives/roles-icones'")
    expect(TS).not.toMatch(/from '@deribfy\/(blocks|primitives)'/u)
  })
})
