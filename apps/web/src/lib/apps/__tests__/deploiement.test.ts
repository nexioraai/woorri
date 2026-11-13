// ÉTAPE 2 (2026-11-13) — LA LIGNE ENREGISTRE LE DÉPLOIEMENT QUI L'A SERVIE.
//
// La ligne c4522e43 portait configuration {} et nom null, et personne ne
// pouvait dire quel déploiement l'avait servie. Désormais la route écrit
// `sections_acquises.deploiement`, dérivé EXACTEMENT comme /api/version.
//
//   ① COMPORTEMENT : la dérivation, sur des environnements connus ;
//   ② la route de génération l'écrit en succès ET en échec, et /api/version
//      emploie la même fonction (ancres texte : complément, pas preuve).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { commitDuDeploiement, deploiementQuiSert } from '../deploiement'
import { motifTexte } from './motif-texte'

const lire = (chemin: string) => readFileSync(join(__dirname, '..', '..', '..', chemin), 'utf8')

describe('le déploiement qui sert est enregistré', () => {
  it('① la dérivation est celle de /api/version : 7 signes, sinon « inconnu »', () => {
    expect(commitDuDeploiement({ VERCEL_GIT_COMMIT_SHA: '391217ffe0f4ff9e1bd0edb0cf4fcfcb83d130ea' })).toBe('391217f')
    expect(commitDuDeploiement({})).toBe('inconnu')
    expect(commitDuDeploiement({ VERCEL_GIT_COMMIT_SHA: '' })).toBe('inconnu')
    expect(deploiementQuiSert({ VERCEL_GIT_COMMIT_SHA: 'eb1af3e9db1f', VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'etape-2-configuration' }))
      .toEqual({ commit: 'eb1af3e', environnement: 'preview', branche: 'etape-2-configuration' })
    expect(deploiementQuiSert({})).toEqual({ commit: 'inconnu', environnement: 'inconnu', branche: 'inconnu' })
  })

  it('② la route l’écrit en succès et en échec ; /api/version emploie la même dérivation', () => {
    const route = lire('app/api/generateur/direct/route.ts')
    expect(route).toMatch(motifTexte('const deploiement = deploiementQuiSert(process.env)'))
    expect(route).toMatch(motifTexte('sections_acquises: { lectureBrief, deploiement },'))
    expect(route).toMatch(motifTexte('      lectureBrief,\n      deploiement,\n      tours: resultat.tours,'))
    const version = lire('app/api/version/route.ts')
    expect(version).toMatch(motifTexte('{ commit: commitDuDeploiement(process.env) }'))
    expect(version, 'une seconde dérivation du commit est revenue dans /api/version').not.toMatch(/VERCEL_GIT_COMMIT_SHA/u)
  })
})
