import 'server-only'
/**
 * LE COÛT N'EST JAMAIS MONTRÉ À UN CLIENT (règle du propriétaire ; prouvée le 2026-11-22).
 *
 * MESURÉ le 2026-11-22 : les écrans ne montraient un coût qu'au compte
 * fondateur (`voitLesCouts`, compte exempté), mais les RÉPONSES des routes le
 * portaient à tout le monde — `coutUsd` de chaque modification, de chaque
 * version, de chaque carte de « Mes projets », de la lecture du cahier, de
 * la compréhension, de la création et de son état. Un client qui ouvre la
 * console du navigateur le lisait. Et la confirmation « Régénérer » de « Mes
 * projets » l'écrivait en clair (« Cela coûte environ … $ ») à partir des
 * coûts des versions — fermée en production, mais prête à fuir le jour où
 * elle rouvre.
 *
 * La règle vit donc côté SERVEUR : toute réponse JSON d'une route du
 * générateur passe par `reserverLesCoutsAuFondateur`, qui retire les champs
 * de coût, à toute profondeur, sauf pour un compte fondateur (`sansQuota`).
 * L'écran ne peut plus montrer ce qu'il ne reçoit pas.
 */
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { sansQuota } from '@/lib/admin-emails'

export const CLES_DE_COUT: ReadonlySet<string> = new Set(['coutUsd', 'cout_usd', 'plafondUsd', 'plafond_usd', 'coutEstimeUsd'])

/** La même valeur, sans aucun champ de coût, à toute profondeur. */
export function retirerCouts(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(retirerCouts)
  if (v !== null && typeof v === 'object') {
    const sortie: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (!CLES_DE_COUT.has(k)) sortie[k] = retirerCouts(x)
    return sortie
  }
  return v
}

export function porteUnCout(v: unknown): boolean {
  if (Array.isArray(v)) return v.some(porteUnCout)
  if (v !== null && typeof v === 'object') return Object.entries(v as Record<string, unknown>).some(([k, x]) => CLES_DE_COUT.has(k) || porteUnCout(x))
  return false
}

/** Le compte qui appelle est-il fondateur ? Une identité illisible : non. */
export async function voitLesCoutsServeur(req: Request): Promise<boolean> {
  const g = await requireAuthenticatedUser(req)
  return g.ok && sansQuota(g.email)
}

/** Enveloppe une route : ses réponses JSON perdent leurs coûts, sauf pour un fondateur. */
export function reserverLesCoutsAuFondateur<C extends unknown[]>(
  route: (req: Request, ...c: C) => Promise<Response>,
): (req: Request, ...c: C) => Promise<Response> {
  return async (req: Request, ...c: C): Promise<Response> => {
    const res = await route(req, ...c)
    if (!(res.headers.get('content-type') ?? '').includes('application/json')) return res
    const corps: unknown = await res.clone().json().catch(() => undefined)
    if (corps === undefined || !porteUnCout(corps)) return res
    if (await voitLesCoutsServeur(req)) return res
    // La longueur annoncée ne vaut plus : le corps a changé.
    const entetes = new Headers([...res.headers.entries()].filter(([k]) => k.toLowerCase() !== 'content-length'))
    return new Response(JSON.stringify(retirerCouts(corps)), { status: res.status, headers: entetes })
  }
}
