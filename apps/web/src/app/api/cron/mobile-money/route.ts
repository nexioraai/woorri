import 'server-only'
/**
 * LE RATTRAPAGE DES AVIS PERDUS, toutes les 15 minutes (lot L2, 2026-11-23).
 * Lecture chez MoneRails, écriture chez nous seulement — voir rattrapage.ts.
 */
import { NextResponse } from 'next/server'
import { rattraper } from '@/lib/payments/mobile-money/rattrapage'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const bilan = await rattraper()
    console.log(`[mobile-money] rattrapage ${JSON.stringify(bilan)}`)
    return NextResponse.json(bilan)
  } catch (e) {
    console.error('[mobile-money] rattrapage impossible', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'rattrapage impossible' }, { status: 502 })
  }
}
