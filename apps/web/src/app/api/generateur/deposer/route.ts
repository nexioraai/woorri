/**
 * ETAGE 4 — LE DEPOT. L'ecran poste la demande, une ligne `en_attente` nait
 * dans la vraie table. AUCUN moteur ne se lance ici : le travailleur recoit
 * une SENTINELLE qui jette — un depot qui emettrait exploserait en test.
 *
 * CE FICHIER EST L'UN DES DEUX SEULS AUTORISES a ecrire l'option de
 * production (cliquet d'isolation, liste fermee) : c'est la serrure qui
 * garantit que personne d'autre n'ecrit la vraie table depuis le code.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { creerTravailleur, type BaseGeneration, type MoteurContinuation } from '@/lib/apps/travailleur'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { deposerGeneration } from '@/lib/apps/service-generations'

export const runtime = 'nodejs'

const sentinelle: MoteurContinuation = {
  poursuivreEmission: async () => {
    throw new Error('DEPOT_SEUL: le moteur ne se lance jamais au depot')
  },
}

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as { demande?: unknown; nom?: unknown } | null
  const demande = typeof corps?.demande === 'string' ? corps.demande : ''
  const nom = typeof corps?.nom === 'string' && corps.nom.trim() !== '' ? corps.nom.trim() : 'application'

  try {
    const travailleur = creerTravailleur({
      table: TABLE_GENERATIONS,
      production: true,
      base: supabaseAdmin as unknown as BaseGeneration,
      moteur: sentinelle,
      budgetTrancheMs: 1,
      battementPerimeMs: 60_000,
    })
    const id = await deposerGeneration({ travailleur, demande, nom, email: garde.email, proprietaire: garde.userId })
    return NextResponse.json({ id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Depot impossible.'
    if (message.includes('DEMANDE_VIDE')) {
      return NextResponse.json({ error: 'Dites ce que vous voulez construire.' }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
