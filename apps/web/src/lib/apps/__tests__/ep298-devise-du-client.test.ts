/**
 * EP-298 — L'ARGENT PARLE LA DEVISE DU CLIENT, et la boucle y veille.
 *
 * Mesuré le 2026-10-31 (tir eb7b62b5) : devise demandée, validée (EP-293),
 * transmise (EP-296) — et le code affichait 10× EUR, 8× €, zéro FCFA, pour
 * une base tchadienne. L'instruction sans contrôle était un vœu : voici le
 * contrôle.
 */
import { describe, expect, it } from 'vitest'
import { boucleEcriture } from '../boucle-directe'
import { jugerDevise } from '../juge-devise'

const PRIX_EUR = 'export const prix = () => <p>Total : 25 000 € (EUR)</p>'
const PRIX_FCFA = "export const prix = () => <p>Total : 25 000 FCFA</p>"

describe('EP-298 · le juge de devise', () => {
  it('① LE TIR RÉEL EST REFUSÉ : EUR et € sur une configuration XAF', () => {
    const d = jugerDevise(new Map([['Prix.tsx', PRIX_EUR]]), 'XAF')
    expect(d.map((x) => x.marque).sort()).toEqual(['EUR', '€'])
  })

  it('② LA BONNE DEVISE PASSE — et le gabarit ${} n’est pas un prix', () => {
    expect(jugerDevise(new Map([['Prix.tsx', PRIX_FCFA]]), 'XAF')).toEqual([])
    const gabarit = 'export const t = `Total : ${total} FCFA`'
    expect(jugerDevise(new Map([['T.ts', gabarit]]), 'XAF')).toEqual([])
  })

  it('③ SANS CONFIGURATION, RIEN À EXIGER — contrôle négatif', () => {
    expect(jugerDevise(new Map([['Prix.tsx', PRIX_EUR]]), undefined)).toEqual([])
    expect(jugerDevise(new Map([['Prix.tsx', PRIX_EUR]]), 'les 3')).toEqual([])
  })

  it('④ LA BOUCLE RENVOIE LA DEVISE ÉTRANGÈRE AU MODÈLE', async () => {
    const REPONSES = [
      '=== index.tsx ===\n' + PRIX_EUR,
      '=== index.tsx ===\n' + PRIX_FCFA + '\n=== PERIMETRE.md ===\n- rien d’autre.',
    ]
    const appels: string[][] = []
    const appeler = async (messages: readonly { role: string; content: string }[]) => {
      appels.push(messages.map((m) => m.content))
      return { texte: REPONSES[appels.length - 1] ?? '', tronquee: false, jetonsEntree: 1, jetonsSortie: 1 }
    }
    const r = await boucleEcriture({
      demande: 'Une page de prix.',
      configuration: { currency: 'XAF' },
      appeler: appeler as never,
    })
    expect(appels.length, 'le tour en EUR n’a pas été renvoyé').toBe(2)
    expect(appels[1]!.join('\n')).toMatch(/FCFA|XAF/u)
    expect(r.ok).toBe(true)
  })
})
