/**
 * LA BOUCLE TOURNE AU TEMPS (2026-11-16, docs/elite-protocol/PLAN_TOURS_AU_TEMPS.md).
 *
 * Mesuré : le registre de clients (1dd7eb95) a été livré cassé au tour 3 —
 * le dernier — après 319 s sur 900. Le « 3 » n'avait aucune justification
 * écrite. La boucle s'arrête désormais sur une échéance, un plafond de coût,
 * la fenêtre de contexte, ou un plafond de sécurité.
 */
import { describe, expect, it } from 'vitest'
import { boucleEcriture, famillesDe, peutRejouer, TOURS_MAX, TOUR_ESTIME_MIN_MS } from '../boucle-directe'
import { jugeMuet } from './juge-muet'

const CASSE = '=== index.tsx ===\nexport const total = { a: 1,'
// Deux erreurs d'assemblage DIFFÉRENTES en alternance : la garde de stagnation
// ne mord pas, ce sont les autres gardes qu'on éprouve.
const AUTRE = "=== index.tsx ===\nimport z from './absent'\nexport const y = z"
const alterne = (n: number) => (n % 2 === 1 ? CASSE : AUTRE)
const base = { durees: [] as number[], coutCumule: 0, dernierCout: 0, entrees: [] as number[] }

describe('La boucle au temps', () => {
  it('① le plafond de sécurité n’est plus 3', () => {
    expect(TOURS_MAX).toBe(10)
  })

  it('② la garde du temps : un tour de plus seulement s’il tient avant l’échéance', () => {
    expect(peutRejouer({ ...base, maintenant: 0, echeance: TOUR_ESTIME_MIN_MS })).toBeNull()
    expect(peutRejouer({ ...base, maintenant: 1, echeance: TOUR_ESTIME_MIN_MS })).toBe('temps')
    // Le tour le plus long de CETTE génération sert d'estimation.
    expect(peutRejouer({ ...base, durees: [300_000], maintenant: 0, echeance: 299_000 })).toBe('temps')
  })

  it('③ la garde du coût : le prochain tour ne doit pas dépasser le plafond', () => {
    expect(peutRejouer({ ...base, maintenant: 0, coutCumule: 0.4, dernierCout: 0.05, plafondUsd: 0.5 })).toBeNull()
    expect(peutRejouer({ ...base, maintenant: 0, coutCumule: 0.46, dernierCout: 0.05, plafondUsd: 0.5 })).toBe('cout')
  })

  it('④ la garde du contexte : entrée attendue + sortie demandée ≤ fenêtre', () => {
    const c = { ...base, maintenant: 0, fenetreContexte: 1_000_000, sortieMax: 65_536 }
    expect(peutRejouer({ ...c, entrees: [4_500, 11_900] })).toBeNull()
    expect(peutRejouer({ ...c, entrees: [800_000, 900_000] })).toBe('contexte')
  })

  it('⑤ la boucle s’arrête à l’échéance, et le motif dit pourquoi', async () => {
    let t = 0
    let appels = 0
    const r = await boucleEcriture({
      demande: 'x',
      appeler: (async () => { appels += 1; t += 100_000; return { texte: alterne(appels), tronquee: false } }) as never,
      juger: jugeMuet,
      maintenant: () => t,
      echeance: 350_000,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(appels, 'des tours ont été lancés après l’échéance').toBeLessThan(TOURS_MAX)
    expect(r.motif).toMatch(/le temps de génération est épuisé/u)
  })

  it('⑥ la boucle s’arrête au plafond de coût', async () => {
    let appels = 0
    const r = await boucleEcriture({
      demande: 'x',
      appeler: (async () => { appels += 1; return { texte: alterne(appels), tronquee: false, coutUsd: 0.2 } }) as never,
      juger: jugeMuet,
      plafondUsd: 0.5,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(appels, '0,2 $ par tour, plafond 0,5 : deux tours seulement').toBe(2)
    expect(r.motif).toMatch(/plafond de coût/u)
  })

  it('⑦ BLOQUANT · une œuvre qui ne se monte pas n’est JAMAIS livrée, même au dernier tour', async () => {
    const neSeMontePas = (async () => ({
      monteDansSimulateur: false,
      erreurs: [{ quoi: 'import', message: 'import__embarque_react_dom.default.render is not a function', indice: '' }],
      octetsRendus: 0, texte: '', ms: 0,
    })) as unknown as typeof jugeMuet
    const r = await boucleEcriture({
      demande: 'x',
      appeler: (async () => ({ texte: '=== index.tsx ===\nexport const a = 1', tronquee: false })) as never,
      juger: neSeMontePas,
      toursMax: 2,
    })
    expect(r.ok, 'une application qui ne démarre pas a été livrée').toBe(false)
    if (r.ok) return
    expect(r.raison).toBe('bloquant')
    expect(r.motif).toMatch(/Après 2 essai\(s\), l’application ne démarrait toujours pas : rien n’a été livré/u)
    expect(r.tours.every((t) => !t.ok)).toBe(true)
  })

  it('⑧ NON BLOQUANT · un contrôle mort au dernier tour accompagne l’œuvre, il ne la refuse pas', async () => {
    const r = await boucleEcriture({
      demande: 'x',
      appeler: (async () => ({ texte: '=== index.tsx ===\nexport const B = () => <button type="button">Rien</button>', tronquee: false })) as never,
      juger: jugeMuet,
      toursMax: 1,
    })
    expect(r.ok, r.ok ? '' : r.motif).toBe(true)
    if (!r.ok) return
    expect(r.vivacite.length, 'le contrôle mort n’est plus dit').toBeGreaterThan(0)
  })

  it('⑨ STAGNATION · deux tours sur les mêmes familles : on s’arrête, et on livre si rien n’est bloquant', async () => {
    let appels = 0
    const r = await boucleEcriture({
      demande: 'x',
      appeler: (async () => { appels += 1; return { texte: '=== index.tsx ===\nexport const B = () => <button type="button">Rien</button>', tronquee: false } }) as never,
      juger: jugeMuet,
    })
    expect(appels, 'la boucle a tourné à vide').toBe(2)
    expect(r.ok).toBe(true)
  })

  it('⑩ deux erreurs d’assemblage DIFFÉRENTES sont un progrès ; la même deux fois, une stagnation', () => {
    const a = 'La construction a échoué :\n[UNRESOLVED_IMPORT] Could not resolve ./App'
    const b = 'La construction a échoué :\n[MISSING_EXPORT] formatterMontant'
    expect(famillesDe(a)).not.toBe(famillesDe(b))
    expect(famillesDe(a)).toBe(famillesDe('La construction a échoué :\n[UNRESOLVED_IMPORT] Could not resolve ./Autre'))
    expect(famillesDe('DES CONTRÔLES MORTS — x\n- a\n\nDES JETONS QUI N’EXISTENT PAS — y'))
      .toBe(famillesDe('DES JETONS QUI N’EXISTENT PAS — z\n\nDES CONTRÔLES MORTS — w'))
  })
})

