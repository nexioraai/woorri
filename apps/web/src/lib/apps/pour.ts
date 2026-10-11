/**
 * LE DOCUMENT D'UNE DEMANDE — UN SEUL ENDROIT, UN SEUL APPEL PAYANT.
 *
 * ── POURQUOI CE FICHIER PLUTÔT QU'UN APPEL DANS CHAQUE ROUTE.
 *
 * Trois routes ont besoin du document : comprendre, voir, télécharger. Si
 * chacune relisait la phrase par P0, une seule application coûterait TROIS
 * appels — pour un résultat qui, en plus, pourrait différer entre l'aperçu et
 * l'archive. Deux defauts pour le prix d'un.
 *
 * `comprendre` lit UNE fois et rend le document. Les deux autres le reçoivent
 * et le REVALIDENT par le schéma strict avant de compiler : ce qui revient du
 * navigateur n'est jamais cru sur parole. Un document trafiqué ne produit rien
 * d'autre que ce que son auteur pouvait déjà demander — et il ne passe que
 * s'il est valide.
 */
import type { ProjectAir } from '@deribfy/air-schema'
import { projectAirSchema } from '@deribfy/air-schema'
import { depenseAutorisee, direCeQuOnACompris, JETON_DEPENSE } from './comprendre'
import { lireLaPhrase } from './emission'
import { emettreApplication } from './moteur'
import { codeEtChemin, journaliser } from './journal'
import { retirerClesInconnues } from './reparation-schema'
import {
  fautesDeProduction,
  perimetre,
  questionsPour,
  texteDe,
  type Diagnostic,
  type Intention,
  type Question,
} from './dialogue'

export type Resultat = {
  readonly document: ProjectAir
  readonly compris: string[]
  readonly parIA: boolean
  /** CE QUE L'UTILISATEUR LIT — en francais ordinaire, jamais un code. */
  readonly echecIA?: string
  /** CE QUE L'ALERTE RECOIT — les codes, les chemins, le detail brut. */
  readonly detailTechnique?: string
  readonly texteLu: string
  /**
   * LIVRE MALGRE UN REFUS — l'etiquette, jamais la peine de mort.
   *
   * Aucun des quatre generateurs comparables ne refuse de livrer : ils
   * rendent l'application et signalent ce qui cloche. Nous etions les seuls
   * a tout detruire — un defaut de qualite rendait ZERO, alors que le
   * document etait compilable. Ce drapeau dit « c'est a vous, mais ce n'est
   * pas parfait », et la liste dit quoi.
   */
  readonly imparfait?: true
}

/**
 * LE MEME FAIT, DEUX DESTINATAIRES.
 *
 * L'ecran affichait « sortie coupee par une borne d'instrument — le tirage a
 * mesure le plafond, pas P0 ». C'est exact, et c'est le vocabulaire du
 * MOTEUR : l'utilisateur ne peut ni le comprendre ni rien en faire.
 *
 * EP-136 pose deja la regle pour les questions — « jamais un code, jamais un
 * chemin de document ». Elle vaut autant pour un echec : le detail part a
 * l'alerte, la phrase reste a l'ecran.
 */
/**
 * CE QU'ON DIT QUAND ON LIVRE QUAND MEME — en francais, jamais un code.
 *
 * Le ton compte : l'application EST a lui. On annonce une reserve, pas un
 * echec. Et on dit combien, parce qu'un « ce n'est pas parfait » sans
 * chiffre laisse imaginer le pire.
 */
export function direLImperfection(defauts: number, retirees: number): string {
  const quoi =
    defauts <= 1
      ? 'un point n’a pas pu être réglé'
      : `${String(defauts)} points n’ont pas pu être réglés`
  const nettoyage =
    retirees === 0
      ? ''
      : retirees === 1
        ? ' Un élément en trop a été retiré pour qu’elle tienne debout.'
        : ` ${String(retirees)} éléments en trop ont été retirés pour qu’elle tienne debout.`
  return `Votre application est prête, mais ${quoi}.${nettoyage} Vous pouvez la prendre telle quelle, ou me dire ce qu’il faut reprendre.`
}

export function direALUtilisateur(diagnostics: Diagnostic[]): string {
  const codes = new Set(diagnostics.map((d) => d.code))
  if (codes.has('P0_SORTIE_TRONQUEE')) {
    return (
      'Votre demande est plus riche que ce que j’ai su traiter d’un seul coup, ' +
      'et ma lecture s’est arrêtée en chemin. C’est de mon côté : je suis prévenu. ' +
      'En attendant, reformulez en deux messages plutôt qu’un.'
    )
  }
  if (codes.has('P0_REPONSE_REFUSEE')) {
    return 'Je n’ai pas pu traiter cette demande. C’est de mon côté : je suis prévenu.'
  }
  return 'Je n’ai pas réussi à lire votre demande correctement. C’est de mon côté : je suis prévenu.'
}

