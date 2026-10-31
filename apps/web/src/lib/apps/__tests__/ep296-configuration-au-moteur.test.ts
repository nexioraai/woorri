/**
 * EP-296 — LA CONFIGURATION ÉLUDÉE ATTEINT LE MOTEUR, OU ELLE N'EST QU'UN DÉCOR.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-31 SUR LE TIR LIVRÉ eb7b62b5.
 *
 * Le pré-vol pose ses questions, valide la devise (EP-293), construit une
 * configuration — et l'écran envoie `{ demande: texte }` SEULEMENT. Résultat
 * mesuré : plateforme à base tchadienne rendue avec 10× EUR, 8× €, zéro
 * FCFA. Toute la chaîne d'élicitation, devise comprise, était décorative.
 *
 * ── LA FERMETURE : la configuration voyage (écran → route → boucle → base),
 * et le modèle la reçoit comme SOURCE DE VÉRITÉ, avant le cahier.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { boucleEcriture, texteDeConfiguration } from '../boucle-directe'

const nu = (p: string) =>
  readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
const ROUTE = nu(join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'direct', 'route.ts'))
const ECRAN = nu(join(__dirname, '..', '..', '..', 'components', 'onboarding', 'ConversationApplication.tsx'))

/** Doublure : capture le premier message utilisateur, rend un fichier valide. */
const capture: { recu?: string } = {}
const appeler = async (messages: readonly { role: string; content: string }[]) => {
  capture.recu = messages[0]?.content ?? ''
  return {
    texte: '```fichier index.tsx\nexport const a = 1\n```',
    tronquee: false,
    jetonsEntree: 1,
    jetonsSortie: 1,
  }
}

describe('EP-296 · la configuration atteint le moteur direct', () => {
  it('① LA DEVISE DU CLIENT ENTRE DANS LE MESSAGE DU MODÈLE, avant le cahier', async () => {
    await boucleEcriture({
      demande: 'CAHIER: une boutique',
      configuration: { currency: 'XAF', market: 'tchad et international' },
      appeler: appeler as never,
    })
    const m = capture.recu ?? ''
    expect(m, 'la devise ne parvient pas au modèle').toContain('XAF')
    expect(m, 'la configuration doit primer : elle précède le cahier').toMatch(
      /XAF[\s\S]*CAHIER: une boutique/u,
    )
    expect(m, 'le marché déclaré ne parvient pas au modèle').toContain('tchad et international')
  })

  it('② SANS CONFIGURATION, LE MESSAGE EST LA DEMANDE NUE — contrôle négatif', async () => {
    await boucleEcriture({ demande: 'CAHIER: une boutique', appeler: appeler as never })
    expect(capture.recu).toBe('CAHIER: une boutique')
  })

  it('③ UNE DEVISE DE FORME INVALIDE NE PASSE PAS — dernier rempart', () => {
    // L'élicitation valide en amont (EP-293) ; si un client contourne
    // l'écran et poste « les 3 », ce rempart-ci refuse de le transmettre
    // comme un fait au modèle.
    const t = texteDeConfiguration({ currency: 'les 3', market: 'tchad' })
    expect(t).not.toContain('les 3')
    expect(t, 'le marché, lui, reste transmis').toContain('tchad')
    expect(texteDeConfiguration({})).toBe('')
  })

  it('④ LA ROUTE LIT LA CONFIGURATION ET LA JOURNALISE', () => {
    expect(ROUTE, 'la route ne transmet pas la configuration à la boucle').toMatch(
      /boucleEcriture\(\{[^}]*configuration/u,
    )
    expect(ROUTE, 'la configuration n’est pas journalisée avec le tir').toMatch(
      /sections_acquises[\s\S]{0,200}configuration/u,
    )
  })

  it('⑤ L’ÉCRAN ENVOIE LA CONFIGURATION, pas seulement la demande', () => {
    expect(ECRAN, 'l’écran n’envoie toujours que la demande').toMatch(
      /body:\s*JSON\.stringify\(\{\s*demande:\s*texte,\s*configuration/u,
    )
  })
})
