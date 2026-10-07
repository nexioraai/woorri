/**
 * LE GÉNÉRATEUR D'APPLICATIONS — PRODUIT À PART ENTIÈRE.
 *
 * ── POURQUOI CETTE ROUTE EXISTE À CÔTÉ DE `/api/app/generer`.
 *
 * La première version du branchement passait par l'éditeur d'une BOUTIQUE. Le
 * propriétaire l'a repris, et il avait raison : une boutique de marchand n'a
 * rien à voir avec le générateur. Celui-ci a produit `tontine`, qui n'est la
 * boutique de personne — c'est sa valeur, et la faire entrer par la porte d'un
 * commerce la réduisait à un gadget de marchand.
 *
 * Cette route-ci ne demande PAS de boutique. Elle demande une personne
 * connectée et une description. N'importe qui peut générer.
 *
 * ── CE QU'ELLE NE FAIT PAS ENCORE, ET POURQUOI.
 *
 * Elle ne GARDE rien. Il n'existe aucune table de projets, et aucun mécanisme
 * de migration dans ce dépôt — en créer une exige une décision et un accès que
 * cette route n'a pas. On livre donc l'application tout de suite, sans
 * historique. C'est une limite réelle, pas un oubli : un utilisateur qui
 * reviendra demain ne retrouvera pas sa génération.
 */
import { NextResponse } from 'next/server'
import { compileWeb } from '@deribfy/compiler'
import { projectAirSchema } from '@deribfy/air-schema'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { documentDeLaBoutique } from '@/lib/apps/document'
import { zipper } from '@/lib/apps/zip'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Bornes de saisie. Une description libre n'est pas une porte ouverte. */
const NOM_MAX = 60
const DESC_MAX = 200
const ELEMENTS_MAX = 200

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as {
    nom?: unknown
    description?: unknown
    elements?: unknown
  } | null
  if (corps === null) {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const nom = typeof corps.nom === 'string' ? corps.nom.trim() : ''
  if (nom === '') {
    return NextResponse.json({ error: 'Donnez un nom à votre application.' }, { status: 400 })
  }
  if (nom.length > NOM_MAX) {
    return NextResponse.json(
      { error: `Le nom dépasse ${String(NOM_MAX)} caractères.` },
      { status: 400 },
    )
  }
  const description =
    typeof corps.description === 'string' && corps.description.trim() !== ''
      ? corps.description.trim().slice(0, DESC_MAX)
      : null
  const elements =
    typeof corps.elements === 'number' && Number.isFinite(corps.elements)
      ? Math.max(0, Math.min(ELEMENTS_MAX, Math.round(corps.elements)))
      : 6

  const air = documentDeLaBoutique({
    // L'identité technique vient du NOM saisi. `document.ts` l'assainit —
    // un nom avec un point, un chiffre en tête ou deux cents caractères ne
    // doit pas produire un document invalide, et des tests le tiennent.
    slug: nom,
    nom,
    couleur: null,
    description,
    nombreArticles: elements,
  })

  // Le schéma STRICT, pas seulement le contrôle sémantique : celui-ci rendait
  // « 0 erreur » sur un document que le premier refusait.
  const juge = projectAirSchema.safeParse(air)
  if (!juge.success) {
    return NextResponse.json(
      {
        error: 'Cette description ne produit pas un document valide.',
        details: juge.error.issues.slice(0, 5).map((i) => `${i.path.join('.')} : ${i.message}`),
      },
      { status: 422 },
    )
  }

  try {
    const projet = compileWeb(juge.data)
    const fichiers = new Map<string, string | Buffer>(projet.files)
    fichiers.set('LISEZ-MOI.txt', lisezMoi(nom, elements))
    const archive = zipper(fichiers)
    return new Response(new Uint8Array(archive), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${juge.data.app.slug}-app-web.zip"`,
        'Content-Length': String(archive.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Compilation impossible.' },
      { status: 500 },
    )
  }
}

function lisezMoi(nom: string, elements: number): string {
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
    '── CE QUE VOUS VERREZ, ET POURQUOI',
    '',
    `Votre application affiche ${String(elements)} élément(s) d’aperçu.`,
    '',
    'Ce n’est pas un oubli : le format qui décrit votre application transporte',
    'sa STRUCTURE, jamais ses données. Y brancher une vraie source demande un',
    'serveur, et ce chemin existe — il n’est pas encore relié ici.',
    '',
  ].join('\n')
}
