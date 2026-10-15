/**
 * ETAGE 4 — LA REPRISE. Une ligne refusee repart de sa base, sans repayer
 * ce qui est deja ecrit.
 *
 * AUCUN moteur ne se lance ici : le travailleur recoit une SENTINELLE qui
 * jette, exactement comme au depot. Cette route ne fait que remettre une
 * ligne en attente ; toute la depense a lieu ensuite, cote travailleur.
 *
 * CE FICHIER EST LE CINQUIEME AUTORISE a ecrire l'option de production.
 * La liste etait fermee a quatre et exigeait « un arbitrage conscient »
 * pour s'ouvrir : le voici. Motif, 2026-10-11 — les quatre generateurs
 * comparables reprennent tous une generation ratee ; nous etions les seuls
 * a tout refaire, donc a tout refacturer. Sans cette route, la base qu'un
 * refus conserve desormais ne sert a rien.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { creerTravailleur, type BaseGeneration, type MoteurContinuation } from '@/lib/apps/travailleur'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'

export const runtime = 'nodejs'

const sentinelle: MoteurContinuation = {
  poursuivreEmission: async () => {
    throw new Error('REPRISE_SEULE: le moteur ne se lance jamais a la reprise')
  },
}

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as {
    id?: unknown
    geste?: unknown
    rang?: unknown
  } | null
  const id = typeof corps?.id === 'string' ? corps.id.trim() : ''
  // QUATRE GESTES, UNE SEULE ROUTE — et c'est voulu. Tous passent par le
  // MEME ecrivain (le travailleur) : la liste des ecrivains de la vraie
  // table reste donc FERMEE, et aucun arbitrage nouveau n'est depense.
  //
  // `arreter` et `relancer` sont arrives le 2026-10-15, apres une mesure :
  // une generation morte en P0 n'affichait AUCUN bouton — ni pour couper,
  // ni pour recommencer. `estReprenable` refuse une ligne sans acquis, et
  // c'est juste : il n'y a rien a reprendre. Mais il y a toujours quelque
  // chose a RELANCER, et toujours quelque chose a ARRETER.
  const geste =
    corps?.geste === 'continuer'
      ? 'continuer'
      : corps?.geste === 'revenir'
        ? 'revenir'
        : corps?.geste === 'arreter'
          ? 'arreter'
          : corps?.geste === 'relancer'
            ? 'relancer'
            : 'reprendre'
  if (id === '') {
    return NextResponse.json({ error: 'Génération inconnue.' }, { status: 400 })
  }

  try {
    const travailleur = creerTravailleur({
      table: TABLE_GENERATIONS,
      production: true,
      base: supabaseAdmin as unknown as BaseGeneration,
      moteur: sentinelle,
      budgetTrancheMs: 1,
      battementPerimeMs: 60_000,
    })
    if (geste === 'revenir') {
      // GRATUIT, comme chez Bolt : une ecriture en base, aucun appel.
      const rang = Number(corps?.rang)
      if (!Number.isInteger(rang) || rang < 1) {
        return NextResponse.json({ error: 'Version inconnue.' }, { status: 400 })
      }
      const retour = await travailleur.revenirAVersion({ id, rang, proprietaire: garde.userId })
      return retour === 'revenue'
        ? NextResponse.json({ id, revenu: rang })
        : NextResponse.json({ error: 'Version inconnue.' }, { status: 404 })
    }
    if (geste === 'arreter') {
      // GRATUIT : une ecriture en base, aucun appel. Le travail deja en vol
      // chez le fournisseur ne peut pas etre tue d'ici — mais la ligne cesse
      // d'etre saisissable, donc plus aucun tour ne repartira dessus.
      const issue = await travailleur.arreter({ id, proprietaire: garde.userId })
      return issue === 'arretee'
        ? NextResponse.json({ id, arrete: true })
        : NextResponse.json(
            { error: 'Cette génération n’est plus en cours.' },
            { status: 409 },
          )
    }
    if (geste === 'relancer') {
      // PAYANT, et c'est dit a l'ecran : une relance est un travail NEUF.
      const issue = await travailleur.relancer({ id, proprietaire: garde.userId })
      return issue === 'introuvable'
        ? NextResponse.json({ error: 'Génération inconnue.' }, { status: 404 })
        : NextResponse.json({ id: issue.id, relance: true })
    }
    if (geste === 'continuer') {
      const suite = await travailleur.continuer({ id, proprietaire: garde.userId })
      return suite === 'repartie'
        ? NextResponse.json({ id, repris: true })
        : NextResponse.json(
            { error: 'Cette génération n’attend pas votre accord.' },
            { status: 409 },
          )
    }
    const issue = await travailleur.reprendre({ id, proprietaire: garde.userId })
    if (issue === 'introuvable') {
      return NextResponse.json({ error: 'Génération inconnue.' }, { status: 404 })
    }
    if (issue === 'rien_a_reprendre') {
      // HONNETE PLUTOT QUE SERVIABLE : on ne relance pas une generation
      // neuve en la deguisant en reprise — ce serait la facture doublee.
      return NextResponse.json(
        { error: 'Il n’y a rien à reprendre sur cette génération.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ id, repris: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Reprise impossible.' },
      { status: 500 },
    )
  }
}
