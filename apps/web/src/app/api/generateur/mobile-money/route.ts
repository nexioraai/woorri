import 'server-only'
/**
 * PAYER UNE APPLI PAR MOBILE MONEY — la route du formulaire (2026-11-21, MODE TEST).
 *
 * GET  ?id=<appli>                         → { montant, devise, test, operateurs[] (code, nom, validation) }
 *                                            ou 409 + phrase si un réglage manque
 *
 * UN SEUL PRIX (2026-11-23) : le client ne reçoit qu'UN montant — ni frais,
 * ni pourcentage, ni différence entre opérateurs, à l'écran comme ici.
 * LE MODE (lot L3) : réel pour le seul compte du propriétaire (mode.ts),
 * test pour tous les autres ; `test` le dit à l'écran.
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
import { lireTarifMobileMoney, mobileMoneyOuvert, regimeDuCompte, ouvrirEncaissement, PHRASE_MOBILE_MONEY_FERME } from '@/lib/payments/mobile-money/encaissement'
import { PHRASE_FRAIS_NON_REGLES, operateurPropose, prixMobileMoney } from '@/lib/payments/mobile-money/frais'
import type { RegimeMobileMoney } from '@/lib/payments/mobile-money/regime'
import { mobileMoneyPermis } from '@/lib/payments/moyens-par-produit'
import { ErreurFournisseur, type Encaissement, type FournisseurMobileMoney } from '@/lib/payments/mobile-money/types'

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
type Garde = { garde: { userId: string; email: string | null }; id: string; regime: RegimeMobileMoney; f: FournisseurMobileMoney } | { reponse: Response }

async function garder(req: Request): Promise<Garde> {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return { reponse: garde.response }
  // Cette route paie une APPLICATION ; le dropshipping (carte seulement) n'y passe jamais.
  if (!mobileMoneyPermis('application') || !(await mobileMoneyOuvert(garde.userId, garde.email))) {
    return { reponse: NextResponse.json({ error: PHRASE_MOBILE_MONEY_FERME }, { status: 403 }) }
  }
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return { reponse: NextResponse.json({ error: 'id requis' }, { status: 400 }) }
  const lu = await supabaseAdmin.from(TABLE_GENERATIONS).select('id, statut').eq('id', id).eq('owner_id', garde.userId).maybeSingle()
  if (lu.error !== null || lu.data === null) return { reponse: NextResponse.json({ error: 'application inconnue' }, { status: 404 }) }
  if ((lu.data as { statut: string }).statut !== 'livree') {
    return { reponse: NextResponse.json({ error: 'Seule une application livrée peut être abonnée.' }, { status: 409 }) }
  }
  const regime = await regimeDuCompte(garde.email)
  return { garde: { userId: garde.userId, email: garde.email }, id, regime, f: fournisseurMobileMoney(regime) }
}

/** Un encaissement n'est lisible que par le compte et l'appli qui l'ont ouvert. */
async function encaissementDe(f: FournisseurMobileMoney, idEnc: string, app: string, proprietaire: string): Promise<Encaissement | null> {
  const e = await f.lire(idEnc)
  return e.rattachement !== null && e.rattachement.app === app && e.rattachement.proprietaire === proprietaire ? e : null
}

export async function GET(req: Request) {
  const g = await garder(req)
  if ('reponse' in g) return g.reponse
  const idEnc = new URL(req.url).searchParams.get('encaissement') ?? ''
  try {
    if (idEnc !== '') {
      const e = await encaissementDe(g.f, idEnc, g.id, g.garde.userId)
      if (e === null) return NextResponse.json({ error: 'paiement inconnu' }, { status: 404 })
      return NextResponse.json(vue(e), { headers: SANS_CACHE })
    }
    // Aucun réglage manquant n'est comblé : sans tarif complet, AUCUN montant
    // n'est proposé.
    const t = await lireTarifMobileMoney()
    if (!t.ok) {
      console.warn(`[mobile-money] réglages manquants : ${t.manque.join(', ')}`)
      return NextResponse.json({ error: PHRASE_FRAIS_NON_REGLES }, { status: 409, headers: SANS_CACHE })
    }
    // Les opérateurs, SANS prix propre : un seul montant pour tous.
    const operateurs = (await g.f.operateurs('XAF', 'TD'))
      .filter((o) => operateurPropose(o.code))
      .map((o) => ({ code: o.code, nom: o.nom, validation: o.validation }))
    if (operateurs.length === 0) return NextResponse.json({ error: PHRASE_FRAIS_NON_REGLES }, { status: 409, headers: SANS_CACHE })
    return NextResponse.json({ montant: prixMobileMoney(t.tarif).total, devise: 'XAF', test: g.regime === 'test', operateurs }, { headers: SANS_CACHE })
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
      if ((await encaissementDe(g.f, idEnc, g.id, g.garde.userId)) === null) return NextResponse.json({ error: 'paiement inconnu' }, { status: 404 })
      return NextResponse.json(vue(await g.f.autoriser(idEnc, code)), { headers: SANS_CACHE })
    }
    if (typeof corps.operateur !== 'string' || corps.operateur === '' || typeof corps.telephone !== 'string' || typeof corps.nom !== 'string') {
      return NextResponse.json({ error: 'opérateur, numéro et nom requis' }, { status: 400 })
    }
    const e = await ouvrirEncaissement({ app: g.id, proprietaire: g.garde.userId, operateur: corps.operateur, telephone: corps.telephone, nomClient: corps.nom }, g.f)
    return NextResponse.json(vue(e), { status: 201, headers: SANS_CACHE })
  } catch (e) {
    return erreur(e, 'encaissement')
  }
}
