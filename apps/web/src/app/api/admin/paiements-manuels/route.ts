/**
 * L'ACTIVATION À LA MAIN — étape ④ du quota (2026-11-19).
 *
 * Le SEUL cas où le propriétaire intervient : un client que la carte ne couvre
 * pas (Stripe ne couvre pas le Tchad) paie en espèces, par Airtel ou par Moov,
 * et le propriétaire l'active ici, avec la RÉFÉRENCE de la transaction (ou le
 * numéro du reçu remis). Par carte, tout est automatique. Le jour où un
 * agrégateur mobile money est signé, il appellera la même fonction en base.
 *
 *   GET  ?q=…   chercher une appli (nom publié, titre ou adresse du propriétaire)
 *   POST        enregistrer un paiement — `enregistrer_paiement`, la fonction
 *               unique de toutes les sources (supabase/sql/quota_modifications.sql)
 *
 * Ce que la base tient déjà, et que cette route ne fait que DIRE avec des mots :
 *   · prix en FCFA vide → refus (« un réglage vide ne vaut pas zéro ») ;
 *   · la même référence chez le même fournisseur → une seule fois ;
 *   · un paiement ne vaut que pour l'appli de son propriétaire ;
 *   · un lot ne s'ajoute qu'à un abonnement en cours.
 * Réservé aux adresses d'administration, vérifié ICI (jamais par l'écran).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estAdmin } from '@/lib/admin-emails'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'

export const runtime = 'nodejs'

export const FOURNISSEURS_MANUELS = ['especes', 'airtel', 'moov'] as const
export const PHRASE_PRIX_VIDE =
  'Le prix mensuel en FCFA n’est pas encore réglé : aucune activation à la main n’est possible tant qu’il est vide.'

async function admin(req: Request): Promise<{ ok: true; email: string } | { ok: false; reponse: Response }> {
  // Un en-tête « Bearer » sans jeton est un jeton ABSENT (l'espace final est
  // retiré en chemin) — pas une identité à interroger.
  const jeton = /^Bearer\s+(\S+)$/u.exec(req.headers.get('authorization') ?? '')?.[1] ?? ''
  if (jeton === '') return { ok: false, reponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data, error } = await supabaseAdmin.auth.getUser(jeton)
  const email = data?.user?.email ?? null
  if (error || !estAdmin(email)) return { ok: false, reponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { ok: true, email: email as string }
}

async function reglages(): Promise<Record<string, string>> {
  const r = await supabaseAdmin.from('quota_reglages').select('cle, valeur')
  return Object.fromEntries(((r.data ?? []) as { cle: string; valeur: string }[]).map((x) => [x.cle, x.valeur]))
}

export async function GET(req: Request) {
  const a = await admin(req)
  if (!a.ok) return a.reponse
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().toLowerCase()
  if (q.length < 2) return NextResponse.json({ error: 'au moins deux lettres' }, { status: 400 })

  // Par nom publié ou titre ; et par adresse du propriétaire (les comptes sont peu nombreux).
  const motif = `%${q.replace(/[%_]/gu, '')}%`
  const [parNom, parTitre, comptes] = await Promise.all([
    supabaseAdmin.from(TABLE_GENERATIONS).select('id, nom, publication_slug, owner_id').eq('statut', 'livree').ilike('publication_slug', motif),
    supabaseAdmin.from(TABLE_GENERATIONS).select('id, nom, publication_slug, owner_id').eq('statut', 'livree').ilike('nom', motif),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ])
  const proprietaires = new Map<string, string>()
  for (const u of comptes.data?.users ?? []) if (u.email) proprietaires.set(u.id, u.email)
  const parAdresse = [...proprietaires.entries()].filter(([, e]) => e.toLowerCase().includes(q)).map(([id]) => id)
  const parProprietaire = parAdresse.length === 0
    ? { data: [] }
    : await supabaseAdmin.from(TABLE_GENERATIONS).select('id, nom, publication_slug, owner_id').eq('statut', 'livree').in('owner_id', parAdresse)

  const applis = new Map<string, { id: string; nom: string | null; publication_slug: string | null; owner_id: string }>()
  for (const l of [...(parNom.data ?? []), ...(parTitre.data ?? []), ...((parProprietaire.data ?? []) as never[])]) {
    const x = l as { id: string; nom: string | null; publication_slug: string | null; owner_id: string }
    applis.set(x.id, x)
  }
  const ids = [...applis.keys()]
  const compteurs = ids.length === 0 ? { data: [] } : await supabaseAdmin.from('app_compteurs').select('app_id, statut, paye_jusqu_au').in('app_id', ids)
  const parApp = new Map(((compteurs.data ?? []) as { app_id: string; statut: string; paye_jusqu_au: string | null }[]).map((c) => [c.app_id, c]))
  const r = await reglages()

  return NextResponse.json(
    {
      applis: [...applis.values()].slice(0, 20).map((x) => ({
        id: x.id,
        nom: x.nom,
        adresse: x.publication_slug,
        proprietaire: proprietaires.get(x.owner_id) ?? null,
        formule: parApp.get(x.id)?.statut ?? 'gratuite',
        payeJusquAu: parApp.get(x.id)?.paye_jusqu_au ?? null,
      })),
      reglages: { prixMensuelXaf: r.prix_mensuel_xaf ?? '', dureeJours: r.duree_jours ?? '', lotTaille: r.lot_taille ?? '' },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(req: Request) {
  const a = await admin(req)
  if (!a.ok) return a.reponse
  const corps = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const appId = typeof corps.appId === 'string' ? corps.appId : ''
  const objet = corps.objet
  const fournisseur = corps.fournisseur
  const reference = typeof corps.reference === 'string' ? corps.reference.trim() : ''
  const montant = corps.montant

  if (appId === '') return NextResponse.json({ error: 'Choisissez une application.' }, { status: 400 })
  if (objet !== 'abonnement' && objet !== 'lot') return NextResponse.json({ error: 'Abonnement ou lot ?' }, { status: 400 })
  if (!(FOURNISSEURS_MANUELS as readonly unknown[]).includes(fournisseur)) {
    return NextResponse.json({ error: 'Espèces, Airtel ou Moov.' }, { status: 400 })
  }
  if (reference.length < 3 || reference.length > 80) {
    return NextResponse.json({ error: 'La référence est obligatoire : le numéro de la transaction, ou celui du reçu remis.' }, { status: 400 })
  }
  if (typeof montant !== 'number' || !Number.isInteger(montant) || montant <= 0) {
    return NextResponse.json({ error: 'Le montant reçu, en FCFA, est un nombre entier.' }, { status: 400 })
  }

  // Le prix vide se dit AVANT d'écrire — la base le refuserait aussi.
  const prix = ((await reglages()).prix_mensuel_xaf ?? '').trim()
  if (prix === '') return NextResponse.json({ error: PHRASE_PRIX_VIDE }, { status: 409 })

  const app = await supabaseAdmin.from(TABLE_GENERATIONS).select('id, owner_id, nom').eq('id', appId).maybeSingle()
  if (app.error !== null || app.data === null) return NextResponse.json({ error: 'Application introuvable.' }, { status: 404 })
  const { owner_id: proprietaire } = app.data as { owner_id: string; nom: string | null }

  const r = await supabaseAdmin.rpc('enregistrer_paiement', {
    p_source: 'manuelle', p_fournisseur: fournisseur, p_reference: reference,
    p_app: appId, p_owner: proprietaire, p_objet: objet,
    p_montant: montant, p_devise: 'XAF', p_jusqu_au: null, p_saisi_par: a.email,
  })
  if (r.error !== null) {
    const m = r.error.message
    if (m.includes('QUOTA_REGLAGE_ABSENT')) return NextResponse.json({ error: PHRASE_PRIX_VIDE }, { status: 409 })
    if (m.includes('PAIEMENT_LOT_SANS_ABONNEMENT')) {
      return NextResponse.json({ error: 'Un lot s’ajoute à un abonnement en cours : cette application n’en a pas.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Le paiement n’a pas été enregistré.', motif: m }, { status: 500 })
  }
  const d = r.data as { statut: string; app_id: string; jusqu_au: string | null }
  if (d.statut === 'deja_enregistre') {
    const deja = await supabaseAdmin.from(TABLE_GENERATIONS).select('nom, publication_slug').eq('id', d.app_id).maybeSingle()
    const qui = (deja.data as { nom?: string | null; publication_slug?: string | null } | null)
    return NextResponse.json(
      { error: `Cette référence a déjà été enregistrée — pour « ${qui?.publication_slug ?? qui?.nom ?? d.app_id} ». Rien n’a été activé une seconde fois.`, dejaEnregistre: true },
      { status: 409 },
    )
  }
  return NextResponse.json({ ok: true, jusquAu: d.jusqu_au }, { headers: { 'Cache-Control': 'no-store' } })
}
