// ============================================================
// CLIQUET — LE GENERATEUR N'A BESOIN D'AUCUNE BOUTIQUE.
//
// Premiere version du branchement : un bouton dans l'editeur d'une BOUTIQUE.
// Le proprietaire l'a repris, et il avait raison — le moteur a produit
// `tontine`, qui n'est la boutique de personne. Faire entrer cette capacite
// par la porte d'un commerce la reduisait a un gadget de marchand.
//
// Ces tests tiennent la propriete qui compte : une DESCRIPTION LIBRE suffit a
// produire une application. Si quelqu'un rebranche un jour le generateur sur
// une entite de boutique, ils tombent.
// ============================================================
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import { compileWeb } from '@deribfy/compiler'
import { documentDeLaBoutique } from '../document'
import { zipper } from '../zip'

/** Ce que la route construit a partir du formulaire, sans aucune boutique. */
const depuisUneDescription = (nom: string, description: string | null, elements: number) =>
  documentDeLaBoutique({ slug: nom, nom, couleur: null, description, nombreArticles: elements })

describe('CLIQUET — une description libre suffit', () => {
  it('un nom seul produit un document valide', () => {
    const r = projectAirSchema.safeParse(depuisUneDescription('Tontine.SY', null, 6))
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues.slice(0, 2))).toBe(true)
  })

  it('DES NOMS REELS ET HOSTILES passent tous', () => {
    // Le nom saisi sert d'identite technique : il doit etre assaini, jamais
    // recopie. « Tontine.SY » et « 2048 » faisaient tomber le document avant
    // que des tests ne le montrent.
    for (const nom of ['Tontine.SY', 'SGD Dougouma', '2048', 'A', 'Clinique Saint-Élie', 'x'.repeat(60)]) {
      const r = projectAirSchema.safeParse(depuisUneDescription(nom, 'une description', 10))
      expect(r.success, nom).toBe(true)
    }
  })

  it('et chacun COMPILE jusqu a une archive', () => {
    const projet = compileWeb(depuisUneDescription('Tontine.SY', 'Cotisations entre membres', 12))
    expect(projet.files.size).toBeGreaterThan(40)
    expect(projet.files.get('index.html')).toContain('Tontine.SY')
    expect(zipper(new Map(projet.files)).subarray(0, 2).toString('latin1')).toBe('PK')
  })

  it('LE DOCUMENT NE PARLE D AUCUNE BOUTIQUE — ni modele, ni marchand', () => {
    const texte = JSON.stringify(depuisUneDescription('Clinique Saint-Elie', 'Suivi des patients', 8))
    for (const mot of ['boutique-mode', 'Boutique Mode', 'biyaminchine', 'shop_products']) {
      expect(texte, mot).not.toContain(mot)
    }
  })
})
