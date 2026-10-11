/**
 * LES PREUVES DU RÉPARATEUR GRATUIT — avec un vrai `zod`, et avec un juge
 * jouet pour les cas que le vrai schema ne sait pas fabriquer.
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { PASSES_MAX, retirerClesInconnues, type Validation } from '../reparation-schema'

const JOUET = z.strictObject({
  a: z.string(),
  sous: z.strictObject({ b: z.number() }),
})
const juge = (d: unknown): Validation => {
  const r = JOUET.safeParse(d)
  if (r.success) return { success: true, issues: [] }
  // Le type d'anomalie de `zod` est plus large que le notre (son chemin peut
  // porter des symboles). On le ramene a ce dont le reparateur a besoin —
  // c'est exactement le role d'un adaptateur.
  return {
    success: false,
    issues: r.error.issues.map((i) => ({
      code: i.code,
      path: i.path.filter((x): x is string | number => typeof x !== 'symbol'),
      keys: (i as { keys?: string[] }).keys,
    })),
  }
}

describe('retirer ce qui est EN TROP', () => {
  it('retire une clé inconnue à la racine', () => {
    const r = retirerClesInconnues({ a: 'x', sous: { b: 1 }, trop: 9 }, juge)
    expect(r.document).toEqual({ a: 'x', sous: { b: 1 } })
    expect(r.retirees).toEqual(['trop'])
    expect(juge(r.document).success).toBe(true)
  })

  it('retire une clé inconnue IMBRIQUÉE, et le dit avec son chemin', () => {
    const r = retirerClesInconnues({ a: 'x', sous: { b: 1, zzz: 3 } }, juge)
    expect(r.retirees).toEqual(['sous.zzz'])
    expect(juge(r.document).success).toBe(true)
  })

  it('retire plusieurs clés d’un coup', () => {
    const r = retirerClesInconnues({ a: 'x', sous: { b: 1 }, t1: 1, t2: 2 }, juge)
    expect([...r.retirees].sort()).toEqual(['t1', 't2'])
    expect(juge(r.document).success).toBe(true)
  })

  it('atteint les clés révélées par une passe précédente', () => {
    // `sous` n'est visite qu'une fois la racine acceptee : il faut deux passes.
    const r = retirerClesInconnues({ a: 'x', sous: { b: 1, zzz: 3 }, trop: 9 }, juge)
    expect([...r.retirees].sort()).toEqual(['sous.zzz', 'trop'])
    expect(juge(r.document).success).toBe(true)
  })
})

describe('ne JAMAIS inventer — la limite du module', () => {
  it('un champ requis absent n’est PAS fabriqué', () => {
    const r = retirerClesInconnues({ sous: { b: 1 } }, juge) // `a` manque
    expect(r.retirees).toEqual([])
    expect(juge(r.document).success).toBe(false)
    expect(r.document).toEqual({ sous: { b: 1 } })
  })

  it('un type faux n’est PAS corrigé', () => {
    const r = retirerClesInconnues({ a: 42, sous: { b: 1 } }, juge)
    expect(r.retirees).toEqual([])
    expect(juge(r.document).success).toBe(false)
  })

  it('un mélange ne retire QUE ce qui est en trop, et échoue honnêtement', () => {
    const r = retirerClesInconnues({ sous: { b: 1 }, trop: 9 }, juge) // `a` manque
    expect(r.retirees).toEqual(['trop'])
    expect(juge(r.document).success).toBe(false) // le refus reste un refus
  })
})

describe('ce qui entre ne se fait pas abîmer', () => {
  it('le document d’origine n’est pas modifié', () => {
    const origine = { a: 'x', sous: { b: 1 }, trop: 9 }
    retirerClesInconnues(origine, juge)
    expect(origine).toEqual({ a: 'x', sous: { b: 1 }, trop: 9 })
  })

  it('un document déjà valide ressort intact, sans rien retirer', () => {
    const r = retirerClesInconnues({ a: 'x', sous: { b: 1 } }, juge)
    expect(r.retirees).toEqual([])
    expect(r.document).toEqual({ a: 'x', sous: { b: 1 } })
  })

  it('ce qui n’est pas un objet traverse sans dommage', () => {
    for (const v of [null, 'texte', 42, undefined]) {
      expect(retirerClesInconnues(v, juge)).toEqual({ document: v, retirees: [] })
    }
  })
})

describe('la boucle est bornée', () => {
  it('un juge qui ne guérit JAMAIS ne fait pas tourner la boucle sans fin', () => {
    // Il redemande toujours de retirer la meme cle, qui n'existe pas :
    // aucune progression, donc arret immediat.
    let appels = 0
    const menteur = (): Validation => {
      appels++
      return { success: false, issues: [{ code: 'unrecognized_keys', path: [], keys: ['fantome'] }] }
    }
    const r = retirerClesInconnues({ a: 'x' }, menteur)
    expect(r.retirees).toEqual([])
    expect(appels).toBeLessThanOrEqual(PASSES_MAX)
  })

  it('un juge qui révèle une clé neuve à chaque passe s’arrête à la borne', () => {
    let n = 0
    const sansFin = (d: unknown): Validation => {
      const o = d as Record<string, unknown>
      const cle = `c${String(n++)}`
      o[cle] = 1 // il en rajoute une a chaque fois
      return { success: false, issues: [{ code: 'unrecognized_keys', path: [], keys: [cle] }] }
    }
    const r = retirerClesInconnues({ a: 'x' }, sansFin)
    expect(r.retirees.length).toBeLessThanOrEqual(PASSES_MAX)
  })
})
