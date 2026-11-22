import 'server-only'
/**
 * LE CYCLE DE VIE STRIPE D'UNE APPLICATION, APRÈS L'ACHAT (2026-11-22).
 *
 * Décisions du propriétaire :
 *   · paiement mensuel ÉCHOUÉ        → rien ne se prolonge ; alerte /admin + courriel ;
 *   · remboursement TOTAL            → si c'est la dernière facture : appli dépubliée,
 *                                      abonnement Stripe annulé ; ligne d'historique ; alerte ;
 *   · remboursement PARTIEL          → rien ne change ; alerte /admin + courriel ;
 *   · CONTESTATION (litige)          → comme un remboursement total, et alerte.
 *
 * Événements écoutés (référence Stripe lue le 2026-11-22) :
 *   `invoice.payment_failed`, `charge.refunded` (« y compris les
 *   remboursements partiels »), `charge.dispute.created`.
 *
 * MESURÉ le 2026-11-22 sur une vraie facture du compte (version dahlia) : un
 * paiement (`charge`) n'a PLUS de champ `invoice`. La facture se retrouve par
 * `GET /v1/invoice_payments?payment[type]=payment_intent&payment[payment_intent]=pi_…`.
 *
 * Toute erreur LÈVE : le webhook rend 500 et Stripe renvoie l'avis. Les effets
 * en base sont idempotents (`annuler_paiement_stripe`), l'annulation de
 * l'abonnement aussi (relue avant d'agir).
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'
import { logAnomaly } from '@/lib/anomaly'
import { marqueAppli, TYPE_APPLICATION } from './abonnement-appli'

export const TYPE_ALERTE_ECHEC = 'stripe_paiement_echoue_application'
export const TYPE_ALERTE_REMBOURSEMENT = 'stripe_remboursement_application'
export const TYPE_ALERTE_REMBOURSEMENT_PARTIEL = 'stripe_remboursement_partiel_application'
export const TYPE_ALERTE_LITIGE = 'stripe_litige_application'

export type ResultatCycle = { readonly traitee: false } | { readonly traitee: true; readonly effet: string }

const idDe = (v: unknown): string | null =>
  typeof v === 'string' ? v : v !== null && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string' ? (v as { id: string }).id : null

/** La facture payée par ce PaymentIntent, ou `null` (paiement hors facture : boutique, domaine payé d'un coup…). */
export async function factureDuPaiement(paymentIntent: string): Promise<string | null> {
  const l = await getStripe().invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: paymentIntent }, limit: 1 })
  return l.data.length > 0 ? idDe(l.data[0].invoice) : null
}

type Cible = { readonly facture: string; readonly app: string; readonly abonnement: string | null }

/** Ce paiement est-il celui d'une facture d'APPLICATION ? Sinon `null` : ce module n'y touche pas. */
async function cibleDuPaiement(paymentIntent: unknown): Promise<Cible | null> {
  const pi = idDe(paymentIntent)
  if (pi === null) return null
  const facture = await factureDuPaiement(pi)
  if (facture === null) return null
  const m = await marqueAppli(await getStripe().invoices.retrieve(facture))
  if (m.marque.deribfy_type !== TYPE_APPLICATION) return null
  return { facture, app: m.marque.deribfy_app_id ?? '', abonnement: m.abonnement }
}

/** Annule l'abonnement Stripe s'il ne l'est pas déjà (relu d'abord : un renvoi ne fait rien de plus). */
async function annulerAbonnement(id: string): Promise<void> {
  const s = await getStripe().subscriptions.retrieve(id)
  if (s.status === 'canceled' || s.status === 'incomplete_expired') return
  await getStripe().subscriptions.cancel(id)
}

