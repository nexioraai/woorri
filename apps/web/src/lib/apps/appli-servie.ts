import 'server-only'
/**
 * L'APPLI PUBLIÉE SOUS CE NOM, pour ses fichiers d'installation (2026-11-22).
 *
 * Les mêmes garanties que `/a/[sous]` : un nom valide, une ligne publiée
 * (jeton présent). Sinon `null`, et la route répond 404 — un nom enregistré
 * mais non payé n'a ni manifeste, ni icône, ni service worker.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { nomValide } from '@/lib/apps/sous-domaine'
import { apparenceDuDocument } from '@/lib/apps/apparence'
import { identitePwa, type IdentitePwa } from '@/lib/apps/pwa'

export async function identiteDeLAppliServie(sous: string): Promise<IdentitePwa | null> {
  if (!nomValide(sous)) return null
  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('nom, document, publication_jeton')
    .eq('publication_slug', sous)
    .maybeSingle()
  if (lu.error !== null || lu.data === null || lu.data.publication_jeton === null) return null
  const titre = typeof lu.data.nom === 'string' && lu.data.nom !== '' ? lu.data.nom : 'Application'
  return identitePwa(titre, apparenceDuDocument(lu.data.document))
}

export const introuvable = (): Response =>
  new Response('Cette application est introuvable.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
