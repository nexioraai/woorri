/**
 * EP-295 — AUCUNE CLÉ DE TRAÇAGE MORTE, AUCUN MANIFESTE PÉRIMÉ.
 *
 * ── LE DÉFAUT, MESURÉ SUR BUILD PROPRE LE 2026-10-31.
 *
 * Les clés d'`outputFileTracingIncludes` sont des GLOBS. Les crochets d'une
 * route dynamique y sont une classe de caractères : '/p/[jeton]' matche UN
 * caractère parmi j-e-t-o-n — jamais le texte littéral « [jeton] ». La clé
 * était MORTE À LA DÉCLARATION : react-dom = 0 dans le nft de /p pendant que
 * la route répondait 200 en production par pur accident de groupement de
 * lambdas. Personne ne pouvait le voir : la config AVAIT la clé.
 *
 * ── CE QUE CE CLIQUET TIENT, à la gate — avant tout build :
 *   · aucune clé à crochets, nulle part, jamais ;
 *   · chaque clé littérale désigne une route RÉELLE (elle-même ou ses
 *     descendants — la descendance est mesurée : '/api/generateur/direct' a
 *     donné ses fichiers à direct/[id], '/p' les a donnés à /p/[jeton]) ;
 *   · le manifeste de `verifier-tracage.mjs` (le contrôle au BUILD, côté
 *     Vercel) ne cite que des routes qui existent — un renommage le périme
 *     ICI, pas dans un build rouge trois jours plus tard.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// Le manifeste du vérificateur est la source unique : s'il cite une route
// fantôme, ce test rougit à la gate.
import { ROUTES_ASSEMBLEUSES, ROUTES_EMISSION } from '../../../../scripts/verifier-tracage.mjs'

const RACINE_APP = join(__dirname, '..', '..', '..', 'app')

/** Tous les identifiants de routes servies : dossiers portant un route.ts. */
const routes = (dossier = RACINE_APP, prefixe = ''): string[] =>
  readdirSync(dossier).flatMap((n) => {
    const chemin = join(dossier, n)
    if (statSync(chemin).isDirectory()) return routes(chemin, `${prefixe}/${n}`)
    return n === 'route.ts' ? [prefixe] : []
  })
const TOUTES = routes()

/** Les clés du bloc outputFileTracingIncludes, extraites à la profondeur 1. */
function clesDeTracage(): string[] {
  const src = readFileSync(join(__dirname, '..', '..', '..', '..', 'next.config.ts'), 'utf8')
  const debut = src.indexOf('outputFileTracingIncludes')
  expect(debut, 'le bloc outputFileTracingIncludes a disparu').toBeGreaterThan(0)
  const i = src.indexOf('{', debut)
  let profondeur = 0
  let fin = i
  do {
    const c = src[fin]
    if (c === '{') profondeur += 1
    else if (c === '}') profondeur -= 1
    fin += 1
  } while (profondeur > 0 && fin < src.length)
  const bloc = src
    .slice(i, fin)
    .replace(/\/\*[\s\S]*?\*\//gu, ' ')
    .replace(/^\s*\/\/.*$/gmu, ' ')
  return [...bloc.matchAll(/^\s*'(\/[^']+)'\s*:/gmu)].map((m) => m[1]!)
}

describe('EP-295 · les clés de traçage désignent des routes vivantes', () => {
  const cles = clesDeTracage()

  it('① AUCUNE CLÉ À CROCHETS — les crochets sont de la syntaxe glob', () => {
    const mortes = cles.filter((c) => c.includes('[') || c.includes(']'))
    expect(
      mortes,
      `clé(s) morte(s) à la déclaration : ${mortes.join(', ')} — une clé à crochets ne matche JAMAIS sa route ; employez la clé ancêtre littérale`,
    ).toEqual([])
  })

  it('② CHAQUE CLÉ DÉSIGNE UNE ROUTE RÉELLE, elle-même ou ses descendants', () => {
    const orphelines = cles.filter(
      (c) => !TOUTES.some((r) => r === c || r.startsWith(c + '/')),
    )
    expect(
      orphelines,
      `clé(s) sans route : ${orphelines.join(', ')} — route renommée ou supprimée ?`,
    ).toEqual([])
  })

  it('③ LE MANIFESTE DU VÉRIFICATEUR NE CITE QUE DES ROUTES EXISTANTES', () => {
    for (const r of [...ROUTES_EMISSION, ...ROUTES_ASSEMBLEUSES] as string[]) {
      expect(TOUTES, `verifier-tracage.mjs cite « ${r} », introuvable`).toContain('/' + r)
    }
  })

  it('④ LE DÉNOMINATEUR EST RÉEL — un ensemble vide passerait aussi', () => {
    expect(cles.length).toBeGreaterThan(8)
    expect(TOUTES.length).toBeGreaterThan(60)
  })
})
