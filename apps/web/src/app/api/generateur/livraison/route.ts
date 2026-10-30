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
import { assembler } from '@/lib/apps/bac-a-sable'
import { pageAutonome } from '@/lib/apps/boucle-directe'

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
    .select('statut, document, diagnostics, sections_acquises')
    .eq('id', id)
    .eq('owner_id', garde.userId) // dette 6a : l'identite est l'id du jeton
    .maybeSingle()
  if (r.error !== null || r.data === null) {
    return NextResponse.json({ error: 'rien a livrer' }, { status: 404 })
  }

  // ══════════════════════════════════════════════════════════════════
  // LOT 7 — ON LIVRE CE QUI EXISTE, SANS ATTENDRE LA FIN.
  // ══════════════════════════════════════════════════════════════════
  //
  // ── LA MESURE QUI COMMANDE CE LOT.
  //
  // Tir reel du 2026-10-10 : 53 MINUTES, 16,03 $, et le proprietaire n'a
  // rien vu. Cette route exigeait `statut === 'livree'` : pendant tout ce
  // temps, l'acquis etait la, en base, schema-valide et compilable — la
  // route `apercu-live` le COMPILAIT deja pour l'afficher a l'ecran — et le
  // telechargement le refusait.
  //
  // C'est le meme verrou que le LOT 1 a leve un etage plus haut : un juge
  // placé AVANT la livraison plutot qu'une MESURE de la livraison. On ne
  // demande plus « est-ce fini ? » mais « y a-t-il une oeuvre ? ».
  //
  // ── CE QUI FAIT FOI, ET DANS QUEL ORDRE.
  //
  // L'oeuvre finale d'abord : une fois `livree`, la colonne `document` est
  // la seule verite. Sinon l'acquis en cours. Meme ordre que `apercu-live` —
  // l'ecran et le zip ne doivent jamais montrer deux choses differentes.
  const sa = (r.data.sections_acquises ?? {}) as { acquis?: unknown }
  const finale = r.data.statut === 'livree' && r.data.document !== null
  const source = finale ? r.data.document : (sa.acquis ?? null)
  if (source === null) {
    return NextResponse.json({ error: 'rien a livrer' }, { status: 404 })
  }

  // ── L'ŒUVRE DU MOTEUR DIRECT SE TÉLÉCHARGE AUSSI (EP-290, 2026-10-30).
  //
  // Une génération directe range `{fichiers}` — les SOURCES TSX. Le zip rend
  // ces sources telles quelles, plus un `index.html` autonome recompilé :
  // la personne repart avec son code ET une page qui s'ouvre en double-clic.
  // Rien n'est régénéré, rien n'est repayé.
  const docDirect = source as { fichiers?: Record<string, string> }
  if (docDirect.fichiers !== undefined && Object.keys(docDirect.fichiers).length > 0) {
    const v = await assembler(new Map(Object.entries(docDirect.fichiers)))
    if (!v.ok) {
      return NextResponse.json(
        { error: `cette application ne se recompile plus : ${v.erreur.slice(0, 200)}` },
        { status: 500 },
      )
    }
    const fichiersZip = new Map<string, string | Buffer>(Object.entries(docDirect.fichiers))
    fichiersZip.set('index.html', pageAutonome(v.code, 'Application'))
    const archive = zipper(fichiersZip)
    return new Response(new Uint8Array(archive), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="application-web.zip"',
        'Cache-Control': 'private, no-store',
      },
    })
  }

  const lu = projectAirSchema.safeParse(source)
  if (!lu.success) {
    // ── UN ACQUIS MI-PLIE N'EST PAS UNE PANNE.
    //
    // En cours de route, un acquis peut etre invalide le temps d'une tranche
    // (plein tour). `apercu-live` rend alors `pret: false` ; ici on rend 409
    // — « pas encore », pas 500 « casse ». La difference compte : l'ecran
    // doit reproposer, pas afficher une erreur.
    return NextResponse.json(
      finale
        ? { error: 'document illisible' }
        : { error: "l'application n'est pas encore montrable ; reessayez dans un instant" },
      { status: finale ? 500 : 409 },
    )
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
    // LOT 7 — UNE LIVRAISON PARTIELLE LE DIT DANS SA NOTE. La taire serait
    // pire que l'attente : quelqu'un publierait une application a moitie
    // ecrite en croyant la tenir entiere.
    fichiers.set('LISEZ-MOI.md', noteDeLivraison(lu.data, reserves, { partielle: !finale }))

    const archive = zipper(fichiers)
    return new Response(new Uint8Array(archive), {
      headers: {
        'Content-Type': 'application/zip',
        // Le nom du fichier DIT la cible : deux zips du meme projet dans un
        // dossier de telechargements ne doivent pas se confondre.
        // LOT 7 — LE NOM DIT L'ETAT. Un partiel et un final dans le meme
        // dossier de telechargements ne doivent pas se confondre : c'est le
        // partiel qu'on risque de publier par erreur.
        'Content-Disposition': `attachment; filename="${lu.data.app.slug}-${cible}${finale ? '' : '-PARTIEL'}.zip"`,
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
