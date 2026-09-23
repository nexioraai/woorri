import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  TAILLE_MAX,
  TYPES_ACCEPTES,
  analyser,
  apercuFlou,
  avertissements,
  flou,
  produireVariantes,
  redresser,
} from '@/lib/images/traitement'

// ============================================================
// ENVOI D'UNE PHOTO DE PRODUIT — traitée, nettoyée, déclinée.
//
// CE QUE FAISAIT L'ANCIEN CHEMIN, et pourquoi il fallait le remplacer :
// `ProductManager.tsx` envoyait le fichier BRUT dans Supabase Storage, depuis
// le navigateur. Conséquences, toutes réelles :
//   · une photo de 8 Mo prise au téléphone était servie telle quelle à des
//     visiteurs en 3G — la fiche ne s'affichait pas ;
//   · l'orientation EXIF n'était pas appliquée : les photos prises en portrait
//     s'affichaient couchées partout où l'EXIF n'est pas honoré ;
//   · les MÉTADONNÉES PARTAIENT AVEC. Une photo d'iPhone porte les coordonnées
//     GPS du lieu de prise de vue — c'est-à-dire, très souvent, le domicile du
//     marchand. Publié, en clair, pour qui télécharge l'image.
//
// Le troisième point à lui seul justifie cette route : ce n'était pas un défaut
// de performance, c'était une fuite de données personnelles.
//
// `sharp` / libvips, aucun service tiers, aucun modèle.
// ============================================================

// `sharp` est un binaire natif : exécution Node, jamais Edge.
export const runtime = 'nodejs'
// Traiter une photo de 12 Mo en trois formats prend du temps. Le défaut de 10 s
// coupait l'envoi au milieu et le marchand voyait « échec » sans raison.
export const maxDuration = 60

const SEAU = 'site-images'

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })

  const slug = formData.get('slug')
  const fichier = formData.get('file')

  if (typeof slug !== 'string' || !slug) {
    return NextResponse.json({ error: 'Site manquant.' }, { status: 400 })
  }
  if (!(fichier instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier.' }, { status: 400 })
  }

  // PROPRIÉTÉ D'ABORD, avant de lire le moindre octet : sans cette garde,
  // n'importe qui pourrait déposer des fichiers dans le stockage d'un autre
  // marchand — et faire porter le volume à son compte.
  const garde = await requireSiteOwner(req, slug, 'id, slug')
  if (!garde.ok) return garde.response

  if (fichier.size > TAILLE_MAX) {
    return NextResponse.json(
      {
        error:
          `Photo trop lourde (${(fichier.size / 1024 / 1024).toFixed(1)} Mo). ` +
          `Maximum ${String(TAILLE_MAX / 1024 / 1024)} Mo.`,
      },
      { status: 413 },
    )
  }
  if (!(TYPES_ACCEPTES as readonly string[]).includes(fichier.type)) {
    return NextResponse.json(
      { error: `Format non accepté (${fichier.type || 'inconnu'}). JPG, PNG, WebP ou HEIC.` },
      { status: 415 },
    )
  }

  const entree = Buffer.from(await fichier.arrayBuffer())

  let analyse
  try {
    analyse = await analyser(entree)
  } catch {
    // Un fichier qui porte le bon type MIME sans être une image : refusé ici
    // plutôt que de faire échouer l'encodage plus loin, sans message utile.
    return NextResponse.json({ error: 'Fichier illisible comme image.' }, { status: 415 })
  }

  const dossier = `${slug}/products/${randomUUID()}`

  try {
    const [variantes, apercu, nettete] = await Promise.all([
      produireVariantes(entree),
      apercuFlou(entree),
      flou(entree),
    ])

    // L'ORIGINAL EST CONSERVÉ — redressé et débarrassé de ses métadonnées,
    // mais sans perte de définition. C'est lui qui servira de source si le
    // marchand refuse une amélioration, ou si les formats évoluent.
    const original = await redresser(entree).jpeg({ quality: 95 }).toBuffer()

    const deposer = async (chemin: string, donnees: Buffer, type: string) => {
      const { error } = await supabaseAdmin.storage
        .from(SEAU)
        .upload(chemin, donnees, { contentType: type, cacheControl: '31536000', upsert: false })
      if (error) throw new Error(error.message)
      return supabaseAdmin.storage.from(SEAU).getPublicUrl(chemin).data.publicUrl
    }

    const urlOriginal = await deposer(`${dossier}/original.jpg`, original, 'image/jpeg')
    const deposees = await Promise.all(
      variantes.map(async (v) => ({
        format: v.format,
        largeur: v.largeur,
        octets: v.octets,
        url: await deposer(
          `${dossier}/w${String(v.largeur)}.${v.format === 'jpeg' ? 'jpg' : v.format}`,
          v.donnees,
          `image/${v.format}`,
        ),
      })),
    )

    // Le conseil arrive APRÈS l'enregistrement, jamais à sa place : la photo
    // est publiée, et le marchand décide seul s'il la refait. Refuser son seul
    // visuel le laisserait sans boutique.
    const conseils = avertissements(analyse)
    if (nettete.floue) {
      conseils.push({
        code: 'floue',
        message:
          'La photo semble floue. Reprenez-la en posant le téléphone ou en appuyant ' +
          'sur l’écran pour faire la mise au point.',
      })
    }

    return NextResponse.json({
      url: urlOriginal,
      variantes: deposees,
      apercu,
      analyse: {
        largeur: analyse.largeur,
        hauteur: analyse.hauteur,
        octets: analyse.octets,
        // PREUVE, pas promesse : ce champ dit ce que l'image PORTAIT. S'il est
        // vrai, du GPS a été retiré — et l'interface peut le dire au marchand.
        gpsRetire: analyse.gps,
      },
      avertissements: conseils,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Traitement impossible.' },
      { status: 500 },
    )
  }
}
