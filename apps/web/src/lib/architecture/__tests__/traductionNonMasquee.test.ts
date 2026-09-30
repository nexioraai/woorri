import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ============================================================
// CLIQUET — LA FONCTION DE TRADUCTION NE DOIT JAMAIS ÊTRE MASQUÉE.
//
// ── CE QUI A ÉTÉ PAYÉ POUR CE FICHIER, le 2026-09-29.
//
// Dans l'éditeur de sections, la liste des avis clients s'écrivait :
//
//   {(site.testimonials || []).map((t: any, idx: number) => (
//     <span>{t('naved.review')} #{idx + 1}</span>
//
// `useTranslation()` rend un `t`. Nommer `t` le paramètre de la boucle le
// MASQUE à l'intérieur : `t('naved.review')` appelait donc l'avis lui-même,
// qui est un objet. « t is not a function » — le rendu casse, et avec lui tout
// l'éditeur de sections du marchand.
//
// ── POURQUOI PERSONNE NE L'A VU.
//
// Le corps d'un `.map` sur un tableau VIDE ne s'exécute jamais. Une boutique
// sans avis client ne déclenchait donc rien ; il fallait un avis pour que la
// page tombe. TypeScript ne dit rien non plus : `t` est typé `any`, et appeler
// un `any` est autorisé.
//
// Ni le compilateur, ni les tests, ni un essai sur une boutique neuve
// n'attrapaient ce défaut. Seul un balayage du texte source le voit — d'où ce
// fichier.
//
// ── LE DÉNOMINATEUR EST EXPLICITE.
//
// Le balayage porte sur TOUT `src/`, pas sur une liste de fichiers connus : un
// test qui ne regarderait que `Navbar.tsx` validerait la même faute commise
// ailleurs demain.
// ============================================================

const RACINE = join(__dirname, '..', '..', '..')

function fichiers(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next') continue
    const chemin = join(dir, e)
    if (statSync(chemin).isDirectory()) fichiers(chemin, acc)
    else if (/\.tsx?$/.test(e) && !/__tests__/.test(chemin)) acc.push(chemin)
  }
  return acc
}

const SOURCES = fichiers(RACINE)

/**
 * Un rappel dont le PREMIER paramètre s'appelle `t`.
 *
 * On vise les méthodes de tableau, celles qui produisent du JSX dans ce dépôt.
 * Le motif accepte `(t)`, `(t,`, `(t:` et `t =>` — les quatre écritures qui
 * introduisent la variable.
 */
const MASQUAGE = /\.(map|filter|forEach|find|findIndex|some|every|reduce|flatMap|sort)\(\s*(?:\(\s*t\s*[,:)]|t\s*=>)/

describe('TRADUCTION — la fonction `t` n’est jamais masquée', () => {
  it('le dénominateur du balayage est réel', () => {
    expect(SOURCES.length).toBeGreaterThan(100)
    expect(SOURCES.some((f) => f.endsWith(join('components', 'Navbar.tsx')))).toBe(true)
  })

  it('aucun fichier qui traduit ne redéclare `t` en paramètre de rappel', () => {
    const fautifs = SOURCES.filter((f) => {
      const src = readFileSync(f, 'utf8')
      if (!src.includes('useTranslation')) return false
      return MASQUAGE.test(src)
    }).map((f) => f.slice(RACINE.length + 1))

    expect(
      fautifs,
      'Ces fichiers appellent `useTranslation()` ET nomment `t` un paramètre de\n' +
        'rappel. À l’intérieur, `t(...)` n’est plus la traduction mais l’élément\n' +
        'parcouru — un objet appelé comme une fonction :\n  ' +
        fautifs.join('\n  ')
    ).toEqual([])
  })

  it('le motif détecte réellement la faute qu’il prétend interdire', () => {
    // Sans cette vérification, une expression régulière cassée rendrait le test
    // vert sur un dépôt fautif.
    expect(MASQUAGE.test('{(site.testimonials || []).map((t: any, idx: number) => (')).toBe(true)
    expect(MASQUAGE.test('items.map((t) => t.nom)')).toBe(true)
    expect(MASQUAGE.test('items.map(t => t.nom)')).toBe(true)
    expect(MASQUAGE.test('{(site.testimonials || []).map((avis: any, idx: number) => (')).toBe(false)
  })
})
