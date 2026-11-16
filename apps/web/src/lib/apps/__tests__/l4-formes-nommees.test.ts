/**
 * L4 (2026-11-16) — LA CONSIGNE DIT LA FORME DES LISTES, MÊME PAR UN TYPE NOMMÉ.
 *
 * Mesuré (EXPERIENCE_UNE_VRAIE_APPLI.md §7) : sur 16 réglages-listes de la
 * bibliothèque, 1 seul disait la forme de ses éléments ; le lecteur ne
 * suivait pas les types nommés (`SectionGestion[]`, `Point[]`). Le modèle
 * devinait les champs des sections du menu, et les boutons sortaient vides.
 * Éprouvé (tir 4) : la forme donnée, `libelle` vient dès le premier tour.
 */
import { describe, expect, it } from 'vitest'
import { signaturesDe } from '../juge-contrat'
import { fichiersSysteme } from '../bibliotheque-ui'
import { consignePour } from '../boucle-directe'

const sig = signaturesDe(fichiersSysteme(undefined))

describe('L4 · les formes des listes, types nommés compris', () => {
  it('① les sections du menu disent leurs champs', () => {
    expect(sig.get('CoqueGestion')?.formes.sections).toEqual(['cle', 'id', 'libelle', 'icone', 'nombre'])
  })

  it('② les séries de points aussi (type Point, déclaré dans un autre fichier)', () => {
    expect(sig.get('Courbe')?.formes.points).toEqual(['libelle', 'valeur'])
    expect(sig.get('ListeRecente')?.formes.elements).toEqual(['titre', 'detail', 'genre', 'quand', 'date'])
  })

  it('③ au moins 13 listes sur 16 disent désormais leur forme', () => {
    let listes = 0
    let decrites = 0
    for (const s of sig.values()) {
      for (const l of s.listes) {
        listes += 1
        if (s.formes[l] !== undefined) decrites += 1
      }
    }
    expect(listes).toBe(16)
    expect(decrites).toBeGreaterThanOrEqual(13)
  })

  it('④ la consigne envoyée au modèle porte la forme des sections', () => {
    expect(consignePour([])).toContain('sections[{cle, id, libelle, icone, nombre}]')
  })
})
