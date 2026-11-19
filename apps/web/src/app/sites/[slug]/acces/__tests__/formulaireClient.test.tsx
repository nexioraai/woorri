import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import FormulaireAcces from '../FormulaireAcces'
import { motsAcces } from '../libelles'

// « C'est l'espace client, le fournisseur n'a rien à voir ici ; parmi les
// clients il y a des ONG » (CPA, 2026-11-19).
const m = motsAcces('fr')
const rendre = (pour?: 'client' | 'fournisseur') => renderToStaticMarkup(
  <FormulaireAcces ecran="inscription" destination="/espace-client" libelles={m.inscription.libelles} primary="#003670"
    slug="cpa" champs={m.inscription.champs} pour={pour} />,
)

describe('le formulaire de création de compte', () => {
  it('🔴 par défaut (espace client) : structure sanitaire OU ONG, jamais « fournisseur »', () => {
    const h = rendre()
    expect(h).toContain('Structure sanitaire')
    expect(h).toContain('ONG ou association')
    expect(h).not.toContain('>Fournisseur<')
    expect(h).not.toMatch(/value="fournisseur"/)
  })

  it('le formulaire fournisseur n’offre aucun choix de client', () => {
    const h = rendre('fournisseur')
    expect(h).not.toContain('ONG ou association')
    expect(h).not.toMatch(/name="type_client"/)
  })
})
