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
import { declarationDe } from '@/lib/apps/declaration-depuis-schema'
import { projectAirSchema } from '@deribfy/air-schema'
import {
  FICHIER_DECLARATION,
  fusionnerEntites,
  lireDeclarationEnRoute,
} from '@/lib/apps/declaration-en-route'
import { comparerDeclarations, phraseArret } from '@/lib/apps/migration-oeuvre'
import { PHRASE_COMPTAGE_IMPOSSIBLE, phraseApresMigration, phraseAvantMigration } from '@/lib/apps/phrase-migration'
import { emettreMigrationSql } from '@/lib/apps/migration-sql'
import { appliquerMigration } from '@/lib/apps/connexion-migrateur'
import { emettrePolitiquesSql, emettreSchemaSql } from '@deribfy/compiler'
import { prendreInstantane, type Instantane } from '@/lib/apps/instantane-migration'
import { configMigrateur } from '@/lib/apps/connexion-migrateur'
import { nomSchemaOeuvre } from '@/lib/apps/poser-oeuvre'

/**
 * L'INSTANTANÉ D'UNE ŒUVRE — ou `null` si sa base n'est pas joignable.
 *
 * Une œuvre non publiée n'a PAS de schéma : il n'y a alors rien à
 * compter, et c'est la vérité, pas un échec. On rend `null` et la phrase
 * d'avant ne parle que de ce qu'elle ajoute.
 */
async function instantaneDeLOeuvre(id: string): Promise<Instantane | null> {
  const cfg = configMigrateur(process.env)
  if (!cfg.ok) return null
  const { Client } = (await import('pg')) as unknown as {
    Client: new (c: { connectionString: string; statement_timeout?: number }) => {
      connect: () => Promise<void>
      query: (q: string) => Promise<{ rows?: Record<string, unknown>[] }>
      end: () => Promise<void>
    }
  }
  const client = new Client({ connectionString: cfg.dsn, statement_timeout: 30_000 })
  try {
    await client.connect()
    return await prendreInstantane(
      async (sql) => (await client.query(sql)).rows ?? [],
      nomSchemaOeuvre(id),
    )
  } catch {
    return null
  } finally {
    await client.end().catch(() => undefined)
  }
}
import { jugerExecution } from '@/lib/apps/juge-execution'
import { jugerDevise } from '@/lib/apps/juge-devise'
import { jugerPersistance } from '@/lib/apps/juge-persistance'
import { colonnesNouvelles, jugerColonnes, phraseColonnes } from '@/lib/apps/juge-colonnes'
import type { EntiteDeclaree } from '@/lib/apps/entites-declarees'
import { blocDeclaration } from '@/lib/apps/retouche'
import { CONFIGS, coutAppel, fournisseurChoisi, tarifDe, tarifPlafond, tarifsDuModele } from '@/lib/apps/fournisseur'
import { deploiementQuiSert } from '@/lib/apps/deploiement'
import { ecrireTentative, type Issue } from '@/lib/apps/tentatives'
import { ISSUES_DECOMPTEES, libererModification, lireCompteur, lireMoyensPaiement, lirePrixMensuelXaf, PHRASE_COMPTEUR_INDISPONIBLE, PHRASE_EPUISE, reserverModification } from '@/lib/apps/quota'
import { mobileMoneyOuvert } from '@/lib/payments/mobile-money/encaissement'
import { sansQuota } from '@/lib/admin-emails'
import { abonnementCarteOuvert } from '@/lib/payments/abonnement-appli'
import { alerter } from '@/lib/alertes'
import { apparenceDuDocument, lireApparenceEnRoute, type Apparence } from '@/lib/apps/apparence'
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
  phraseDeclarationRejetee,
  refusHorsPerimetre,
  type NoteJuge,
} from '@/lib/apps/retouche'

export const runtime = 'nodejs'
// ── 900 s, LE RÉGIME DE LA GÉNÉRATION (point 2, 2026-11-18).
//
// À 300 s et 16 000 jetons, la retouche coupait tout fichier réécrit de plus
// de ~45 Ko : trois refus sur six chez pharma. 65 536 jetons à ~230 jetons/s
// (flash) demandent jusqu'à ~280 s pour l'appel seul, plus les juges.
export const maxDuration = 900

/** La sortie autorisée : c'est elle qui borne le plafond annoncé à l'écran. */
// Hérité de la génération (`CONFIGS.deepseek.maxJetons`). Flash en accepte
// 384 K (documentation DeepSeek, relevée le 2026-11-18).
export const SORTIE_MAX_RETOUCHE = 65_536

