import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Organigramme from '../../app/sites/[slug]/pages/Organigramme'
import { lireBlocs } from '../../app/sites/[slug]/pages/blocs'

// L'affichage « boîtes » (demande CPA, 2026-11-11) est FACULTATIF : sans lui,
// le rendu de tous les sites reste l'arbre replié d'avant.
const items = [
  { cle: 'ca', fonction: 'Conseil' },
  { cle: 'dg', parent: 'ca', fonction: 'Direction générale', nom: 'Un nom' },
  { cle: 'd1', parent: 'dg', fonction: 'Direction A' },
  { cle: 'd2', parent: 'dg', fonction: 'Direction B' },
]
const rendre = (affichage?: string) => renderToStaticMarkup(createElement(Organigramme, { items, titre: 'T', affichage }))

describe('organigramme — affichage boîtes', () => {
  it('sans option : aucune boîte, l’arbre replié seul', () => {
    const h = rendre()
    expect(h).not.toContain('organigrammeBoites')
    expect(h).toContain('<details')
  })

  it('valeur inconnue : retombe sur l’arbre replié', () => {
    expect(rendre('autre')).not.toContain('organigrammeBoites')
  })

  it('« boites » : les boîtes, et l’arbre pour les écrans étroits', () => {
    const h = rendre('boites')
    expect(h).toContain('organigrammeBoites')
    expect(h).toContain('orgSeulementEtroit')
    // Chaque fonction apparaît deux fois : une par forme (une seule est affichée).
    for (const i of items) expect(h.split(i.fonction).length - 1).toBe(2)
    expect(h).toContain('Un nom')
  })

  it('le champ « affichage » traverse la lecture des blocs', () => {
    const [b] = lireBlocs([{ type: 'organigramme', affichage: 'boites', items }])
    expect(b).toMatchObject({ type: 'organigramme', affichage: 'boites' })
  })
})
