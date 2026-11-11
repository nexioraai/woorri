import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Organigramme, { lienValable, PROFONDEUR_MAX } from '../../app/sites/[slug]/pages/Organigramme'
import { lireBlocs } from '../../app/sites/[slug]/pages/blocs'
import { champsDuBloc } from '../../components/edit/champsDeBloc'

// L'affichage « boîtes » (demande CPA, 2026-11-11) est FACULTATIF : sans lui,
// le rendu de tous les sites reste l'arbre replié d'avant.
const items = [
  { cle: 'ca', fonction: 'Conseil' },
  { cle: 'dg', parent: 'ca', fonction: 'Direction générale', nom: 'Un nom' },
  { cle: 'd1', parent: 'dg', fonction: 'Direction A' },
  { cle: 'd2', parent: 'dg', fonction: 'Direction B' },
]
const rendre = (affichage?: string, it: object[] = items) =>
  renderToStaticMarkup(createElement(Organigramme, { items: it as never, titre: 'T', affichage, base: 'https://site.test' }))

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

describe('organigramme — boîtes cliquables, couleurs, poste latéral', () => {
  it('un lien vers une page du site rend la boîte cliquable, dans les DEUX formes', () => {
    const h = rendre('boites', [{ cle: 'ca', fonction: 'Conseil', lien: 'qui-sommes-nous/direction/conseil' }])
    expect(h.split('href="https://site.test/qui-sommes-nous/direction/conseil"').length - 1).toBe(2)
  })

  it('un lien hors du site ou dangereux est ignoré', () => {
    for (const l of ['javascript:alert(1)', 'https://ailleurs.test', '//ailleurs.test', '/abs', '']) {
      expect(lienValable(l)).toBe(false)
      expect(rendre('boites', [{ cle: 'ca', fonction: 'Conseil', lien: l }])).not.toContain('href=')
    }
    expect(lienValable('qui-sommes-nous/direction')).toBe(true)
  })

  it('la couleur suit la palette ; une valeur inconnue laisse la boîte blanche', () => {
    expect(rendre('boites', [{ cle: 'a', fonction: 'A', couleur: 'bleu' }])).toContain('style="background:#00B0F0')
    expect(rendre('boites', [{ cle: 'a', fonction: 'A', couleur: 'violet' }])).not.toContain('style="background:')
  })

  it('un poste latéral est rendu À CÔTÉ de son supérieur, pas dans la rangée', () => {
    const h = rendre('boites', [
      { cle: 'd', fonction: 'Direction' },
      { cle: 'ad', parent: 'd', fonction: 'Assistance', cote: 'lateral' },
      { cle: 'x', parent: 'd', fonction: 'Division X' },
    ])
    const large = h.slice(h.indexOf('class="orgSeulementLarge"'), h.indexOf('class="orgSeulementEtroit"'))
    expect(large).toMatch(/laterauxOrg[^]*Assistance/)
    // Dans la rangée des subordonnés (le <ul> imbriqué), seule la division.
    const rangee = large.slice(large.indexOf('<ul', large.indexOf('<ul') + 1))
    expect(rangee).toContain('Division X')
    expect(rangee).not.toContain('Assistance')
  })

  it('six niveaux sont rendus', () => {
    expect(PROFONDEUR_MAX).toBe(6)
    const chaine = Array.from({ length: 6 }, (_, i) => ({ cle: `n${i}`, ...(i ? { parent: `n${i - 1}` } : {}), fonction: `Niveau${i + 1}` }))
    expect(rendre('boites', chaine)).toContain('Niveau6')
  })

  it('l’éditeur propose nom, lien et couleur pour chaque boîte', () => {
    const chemins = champsDuBloc({ type: 'organigramme', items: [{ cle: 'a', fonction: 'A' }] } as never).map((c) => c.chemin.join('.'))
    expect(chemins).toEqual(expect.arrayContaining(['items.0.nom', 'items.0.lien', 'items.0.couleur']))
  })
})
