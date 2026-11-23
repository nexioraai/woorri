/**
 * LES ICÔNES de `<nom>.deribfy.app` (2026-11-22) — `/icone-192.png`,
 * `/icone-512.png`, `/icone-maskable-512.png`. L'initiale de l'appli sur sa
 * couleur. Voir `icone-appli.ts`.
 */
import { identiteDeLAppliServie, introuvable } from '@/lib/apps/appli-servie'
import { iconeAppli } from '@/lib/apps/icone-appli'
import type { FormeIcone } from '@/lib/apps/pwa'

export const runtime = 'nodejs'

const FORMES: Readonly<Record<string, FormeIcone>> = { '192': 192, '512': 512, maskable: 'maskable' }

export async function GET(_req: Request, ctx: { params: Promise<{ sous: string; forme: string }> }) {
  const { sous, forme } = await ctx.params
  const f = FORMES[forme]
  if (f === undefined) return introuvable()
  const id = await identiteDeLAppliServie(sous)
  if (id === null) return introuvable()
  return iconeAppli(id, f)
}
