/**
 * EP-316 — LA RETOUCHE : ce qui protège l'œuvre pendant qu'on la modifie.
 *
 * Quatre règles, chacune venant d'une exigence du propriétaire, et chacune
 * cassable seule.
 */
import { describe, expect, it } from 'vitest'
import {
  comparerJuges,
  etapeRetouche,
  JETONS_PAR_OCTET,
  plafondRetouche,
  refusHorsPerimetre,
} from '../retouche'

describe('EP-316 — la retouche', () => {
  it('① LE PRIX EST UN PLAFOND, ET IL LE DIT — « au plus », pas « environ »', () => {
    // « Environ » annonce une estimation ; ce nombre est un maximum. Le mot
    // doit dire ce que le nombre est.
    const p = plafondRetouche(106_821, 16_000, { entree: 0.66, sortie: 1.98 })
    expect(p.phrase).toMatch(/^au plus /u)
    expect(p.phrase).not.toMatch(/environ/u)
    // ET IL EST CALCULÉ PAR ŒUVRE : la plus grosse version stockée fait
    // 106 821 octets contre 51 709 pour la plus petite courante. Un plafond
    // figé sur la petite ne serait plus un plafond sur la grosse.
    const petite = plafondRetouche(51_709, 16_000, { entree: 0.66, sortie: 1.98 })
    expect(p.usd).toBeGreaterThan(petite.usd)
    // Le rapport vient d'une mesure réelle : 22 382 jetons / 74 752 octets.
    expect(JETONS_PAR_OCTET).toBeCloseTo(0.3, 2)
  })

  it('② UN JUGE QUI EMPIRE EST NOMMÉ ; UN JUGE DÉJÀ ROUGE NE BLOQUE PAS', () => {
    // Une œuvre livrée porte déjà des défauts. Exiger zéro refuserait toute
    // retouche sur une application qui marche : on refuse D'EN AJOUTER.
    const v = comparerJuges(
      [{ nom: 'jetons', defauts: 0 }, { nom: 'muets', defauts: 3 }],
      [{ nom: 'jetons', defauts: 2 }, { nom: 'muets', defauts: 3 }],
      null,
    )
    expect(v.regressions).toEqual([{ juge: 'jetons', avant: 0, apres: 2 }])
    // Trois contrôles muets avant, trois après : rien n'a empiré.
    expect(v.regressions.some((r) => r.juge === 'muets')).toBe(false)
  })

  it('③ LA COUVERTURE QUI BAISSE SE DEMANDE, ELLE NE BLOQUE PAS', () => {
    // Supprimer un écran est une demande LÉGITIME. Un juge qui l'interdirait
    // ferait de la couverture une prison.
    const v = comparerJuges([], [], { avant: 12, apres: 9 })
    expect(v.regressions).toEqual([])
    expect(v.couvertureEnBaisse).toEqual({ avant: 12, apres: 9 })
    expect(comparerJuges([], [], { avant: 9, apres: 12 }).couvertureEnBaisse).toBeNull()
  })

  it('④ LE REFUS HORS PÉRIMÈTRE EST LU, ET LA VERSION PARLE HUMAIN', () => {
    expect(refusHorsPerimetre('HORS PERIMETRE : il faudrait un écran nouveau.'))
      .toBe('il faudrait un écran nouveau.')
    expect(refusHorsPerimetre('=== systeme/ui.tsx ===\nconst x = 1')).toBeNull()
    // « modification » ne dit rien ; « modifiée : boutons en vert » se relit
    // six mois plus tard.
    expect(etapeRetouche('  mets les boutons   en vert ')).toBe('modifiée : mets les boutons en vert')
    expect(etapeRetouche('x'.repeat(200)).length).toBeLessThan(75)
  })
})