async function annuler(c: Cible, motif: 'remboursement' | 'litige', montant: number, details: Record<string, unknown>): Promise<ResultatCycle> {
  const r = await supabaseAdmin.rpc('annuler_paiement_stripe', { p_facture: c.facture, p_motif: motif, p_montant: montant })
  if (r.error !== null) throw new Error(`${motif} d’application non enregistré : ${r.error.message}`)
  const d = r.data as { statut: string; derniere?: boolean }
  // DANS LE DÉSORDRE : l'avis du remboursement arrive avant celui du paiement.
  // Rien n'est écrit ; 500 → Stripe le renvoie, après l'enregistrement de la facture.
  if (d.statut === 'paiement_inconnu') throw new Error(`${motif} reçu avant l’enregistrement de la facture ${c.facture}`)
  const derniere = d.derniere === true
  // L'abonnement n'est annulé que pour la DERNIÈRE facture ; refait au renvoi
  // si la première tentative a échoué (statut « deja_annule »).
  if (derniere && c.abonnement !== null) await annulerAbonnement(c.abonnement)
  if (d.statut === 'annule') {
    await logAnomaly({
      type: motif === 'litige' ? TYPE_ALERTE_LITIGE : TYPE_ALERTE_REMBOURSEMENT,
      severity: 'blocked',
      details: { ...details, facture: c.facture, app: c.app, abonnement: c.abonnement, appli_depubliee: derniere },
    })
  }
  return { traitee: true, effet: d.statut === 'annule' ? (derniere ? 'annulee_depubliee' : 'annulee_facture_ancienne') : 'deja_annulee' }
}

/** `charge.refunded` : total → annulation ; partiel → alerte seulement. */
export async function traiterRemboursementAppli(charge: unknown): Promise<ResultatCycle> {
  const ch = (charge ?? {}) as { id?: string; payment_intent?: unknown; refunded?: boolean; amount?: number; amount_refunded?: number; currency?: string }
  const c = await cibleDuPaiement(ch.payment_intent)
  if (c === null) return { traitee: false }
  const details = { paiement: ch.id ?? null, rembourse: (ch.amount_refunded ?? 0) / 100, sur: (ch.amount ?? 0) / 100, devise: ch.currency ?? null }
  // Total = Stripe le dit (`refunded`), ou tout le montant est rendu.
  const total = ch.refunded === true || (typeof ch.amount === 'number' && (ch.amount_refunded ?? 0) >= ch.amount)
  if (!total) {
    await logAnomaly({ type: TYPE_ALERTE_REMBOURSEMENT_PARTIEL, severity: 'warning', details: { ...details, facture: c.facture, app: c.app } })
    return { traitee: true, effet: 'partiel_alerte' }
  }
  return annuler(c, 'remboursement', (ch.amount_refunded ?? 0) / 100, details)
}

/** `charge.dispute.created` : comme un remboursement total. */
export async function traiterLitigeAppli(litige: unknown): Promise<ResultatCycle> {
  const du = (litige ?? {}) as { id?: string; payment_intent?: unknown; amount?: number; currency?: string; reason?: string }
  const c = await cibleDuPaiement(du.payment_intent)
  if (c === null) return { traitee: false }
  return annuler(c, 'litige', (du.amount ?? 0) / 100, { litige: du.id ?? null, montant: (du.amount ?? 0) / 100, devise: du.currency ?? null, raison: du.reason ?? null })
}

/** `invoice.payment_failed` d'une appli : rien n'est écrit (le service ne se prolonge pas), on alerte. */
export async function traiterEchecAppli(facture: unknown): Promise<ResultatCycle> {
  const m = await marqueAppli(facture)
  if (m.marque.deribfy_type !== TYPE_APPLICATION) return { traitee: false }
  const f = (facture ?? {}) as { id?: string; attempt_count?: number; next_payment_attempt?: number | null; amount_due?: number; currency?: string }
  await logAnomaly({
    type: TYPE_ALERTE_ECHEC,
    severity: 'blocked',
    details: {
      facture: f.id ?? null, app: m.marque.deribfy_app_id ?? null, tentative: f.attempt_count ?? null,
      prochaine_tentative: typeof f.next_payment_attempt === 'number' ? new Date(f.next_payment_attempt * 1000).toISOString() : 'aucune',
      montant: (f.amount_due ?? 0) / 100, devise: f.currency ?? null,
    },
  })
  return { traitee: true, effet: 'echec_alerte' }
}
