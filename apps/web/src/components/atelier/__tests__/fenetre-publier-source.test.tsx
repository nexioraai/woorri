/**
 * LA FENÊTRE « PUBLIER », TÉLÉPHONE D'ABORD (refonte du 2026-11-24) — ses
 * ancres dans le source. Le rendu, lui, se regarde (captures du 2026-11-24) :
 * ce test ne voit ni les couleurs ni la tenue à 390 px, seulement que les
 * classes qui les portent sont là.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('REFONTE · téléphone d’abord (le rendu se regarde ; ici, ses ancres)', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'apps', 'FenetrePublier.tsx'), 'utf8')
  it('monte du bas sur téléphone, centrée sur ordinateur ; cartes en une colonne puis deux ; défilement interne ; zone sûre', () => {
    for (const ancre of ['items-end', 'sm:items-center', 'rounded-t-3xl', 'sm:rounded-3xl', 'max-h-[92dvh]', 'overflow-y-auto', 'grid-cols-1', 'sm:grid-cols-2', 'env(safe-area-inset-bottom)']) {
      expect(src, ancre).toContain(ancre)
    }
  })
  it('au-dessus du bandeau des cookies (z-[100]) : la fenêtre est en z-[110]', () => {
    expect(src).toContain('z-[110]')
    expect(src).not.toContain('z-50')
    const bandeau = readFileSync(join(__dirname, '..', '..', 'CookieConsent.tsx'), 'utf8')
    expect(bandeau).toContain('z-[100]')
  })
  it('les couleurs passent par les jetons Deribfy, et le mouvement respecte « moins de mouvement »', () => {
    expect(src).toContain('bg-accent')
    expect(src).toContain('bg-bg-deep')
    expect(src).not.toMatch(/#FA5D1E/iu)
    expect(src).toContain('motion-reduce:transition-none')
    expect(src).toContain('motion-safe:animate-spin')
  })
})
