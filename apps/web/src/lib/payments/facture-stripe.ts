/**
 * LIRE UNE FACTURE STRIPE, QUELLE QUE SOIT LA VERSION DE L'API (2026-11-20).
 *
 * MESURÉ : le compte Stripe émet ses avis en version 2026-05-27.dahlia. Dans
 * cette version, `invoice.subscription` N'EXISTE PLUS (undefined) : l'abonnement
 * vit dans `invoice.parent.subscription_details.subscription`, avec un instantané
 * de ses métadonnées. Le webhook lisait `invoice.subscription` : il s'arrêtait
 * sur chaque facture. Ce module lit les deux formes.
 */
export type AbonnementDeFacture = { readonly id: string | null; readonly metadata: Readonly<Record<string, string>> }

type FactureBrute = {
  subscription?: unknown
  parent?: { subscription_details?: { subscription?: unknown; metadata?: Record<string, string> | null } | null } | null
  lines?: { data?: { period?: { end?: number } }[] }
}

const idDe = (v: unknown): string | null =>
  typeof v === 'string' ? v : v !== null && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string' ? (v as { id: string }).id : null

export function abonnementDeFacture(facture: unknown): AbonnementDeFacture {
  const f = (facture ?? {}) as FactureBrute
  const details = f.parent?.subscription_details ?? null
  return {
    id: idDe(details?.subscription) ?? idDe(f.subscription),
    metadata: details?.metadata ?? {},
  }
}

/** La fin de la période payée par cette facture (ISO), lue sur sa première ligne. */
export function finDePeriode(facture: unknown): string | null {
  const fin = (facture as FactureBrute | null)?.lines?.data?.[0]?.period?.end
  return typeof fin === 'number' ? new Date(fin * 1000).toISOString() : null
}
