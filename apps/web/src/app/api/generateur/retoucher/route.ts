/**
 * RETOUCHER UNE ŒUVRE — modifier sans régénérer, et ne rien écrire si ça rate.
 *
 * ── L'ORDRE DES GESTES EST LA GARANTIE.
 *
 * Appeler → fusionner → assembler → juger AVANT et APRÈS → comparer → et
 * SEULEMENT ALORS écrire. Tant qu'un maillon refuse, `app_generations` n'a
 * pas bougé : l'application en ligne reste celle d'avant, et l'écran dit ce
 * qui a échoué et ce que ça a coûté.
 *
 * ── LE MODÈLE REÇOIT LES FICHIERS, PAS LE CAHIER.
 *
 * Lui redonner le cahier serait lui demander de régénérer. Mesuré le
 * 2026-11-02 sur CONTERAK (15 fichiers, 73 Ko) avec « mets les boutons en
 * vert » : 22 382 jetons d'entrée, 4 285 de sortie, 21 s, et **1 fichier
 * rendu sur 15** — il a trouvé seul que tous les boutons passent par un
 * composant partagé.
 *
 * ── LE JUGE DE NON-RÉGRESSION COMPARE À L'AVANT, PAS À ZÉRO.
 *
 * Une œuvre livrée porte déjà des défauts. Exiger zéro refuserait toute
 * retouche sur une application qui marche : on refuse D'EN AJOUTER, et on
 * nomme le juge qui a empiré.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '@/lib/apps/journal'
import { CONFIGS, fournisseurChoisi, tarifDe, tarifPlafond } from '@/lib/apps/fournisseur'
import { clientIA, MODELE_LEGER } from '@/lib/ia/client'
import { assembler } from '@/lib/apps/bac-a-sable'
import { fichiersSysteme } from '@/lib/apps/bibliotheque-ui'
import { lireFichiers } from '@/lib/apps/ecriture-directe'
import { jugerJetons } from '@/lib/apps/juge-jetons'
import { jugerVivacite } from '@/lib/apps/juge-vivacite'
import { jugerCouverture } from '@/lib/apps/juge-couverture'
import { rangsAPurger, type VersionDocument } from '@/lib/apps/versions-oeuvre'
import {
  comparerJuges,
  CONSIGNE_RETOUCHE,
  PERIMETRE_RETOUCHE,
  plafondRetouche,
  etapeRetouche,
  refusHorsPerimetre,
  type NoteJuge,
} from '@/lib/apps/retouche'

export const runtime = 'nodejs'
export const maxDuration = 300

/** La sortie autorisée : c'est elle qui borne le plafond annoncé à l'écran. */
export const SORTIE_MAX_RETOUCHE = 16_000

/** Les trois juges qui tournent sans processus enfant. */
function noter(fichiers: ReadonlyMap<string, string>): NoteJuge[] {
  const systeme = fichiersSysteme(undefined)
  return [
    { nom: 'jetons', defauts: jugerJetons(fichiers, systeme).length },
    { nom: 'contrôles muets', defauts: jugerVivacite(fichiers).length },
  ]
}

/**
 * LE PLAFOND DE PRIX D'UNE ŒUVRE — demandé au serveur, et c'est voulu.
 *
 * L'écran ne peut pas le calculer : il faudrait y importer `fournisseur.ts`,
 * donc tirer le SDK du fournisseur dans le paquet navigateur. C'est le
 * défaut qu'EP-314 surveille, et il a déjà tué un build.
 *
 * Aucun appel au modèle : on lit la taille du document et on multiplie.
 */
