/**
 * LA LISTE DES APPLICATIONS D'UNE PERSONNE.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-30.
 *
 * Douze routes d'API lisaient la table des générations. AUCUNE PAGE ne la
 * lisait. Le tableau de bord listait les SITES et rien d'autre — une
 * application générée n'apparaissait nulle part, jamais.
 *
 * Le propriétaire a produit CONTERAK deux fois. Les deux fois, la seule
 * façon de la retrouver a été que je sorte les fichiers à la main. Ce n'est
 * pas un défaut d'ergonomie : c'est une œuvre payée que le produit perd.
 *
 * ── POURQUOI UNE ROUTE PLUTÔT QU'UNE LECTURE DIRECTE.
 *
 * Le tableau de bord lit `sites` côté client, avec la session de la
 * personne. Faire pareil ici ferait dépendre l'affichage d'une politique RLS
 * sur `app_generations` — que je n'ai pas vérifiée, et qu'il serait
 * malhonnête de supposer. Le serveur filtre par `owner_id` : la garantie est
 * dans le code, visible, et ne tient pas à un réglage de base.
 *
 * ── CE QUE CETTE ROUTE NE REND JAMAIS.
 *
 * Pas le `document`. Il pèse des dizaines de milliers de caractères et une
 * liste n'en a aucun besoin — on ne charge pas cinquante applications
 * entières pour en afficher les noms. L'œuvre se lit par sa propre route,
 * une à la fois.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'

export const runtime = 'nodejs'

/** Une demande entière est illisible dans une liste ; on en montre le début. */
const APERCU_DEMANDE = 160

export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('id, created_at, statut, moteur, fournisseur, cout_usd, duree_ms, nom, demande, document')
    .eq('owner_id', garde.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (lu.error !== null) {
    return NextResponse.json(
      { error: 'Lecture impossible.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const applications = (lu.data ?? []).map((g) => {
    const doc = g.document as { fichiers?: Record<string, string> } | null
    const fichiers = doc?.fichiers
    return {
      id: g.id as string,
      creeLe: g.created_at as string,
      statut: g.statut as string,
      moteur: g.moteur as string,
      fournisseur: g.fournisseur as string,
      coutUsd: Number(g.cout_usd ?? 0),
      dureeMs: Number(g.duree_ms ?? 0),
      nom: typeof g.nom === 'string' && g.nom !== '' ? g.nom : null,
      demande: String(g.demande ?? '').slice(0, APERCU_DEMANDE),
      // ── CE QUI DÉCIDE SI ON PEUT LA REVOIR, ET C'EST MESURÉ, PAS DÉDUIT.
      //
      // Une ligne `livree` n'est pas une promesse : le statut dit ce que la
      // machine a cru, les fichiers disent ce qu'elle a gardé. L'écran doit
      // n'offrir « revoir » que lorsque la matière existe VRAIMENT — sinon
      // il promet un lien qui rendra 404, et la personne croira avoir perdu
      // son application une seconde fois.
      revoyable: fichiers !== undefined && Object.keys(fichiers).length > 0,
      fichiers: fichiers === undefined ? 0 : Object.keys(fichiers).length,
    }
  })

  return NextResponse.json(
    { applications },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
