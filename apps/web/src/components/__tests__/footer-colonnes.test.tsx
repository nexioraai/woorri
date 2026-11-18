/**
 * LE PIED DE PAGE EN COLONNES (2026-11-18, décision du propriétaire).
 *
 * ① quatre colonnes titrées ; Confidentialité, Conditions et Témoins sont sous
 *   « Mentions légales », plus noyés entre Blog et Tarifs ;
 * ② l'entité qui exploite Deribfy et son NEQ sont écrits ;
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
    expect(colonne(html, 'Produit')).toEqual(['/pricing', '/visibilite-ia'])
    expect(colonne(html, 'Ressources')).toEqual(['/documentation', '/blog'])
    expect(colonne(html, 'Entreprise')).toEqual(['/about', 'mailto:contact@deribfy.com'])
    expect(colonne(html, 'Mentions légales')).toEqual(['/privacy', '/terms', '/cookies'])
  })

  it('② l’entité et son NEQ', () => {
    const html = rendre()
    expect(html).toContain('Dougouma IA')
    expect(html).toContain('NEQ 2281989782')
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
