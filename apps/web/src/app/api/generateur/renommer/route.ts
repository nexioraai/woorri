/**
 * RENOMMER UNE APPLICATION — gratuit, et honnête sur sa portée.
 *
 * ── POURQUOI CETTE ROUTE EXISTE.
 *
 * Neuf œuvres sont nées avant que le produit ait un nom : leurs cartes
 * disent « Application ». Les régénérer coûterait de l'argent pour un mot.
 * Cette route écrit le mot.
 *
 * ── CE QU'ELLE CHANGE VRAIMENT. MESURÉ, PAS PROMIS.
 *
 * La page publique est recompilée à CHAQUE lecture (`p/[jeton]` appelle
 * `pageAutonome` sur le document stocké), et son titre vient maintenant de
 * la colonne `nom`. Donc renommer corrige d'un coup : la carte de la liste,
 * l'onglet du navigateur, le nom d'installation du manifeste et le titre
 * Apple.
 *
 * ── CE QU'ELLE NE CHANGE PAS, ET QU'ELLE DIT.
 *
 * Le nom que le modèle a écrit DANS les écrans — barre latérale, en-tête —
 * vit dans le code de l'œuvre. Aucune écriture en base ne l'atteint. La
 * réponse porte donc `ceQueCaNeChangePas` : l'écran AFFICHE cette phrase.
 * Sans elle, la personne renomme, voit sa carte changer, ouvre son
 * application et y lit l'ancien nom — un écran qui dit une chose pendant
 * qu'une autre est vraie, soit exactement le défaut qu'on ferme partout
 * ailleurs.
 *
 * ── L'ADRESSE NE SUIT PAS LE NOM. C'EST VOLONTAIRE.
 *
 * `publication_slug` n'est pas touché. Un nom publié ne se recycle pas
 * (EP-308) et une adresse déjà envoyée par courriel, posée en signature ou
 * imprimée sur une carte doit continuer de montrer la même chose. Le nom se
 * corrige autant qu'on veut ; l'adresse se choisit une fois.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { CE_QUE_RENOMMER_CHANGE, nomProduitValide } from '@/lib/apps/nom-produit'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const corps = (await req.json().catch(() => ({}))) as { nom?: unknown }
  const verdict = nomProduitValide(typeof corps.nom === 'string' ? corps.nom : '')
  if (!verdict.ok) return NextResponse.json({ error: verdict.erreur }, { status: 400 })

  // La restriction voyage DANS le filtre : une ligne qui n'est pas la sienne
  // n'est jamais écrite, pas même pour être refusée ensuite.
  const ecrit = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .update({ nom: verdict.nom })
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .select('id')
    .maybeSingle()
  if (ecrit.error !== null) {
    return NextResponse.json({ error: 'le changement de nom a echoue' }, { status: 500 })
  }
  if (ecrit.data === null) {
    return NextResponse.json({ error: 'generation inconnue' }, { status: 404 })
  }

  return NextResponse.json(
    { nom: verdict.nom, ceQueCaNeChangePas: CE_QUE_RENOMMER_CHANGE },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
