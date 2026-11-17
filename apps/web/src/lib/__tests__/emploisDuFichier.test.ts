import { describe, it, expect } from 'vitest'
import { cleDuFichier, emploisDansLeSite, emploisDansLesPages, messageEmploye } from '../fichiers/emploisDuFichier'

const ID = '3b74afa7-dc47-4d5d-b655-181b8ff7e69a'
const url = (nom: string) => `https://x.supabase.co/storage/v1/object/public/site-fichiers/sites/${ID}/photos/${nom}`

describe('emploisDuFichier — un fichier employé ne se retire pas (CPA, 2026-11-16)', () => {
  const cle = cleDuFichier(ID, 'photos', 'a.png')

  it('trouve la photo du hero dans les blocs de la page accueil-hero', () => {
    const pages = [{ chemin: 'accueil-hero', titre: 'Hero', blocs: [{ type: 'etapes', etapes: [{ image: url('a.png') }] }] }]
    expect(emploisDansLesPages(pages, cle)).toEqual([{ ou: 'Hero — photos de l’accueil' }])
  })

  it('trouve une colonne texte et une colonne JSON du site', () => {
    const site = { id: ID, hero_image: url('a.png'), gallery: [url('b.png')], partenaires: [{ logo: url('a.png') }] }
    expect(emploisDansLeSite(site, cle).map((e) => e.ou)).toEqual(['Hero — photos de l’accueil', 'Partenaires'])
  })

  it('ne confond ni un autre nom, ni un autre site, ni un nom plus long', () => {
    const site = { gallery: [url('b.png'), url('a.png.old')], hero_image: `sites/autre/photos/a.png` }
    expect(emploisDansLeSite(site, cle)).toEqual([])
    expect(emploisDansLesPages([{ chemin: 'x', blocs: [{ image: url('b.png') }] }], cle)).toEqual([])
  })

  it('rien d’employé → retrait permis ; message sans doublon sinon', () => {
    expect(emploisDansLeSite(null, cle)).toEqual([])
    expect(emploisDansLesPages(null, cle)).toEqual([])
    expect(messageEmploye([{ ou: 'Logo' }, { ou: 'Logo' }])).toBe('Ce fichier est encore employé : Logo. Remplacez-le d’abord à cet endroit, puis retirez-le.')
  })
})
