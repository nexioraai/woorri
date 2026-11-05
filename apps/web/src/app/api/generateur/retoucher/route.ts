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
  fusionnerEntites,
  lireDeclarationEnRoute,
} from '@/lib/apps/declaration-en-route'
import { comparerDeclarations, phraseArret } from '@/lib/apps/migration-oeuvre'
import { phraseApresMigration, phraseAvantMigration } from '@/lib/apps/phrase-migration'
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
import type { EntiteDeclaree } from '@/lib/apps/entites-declarees'
import { blocDeclaration } from '@/lib/apps/retouche'
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
  },
): Promise<{ notes: NoteJuge[]; taux: number }> {
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
    ],
    taux: couverture.taux,
  }
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
  try {
    const r = await clientIA().messages.create({
      model: MODELE_LEGER,
      max_tokens: SORTIE_MAX_RETOUCHE,
      system: `${CONSIGNE_RETOUCHE}\n\n${blocDeclaration(declarationDe(docAvant))}`,
      messages: [{ role: 'user', content: `${corpus}\n\n=== DEMANDE ===\n${demande}` }],
    })
    texte = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    tronquee = r.stop_reason === 'max_tokens'
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
  const fichiersLivres = declaration.fichiers
  const entitesAvant = declarationDe(docAvant)
  const plan = comparerDeclarations(
    entitesAvant,
    declaration.entites.length > 0
      ? fusionnerEntites(entitesAvant, declaration.entites)
      : entitesAvant,
  )
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
  const noteAvant = await noter(avant, contexte)
  const noteApres = await noter(fichiersLivres, contexte)
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
    const phrase =
      instantaneAvant === null ? null : phraseAvantMigration(plan, instantaneAvant)
    if (phrase !== null && !confirme) {
      return NextResponse.json(
        { aConfirmer: true, message: phrase, migration: true, coutUsd },
        { status: 409 },
      )
    }
  }

  // ── LA MIGRATION S'APPLIQUE AVANT L'ÉCRITURE.
  //
  // Si elle échoue, le document n'a pas bougé : l'application sert
  // encore sa version d'avant, et les données sont intactes. L'inverse
  // laisserait un document qui parle de colonnes que la base n'a pas.
  const entitesApres =
    declaration.entites.length > 0
      ? fusionnerEntites(entitesAvant, declaration.entites)
      : entitesAvant
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
  const tous = await supabaseAdmin.from(TABLE_VERSIONS).select('rang').eq('generation_id', id)
  const rangsVus = (tous.data ?? []).map((x: { rang: number }) => Number(x.rang))
  const rang = Math.max(0, ...rangsVus) + 1
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
    .update({
      document: {
        fichiers: Object.fromEntries(apres),
        schema: schemaApres,
        politiques: politiquesApres,
        entites: entitesApres,
      },
      version_courante: rang,
    })
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
    { ok: true,
      // CE QUI EST ARRIVÉ AUX DONNÉES, AVEC LES NOMBRES COMPTÉS.
      ...(apresMigration === null ? {} : { migration: apresMigration }), rang, fichiers: rendus.map((f) => f.chemin), coutUsd: Number(coutUsd.toFixed(4)) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
