import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SuiviCommande, { etapeAtteinte } from '../SuiviCommande'
import { motsCommandes } from '../motsCommandes'

// LE SUIVI D'UNE COMMANDE (CPA, 2026-11-19) : reçue → en cours → validée →
// livrée. Une commande annulée le DIT, sans frise trompeuse.
const m = motsCommandes('fr')
const rendre = (etat: string) => renderToStaticMarkup(<SuiviCommande etat={etat} libelles={m.etapes} accent="#003670" annulee={m.annulee} />)

describe('SuiviCommande', () => {
  it('les quatre étapes, dans l’ordre', () => {
    expect(['recue', 'en_cours', 'validee', 'livree'].map(etapeAtteinte)).toEqual([0, 1, 2, 3])
    const h = rendre('validee')
    expect(h.indexOf('Reçue')).toBeLessThan(h.indexOf('En cours'))
    expect(h.indexOf('Validée')).toBeLessThan(h.indexOf('Livrée'))
  })

  it('l’étape ACTUELLE est marquée, une seule fois', () => {
    const h = rendre('en_cours')
    expect(h.match(/aria-current="step"/g)).toHaveLength(1)
    expect((h.match(/✓/g) ?? []).length).toBe(2)
  })

  it('une commande annulée ne montre pas de frise', () => {
    const h = rendre('annulee')
    expect(etapeAtteinte('annulee')).toBe(-1)
    expect(h).toContain('Commande annulée')
    expect(h).not.toContain('<ol')
  })
})
