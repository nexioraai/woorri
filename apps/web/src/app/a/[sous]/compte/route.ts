/**
 * LA PAGE « COMPTE » D'UNE APPLI PUBLIÉE — `<nom>.deribfy.app/compte` (2026-11-18).
 *
 * Servie par Deribfy, pas écrite dans l'appli : elle atteint les applis
 * EXISTANTES dès le déploiement (règle du propriétaire, option B). Voir
 * `lib/apps/page-compte.ts` pour ce qu'elle fait.
 *
 * MÊMES GARANTIES QUE `a/[sous]` : publiée seulement, même 404 pour toutes les
 * causes, mêmes en-têtes (CSP bornée au projet des œuvres), et jamais un appel
 * de modèle. MÊME ORIGINE que l'appli : la session qu'elle a ouverte est ici.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { assembler } from '@/lib/apps/bac-a-sable'
import { pageAutonome } from '@/lib/apps/boucle-directe'
import { apparenceDuDocument } from '@/lib/apps/apparence'
import { baseDeLOeuvre } from '@/lib/apps/base-de-l-oeuvre'
import { entetesSousDomaine } from '@/lib/apps/publication'
import { nomValide } from '@/lib/apps/sous-domaine'
import { FICHIERS_PAGE_COMPTE } from '@/lib/apps/page-compte'

export const runtime = 'nodejs'
export const maxDuration = 60

const introuvable = () =>
  new Response('Cette application est introuvable.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })

/** La page est la même pour toutes les applis : assemblée une fois par instance. */
let assemblee: Promise<string | null> | null = null
const codeDeLaPage = (): Promise<string | null> => {
  assemblee ??= assembler(new Map(FICHIERS_PAGE_COMPTE)).then((v) => (v.ok ? v.code : null))
  return assemblee.then((c) => {
    if (c === null) assemblee = null
    return c
  })
}

export async function GET(_req: Request, ctx: { params: Promise<{ sous: string }> }) {
  const { sous } = await ctx.params
  if (!nomValide(sous)) return introuvable()

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('id, document, nom, publication_jeton')
    .eq('publication_slug', sous)
    .maybeSingle()
  if (lu.error !== null || lu.data === null || lu.data.publication_jeton === null) {
    return introuvable()
  }

  // UNE APPLI SANS BASE N'A PAS DE COMPTE : rien à protéger, rien à ouvrir.
  const base = baseDeLOeuvre(String(lu.data.id), lu.data.document)
  if (base === undefined || base.url === '') return introuvable()

  const code = await codeDeLaPage()
  if (code === null) return introuvable()

  const titre = typeof lu.data.nom === 'string' && lu.data.nom !== '' ? lu.data.nom : 'Application'
  return new Response(
    pageAutonome(code, `Compte — ${titre}`, base, 'servie', null, apparenceDuDocument(lu.data.document)),
    { status: 200, headers: entetesSousDomaine(base.url) },
  )
}