/**
 * LES SIX JUGES, COMME LA GÉNÉRATION — et plus deux (b, 2026-11-04).
 *
 * ── POURQUOI DEUX SUFFISAIENT HIER, ET PLUS AUJOURD'HUI.
 *
 * La retouche était COSMÉTIQUE : textes, couleurs, un champ sur un écran
 * existant. Jetons et contrôles muets couvraient ce qu'elle pouvait
 * abîmer.
 *
 * Elle change désormais de la logique et ajoute des écrans. Deux juges
 * ouvriraient alors un chemin qui LIVRE DU CODE MOINS JUGÉ que celui
 * qu'on juge — et c'est précisément par là que passerait tout ce qu'on
 * refuse à la génération.
 *
 * ── CE QUE CHACUN EXIGE, ET POURQUOI L'ORDRE EST CELUI-LÀ.
 *
 * · jetons, vivacité, devise — purs, aucun processus ;
 * · exécution — monte l'œuvre dans un simulateur, donc un processus et
 *   un assemblage ; c'est elle qui donne les ÉCRANS ;
 * · couverture — a besoin de ces écrans pour dire autre chose qu'un
 *   comptage d'exigences ;
 * · persistance — a besoin de la DÉCLARATION, qu'on sait enfin retrouver.
 *
 * ── ET LA COMPARAISON RESTE UN AVANT/APRÈS.
 *
 * Une retouche n'a pas à réparer ce qu'elle n'a pas cassé : on refuse la
 * RÉGRESSION, pas le défaut préexistant. Exiger zéro refuserait toute
 * modification d'une œuvre imparfaite — c'est-à-dire presque toutes.
 */
async function noter(
  fichiers: ReadonlyMap<string, string>,
  o: {
    readonly demande: string
    readonly entites: readonly EntiteDeclaree[]
    readonly devise: string | undefined
    /**
     * LES COLONNES QUI EXISTERONT (défaut A, 2026-11-18). Avant : la
     * déclaration d'origine. Après : la déclaration FUSIONNÉE — un champ que
     * la retouche déclare correctement sera migré, il ne compte pas.
     */
    readonly colonnes: readonly EntiteDeclaree[]
  },
): Promise<{ notes: NoteJuge[]; taux: number | null }> {
  const systeme = fichiersSysteme(undefined)
  const bundle = await assembler(fichiers)
  // ── UN DOCUMENT QUI NE S'ASSEMBLE PAS N'A PAS D'ÉCRANS.
  //
  // On ne peut alors ni l'exécuter ni mesurer sa couverture. On le dit
  // par un défaut d'exécution plutôt que par un zéro silencieux : un
  // zéro ressemblerait à « parfait ».
  const execution = bundle.ok ? await jugerExecution(bundle.code) : null
  const ecrans = execution?.ecrans ?? []
  const couverture = jugerCouverture(o.demande, fichiers, ecrans)
  return {
    notes: [
      { nom: 'jetons', defauts: jugerJetons(fichiers, systeme).length },
      { nom: 'contrôles muets', defauts: jugerVivacite(fichiers).length },
      { nom: 'devise', defauts: jugerDevise(fichiers, o.devise).length },
      {
        nom: 'exécution',
        defauts: execution === null ? 1 : execution.erreurs.length,
      },
      { nom: 'exigences muettes', defauts: couverture.absentes.length },
      { nom: 'persistance', defauts: jugerPersistance(o.entites, fichiers).length },
      // ── LE CODE N'ÉCRIT QUE DANS DES COLONNES QUI EXISTENT (défaut A).
      // Mesuré sur pharma.deribfy.app : une retouche « réussie » écrivait
      // `produit.emplacement`, jamais créée — l'ajout et la modification d'un
      // produit cassés en silence (PGRST204). Aucun des six juges ne le voyait.
      { nom: 'colonnes inexistantes', defauts: jugerColonnes(fichiers, o.colonnes).inconnues.length },
    ],
    taux: couverture.taux,
  }
}

/** Le rang suivant d'une œuvre — deux appelants depuis la version en attente. */
async function rangSuivant(id: string): Promise<number> {
  const tous = await supabaseAdmin.from(TABLE_VERSIONS).select('rang').eq('generation_id', id)
  const rangs = (tous.data ?? []).map((x: { rang: number }) => Number(x.rang))
  return Math.max(0, ...rangs) + 1
}

/**
 * APPLIQUE UNE VERSION MISE DE CÔTÉ — sans rappeler le modèle.
 *
 * ── CE QUE CETTE FONCTION NE FAIT PAS, ET C'EST TOUT L'INTÉRÊT.
 *
 * Aucun appel au fournisseur, aucun centime. Le travail a déjà été fait
 * et déjà payé ; l'accord ne fait que l'appliquer.
 *
 * ── ET L'ORDRE RESTE LE MÊME : LA BASE D'ABORD, LE DOCUMENT ENSUITE.
 *
 * Si la migration échoue, l'application sert encore sa version d'avant
 * et les données sont intactes. L'inverse laisserait un document qui
 * parle de colonnes que la base n'a pas.
 */
