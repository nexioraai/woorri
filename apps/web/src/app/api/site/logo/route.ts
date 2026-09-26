import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { requireSiteOwner } from '@/lib/auth/require-site-owner'

// ============================================================
// LE MARCHAND DÉPOSE SON LOGO.
//
// ── POURQUOI UNE ROUTE À PART, ET NON `/api/images/upload`.
//
// La route des photos de produit fait exactement ce qu'il NE FAUT PAS faire à
// un logo : recadrage intelligent, correction d'exposition, balance des
// blancs, accentuation, puis sortie en WebP/AVIF/JPG. Sur une photo d'article
// c'est un service ; sur un logo, c'est une dégradation — un logo détouré
// ressortirait aplati sur du blanc, et un logo large serait rogné en son
// milieu.
//
// Un logo veut le traitement inverse : ON N'Y TOUCHE PAS. On vérifie, on
// nettoie les métadonnées, on garde le format et la transparence.
//
// ── CE QU'ON RETIRE QUAND MÊME : LES MÉTADONNÉES.
//
// Même défaut que les photos produit : un logo exporté depuis un téléphone
// peut porter des coordonnées GPS. `.rotate()` applique l'orientation EXIF
// puis la neutralise, et l'encodage de sortie ne réécrit aucun bloc EXIF.
//
// ── SVG REFUSÉ, ET CE N'EST PAS UN OUBLI.
//
// Un SVG est un document exécutable : servi depuis notre domaine de stockage,
// il peut porter du script. Accepter un SVG déposé par un tiers, c'est offrir
// un XSS stocké. Les formats matriciels ne posent pas ce problème.
// ============================================================

export const runtime = 'nodejs'

/** Formats acceptés. Liste FERMÉE — voir la note sur le SVG ci-dessus. */
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

/** Un logo est un petit fichier. Au-delà, c'est une photo déposée par erreur. */
const TAILLE_MAX = 5 * 1024 * 1024

/**
 * En deçà, l'icône sera floue à 192 px (écran d'accueil Android) et le logo
 * baveux dans l'en-tête. On REFUSE plutôt que de livrer une marque sale.
 */
const COTE_MIN = 128

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) {
    return NextResponse.json({ error: 'Stockage non configuré.' }, { status: 503 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })

  const slug = formData.get('slug')
  const fichier = formData.get('file')
  if (typeof slug !== 'string' || slug.trim() === '') {
    return NextResponse.json({ error: 'Site manquant.' }, { status: 400 })
  }
  if (!(fichier instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier.' }, { status: 400 })
  }

  // ── PROPRIÉTÉ D'ABORD, AVANT DE LIRE LE MOINDRE OCTET.
  //
  // DÉFAUT QUE J'AI ÉCRIT ET QUE J'AI TROUVÉ EN ME RELISANT : cette route
  // n'avait AUCUNE garde. Elle prenait le `slug` du formulaire et écrivait
  // dans le stockage avec la CLÉ DE SERVICE. N'importe qui sur Internet
  // pouvait donc déposer des fichiers dans le dossier de n'importe quel
  // marchand, sans compte, sans limite, et les servir depuis notre domaine.
  //
  // Elle ne permettait pas de CHANGER le logo d'un marchand — écrire
  // `logo_url` passe par `updateOwnedSite`, filtré par propriétaire, et par
  // un GRANT colonne par colonne. Mais un dépôt de fichiers non
  // authentifié reste un dépôt de fichiers non authentifié : volume porté
  // par le compte du marchand, et hébergement d'images arbitraires sous
  // notre nom.
  //
  // `/api/images/upload`, la route des photos de produit, portait cette
  // garde depuis le début — et son commentaire dit exactement pourquoi. Je
  // l'avais sous les yeux en écrivant celle-ci.
  const garde = await requireSiteOwner(req, slug, 'id, slug')
  if (!garde.ok) return garde.response
  if (fichier.size > TAILLE_MAX) {
    return NextResponse.json(
      { error: 'Logo trop lourd (5 Mo maximum). Exportez-le en PNG à 512 px.' },
      { status: 413 },
    )
  }
  if (!TYPES.has(fichier.type)) {
    return NextResponse.json(
      { error: 'Format non accepté. Utilisez un PNG (de préférence à fond transparent), un JPG ou un WebP.' },
      { status: 415 },
    )
  }

  const entree = Buffer.from(await fichier.arrayBuffer())

  let meta
  try {
    meta = await sharp(entree).metadata()
  } catch {
    return NextResponse.json({ error: 'Fichier illisible comme image.' }, { status: 415 })
  }

  const largeur = meta.width ?? 0
  const hauteur = meta.height ?? 0
  if (largeur < COTE_MIN || hauteur < COTE_MIN) {
    return NextResponse.json(
      {
        error:
          `Logo trop petit (${String(largeur)}×${String(hauteur)} px). ` +
          `Il en faut au moins ${String(COTE_MIN)} px de côté, sinon il sera flou ` +
          `dans les onglets et sur les téléphones.`,
      },
      { status: 422 },
    )
  }

  // LE FORMAT D'ENTRÉE SURVIT, donc la transparence aussi. Sans cette
  // distinction, tout ressortirait en JPEG et chaque logo détouré serait ruiné.
  const gpsRetire = meta.exif !== undefined
  const base = sharp(entree, { failOn: 'none' }).rotate().keepIccProfile()
  let donnees: Buffer
  let type: string
  if (meta.format === 'png') {
    donnees = await base.png({ compressionLevel: 9 }).toBuffer()
    type = 'image/png'
  } else if (meta.format === 'webp') {
    donnees = await base.webp({ quality: 95 }).toBuffer()
    type = 'image/webp'
  } else {
    donnees = await base.jpeg({ quality: 95 }).toBuffer()
    type = 'image/jpeg'
  }

  const extension = type.split('/')[1]!.replace('jpeg', 'jpg')
  const chemin = `${slug}/logo-${String(Date.now())}.${extension}`

  const client = createClient(url, cle)
  const { error } = await client.storage
    .from('site-images')
    .upload(chemin, donnees, { contentType: type, cacheControl: '31536000', upsert: false })
  if (error) {
    return NextResponse.json({ error: `Dépôt impossible : ${error.message}` }, { status: 502 })
  }

  const { data } = client.storage.from('site-images').getPublicUrl(chemin)

  // AVERTIR SANS BLOQUER. Un logo très allongé rentrera dans le carré du
  // favicon avec de grandes marges : il sera minuscule. C'est le choix du
  // marchand — on le dit, on ne le refuse pas.
  const rapport = largeur / hauteur
  const avertissements: { code: string; message: string }[] = []
  if (rapport > 2.5 || rapport < 0.4) {
    avertissements.push({
      code: 'tres_allonge',
      message:
        'Ce logo est très allongé. Dans les onglets et les résultats Google, ' +
        'l’icône est carrée : il y paraîtra petit. Un logo carré ou un ' +
        'symbole seul y sera bien plus lisible.',
    })
  }
  if (Math.min(largeur, hauteur) < 256) {
    avertissements.push({
      code: 'definition_juste',
      message:
        'Définition un peu juste pour l’écran d’accueil d’un téléphone (192 px). ' +
        'Un export à 512 px serait plus net.',
    })
  }

  return NextResponse.json({
    url: data.publicUrl,
    largeur,
    hauteur,
    transparent: meta.hasAlpha === true,
    // PREUVE, pas promesse : ce champ dit ce que le fichier PORTAIT.
    gpsRetire,
    avertissements,
  })
}
