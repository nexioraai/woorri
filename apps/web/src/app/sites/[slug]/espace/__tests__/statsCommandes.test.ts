import { describe, it, expect } from 'vitest'
import { derniersMois, commandesParMois, unitesParMois, repartitionEtats, produitsLesPlusCommandes, clientsLesPlusActifs, type CommandeStat } from '../statsCommandes'

// LES CHIFFRES DU TABLEAU DE BORD (CPA, 2026-11-19) : tout vient des
// commandes rendues ; un mois vide vaut 0 ; une commande annulée ne compte
// pas dans les produits demandés.
const C = (id: string, etat: string, cree_le: string, lignes: [string, number][], org = 'ONG TESA'): CommandeStat =>
  ({ id, reference: id, etat, cree_le, lignes: lignes.map(([designation, quantite]) => ({ designation, quantite })), client: { organisation: org } })

const L = [
  C('a', 'livree', '2026-09-03', [['Paracétamol', 100]]),
  C('b', 'recue', '2026-11-02', [['paracétamol ', 20], ['Amoxicilline', 5]], 'Hôpital A'),
  C('c', 'annulee', '2026-11-10', [['Quinine', 999]]),
  C('d', 'en_cours', '2026-11-15', [['Amoxicilline', 7]], 'Hôpital A'),
]

describe('statsCommandes', () => {
  it('six mois, du plus ancien au mois courant, à cheval sur l’année', () => {
    expect(derniersMois(6, new Date('2026-11-19T12:00:00Z'))).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(derniersMois(3, new Date('2027-01-05T12:00:00Z'))).toEqual(['2026-11', '2026-12', '2027-01'])
  })

  it('commandes et unités par mois ; un mois vide vaut 0', () => {
    const m = ['2026-09', '2026-10', '2026-11']
    expect(commandesParMois(L, m)).toEqual([1, 0, 3])
    expect(unitesParMois(L, m)).toEqual([100, 0, 20 + 5 + 999 + 7])
  })

  it('les états, dans l’ordre du parcours, sans les états vides', () => {
    expect(repartitionEtats(L)).toEqual([{ etat: 'recue', n: 1 }, { etat: 'en_cours', n: 1 }, { etat: 'livree', n: 1 }, { etat: 'annulee', n: 1 }])
  })

  it('produits : désignations rapprochées, annulées exclues, triés par quantité', () => {
    expect(produitsLesPlusCommandes(L)).toEqual([
      { nom: 'Paracétamol', quantite: 120, unite: null },
      { nom: 'Amoxicilline', quantite: 12, unite: null },
    ])
  })

  it('clients les plus actifs', () => {
    expect(clientsLesPlusActifs(L)).toEqual(expect.arrayContaining([{ nom: 'Hôpital A', commandes: 2 }, { nom: 'ONG TESA', commandes: 2 }]))
  })
})
