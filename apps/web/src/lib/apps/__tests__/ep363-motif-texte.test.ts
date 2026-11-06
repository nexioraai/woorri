/**
 * EP-363 · P-a — UN MOTIF DE TEXTE SURVIT À UNE REFORMULATION.
 *
 * Les quatre cas RÉELS du 2026-11-05, rejoués : chacun a rougi sur un
 * texte dont le sens n'avait pas bougé, seulement la largeur.
 */
import { describe, expect, it } from 'vitest'
import { motifTexte, motifEntre } from './motif-texte'

describe('EP-363 · motifTexte', () => {
  it('① LA PHRASE PASSE, REPLIÉE OU NON — les quatre cas réels', () => {
    for (const [quoi, phrase, replie] of [
      ['EP-352', 'lien vers un document', 'un lien vers un\n   document se met en `text`'],
      ['EP-276', 'identifiant de base de données', 'Jamais un identifiant de\n   base de données sous'],
      ['EP-319', 'ouvrir la base lui-même', 'l’oblige à ouvrir\n   la base lui-même — écris'],
      ['EP-356', 'PAR TOUT LE MONDE sans compte', 'lisible PAR TOUT LE MONDE\nsans compte : voici'],
    ] as const) {
      expect(motifTexte(phrase).test(replie), `${quoi} : le repli casse encore`).toBe(true)
      expect(
        motifTexte(phrase).test(phrase),
        `${quoi} : la phrase sur une ligne ne passe plus`,
      ).toBe(true)
    }
  })

  it('② ET IL NE DEVIENT PAS UNE FENÊTRE : les mots restent voisins', () => {
    // ── LA MOITIÉ QUI COMPTE AUTANT.
    //
    // Une tolérance au blanc qui accepterait n'importe quoi entre les
    // mots serait une fenêtre déguisée — et un contrôle qui trouve
    // « lien … document » à trois phrases d'écart ne mesure plus rien.
    const m = motifTexte('lien vers un document')
    expect(m.test('lien vers un autre document'), 'un mot s’est glissé et ça passe').toBe(false)
    expect(m.test('lien vers un\n\n\t  document'), 'deux retours et une tabulation').toBe(true)
  })

  it('③ UNE PHRASE N’EST PAS UNE EXPRESSION RÉGULIÈRE', () => {
    // Sans échappement, « base.storage (…) » deviendrait un motif qui
    // accepte n'importe quel signe à la place du point — et un contrôle
    // qui accepte plus qu'il ne croit est un faux vert.
    const m = motifTexte('base.storage est atteignable')
    expect(m.test('base.storage est atteignable')).toBe(true)
    expect(m.test('baseXstorage est atteignable'), 'le point est devenu un joker').toBe(false)
    expect(motifTexte('coût (mesuré)').test('coût (mesuré)')).toBe(true)
  })

  it('④ ET LE REPLI DANS UN COMMENTAIRE, qui porte un `//`', () => {
    // Le cas EP-301 : la phrase vit dans un bloc de commentaire, et le
    // trou porte « \n    // ». Du blanc seul n'y suffit pas.
    const replie = 'CETTE RÈGLE TOMBE LE JOUR OÙ UNE FEUILLE ENTRE DANS LA\n    // CHAÎNE'
    expect(motifTexte('DANS LA CHAÎNE').test(replie), 'le `//` casse encore').toBe(false)
    expect(
      motifTexte('DANS LA CHAÎNE', true).test(replie),
      'le mode commentaire ne passe pas le `//`',
    ).toBe(true)
  })

  it('⑤ ET QUAND LE TROU N’EST PAS DU BLANC, LA FENÊTRE EST LARGE', () => {
    // ── POURQUOI 400 PAR DÉFAUT.
    //
    // Une fenêtre trop large ne rend pas un faux rouge : elle rend un
    // contrôle un peu moins précis. Une fenêtre trop étroite rend un
    // rouge sur du code juste — et pour une assertion NÉGATIVE, elle
    // cesse de garder en silence. On se trompe du bon côté.
    const m = motifEntre('Cette liste sera lisible', 'PAR TOUT LE MONDE')
    expect(m.test("Cette liste sera lisible' } ` +\n          `PAR TOUT LE MONDE")).toBe(true)
    expect(motifEntre('a', 'b', 3).test('a' + 'x'.repeat(50) + 'b'), 'la fenêtre ne borne plus').toBe(
      false,
    )
  })
})
