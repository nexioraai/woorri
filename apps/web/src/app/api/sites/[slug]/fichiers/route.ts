import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { nomPropre } from '@/lib/fichiers/nomPropre'
import { lireEnvoi, autoriserDepot } from '@/lib/fichiers/depotDirect'
import { cleDuFichier, emploisDansLeSite, emploisDansLesPages, messageEmploye } from '@/lib/fichiers/emploisDuFichier'

// ============================================================
// LOT 5 -- LES FICHIERS D'UN SITE.
//
// ── LE DEFAUT QU'ELLE FERME. Le bloc « documents » n'affichait que des liens
// vers des URL. Sur /fournisseurs/documents, les quatre liens ne menaient
// nulle part : il n'existait AUCUN endroit ou deposer un fichier. Promettre
// un telechargement qu'on ne peut pas livrer, c'est la meme classe que
// l'ancien bloc « pages » qui promettait une page sans adresse.
//
// ── UNE SEULE PORTE. Comme pour les pages : aucune ecriture n'est accordee
// dans le compartiment -- mesure, anon depose -> refuse. Seul le role de
// service ecrit, et seulement apres que `requireSiteOwner` a dit oui.
//
// ── LE CHEMIN N'EST JAMAIS LU DU CORPS DE LA REQUETE.
// Il est CONSTRUIT ici a partir de l'`id` rendu par la garde. Un chemin
// accepte du client permettrait de deposer -- ou d'ecraser -- un fichier
// chez un AUTRE locataire avec une session parfaitement legitime.
//
// ── LES PLAFONDS NE SONT PAS RECOPIES. 25 Mio et la liste fermee des types
// vivent dans `storage.buckets`. Cette route laisse le stockage refuser et
// traduit son message : recopier les bornes creerait une seconde verite qui
// divergerait au premier ajout de type.
// ============================================================

type Params = { params: Promise<{ slug: string }> }

/** Les dossiers autorises. Liste BLANCHE : un dossier libre deviendrait un
 *  chemin libre, et le cloisonnement ne tiendrait plus qu'a la politesse. */
const DOSSIERS = ['documents', 'photos', 'appels-offres'] as const
type Dossier = (typeof DOSSIERS)[number]

const COMPARTIMENT = 'site-fichiers'

/**
 * Rend un nom de fichier sur : minuscules, chiffres, tirets, un seul point.
 *
 * Ce n'est PAS une validation de securite -- le chemin est de toute facon
 * construit serveur. C'est une hygiene d'adresse : un nom accentue ou espace
 * produit une URL illisible que personne ne peut recopier dans un courriel.
 */

