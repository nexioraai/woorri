/**
 * LE LOT QUI REND PRO LES PHOTOS DE TOUTES LES BOUTIQUES.
 *
 * Le bouton « Rendre pro » ne règle que la photo qu'un marchand pense à
 * cliquer. Or le défaut est DÉJÀ EN LIGNE, sur des boutiques dont les
 * propriétaires ne liront jamais une note de version. Traiter une boutique à
 * la main, c'est maquiller la vitrine qu'on regarde et laisser les autres.
 *
 * Ce lot passe sur TOUTES les boutiques. Il est conçu autour de trois
 * exigences, dans cet ordre :
 *
 *  ① ON NE CACHE RIEN. La réponse énumère chaque photo examinée, boutique par
 *    boutique, avec le motif exact d'un refus. Un lot qui ne rend qu'un
 *    compteur permet à un échec de passer pour une abstention.
 *  ② ON NE TRAITE JAMAIS DEUX FOIS. Chaque photo traitée laisse une fiche
 *    dans le stockage, nommée d'après l'empreinte de son URL d'origine. Tant
 *    qu'elle existe, la photo est sautée. C'est un REGISTRE, pas une
 *    statistique : une devinette sur l'image ne peut pas tenir cette garantie,
 *    puisqu'une photo déjà traitée ressemble à une photo réussie.
 *  ③ L'ORIGINAL SURVIT. On ne supprime aucun fichier. La fiche conserve l'URL
 *    de départ, donc tout est réversible, photo par photo.
 *
 * Et par défaut IL N'ÉCRIT RIEN : sans `?reel=1`, il regarde, décide, et
 * rapporte. On lit le rapport avant d'autoriser la moindre écriture.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { detourer, verdict, type Modele } from '@/lib/images/detourage'
import { poser } from '@/lib/images/ombre'
import { modeleDetourage } from '@/lib/images/modele'

export const maxDuration = 300
// Le modèle et `sharp` sont des binaires : ce chemin n'est pas un chemin Edge.
export const runtime = 'nodejs'

const SEAU = 'site-images'
const REGISTRE = 'photos-pro'


/** L'empreinte d'une URL source. C'est la clé du registre. */
const empreinte = (url: string): string =>
  createHash('sha256').update(url).digest('hex').slice(0, 32)

type Examen = {
  readonly site: string
  readonly produit: string
  readonly source: string
  readonly etat: 'traitée' | 'déjà traitée' | 'refusée' | 'erreur'
  readonly motif: string
  readonly remplacee?: string
}

