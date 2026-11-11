import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: {}, supabaseAdmin: {} }))
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MenuDeclare from '../../app/sites/[slug]/themes/MenuDeclare'

// Défaut mesuré en ligne le 2026-11-11 : la constante de l'attribut venait
// d'un module 'use client' ; importée côté serveur, elle n'était plus une
// chaîne et l'attribut n'était jamais écrit — le survol n'ouvrait rien.
describe('menu — ouverture au survol', () => {
  it('chaque sous-menu porte l’attribut data-menu-survol dans le HTML serveur', () => {
    const h = renderToStaticMarkup(createElement(MenuDeclare, {
      site: { slug: 'demo', name: 'Démo' } as never, host: 'demo.deribfy.app',
      entrees: [
        { chemin: 'qui', parent: null, titre: 'Qui', ordre: 1 },
        { chemin: 'qui/histoire', parent: 'qui', titre: 'Histoire', ordre: 1 },
        { chemin: 'contact', parent: null, titre: 'Contact', ordre: 2 },
      ] as never,
    }))
    expect(h.match(/<details[^>]*data-menu-survol/g)?.length).toBe(1)
  })
})
