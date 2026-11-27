/**
 * L'ÉPREUVE DU VISITEUR, VUE DE L'ATELIER (É1, 2026-11-27).
 *
 * GET ?id=…           → `{ applicable }` : l'appli a-t-elle une page de suivi
 *                       par clé ? Aucune base touchée, aucun appel réseau.
 * GET ?id=…&lancer=1  → l'épreuve réelle (`epreuve-par-cle.ts`) : un visiteur
 *                       frappe par l'API publique, et on rend ce qu'il a reçu.
 *
 * ── L'IDENTITÉ FILTRE LA REQUÊTE, elle ne la vérifie pas après coup — même
 *    invariant que `compte/route.ts`. L'épreuve ne lit qu'UNE clé, côté
 *    serveur, en transaction LECTURE SEULE ; elle n'écrit rien, et la clé ne
 *    sort jamais dans la réponse.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { declarationDe } from '@/lib/apps/declaration-depuis-schema'
// PAS `baseDeLOeuvre` : son import de type vers `boucle-directe` tire
// l'assembleur dans le traçage (EP-278), et cette route n'assemble rien.
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { nomSchemaOeuvre } from '@/lib/apps/poser-oeuvre'
import { eprouverParCle } from '@/lib/apps/epreuve-par-cle'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('document, publication_jeton')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) {
    return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  }
  const entites = declarationDe(lu.data.document)
  const applicable = entites.some((e) => e.lectureParCle !== undefined)
  const publiee = typeof lu.data.publication_jeton === 'string' && lu.data.publication_jeton !== ''
  if (url.searchParams.get('lancer') !== '1' || !applicable) {
    return NextResponse.json({ applicable, publiee }, { headers: { 'Cache-Control': 'no-store' } })
  }
  if (!publiee) {
    return NextResponse.json(
      { applicable, publiee, error: 'Publiez l’application d’abord : avant, aucun visiteur ne peut frapper.' },
      { status: 409 },
    )
  }
  const cfg = configBaseOeuvres(process.env)
  const base = cfg.ok
    ? { url: cfg.config.url, clePubliable: cfg.config.clePubliable, schema: nomSchemaOeuvre(id) }
    : undefined
  const dsn = process.env.OEUVRES_DATABASE_URL_POOLER_TRANSACTION ?? ''
  if (base === undefined || base.url === '' || dsn === '') {
    return NextResponse.json({ applicable, publiee, error: 'La base des applications est injoignable : rien n’a été éprouvé.' }, { status: 503 })
  }

  const { Client } = (await import('pg')) as unknown as {
    Client: new (c: { connectionString: string; statement_timeout?: number }) => {
      connect: () => Promise<void>
      query: (q: string) => Promise<{ rows?: Record<string, unknown>[] }>
      end: () => Promise<void>
    }
  }
  const client = new Client({ connectionString: dsn, statement_timeout: 15_000 })
  try {
    await client.connect()
    await client.query('begin transaction read only')
    const tables = await eprouverParCle({
      url: base.url,
      clePubliable: base.clePubliable,
      schema: base.schema,
      entites,
      lire: async (sql) => (await client.query(sql)).rows ?? [],
    })
    await client.query('rollback')
    return NextResponse.json({ applicable, publiee, tables }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json(
      { applicable, publiee, error: `L’épreuve n’a pas abouti : ${e instanceof Error ? e.message.slice(0, 160) : String(e)}` },
      { status: 502 },
    )
  } finally {
    await client.end().catch(() => undefined)
  }
}
