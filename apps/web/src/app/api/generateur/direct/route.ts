/**
 * OPTION 1 — L'IA ECRIT LE CODE. UNE ROUTE, UN APPEL, UNE BOUCLE BORNEE.
 *
 * ── CE QU'ELLE MET A L'EPREUVE.
 *
 * D-001 (2026-08-27) a examine DEUX architectures et retenu la seconde :
 * « LLM ecrit l'app directement » contre « pipeline AIR + coeur
 * deterministe ». La premiere est ici, mise a l'epreuve — pas choisie.
 *
 * L'autre chemin reste INTACT. L'interrupteur `GENERATEUR_MOTEUR` decide
 * lequel est atteignable, jamais les deux : exigence du proprietaire, et il a
 * raison — treize tirs et 66 $ ont deja ete depenses sans pouvoir attribuer
 * un resultat apres coup.
 *
 * ── POURQUOI SYNCHRONE, QUAND L'AUTRE EST ASYNCHRONE.
 *
 * Le chemin AIR tourne par tranches de cron parce qu'il dure 26 minutes
 * (mesure du 2026-10-18). Celui-ci vise la minute : un appel, une boucle de
 * trois tours au plus. Une file d'attente et un travailleur seraient une
 * machinerie pour un travail qui tient dans une requete.
 *
 * ── LE GARDE-FOU DE DEPENSE EST UN CLIQUET, PAS UNE ESPERANCE.
 *
 * Le moteur actuel porte ecrit dans son code : « 6,87 $ brules, seul le
 * garde-fou du harnais a arrete ». Ici : trois tours au plus, un plafond de
 * jetons par appel, et le cout REEL rendu a l'appelant.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { moteurChoisi } from '@/lib/apps/interrupteur-moteur'
import { boucleEcriture, CONSIGNE, pageAutonome } from '@/lib/apps/boucle-directe'
import { appelerFournisseur, CONFIGS, fournisseurChoisi } from '@/lib/apps/fournisseur'

export const runtime = 'nodejs'
export const maxDuration = 300



export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  // ── UNE SEULE PORTE ATTEIGNABLE A LA FOIS.
  //
  // Si l'interrupteur n'est pas sur `direct`, cette route REFUSE. Sans ce
  // refus, les deux architectures seraient joignables en meme temps et on ne
  // saurait plus laquelle a produit quoi — exactement ce que le proprietaire
  // a exige d'eviter.
  if (moteurChoisi(process.env.GENERATEUR_MOTEUR) !== 'direct') {
    return NextResponse.json(
      { error: 'Cette version n’est pas active.' },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // ── LE FOURNISSEUR EST UN INTERRUPTEUR, PAS UN CHOIX EN DUR.
  //
  // Mesuré le 2026-10-18 : le crédit Anthropic du propriétaire est tombé à
  // zéro en plein tir, et un rechargement n'y a rien changé — la clé rend
  // encore « credit balance is too low ». Un produit dont la seule porte est
  // fermée n'a plus de porte.
  const fournisseur = fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR)
  const config = CONFIGS[fournisseur]
  const cle = process.env[config.variableCle] ?? ''
  if (cle === '') {
    return NextResponse.json({ error: 'Clé absente du serveur.' }, { status: 500 })
  }

  const corps = (await req.json().catch(() => ({}))) as { demande?: unknown }
  const demande = typeof corps.demande === 'string' ? corps.demande.trim() : ''
  if (demande === '') return NextResponse.json({ error: 'demande requise' }, { status: 400 })

  let entree = 0
  let sortie = 0

  /**
   * L'APPEL, ET IL EST NU.
   *
   * Pas de grammaire compilee, pas de sorties structurees, pas de decoupe en
   * neuf passes. C'est tout le pari : le modele ecrit a pleine vitesse, et
   * c'est le compilateur qui juge apres — pas une grammaire pendant.
   *
   * Le DIALECTE du fournisseur vit dans `fournisseur.ts`, jamais ici : l'un
   * exige le flux, l'autre plafonne sa sortie a 8 192 jetons. Cette route
   * n'a pas a le savoir.
   */
  const appeler = async (
    messages: readonly { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> => {
    const r = await appelerFournisseur(fournisseur, cle, CONSIGNE, messages)
    entree += r.usage.entree
    sortie += r.usage.sortie
    return r.texte
  }

  const debut = Date.now()
  let resultat
  try {
    resultat = await boucleEcriture({ demande, appeler })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message.slice(0, 200) }, { status: 502 })
  }
  const dureeMs = Date.now() - debut
  const coutUsd = (entree * config.prix.entree + sortie * config.prix.sortie) / 1e6

  // ── LA LIGNE EST ECRITE DANS LES DEUX CAS, SUCCES COMME ECHEC.
  //
  // Un echec non journalise est un echec qu'on repaiera pour comprendre.
  // C'est le defaut mesure le 2026-10-10 : trois appels payants, UNE SEULE
  // ligne en base, et le proprietaire incapable de savoir ce qu'il avait
  // depense.
  const ligne = {
    // ── PAS D'`owner_email` ICI, ET C'EST UN CLIQUET QUI ME L'A APPRIS.
    //
    // La dette 6a l'eteint : l'identite est l'id du jeton, jamais un courriel.
    // `ownerIdentityRatchets` tient la liste EXACTE des routes qui le portent
    // encore, pour qu'aucune nouvelle ne s'y ajoute en silence. Celle-ci
    // n'avait aucune raison d'y entrer.
    owner_id: garde.userId,
    demande,
    moteur: 'direct',
    // QUEL FOURNISSEUR a écrit, pour que la comparaison reste lisible.
    // Sa propre colonne : `nom` porte le nom de l'application, pas celui
    // d'un fournisseur — y ranger ceci écraserait une donnée d'affichage.
    fournisseur,
    ok: resultat.ok,
    statut: resultat.ok ? 'livree' : 'refusee',
    cout_usd: Number(coutUsd.toFixed(4)),
    duree_ms: dureeMs,
    jetons_entree: entree,
    jetons_sortie: sortie,
    tirages: resultat.tours.length,
    diagnostics: resultat.ok ? [] : [resultat.motif],
    // La colonne `document` porte l'oeuvre. Ici l'oeuvre est du CODE, pas un
    // document AIR : on range les fichiers, qui sont ce qui se recompile.
    document: resultat.ok ? { fichiers: Object.fromEntries(resultat.fichiers) } : null,
  }
  const ecrit = await supabaseAdmin.from(TABLE_GENERATIONS).insert(ligne).select('id').maybeSingle()

  if (!resultat.ok) {
    return NextResponse.json(
      { ok: false, motif: resultat.motif, tours: resultat.tours, coutUsd, dureeMs },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      id: ecrit.data?.id ?? null,
      html: pageAutonome(resultat.code, 'Votre application'),
      fichiers: resultat.fichiers.size,
      tours: resultat.tours,
      coutUsd,
      dureeMs,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
