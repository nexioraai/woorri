import 'server-only'
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
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { PHRASE_COMPTEUR_INDISPONIBLE, PHRASE_CREATION_OCCUPEE, reserverCreation, solderCreation } from '@/lib/apps/quota'
import { sansQuota } from '@/lib/admin-emails'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '@/lib/apps/journal'
import { regenerationOuverte } from '@/lib/apps/regeneration'
import { alerter } from '@/lib/alertes'
import { moteurChoisi } from '@/lib/apps/interrupteur-moteur'
import { DOMAINE_PUBLIC, TEMOIN_GENERIQUE } from '@/lib/apps/sous-domaine'
import { boucleEcriture, consignePour, pageAutonome } from '@/lib/apps/boucle-directe'
import {
  emettrePolitiquesSql,
  emettreSchemaSql,
  type EntiteDonnees,
} from '@deribfy/compiler'
import { projectAirSchema } from '@deribfy/air-schema'
import { lireEntites } from '@/lib/apps/entites-declarees'
import { FUSIBLE_SIGNES, lectureAEnregistrer } from '@/lib/apps/lecture-brief'
import { deploiementQuiSert } from '@/lib/apps/deploiement'
import { ecrireTentative, type Issue } from '@/lib/apps/tentatives'
import { NOTE_EPROUVEE_PARTIELLEMENT, NOTE_JUGE_INDISPONIBLE } from '@/lib/apps/notes-internes'
import { nomProduitValide, TITRE_SANS_NOM } from '@/lib/apps/nom-produit'
import { TEMOIN_FICHIERS } from '@/lib/apps/temoin-sonde'
import { rangsAPurger, type VersionDocument } from '@/lib/apps/versions-oeuvre'
import { proportionEprouvee } from '@/lib/apps/portee-epreuve'
import { appelerFournisseur, CONFIGS, fournisseurChoisi, tarifDe } from '@/lib/apps/fournisseur'
import { assembler } from '@/lib/apps/bac-a-sable'
import { jugerExecution } from '@/lib/apps/juge-execution'

export const runtime = 'nodejs'
// ── QUINZE MINUTES, ET C'EST UNE CONSÉQUENCE DU PLAFOND, PAS UN CONFORT.
//
// Trois tours à 65 536 jetons font environ neuf minutes dans le pire cas
// (350 jetons/seconde, mesuré). 300 secondes auraient coupé la requête AVANT
// le modèle — on aurait remplacé une borne par une autre, et le propriétaire
// aurait encore payé pour un échec sans réponse.
export const maxDuration = 900

/**
 * LA BOUCLE TOURNE AU TEMPS (2026-11-16, docs/elite-protocol/PLAN_TOURS_AU_TEMPS.md).
 *
 * Échéance = `maxDuration` − 60 s de marge pour les juges du dernier tour et
 * l'écriture (mesuré hors tours : 0 à 5 s ; un juge d'exécution : 15 s au plus).
 * Le plafond de coût (0,50 $) est une décision du propriétaire : une génération
 * réussie coûte 0,09 à 0,10 $ ; il laisse passer une boucle qui progresse et
 * coupe celle qui s'emballe.
 */
const ECHEANCE_MS = (maxDuration - 60) * 1000
const PLAFOND_USD_GENERATION = 0.5
/** Fenêtres de contexte, documentation officielle relevée le 2026-11-16 :
 *  DeepSeek « CONTEXT LENGTH 1M » (api-docs.deepseek.com/quick_start/pricing). */
const FENETRE_CONTEXTE: Readonly<Record<string, number>> = { deepseek: 1_000_000 }




/**
 * ── LA SONDE DE CETTE FONCTION — « tu dois savoir aussi », appliqué ICI.
 *
 * MESURÉ LES 2026-10-31 01:02 ET 08:18 : deux tirs payés (0,45 $ au total)
 * sont morts dans CETTE fonction sur « react non embarqué » — pendant que
 * /p/[jeton] assemblait LA MÊME œuvre, avec les MÊMES imports, dans la
 * sienne. Deux fonctions, deux disques : le vert de la sonde générale ne
 * dit RIEN de celui-ci, et c'est exactement ainsi que 0,45 $ sont partis
 * contre un mur qu'aucun contrôle ne regardait.
 *
 * Ce GET assemble un témoin DANS la fonction du tir payant et photographie
 * le disque réel (cwd, node_modules présents ou non). AUCUN MODÈLE n'est
 * appelé : zéro centime, à n'importe quelle fréquence. Même porte que la
 * sonde générale : le secret des crons — un geste qui coûte du processeur
 * ne s'offre pas à l'anonyme.
 */