async function appliquerEnAttente(
  id: string,
  proprietaire: string,
  rang: number,
): Promise<NextResponse> {
  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('document, nom')
    .eq('id', id)
    .eq('owner_id', proprietaire)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) {
    return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
  }
  const v = await supabaseAdmin
    .from(TABLE_VERSIONS)
    .select('etat')
    .eq('generation_id', id)
    .eq('rang', rang)
    .maybeSingle()
  const etat = v.data?.etat as (VersionDocument & { entites?: EntiteDeclaree[] }) | null
  if (etat === null || etat === undefined || etat.enAttente !== true) {
    return NextResponse.json(
      { error: 'Cette modification n’attend plus votre accord.' },
      { status: 409 },
    )
  }

  const docAvant = lu.data.document as { schema?: string; entites?: unknown } | null
  const entitesAvant = declarationDe(docAvant)
  const entitesApres = etat.entites ?? entitesAvant
  const plan = comparerDeclarations(entitesAvant, entitesApres)
  const avant = await instantaneDeLOeuvre(id)
  // ── SANS INSTANTANÉ, ON NE MIGRE PAS — ET ON N'ÉCRIT PAS NON PLUS.
  //
  // L'ancienne forme sautait la migration et écrivait quand même le
  // document : le code attendait une colonne qui n'existait pas.
  if (plan.ajouts.length > 0 && avant === null) {
    return NextResponse.json({ error: PHRASE_COMPTAGE_IMPOSSIBLE }, { status: 409 })
  }

  if (plan.ajouts.length > 0 && avant !== null) {
    const m = emettreMigrationSql(plan, entitesApres, id)
    const r =
      m.refus.length > 0
        ? { ok: false, motif: 'le SQL ne passe pas la liste des formes émettables' }
        : await appliquerMigration({ schema: nomSchemaOeuvre(id), sql: m.sql, env: process.env })
    if (!r.ok) {
      return NextResponse.json(
        {
          error:
            'Le changement de données n’a pas pu être appliqué. Votre ' +
            'application n’a pas changé et vos données sont intactes.',
          motif: r.motif,
        },
        { status: 409 },
      )
    }
  }

  const maj = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .update({
      document: {
        fichiers: etat.fichiers,
        schema: etat.schema,
        politiques: etat.politiques,
        entites: entitesApres,
        ...(etat.apparence === undefined ? {} : { apparence: etat.apparence }),
      },
      version_courante: rang,
    })
    .eq('id', id)
    .eq('owner_id', proprietaire)
  if (maj.error !== null) {
    return NextResponse.json(
      { error: 'La modification n’a pas pu être enregistrée.' },
      { status: 502 },
    )
  }
  // LA VERSION N'ATTEND PLUS : elle est servie.
  await supabaseAdmin
    .from(TABLE_VERSIONS)
    .update({ etat: { ...etat, enAttente: false } })
    .eq('generation_id', id)
    .eq('rang', rang)

  const apres = await instantaneDeLOeuvre(id)
  return NextResponse.json(
    {
      ok: true,
      rang,
      // AUCUN CENTIME : le travail était déjà payé.
      coutUsd: 0,
      ...(avant !== null && apres !== null
        ? { migration: phraseApresMigration(plan, avant, apres) }
        : {}),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
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
  const p = plafondRetouche(octets, SORTIE_MAX_RETOUCHE, tarifPlafond(tarifsDuModele(config, MODELE_LEGER)))
  // ── LE COMPTEUR, PAS LE PRIX (étape ③, 2026-11-19). Le commerçant lit des
  //    modifications ; le plafond en dollars n'est rendu qu'au propriétaire
  //    (compte exempté) — décision 5A. `null` : compteur illisible, l'écran
  //    dit « Modifier » sans chiffre plutôt qu'un chiffre faux.
  const exempte = sansQuota(garde.email)
  const compteur = exempte ? { exempte: true as const } : await lireCompteur(id, garde.userId)
  // Le bouton « S'abonner » ne se montre que si l'interrupteur l'ouvre à CE compte.
  const abonnementCarte = !exempte && (await abonnementCarteOuvert(garde.userId, garde.email))
  // Le prix mensuel, pour la phrase « Publier demande l'abonnement » : lu dans
  // le réglage, jamais écrit dans l'écran. Exempté : sans objet.
  const prixMensuelXaf = exempte ? null : await lirePrixMensuelXaf()
  // Les moyens de paiement à la main (réglage `moyens_paiement_manuel`).
  const moyensPaiement = exempte ? [] : await lireMoyensPaiement()
  // Le paiement mobile money (MODE TEST) : interrupteur `mobile_money`, éteint par défaut.
  const mobileMoney = !exempte && (await mobileMoneyOuvert(garde.userId, garde.email))
  return NextResponse.json(
    { octets, ...(exempte ? { plafond: p.phrase } : {}), perimetre: PERIMETRE_RETOUCHE, compteur, abonnementCarte, prixMensuelXaf, moyensPaiement, mobileMoney },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * CE QU'UNE RETOUCHE A COÛTÉ ET COMMENT ELLE A FINI — rempli en route.
 *
 * Point 2 (2026-11-18) : aucune retouche n'était tracée. Une ligne par
 * retouche qui a APPELÉ le modèle part dans `app_generation_attempts`
 * (nature `retouche`), réussie, refusée ou interrompue.
 */
type SuiviRetouche = {
  appele: boolean
  debut: Date
  generationId: string
  demande: string
  jetonsEntree: number
  jetonsCache: number
  jetonsSortie: number
  coutUsd: number
  tronquee: boolean
  /** Posée explicitement là où la réponse seule ne le dit pas. */
  issue: Issue | null
  /** Une modification a été RÉSERVÉE au compteur (compte non exempté). */
  reservee: { app: string; proprietaire: string; restantes: number } | null
}

export async function POST(req: Request) {
  const suivi: SuiviRetouche = {
    appele: false, debut: new Date(), generationId: '', demande: '',
    jetonsEntree: 0, jetonsCache: 0, jetonsSortie: 0, coutUsd: 0, tronquee: false, issue: null, reservee: null,
  }
  const reponse = await retoucher(req, suivi)
  if (suivi.appele) await consignerRetouche(suivi, reponse)
  return await solderReservation(suivi, reponse)
}

/**
 * LE COMPTEUR SE SOLDE SUR CE QUI EST PARTI À L'ÉCRAN (étape ②, 2026-11-19).
 *
 * Livrée ou prête à confirmer : la modification est décomptée, et la réponse
 * dit combien il en reste. Tout le reste — refus des juges, hors périmètre,
 * coupure, modèle muet, écriture échouée — est LIBÉRÉ : « une modification
 * refusée ne compte pas ». Nous payons le fournisseur ; la facturer serait
 * faire payer notre propre panne.
 */
async function solderReservation(suivi: SuiviRetouche, reponse: Response): Promise<Response> {
  if (suivi.reservee === null) return reponse
  const corps = (await reponse.clone().json().catch(() => ({}))) as Record<string, unknown>
  const issue = issueDe(suivi, corps)
  if (!ISSUES_DECOMPTEES.has(issue)) {
    const l = await libererModification(suivi.reservee.app, suivi.reservee.proprietaire)
    if (!l.ok) {
      await alerter({
        sujet: 'oeuvre', sujetId: suivi.reservee.app, motif: 'quota : modification refusée NON libérée',
        etape: 'ecriture', detail: l.detail ?? '', coutUsd: Number(suivi.coutUsd.toFixed(4)),
      }).catch(() => undefined)
    }
    return reponse
  }
  return NextResponse.json(
    { ...corps, modificationsRestantes: suivi.reservee.restantes },
    { status: reponse.status, headers: reponse.headers },
  )
}

function issueDe(
  suivi: SuiviRetouche,
  corps: { ok?: unknown; aConfirmer?: unknown },
): Issue {
  return suivi.issue ?? (corps.ok === true ? 'livree' : corps.aConfirmer === true ? 'en_attente' : 'refusee')
}

/**
 * L'ISSUE SE LIT SUR CE QUI EST PARTI À L'ÉCRAN — la même réponse, donc le
 * même motif que celui que le commerçant a lu. Ne jette jamais : une trace
 * perdue ne fait pas échouer la retouche, mais elle se dit (journal et alerte),
 * comme pour la génération.
 */
async function consignerRetouche(suivi: SuiviRetouche, reponse: Response): Promise<void> {
  const corps = (await reponse.clone().json().catch(() => ({}))) as {
    ok?: boolean; aConfirmer?: boolean; rang?: unknown; error?: string; raison?: string; message?: string
    horsPerimetre?: boolean; declarationRejetee?: string; fichiers?: string[]
  }
  const issue: Issue = issueDe(suivi, corps)
  const motif = corps.error ?? corps.raison ?? corps.message ?? null
  const r = await ecrireTentative(supabaseAdmin as unknown as Parameters<typeof ecrireTentative>[0], {
    generationId: suivi.generationId,
    nature: 'retouche',
    issue,
    debut: suivi.debut,
    fin: new Date(),
    versionRang: typeof corps.rang === 'number' ? corps.rang : null,
    fournisseur: `${fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR)}/${MODELE_LEGER}`,
    deploiement: deploiementQuiSert(process.env),
    coutUsd: suivi.coutUsd,
    jetonsEntree: suivi.jetonsEntree + suivi.jetonsCache,
    jetonsSortie: suivi.jetonsSortie,
    tirages: 1,
    diagnostics: motif === null ? [] : [motif],
    trace: {
      demande: suivi.demande,
      statut: reponse.status,
      tronquee: suivi.tronquee,
      horsPerimetre: corps.horsPerimetre === true,
      jetonsCache: suivi.jetonsCache,
      fichiers: corps.fichiers ?? null,
      declarationRejetee: corps.declarationRejetee ?? null,
    },
  }).catch((e: unknown) => ({ ok: false as const, cause: e instanceof Error ? e.message : String(e) }))
  if (!r.ok) {
    console.error(`[tentatives] retouche ${issue} non écrite pour ${suivi.generationId} — ${r.cause}`)
    await alerter({
      sujet: 'oeuvre', sujetId: suivi.generationId, motif: `trace : retouche « ${issue} » non écrite`,
      etape: 'ecriture', detail: r.cause, coutUsd: Number(suivi.coutUsd.toFixed(4)),
    }).catch(() => undefined)
  }
}

async function retoucher(req: Request, suivi: SuiviRetouche): Promise<Response> {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response
  const proprietaire = garde.userId

  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? ''
  const confirme = url.searchParams.get('confirme') === '1'
  // ── L'ACCORD APPLIQUE L'ÉTAT DÉJÀ CALCULÉ — AUCUN APPEL AU MODÈLE.
  //
  // Le mécanisme d'accord rejouait la demande, donc repayait ~0,04 $ :
  // confirmer coûtait un second appel, précisément sur le geste qu'on
  // veut que les gens prennent l'habitude de faire.
  const aAppliquer = Number(url.searchParams.get('applique') ?? '0')
  if (Number.isInteger(aAppliquer) && aAppliquer > 0) {
    return await appliquerEnAttente(id, proprietaire, aAppliquer)
  }

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
  const docAvant = lu.data.document as {
    fichiers?: Record<string, string>
    schema?: string
    politiques?: string
  } | null
  // Le schema de l'oeuvre, tel qu'il est AUJOURD'HUI. `undefined` sur une
  // oeuvre anterieure au lot D2 : on ne le fabrique pas, on le transmet.
  const schemaPrecedent = docAvant?.schema
  const politiquesPrecedentes = docAvant?.politiques
  const avantObj = docAvant?.fichiers
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
  // ── LA TRONCATURE VOYAGE AVEC LE TEXTE (2026-11-04).
  //
  // La boucle de génération la fait voyager depuis le 2026-10-18. Cette
  // route, elle, l'IGNORAIT ENTIÈREMENT : aucune occurrence de
  // `stop_reason` dans ce fichier. Une réponse coupée rendait des
  // fichiers à moitié écrits, et la fusion les posait PAR-DESSUS LES
  // BONS — en silence. Le propriétaire ne l'aurait découvert qu'en
  // ouvrant son application.
  let tronquee = false

  // ── LE COMPTEUR, AVANT TOUT APPEL PAYANT (étape ②, 2026-11-19).
  //
  // Une instruction en base réserve ou refuse : deux clics simultanés, un
  // seul passe (prouvé : 12 clics → 3 sur une appli gratuite). Les comptes
  // exemptés ne sont jamais comptés — le stand ne tombe pas sur un quota.
  if (!sansQuota(garde.email)) {
    const r = await reserverModification(id, proprietaire)
    if (!r.ok) {
      return NextResponse.json(
        r.raison === 'epuise'
          ? { error: PHRASE_EPUISE, quotaEpuise: true, coutUsd: 0 }
          : { error: PHRASE_COMPTEUR_INDISPONIBLE, coutUsd: 0 },
        { status: r.raison === 'epuise' ? 402 : 503 },
      )
    }
    suivi.reservee = { app: id, proprietaire, restantes: r.restantes }
  }
  suivi.appele = true
  suivi.generationId = id
  suivi.demande = demande
  try {
    // ── EN FLUX (point 2). Le SDK refuse un appel non streamé dès que
    // `max_tokens` autorise plus de dix minutes de réponse — la même raison
    // que la génération (`fournisseur.ts`).
    const r = await clientIA().messages.stream({
      model: MODELE_LEGER,
      max_tokens: SORTIE_MAX_RETOUCHE,
      system: `${CONSIGNE_RETOUCHE}\n\n${blocDeclaration(declarationDe(docAvant))}`,
      messages: [{ role: 'user', content: `${corpus}\n\n=== DEMANDE ===\n${demande}` }],
    }).finalMessage()
    texte = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    tronquee = r.stop_reason === 'max_tokens'
    // LE TARIF DU MODÈLE APPELÉ, À L'HEURE DE L'APPEL, CACHE COMPRIS.
    const tarif = tarifDe(tarifsDuModele(config, MODELE_LEGER), new Date())
    const usage = r.usage as { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null }
    suivi.jetonsEntree = usage.input_tokens
    suivi.jetonsCache = usage.cache_read_input_tokens ?? 0
    suivi.jetonsSortie = usage.output_tokens
    suivi.tronquee = tronquee
    coutUsd = coutAppel({ entree: suivi.jetonsEntree, entreeCache: suivi.jetonsCache, sortie: suivi.jetonsSortie }, tarif)
    suivi.coutUsd = coutUsd
  } catch (erreur) {
    console.error('[retouche] appel', erreur)
    suivi.issue = 'interrompue'
    return NextResponse.json(
      { error: 'Le modèle n’a pas répondu. Votre application n’a pas changé.', coutUsd: 0 },
      { status: 502 },
    )
  }

  // ── UNE RÉPONSE COUPÉE NE SE LIVRE PAS, ET NE SE REJOUE PAS.
  //
  // Elle arrive AVANT la lecture des fichiers : ce qu'une réponse
  // tronquée contient ressemble à des fichiers valides jusqu'au dernier,
  // qui s'arrête au milieu d'une ligne. `lireFichiers` le rendrait sans
  // broncher, et la fusion l'écrirait par-dessus le bon.
  //
  // ON NE RÉESSAIE PAS EN ESPÉRANT MIEUX : la même demande sur la même
  // application coupera au même endroit, et aura coûté deux fois.
  //
  // MESURÉ LE 2026-11-04 : 2,86 octets par jeton de sortie (médiane sur
  // 17 générations réelles). Avec `SORTIE_MAX_RETOUCHE = 16 000`, une
  // réponse porte au plus ~45 800 octets — contre une médiane d'œuvre à
  // 49 525 octets. Le plafond n'est pas lointain : il est déjà là.
  // (Écrit à 16 000. Depuis le point 2 — 65 536 jetons —, ~187 000 octets.)
  if (tronquee) {
    return NextResponse.json(
      {
        error:
          'Cette modification touche trop de fichiers à la fois pour être faite ' +
          'd’un coup. Découpez-la en deux demandes. Votre application n’a pas changé.',
        tronquee: true,
        coutUsd,
      },
      { status: 409 },
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

  // ── `systeme/` EST FERMÉ À LA RÉÉCRITURE (2026-11-18).
  //
  // Ces fichiers sont la bibliothèque de Deribfy, partagée par toutes les
  // applis. On REFUSE plutôt que d'écarter le fichier en silence : le code
  // de l'appli peut dépendre de ce que le modèle y a changé, et l'écarter
  // livrerait un code amputé de sa moitié.
  const systemeTouche = rendus.map((f) => f.chemin).filter((c) => c.startsWith('systeme/'))
  if (systemeTouche.length > 0) {
    return NextResponse.json(
      {
        error:
          'Cette modification voulait réécrire des composants fournis par Deribfy ' +
          `(${systemeTouche.join(', ')}), qui ne se modifient pas depuis une appli. ` +
          'Reformulez la demande sur ce que vous voulez voir à l’écran. Votre application n’a pas changé.',
        coutUsd,
      },
      { status: 409 },
    )
  }

  // ── LA FUSION : un fichier rendu REMPLACE l'ancien, les autres ne bougent
  // pas. C'est ce qui rend la retouche moins risquée qu'une régénération.
  const apres = new Map(avant)
  for (const f of rendus) apres.set(f.chemin, f.contenu)

  // ── LA DÉCLARATION QUE LA MODIFICATION APPORTE (M4, 2026-11-05).
  //
  // Le périmètre est ouvert : une modification peut avoir besoin d'une
  // donnée de plus. Elle la DÉCLARE, dans la même grammaire que la
  // génération — `DONNEES.json`, retiré des fichiers livrés.
  const declaration = lireDeclarationEnRoute(
    apres,
    (e: unknown) => projectAirSchema.shape.entities.element.safeParse(e).success,
  )
  // ── LA COULEUR NE PASSE PAS PAR LE CODE (surcharge de thème, 2026-11-18).
  //
  // `APPARENCE.json` est retiré des fichiers livrés, validé (format, et
  // lisibilité du texte blanc des boutons), puis porté par le DOCUMENT : la
  // page l'injecte au service. Une couleur refusée l'est AVEC sa raison.
  const lueApparence = lireApparenceEnRoute(declaration.fichiers)
  if (lueApparence.refus !== null) {
    return NextResponse.json(
      { error: `Cette couleur n’a pas été appliquée : ${lueApparence.refus}. Votre application n’a pas changé.`, coutUsd },
      { status: 409 },
    )
  }
  const apparenceApres: Apparence | null = lueApparence.apparence ?? apparenceDuDocument(docAvant)
  const fichiersLivres = lueApparence.fichiers
  const entitesAvant = declarationDe(docAvant)
  // ── UNE SEULE FUSION, ET SES PERTES VOYAGENT.
  //
  // Elle était appelée QUATRE FOIS avec les mêmes arguments. Depuis qu'elle
  // rend aussi ce qu'elle refuse de prendre, quatre appels rendraient quatre
  // fois les mêmes pertes — et trois d'entre elles se perdraient.
  const fusion =
    declaration.entites.length > 0
      ? fusionnerEntites(entitesAvant, declaration.entites)
      : { entites: entitesAvant, pertes: [] }
  // ── CE QUE LA DÉCLARATION N'A PAS OBTENU SE DIT (défaut A).
  //
  // Refus du contrat, pertes de la fusion, fichier illisible : aucun des
  // trois n'était lu ici. Ils ne bloquent pas à eux seuls — le juge des
  // colonnes refuse la version si le code écrit ce qui manque — mais ils
  // partent à l'écran dans tous les cas.
  const brutDeclaration = apres.get(FICHIER_DECLARATION)
  let illisible = false
  if (brutDeclaration !== undefined) {
    try { JSON.parse(brutDeclaration) } catch { illisible = true }
  }
  const declarationRejetee = phraseDeclarationRejetee({
    illisible, refus: declaration.refus, pertes: fusion.pertes,
  })
  if (declarationRejetee !== null) console.warn('[retouche] déclaration rejetée', declarationRejetee)
  const plan = comparerDeclarations(entitesAvant, fusion.entites)
  // ── UN ARRÊT DE M1 NE SE DISCUTE PAS, ET NE SE CONFIRME PAS.
  //
  // Une table abandonnée, un type changé, une unicité ajoutée : ce sont
  // les gestes qui perdent des données. On ne les propose pas à
  // l'approbation — on les refuse, et on dit laquelle.
  if (!plan.peutAvancer) {
    return NextResponse.json(
      { error: phraseArret(plan) ?? 'Cette modification toucherait à vos données.', coutUsd },
      { status: 409 },
    )
  }

  // ── L'ASSEMBLAGE EST LE PREMIER JUGE : du code qui ne compile pas ne
  // mérite pas qu'on fasse tourner les autres.
  const bundle = await assembler(fichiersLivres)
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

  // ── LES SIX JUGES, SUR L'AVANT ET SUR L'APRÈS.
  //
  // La couverture se compare sur son TAUX, pas sur un comptage
  // d'exigences : l'ancien `exigences.length` ne bougeait jamais — il
  // comptait ce que le CAHIER demande, qu'une retouche ne change pas.
  // Il était donc un contrôle qui ne pouvait pas rougir.
  const contexte = {
    demande,
    entites: declarationDe(docAvant),
    devise:
      typeof (docAvant as { configuration?: { currency?: unknown } } | null)?.configuration
        ?.currency === 'string'
        ? ((docAvant as { configuration: { currency: string } }).configuration.currency)
        : undefined,
  }
  const noteAvant = await noter(avant, { ...contexte, colonnes: contexte.entites })
  const noteApres = await noter(fichiersLivres, { ...contexte, colonnes: fusion.entites })
  const verdict = comparerJuges(noteAvant.notes, noteApres.notes, {
    avant: noteAvant.taux,
    apres: noteApres.taux,
  })

  if (verdict.regressions.length > 0) {
    const quoi = verdict.regressions
      .map((r) => `${r.juge} : ${String(r.avant)} → ${String(r.apres)}`)
      .join(', ')
    return NextResponse.json(
      {
        error: verdict.regressions.some((x) => x.juge === 'colonnes inexistantes')
          // LA DONNÉE NOMMÉE, DANS LES MOTS DU COMMERÇANT — pas un compteur.
          ? `Cette modification abîmerait votre application : ${phraseColonnes(colonnesNouvelles(avant, contexte.entites, fichiersLivres, fusion.entites))}. Je ne l’ai pas appliquée.${declarationRejetee === null ? '' : ` ${declarationRejetee}`}`
          : `Cette modification abîmerait votre application (${quoi}). Je ne l’ai pas appliquée.`,
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

  // ── CE QUI VA ARRIVER AUX DONNÉES SE DIT AVANT, EN FRANÇAIS.
  //
  // Pas le SQL : les utilisateurs sont des commerçants. Leur montrer une
  // migration, c'est leur demander d'approuver ce qu'ils ne peuvent pas
  // lire — ils approuveraient toujours, et l'approbation ne vaudrait
  // rien.
  //
  // ET LA PHRASE VIENT DU PLAN MESURÉ, jamais d'un texte du modèle.
  // L'affaire Replit tient en une ligne : les données ÉTAIENT
  // récupérables, et c'est l'agent qui a affirmé le contraire.
  let instantaneAvant: Instantane | null = null
  if (plan.ajouts.length > 0) {
    instantaneAvant = await instantaneDeLOeuvre(id)
    // ── LE FILET NE VOIT PAS : ON REFUSE (2026-11-18). Sans instantané,
    // l'ancienne forme sautait la migration et livrait quand même une
    // version qui écrit dans une colonne inexistante.
    if (instantaneAvant === null) {
      return NextResponse.json({ error: PHRASE_COMPTAGE_IMPOSSIBLE, coutUsd }, { status: 409 })
    }
    const phrase =
      instantaneAvant === null ? null : phraseAvantMigration(plan, instantaneAvant)
    if (phrase !== null && !confirme) {
      // ── L'ÉTAT CALCULÉ SE RANGE, IL NE SE JETTE PAS.
      //
      // Le modèle a déjà travaillé et déjà été payé. Perdre son travail
      // pour le redemander à l'identique serait faire payer deux fois la
      // prudence qu'on impose.
      const rangAttente = await rangSuivant(id)
      const enAttente: VersionDocument = {
        forme: 'document',
        enAttente: true,
        fichiers: Object.fromEntries(declaration.fichiers),
        nom: typeof lu.data.nom === 'string' ? lu.data.nom : null,
        coutUsd: Number(coutUsd.toFixed(4)),
        schema: emettreSchemaSql([...fusion.entites]),
        politiques: emettrePolitiquesSql([...fusion.entites], id),
        entites: [...fusion.entites],
        ...(apparenceApres === null ? {} : { apparence: apparenceApres }),
      }
      const pose = await supabaseAdmin.from(TABLE_VERSIONS).insert({
        generation_id: id,
        rang: rangAttente,
        etape: `EN ATTENTE DE VOTRE ACCORD — ${etapeRetouche(demande)}`,
        cout_usd: Number(coutUsd.toFixed(4)),
        etat: enAttente,
      })
      if (pose.error !== null) {
        suivi.issue = 'ecriture_echouee'
        return NextResponse.json(
          { error: 'La modification n’a pas pu être mise de côté. Réessayez.', coutUsd },
          { status: 502 },
        )
      }
      return NextResponse.json(
        { aConfirmer: true, message: phrase, migration: true, rang: rangAttente, coutUsd },
        { status: 409 },
      )
    }
  }

  // ── LA MIGRATION S'APPLIQUE AVANT L'ÉCRITURE.
  //
  // Si elle échoue, le document n'a pas bougé : l'application sert
  // encore sa version d'avant, et les données sont intactes. L'inverse
  // laisserait un document qui parle de colonnes que la base n'a pas.
  const entitesApres = fusion.entites
  let schemaApres = schemaPrecedent
  let politiquesApres = politiquesPrecedentes
  let apresMigration: string | null = null
  if (plan.ajouts.length > 0) {
    schemaApres = emettreSchemaSql([...entitesApres])
    politiquesApres = emettrePolitiquesSql([...entitesApres], id)
    // UNE ŒUVRE NON PUBLIÉE N'A PAS DE SCHÉMA À MIGRER : son SQL partira
    // entier à la publication. On ne migre que ce qui existe.
    if (instantaneAvant !== null) {
      const m = emettreMigrationSql(plan, entitesApres, id)
      if (m.refus.length > 0) {
        return NextResponse.json(
          {
            error:
              'Cette modification demande un changement de données que nous ne ' +
              'savons pas faire sans risque. Votre application n’a pas changé.',
            coutUsd,
          },
          { status: 409 },
        )
      }
      const applique = await appliquerMigration({
        schema: nomSchemaOeuvre(id),
        sql: m.sql,
        env: process.env,
      })
      if (!applique.ok) {
        return NextResponse.json(
          {
            error:
              'Le changement de données n’a pas pu être appliqué. Votre ' +
              'application n’a pas changé et vos données sont intactes.',
            motif: applique.motif,
            coutUsd,
          },
          { status: 409 },
        )
      }
      // ── ET CE QUI S'EST PASSÉ SE DIT AVEC LES NOMBRES QU'ON A COMPTÉS.
      //
      // Pas une narration : l'instantané d'avant et celui d'après, côte à
      // côte. Si quelqu'un doute, il relit deux `count(*)`.
      const instantaneApres = await instantaneDeLOeuvre(id)
      apresMigration =
        instantaneApres === null
          ? null
          : phraseApresMigration(plan, instantaneAvant, instantaneApres)
    }
  }

  // ── ET SEULEMENT MAINTENANT ON ÉCRIT. La version D'ABORD : si elle
  // échoue, le document courant n'a pas bougé.
  const rang = await rangSuivant(id)
  // ── LE SCHEMA SUIT LA RETOUCHE, IL NE DISPARAIT PAS AVEC ELLE.
  //
  // DEFAUT ATTRAPE A L'ECRITURE DU LOT D2 : cette route ecrit une version
  // neuve et REMPLACE la colonne `document`. Sans ces deux lignes, la
  // premiere retouche d'une oeuvre effacait son schema -- le zip serait
  // reparti en « aucune donnee declaree » alors que l'oeuvre en declarait.
  //
  // Une retouche change des textes, des couleurs, un champ sur un ecran qui
  // existe : par definition elle ne redeclare AUCUNE donnee. Le schema de
  // la version precedente est donc exactement le bon.
  const version: VersionDocument = {
    forme: 'document',
    fichiers: Object.fromEntries(fichiersLivres),
    nom: typeof lu.data.nom === 'string' ? lu.data.nom : null,
    coutUsd: Number(coutUsd.toFixed(4)),
    schema: schemaApres,
    politiques: politiquesApres,
    ...(apparenceApres === null ? {} : { apparence: apparenceApres }),
  }
  const ecrit = await supabaseAdmin.from(TABLE_VERSIONS).insert({
    generation_id: id,
    rang,
    etape: etapeRetouche(demande),
    cout_usd: Number(coutUsd.toFixed(4)),
    etat: version,
  })
  if (ecrit.error !== null) {
    suivi.issue = 'ecriture_echouee'
    return NextResponse.json(
      { error: 'La modification n’a pas pu être enregistrée. Votre application n’a pas changé.', coutUsd },
      { status: 502 },
    )
  }

  const maj = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .update({
      document: {
        // LES FICHIERS LIVRÉS, comme la version — `apres` portait encore
        // `DONNEES.json` (et aurait porté `APPARENCE.json`) dans l'appli.
        fichiers: Object.fromEntries(fichiersLivres),
        schema: schemaApres,
        politiques: politiquesApres,
        entites: entitesApres,
        ...(apparenceApres === null ? {} : { apparence: apparenceApres }),
      },
      version_courante: rang,
    })
    .eq('id', id)
    .eq('owner_id', proprietaire)
  if (maj.error !== null) {
    suivi.issue = 'ecriture_echouee'
    return NextResponse.json(
      { error: 'La version est enregistrée mais l’application n’a pas changé — réessayez.', coutUsd },
      { status: 502 },
    )
  }

  // LA PURGE RELIT LES RANGS : `rangSuivant` ne les rend plus, et les
  // recalculer ici évite de porter une liste à travers trente lignes.
  const tousRangs = await supabaseAdmin
    .from(TABLE_VERSIONS)
    .select('rang')
    .eq('generation_id', id)
  const aPurger = rangsAPurger(
    (tousRangs.data ?? []).map((x: { rang: number }) => Number(x.rang)),
  )
  if (aPurger.length > 0) {
    await supabaseAdmin.from(TABLE_VERSIONS).delete().eq('generation_id', id).in('rang', aPurger)
  }

  return NextResponse.json(
    { ok: true,
      // CE QUI EST ARRIVÉ AUX DONNÉES, AVEC LES NOMBRES COMPTÉS.
      ...(apresMigration === null ? {} : { migration: apresMigration }), rang, fichiers: rendus.map((f) => f.chemin), coutUsd: Number(coutUsd.toFixed(4)),
      // ── UNE DIMENSION NON MESURÉE N'EST PAS UNE DIMENSION SAINE.
      //
      // `comparerJuges` ne pouvait pas comparer la couverture : elle valait
      // `null` avant comme après. Sans ce drapeau, son silence se lisait
      // comme « pas de régression » — et l'écran l'aurait répété.
      couvertureNonMesuree: verdict.couvertureNonMesuree,
      ...(lueApparence.apparence === null ? {} : { couleur: lueApparence.apparence.couleur }),
      ...(declarationRejetee === null ? {} : { declarationRejetee }) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
