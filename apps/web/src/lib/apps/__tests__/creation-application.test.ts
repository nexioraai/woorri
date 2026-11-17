/**
 * CLIQUET — le bouton « Application » de l'accueil a un nom qui dit ce qu'il
 * fait (décision 2 du propriétaire, 2026-11-17).
 *
 * Ce que ce cliquet tient :
 *   ① seule la valeur exacte « 1 » ouvre ;
 *   ② l'accueil lit `NEXT_PUBLIC_CREATION_APPLICATION_OUVERTE` sous sa forme
 *      littérale (la seule que Next injecte), et plus l'ancien nom ;
 *   ③ l'ancien nom ne commande plus que le suivi asynchrone d'AIR, gardé par
 *      le moteur — aucun autre fichier de code ne le lit.
 *
 * Ce qu'il NE PEUT PAS voir : la valeur posée dans Vercel, ni celle figée
 * dans le JavaScript servi. Celle-là se relit après déploiement.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  ANCIEN_NOM_CREATION_APPLICATION,
  VARIABLE_CREATION_APPLICATION,
  creationApplicationOuverte,
} from '../creation-application'

const SRC = join(__dirname, '../../..')
const ACCUEIL = readFileSync(join(SRC, 'components/onboarding/OnboardingChat.tsx'), 'utf8')
const CONVERSATION = readFileSync(join(SRC, 'components/onboarding/ConversationApplication.tsx'), 'utf8')

const sources = (): string[] => {
  const out: string[] = []
  const marcher = (d: string): void => {
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      if (statSync(p).isDirectory()) {
        if (e !== '__tests__' && e !== 'node_modules') marcher(p)
      } else if (/\.tsx?$/u.test(e)) out.push(p)
    }
  }
  marcher(SRC)
  return out
}

describe('« Application » · un interrupteur qui porte le nom de ce qu’il fait', () => {
  it('① seule la valeur exacte « 1 » ouvre', () => {
    for (const v of [undefined, '', '0', 'true', 'oui', ' 1']) expect(creationApplicationOuverte(v)).toBe(false)
    expect(creationApplicationOuverte('1')).toBe(true)
  })

  it('② l’accueil lit le nouveau nom, littéralement, et plus l’ancien', () => {
    expect(ACCUEIL).toContain(`creationApplicationOuverte(process.env.${VARIABLE_CREATION_APPLICATION})`)
    expect(ACCUEIL).not.toContain(`process.env.${ANCIEN_NOM_CREATION_APPLICATION}`)
  })

  it('③ l’ancien nom ne vit plus que dans le suivi AIR, gardé par le moteur', () => {
    const lecteurs = sources()
      .filter((f) => readFileSync(f, 'utf8').includes(`process.env.${ANCIEN_NOM_CREATION_APPLICATION}`))
      .map((f) => f.replace(`${SRC}/`, ''))
    expect(lecteurs).toEqual(['components/onboarding/ConversationApplication.tsx'])
    expect(CONVERSATION).toMatch(
      /moteurChoisi\(process\.env\.NEXT_PUBLIC_GENERATEUR_MOTEUR\)\s*===\s*'air'\s*&&\s*modeAsyncActif\(process\.env\.NEXT_PUBLIC_GENERATION_ASYNC\)/u,
    )
  })
})
