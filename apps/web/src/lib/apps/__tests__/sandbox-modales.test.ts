/**
 * ⑪ (2026-11-18) — UNE APPLI PUBLIÉE PEUT DEMANDER CONFIRMATION.
 *
 * Mesuré dans Chromium et WebKit (docs/elite-protocol/evidence/sandbox-modales/) :
 * sous `sandbox allow-scripts allow-same-origin`, `confirm()` rend `false`
 * sans rien afficher — les quatre « Retirer » de pharma s'arrêtaient là,
 * depuis le 2026-11-05. Avec `allow-modals`, la boîte s'affiche.
 *
 * ① l'en-tête servi porte `allow-modals` ;
 * ② et RIEN d'autre n'élargit le bac à sable : exactement trois permissions.
 */
import { describe, expect, it } from 'vitest'
import { entetesSousDomaine, SANDBOX_SOUS_DOMAINE } from '../publication'

const sandbox = (): string[] => {
  const csp = entetesSousDomaine('https://psxbilpmnojtlzosokzz.supabase.co')['Content-Security-Policy'] ?? ''
  const directive = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('sandbox'))
  return (directive ?? '').split(/\s+/u).slice(1).sort()
}

describe('⑪ le bac à sable des applis publiées', () => {
  it('① l’en-tête servi permet les boîtes de dialogue', () => {
    expect(sandbox()).toContain('allow-modals')
    expect(SANDBOX_SOUS_DOMAINE.startsWith('sandbox ')).toBe(true)
  })

  // 2026-11-28 : TROIS → QUATRE, `allow-forms` — sans lui Chrome n'envoie
  // aucun formulaire (A/B mesuré sur « Suivi de colis » ; sandbox-formulaires.test).
  it('② exactement quatre permissions — aucune autre porte', () => {
    expect(sandbox()).toEqual(['allow-forms', 'allow-modals', 'allow-same-origin', 'allow-scripts'])
  })
})
