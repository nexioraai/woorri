/**
 * LE GRAND MENU, DANS UN NAVIGATEUR (lot 4b) : un clic ouvre le PANNEAU de la
 * rubrique, à sa couleur, avec ses sous-pages en grand et sa photo ; Échap le
 * ferme ; sur téléphone, ☰ ouvre le menu plein écran.
 * Ce que ce test NE voit PAS : le survol réel et le rendu à l'œil (captures).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost/' }) })
afterAll(() => { GlobalRegistrator.unregister() })

const RUBRIQUES = [
  { chemin: 'qui-sommes-nous', titre: 'Qui sommes-nous', chapeau: 'Présentation', couleur: '#0a6b4f', image: 'https://images.pexels.com/a.jpg', enfants: [{ chemin: 'qui-sommes-nous/missions', titre: 'Missions' }] },
  { chemin: 'documents', titre: 'Documents', chapeau: null, couleur: '#0b5a6b', image: null, enfants: [] },
]

async function monter() {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { default: GrandMenu } = await import('@/app/sites/[slug]/themes/institution/GrandMenu')
  const racine = document.createElement('div'); document.body.appendChild(racine)
  await React.act(async () => { createRoot(racine).render(React.createElement(GrandMenu, { rubriques: RUBRIQUES, base: 'https://m.deribfy.app', contact: 'https://m.deribfy.app/contact', couleur: '#0a6b4f' })) })
  return { React, racine }
}

describe('le grand menu', () => {
  it('un clic ouvre le panneau de la rubrique : sa couleur, ses sous-pages en grand, sa photo ; Échap le ferme', async () => {
    const { React, racine } = await monter()
    const bouton = racine.querySelector('[aria-controls="panneau-qui-sommes-nous"]') as HTMLButtonElement
    expect(racine.querySelector('[data-panneau]')).toBeNull()
    await React.act(async () => { bouton.click() })
    const panneau = racine.querySelector('[data-panneau]') as HTMLElement
    expect(panneau).not.toBeNull()
    expect(bouton.getAttribute('aria-expanded')).toBe('true')
    expect(bouton.getAttribute('style')).toMatch(/inset 0 -4px 0 #0a6b4f/u)
    expect(panneau.getAttribute('style')).toMatch(/background-color:\s*#0a6b4f/u)
    expect([...panneau.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['https://m.deribfy.app/qui-sommes-nous', 'https://m.deribfy.app/qui-sommes-nous/missions'])
    expect(panneau.querySelector('img')?.getAttribute('src')).toBe('https://images.pexels.com/a.jpg')
    await React.act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(racine.querySelector('[data-panneau]')).toBeNull()
  })
  it('survol PUIS clic : le panneau reste ouvert (défaut vu sur la capture du 2026-11-26) ; un 2e clic le referme', async () => {
    const { React, racine } = await monter()
    const bouton = racine.querySelector('[aria-controls="panneau-qui-sommes-nous"]') as HTMLButtonElement
    await React.act(async () => { bouton.parentElement!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    expect(racine.querySelector('[data-panneau]'), 'le survol ouvre').not.toBeNull()
    await React.act(async () => { bouton.click() })
    expect(racine.querySelector('[data-panneau]'), 'le clic après le survol garde ouvert').not.toBeNull()
    await React.act(async () => { bouton.click() })
    expect(racine.querySelector('[data-panneau]'), 'un second clic referme').toBeNull()
  })
  it('une rubrique sans sous-page est un simple lien', async () => {
    const { racine } = await monter()
    expect(racine.querySelector('a[href="https://m.deribfy.app/documents"]')).not.toBeNull()
  })
  it('téléphone : ☰ ouvre le menu plein écran, chaque rubrique à sa couleur avec ses sous-pages', async () => {
    const { React, racine } = await monter()
    const bouton = racine.querySelector('[data-bouton-menu]') as HTMLButtonElement
    await React.act(async () => { bouton.click() })
    const menu = document.querySelector('[data-menu-mobile]') as HTMLElement
    expect(menu).not.toBeNull()
    expect(menu.getAttribute('aria-modal')).toBe('true')
    expect(menu.textContent).toMatch(/Missions/u)
    expect(document.body.style.overflow).toBe('hidden')
    // Rendu au niveau du <body>, HORS de l'en-tête (dont le flou enfermerait un `fixed`).
    expect(menu.parentElement).toBe(document.body)
    expect(racine.contains(menu)).toBe(false)
  })
})
