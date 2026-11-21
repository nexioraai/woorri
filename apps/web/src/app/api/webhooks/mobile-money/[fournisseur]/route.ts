import 'server-only'
/**
 * LES AVIS DES PRESTATAIRES MOBILE MONEY (2026-11-21, MODE TEST).
 *
 * POST /api/webhooks/mobile-money/<prestataire> — corps BRUT lu tel quel
 * (la signature porte sur les octets reçus). Signature refusée → 400, rien
 * n'est lu. Signature bonne → `traiterAvis` : seul un encaissement réussi,
 * en mode test, au montant demandé, écrit dans `app_paiements` ; la même
 * référence deux fois ne fait rien de plus (`deja_enregistre`).
 *
 * Réponse 200 aussi pour un avis ignoré : le prestataire n'a pas à le
 * renvoyer. Erreur d'enregistrement → 500 : le prestataire réessaie
 * (docs MoneRails : 8 tentatives sur ~42 h).
 */
import { NextResponse } from 'next/server'
import { fournisseurNomme } from '@/lib/payments/mobile-money/fournisseur'
import { traiterAvis } from '@/lib/payments/mobile-money/encaissement'

export const runtime = 'nodejs'

export async function POST(req: Request, ctx: { params: Promise<{ fournisseur: string }> }) {
  const { fournisseur } = await ctx.params
  const f = fournisseurNomme(fournisseur)
  if (f === null) return NextResponse.json({ error: 'prestataire inconnu' }, { status: 404 })
  const brut = await req.text()
  const avis = f.verifierAvis(brut, req.headers)
  if (avis === null) {
    console.warn(`[mobile-money] avis refusé : signature invalide (${fournisseur})`)
    return NextResponse.json({ error: 'signature invalide' }, { status: 400 })
  }
  const issue = await traiterAvis(avis, f.nom)
  console.log(`[mobile-money] avis reçu ${fournisseur} ${avis.type} ${avis.id} → ${JSON.stringify(issue)}`)
  if (issue.issue === 'refuse') console.error(`[mobile-money] AVIS SIGNÉ MAIS INCOHÉRENT ${avis.id} : ${issue.raison}`)
  if (issue.issue === 'erreur') return NextResponse.json({ recu: true, issue: issue.issue }, { status: 500 })
  return NextResponse.json({ recu: true, issue: issue.issue })
}
