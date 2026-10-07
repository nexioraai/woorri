// ============================================================
// CLIQUET — UNE VRAIE BOUTIQUE DEVIENT UN DOCUMENT COMPILABLE.
//
// ── UNE LEÇON PAYÉE PENDANT L'ÉCRITURE DE CE LOT.
//
// `validateAir()` rendait « 0 erreur » sur un document que le SCHÉMA refusait :
// une clé `label` posée sur une entité, que seul le parseur strict voit. Les
// deux contrôles n'ont pas la même portée — l'un juge le SENS, l'autre la
// FORME — et j'ai pris le premier pour une preuve.
//
// Ces tests passent donc par `projectAirSchema`, celui qui refuse.
// ============================================================
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import { compileWeb } from '@deribfy/compiler'
import { documentDeLaBoutique, type BoutiqueSource } from '../document'
import { zipper } from '../zip'

const boutique = (p: Partial<BoutiqueSource> = {}): BoutiqueSource => ({
  slug: 'biyaminchine-1791290137067',
  nom: 'Biyaminchine',
  couleur: '#C41E3A',
  description: 'Mode et accessoires',
  nombreArticles: 36,
  ...p,
})

describe('CLIQUET — le document d une boutique', () => {
  it('LE SCHEMA STRICT L ACCEPTE — pas seulement le controle semantique', () => {
    const r = projectAirSchema.safeParse(documentDeLaBoutique(boutique()))
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues.slice(0, 3))).toBe(true)
  })

  it('il porte l identite REELLE de la boutique, pas celle d un modele', () => {
    const d = documentDeLaBoutique(boutique())
    expect(d.app.name).toBe('Biyaminchine')
    expect(d.app.slug).toBe('biyaminchine-1791290137067')
    expect(JSON.stringify(d)).not.toMatch(/boutique-mode|Boutique Mode/u)
  })

  it('un slug hostile ne produit pas d identifiant invalide', () => {
    // Quatre pieges reels : un point et des majuscules, un chiffre en tete,
    // un slug reduit a une lettre, un slug entierement illegal, et un nom a
    // rallonge que le schema borne a 63 caracteres.
    for (const slug of ['Ma Boutique.SY', '2048-shop', 'e', '---', 'x'.repeat(200)]) {
      const r = projectAirSchema.safeParse(documentDeLaBoutique(boutique({ slug })))
      expect(r.success, slug).toBe(true)
    }
  })

  it('LA TAILLE DU CATALOGUE EST BORNEE — ni zero ligne, ni deux mille', () => {
    const lignes = (n: number): number =>
      documentDeLaBoutique(boutique({ nombreArticles: n })).datasets?.[0]?.rowCount ?? -1
    expect(lignes(0)).toBe(1)
    expect(lignes(7)).toBe(7)
    expect(lignes(2000)).toBe(24)
  })

  it('deux boutiques differentes n ont pas le meme jeu d apercu', () => {
    const a = documentDeLaBoutique(boutique({ slug: 'alpha' })).datasets?.[0]?.contentHash
    const b = documentDeLaBoutique(boutique({ slug: 'beta' })).datasets?.[0]?.contentHash
    expect(a).not.toBe(b)
  })

  it('ET IL COMPILE, jusqu a une archive que le systeme sait relire', () => {
    const projet = compileWeb(documentDeLaBoutique(boutique()))
    expect(projet.files.size).toBeGreaterThan(40)
    expect(projet.files.get('index.html')).toContain('Biyaminchine')
    const archive = zipper(new Map(projet.files))
    // La signature d un fichier ZIP commence par les deux lettres PK.
    expect(archive.subarray(0, 2).toString('latin1')).toBe('PK')
    expect(archive.length).toBeGreaterThan(10_000)
  })
})
