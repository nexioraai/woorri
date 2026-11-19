/**
 * LE PIED DE PAGE EN COLONNES (2026-11-18, décision du propriétaire).
 *
 * ① quatre colonnes titrées ; Confidentialité, Conditions et Témoins sont sous
 *   « Mentions légales », plus noyés entre Blog et Tarifs ;
 * ② la ligne de l'entité et du NEQ est RETIRÉE (2026-11-19) : le propriétaire
 *   règle d'abord la différence entre l'entité tchadienne et la québécoise ;
 * ③ un réseau SANS adresse n'affiche aucune icône — pas de bouton vers nulle
 *   part ; avec une adresse, l'icône mène au compte, dans un nouvel onglet.
 *
 * Ce que ce fichier ne voit pas : le rendu à l'œil (captures avant push).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Footer from '../Footer'
import { LanguageProvider } from '@/lib/translations'

const rendre = (reseaux?: Parameters<typeof Footer>[0]) =>
  renderToStaticMarkup(<LanguageProvider langueImposee="fr"><Footer {...reseaux} /></LanguageProvider>)

/** Les liens d'une colonne, dans l'ordre, repérée par son titre. */
const colonne = (html: string, titre: string): string[] => {
  const debut = html.indexOf(`aria-label="${titre}"`)
  const fin = html.indexOf('</nav>', debut)
  return [...html.slice(debut, fin).matchAll(/href="([^"]+)"/gu)].map((m) => m[1] as string)
}

describe('le pied de page en colonnes', () => {
  it('① quatre colonnes titrées, les mentions légales ensemble', () => {
    const html = rendre()
    expect(colonne(html, 'Produit')).toEqual(['/pricing#vitrine', '/pricing#boutique', '/pricing#dropshipping', '/pricing#application', '/pricing'])
    expect(html).toContain('>Site web<')
    expect(html).toContain('>Application<')
    expect(colonne(html, 'Ressources')).toEqual(['/documentation', '/blog', '/visibilite-ia'])
    expect(colonne(html, 'Entreprise')).toEqual(['/about', 'mailto:contact@deribfy.com'])
    expect(colonne(html, 'Mentions légales')).toEqual(['/privacy', '/terms', '/cookies', '/remboursement'])
  })

  it('② plus de ligne d’entité ni de NEQ dans le pied de page', () => {
    expect(rendre()).not.toContain('NEQ')
  })

  it('③ pas d’adresse, pas d’icône ; une adresse, une icône qui y mène', () => {
    expect(rendre({ reseaux: [{ reseau: 'facebook', url: '' }, { reseau: 'linkedin', url: '' }] })).not.toContain('aria-label="Deribfy — ')
    const html = rendre({ reseaux: [{ reseau: 'facebook', url: 'https://www.facebook.com/exemple' }, { reseau: 'linkedin', url: '' }] })
    expect(html).toContain('href="https://www.facebook.com/exemple"')
    expect(html).toContain('aria-label="Deribfy — Facebook"')
    expect(html).toContain('target="_blank"')
    expect(html).not.toContain('Deribfy — LinkedIn')
  })
})
