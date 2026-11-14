/**
 * L'APPLICATION PAR SON NOM — ce que sert <nom>.deribfy.com.
 *
 * Le middleware réécrit l'hôte vers cette route. Elle est la jumelle de
 * `/p/[jeton]` avec UNE différence : la clef est un NOM choisi et public
 * (`publication_slug`), pas un jeton opaque. Les deux coexistent — le jeton
 * reste le lien « privé par obscurité », le nom est l'adresse qu'on imprime.
 *
 * MÊMES GARANTIES, SANS EXCEPTION : publiée seulement (jeton présent),
 * origine opaque (CSP sandbox), noindex, aucune trace technique au visiteur,
 * et JAMAIS un appel de modèle — servir une œuvre payée est gratuit.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { assembler } from '@/lib/apps/bac-a-sable'
import { languesDePage, pageAutonome } from '@/lib/apps/boucle-directe'
import { baseDeLOeuvre } from '@/lib/apps/base-de-l-oeuvre'
import { entetesSousDomaine } from '@/lib/apps/publication'
import { nomValide } from '@/lib/apps/sous-domaine'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { comptesDuDocument, inscrire, type AdminAuth } from '@/lib/apps/inscription-oeuvre'
import { consommerJeton } from '@/lib/rate-limit/rateLimit'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Un seul 404, texte identique pour toutes les causes — comme /p/[jeton]. */
const introuvable = () =>
  new Response('Cette application est introuvable.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })

export async function GET(_req: Request, ctx: { params: Promise<{ sous: string }> }) {
  const { sous } = await ctx.params
  if (!nomValide(sous)) return introuvable()

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('id, document, nom, publication_jeton')
    .eq('publication_slug', sous)
    .maybeSingle()
  // UN NOM SANS PUBLICATION NE SERT RIEN : le slug peut préexister au jeton
  // (dépublication future) — l'adresse ne doit alors plus répondre.
  if (lu.error !== null || lu.data === null || lu.data.publication_jeton === null) {
    return introuvable()
  }

  const doc = lu.data.document as { fichiers?: Record<string, string> } | null
  if (doc?.fichiers === undefined || Object.keys(doc.fichiers).length === 0) return introuvable()

  const v = await assembler(new Map(Object.entries(doc.fichiers)))
  if (!v.ok) return introuvable()

  const titre = typeof lu.data.nom === 'string' && lu.data.nom !== '' ? lu.data.nom : 'Application'
  // ── LE RÉGIME DU SOUS-DOMAINE (2026-11-05) — une vraie origine.
  //
  // MESURÉ : sous `sandbox allow-scripts` seul, cette page rendait HTTP 200
  // et MOURAIT — « Context's origin is opaque » dès que gotrue-js demande
  // son verrou. `*.deribfy.app` est un domaine enregistrable distinct de
  // `deribfy.com` : la session du produit y est hors d'atteinte avec ou sans
  // bac à sable, donc `allow-same-origin` ne coûte rien ici. Il resterait
  // interdit sur une route servie depuis `deribfy.com` — voir `/p/<jeton>`.
  //
  // ET LE RÉSEAU EST BORNÉ AU SEUL PROJET DES ŒUVRES, `wss:` compris : le
  // paquet embarqué porte le temps réel, et `connect-src https://…` seul
  // l'aurait laissé démarrer pour échouer en silence.
  const base = baseDeLOeuvre(String(lu.data.id), lu.data.document)
  return new Response(
    // ── `servie` ET NON `apercu` : sans base, la phrase juste n'est pas
    //    « ce sera créé » — on y EST. Mesuré sur sneapp, publiée et sans
    //    aucun `create table`.
    pageAutonome(v.code, titre, base, 'servie', null, languesDePage(lu.data.document)),
    { status: 200, headers: entetesSousDomaine(base?.url ?? '') },
  )
}

/**
 * T2b-2 · L'INSCRIPTION (2026-11-14) — `POST <nom>.deribfy.app`, quel que soit le chemin.
 *
 * Ouverte SEULEMENT pour une application publiée dont le cahier demande des
 * comptes individuels (`document.comptes`). Le compte est créé dans le projet
 * des œuvres, rattaché à cette œuvre et à son rôle de base ; l'adresse du
 * visiteur n'est gardée que hachée. Une seule réponse « introuvable » pour toute
 * application qui n'ouvre pas l'inscription.
 */
const PLAFOND_PAR_OEUVRE = 60
const PLAFOND_PAR_ADRESSE = 5
const HEURE = 3_600_000

export async function POST(req: Request, ctx: { params: Promise<{ sous: string }> }) {
  const { sous } = await ctx.params
  if (!nomValide(sous)) return introuvable()
  const texte = await req.text()
  if (texte.length > 4_096) return Response.json({ message: 'Demande trop longue.' }, { status: 413 })
  let corps: { faire?: unknown; identifiant?: unknown; secret?: unknown }
  try { corps = JSON.parse(texte) as typeof corps } catch { return Response.json({ message: 'Demande illisible.' }, { status: 400 }) }
  if (corps.faire !== 'inscrire') return Response.json({ message: 'Demande illisible.' }, { status: 400 })

  const lu = await supabaseAdmin.from(TABLE_GENERATIONS).select('id, document, publication_jeton').eq('publication_slug', sous).maybeSingle()
  if (lu.error !== null || lu.data === null || lu.data.publication_jeton === null) return introuvable()
  const comptes = comptesDuDocument(lu.data.document)
  if (comptes === null) return introuvable()
  const cfg = configBaseOeuvres(process.env)
  if (!cfg.ok) return Response.json({ message: 'Le service est momentanément indisponible.' }, { status: 503 })

  const idOeuvre = String(lu.data.id)
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || 'inconnue'
  const adresse = createHash('sha256').update(ip).digest('hex').slice(0, 32)
  const r = await inscrire({
    idOeuvre, comptes, identifiant: corps.identifiant, secret: corps.secret, adresse,
    admin: createClient(cfg.config.url, cfg.config.cleSecrete, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as AdminAuth,
    limiter: (cle) => consommerJeton({
      type: cle.portee === 'oeuvre' ? `app_inscription:${idOeuvre}` : `app_inscription:${cle.valeur}`,
      siteId: null, fenetreMs: HEURE, plafond: cle.portee === 'oeuvre' ? PLAFOND_PAR_OEUVRE : PLAFOND_PAR_ADRESSE,
    }),
  })
  return r.ok ? Response.json({ ok: true }, { status: 201 }) : Response.json({ message: r.message }, { status: r.statut })
}
