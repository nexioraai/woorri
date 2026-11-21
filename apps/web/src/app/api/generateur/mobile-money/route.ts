import 'server-only'
/**
 * PAYER UNE APPLI PAR MOBILE MONEY — la route du formulaire (2026-11-21, MODE TEST).
 *
 * GET  ?id=<appli>                         → { prix, devise, operateurs[] (chacun avec prix, frais, total) }
 *                                            ou 409 + phrase si un réglage de prix/frais manque
 * GET  ?id=<appli>&encaissement=<id>       → l'état de l'encaissement
 * POST ?id=<appli>  { operateur, telephone, nom }      → ouvre l'encaissement
 * POST ?id=<appli>&encaissement=<id>  { code }         → envoie le code à usage unique
 *
 * L'interrupteur `mobile_money` d'abord (éteint par défaut : 403, avant tout).
 * La route ne déclare JAMAIS rien de payé : seul l'avis signé du prestataire
 * écrit dans le registre (`/api/webhooks/mobile-money/<prestataire>`).
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { fournisseurMobileMoney } from '@/lib/payments/mobile-money/fournisseur'
import { lireTarifMobileMoney, mobileMoneyOuvert, ouvrirEncaissement, PHRASE_MOBILE_MONEY_FERME } from '@/lib/payments/mobile-money/encaissement'
import { PHRASE_FRAIS_NON_REGLES, prixPour, type Prix } from '@/lib/payments/mobile-money/frais'
import { ErreurFournisseur, type Encaissement } from '@/lib/payments/mobile-money/types'

export const runtime = 'nodejs'

const SANS_CACHE = { 'Cache-Control': 'no-store' }

/** Ce que l'écran reçoit d'un encaissement : jamais le rattachement interne. */
function vue(e: Encaissement) {
  return { encaissement: e.id, etat: e.etat, montant: e.montant, devise: e.devise, test: e.test, action: e.action, echec: e.echec }
}

function erreur(e: unknown, quoi: string) {
  if (e instanceof ErreurFournisseur) {
    console.error(`[mobile-money] ${quoi}`, e.status, e.code, JSON.stringify(e.brut)?.slice(0, 1000))
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status, headers: SANS_CACHE })
  }
  console.error(`[mobile-money] ${quoi}`, e)
  return NextResponse.json({ error: 'Le paiement mobile money ne répond pas. Réessayez.' }, { status: 502, headers: SANS_CACHE })
}

/** Les gardes communes : connecté, interrupteur ouvert, appli LIVRÉE de ce compte. */
type Garde = { garde: { userId: string; email: string | null }; id: string } | { reponse: Response }

async function garder(req: Request): Promise<Garde> {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return { reponse: garde.response }
  if (!(await mobileMoneyOuvert(garde.userId, garde.email))) {
    return { reponse: NextResponse.json({ error: PHRASE_MOBILE_MONEY_FERME }, { status: 403 }) }
  }
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return { reponse: NextResponse.json({ error: 'id requis' }, { status: 400 }) }
  const lu = await supabaseAdmin.from(TABLE_GENERATIONS).select('id, statut').eq('id', id).eq('owner_id', garde.userId).maybeSingle()
  if (lu.error !== null || lu.data === null) return { reponse: NextResponse.json({ error: 'application inconnue' }, { status: 404 }) }
  if ((lu.data as { statut: string }).statut !== 'livree') {
    return { reponse: NextResponse.json({ error: 'Seule une application livrée peut être abonnée.' }, { status: 409 }) }
  }
  return { garde: { userId: garde.userId, email: garde.email }, id }
}

/** Un encaissement n'est lisible que par le compte et l'appli qui l'ont ouvert. */
async function encaissementDe(idEnc: string, app: string, proprietaire: string): Promise<Encaissement | null> {
  const e = await fournisseurMobileMoney().lire(idEnc)
  return e.rattachement !== null && e.rattachement.app === app && e.rattachement.proprietaire === proprietaire ? e : null
}

export async function GET(req: Request) {
  const g = await garder(req)
  if ('reponse' in g) return g.reponse
  const idEnc = new URL(req.url).searchParams.get('encaissement') ?? ''
  try {
    if (idEnc !== '') {
      const e = await encaissementDe(idEnc, g.id, g.garde.userId)
      if (e === null) return NextResponse.json({ error: 'paiement inconnu' }, { status: 404 })
      return NextResponse.json(vue(e), { headers: SANS_CACHE })
    }
    // Aucun réglage manquant n'est comblé : sans tarif complet, AUCUN montant
    // n'est proposé (jamais un prix sans frais).
    const t = await lireTarifMobileMoney()
    if (!t.ok) {
      console.warn(`[mobile-money] frais non réglés : ${t.manque.join(', ')}`)
      return NextResponse.json({ error: PHRASE_FRAIS_NON_REGLES }, { status: 409, headers: SANS_CACHE })
    }
    const operateurs = (await fournisseurMobileMoney().operateurs('XAF', 'TD'))
      .map((o) => ({ o, p: prixPour(t.tarif, o.code) }))
      .filter((x): x is { o: typeof x.o; p: Prix } => x.p !== null)
      .map(({ o, p }) => ({ ...o, ...p }))
    if (operateurs.length === 0) return NextResponse.json({ error: PHRASE_FRAIS_NON_REGLES }, { status: 409, headers: SANS_CACHE })
    return NextResponse.json({ prix: t.tarif.prix, devise: 'XAF', operateurs }, { headers: SANS_CACHE })
  } catch (e) {
    return erreur(e, 'lecture')
  }
}

export async function POST(req: Request) {
  const g = await garder(req)
  if ('reponse' in g) return g.reponse
  const corps = (await req.json().catch(() => null)) as { operateur?: unknown; telephone?: unknown; nom?: unknown; code?: unknown } | null
  if (corps === null) return NextResponse.json({ error: 'corps JSON requis' }, { status: 400 })
  const idEnc = new URL(req.url).searchParams.get('encaissement') ?? ''
  try {
    if (idEnc !== '') {
      const code = typeof corps.code === 'string' ? corps.code.trim() : ''
      if (!/^[0-9]{4,8}$/u.test(code)) return NextResponse.json({ error: 'Le code fait 4 à 8 chiffres.' }, { status: 400 })
      if ((await encaissementDe(idEnc, g.id, g.garde.userId)) === null) return NextResponse.json({ error: 'paiement inconnu' }, { status: 404 })
      return NextResponse.json(vue(await fournisseurMobileMoney().autoriser(idEnc, code)), { headers: SANS_CACHE })
    }
    if (typeof corps.operateur !== 'string' || corps.operateur === '' || typeof corps.telephone !== 'string' || typeof corps.nom !== 'string') {
      return NextResponse.json({ error: 'opérateur, numéro et nom requis' }, { status: 400 })
    }
    const e = await ouvrirEncaissement({ app: g.id, proprietaire: g.garde.userId, operateur: corps.operateur, telephone: corps.telephone, nomClient: corps.nom })
    return NextResponse.json(vue(e), { status: 201, headers: SANS_CACHE })
  } catch (e) {
    return erreur(e, 'encaissement')
  }
}
