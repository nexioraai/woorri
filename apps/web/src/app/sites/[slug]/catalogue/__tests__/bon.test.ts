import { describe, it, expect } from 'vitest'
import { lienEnvoi, lireLignesAdresse, lignesDe, uniteDe } from '../bon'

// LE BON EN PRÉPARATION (CPA, 2026-11-20) : ce qui part du catalogue arrive
// intact dans « Mes commandes », et rien d'étranger ne s'y glisse.
describe('le bon de commande en préparation', () => {
  it('🔴 aller-retour : les lignes du bon arrivent telles quelles dans « Mes commandes »', () => {
    const url = new URL(lienEnvoi('https://cpa.example', [
      { reference: 'EX-PARA-500', designation: 'Paracétamol 500 mg', quantite: 12, unite: 'boîtes' },
      { reference: 'EX-OXY-10', designation: 'Ocytocine 10 UI | ml', quantite: 3, unite: 'boîtes' },
    ]))
    expect(url.pathname).toBe('/mes-commandes')
    expect(url.searchParams.get('depuis')).toBe('bon')
    expect(lireLignesAdresse(url.searchParams.getAll('l'))).toEqual([
      { designation: 'Paracétamol 500 mg', quantite: '12', unite: 'boîtes' },
      { designation: 'Ocytocine 10 UI / ml', quantite: '3', unite: 'boîtes' },
    ])
  })

  it('🔴 une adresse forgée est bornée : quantité invalide vidée, 50 lignes au plus', () => {
    expect(lireLignesAdresse('Gants|-4|cartons')).toEqual([{ designation: 'Gants', quantite: '', unite: 'cartons' }])
    expect(lireLignesAdresse(Array.from({ length: 80 }, (_, i) => `P${i}|1|u`))).toHaveLength(50)
    expect(lireLignesAdresse(['|3|u', undefined as unknown as string].filter(Boolean))).toEqual([])
  })

  it('🔴 un stockage abîmé ne casse rien : les lignes illisibles sont écartées', () => {
    expect(lignesDe('pas du json')).toEqual([])
    expect(lignesDe(JSON.stringify([{ designation: 'A', quantite: 0 }, { designation: 'B', quantite: 2, reference: 'R', unite: 'u' }, 7])))
      .toEqual([{ designation: 'B', quantite: 2, reference: 'R', unite: 'u' }])
  })

  it('🔴 l’unité se déduit du conditionnement', () => {
    expect(uniteDe('Boîte de 1 000 comprimés')).toBe('boîtes')
    expect(uniteDe('Flacon multidose')).toBe('flacons')
    expect(uniteDe('Carton de 100 sachets')).toBe('cartons')
    expect(uniteDe(null)).toBe('unités')
  })
})
