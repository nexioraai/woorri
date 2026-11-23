/**
 * LE SERVICE WORKER de `<nom>.deribfy.app` (2026-11-22) — servi à `/sw.js`.
 * Il ne garde que l'écran d'accueil, public ; jamais une donnée. Voir `pwa.ts`.
 *
 * `no-cache` : le navigateur revérifie le fichier à chaque ouverture ; une
 * nouvelle version prend la main seule.
 */
import { identiteDeLAppliServie, introuvable } from '@/lib/apps/appli-servie'
import { codeServiceWorker } from './code-service-worker'

export const runtime = 'nodejs'

export async function GET(_req: Request, ctx: { params: Promise<{ sous: string }> }) {
  const id = await identiteDeLAppliServie((await ctx.params).sous)
  if (id === null) return introuvable()
  return new Response(codeServiceWorker(id.nom), {
    status: 200,
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' },
  })
}
