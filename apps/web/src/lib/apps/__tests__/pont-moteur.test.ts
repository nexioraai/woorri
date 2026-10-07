// ============================================================
// CLIQUET — LE SITE PEUT RÉELLEMENT APPELER LE MOTEUR.
//
// Avant ce lot, `apps/web` n'avait AUCUNE dépendance vers les paquets du
// moteur : le générateur produisait 31 applications web dans une gate, et le
// site censé les livrer ne savait même pas qu'il existait.
//
// Ce test est le premier pont. Il ne juge pas la beauté du résultat : il
// établit le FAIT qu'un document valide entre d'un côté et que des fichiers
// sortent de l'autre, DEPUIS apps/web — pas depuis un script de gate.
// ============================================================
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compileWeb } from '@deribfy/compiler'
import type { ProjectAir } from '@deribfy/air-schema'
import { validateAir } from '@deribfy/air-schema'

const document = (): ProjectAir =>
  JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        '..',
        '..',
        'packages',
        'golden-corpus',
        'corpus-v2',
        'boutique-mode.air.json',
      ),
      'utf8',
    ),
  ) as ProjectAir

describe('CLIQUET — le pont entre le site et le moteur', () => {
  it('le site importe le moteur et le validateur', () => {
    expect(typeof compileWeb).toBe('function')
    expect(typeof validateAir).toBe('function')
  })

  it('un document du corpus est jugé valide depuis apps/web', () => {
    const r = validateAir(document()) as { errors?: unknown[] }
    expect(r.errors ?? []).toEqual([])
  })

  it('ET IL COMPILE : des fichiers sortent, dont une page web', () => {
    const projet = compileWeb(document())
    expect(projet.files.size).toBeGreaterThan(20)
    expect([...projet.files.keys()]).toContain('index.html')
    // `racine`, pas `root` : ce moteur est en français de bout en bout.
    expect(projet.files.get('index.html')).toMatch(/id="racine"/u)
  })
})
