/**
 * REVOIR UNE APPLICATION DÉJÀ PRODUITE — SANS LA REPAYER.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-30.
 *
 * Douze routes d'API lisent la table des générations. AUCUNE PAGE ne la lit.
 * L'aperçu n'existait qu'en mémoire du navigateur : on ferme l'onglet, on
 * recharge, et l'œuvre est perdue — alors qu'elle est en base, entière.
 *
 * Le propriétaire a généré CONTERAK DEUX FOIS. Les deux fois, le seul moyen
 * de la revoir a été que je sorte les fichiers à la main vers un dossier
 * temporaire. Une application qu'on ne peut revoir qu'en passant par moi
 * n'est pas livrée : elle est prêtée.
 *
 * ── CE QUE CETTE ROUTE NE FAIT PAS, ET C'EST L'ESSENTIEL.
 *
 * ELLE N'APPELLE AUCUN MODÈLE. Les fichiers sont déjà en base ; on les
 * recompile. Revoir une application coûte donc ZÉRO — autant de fois qu'on
 * veut. C'est la différence entre un produit et une démonstration.
 *
 * ── POURQUOI UNE ROUTE ET PAS UNE PAGE.
 *
 * L'application tourne dans un cadre isolé (`sandbox="allow-scripts"` sans
 * `allow-same-origin`). Elle doit donc être servie comme un DOCUMENT entier,
 * pas montée dans l'arbre React du site — sinon elle lirait l'origine qui
 * l'héberge. Même garantie que l'aperçu, même raison.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { assembler } from '@/lib/apps/bac-a-sable'
import { pageAutonome } from '@/lib/apps/boucle-directe'

export const runtime = 'nodejs'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const { id } = await ctx.params

  // ── L'IDENTITÉ FILTRE LA REQUÊTE, elle ne la vérifie pas après coup.
  //
  // Invariant du dépôt, appris à ses dépens : toute requête qui vise une
  // ligne par son `id` filtre AUSSI par `owner_id`. Lire d'abord puis
  // comparer ensuite laisse une fenêtre où l'on a déjà la donnée d'autrui.
  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('statut, document, nom, demande')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()

  const doc = lu.data?.document as { fichiers?: Record<string, string> } | null
  const fichiers = doc?.fichiers
  if (lu.error !== null || lu.data === null || fichiers === undefined) {
    return NextResponse.json(
      { error: 'Cette application est introuvable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const v = await assembler(new Map(Object.entries(fichiers)))
  if (!v.ok) {
    // ── UNE ŒUVRE RANGÉE « LIVRÉE » QUI NE RECOMPILE PLUS EST UN FAIT, PAS
    // UNE FATALITÉ. On le DIT, avec l'erreur du compilateur : sans elle,
    // l'écran afficherait du blanc et personne ne saurait pourquoi — le
    // défaut exact du 2026-10-19, payé une demi-heure de recherche.
    return NextResponse.json(
      { error: `Cette application ne se recompile plus : ${v.erreur}` },
      { status: 422, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const titre =
    typeof lu.data.nom === 'string' && lu.data.nom !== '' ? lu.data.nom : 'Votre application'

  return new Response(pageAutonome(v.code, titre), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // PRIVÉ : cette page porte l'œuvre d'une personne. Aucun cache partagé
      // ne doit la retenir — ni un proxy, ni un CDN.
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
