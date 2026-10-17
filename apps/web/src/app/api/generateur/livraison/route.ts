/**
 * ETAGE 4 — LA LIVRAISON. Le zip est RECOMPILE depuis `document`, jamais
 * stocke (la colonne document est la seule verite ; livree_a_document
 * garantit qu'elle existe). Restreint au proprietaire.
 */
import { NextResponse } from 'next/server'
import { compileProject, compileWeb } from '@deribfy/compiler'
import { noteDeLivraison } from '@/lib/apps/ce-que-je-dois-dire'
import { projectAirSchema } from '@deribfy/air-schema'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { zipper } from '@/lib/apps/zip'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const parametres = new URL(req.url).searchParams
  const id = parametres.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })
  // ── LA CIBLE, ET POURQUOI ELLE EST DEMANDEE ICI (EP-244).
  //
  // Le moteur est BI-CIBLE depuis le 2026-10-05 : `compileProject` emet une
  // application React Native / Expo, `compileWeb` une application Vite. Les
  // deux sont gatees a chaque verification (`app_compile`, `app_web`).
  //
  // Mais cette route n'appelait que `compileWeb` : le natif existait,
  // mature et teste, et n'etait OFFERT A PERSONNE. Moteur bi-cible,
  // interface mono-cible — une moitie cablee, l'autre pas.
  //
  // `web` reste le DEFAUT : aucun appelant existant ne passe de cible, et
  // changer ce qu'ils recoivent en silence serait une regression.
  const cible = parametres.get('cible') === 'expo' ? 'expo' : 'web'

  const r = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('statut, document, diagnostics')
    .eq('id', id)
    .eq('owner_id', garde.userId) // dette 6a : l'identite est l'id du jeton
    .maybeSingle()
  if (r.error !== null || r.data === null || r.data.statut !== 'livree' || r.data.document === null) {
    return NextResponse.json({ error: 'rien a livrer' }, { status: 404 })
  }

  const lu = projectAirSchema.safeParse(r.data.document)
  if (!lu.success) {
    return NextResponse.json({ error: 'document illisible' }, { status: 500 })
  }
  try {
    // Le MEME document AIR nourrit les deux cibles : rien n'est regenere,
    // rien n'est repaye — seule la compilation change.
    const projet = cible === 'expo' ? compileProject(lu.data) : compileWeb(lu.data)

    // ── LA NOTE VOYAGE AVEC L'APPLICATION (LOT 3, 2026-10-16).
    //
    // Deribfy savait déjà ce qu'il avait supposé, ce qu'il ne tenait pas et
    // où vivaient les données : quatre besoins `unexpressible` avec leur
    // motif, un `backend` déclaré, une unité sur chaque montant. Tout cela
    // dormait dans un JSON de 62 ko que personne n'ouvre.
    //
    // Mis DANS LE ZIP, et pas seulement à l'écran : un fichier survit à la
    // conversation, au rechargement de la page, et au changement de
    // personne. C'est la propriété qui manquait face à Lovable — dire au
    // moment où ça compte, pas quand on y repense.
    //
    // Les diagnostics ouvrent la note quand il y en a : depuis le LOT 1 une
    // application peut être livrée AVEC RÉSERVES, et les taire reviendrait
    // à refaire le silence que le LOT 1 vient de casser.
    const reserves = Array.isArray(r.data.diagnostics)
      ? (r.data.diagnostics as unknown[]).map(String)
      : []
    const fichiers = new Map<string, string | Buffer>(projet.files)
    fichiers.set('LISEZ-MOI.md', noteDeLivraison(lu.data, reserves))

    const archive = zipper(fichiers)
    return new Response(new Uint8Array(archive), {
      headers: {
        'Content-Type': 'application/zip',
        // Le nom du fichier DIT la cible : deux zips du meme projet dans un
        // dossier de telechargements ne doivent pas se confondre.
        'Content-Disposition': `attachment; filename="${lu.data.app.slug}-${cible}.zip"`,
        'Content-Length': String(archive.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Construction impossible.' },
      { status: 500 },
    )
  }
}
