/**
 * PRODUIRE L'APPLICATION — LE SECOND TEMPS DE LA CONVERSATION.
 *
 * Séparée de la compréhension parce que ce sont deux gestes : l'utilisateur
 * lit ce qu'on a compris, PUIS décide. Fondre les deux reviendrait à générer
 * avant d'avoir été corrigé.
 *
 * Elle rend une archive. L'aperçu vivant — voir l'application sans rien
 * télécharger — demande un chemin de build qui n'existe pas encore ; c'est
 * une décision d'architecture et de coût, et elle n'est pas prise.
 */
import { NextResponse } from 'next/server'
import { compileWeb } from '@deribfy/compiler'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { documentPour, documentFourni } from '@/lib/apps/pour'
import { premiereIntention } from '@/lib/apps/dialogue'
import { zipper } from '@/lib/apps/zip'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as { demande?: unknown } | null
  const demande = typeof corps?.demande === 'string' ? corps.demande.trim() : ''
  if (demande === '') {
    return NextResponse.json({ error: 'Dites ce que vous voulez construire.' }, { status: 400 })
  }

  // Le document vient du navigateur s'il a été compris juste avant ; sinon on
  // relit. Dans les deux cas il est VALIDE : `documentFourni` passe par le
  // schéma strict, et `documentPour` aussi.
  const fourni = documentFourni((corps as { document?: unknown }).document)
  const r =
    fourni === null
      ? await documentPour(await premiereIntention(demande))
      : { document: fourni, compris: [], parIA: false }
  if ('erreur' in r) return NextResponse.json({ error: r.erreur }, { status: 422 })
  // MEME INTERDIT QUE L'APERCU : une archive construite sur une comprehension
  // incomplete est pire qu'un refus — elle part sur le disque de quelqu'un.
  if ('questions' in r) {
    return NextResponse.json(
      { error: 'Des questions restent ouvertes : repondez-y avant de telecharger.', questions: r.questions },
      { status: 409 },
    )
  }

  try {
    const projet = compileWeb(r.document)
    const fichiers = new Map<string, string | Buffer>(projet.files)
    fichiers.set('LISEZ-MOI.txt', lisezMoi(r.document.app.name, r.compris))
    const archive = zipper(fichiers)
    return new Response(new Uint8Array(archive), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${r.document.app.slug}.zip"`,
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

/** La note qui part avec l'application — elle redit ce qui a été compris. */
function lisezMoi(nom: string, compris: string[]): string {
  return [
    `APPLICATION WEB — ${nom}`,
    '',
    'Générée par Deribfy. Pour la lancer :',
    '',
    '    npm install',
    '    npm run dev',
    '',
    'Pour la publier :  npm run build  — le dossier `dist/` se dépose chez',
    'n’importe quel hébergeur de fichiers.',
    '',
    '── CE QUI A ÉTÉ COMPRIS DE VOTRE DEMANDE',
    '',
    ...compris.map((c) => `  · ${c}`),
    '',
    '── CE QUE VOUS VERREZ',
    '',
    'Les éléments affichés sont des éléments d’aperçu. Le format qui décrit',
    'une application transporte sa structure, jamais vos données.',
    '',
  ].join('\n')
}
