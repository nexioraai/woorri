/**
 * LE MANIFESTE D'INSTALLATION de `<nom>.deribfy.app` (2026-11-22) — servi à
 * `/manifest.webmanifest` (le proxy y mène). Son nom, son nom court, sa
 * couleur, ses icônes. Voir `pwa.ts`.
 */
import { appliServie, installationArretee, introuvable } from '@/lib/apps/appli-servie'
import { manifestePwa } from '@/lib/apps/pwa'

export const runtime = 'nodejs'

export async function GET(_req: Request, ctx: { params: Promise<{ sous: string }> }) {
  // ARRÊT D'URGENCE : plus de manifeste, donc plus d'invitation à installer.
  if (await installationArretee()) return introuvable()
  const a = await appliServie((await ctx.params).sous)
  if (a === null) return introuvable()
  return new Response(JSON.stringify(manifestePwa(a.identite, a.ouverture)), {
    status: 200,
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex' },
  })
}
