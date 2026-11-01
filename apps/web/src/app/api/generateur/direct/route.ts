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
import { DOMAINE_PUBLIC, TEMOIN_GENERIQUE } from '@/lib/apps/sous-domaine'
import { boucleEcriture, CONSIGNE, pageAutonome } from '@/lib/apps/boucle-directe'
import { nomProduitValide } from '@/lib/apps/nom-produit'
import { proportionEprouvee } from '@/lib/apps/portee-epreuve'
import { appelerFournisseur, CONFIGS, fournisseurChoisi } from '@/lib/apps/fournisseur'
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
const TEMOIN_FICHIERS: ReadonlyMap<string, string> = new Map([
  [
    'index.tsx',
    "import { createRoot } from 'react-dom/client'\n" +
      "import { App } from './App'\n" +
      'export function monter(noeud: Element) {\n' +
      '  createRoot(noeud).render(<App />)\n' +
      '}\n',
  ],
  ['App.tsx', "import { useState } from 'react'\n" +
    'export function App() {\n' +
    '  const [n] = useState(12)\n' +
    '  return <p>témoin {n}</p>\n' +
    '}\n'],
])

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
  const demande = typeof corps.demande === 'string' ? corps.demande.trim() : ''
  if (demande === '') return NextResponse.json({ error: 'demande requise' }, { status: 400 })

  // ── LE NOM DU PRODUIT EST OBLIGATOIRE, ET C'EST LE POINT DU LOT.
  //
  // Il ne reçoit PAS de valeur par défaut. Un défaut est précisément ce qui
  // a produit neuf cartes « Application » : chaque appelant qui n'avait rien
  // à dire disait « application », et personne ne voyait le trou. Ici le
  // trou fait un 400 avec une phrase, donc il se voit tout de suite.
  const verdictNom = nomProduitValide(typeof corps.nom === 'string' ? corps.nom : '')
  if (!verdictNom.ok) return NextResponse.json({ error: verdictNom.erreur }, { status: 400 })
  const nom = verdictNom.nom
  // ── LA CONFIGURATION DU PRÉ-VOL VOYAGE AVEC LA DEMANDE (EP-296).
  //
  // Mesuré le 2026-10-31 : l'écran n'envoyait que la demande — la devise
  // validée par EP-293 n'atteignait jamais le moteur, et le tir livré
  // affichait EUR sur une base tchadienne. On ne garde que des champs
  // chaîne : le bloc transmis au modèle est du texte, pas un objet.
  // Le nom rejoint le bloc qui PRIME sur le cahier : le modèle doit
  // l'écrire dans l'application, pas en déduire un autre.
  const configuration: Record<string, string> = { nom_produit: nom }
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
    const r = await appelerFournisseur(fournisseur, cle, CONSIGNE, messages)
    entree += r.usage.entree
    sortie += r.usage.sortie
    // LA TRONCATURE VOYAGE AVEC LE TEXTE. La boucle ne peut pas la deviner :
    // un texte coupé ressemble à un texte fautif, et seul le fournisseur sait
    // lequel des deux il vient de rendre.
    return { texte: r.texte, tronquee: r.tronquee }
  }

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
        bouche.enqueue(encodeur.encode(JSON.stringify(fin)))
      } catch (e: unknown) {
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
  let resultat
  try {
    resultat = await boucleEcriture({ demande, configuration, appeler })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false as const, error: message.slice(0, 200) }
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
    owner_id: proprietaire,
    demande,
    nom,
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
                'Application PARTIELLEMENT éprouvée : ' +
                  proportionEprouvee(
                    resultat.execution.ecransVisites ?? 0,
                    resultat.execution.ecransDecouverts ?? 0,
                    resultat.execution.ecransDistincts ?? 0,
                  ),
              ]
            : []),
          ...(resultat.execution !== null && resultat.execution.indisponible !== undefined
            ? [
                'Le juge de demarrage n a pas pu s executer : cette application ' +
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
          ...(resultat.couverture.absentes.length > 0
            ? [
                'Couverture partielle, non déclarée : ' +
                  resultat.couverture.absentes.map((e) => e.exigence).join(', '),
              ]
            : []),
        ]
      : [resultat.motif],
    // La colonne `document` porte l'oeuvre. Ici l'oeuvre est du CODE, pas un
    // document AIR : on range les fichiers, qui sont ce qui se recompile.
    document: resultat.ok ? { fichiers: Object.fromEntries(resultat.fichiers) } : null,
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
      tours: resultat.tours,
      // EP-297 : les deux juges accompagnent toute œuvre acceptée. Sans eux,
      // « livrée » redevient un mot sans mesure — le défaut fondateur.
      jetons: resultat.ok ? resultat.jetons : null,
      execution: resultat.ok ? resultat.execution : null,
      vivacite: resultat.ok ? resultat.vivacite : null,
      couverture: resultat.ok ? resultat.couverture : null,
      dernierTexte: resultat.ok ? null : resultat.dernierTexte.slice(0, 20_000),
    },
  }
  const ecrit = await supabaseAdmin.from(TABLE_GENERATIONS).insert(ligne).select('id').maybeSingle()

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
    const phrase =
      `${resultat.motif} Le code produit ne s'est pas assemblé ` +
      `(${String(resultat.tours.length)} essai(s), ${String(Math.round(dureeMs / 1000))} s).`
    return { ok: false as const, error: phrase, motif: phrase, tours: resultat.tours, coutUsd, dureeMs }
  }

  return {
    ok: true as const,
    id: ecrit.data?.id ?? null,
    html: pageAutonome(resultat.code, nom),
    fichiers: resultat.fichiers.size,
    tours: resultat.tours,
    // EP-297 : le rapport chiffré VOYAGE avec l'œuvre — l'écran le montre,
    // le propriétaire le lit, « livrée » n'est plus un mot sans mesure.
    jetons: resultat.jetons,
    execution: resultat.execution,
    vivacite: resultat.vivacite,
    couverture: resultat.couverture,
    coutUsd,
    dureeMs,
  }
  }
}