// Le témoin vit dans son propre module (lib/apps/temoin-sonde.ts) : il se
// monte lui-même, comme une vraie œuvre, et sa chaîne porte une API de
// navigateur que la route n'appelle jamais.

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { existsSync, readdirSync } = await import('node:fs')
  const { join } = await import('node:path')
  const cwd = process.cwd()
  const present = (p: string) => existsSync(p)
  const lister = (p: string) => {
    try {
      return readdirSync(p).slice(0, 60)
    } catch {
      return null
    }
  }
  // ── LA SONDE MONTE UNE VRAIE ŒUVRE, PAS UN TÉMOIN.
  //
  // Exigence du propriétaire, 2026-10-31 : « ta sonde prouve que le chemin
  // du témoin fonctionne — pas tous les chemins. Une vraie application, avec
  // du balisage plus riche, peut réclamer un de ces fichiers de données que
  // le témoin n'a jamais fait charger. » Juste : le témoin monte deux
  // balises ; une œuvre réelle en monte des centaines et visite ses écrans.
  // On prend donc la DERNIÈRE ŒUVRE LIVRÉE en base. Coût : zéro appel de
  // modèle, une lecture. Repli sur le témoin si la base n'en a pas — et la
  // réponse DIT laquelle a servi : une preuve qui ne dit pas sur quoi elle
  // porte n'est pas une preuve.
  // ── COMBIEN D'ŒUVRES ? Par défaut une ; `?oeuvres=N` en monte plusieurs.
  //
  // Le plafond du juge d'exécution doit être calibré sur la LAMBDA, pas sur
  // une machine de développement — et quatre mesures d'UNE SEULE œuvre ne
  // suffisent pas : il faut le pire cas réel, la plus grosse comprise.
  // Chaque montage coûte zéro appel de modèle : une lecture et un processus.
  const combien = Math.min(
    Math.max(1, Number(new URL(req.url).searchParams.get('oeuvres') ?? '1') || 1),
    8,
  )
  const lues = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('id, document')
    .eq('statut', 'livree')
    .order('created_at', { ascending: false })
    .limit(combien)
  const oeuvres = (lues.data ?? [])
    .map((l) => ({
      nom: `œuvre ${String(l.id).slice(0, 8)}`,
      fichiers: new Map(
        Object.entries((l.document as { fichiers?: Record<string, string> } | null)?.fichiers ?? {}),
      ) as ReadonlyMap<string, string>,
    }))
    .filter((o) => o.fichiers.size > 0)
  if (oeuvres.length === 0) oeuvres.push({ nom: 'témoin', fichiers: TEMOIN_FICHIERS })

  // Chaque œuvre est montée à son tour ; la réponse porte le détail ET le
  // PIRE CAS, puisque c'est de lui que le plafond doit venir.
  const mesures: {
    surQuoi: string
    octets: number
    utilisable: boolean
    monteDansSimulateur: boolean
    ms: number
    visites: number
    decouverts: number
    ecrans: number
  }[] = []
  for (const o of oeuvres.slice(1)) {
    const a = await assembler(o.fichiers)
    if (!a.ok) continue
    const j = await jugerExecution(a.code)
    mesures.push({
      surQuoi: o.nom,
      octets: a.code.length,
      utilisable: j.indisponible === undefined,
      monteDansSimulateur: j.monteDansSimulateur,
      ms: j.ms,
      // LE DENOMINATEUR SE DIT TOUJOURS, ici aussi : la sonde rapportait
      // « visites undefined » alors que le juge, lui, comptait — ma propre
      // regle enfreinte a l'endroit ou elle compte le plus (mesure en
      // production le 2026-10-31).
      visites: j.ecransVisites ?? 0,
      decouverts: j.ecransDecouverts ?? 0,
      ecrans: j.ecransDistincts ?? 0,
    })
  }

  const surQuoi = oeuvres[0]!
  const v = await assembler(surQuoi.fichiers)
  // ── LE JUGE D'EXÉCUTION TOURNE-T-IL DANS LA VRAIE FONCTION ?
  //
  // Le cliquet EP-302 ⑦ refuse qu'une route INJECTE un faux juge — c'est une
  // garantie de CONSTRUCTION. Mais le juge lance un PROCESSUS (spawn, drapeaux
  // de permission, simulateur de DOM) : rien ne dit qu'une lambda le permette,
  // et s'il échoue il se déclare « indisponible »... en silence. Ce serait la
  // classe « vert local, mort en ligne » rouverte sur le juge lui-même.
  // Exigence du propriétaire : que la sonde l'atteste DANS la fonction réelle.
  const execution = v.ok
    ? await jugerExecution(v.code)
    : { monteDansSimulateur: false, indisponible: 'témoin inassemblable', ms: 0, erreurs: [], octetsRendus: 0, texte: '' }
  // ── LE CNAME GÉNÉRIQUE EST-IL TOUJOURS VIVANT ? (2026-11-01)
  //
  // Publier n'écrit plus de DNS : tout repose sur l'enregistrement `*` de
  // la zone. S'il disparaît — un ménage, une migration —, toutes les
  // publications futures cesseront de résoudre, et PERSONNE ne l'apprendra
  // avant qu'un client clique sur un lien mort. On interroge donc un nom
  // JAMAIS CRÉÉ : s'il résout, le générique vit. Un commentaire pour qui
  // lit le code, un contrôle ROUGE pour qui ne le lit pas.
  //
  // ET ON VA JUSQU'À LA POIGNÉE DE MAIN TLS, pas seulement la résolution :
  // si Vercel cessait d'émettre les certificats à la demande, les adresses
  // résoudraient et échoueraient en TLS — et une sonde qui s'arrête au DNS
  // dirait vert. Mesuré le 2026-11-01 sur un nom neuf : TLS 0 en vingt
  // secondes, donc l'exiger n'est pas une rigueur abstraite.
  const temoinGenerique = `${TEMOIN_GENERIQUE}.${DOMAINE_PUBLIC}`
  let generiqueResout = false
  let generiqueTls = false
  let generiqueDetail = ''
  try {
    const { resolveCname } = await import('node:dns/promises')
    const cibles = await resolveCname(temoinGenerique)
    generiqueResout = cibles.some((c) => c.includes('vercel-dns'))
    generiqueDetail = cibles.join(', ')
  } catch (e) {
    generiqueDetail = e instanceof Error ? e.message.slice(0, 120) : String(e)
  }
  if (generiqueResout) {
    try {
      // Un nom jamais publié rend 404 — et c'est un SUCCÈS : la réponse
      // prouve que le certificat a été accepté. Seul l'échec TLS compte.
      const t = await fetch(`https://${temoinGenerique}/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(12_000),
      })
      generiqueTls = true
      generiqueDetail += ` · HTTP ${String(t.status)}`
    } catch (e) {
      generiqueDetail += ` · TLS ÉCHOUE : ${e instanceof Error ? e.message.slice(0, 90) : String(e)}`
    }
  }

  // EP-306 : les deux reglages peuvent diverger chez l'hebergeur, et alors
  // l'ecran frappe a une porte que le serveur a fermee. Les deux portes
  // refusent bien, donc rien ne depense — mais l'impasse serait MUETTE, et
  // un defaut de configuration qui ne se raconte pas se decouvre par un
  // acheteur. La sonde le dit.
  const serveurBrut = process.env.GENERATEUR_MOTEUR
  const etat = {
    serveur: moteurChoisi(serveurBrut),
    serveurPresente: serveurBrut !== undefined,
  }
  return NextResponse.json(
    {
      interrupteur: etat,
      generique: {
        vivant: generiqueResout && generiqueTls,
        resout: generiqueResout,
        tls: generiqueTls,
        temoin: temoinGenerique,
        detail: generiqueDetail,
      },
      // Le détail par œuvre, et le pire cas — la base du plafond (EP-302).
      ...(mesures.length === 0
        ? {}
        : {
            mesures,
            pireCasMs: Math.max(...mesures.map((m) => m.ms), 0),
          }),
      execution: {
        surQuoi: surQuoi.nom,
        octets: v.ok ? v.code.length : 0,
        visites: execution.ecransVisites ?? 0,
        decouverts: execution.ecransDecouverts ?? 0,
        ecrans: execution.ecransDistincts ?? 0,
        utilisable: execution.indisponible === undefined,
        monteDansSimulateur: execution.monteDansSimulateur,
        // Le mot dit ce qu'il mesure : happy-dom, pas un navigateur.
        verifieDansNavigateur: false,
        ms: execution.ms,
        ...(execution.indisponible === undefined ? {} : { indisponible: execution.indisponible }),
        ...(execution.erreurs.length === 0 ? {} : { erreurs: execution.erreurs.slice(0, 3) }),
      },
      assemblage: v.ok
        ? { ok: true, ms: v.ms, octets: v.code.length }
        : { ok: false, ms: v.ms, erreur: v.erreur },
      cwd,
      disque: {
        'cwd/node_modules/react': present(join(cwd, 'node_modules', 'react', 'package.json')),
        'cwd/node_modules/react-dom': present(join(cwd, 'node_modules', 'react-dom', 'package.json')),
        'cwd/node_modules/scheduler': present(join(cwd, 'node_modules', 'scheduler', 'package.json')),
        'cwd/node_modules/rolldown': present(join(cwd, 'node_modules', 'rolldown', 'package.json')),
        'cwd/apps/web/node_modules/react': present(
          join(cwd, 'apps', 'web', 'node_modules', 'react', 'package.json'),
        ),
        '/var/task/node_modules/react': present('/var/task/node_modules/react/package.json'),
        '/var/task/apps/web/node_modules/react': present(
          '/var/task/apps/web/node_modules/react/package.json',
        ),
      },
      racine: lister(cwd),
      paquets: lister(join(cwd, 'node_modules')),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

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

  // ── « RÉGÉNÉRER » A SON PROPRE INTERRUPTEUR, FERMÉ PAR DÉFAUT (2026-11-16).
  //
  // Le serveur est l'autorité : sans ce refus, la pause ne fermait que le
  // bouton, et une requête forgée avec `?id=` régénérait encore. Le refus
  // tombe AVANT la clé, le corps et tout appel payant. Sans `?id=`, rien ne
  // change ici (lib/apps/regeneration.ts).
  if (
    (new URL(req.url).searchParams.get('id') ?? '') !== '' &&
    !regenerationOuverte(process.env.NEXT_PUBLIC_REGENERATION_OUVERTE)
  ) {
    return NextResponse.json(
      { error: 'La régénération est fermée pour le moment.' },
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

  const corps = (await req.json().catch(() => ({}))) as {
    demande?: unknown
    configuration?: unknown
    nom?: unknown
  }
  // ── RÉGÉNÉRER : LA MÊME DEMANDE, SUR LA MÊME LIGNE (lot 1, 2026-11-01).
  //
  // Avec `?id=`, on ne crée pas une œuvre neuve : on en écrit une VERSION de
  // plus. La demande vient alors de la LIGNE, pas du corps — c'est la même
  // demande qui a produit la version précédente, sinon « régénérer » ne
  // régénérerait rien, il générerait autre chose.
  //
  // SANS `?id=`, ABSOLUMENT RIEN NE CHANGE : c'est le chemin qui porte tout
  // l'argent de la maison, et il a déjà été cassé une fois aujourd'hui.
  const idExistant = new URL(req.url).searchParams.get('id') ?? ''
  // ── LES DONNÉES DÉCLARÉES — REVALIDÉES ICI, pas crues (lot D1).
  //
  // `lire-brief` les a déjà jugées, mais ce qui arrive ici vient du
  // NAVIGATEUR : une requête forgée contourne l'écran. L'invariant du dépôt
  // s'applique — un contrôle fait en amont ne dispense jamais celui qui
  // écrit en base. C'est la même leçon que la devise, transmise en EUR sur
  // une plateforme tchadienne le 2026-10-31 parce que l'écran validait et
  // que la route faisait confiance.
  //
  // Et c'est ce tableau qui nourrit `schema.sql` : une entité forgée
  // deviendrait une table dans le fichier qu'on livre.
  const schemaEntite = projectAirSchema.shape.entities.element
  const entitesDeclarees = lireEntites(
    (corps as { entites?: unknown }).entites,
    (e) => schemaEntite.safeParse(e).success,
  ).entites

  // ── CE QUE LA BOUCLE A APPRIS EN CONSTRUISANT (2026-11-04).
  //
  // Le cahier amorce la liste ; le constructeur l'AJUSTE au moment où il
  // dessine. La consigne du tour SUIVANT doit donc voir la table que le
  // tour précédent vient de déclarer — sinon on lui reproche un écran sans
  // base tout en continuant à lui dire qu'il n'en a pas.
  let entitesCourantes = entitesDeclarees

  // ── LE RÉSULTAT DE LA LECTURE DU BRIEF, ÉCRIT POUR CHAQUE GÉNÉRATION (M6).
  // 34 sur 34 sans trace. Écrit en succès ET en échec ; absent, il s'écrit
  // `non_transmise` — voir lib/apps/lecture-brief.ts.
  const lectureBrief = lectureAEnregistrer((corps as { lectureBrief?: unknown }).lectureBrief, entitesDeclarees.length)
  // ── LE DÉPLOIEMENT QUI SERT, ÉCRIT DANS CHAQUE LIGNE (étape 2, 2026-11-13).
  // « Déploiement d'origine INCONNU » sur la ligne c4522e43 : plus jamais.
  // Même dérivation que /api/version — voir lib/apps/deploiement.ts.
  const deploiement = deploiementQuiSert(process.env)

  let demande = typeof corps.demande === 'string' ? corps.demande.trim() : ''
  let nomExistant: string | null = null
  if (idExistant !== '') {
    const lu = await supabaseAdmin
      .from(TABLE_GENERATIONS)
      .select('demande, nom')
      .eq('id', idExistant)
      .eq('owner_id', garde.userId)
      .maybeSingle()
    if (lu.error !== null || lu.data === null) {
      return NextResponse.json({ error: 'application inconnue' }, { status: 404 })
    }
    demande = typeof lu.data.demande === 'string' ? lu.data.demande : ''
    nomExistant = typeof lu.data.nom === 'string' ? lu.data.nom : null
  }
  if (demande === '') return NextResponse.json({ error: 'demande requise' }, { status: 400 })
  // ── LE FUSIBLE ANTI-ABUS (G30, 2026-11-13) — de l'ordre du méga-octet,
  // invisible en usage normal, jamais dans l'interface. Un cahier de deux
  // cents pages passe ; un corps de plusieurs méga-octets ne part pas au modèle.
  if (demande.length > FUSIBLE_SIGNES) {
    return NextResponse.json({ error: 'Texte trop volumineux pour ce service.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } })
  }

  // ── LE NOM EST FACULTATIF. IL A ÉTÉ OBLIGATOIRE, ET ÇA A CASSÉ LA
  // PRODUCTION (2026-11-01).
  //
  // J'avais rendu le 400 obligatoire « pour que le trou se voie ». Mesuré
  // sur cinq captures : TROIS chemins appellent `construire` sans nom — le
  // repli quand le pré-vol échoue, son `catch`, et la dernière ligne
  // d'`envoyer`. Chacun recevait 400, l'écran affichait « Donnez un nom à
  // votre application », l'utilisateur retapait, et le pré-vol REPARTAIT DE
  // LA PREMIÈRE QUESTION. Plus personne ne pouvait générer.
  //
  // UNE VALIDATION QUI BLOQUE UN CHEMIN QU'ELLE NE CONTRÔLE PAS N'EST PAS UN
  // CLIQUET, C'EST UNE PANNE. Le nom sans valeur devient `null` : la page
  // retombe sur `TITRE_SANS_NOM` à la lecture, exactement comme les neuf
  // œuvres nées avant ce chantier.
  const verdictNom = nomProduitValide(typeof corps.nom === 'string' ? corps.nom : '')
  const nom = idExistant !== '' ? nomExistant : verdictNom.ok ? verdictNom.nom : null
  // ── LA CONFIGURATION DU PRÉ-VOL VOYAGE AVEC LA DEMANDE (EP-296).
  //
  // Mesuré le 2026-10-31 : l'écran n'envoyait que la demande — la devise
  // validée par EP-293 n'atteignait jamais le moteur, et le tir livré
  // affichait EUR sur une base tchadienne. On ne garde que des champs
  // chaîne : le bloc transmis au modèle est du texte, pas un objet.
  // Le nom rejoint le bloc qui PRIME sur le cahier : le modèle doit
  // l'écrire dans l'application, pas en déduire un autre.
  const configuration: Record<string, string> = nom === null ? {} : { nom_produit: nom }
  if (typeof corps.configuration === 'object' && corps.configuration !== null) {
    for (const [cle, valeur] of Object.entries(corps.configuration as Record<string, unknown>)) {
      if (typeof valeur === 'string' && valeur.trim() !== '' && cle.length <= 40) {
        configuration[cle] = valeur.trim().slice(0, 200)
      }
    }
  }

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
  ) => {
    // LA CONSIGNE EST CELLE DE CETTE OEUVRE : avec entites, le bloc de base
    // REMPLACE la regle des valeurs d'exemple. Les deux ne coexistent jamais.
    const quand = new Date()
    const r = await appelerFournisseur(fournisseur, cle, consignePour(entitesCourantes), messages, signalAppel)
    entree += r.usage.entree
    sortie += r.usage.sortie
    const t = tarifDe(config.prix, quand)
    // LA TRONCATURE VOYAGE AVEC LE TEXTE. La boucle ne peut pas la deviner :
    // un texte coupé ressemble à un texte fautif, et seul le fournisseur sait
    // lequel des deux il vient de rendre. LE COÛT ET LES JETONS D'ENTRÉE
    // voyagent aussi : la boucle en tient son plafond et sa fenêtre.
    return {
      texte: r.texte,
      tronquee: r.tronquee,
      coutUsd: (r.usage.entree * t.entree + r.usage.sortie * t.sortie) / 1e6,
      jetonsEntree: r.usage.entree,
    }
  }
  /** L'interruption de l'appel en cours, armée à l'échéance (posée dans `travailler`). */
  let signalAppel: AbortSignal | undefined

  // L'IDENTITÉ EST CAPTURÉE ICI, hors du flux : à l'intérieur, TypeScript ne
  // sait plus que le garde a répondu `ok` et refuserait de lire `userId`.
  const proprietaire = garde.userId

  // ── TOUT CE QUI SUIT PART EN FLUX, ET CE N'EST PAS UN CONFORT.
  //
  // DÉFAUT MESURÉ EN PRODUCTION LE 2026-10-19. La fonction a travaillé
  // 255 secondes, abouti, et écrit sa ligne. L'écran, lui, avait déjà
  // renoncé : « Lecture impossible ». Le filet du navigateur est à
  // 45 minutes — ce n'est donc pas lui. C'est la connexion, restée SANS UN
  // SEUL OCTET pendant plus de quatre minutes, qu'une couche intermédiaire
  // a fermée.
  //
  // La documentation de l'hébergeur le dit mot pour mot : « HTTP/1.1 clients
  // and intermediate network layers may still close idle connections. For
  // those cases, stream progress or heartbeat data while work is running. »
  //
  // On émet donc un octet toutes les dix secondes. La réponse devient un
  // flux de lignes : des lignes vides pendant le travail, et UNE SEULE ligne
  // JSON à la fin. Un lecteur qui prend la dernière ligne non vide lit aussi
  // bien ce flux qu'une réponse ordinaire — c'est ce qui permet aux refus
  // rapides ci-dessus de rester du JSON simple.
  // ── UNE APPLI GRATUITE PAR COMPTE (étape ② du quota, 2026-11-19).
  //
  // Réservée AVANT le travail payé : la ligne de l'œuvre ne s'écrit qu'à la
  // fin, deux créations lancées ensemble passeraient toutes les deux sans
  // cette réservation (prouvé : 6 simultanées → 1 sans verrou… 2 ou 3).
  // Soldée à la fin du flux : livrée avec l'appli, sinon libérée — une
  // création échouée ne compte pas. Comptes exemptés : jamais comptés.
  let reservationCreation: string | null = null
  if (idExistant === '' && !sansQuota(garde.email)) {
    const r = await reserverCreation(garde.userId)
    if (!r.ok) {
      return NextResponse.json(
        { error: r.raison === 'occupee' ? PHRASE_CREATION_OCCUPEE : PHRASE_COMPTEUR_INDISPONIBLE, creationOccupee: r.raison === 'occupee' },
        { status: r.raison === 'occupee' ? 402 : 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    reservationCreation = r.id
  }

  const encodeur = new TextEncoder()
  const flux = new ReadableStream<Uint8Array>({
    async start(bouche) {
      const battement = setInterval(() => {
        try {
          bouche.enqueue(encodeur.encode('\n'))
        } catch {
          // Le lecteur est parti : le travail continue, la ligne sera écrite.
        }
      }, 10_000)
      try {
        const fin = await travailler()
        if (reservationCreation !== null) {
          const livree = fin.ok === true && typeof fin.id === 'string'
          await solderCreation(reservationCreation, proprietaire, livree ? 'livree' : 'liberee', livree ? (fin.id as string) : null)
        }
        bouche.enqueue(encodeur.encode(JSON.stringify(fin)))
      } catch (e: unknown) {
        if (reservationCreation !== null) await solderCreation(reservationCreation, proprietaire, 'liberee', null)
        const message = e instanceof Error ? e.message : String(e)
        bouche.enqueue(
          encodeur.encode(JSON.stringify({ ok: false, error: message.slice(0, 200) })),
        )
      } finally {
        clearInterval(battement)
        bouche.close()
      }
    },
  })

  return new Response(flux, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      // SANS CECI, UN PROXY PEUT TOUT GARDER EN TAMPON et ne rien relâcher
      // avant la fin — ce qui annulerait exactement le battement qu'on vient
      // de poser.
      'X-Accel-Buffering': 'no',
    },
  })

  /** Le travail lui-même, inchangé — il rend l'objet que le flux publiera. */
  async function travailler() {
  const debut = Date.now()
  // ── CHAQUE TENTATIVE LAISSE SA LIGNE, ET ELLE N'EST JAMAIS RÉÉCRITE
  // (manque 4, 2026-11-15 — docs/elite-protocol/PLAN_MANQUE4.md).
  //
  // Une tentative non écrite ne fait pas échouer la génération (même
  // décision que pour les versions : l'œuvre payée prime sur sa trace),
  // mais elle n'est jamais muette : journal du serveur ET alerte.
  const consignerTentative = async (t: {
    generationId: string
    issue: Issue
    versionRang: number | null
    coutUsd: number
    tirages: number
    diagnostics: readonly string[]
    trace: Record<string, unknown>
  }): Promise<void> => {
    const r = await ecrireTentative(supabaseAdmin as unknown as Parameters<typeof ecrireTentative>[0], {
      generationId: t.generationId,
      nature: idExistant !== '' ? 'regeneration' : 'generation',
      issue: t.issue,
      debut: new Date(debut),
      fin: new Date(),
      versionRang: t.versionRang,
      fournisseur,
      deploiement,
      coutUsd: t.coutUsd,
      jetonsEntree: entree,
      jetonsSortie: sortie,
      tirages: t.tirages,
      diagnostics: t.diagnostics,
      trace: t.trace,
    }).catch((e: unknown) => ({ ok: false as const, cause: e instanceof Error ? e.message : String(e) }))
    if (!r.ok) {
      console.error(`[tentatives] tentative ${t.issue} non ecrite pour ${t.generationId} — ${r.cause}`)
      await alerter({
        sujet: 'oeuvre',
        sujetId: t.generationId,
        motif: `trace : tentative « ${t.issue} » non écrite`,
        etape: 'ecriture',
        detail: r.cause,
        coutUsd: Number(t.coutUsd.toFixed(4)),
      }).catch(() => undefined)
    }
  }
  let resultat
  // ── L'APPEL EST INTERROMPU À L'ÉCHÉANCE + 30 s : la tentative est alors
  // écrite par le chemin d'erreur, au lieu que Vercel tue la fonction à
  // 900 s sans laisser de trace.
  const interrupteur = new AbortController()
  signalAppel = interrupteur.signal
  const minuterie = setTimeout(() => { interrupteur.abort() }, Math.max(0, debut + ECHEANCE_MS + 30_000 - Date.now()))
  try {
    // LES ENTITES VONT AU JUGE DE PERSISTANCE : une table absente du code
    // rendu est precisement ce qu'il cherche, donc elle ne peut pas s'en
    // deduire. Elle vient du cahier, par la valeur qui a bati la consigne.
    resultat = await boucleEcriture({
      demande,
      configuration,
      appeler,
      // ── LA BOUCLE TOURNE AU TEMPS (2026-11-16, PLAN_TOURS_AU_TEMPS.md).
      echeance: debut + ECHEANCE_MS,
      plafondUsd: PLAFOND_USD_GENERATION,
      fenetreContexte: FENETRE_CONTEXTE[fournisseur],
      sortieMax: config.maxJetons,
      entites: entitesDeclarees,
      // LA MÊME GRAMMAIRE QUE LA LECTURE DU CAHIER, jamais une seconde :
      // deux validateurs divergeraient, et la divergence se découvrirait
      // sur une table posée de travers, en production.
      validerEntite: (e) => schemaEntite.safeParse(e).success,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    // ── UNE GÉNÉRATION QUI JETTE NE LAISSAIT AUCUNE TRACE (2026-11-04).
    //
    // Mesuré sur la panne de 15:36 UTC : la personne a vu « terminated »
    // en anglais, et il n'y avait RIEN. Pas de ligne au journal — ce
    // `return` précède l'écriture — pas de ligne dans les logs, pas
    // d'alerte. Le modèle avait peut-être été appelé et facturé ; on ne
    // peut même pas le dire.
    //
    // Les quatre autres sorties de cette route écrivent leur ligne. Celle
    // qui compte le plus, celle où ça casse, était la seule muette.
    //
    // ON ÉCRIT D'ABORD, ON PRÉVIENT ENSUITE — même ordre que l'alerte :
    // une ligne écrite survit à un canal de notification en panne.
    console.error(`[direct] la boucle a jete apres ${String(Date.now() - debut)} ms — ${message}`)
    try {
      // L'ERREUR RENDUE EST LUE (2026-11-15) : `supabase-js` ne lève pas,
      // le `catch` ci-dessous ne voyait donc jamais une insertion refusée.
      const trace = await supabaseAdmin.from(TABLE_GENERATIONS).insert({
        owner_id: proprietaire,
        demande,
        moteur: 'direct',
        ok: false,
        statut: 'refusee',
        duree_ms: Date.now() - debut,
        diagnostics: [`la construction a ete interrompue — ${message.slice(0, 300)}`],
        sections_acquises: { lectureBrief, deploiement },
      }).select('id').maybeSingle()
      if (trace.error !== null) {
        console.error(`[direct] trace de l'echec non ecrite dans ${TABLE_GENERATIONS} — ${trace.error.message}`)
      }
      // LA CARTE « refusee » CI-DESSUS EST GARDÉE (décision du propriétaire,
      // 2026-11-15) ; la tentative, elle, va à l'ŒUVRE quand c'est une
      // régénération — c'est là qu'on la cherchera.
      const rattachement =
        idExistant !== '' ? idExistant : typeof trace.data?.id === 'string' ? trace.data.id : ''
      if (rattachement !== '') {
        const tarifEchec = tarifDe(config.prix, new Date())
        await consignerTentative({
          generationId: rattachement,
          issue: 'interrompue',
          versionRang: null,
          coutUsd: (entree * tarifEchec.entree + sortie * tarifEchec.sortie) / 1e6,
          tirages: 0,
          diagnostics: [`la construction a ete interrompue — ${message.slice(0, 300)}`],
          trace: { lectureBrief, deploiement, configuration, erreur: message.slice(0, 2_000) },
        })
      }
    } catch {
      /* le journal peut manquer ; l'alerte, elle, doit partir quand meme */
    }
    await alerter({
      sujet: 'oeuvre',
      motif: `la boucle d’ecriture a jete apres ${String(Date.now() - debut)} ms`,
      etape: 'modele',
      detail: `${message}\n\nDemande : ${demande.slice(0, 400)}`,
    }).catch(() => undefined)
    return { ok: false as const, error: message.slice(0, 200) }
  } finally {
    clearTimeout(minuterie)
  }
  // ── CE QUE LA BOUCLE A APPRIS REMPLACE CE QU'ELLE A REÇU.
  //
  // Sans cette ligne, `declaration-en-route` serait le CINQUIÈME module
  // prouvé sans appelant de ce dépôt : la boucle déclarerait la table, et
  // le schéma s'émettrait quand même depuis la liste d'entrée.
  if (resultat.ok) entitesCourantes = resultat.entites
  const dureeMs = Date.now() - debut

  // ── LE SCHEMA DES DONNEES DE L'OEUVRE (lot D2, 2026-11-02).
  //
  // LA COUTURE OU LE LOT D1 SE BRANCHERA, et aujourd'hui elle rend la
  // verite : AUCUNE entite n'est declaree, donc le schema le DIT au lieu
  // d'etre vide ou absent. Un fichier vide laisserait croire a une base
  // sans tables ; un fichier absent, que Deribfy n'en produit pas.
  //
  // Deriver les entites des fichiers rendus est IMPOSSIBLE, pas seulement
  // risque : `unique`, `required` et une relation entre entites n'existent
  // nulle part dans du React. On obtiendrait un schema valide et FAUX.
  // C'est pourquoi D1 les fait DECLARER avant les ecrans, pas deduire apres.
  // ── ÉMIS DEPUIS CE QUE LA BOUCLE SAIT, PAS DEPUIS CE QU'ELLE A REÇU.
  //
  // Émettre depuis l'entrée perdrait exactement les tables que le
  // constructeur a découvert devoir exister — et l'application repartirait
  // sans la base de l'écran qu'elle vient de dessiner. C'est le défaut du
  // 2026-11-04, et c'est sa fermeture.
  const schemaDeLOeuvre = emettreSchemaSql(entitesCourantes)
  // LA PORTE SE DÉRIVE DES MÊMES ENTITÉS. Sans rôles ni droits fins, il n'y
  // a rien à déduire des écrans : une politique par table, toujours la même.
  //
  // ── ET L'IDENTIFIANT DE L'OEUVRE SE DECIDE ICI, PAS A L'INSERTION.
  //
  // La porte CUIT cet identifiant : le jeton devra porter
  // `app_metadata.oeuvre = <id>` pour la franchir. Il faut donc le connaitre
  // AVANT d'emettre les politiques, donc avant d'ecrire la ligne.
  //
  // La colonne garde son `default gen_random_uuid()` : on ne la contredit
  // pas, on la precede. C'est le seul moyen que le document et la base
  // portent le MEME identifiant -- sinon la porte d'une oeuvre nommerait une
  // autre oeuvre, et personne n'entrerait jamais.
  //
  // ── UNE RÉGÉNÉRATION GARDE L'IDENTIFIANT DE L'ŒUVRE (2026-11-15).
  //
  // Défaut prouvé (docs/elite-protocol/PREUVE_REGENERATION.md) : un UUID
  // neuf était tiré À CHAQUE génération, puis écrit par `update` sur
  // l'ANCIENNE ligne — la clé primaire changeait. Les versions restaient
  // rattachées à l'ancien identifiant, que plus aucune ligne ne portait :
  // aperçu 404, historique vide, retour impossible.
  //
  // La raison d'être de l'identifiant tiré ici reste entière — la porte le
  // cuit, le schéma publié (`nomSchemaOeuvre`) et les comptes
  // (`app_metadata.oeuvre`) le portent. C'est précisément pourquoi une
  // régénération doit cuire l'identifiant EXISTANT : un identifiant neuf
  // fermerait la porte à tous les comptes déjà ouverts sur cette œuvre.
  const idOeuvre = idExistant !== '' ? idExistant : randomUUID()
  const politiquesDeLOeuvre = emettrePolitiquesSql(entitesCourantes, idOeuvre)

  // ── LE TARIF DE L'HEURE OÙ L'APPEL A EU LIEU (2026-11-02).
  //
  // Le dépôt ne portait qu'un couple de prix, et c'était celui HORS POINTE.
  // Toute génération tombée dans une fenêtre de pointe — 01:00-04:00 et
  // 06:00-10:00 UTC, du lundi au vendredi — a donc été enregistrée à la
  // MOITIÉ de son coût réel.
  const tarif = tarifDe(config.prix, new Date())
  const coutUsd = (entree * tarif.entree + sortie * tarif.sortie) / 1e6

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
    // L'IDENTIFIANT EST FOURNI, PAS ATTENDU : la porte le porte deja.
    id: idOeuvre,
    owner_id: proprietaire,
    demande,
    ...(nom === null ? {} : { nom }),
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
    diagnostics: resultat.ok
      ? [
          ...(resultat.execution !== null &&
          resultat.execution.indisponible === undefined &&
          (resultat.execution.ecransDecouverts ?? 0) > (resultat.execution.ecransVisites ?? 0)
            ? [
                NOTE_EPROUVEE_PARTIELLEMENT +
                  proportionEprouvee(
                    resultat.execution.ecransVisites ?? 0,
                    resultat.execution.ecransDecouverts ?? 0,
                    resultat.execution.ecransDistincts ?? 0,
                  ),
              ]
            : []),
          ...(resultat.execution !== null && resultat.execution.indisponible !== undefined
            ? [
                NOTE_JUGE_INDISPONIBLE + ' : cette application ' +
                  'n a PAS ete eprouvee (' +
                  resultat.execution.indisponible.slice(0, 120) +
                  ')',
              ]
            : []),
          ...(resultat.execution !== null &&
          resultat.execution.indisponible === undefined &&
          !resultat.execution.monteDansSimulateur
            ? [
                'L’application ne se monte pas (simulateur) : ' +
                  (resultat.execution.erreurs[0]?.message ?? 'cause inconnue'),
              ]
            : []),
          ...(resultat.jetons.length > 0
            ? [
                `${String(resultat.jetons.length)} jeton(s) inexistant(s) — l’application peut mourir au démarrage : ` +
                  [...new Set(resultat.jetons.map((d) => d.reference))].slice(0, 6).join(', '),
              ]
            : []),
          ...(resultat.vivacite.length > 0
            ? [`${String(resultat.vivacite.length)} contrôle(s) sans action — voir le rapport de vivacité`]
            : []),
          ...(resultat.dates.length > 0
            ? [`${String(resultat.dates.length)} date(s) qui peuvent s’afficher décalées d’un jour : ` +
                [...new Set(resultat.dates.map((d) => d.fichier))].slice(0, 6).join(', ')]
            : []),
          ...(resultat.couverture.absentes.length > 0
            ? [
                'Couverture partielle, non déclarée : ' +
                  resultat.couverture.absentes.map((e) => e.exigence).join(', '),
              ]
            : []),
          // ── ET LE CAS OÙ LE JUGE N'A RIEN PU MESURER SE CONSIGNE AUSSI.
          //
          // Il rendait `taux: 1` — couverture parfaite sans avoir rien
          // regarde. Un tir relu dans trois mois lirait 1,00 et conclurait
          // que cette oeuvre couvrait son cahier. On l'ecrit donc LA OU
          // l'enregistrement vit, pas seulement a l'ecran.
          ...(resultat.couverture.taux === null
            ? [
                'Couverture NON MESUREE : la demande ne contient aucune des ' +
                  'familles d exigences reconnues — ce controle n a rien verifie',
              ]
            : []),
          // ── ET CE QUI RESTE EN MEMOIRE SE DIT, parce que c'est le seul
          //    defaut dont la consequence tombe APRES la livraison.
          //
          // Les jetons tuent au demarrage, un controle mort se voit, une
          // couverture partielle se lit. Une table en memoire, elle, marche
          // a l'ecran : c'est le rechargement qui l'apprend, a la personne
          // qui vient de perdre sa saisie. Donc on le dit MAINTENANT.
          ...(resultat.persistance.length > 0
            ? [
                // ── LE CAS « AUCUNE TABLE » NE SE DIT PAS COMME LES AUTRES.
                //
                // MESURÉ SUR L'ŒUVRE 60bf2c40 (2026-11-04, 18:52) : le
                // diagnostic stocké était
                //
                //     « DONNEES NON CONSERVEES — …  (ni lue ni ecrite) »
                //
                // avec un nom de table VIDE, parce que le verdict
                // sentinelle de `jugerPersistance` n'en porte pas. La
                // seule trace de ce défaut en journal n'apprenait donc
                // rien à qui la lisait.
                resultat.persistance.length === 1 && resultat.persistance[0]?.table === ''
                  ? 'DONNEES NON CONSERVEES — cette application veut se souvenir ' +
                    'et n’a AUCUNE table : ce qui y est saisi disparait au rechargement'
                  : 'DONNEES NON CONSERVEES — ce qui y est saisi disparait au ' +
                    'rechargement : ' +
                    resultat.persistance
                      .map(
                        (d) =>
                          `${d.table} (${d.lue ? 'lue, jamais ecrite' : d.ecrite ? 'ecrite, jamais lue' : 'ni lue ni ecrite'})`,
                      )
                      .join(', '),
              ]
            : []),
        ]
      : [resultat.motif],
    // La colonne `document` porte l'oeuvre. Ici l'oeuvre est du CODE, pas un
    // document AIR : on range les fichiers, qui sont ce qui se recompile.
    //
    // ── ET LE SCHEMA DES DONNEES Y VOYAGE AVEC EUX (lot D2, 2026-11-02).
    //
    // Un livrable de premier rang, pas un effet de bord : versionne avec les
    // fichiers, donc un retour en arriere ramene le code ET le schema qui lui
    // correspond. Les separer aurait produit du code d'hier sur des tables
    // d'aujourd'hui, sans moyen de savoir laquelle des deux a bouge.
    document: resultat.ok
      ? {
          fichiers: Object.fromEntries(resultat.fichiers),
          schema: schemaDeLOeuvre,
          politiques: politiquesDeLOeuvre,
          // ── LA DÉCLARATION VOYAGE AVEC L'ŒUVRE (M4 a, 2026-11-04).
          //
          // MESURÉ AVANT D'ÉCRIRE : le document ne portait que trois
          // clés — `fichiers`, `politiques`, `schema`. Le SQL émis,
          // jamais les entités qui l'ont produit. Il n'y avait donc RIEN
          // à montrer au modèle le jour d'une modification.
          //
          // Sans elle, il réinvente ses identifiants, toutes les tables
          // paraissent abandonnées, et M1 arrête SYSTÉMATIQUEMENT. Le
          // piège ne casse rien : il rend toute modification impossible.
          entites: entitesCourantes,
          // ── ET LA CONFIGURATION AVEC (b, 2026-11-04).
          //
          // MESURÉ : `sections_acquises.configuration` vaut `{}` sur les
          // œuvres existantes. Le juge de devise de la RETOUCHE n'avait
          // donc rien à comparer — il aurait été inerte, comme la
          // couverture l'était en recevant zéro écran.
          //
          // Un juge inerte est pire qu'un juge absent : son zéro se lit
          // comme « aucun défaut ».
          configuration,
        }
      : null,
    // ── LE DÉTAIL DE CHAQUE TOUR, ET LE BRUT DU DERNIER ESSAI.
    //
    // DÉFAUT MESURÉ LE 2026-10-18 : le premier tir direct a échoué en
    // 63 secondes pour 4 centimes, et la ligne ne portait que « Non convergé
    // en 3 tours ». Impossible de dire si DeepSeek écrivait mal, si le
    // plafond de 8 192 jetons tronquait, ou si mon lecteur ne savait pas lire
    // sa forme de réponse.
    //
    // Un échec qu'on ne sait pas lire est un échec qu'on repaiera pour
    // comprendre. Le brut est borné à 20 000 caractères : assez pour voir la
    // forme, pas assez pour gonfler la ligne.
    sections_acquises: {
      configuration,
      lectureBrief,
      deploiement,
      tours: resultat.tours,
      // EP-297 : les deux juges accompagnent toute œuvre acceptée. Sans eux,
      // « livrée » redevient un mot sans mesure — le défaut fondateur.
      jetons: resultat.ok ? resultat.jetons : null,
      execution: resultat.ok ? resultat.execution : null,
      vivacite: resultat.ok ? resultat.vivacite : null,
      couverture: resultat.ok ? resultat.couverture : null,
      persistance: resultat.ok ? resultat.persistance : null,
      dernierTexte: resultat.ok ? null : resultat.dernierTexte.slice(0, 20_000),
    },
  }
  // ── UNE ŒUVRE NEUVE S'INSÈRE ; UNE RÉGÉNÉRATION MET À JOUR.
  //
  // La version, elle, s'AJOUTE dans les deux cas — c'est ce qui rend le
  // retour possible, et c'est pourquoi l'ancienne version n'est jamais
  // écrasée : elle garde ses fichiers, intacts.
  //
  // ── UNE RÉGÉNÉRATION QUI ÉCHOUE NE TOUCHE PAS À L'ŒUVRE (2026-11-15).
  //
  // La boîte de confirmation promet : « La version actuelle est conservée ».
  // Elle ne l'était pas : la charge d'échec portait `document: null` et
  // `statut: refusee`, et l'œuvre livrée disparaissait de l'écran.
  //
  // ── ET ELLE N'Y TOUCHE PLUS DU TOUT (manque 4, 2026-11-15).
  //
  // Le correctif du matin n'écrivait plus que la trace de la tentative sur
  // la ligne : observé ensuite (PLAN_MANQUE4.md §1.3), la ligne disait
  // « livrée » avec le coût et le journal de l'ÉCHEC. Décision du
  // propriétaire : en échec, la ligne de l'œuvre n'est plus touchée. Elle
  // porte toujours la mesure de la tentative qui a produit son `document` ;
  // l'échec vit dans sa tentative, et nulle part ailleurs.
  const tracePourTentative = ligne.sections_acquises as unknown as Record<string, unknown>
  if (idExistant !== '' && !resultat.ok) {
    await consignerTentative({
      generationId: idExistant,
      issue: 'non_convergee',
      versionRang: null,
      coutUsd,
      tirages: resultat.tours.length,
      diagnostics: ligne.diagnostics,
      trace: tracePourTentative,
    })
    const phraseEchec =
      resultat.raison === 'bloquant'
        ? `${resultat.motif} (${String(Math.round(dureeMs / 1000))} s)`
        : `${resultat.motif} Le code produit ne s'est pas assemblé ` +
          `(${String(resultat.tours.length)} essai(s), ${String(Math.round(dureeMs / 1000))} s).`
    return { ok: false as const, error: phraseEchec, motif: phraseEchec, tours: resultat.tours, coutUsd, dureeMs }
  }
  const charge: Record<string, unknown> = ligne
  const ecrit =
    idExistant === ''
      ? await supabaseAdmin.from(TABLE_GENERATIONS).insert(charge).select('id').maybeSingle()
      : await supabaseAdmin
          .from(TABLE_GENERATIONS)
          .update(charge)
          .eq('id', idExistant)
          .eq('owner_id', proprietaire)
          .select('id')
          .maybeSingle()

  // ── L'ÉCRITURE EST LUE, PLUS SEULEMENT LANCÉE (2026-11-15).
  //
  // `supabase-js` NE LÈVE PAS sur une contrainte violée : il REND
  // `{ error }`. Cette route ne regardait jamais la valeur rendue — une
  // écriture refusée (par `app_generations_publie_a_document`, par exemple)
  // passait pour réussie, et l'écran annonçait une version qui n'existait
  // nulle part. Zéro ligne touchée sans erreur (ligne d'un autre, ou
  // supprimée entre-temps) est le même échec : rien n'a été enregistré.
  if (ecrit.error !== null || ecrit.data === null) {
    const cause = ecrit.error?.message ?? 'aucune ligne écrite'
    console.error(`[direct] ecriture refusee dans ${TABLE_GENERATIONS} (${idOeuvre}) — ${cause}`)
    await alerter({
      sujet: 'oeuvre',
      sujetId: idOeuvre,
      motif: 'la génération a abouti mais sa ligne n’a pas pu être écrite',
      etape: 'ecriture',
      detail: cause,
      coutUsd: Number(coutUsd.toFixed(4)),
    }).catch(() => undefined)
    // L'ŒUVRE EXISTE (régénération) : sa tentative peut s'écrire, et c'est
    // la seule trace de ce qui a été payé. Une œuvre neuve refusée n'a pas
    // de ligne à laquelle se rattacher : l'alerte ci-dessus est sa trace.
    if (idExistant !== '') {
      await consignerTentative({
        generationId: idExistant,
        issue: 'ecriture_echouee',
        versionRang: null,
        coutUsd,
        tirages: resultat.tours.length,
        diagnostics: [`ecriture refusee — ${cause.slice(0, 300)}`, ...ligne.diagnostics],
        trace: tracePourTentative,
      })
    }
    const phrase =
      'Le résultat n’a pas pu être enregistré. ' +
      (idExistant !== '' ? 'Votre version actuelle n’a pas été modifiée.' : 'Rien n’a été conservé.')
    return { ok: false as const, error: phrase, motif: phrase, coutUsd, dureeMs }
  }

  // ── LA LIVRAISON EST UNE VERSION, ET C'EST CE QUI REND L'ANNULATION
  // POSSIBLE (lot 1 de la modification, 2026-11-01).
  //
  // Mesuré avant d'écrire : les deux œuvres livrées par ce moteur avaient
  // ZÉRO version. `app_generation_versions` ne servait qu'au pipeline AIR,
  // et son `etat` ne porte pas les fichiers — donc rien vers quoi revenir.
  //
  // UNE VERSION S'AJOUTE, ELLE NE REMPLACE JAMAIS. Ce rang 1 restera intact
  // quoi qu'il arrive ensuite : le rang 1 ne se purge pas (EP-315).
  //
  // ET SON ÉCHEC NE FAIT PAS ÉCHOUER LA LIVRAISON : l'œuvre est payée et
  // écrite ; perdre son historique est regrettable, perdre l'œuvre serait
  // pire. On le DIT en journal plutôt que de le taire.
  //
  // ── CHAQUE ÉCRITURE DE L'HISTORIQUE EST LUE (2026-11-15).
  //
  // Ces écritures ne font toujours pas échouer la livraison (décision
  // ci-dessus, inchangée) — mais une écriture refusée n'est plus muette :
  // elle part au journal du serveur ET en alerte. Et le pointeur ne bouge
  // plus vers un rang qui n'a pas été écrit : l'écran dirait « actuelle »
  // sur une version qui n'existe pas.
  const direEchecHistorique = async (quoi: string, cause: string): Promise<void> => {
    console.error(`[versions] ${quoi} pour ${idOeuvre} — ${cause}`)
    await alerter({
      sujet: 'oeuvre',
      sujetId: idOeuvre,
      motif: `historique : ${quoi}`,
      etape: 'ecriture',
      detail: cause,
    }).catch(() => undefined)
  }
  let versionEcrite: number | null = null
  if (resultat.ok && ecrit.data?.id !== undefined) {
    const version: VersionDocument = {
      forme: 'document',
      fichiers: Object.fromEntries(resultat.fichiers),
      nom,
      coutUsd: Number(coutUsd.toFixed(4)),
      schema: schemaDeLOeuvre,
      politiques: politiquesDeLOeuvre,
    }
    // LE RANG EST LU, PAS SUPPOSÉ : la contrainte d'unicité
    // (generation_id, rang) refuserait un doublon.
    const tous = await supabaseAdmin
      .from(TABLE_VERSIONS)
      .select('rang')
      .eq('generation_id', ecrit.data.id)
    // UN RANG CALCULÉ SUR UNE LECTURE RATÉE SERAIT FAUX : sans les rangs
    // existants, on écrirait « 1 » par-dessus une histoire. On s'arrête.
    if (tous.error !== null) {
      await direEchecHistorique('rangs illisibles, version non écrite', tous.error.message)
    } else {
    const rangsVus = (tous.data ?? []).map((x: { rang: number }) => Number(x.rang))
    const rangNeuf = Math.max(0, ...rangsVus) + 1
    const vEcrit = await supabaseAdmin.from(TABLE_VERSIONS).insert({
      generation_id: ecrit.data.id,
      rang: rangNeuf,
      etape: rangNeuf === 1 ? 'livraison' : 'regeneration',
      cout_usd: Number(coutUsd.toFixed(4)),
      etat: version,
    })
    if (vEcrit.error !== null) {
      await direEchecHistorique(`rang ${String(rangNeuf)} non écrit`, vEcrit.error.message)
    } else {
    versionEcrite = rangNeuf
    // ── LE POINTEUR SUIT LE TRAVAIL (2026-11-02).
    //
    // Sans cette ligne, régénérer DEPUIS une version ancienne laisserait le
    // pointeur en arrière : l'écran dirait « actuelle » sur la version d'où
    // l'on vient, pendant que `document` porte la neuve. Un écran qui dit
    // une chose pendant qu'une autre est vraie — le défaut de la maison.
    //
    // L'HISTORIQUE RESTE LINÉAIRE : la neuve s'ajoute EN FIN de liste et le
    // pointeur s'y place. Pas de branche.
    const pointeur = await supabaseAdmin
      .from(TABLE_GENERATIONS)
      .update({ version_courante: rangNeuf })
      .eq('id', ecrit.data.id)
      .eq('owner_id', proprietaire)
    if (pointeur.error !== null) {
      await direEchecHistorique(`pointeur non déplacé vers le rang ${String(rangNeuf)}`, pointeur.error.message)
    }

    // LA PURGE EN DERNIER, ET LE RANG 1 N'EN FAIT JAMAIS PARTIE (EP-315).
    const aPurger = rangsAPurger([...rangsVus, rangNeuf])
    if (aPurger.length > 0) {
      const purge = await supabaseAdmin
        .from(TABLE_VERSIONS)
        .delete()
        .eq('generation_id', ecrit.data.id)
        .in('rang', aPurger)
      if (purge.error !== null) {
        await direEchecHistorique(`purge des rangs ${aPurger.join(', ')} refusée`, purge.error.message)
      }
    }
    }
    }
  }

  if (typeof ecrit.data?.id === 'string') {
    await consignerTentative({
      generationId: ecrit.data.id,
      issue: resultat.ok ? 'livree' : 'non_convergee',
      versionRang: versionEcrite,
      coutUsd,
      tirages: resultat.tours.length,
      diagnostics: ligne.diagnostics,
      trace: tracePourTentative,
    })
  }

  if (!resultat.ok) {
    // ── `error` EN PLUS DE `motif`, ET CE N'EST PAS DE LA REDONDANCE.
    //
    // DÉFAUT MESURÉ : l'écran a affiché « Lecture impossible » — son repli
    // quand la réponse ne porte NI `error` NI `motif`. La ligne en base, elle,
    // portait bien « Non convergé en 3 tours ». Le message s'est perdu en
    // chemin, et la personne n'a rien appris de son essai payé.
    //
    // Les deux champs portent désormais une phrase lisible : quel que soit
    // celui que l'écran lit, il trouve quelque chose à dire.
    // Un REFUS BLOQUANT dit ce qui s'est passé : ça s'assemblait, ça ne démarrait pas.
    const phrase =
      resultat.raison === 'bloquant'
        ? `${resultat.motif} (${String(Math.round(dureeMs / 1000))} s)`
        : `${resultat.motif} Le code produit ne s'est pas assemblé ` +
          `(${String(resultat.tours.length)} essai(s), ${String(Math.round(dureeMs / 1000))} s).`
    return { ok: false as const, error: phrase, motif: phrase, tours: resultat.tours, coutUsd, dureeMs }
  }

  return {
    ok: true as const,
    id: ecrit.data?.id ?? null,
    html: pageAutonome(resultat.code, nom ?? TITRE_SANS_NOM),
    fichiers: resultat.fichiers.size,
    tours: resultat.tours,
    // EP-297 : le rapport chiffré VOYAGE avec l'œuvre — l'écran le montre,
    // le propriétaire le lit, « livrée » n'est plus un mot sans mesure.
    jetons: resultat.jetons,
    execution: resultat.execution,
    vivacite: resultat.vivacite,
    couverture: resultat.couverture,
    persistance: resultat.persistance,
    coutUsd,
    dureeMs,
  }
  }
}