export async function GET(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (id === '') return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('document')
    .eq('id', id)
    .eq('owner_id', garde.userId)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) {
    return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  }
  const f = (lu.data.document as { fichiers?: Record<string, string> } | null)?.fichiers ?? {}
  const octets = Object.entries(f).map(([k, v]) => `=== ${k} ===\n${v}`).join('\n').length
  const config = CONFIGS[fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR)]
  // LE TARIF DE POINTE : un plafond qui suppose l'heure creuse n'est plus un
  // plafond — l'opération peut démarrer à 00:59 et facturer à 01:00.
  const p = plafondRetouche(octets, SORTIE_MAX_RETOUCHE, tarifPlafond(config.prixLeger))
  return NextResponse.json(
    { octets, plafond: p.phrase, perimetre: PERIMETRE_RETOUCHE },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const proprietaire = garde.userId

  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? ''
  const confirme = url.searchParams.get('confirme') === '1'
  const corps = (await req.json().catch(() => ({}))) as { demande?: unknown }
  const demande = typeof corps.demande === 'string' ? corps.demande.trim() : ''
  if (id === '' || demande === '') {
    return NextResponse.json({ error: 'id et demande requis' }, { status: 400 })
  }

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('document, nom')
    .eq('id', id)
    .eq('owner_id', proprietaire)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) {
    return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  }
  const avantObj = (lu.data.document as { fichiers?: Record<string, string> } | null)?.fichiers
  if (avantObj === undefined || Object.keys(avantObj).length === 0) {
    return NextResponse.json(
      { error: 'Cette application n’a plus de fichiers — il n’y a rien à retoucher.' },
      { status: 409 },
    )
  }
  const avant = new Map(Object.entries(avantObj))

  // ── L'APPEL. Le corpus est le document entier : le modèle doit voir
  // l'endroit juste, pas seulement le fichier qu'on croit concerné.
  const config = CONFIGS[fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR)]
  const corpus = [...avant.entries()].map(([k, v]) => `=== ${k} ===\n${v}`).join('\n')
  let texte = ''
  let coutUsd = 0
  try {
    const r = await clientIA().messages.create({
      model: MODELE_LEGER,
      max_tokens: SORTIE_MAX_RETOUCHE,
      system: CONSIGNE_RETOUCHE,
      messages: [{ role: 'user', content: `${corpus}\n\n=== DEMANDE ===\n${demande}` }],
    })
    texte = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    // LE TARIF DU MODÈLE LÉGER, À L'HEURE DE L'APPEL. Facturer une retouche
    // au prix du modèle lourd la rendait quatre fois plus chère qu'elle
    // n'est ; supposer l'heure creuse la rendait deux fois moins.
    const tarif = tarifDe(config.prixLeger, new Date())
    coutUsd =
      (r.usage.input_tokens * tarif.entree + r.usage.output_tokens * tarif.sortie) / 1e6
  } catch (erreur) {
    console.error('[retouche] appel', erreur)
    return NextResponse.json(
      { error: 'Le modèle n’a pas répondu. Votre application n’a pas changé.', coutUsd: 0 },
      { status: 502 },
    )
  }

  // ── LE REFUS HORS PÉRIMÈTRE EST LU SUR LA RÉPONSE, pas supposé.
  const refus = refusHorsPerimetre(texte)
  if (refus !== null) {
    return NextResponse.json({ horsPerimetre: true, raison: refus, coutUsd }, { status: 409 })
  }

  const rendus = lireFichiers(texte)
  if (rendus.length === 0) {
    return NextResponse.json(
      { error: 'Le modèle n’a rendu aucun fichier. Votre application n’a pas changé.', coutUsd },
      { status: 502 },
    )
  }

  // ── LA FUSION : un fichier rendu REMPLACE l'ancien, les autres ne bougent
  // pas. C'est ce qui rend la retouche moins risquée qu'une régénération.
  const apres = new Map(avant)
  for (const f of rendus) apres.set(f.chemin, f.contenu)

  // ── L'ASSEMBLAGE EST LE PREMIER JUGE : du code qui ne compile pas ne
  // mérite pas qu'on fasse tourner les autres.
  const bundle = await assembler(apres)
  if (!bundle.ok) {
    return NextResponse.json(
      {
        error: `Le code modifié ne s’assemble pas : ${bundle.erreur}. Votre application n’a pas changé.`,
        fichiers: rendus.map((f) => f.chemin),
        coutUsd,
      },
      { status: 409 },
    )
  }

  // ── LES JUGES, SUR L'AVANT ET SUR L'APRÈS. Les quatre prennent un
  // document en entrée : la non-régression est un assemblage, pas un
  // chantier (mesuré avant d'écrire ce lot).
  const ecransAvant = jugerCouverture(demande, avant, []).exigences.length
  const ecransApres = jugerCouverture(demande, apres, []).exigences.length
  const verdict = comparerJuges(noter(avant), noter(apres), {
    avant: ecransAvant,
    apres: ecransApres,
  })

  if (verdict.regressions.length > 0) {
    const quoi = verdict.regressions
      .map((r) => `${r.juge} : ${String(r.avant)} → ${String(r.apres)}`)
      .join(', ')
    return NextResponse.json(
      {
        error: `Cette modification abîmerait votre application (${quoi}). Je ne l’ai pas appliquée.`,
        coutUsd,
      },
      { status: 409 },
    )
  }

  // ── LA COUVERTURE QUI BAISSE SE DEMANDE : supprimer un écran est une
  // demande légitime, et un juge qui l'interdirait ferait de la couverture
  // une prison.
  if (verdict.couvertureEnBaisse !== null && !confirme) {
    return NextResponse.json(
      {
        aConfirmer: true,
        couverture: verdict.couvertureEnBaisse,
        coutUsd,
        message:
          `Cette modification retire ${String(
            verdict.couvertureEnBaisse.avant - verdict.couvertureEnBaisse.apres,
          )} élément(s) de ce que votre cahier demandait. C’est peut-être voulu.`,
      },
      { status: 409 },
    )
  }

  // ── ET SEULEMENT MAINTENANT ON ÉCRIT. La version D'ABORD : si elle
  // échoue, le document courant n'a pas bougé.
  const tous = await supabaseAdmin.from(TABLE_VERSIONS).select('rang').eq('generation_id', id)
  const rangsVus = (tous.data ?? []).map((x: { rang: number }) => Number(x.rang))
  const rang = Math.max(0, ...rangsVus) + 1
  const version: VersionDocument = {
    forme: 'document',
    fichiers: Object.fromEntries(apres),
    nom: typeof lu.data.nom === 'string' ? lu.data.nom : null,
    coutUsd: Number(coutUsd.toFixed(4)),
  }
  const ecrit = await supabaseAdmin.from(TABLE_VERSIONS).insert({
    generation_id: id,
    rang,
    etape: etapeRetouche(demande),
    cout_usd: Number(coutUsd.toFixed(4)),
    etat: version,
  })
  if (ecrit.error !== null) {
    return NextResponse.json(
      { error: 'La modification n’a pas pu être enregistrée. Votre application n’a pas changé.', coutUsd },
      { status: 502 },
    )
  }

  const maj = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .update({ document: { fichiers: Object.fromEntries(apres) }, version_courante: rang })
    .eq('id', id)
    .eq('owner_id', proprietaire)
  if (maj.error !== null) {
    return NextResponse.json(
      { error: 'La version est enregistrée mais l’application n’a pas changé — réessayez.', coutUsd },
      { status: 502 },
    )
  }

  const aPurger = rangsAPurger([...rangsVus, rang])
  if (aPurger.length > 0) {
    await supabaseAdmin.from(TABLE_VERSIONS).delete().eq('generation_id', id).in('rang', aPurger)
  }

  return NextResponse.json(
    { ok: true, rang, fichiers: rendus.map((f) => f.chemin), coutUsd: Number(coutUsd.toFixed(4)) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
