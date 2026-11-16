/**
 * CLIQUET — « Régénérer » a SON interrupteur, distinct de la génération neuve
 * (décision du propriétaire, 2026-11-16).
 *
 * Ce que ce cliquet tient : les deux lecteurs (bouton du tableau de bord,
 * route) lisent `NEXT_PUBLIC_REGENERATION_OUVERTE` sous sa forme littérale,
 * et le bouton ne lit plus `NEXT_PUBLIC_GENERATION_ASYNC`.
 *
 * Ce qu'il NE PEUT PAS voir : la valeur posée dans Vercel. Le refus réel de
 * la route est prouvé par le scénario S7 de
 * `app/api/generateur/direct/__tests__/tentatives-comportement.test.ts`.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VARIABLE_REGENERATION, regenerationOuverte } from '../regeneration'

const SRC = join(__dirname, '../../..')
const TABLEAU = readFileSync(join(SRC, 'app/dashboard/page.tsx'), 'utf8')
const ROUTE = readFileSync(join(SRC, 'app/api/generateur/direct/route.ts'), 'utf8')

describe('« Régénérer » · son propre interrupteur, fermé par défaut', () => {
  it('① seule la valeur exacte « 1 » ouvre', () => {
    for (const v of [undefined, '', '0', 'true', 'oui', ' 1']) expect(regenerationOuverte(v)).toBe(false)
    expect(regenerationOuverte('1')).toBe(true)
  })

  it('② le bouton lit SA variable, littéralement, et plus celle de la génération neuve', () => {
    expect(TABLEAU).toContain(`process.env.${VARIABLE_REGENERATION}`)
    // La LECTURE est visée, pas un commentaire qui raconte l'histoire.
    expect(TABLEAU).not.toContain('process.env.NEXT_PUBLIC_GENERATION_ASYNC')
    expect(TABLEAU).toMatch(/if\s*\(!REGENERATION_OUVERTE\)\s*return;/u)
    expect(TABLEAU).toMatch(/\{REGENERATION_OUVERTE\s*\?\s*\(/u)
  })

  it('③ la route revérifie la MÊME variable, et seulement pour `?id=`', () => {
    expect(ROUTE).toContain(`regenerationOuverte(process.env.${VARIABLE_REGENERATION})`)
    expect(ROUTE).toMatch(/searchParams\.get\('id'\)\s*\?\?\s*''\)\s*!==\s*''\s*&&\s*!regenerationOuverte\(/u)
  })
})
