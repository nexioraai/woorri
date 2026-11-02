/**
 * REVENIR À UNE VERSION — gratuit, additif, et lui-même annulable.
 *
 * ── POURQUOI CETTE ROUTE EXISTE (lot 1 de la modification, 2026-11-01).
 *
 * « Avant de laisser modifier, il faut pouvoir annuler. » Aujourd'hui une
 * application générée est imposée telle quelle : c'est le plus grand écart
 * avec les concurrents.
 *
 * ── TROIS PROPRIÉTÉS, ET CHACUNE VIENT D'UNE OBJECTION DU PROPRIÉTAIRE.
 *
 * ① AUCUN APPEL AU MODÈLE. Revenir RECOPIE un document déjà stocké. Rien
 *   n'est reconstruit, rien n'est repayé. Le bouton dira « gratuit ».
 *
 * ② LA VERSION S'AJOUTE, ELLE NE REMPLACE JAMAIS. Revenir au rang 3 écrit
 *   un rang n+1 portant le document du rang 3 — le rang 3 reste intact, et
 *   le retour est lui-même annulable. C'est ce qui rend sûr d'éprouver
 *   « régénérer » avant d'avoir éprouvé « revenir » : le pire cas est un
 *   clic de plus.
 *
 * ③ ON REVIENT À UNE VERSION CHOISIE, PAS « À LA PRÉCÉDENTE ». Un bouton
 *   « revenir » qui recopie le rang n−1 fait AVANCER l'utilisateur au
 *   deuxième clic : le second retour recopierait le contenu d'avant le
 *   premier. Personne ne comprendrait. La liste porte donc le geste, une
 *   ligne par version, avec sa date.
 *
 * ── CE QU'ELLE REFUSE, ET POURQUOI ELLE LE DIT.
 *
 * Une version de PIPELINE (celles du moteur AIR) ne porte pas de fichiers —
 * mesuré sur les dix lignes d'origine. Y revenir rendrait une œuvre vide.
 * La route refuse en le nommant, et l'écran ne propose même pas le geste.
 *
 * ── PROPRIÉTAIRE SEUL, et la restriction voyage DANS le filtre.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '@/lib/apps/journal'
import { estRestaurable, rangsAPurger, type VersionDocument } from '@/lib/apps/versions-oeuvre'

export const runtime = 'nodejs'

/**
 * LA LISTE DES VERSIONS — sans jamais lire les documents.
 *
 * `etat` pèse 57 à 75 Ko par version. Le sélectionner pour afficher une
 * liste de dates chargerait près d'un mégaoctet pour dix versions, à chaque
 * ouverture d'une carte. On ne lit donc que ce que la liste montre — plus
 * `forme`, qui dit si l'on peut y revenir.
 *
 * `restaurable` est CALCULÉ ICI et pas déduit par l'écran : une version de
 * pipeline ne porte pas de fichiers, et c'est au serveur de le savoir.
 */
export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const oeuvre = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('id')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (oeuvre.error !== null || oeuvre.data === null) {
    return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  }

  // `etat->>forme` : la seule part de la colonne lourde qu'on lit, et c'est
  // une chaîne de huit signes, pas un document.
  const vs = await supabaseAdmin
    .from(TABLE_VERSIONS)
    .select('rang, etape, cree_le, etat')
    .eq('generation_id', id)
    .order('rang', { ascending: false })
  if (vs.error !== null) {
    return NextResponse.json({ error: 'historique illisible' }, { status: 502 })
  }
  const versions = (vs.data ?? []).map((v: Record<string, unknown>) => ({
    rang: Number(v.rang ?? 0),
    etape: (v.etape ?? null) as string | null,
    creeIl: String(v.cree_le ?? ''),
    restaurable: estRestaurable(v.etat),
  }))
  return NextResponse.json({ versions }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? ''
  const rang = Number(url.searchParams.get('rang') ?? '0')
  if (id === '' || !Number.isInteger(rang) || rang < 1) {
    return NextResponse.json({ error: 'id et rang requis' }, { status: 400 })
  }

  // ── LA PROPRIÉTÉ D'ABORD, ET DANS LE FILTRE : une ligne qui n'est pas la
  // sienne n'est jamais LUE, pas même pour être refusée ensuite.
  const oeuvre = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('id')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (oeuvre.error !== null || oeuvre.data === null) {
    return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  }

  const cible = await supabaseAdmin
    .from(TABLE_VERSIONS)
    .select('etat')
    .eq('generation_id', id)
    .eq('rang', rang)
    .maybeSingle()
  if (cible.error !== null || cible.data === null) {
    return NextResponse.json({ error: `la version ${String(rang)} n’existe pas` }, { status: 404 })
  }
  if (!estRestaurable(cible.data.etat)) {
    // Nommée, pas tue : une version de pipeline ne porte pas de fichiers, et
    // y revenir rendrait une œuvre vide.
    return NextResponse.json(
      { error: `La version ${String(rang)} ne contient pas de fichiers — on ne peut pas y revenir.` },
      { status: 409 },
    )
  }
  const etat = cible.data.etat as VersionDocument

  // ── LE RANG SUIVANT, LU ET PAS SUPPOSÉ. La contrainte d'unicité
  // (generation_id, rang) refuserait un doublon : mieux vaut le calculer.
  const tous = await supabaseAdmin.from(TABLE_VERSIONS).select('rang').eq('generation_id', id)
  const rangs = (tous.data ?? []).map((x: { rang: number }) => Number(x.rang))
  const suivant = Math.max(0, ...rangs) + 1

  // ① L'HISTORIQUE D'ABORD : si l'écriture de la version échoue, le document
  // courant n'a pas bougé et rien n'est perdu. L'ordre inverse laisserait une
  // œuvre modifiée sans trace de son retour.
  const ajout = await supabaseAdmin.from(TABLE_VERSIONS).insert({
    generation_id: id,
    rang: suivant,
    etape: `retour vers ${String(rang)}`,
    cout_usd: 0,
    etat: { ...etat, forme: 'document' },
  })
  if (ajout.error !== null) {
    return NextResponse.json({ error: 'le retour n’a pas pu être enregistré — rien n’a changé' }, { status: 502 })
  }

  // ② PUIS LE DOCUMENT COURANT. La page publique est recompilée à la
  // lecture : le lien ne change pas, son contenu oui.
  const maj = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .update({ document: { fichiers: etat.fichiers } })
    .eq('id', id)
    .eq('owner_id', garde.userId)
  if (maj.error !== null) {
    return NextResponse.json(
      { error: 'la version est enregistrée mais l’application n’a pas changé — réessayez' },
      { status: 502 },
    )
  }

  // ③ LA PURGE EN DERNIER, ET LE RANG 1 N'EN FAIT JAMAIS PARTIE (EP-315).
  const aPurger = rangsAPurger([...rangs, suivant])
  if (aPurger.length > 0) {
    await supabaseAdmin.from(TABLE_VERSIONS).delete().eq('generation_id', id).in('rang', aPurger)
  }

  return NextResponse.json(
    { ok: true, rang: suivant, revenuA: rang, purges: aPurger },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