/**
 * CE QU'ON RENVOIE QUAND ON N'A PAS COMPRIS : des QUESTIONS, pas un squelette.
 *
 * « On ne peut pas construire un truc qu'on n'a pas compris. » Tant qu'une
 * question reste ouverte, il n'y a PAS de document dans la reponse — l'ecran
 * n'a donc rien a proposer de construire. L'interdit est structurel, pas une
 * consigne d'affichage qu'un bouton pourrait contourner.
 */
export type Questions = {
  readonly questions: readonly Question[]
  readonly perimetre: readonly string[]
  readonly texteLu: string
  readonly coutUsd?: number
}

/**
 * ON N'A PAS COMPRIS — ET IL N'Y A DONC AUCUN DOCUMENT.
 *
 * ── LE DEFAUT QUE CE TYPE SUPPRIME.
 *
 * Jusqu'ici, un echec de lecture servait quand meme la LECTURE SIMPLE : un
 * squelette tire a l'expression reguliere — « une liste de 8 elements » — avec
 * ses deux boutons. Le proprietaire a donc pu, sur une phrase que le moteur
 * venait de declarer illisible, TELECHARGER une application.
 *
 * C'est mot pour mot ce qui etait interdit : « on peut pas construire un truc
 * qu'on n'a pas compris ». Ma garde regardait « un document existe-t-il ? » —
 * et le repli, lui, EN FABRIQUAIT un. La garde ne gardait rien.
 *
 * Un document ne sort plus que d'une lecture ABOUTIE. Le reste est un refus
 * qui se dit, pas un squelette qui se telecharge.
 */
export type Incompris = {
  readonly incompris: true
  /** En francais ordinaire — jamais un code (EP-136). */
  readonly raison: string
  /** Pour l'alerte seulement. */
  readonly detailTechnique?: string
  readonly texteLu: string
}

/**
 * Le document d'une demande.
 *
 * Avec le jeton de dépense, P0 lit et la structure vient du métier. Sans lui,
 * la lecture simple — qui annonce sa pauvreté. Dans les deux cas, `parIA` sort
 * et l'interface le montre : laisser croire qu'une IA a lu quand c'est une
 * expression régulière serait un mensonge qu'on ne rattrape pas.
 */
/**
 * SAUVER CE QUI PEUT L'ETRE — gratuitement, et sans rien inventer.
 *
 * Deux chances, dans cet ordre :
 *  ① le document passe deja le schema. C'est le cas de TOUT refus de
 *     QUALITE : les juges de fond ne tournent qu'apres `safeParse`, donc
 *     s'ils ont parle, le document est valide — et compilable. On le jetait
 *     sans meme le regarder, parce que la garde exigeait `emission.ok`.
 *  ② il ne passe pas, mais uniquement a cause de cles EN TROP. On les
 *     retire — operation de texte, zero appel — et on rejuge.
 *
 * Tout le reste reste un refus. On ne fabrique jamais une valeur absente.
 */
function sauverLivrable(
  brut: unknown,
): { readonly document: ProjectAir; readonly retirees: readonly string[] } | null {
  if (brut === undefined || brut === null) return null
  const direct = projectAirSchema.safeParse(brut)
  if (direct.success) return { document: direct.data as ProjectAir, retirees: [] }

  const nettoye = retirerClesInconnues(brut, (d) => {
    const r = projectAirSchema.safeParse(d)
    return r.success
      ? { success: true, issues: [] }
      : {
          success: false,
          issues: r.error.issues.map((i) => ({
            code: i.code,
            path: i.path.filter((x): x is string | number => typeof x !== 'symbol'),
            keys: (i as { keys?: string[] }).keys,
          })),
        }
  })
  if (nettoye.retirees.length === 0) return null
  const apres = projectAirSchema.safeParse(nettoye.document)
  return apres.success
    ? { document: apres.data as ProjectAir, retirees: nettoye.retirees }
    : null
}

