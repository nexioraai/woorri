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
import { intentionDepuis, premiereIntention, texteDe } from '@/lib/apps/dialogue'

export const runtime = 'nodejs'

const sentinelle: MoteurContinuation = {
  poursuivreEmission: async () => {
    throw new Error('DEPOT_SEUL: le moteur ne se lance jamais au depot')
  },
}

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as {
    demande?: unknown
    intention?: unknown
    nom?: unknown
  } | null
  const nom = typeof corps?.nom === 'string' && corps.nom.trim() !== '' ? corps.nom.trim() : 'application'

  // ── CE QU'ON DEPOSE EST LE TEXTE QUE P0 LIRA, PAS LE DERNIER MESSAGE.
  //
  // Le chemin synchrone appelait `emettreApplication(texteLu, nom)` ou
  // `texteLu` = le brief PUIS les reponses aux questions. Le travailleur,
  // lui, passe `ligne.demande` comme brief. Deposer le seul dernier message
  // perdrait donc toutes les reponses deja donnees — l'utilisateur aurait
  // repondu pour rien, et paye pour rien.
  //
  // Tout ce bloc est GRATUIT : `dialogue.ts` n'appelle aucune API. Verifie
  // avant d'etre ecrit — un depot qui paierait serait un piege a depense.
  const intention =
    corps?.intention === undefined
      ? typeof corps?.demande === 'string' && corps.demande.trim() !== ''
        ? await premiereIntention(corps.demande)
        : null
      : await intentionDepuis(corps.intention)
  if (intention === null) {
    return NextResponse.json({ error: 'Dites ce que vous voulez construire.' }, { status: 400 })
  }
  const demande = await texteDe(intention)

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
    // `texteLu` revient a l'ecran : c'est ce que le moteur va lire, et les
    // tours suivants le renvoient tel quel. Le brief ne se reecrit jamais.
    // L'INTENTION REVIENT AUSSI : le tour suivant la renvoie enrichie de sa
    // reponse, et le brief reste SCELLE. Sans elle, repondre a une question
    // repartirait de zero — et ferait repayer ce qui a deja ete dit.
    return NextResponse.json({ id, texteLu: demande, intention })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Depot impossible.'
    if (message.includes('DEMANDE_VIDE')) {
      return NextResponse.json({ error: 'Dites ce que vous voulez construire.' }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
