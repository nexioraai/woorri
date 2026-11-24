/**
 * MOINS DE 10 SECONDES POUR RÉPONDRE À UN AVIS (docs MoneRails : webhooks).
 * Au-delà, l'avis compte comme raté. Le traitement a un budget de 8 s ;
 * dépassé, l'issue est `erreur` (→ 500, le prestataire redonne l'avis).
 */
import type { IssueAvis } from './encaissement'

/** Le budget de traitement d'un avis, sous les 10 s du prestataire. */
export const BUDGET_AVIS_MS = 8_000

/** Le traitement, ou `erreur` si le budget est dépassé. */
export async function dansLeBudget(travail: Promise<IssueAvis>, budgetMs: number = BUDGET_AVIS_MS): Promise<IssueAvis> {
  let minuterie: ReturnType<typeof setTimeout> | undefined
  const depasse = new Promise<IssueAvis>((resoudre) => {
    minuterie = setTimeout(() => { resoudre({ issue: 'erreur', raison: `traitement au-delà de ${String(budgetMs)} ms` }) }, budgetMs)
  })
  try { return await Promise.race([travail, depasse]) } finally { clearTimeout(minuterie) }
}

