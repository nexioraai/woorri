import 'server-only'
/**
 * LES AVIS DES PRESTATAIRES MOBILE MONEY (2026-11-21, MODE TEST).
 *
 * POST /api/webhooks/mobile-money/<prestataire> — corps BRUT lu tel quel
 * (la signature porte sur les octets reçus). Signature refusée → 400, rien
 * n'est lu. UNE SEULE ADRESSE pour le test et le réel (lot L3) : l'avis est
 * vérifié par les deux secrets, et `livemode` doit s'accorder avec celui qui
 * signe. Signature bonne → `traiterEtNoterAvis` : un avis de TEST réussi est
 * vérifié puis seulement JOURNALISÉ (option A) ; un avis RÉEL n'écrit dans
 * `app_paiements` que pour le compte du propriétaire (mode.ts), une seule fois
 * par référence — pour tout autre compte il est refusé, et alerte.
 *
 * Réponse 200 aussi pour un avis ignoré : le prestataire n'a pas à le
 * renvoyer. Erreur d'enregistrement → 500 : le prestataire réessaie
 * (docs MoneRails : 8 tentatives sur ~42 h).
 *
 * MOINS DE 10 SECONDES (docs : webhooks, 2026-11-23) : au-delà, MoneRails
 * compte l'avis comme raté. Le traitement a un BUDGET de 8 s ; dépassé, on
 * répond 500 tout de suite — le prestataire redonnera l'avis, et
 * l'enregistrement, idempotent par référence, ne double rien.
 */
import { NextResponse } from 'next/server'
import { fournisseurNomme } from '@/lib/payments/mobile-money/fournisseur'
import { traiterEtNoterAvis } from '@/lib/payments/mobile-money/encaissement'
import { dansLeBudget } from '@/lib/payments/mobile-money/budget-avis'

export const runtime = 'nodejs'

export async function POST(req: Request, ctx: { params: Promise<{ fournisseur: string }> }) {
  const debut = Date.now()
  const { fournisseur } = await ctx.params
  const f = fournisseurNomme(fournisseur)
  if (f === null) return NextResponse.json({ error: 'prestataire inconnu' }, { status: 404 })
  const brut = await req.text()
  const avis = f.verifierAvis(brut, req.headers)
  if (avis === null) {
    console.warn(`[mobile-money] avis refusé : signature invalide (${fournisseur})`)
    return NextResponse.json({ error: 'signature invalide' }, { status: 400 })
  }
  const issue = await dansLeBudget(traiterEtNoterAvis(avis, f.nom))
  console.log(`[mobile-money] avis reçu ${fournisseur} ${avis.type} ${avis.id} → ${JSON.stringify(issue)} en ${String(Date.now() - debut)} ms`)
  if (issue.issue === 'test_verifie') console.log(`[mobile-money] avis de TEST vérifié, RIEN n'est écrit — serait enregistré : ${JSON.stringify(issue.serait)}`)
  if (issue.issue === 'refuse') console.error(`[mobile-money] AVIS SIGNÉ MAIS INCOHÉRENT ${avis.id} : ${issue.raison}`)
  if (issue.issue === 'erreur') return NextResponse.json({ recu: true, issue: issue.issue }, { status: 500 })
  return NextResponse.json({ recu: true, issue: issue.issue })
}
