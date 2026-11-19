/**
 * LE BLOC SOUS LE CHAMP DE L'ACCUEIL N'EXISTE PLUS (2026-11-19).
 *
 * « Site web — … Boutique en ligne — … Dropshipping — … Application — … » :
 * le propriétaire a demandé trois fois qu'il disparaisse. Les produits se
 * présentent désormais par la colonne « Produit » du pied de page et la page
 * Tarifs ; l'accueil animé en quatre sections viendra après Dary.
 *
 * Le type des clés de traduction empêche d'appeler une clé retirée ; ce test
 * empêche de les REMETTRE, dans aucune des quatre langues.
 */
import { describe, expect, it } from 'vitest'
import { fr } from '@/lib/translations/fr'
import { en } from '@/lib/translations/en'
import { es } from '@/lib/translations/es'
import { ar } from '@/lib/translations/ar'

describe('l’accueil n’a plus de bloc de descriptions sous le champ', () => {
  it.each([['fr', fr], ['en', en], ['es', es], ['ar', ar]] as const)('%s : aucune clé home.mode.*.desc', (_l, dico) => {
    expect(Object.keys(dico).filter((k) => /^home\.mode\.[a-z]+\.desc$/u.test(k))).toEqual([])
  })
})