export async function documentPour(
  intention: Intention,
  /** Qui demande — pour que l'administration sache a qui la depense se
   *  rattache. Absent hors d'une route authentifiee. */
  email?: string | null,
): Promise<Resultat | Questions | Incompris | { erreur: string }> {
  const texteLu = await texteDe(intention)

  if (!depenseAutorisee()) {
    // LA LECTURE SIMPLE NE CONSTRUIT PLUS. Elle tire un nom et un ordre de
    // grandeur d'une expression reguliere ; appeler ca « avoir compris »
    // serait le mensonge que ce fichier existe pour ne pas faire.
    return {
      incompris: true,
      raison:
        'La lecture par IA n’est pas activée sur ce serveur. Sans elle je ne comprends pas ' +
        'votre demande, et je ne construirai donc rien.',
      detailTechnique: `jeton de dépense ${JETON_DEPENSE} absent de l’environnement`,
      texteLu,
    }
  }

  // ── LE MOTEUR A HUIT PASSES, ET PLUS MA DERIVATION.
  //
  // `derivation.ts` — 297 lignes ecrites a la main — rendait un document qui
  // COMPILAIT et ou il ne se passait RIEN. Mesure, marketplace du
  // proprietaire : entites 5, ecrans 8, 72 fichiers — et actions 0, regles 0,
  // capacites 0, intent ABSENT. Les etats de commande, WhatsApp, l'appel
  // direct, le mobile money vivent exactement dans ces quatre champs.
  //
  // ET SURTOUT, LE MOTEUR JUGE. Premier tir reel : refus en P2 sur
  // `DERIVATION_IDENTITE_SANS_SOURCE` et
  // `DERIVATION_CONFIRMATION_SANS_ECRITURE`. Ma derivation n'appelait aucun
  // juge — ce qu'elle produisait n'etait pas meilleur, il etait NON JUGE.
  //
  // UN SEUL CHEMIN PAYANT : le moteur fait lui-meme sa passe P0, avec sa
  // boucle bornee a trois tirages. Appeler `comprendre()` en plus repaierait
  // la lecture a chaque tour.
  const nom = lireLaPhrase(intention.brief).nom
  const depart = Date.now()
  const emission = await emettreApplication(texteLu, nom)

  // ── CHAQUE GENERATION LAISSE UNE LIGNE, REUSSIE OU NON.
  //
  // C'est ce qui remplace le plafond que j'avais pose : on SURVEILLE au lieu
  // d'empecher. Et les refus comptent autant — trois tirages P0 refuses ont
  // coute 0,8209 $ sans rien produire, et c'est precisement la depense qu'il
  // faut voir.
  //
  // `void` : le journal ne doit jamais retarder ni casser une generation.
  // ── LE PARTAGE DES DIAGNOSTICS, CALCULE UNE SEULE FOIS.
  //
  // Il servait plus bas pour decider quoi dire a l'humain ; il sert aussi au
  // journal, pour dire QUI a cause la depense. Le calculer deux fois serait
  // deux verites a tenir d'accord — on le calcule ici, et tout le monde lit
  // le meme. `fautesDeProduction` et `questionsPour` sont gratuits.
  const dg: Diagnostic[] = [
    ...emission.diagnostics,
    ...emission.tirages.flatMap((t) => t.diagnostics.map((code) => ({ code }))),
  ]
  const nos = await fautesDeProduction(dg)

  void journaliser({
    email: email ?? null,
    demande: texteLu,
    nom,
    ok: emission.ok,
    coutUsd: emission.coutUsd,
    dureeMs: Date.now() - depart,
    jetonsEntree: emission.jetons.entree,
    jetonsSortie: emission.jetons.sortie,
    diagnostics: [
      ...new Set([
        ...emission.diagnostics.map(codeEtChemin),
        ...emission.tirages.flatMap((t) => t.diagnostics),
      ]),
    ],
    tirages: emission.tirages.length,
    // CE QUI SURVIT A UN REFUS, memes noms que cote travailleur.
    ...(emission.raison === undefined ? {} : { raison: emission.raison }),
    modele: emission.modele,
    tiragesDetail: emission.tirages,
    tours: (emission as { tours?: readonly unknown[] }).tours,
    // QUI A CAUSE LA DEPENSE. Le code distingue depuis longtemps « nos
    // fautes » de « ses questions » — la distinction ne sortait nulle part.
    // Elle est enregistree : c'est la base de toute facturation juste, le
    // jour ou il y aura des clients a facturer.
    fautesProduction: nos.length,
    defautsTotal: dg.length,
    niveaux: (emission as { niveaux?: unknown }).niveaux,
    // ── LE DOCUMENT PART AU JOURNAL, REFUS COMPRIS. Corrige le 2026-10-10.
    //
    // Cette ligne valait `emission.ok ? emission.document : undefined` : un
    // refus jetait ce que le moteur venait de produire. MESURE ce jour-la,
    // sur la seule ligne du journal : 16,03 $, 53 minutes, 1 252 757 jetons
    // d'entree, `statut = refusee`, `document = null`. Tout le travail
    // detruit a l'instant ou il etait refuse, et donc impossible a
    // examiner, a reparer ou a reprendre — il fallait TOUT repayer.
    //
    // Un refus n'est pas un vide : c'est un produit qu'on n'accepte pas.
    // La contrainte `livree_a_document` ne dit que l'inverse (une ligne
    // LIVREE doit porter un document) ; elle n'a jamais interdit qu'une
    // ligne refusee en porte un. Et `livraison` filtre sur
    // `statut = 'livree'` : un partiel garde ne peut pas etre servi comme
    // une application finie.
    // Le produit du moteur, livre ou non : `journaliser` decide ou le
    // ranger selon `ok`, et il le range comme le travailleur.
    document: emission.document,
  })

  if (emission.ok && emission.document !== undefined) {
    const juge = projectAirSchema.safeParse(emission.document)
    if (juge.success) {
      return {
        document: juge.data as ProjectAir,
        compris: direCeQuOnACompris(emission.modele as Parameters<typeof direCeQuOnACompris>[0]),
        parIA: true,
        texteLu,
      }
    }
  }

  // ── LE MOTEUR A REFUSE, et ses diagnostics se partagent comme les autres
  // (EP-135) : ce que l'humain seul peut trancher devient une QUESTION, le
  // reste est NOTRE faute et part en alerte. Les codes des tirages P0 entrent
  // dans le meme partage — c'est la que vivent les refus de plan.
  const questions = await questionsPour(dg)
  if (questions.length > 0) {
    return { questions, perimetre: await perimetre(dg), texteLu, coutUsd: emission.coutUsd }
  }

  // ── LE JUGE ETIQUETTE AU LIEU D'ANNULER.
  //
  // Mesure du 2026-10-11, les quatre generateurs comparables : AUCUN ne
  // refuse de livrer. Lovable et Bolt rendent l'application et signalent le
  // defaut ; Replit boucle jusqu'a ce que ca passe. Nous etions les seuls a
  // rendre ZERO — et la ligne precedente (`emission.ok && ...`) jetait meme
  // les documents PARFAITEMENT VALIDES, puisqu'elle ne les regardait pas.
  //
  // L'ORDRE COMPTE, et il respecte une regle plus ancienne : une QUESTION
  // passe AVANT. On ne livre pas une application pendant qu'on demande a
  // l'humain de trancher — c'est traite au-dessus, et on n'arrive ici que
  // si les defauts restants sont les NOTRES.
  const sauve = sauverLivrable(emission.document)
  if (sauve !== null) {
    return {
      document: sauve.document,
      compris: direCeQuOnACompris(emission.modele as Parameters<typeof direCeQuOnACompris>[0]),
      parIA: true,
      imparfait: true,
      echecIA: direLImperfection(nos.length, sauve.retirees.length),
      detailTechnique:
        `livre MALGRE refus · ${emission.raison ?? 'emission refusee'} · ` +
        `${String(nos.length)} defaut(s) de production · ` +
        `${sauve.retirees.length === 0 ? 'aucune cle retiree' : `cles retirees : ${sauve.retirees.join(', ')}`}`,
      texteLu,
    }
  }

  return {
    incompris: true,
    raison: direALUtilisateur(dg),
    detailTechnique:
      `${emission.raison ?? 'émission refusée'} · ${String(nos.length)} défaut(s) de production : ` +
      // ── LE CHEMIN, PAS SEULEMENT LE CODE. Corrige le 2026-10-10.
      //
      // Le type de l'alerte promet « les codes, LES CHEMINS, le detail brut »
      // (voir plus haut) ; cette ligne ne passait que les codes. L'alerte
      // recue ce jour-la disait « 3 defaut(s) de production : SCHEMA » —
      // trois fois le meme mot, et aucune indication de l'endroit. Un code
      // sans chemin ne permet de reparer RIEN : il faut savoir OU le schema
      // a casse. Mesure : 16,03 $ de refus impossible a instruire.
      `${[
        ...new Set(
          nos.map((d) => (d.path === undefined ? (d.code ?? '?') : `${d.code ?? '?'} @ ${d.path}`)),
        ),
      ].join(', ')} · ${emission.coutUsd.toFixed(4)} $`,
    texteLu,
  }
}

/**
 * Un document venu du navigateur, revalidé.
 *
 * `null` si rien n'a été fourni — l'appelant relit alors la phrase. Rejeté
 * s'il ne passe pas le schéma STRICT : le contrôle sémantique rendait « 0
 * erreur » sur un document que le schéma refusait, et je l'ai pris une fois
 * pour une preuve.
 */
export function documentFourni(brut: unknown): ProjectAir | null {
  if (brut === null || brut === undefined) return null
  const juge = projectAirSchema.safeParse(brut)
  return juge.success ? (juge.data as ProjectAir) : null
}
