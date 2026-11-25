/**
 * PAYER UN SITE PAR MOBILE MONEY (lot L5, 2026-11-25) — la copie, pour un
 * site, de la route des applis.
 *   GET            → { montant, devise, test, operateurs } : UN montant (prix
 *                    NET du type de site, formule de l'appli), sans frais ;
 *   GET  &encaissement= → l'état de CE paiement ;
 *   POST           → { operateur, telephone, nom } : ouvre l'encaissement ;
 *   POST &encaissement= → { code } : code à usage unique.
 * Jamais le dropshipping (carte seulement) ; propriétaire seulement. Ne
 * déclare rien de payé : seul l'avis signé met le site en ligne.
 */
import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { fournisseurMobileMoney } from '@/lib/payments/mobile-money/fournisseur'
import { lireTarifMobileMoney, mobileMoneyOuvert, ouvrirEncaissementSite, prixNetSitePourMode, regimeDuCompte, PHRASE_MOBILE_MONEY_FERME } from '@/lib/payments/mobile-money/encaissement'
import { PHRASE_FRAIS_NON_REGLES, operateurPropose, prixMobileMoney } from '@/lib/payments/mobile-money/frais'
import { mobileMoneyPermis } from '@/lib/payments/moyens-par-produit'
import { PHRASE_SITE_CARTE_SEULEMENT, produitDuMode } from '@/lib/payments/site-mobile-money'
import { ErreurFournisseur, type Encaissement, type FournisseurMobileMoney } from '@/lib/payments/mobile-money/types'

export const runtime = 'nodejs'

const SANS_CACHE = { 'Cache-Control': 'no-store' }

function vue(e: Encaissement) {
  return { encaissement: e.id, etat: e.etat, montant: e.montant, devise: e.devise, test: e.test, action: e.action, echec: e.echec }
}

function erreur(e: unknown, quoi: string) {
  if (e instanceof ErreurFournisseur) {
    console.error(`[mobile-money site] ${quoi}`, e.status, e.code, JSON.stringify(e.brut)?.slice(0, 1000))
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status, headers: SANS_CACHE })
  }
  console.error(`[mobile-money site] ${quoi}`, e)
  return NextResponse.json({ error: 'Le paiement mobile money ne répond pas. Réessayez.' }, { status: 502, headers: SANS_CACHE })
}

type Garde = { site: string; proprietaire: string; prixNet: number; test: boolean; f: FournisseurMobileMoney } | { reponse: Response }

async function garder(req: Request, slug: string): Promise<Garde> {
  const auth = await requireSiteOwner(req, slug, 'id, mode, owner_id, archived_at')
  if (!auth.ok) return { reponse: auth.response }
  if (auth.viaAdmin) return { reponse: NextResponse.json({ error: 'Réservé au propriétaire du site.' }, { status: 403 }) }
  const s = auth.site as { id: string; mode: unknown; owner_id: string | null; archived_at: string | null }
  if (s.owner_id === null || s.archived_at !== null) return { reponse: NextResponse.json({ error: 'Site introuvable' }, { status: 404 }) }
  const produit = produitDuMode(s.mode)
  if (produit === null || !mobileMoneyPermis(produit)) return { reponse: NextResponse.json({ error: PHRASE_SITE_CARTE_SEULEMENT }, { status: 403 }) }
  if (!(await mobileMoneyOuvert(s.owner_id, auth.email ?? null))) return { reponse: NextResponse.json({ error: PHRASE_MOBILE_MONEY_FERME }, { status: 403 }) }
  const prixNet = await prixNetSitePourMode(s.mode)
  if (prixNet === null) return { reponse: NextResponse.json({ error: PHRASE_FRAIS_NON_REGLES }, { status: 409, headers: SANS_CACHE }) }
  const regime = await regimeDuCompte(auth.email ?? null)
  return { site: s.id, proprietaire: s.owner_id, prixNet, test: regime === 'test', f: fournisseurMobileMoney(regime) }
}

async function encaissementDe(f: FournisseurMobileMoney, idEnc: string, site: string, proprietaire: string): Promise<Encaissement | null> {
  const e = await f.lire(idEnc)
  return e.rattachement !== null && e.rattachement.site === site && e.rattachement.proprietaire === proprietaire ? e : null
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const g = await garder(req, (await ctx.params).slug)
  if ('reponse' in g) return g.reponse
  const idEnc = new URL(req.url).searchParams.get('encaissement') ?? ''
  try {
    if (idEnc !== '') {
      const e = await encaissementDe(g.f, idEnc, g.site, g.proprietaire)
      if (e === null) return NextResponse.json({ error: 'paiement inconnu' }, { status: 404 })
      return NextResponse.json(vue(e), { headers: SANS_CACHE })
    }
    const t = await lireTarifMobileMoney()
    if (!t.ok) return NextResponse.json({ error: PHRASE_FRAIS_NON_REGLES }, { status: 409, headers: SANS_CACHE })
    const operateurs = (await g.f.operateurs('XAF', 'TD')).filter((o) => operateurPropose(o.code)).map((o) => ({ code: o.code, nom: o.nom, validation: o.validation }))
    if (operateurs.length === 0) return NextResponse.json({ error: PHRASE_FRAIS_NON_REGLES }, { status: 409, headers: SANS_CACHE })
    return NextResponse.json({ montant: prixMobileMoney(t.tarif, g.prixNet).total, devise: 'XAF', test: g.test, operateurs }, { headers: SANS_CACHE })
  } catch (e) {
    return erreur(e, 'lecture')
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const g = await garder(req, (await ctx.params).slug)
  if ('reponse' in g) return g.reponse
  const corps = (await req.json().catch(() => null)) as { operateur?: unknown; telephone?: unknown; nom?: unknown; code?: unknown } | null
  if (corps === null) return NextResponse.json({ error: 'corps JSON requis' }, { status: 400 })
  const idEnc = new URL(req.url).searchParams.get('encaissement') ?? ''
  try {
    if (idEnc !== '') {
      const code = typeof corps.code === 'string' ? corps.code.trim() : ''
      if (!/^[0-9]{4,8}$/u.test(code)) return NextResponse.json({ error: 'Le code fait 4 à 8 chiffres.' }, { status: 400 })
      if ((await encaissementDe(g.f, idEnc, g.site, g.proprietaire)) === null) return NextResponse.json({ error: 'paiement inconnu' }, { status: 404 })
      return NextResponse.json(vue(await g.f.autoriser(idEnc, code)), { headers: SANS_CACHE })
    }
    if (typeof corps.operateur !== 'string' || corps.operateur === '' || typeof corps.telephone !== 'string' || typeof corps.nom !== 'string') {
      return NextResponse.json({ error: 'opérateur, numéro et nom requis' }, { status: 400 })
    }
    const e = await ouvrirEncaissementSite({ site: g.site, proprietaire: g.proprietaire, operateur: corps.operateur, telephone: corps.telephone, nomClient: corps.nom, prixNet: g.prixNet }, g.f)
    return NextResponse.json(vue(e), { status: 201, headers: SANS_CACHE })
  } catch (e) {
    return erreur(e, 'encaissement')
  }
}
