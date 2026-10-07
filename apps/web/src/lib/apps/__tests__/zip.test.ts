// ============================================================
// CLIQUET — L'ARCHIVE S'OUVRE VRAIMENT.
//
// Une archive est le pire endroit où se tromper : elle a l'air d'un succès
// jusqu'au moment où le marchand essaie de l'ouvrir, c'est-à-dire LOIN de
// nous. Ces tests ne vérifient donc pas « un Buffer est sorti » : ils relisent
// l'archive avec l'outil du système, celui que le marchand utilisera.
// ============================================================
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zipper, crc32 } from '../zip'

/** Écrit l'archive, la déballe avec `unzip`, et rend ce qui en sort. */
function allerRetour(fichiers: Map<string, string | Buffer>): Record<string, string> {
  const dir = mkdtempSync(join(tmpdir(), 'deribfy-zip-'))
  const archive = join(dir, 'a.zip')
  writeFileSync(archive, zipper(fichiers))
  execFileSync('unzip', ['-q', archive, '-d', join(dir, 'out')])
  const lus: Record<string, string> = {}
  const parcourir = (base: string, prefixe: string): void => {
    for (const e of readdirSync(base, { withFileTypes: true })) {
      const p = join(base, e.name)
      if (e.isDirectory()) parcourir(p, prefixe + e.name + '/')
      else lus[prefixe + e.name] = readFileSync(p, 'utf8')
    }
  }
  parcourir(join(dir, 'out'), '')
  return lus
}

describe('CLIQUET — l’archive produite est lisible par le système', () => {
  it('CRC-32 : la valeur de référence du format', () => {
    // « 123456789 » vaut 0xCBF43926 — la constante de contrôle de toutes les
    // implémentations. Si elle tombe, tout le reste ment.
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926)
  })

  it('un fichier simple fait l’aller-retour intact', () => {
    const lus = allerRetour(new Map([['bonjour.txt', 'Bonjour le monde']]))
    expect(lus['bonjour.txt']).toBe('Bonjour le monde')
  })

  it('LES SOUS-DOSSIERS SURVIVENT — une app émise en a plusieurs niveaux', () => {
    const lus = allerRetour(
      new Map([
        ['index.html', '<!doctype html>'],
        ['src/App.tsx', 'export default function App() { return null }'],
        ['src/lib/runtime/data.ts', 'export const x = 1'],
      ]),
    )
    expect(Object.keys(lus).sort()).toEqual([
      'index.html',
      'src/App.tsx',
      'src/lib/runtime/data.ts',
    ])
    expect(lus['src/lib/runtime/data.ts']).toBe('export const x = 1')
  })

  it('le CONTENU accentué traverse sans dommage', () => {
    const lus = allerRetour(new Map([['precis.txt', 'séquestre · enchères · pénalités']]))
    expect(lus['precis.txt']).toBe('séquestre · enchères · pénalités')
  })

  it('UN NOM DE FICHIER ACCENTUÉ EST REFUSÉ, et c’est mesuré', () => {
    // Le drapeau UTF-8 est posé selon la norme, et pourtant l'`unzip` livré
    // avec macOS s'arrête sur « Illegal byte sequence ». Le marchand
    // recevrait une archive que sa machine refuse d'ouvrir. Un refus ici vaut
    // mieux qu'un fichier illisible à l'autre bout.
    expect(() => zipper(new Map([['précis.txt', 'x']]))).toThrow(/ASCII/u)
  })

  it('un contenu très compressible ressort identique', () => {
    const gros = 'a'.repeat(200_000)
    const lus = allerRetour(new Map([['gros.txt', gros]]))
    expect(lus['gros.txt']).toBe(gros)
  })

  it('un contenu minuscule — que la compression ferait GONFLER — ressort intact', () => {
    // C'est le cas qui justifie la méthode 0 : sans elle, l'archive serait
    // plus grosse que son contenu, et certains lecteurs s'en étranglent.
    const lus = allerRetour(new Map([['x', 'a']]))
    expect(lus['x']).toBe('a')
  })

  it('L’ARCHIVE EST REPRODUCTIBLE — deux générations, les mêmes octets', () => {
    // Sans date figée, deux archives du même contenu diffèrent, et plus rien
    // ne se compare — ni un cache, ni une empreinte, ni un diff.
    const f = new Map<string, string | Buffer>([['a.txt', 'x'], ['b/c.txt', 'y']])
    expect(Buffer.compare(zipper(f), zipper(f))).toBe(0)
  })
})