export async function GET(req: NextRequest) {
  // Fail-closed, comme les autres crons : un secret absent REFUSE, il ne
  // désactive pas la garde.
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const p = req.nextUrl.searchParams
  const reel = p.get('reel') === '1'
  const limite = Math.min(400, Math.max(1, Number(p.get('limite') ?? 60)))
  const unSite = p.get('site')

  // Toutes les boutiques, ou une seule quand on veut observer. Le DÉFAUT est
  // « toutes » : l'inverse rendrait trop facile de ne regarder que la vitrine
  // qui va bien.
  let q = supabaseAdmin.from('sites').select('id, slug').eq('published', true)
  if (unSite !== null) q = q.eq('slug', unSite)
  const { data: sites, error: eSites } = await q
  if (eSites) return NextResponse.json({ error: eSites.message }, { status: 500 })
  if (!sites || sites.length === 0) {
    return NextResponse.json({ message: 'aucune boutique publiée', examens: [] })
  }

  // Résolu UNE FOIS, avant la boucle : si le modèle manque, le lot doit le
  // dire franchement au lieu d'empiler cent erreurs identiques.
  let m: Modele
  try {
    m = await modeleDetourage(req.nextUrl.origin)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    )
  }

  const examens: Examen[] = []
  const ratees: string[] = []
  /** Budget de TRAVAIL, pas de résultats : un refus coûte le même détourage
   *  qu'une réussite. Une photo déjà au registre, elle, ne coûte rien. */
  let travaux = 0

  for (const site of sites) {
    const { data: produits } = await supabaseAdmin
      .from('shop_products')
      .select('id, name, images')
      .eq('site_id', site.id)
    if (!produits) continue

    for (const produit of produits) {
      const images: string[] = Array.isArray(produit.images) ? produit.images : []
      if (images.length === 0) continue

      // On remplace EN PLACE dans la liste : l'ordre des photos d'une fiche
      // est une décision du marchand, le lot n'a pas à la réécrire.
      const apres = [...images]
      let changee = false
      /** Fiches en attente : gravées seulement si le catalogue accepte. */
      const fiches: { cle: string; corps: Record<string, unknown> }[] = []

      for (let i = 0; i < apres.length; i += 1) {
        if (travaux >= limite) break
        const source = apres[i]!
        const cle = `${REGISTRE}/${empreinte(source)}`
        const commun = { site: site.slug as string, produit: String(produit.name), source }

        // ② LE REGISTRE, LU AVANT TOUT TRAVAIL.
        const { data: fiche } = await supabaseAdmin.storage.from(SEAU).download(`${cle}.json`)
        if (fiche) {
          examens.push({ ...commun, etat: 'déjà traitée', motif: 'fiche présente au registre' })
          continue
        }

        try {
          const rep = await fetch(source)
          if (!rep.ok) {
            examens.push({ ...commun, etat: 'erreur', motif: `téléchargement ${rep.status}` })
            continue
          }
          const brut = Buffer.from(await rep.arrayBuffer())

          const d = await detourer(brut, m)
          const v = verdict(d)
          travaux += 1
          if (!v.traiter || d === null) {
            examens.push({ ...commun, etat: 'refusée', motif: v.motif })
            continue
          }

          const pose = await poser(d.sujet)
          if (!reel) {
            examens.push({ ...commun, etat: 'traitée', motif: `${v.motif} · BLANC, rien écrit` })
            continue
          }

          const { error: eUp } = await supabaseAdmin.storage
            .from(SEAU)
            .upload(`${cle}.jpg`, pose.donnees, {
              contentType: 'image/jpeg',
              cacheControl: '31536000',
              upsert: true,
            })
          if (eUp) {
            examens.push({ ...commun, etat: 'erreur', motif: `dépôt : ${eUp.message}` })
            continue
          }
          const url = supabaseAdmin.storage.from(SEAU).getPublicUrl(`${cle}.jpg`).data.publicUrl

          // ③ LA FICHE N'EST PAS ÉCRITE ICI. Elle attend que le CATALOGUE ait
          //    réellement reçu la nouvelle URL.
          //
          //    L'ordre naïf — photo, fiche, puis catalogue — ouvre un trou :
          //    si la mise à jour du catalogue échoue, la fiche existe déjà, la
          //    photo est réputée traitée, et la boutique ne la verra JAMAIS.
          //    Le lot se croirait fini sur une correction jamais arrivée à
          //    l'écran, ce qui est précisément la tromperie à éviter.
          fiches.push({
            cle,
            corps: {
              source,
              resultat: url,
              site: site.slug as string,
              produit: produit.id as string,
              appliquees: pose.appliquees,
            },
          })
          apres[i] = url
          changee = true
          examens.push({ ...commun, etat: 'traitée', motif: v.motif, remplacee: url })
        } catch (e) {
          examens.push({
            ...commun,
            etat: 'erreur',
            motif: e instanceof Error ? e.message : String(e),
          })
        }
      }

      if (changee && reel) {
        const { error: eMaj } = await supabaseAdmin
          .from('shop_products')
          .update({ images: apres })
          .eq('id', produit.id)
        if (eMaj) {
          // Rien n'est inscrit au registre : les photos seront reprises au
          // prochain passage. Le dépôt déjà fait sera simplement réécrit.
          for (const ex of examens) {
            if (ex.produit === String(produit.name) && ex.etat === 'traitée') {
              ratees.push(`${ex.source} — catalogue non mis à jour : ${eMaj.message}`)
            }
          }
        } else {
          // LE CATALOGUE A REÇU LA CORRECTION : le registre peut la graver.
          for (const fi of fiches) {
            await supabaseAdmin.storage
              .from(SEAU)
              .upload(`${fi.cle}.json`, Buffer.from(JSON.stringify(fi.corps)), {
                contentType: 'application/json',
                upsert: true,
              })
          }
        }
      }
      fiches.length = 0
      if (travaux >= limite) break
    }
    if (travaux >= limite) break
  }

  const compte = (e: Examen['etat']): number => examens.filter((x) => x.etat === e).length
  return NextResponse.json({
    mode: reel ? 'RÉEL — le catalogue a été modifié' : 'BLANC — rien n’a été écrit',
    boutiques: sites.length,
    examinees: examens.length,
    traitees: compte('traitée'),
    refusees: compte('refusée'),
    deja: compte('déjà traitée'),
    erreurs: compte('erreur'),
    // Photos traitées ET déposées dont le catalogue n'a PAS voulu. Elles
    // repasseront ; ce champ existe pour qu'on ne les croie pas faites.
    ratees,
    // ① Le détail, jamais seulement le compteur.
    examens,
  })
}
