/**
 * LE LOT (2026-11-24) — ce qui se lit dans le source : l'ordre du webhook
 * Stripe (le lot AVANT le chemin boutique, même `mode=payment`) et le bouton
 * de l'atelier (abonnement en cours seulement). Le rendu se regarde à l'écran.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const lire = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('le lot dans le source', () => {
  it('webhook Stripe : la session d’un lot est traitée AVANT l’achat boutique', () => {
    const w = lire('src/app/api/stripe/webhook/route.ts')
    const lot = w.indexOf('traiterSessionLot(obj)')
    const boutique = w.indexOf('handlePaidCheckout(obj)')
    expect(lot).toBeGreaterThan(0)
    expect(lot, 'le lot passerait par le chemin boutique').toBeLessThan(boutique)
  })
  it('atelier : « Ajouter des modifications » seulement pour une appli abonnée et active, hors compte exempté', () => {
    const a = lire('src/app/atelier/[id]/page.tsx')
    expect(a).toMatch(motifTexte('{compteur !== null && !compteur.exempte && compteur.actif && ('))
    expect(a).toMatch(motifTexte('void ajouterModifications();'))
    expect(a).toMatch(motifTexte("const lot = new URLSearchParams(window.location.search).get('lot');"))
  })
})
