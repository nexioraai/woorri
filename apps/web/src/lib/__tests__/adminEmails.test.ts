// ============================================================
// CLIQUET — LA LISTE DES ADMINISTRATEURS NE SE RECOPIE PLUS.
//
// L'ÉTAT TROUVÉ le 2026-10-02 : six routes d'administration portaient chacune
// leur propre `const ADMIN_EMAILS`. Six copies d'une règle d'autorisation.
//
// CE QUE CE TEST EMPÊCHE : qu'une septième apparaisse. Le danger n'est pas la
// duplication en soi — c'est qu'elle est INVISIBLE à la relecture, puisque
// chaque fichier pris isolément est irréprochable. Seul un regard sur
// l'ENSEMBLE le voit, et c'est donc l'ensemble que ce cliquet regarde.
// ============================================================
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADMIN_EMAILS, estAdmin } from '../admin-emails'

const SRC = join(process.cwd(), 'src')

function fichiersSource(dossier: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dossier)) {
    if (e === 'node_modules' || e === '.next') continue
    const chemin = join(dossier, e)
    if (statSync(chemin).isDirectory()) fichiersSource(chemin, acc)
    else if (/\.tsx?$/.test(e) && !/\.backup$/.test(e)) acc.push(chemin)
  }
  return acc
}

describe('la source unique des administrateurs', () => {
  // ── LE PREMIER CLIQUET NE CHERCHAIT QUE `const ADMIN_EMAILS`.
  //
  // Il a laissé passer NEUF autres copies, sous d'autres noms : `ADMIN_EMAIL`
  // (destinataire d'alertes), `UNLIMITED_EMAILS` (hors quota), et une
  // comparaison écrite en clair dans un composant CLIENT — donc livrée au
  // navigateur de chaque visiteur. Ce n'est pas le NOM qu'il fallait
  // surveiller : c'est l'ADRESSE elle-même.
  it('aucune adresse d’administrateur n’est écrite ailleurs que dans `admin-emails.ts`', () => {
    const coupables = fichiersSource(SRC)
      .filter((f) => !f.endsWith('admin-emails.ts'))
      .filter((f) => !f.includes('__tests__'))
      .filter((f) => ADMIN_EMAILS.some((e) => readFileSync(f, 'utf8').includes(e)))
      .map((f) => f.replace(SRC, 'src'))

    expect(coupables).toEqual([])
  })

  it('AUCUN composant client ne porte une adresse — elle partirait au navigateur', () => {
    const clients = fichiersSource(SRC)
      .filter((f) => !f.includes('__tests__'))
      .filter((f) => /^['"]use client['"]/m.test(readFileSync(f, 'utf8')))
      .filter((f) => ADMIN_EMAILS.some((e) => readFileSync(f, 'utf8').includes(e)))
      .map((f) => f.replace(SRC, 'src'))

    expect(clients).toEqual([])
  })

  it('toutes les routes d’administration vérifient bien une autorisation', () => {
    const routes = fichiersSource(join(SRC, 'app', 'api', 'admin'))
      .filter((f) => f.endsWith('route.ts'))

    expect(routes.length).toBeGreaterThanOrEqual(6)
    for (const r of routes) {
      const s = readFileSync(r, 'utf8')
      const garde = /ADMIN_EMAILS\.includes|estAdmin\(/.test(s)
      expect(garde, `${r.replace(SRC, 'src')} n’a aucune garde d’autorisation`).toBe(true)
      expect(s).toContain('403')
    }
  })
})

describe('la règle elle-même', () => {
  it('le propriétaire est administrateur', () => {
    expect(estAdmin('issayamiyoussouf@gmail.com')).toBe(true)
  })

  it('personne d’autre ne l’est', () => {
    for (const e of ['marchand@example.com', 'admin@deribfy.com', '']) {
      expect(estAdmin(e)).toBe(false)
    }
  })

  it('une adresse absente n’est jamais administratrice', () => {
    expect(estAdmin(null)).toBe(false)
    expect(estAdmin(undefined)).toBe(false)
  })

  it('la comparaison reste stricte — élargir une autorisation se décide, ne se subit pas', () => {
    expect(estAdmin('Issayamiyoussouf@gmail.com')).toBe(false)
  })

  it('la liste n’est pas vide — une liste vide fermerait l’administration à tous', () => {
    expect(ADMIN_EMAILS.length).toBeGreaterThan(0)
  })
})
