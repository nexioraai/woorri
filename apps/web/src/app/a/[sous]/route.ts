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