/** GET -- la liste des fichiers d'un dossier du site. */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  const dossier = new URL(req.url).searchParams.get('dossier') ?? 'documents'
  if (!(DOSSIERS as readonly string[]).includes(dossier)) {
    return NextResponse.json({ error: 'Dossier inconnu.' }, { status: 400 })
  }

  const prefixe = `sites/${garde.site.id}/${dossier}`
  const { data, error } = await supabaseAdmin.storage.from(COMPARTIMENT).list(prefixe, { limit: 200 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const fichiers = (data ?? [])
    .filter((o) => o.name && o.id)   // un « dossier » virtuel n'a pas d'id
    .map((o) => ({
      nom: o.name,
      taille: (o.metadata as { size?: number } | null)?.size ?? null,
      type: (o.metadata as { mimetype?: string } | null)?.mimetype ?? null,
      maj: o.updated_at ?? null,
      url: supabaseAdmin.storage.from(COMPARTIMENT).getPublicUrl(`${prefixe}/${o.name}`).data.publicUrl,
    }))
  return NextResponse.json({ fichiers })
}

/** POST -- deposer un fichier. Le chemin est construit ici, jamais recu. */
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  // Multipart (≤ 4 Mo) OU JSON (dépôt direct d'un fichier lourd) — voir
  // `depotDirect.ts`. Le chemin reste CONSTRUIT ici dans les deux cas.
  const envoi = await lireEnvoi(req)
  if (!envoi) return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 })

  const fichier = envoi.fichier
  const dossier = (envoi.champ('dossier') ?? 'documents') as Dossier
  if (!envoi.direct && (!fichier || fichier.size === 0)) {
    return NextResponse.json({ error: 'Aucun fichier recu.' }, { status: 400 })
  }
  if (!(DOSSIERS as readonly string[]).includes(dossier)) {
    return NextResponse.json({ error: 'Dossier inconnu.' }, { status: 400 })
  }

  const nomRecu = envoi.direct ? (envoi.champ('nomFichier') ?? '').trim() : (fichier as File).name
  if (!nomRecu) return NextResponse.json({ error: 'Aucun fichier recu.' }, { status: 400 })
  const nom = nomPropre(nomRecu)
  const chemin = `sites/${garde.site.id}/${dossier}/${nom}`

  let error: { message: string } | null = null
  if (envoi.direct) {
    const etape = envoi.champ('etape')
    if (etape === 'preparer') {
      const a = await autoriserDepot(COMPARTIMENT, chemin, true)
      if ('erreur' in a) return NextResponse.json({ error: a.erreur }, { status: 500 })
      return NextResponse.json(a, { status: 200 })
    }
    if (etape !== 'confirmer') return NextResponse.json({ error: 'Étape inconnue.' }, { status: 400 })
    // À la confirmation, le chemin est RECALCULÉ depuis le nom : celui que le
    // client renverrait n'est jamais lu.
  } else {
    const f = fichier as File
    ;({ error } = await supabaseAdmin.storage.from(COMPARTIMENT)
      .upload(chemin, f, { contentType: f.type || undefined, upsert: true }))
  }

  if (error) {
    // Le stockage refuse sur le TYPE et sur la TAILLE. On traduit son message
    // plutot que de recopier ses bornes -- sinon deux verites, et celle qu'on
    // lit n'est pas celle qui decide.
    const m = error.message.toLowerCase()
    const lisible =
      m.includes('mime') || m.includes('type')
        ? 'Ce type de fichier n’est pas accepte. Formats admis : PDF, Word, Excel, CSV, JPEG, PNG, WebP, AVIF.'
        : m.includes('size') || m.includes('large')
          ? 'Fichier trop lourd. La limite est de 25 Mo.'
          : error.message
    return NextResponse.json({ error: lisible }, { status: 400 })
  }

  // RELECTURE. Annoncer un depot sans le relire, c'est annoncer un resultat
  // qu'on n'a pas mesure -- on l'a deja paye sur la suppression des pages.
  const { data: relu } = await supabaseAdmin.storage.from(COMPARTIMENT)
    .list(`sites/${garde.site.id}/${dossier}`, { search: nom, limit: 1 })
  if (!relu?.length) return NextResponse.json({ error: 'Depot non confirme.' }, { status: 500 })

  return NextResponse.json({
    nom,
    url: supabaseAdmin.storage.from(COMPARTIMENT).getPublicUrl(chemin).data.publicUrl,
    taille: (relu[0].metadata as { size?: number } | null)?.size ?? null,
  }, { status: 201 })
}

/** DELETE -- retirer un fichier. Present des le PREMIER jour (GEN-D044). */
export async function DELETE(req: Request, { params }: Params) {
  const { slug } = await params
  const garde = await requireSiteOwner(req, slug)
  if ('response' in garde) return garde.response

  const u = new URL(req.url)
  const dossier = u.searchParams.get('dossier') ?? 'documents'
  const nom = u.searchParams.get('nom') ?? ''
  if (!(DOSSIERS as readonly string[]).includes(dossier)) {
    return NextResponse.json({ error: 'Dossier inconnu.' }, { status: 400 })
  }
  // Le nom est re-nettoye : un `..` recu ici ne doit pas pouvoir remonter
  // d'un cran, meme si le prefixe est construit serveur.
  const propre = nomPropre(nom)
  if (!nom || propre !== nom) return NextResponse.json({ error: 'Nom de fichier invalide.' }, { status: 400 })

  const chemin = cleDuFichier(garde.site.id, dossier, nom)

  // UN FICHIER EMPLOYÉ NE SE RETIRE PAS (voir `emploisDuFichier`). On lit la
  // ligne du site et ses pages ; une lecture qui échoue REFUSE le retrait —
  // dans le doute, garder un fichier coûte moins qu'une case vide en ligne.
  const [lSite, lPages] = await Promise.all([
    supabaseAdmin.from('sites').select('*').eq('id', garde.site.id).maybeSingle(),
    supabaseAdmin.from('site_pages').select('*').eq('site_id', garde.site.id),
  ])
  if (lSite.error || lPages.error) {
    return NextResponse.json({ error: 'Vérification impossible : le fichier est conservé.' }, { status: 500 })
  }
  const emplois = [
    ...emploisDansLeSite(lSite.data as Record<string, unknown> | null, chemin),
    ...emploisDansLesPages(lPages.data as never, chemin),
  ]
  if (emplois.length > 0) {
    return NextResponse.json({ error: messageEmploye(emplois), emplois }, { status: 409 })
  }

  const { error } = await supabaseAdmin.storage.from(COMPARTIMENT).remove([chemin])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // RELECTURE du retrait, pas une confiance dans l'absence d'erreur.
  const { data: reste } = await supabaseAdmin.storage.from(COMPARTIMENT)
    .list(`sites/${garde.site.id}/${dossier}`, { search: nom, limit: 1 })
  if (reste?.length) return NextResponse.json({ error: 'Retrait non confirme.' }, { status: 500 })

  return NextResponse.json({ retire: nom })
}
