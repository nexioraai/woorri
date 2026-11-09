import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { nomPropre } from '@/lib/fichiers/nomPropre'

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

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'Envoi illisible.' }, { status: 400 }) }

  const fichier = form.get('fichier')
  const dossier = String(form.get('dossier') ?? 'documents') as Dossier
  if (!(fichier instanceof File) || fichier.size === 0) {
    return NextResponse.json({ error: 'Aucun fichier recu.' }, { status: 400 })
  }
  if (!(DOSSIERS as readonly string[]).includes(dossier)) {
    return NextResponse.json({ error: 'Dossier inconnu.' }, { status: 400 })
  }

  const nom = nomPropre(fichier.name)
  const chemin = `sites/${garde.site.id}/${dossier}/${nom}`

  const { error } = await supabaseAdmin.storage.from(COMPARTIMENT)
    .upload(chemin, fichier, { contentType: fichier.type || undefined, upsert: true })

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

  const chemin = `sites/${garde.site.id}/${dossier}/${nom}`
  const { error } = await supabaseAdmin.storage.from(COMPARTIMENT).remove([chemin])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // RELECTURE du retrait, pas une confiance dans l'absence d'erreur.
  const { data: reste } = await supabaseAdmin.storage.from(COMPARTIMENT)
    .list(`sites/${garde.site.id}/${dossier}`, { search: nom, limit: 1 })
  if (reste?.length) return NextResponse.json({ error: 'Retrait non confirme.' }, { status: 500 })

  return NextResponse.json({ retire: nom })
}
