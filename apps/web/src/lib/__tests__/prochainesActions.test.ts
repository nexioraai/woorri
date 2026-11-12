import { describe, it, expect } from 'vitest'
import { prochainesActions, compterFiches, type DonneesProjet } from '@/lib/dashboard/prochainesActions'

const cpa: DonneesProjet = {
  slug: 'cpa', published: true, logo_url: null, custom_domain: null,
  contact: { email: 'cpa.tchad@yahoo.fr', phone: '+235 22 51 80 57' },
  publishes_tenders: true, lacunesIA: ['faq'], fichesSansPhoto: 23, fiches: 32, avisPublie: false,
}

describe('prochaines actions', () => {
  it('CPA : les vraies lacunes, à faire d’abord, faites ensuite', () => {
    const a = prochainesActions(cpa)
    expect(a.map((x) => [x.cle, x.faite])).toEqual([
      ['logo', false], ['photos', false], ['avis', false], ['domaine', false], ['visibilite', false],
      ['enLigne', true], ['contacts', true],
    ])
    expect(a.find((x) => x.cle === 'photos')?.n).toBe(23)
    expect(a.find((x) => x.cle === 'avis')?.vers).toBe('/offres/cpa')
  })

  it('une donnée non lue (null) n’invente ni « fait » ni « à faire » : l’action est omise', () => {
    const a = prochainesActions({ ...cpa, fiches: null, fichesSansPhoto: null, avisPublie: null })
    expect(a.map((x) => x.cle)).not.toContain('photos')
    expect(a.map((x) => x.cle)).not.toContain('avis')
  })

  it('un site sans marchés ni fiches n’a ni action « appel d’offres » ni « photos »', () => {
    const a = prochainesActions({ ...cpa, publishes_tenders: false, fiches: 0, fichesSansPhoto: 0 })
    expect(a.map((x) => x.cle)).toEqual(['logo', 'domaine', 'visibilite', 'enLigne', 'contacts'])
  })

  it('compte les fiches : citation à champ photo en tête ; le gabarit https:// n’est pas une photo', () => {
    expect(compterFiches([
      { blocs: [{ type: 'citation', photo: '' }] },
      { blocs: [{ type: 'citation', photo: 'https://' }] },
      { blocs: [{ type: 'citation', photo: 'https://images.pexels.com/a.jpg' }] },
      { blocs: [{ type: 'citation', texte: 'sans champ photo' }] },
      { blocs: [{ type: 'texte' }] },
      { blocs: null },
    ])).toEqual({ fiches: 3, sansPhoto: 2 })
  })
})
