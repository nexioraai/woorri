/**
 * COMPRENDRE UNE DEMANDE — LA PREMIERE PASSE, CELLE QUI LIT.
 *
 * ── CE QU'ELLE FAIT.
 *
 * Elle transforme « je veux une application de tontine pour mon quartier » en
 * FAITS du metier : les acteurs, les concepts et leurs attributs, les
 * relations, les parcours, les etats. Pas une application — les faits dont une
 * application se deduit.
 *
 * ── POURQUOI ELLE EXISTE A COTE DE `emission.ts`.
 *
 * `emission.ts` lit la phrase avec des expressions regulieres. Elle en tire un
 * nom et un ordre de grandeur, et elle DIT qu'elle ne devine rien d'autre.
 * C'est honnete et c'est pauvre.
 *
 * Ici, c'est un modele qui lit. Il comprend « tontine » : des membres, des
 * cotisations, un ordre de passage. La difference n'est pas de degre.
 *
 * ── CE QUE J'AI REFUSE DE FAIRE, ET IL FAUT LE DIRE.
 *
 * Le depot possede une chaine complete — P0 PUIS cinq appels structures qui
 * produisent l'AIR. Les cinq sont enfermes dans `emit-v3.mjs`, un script qui
 * s'EXECUTE au chargement : 624 lignes a extraire, dans l'artefact qui a
 * produit le corpus de reference, ET SANS MOYEN DE VERIFIER l'extraction sans
 * lancer des appels payants.
 *
 * P0, lui, est DEJA un module pur, exporte et SCELLE par une empreinte. On
 * prend donc ce qui est deja sorti, et l'extraction des cinq parties reste une
 * decision separee, avec sa taille annoncee.
 *
 * ── LA DEPENSE NE SE PRESUME PAS (EP-018).
 *
 * Un appel payant exige un jeton explicite dans l'environnement. C'est la
 * regle du depot — `dry-run-p0.mjs` refuse de partir sans
 * `GO_DRY_RUN_P0="OUI-15-CENTIMES"` — et elle vaut ici aussi. Sans le jeton,
 * cette fonction REFUSE ; elle ne se degrade pas en silence vers autre chose.
 */
// ── POURQUOI LE SDK EST IMPORTÉ ICI, ET PAS PRIS DANS L'ADAPTATEUR.
//
// L'adaptateur a une fonction `creerClient` qui fait `await import(
// "@anthropic-ai/sdk")`. Je l'appelais. En local : vert. EN LIGNE : mort —
//   « Cannot find package 'standardwebhooks' imported from
//     /var/task/node_modules/@anthropic-ai/sdk/resources/beta/webhooks.mjs »
//
// L'adaptateur est chargé en `webpackIgnore`, donc le bundler ne voit PAS son
// import du SDK. Je compensais en traçant `node_modules/@anthropic-ai/sdk/**`
// — et un fichier TRACÉ est copié comme une DONNÉE : le traceur ne lit pas ses
// `import`. Le SDK dépend de six paquets. Aucun n'est parti.
//
// J'avais ÉCRIT cette règle, en toutes lettres, dans le commentaire juste
// au-dessus de la liste — puis je l'ai appliquée à `zod` et `acorn`, qui n'ont
// aucune dépendance, et pas au seul paquet de la liste qui en a.
//
// La réparation n'est pas d'allonger la liste : une liste de dépendances
// écrite à la main se périme à la prochaine version du SDK. Le SDK redevient
// un import NORMAL, que le bundler suit tout seul — exactement ce que fait
// `api/chat/route.ts`, en production depuis toujours. L'adaptateur garde sa
// fonction pour la campagne en ligne de commande ; elle n'est juste plus le
// chemin du serveur.
import Anthropic from '@anthropic-ai/sdk'
import { documentDepuisModele, type Derivation, type TableGestes } from './derivation'

/** Les faits que P0 tire d'une demande. Forme du contrat `modele-metier`. */
export type ModeleMetier = {
  readonly acteurs?: { id?: string; nom?: string }[]
  readonly concepts?: { id?: string; nom?: string; attributs?: { nom?: string; nature?: string }[] }[]
  readonly parcours?: { acteur?: string; besoin?: string; etapes?: unknown[] }[]
}

export type Comprehension =
  | { ok: true; modele: ModeleMetier; coutUsd: number; jetons: { entree: number; sortie: number } }
  | {
      ok: false
      raison: string
      refusDeDepense?: boolean
      /**
       * LES DIAGNOSTICS SORTENT MAINTENANT, et c'etait le defaut.
       *
       * Le juge rend des codes classes par EP-135 : les uns sont des QUESTIONS
       * que seul l'humain peut trancher, les autres sont NOS fautes. En ne
       * rendant qu'une phrase, cette fonction ecrasait la distinction et une
       * question legitime devenait « lecture refusee » — un cul-de-sac au lieu
       * d'un tour de dialogue.
       */
      diagnostics?: { code?: string; path?: string; message?: string }[]
      coutUsd?: number
    }

/** Le jeton budgetaire. Son absence n'est pas une panne : c'est un refus. */
export const JETON_DEPENSE = 'GO_EMISSION_IA'

/**
 * LE PLAFOND DE JETONS DE SORTIE — LE MAXIMUM DU MODÈLE, ET RIEN DE MOINS.
 *
 * ── CE QUE CE NOMBRE EST, ET CE QU'IL N'EST PAS.
 *
 * Ce n'est PAS une limite imposée à l'utilisateur. C'est la longueur maximale
 * de la RÉPONSE DU MODÈLE, et l'API l'exige — un appel sans `max_tokens` est
 * refusé. On ne peut donc pas « ne pas en mettre » ; on peut seulement le
 * mettre trop bas.
 *
 * ── ET JE L'AVAIS MIS TROP BAS, DEUX FOIS.
 *
 * 9000 d'abord : la demande de marketplace du propriétaire a été coupée en
 * plein milieu. Puis 40000, recopié de la campagne — un chiffre hérité, pas
 * un chiffre mesuré. Le propriétaire a demandé à quoi il servait. À rien.
 *
 * ── CELUI-CI EST MESURÉ.
 *
 * Demandé à l'API, qui répond en 400 — donc sans rien facturer :
 *
 *   « max_tokens: 999999 > 128000, which is the maximum allowed number of
 *     output tokens for claude-opus-5 »   (request_id req_011CfpVM6K6gxenpSx4o6LrA)
 *
 * C'est le plafond du MODÈLE. En le prenant, le générateur cesse d'avoir un
 * plafond À LUI : plus aucune application ne sera coupée par une borne que
 * j'aurais choisie.
 *
 * ── ET CE N'EST PAS UNE DÉPENSE.
 *
 * La facturation porte sur les jetons RÉELLEMENT produits, jamais sur le
 * plafond. Un modèle métier fait quelques milliers de jetons ; le plafond dit
 * seulement où l'on couperait. Tirer bas ne fait rien économiser — ça fait
 * perdre l'appel ENTIER qu'on vient de payer, et il faut le refaire.
 */
export const PLAFOND_JETONS = 128_000

export function depenseAutorisee(): boolean {
  return (process.env[JETON_DEPENSE] ?? '') !== ''
}

/**
 * Appelle P0 sur une demande en texte libre.
 *
 * Les modules de `benchmarks/air-emission/` sont charges PARESSEUSEMENT, et
 * seulement apres la garde : ils construisent un client au chargement, et un
 * import de haut niveau ferait entrer cette construction dans chaque route du
 * site — y compris celles qui n'emettront jamais rien.
 */
export async function comprendre(demande: string): Promise<Comprehension> {
  if (!depenseAutorisee()) {
    return {
      ok: false,
      refusDeDepense: true,
      raison:
        `Lecture par IA non autorisee : la variable ${JETON_DEPENSE} est absente. ` +
        'Une depense ne se presume pas.',
    }
  }
  const propre = demande.trim()
  if (propre === '') return { ok: false, raison: 'Demande vide.' }

  try {
    const { racineDepot } = await import('./racine')
    const base = racineDepot()
    const passe0 = (await import(/* webpackIgnore: true */ `${base}/benchmarks/air-emission/passe0.mjs`)) as {
      construireRequeteP0: (brief: string) => { system: string; user: string; grammaire: unknown }
      jugerSortieP0: (
        texte: string,
        brief: string,
        meta: unknown,
      ) => { ok: boolean; diagnostics?: { code?: string; path?: string; message?: string }[] }
    }
    const adaptateur = (await import(
      /* webpackIgnore: true */ `${base}/benchmarks/air-emission/adaptateur-anthropic.mjs`
    )) as {
      degraderGrammaire: (g: unknown) => { grammaire: unknown; ecarts: string[] }
      construireAppel: (r: unknown, g: unknown) => unknown
      // LA VRAIE FORME, relevée dans l'adaptateur. J'avais écrit `meta`, qui
      // n'existe pas — le signal de troncature ne me parvenait donc JAMAIS.
      lireReponse: (r: unknown) => { texte: string; tronquee: boolean; refusee: boolean }
      lireUsage: (u: unknown) => unknown
      coutUsd: (u: unknown) => number
    }

    // ── LA GRAMMAIRE SE DÉGRADE AVANT DE PARTIR.
    //
    // MESURÉ : l'API a refusé l'appel en 400 —
    //   « For 'integer' type, properties maximum, minimum are not supported ».
    //
    // Le contrat P0 borne ses entiers, et c'est juste : un schéma doit dire
    // ce qui est vrai. C'est le TRANSPORT qui ne sait pas porter ces bornes,
    // et l'adaptateur a une fonction exprès — `degraderGrammaire` — qui
    // retire ce que le dialecte refuse en DÉCLARANT chaque écart.
    //
    // Je ne l'appelais pas. La campagne, elle, le fait depuis toujours : j'ai
    // repris le point d'entrée sans reprendre le geste qui va avec.
    const requeteBrute = passe0.construireRequeteP0(propre)
    const { grammaire } = adaptateur.degraderGrammaire(requeteBrute.grammaire)
    const requete = { ...requeteBrute, grammaire }
    // ── LA CLÉ VIENT DE L'ENVIRONNEMENT, PAS D'UN FICHIER.
    //
    // L'adaptateur a été écrit pour une campagne lancée à la main : il lit
    // `apps/web/.env.local`. Ce fichier n'est PAS déployé — il est ignoré par
    // git, et c'est très bien ainsi. Sur le serveur, la clé vit dans
    // `process.env`.
    const cle = process.env.ANTHROPIC_API_KEY ?? ''
    if (cle === '') return { ok: false, raison: 'Clé Anthropic absente du serveur.' }
    const client = new Anthropic({ apiKey: cle })
    // L'ADAPTATEUR POSSEDE LA FORME DU DIALECTE, y compris `output_config`,
    // que la surface typee du SDK ne declare pas. Le cast dit cette frontiere
    // au lieu de la masquer : c'est l'adaptateur qui sait, pas le type.
    const appel = adaptateur.construireAppel(requete, { max_tokens: PLAFOND_JETONS })
    const reponse = (await client.messages.create(
      appel as Parameters<typeof client.messages.create>[0],
    )) as { usage?: unknown }
    const { texte, tronquee, refusee } = adaptateur.lireReponse(reponse)

    const usage = adaptateur.lireUsage(reponse.usage) as { entree?: number; sortie?: number }
    const cout = adaptateur.coutUsd(usage)

    if (refusee) {
      // Le fournisseur a REFUSÉ de répondre. Ce n'est ni un JSON cassé ni un
      // défaut de modèle, et le dire autrement enverrait chercher ailleurs.
      return {
        ok: false,
        raison: 'Le modèle a refusé de répondre à cette demande.',
        diagnostics: [{ code: 'P0_REPONSE_REFUSEE', path: '', message: 'refus du fournisseur' }],
        coutUsd: cout,
      }
    }

    // ── LE SIGNAL DE TRONCATURE, QUI N'ARRIVAIT PAS.
    //
    // Le juge l'attend sous `meta.tronquee`. Je lui passais une variable
    // `meta` que `lireReponse` ne rend pas : elle valait `undefined`, la
    // garde `meta?.tronquee === true` était donc TOUJOURS fausse, et une
    // sortie COUPÉE repartait vers `JSON.parse` qui la déclarait
    // « non parsable ».
    //
    // C'est mot pour mot le défaut D-078, déjà payé par la campagne et écrit
    // dans `emission-coeur.mjs` : « le JSON n'était pas invalide, il était
    // COUPÉ. Nommer la cause au bon endroit évite de chercher un défaut de
    // schéma là où il n'y a qu'un plafond de jetons. » Je l'ai relu après
    // l'avoir reproduit.
    const verdict = passe0.jugerSortieP0(texte, propre, { tronquee })
    if (!verdict.ok) {
      return {
        ok: false,
        raison: (verdict.diagnostics ?? []).map((d) => d.message ?? '').join(' · ') || 'Lecture refusee.',
        // L'APPEL A ETE PAYE MEME QUAND LE VERDICT REFUSE. Le taire ferait
        // apparaitre un tour de dialogue comme gratuit.
        diagnostics: verdict.diagnostics ?? [],
        coutUsd: cout,
      }
    }
    return {
      ok: true,
      modele: JSON.parse(texte) as ModeleMetier,
      coutUsd: adaptateur.coutUsd(usage),
      jetons: { entree: usage.entree ?? 0, sortie: usage.sortie ?? 0 },
    }
  } catch (e) {
    return { ok: false, raison: e instanceof Error ? e.message : 'Lecture impossible.' }
  }
}

/** Ce qu'on montre a l'utilisateur : des phrases, pas un objet JSON. */
export function direCeQuOnACompris(m: ModeleMetier): string[] {
  const lignes: string[] = []
  const acteurs = (m.acteurs ?? []).map((a) => a.nom ?? a.id).filter(Boolean)
  const concepts = (m.concepts ?? []).map((c) => c.nom ?? c.id).filter(Boolean)
  if (acteurs.length > 0) lignes.push(`Les personnes : ${acteurs.join(', ')}`)
  if (concepts.length > 0) lignes.push(`Ce que l'application manipule : ${concepts.join(', ')}`)
  for (const p of (m.parcours ?? []).slice(0, 4)) {
    if (p.besoin !== undefined) lignes.push(`${p.acteur ?? 'Quelqu un'} veut : ${p.besoin}`)
  }
  return lignes
}

/**
 * LE MODÈLE DEVIENT UNE APPLICATION — sans un appel de plus.
 *
 * P0 a déjà payé pour comprendre. Ce qu'il a compris commande maintenant la
 * construction : les concepts donnent les entités, les besoins donnent les
 * écrans, et les gestes donnent les blocs — `TABLE_GESTES` le dit depuis
 * longtemps, il suffisait de la lire.
 *
 * La table est CHARGÉE, jamais recopiée. Le dépôt a vu quatre fois « une liste
 * écrite deux fois diverge » ; une cinquième copie ne ferait pas exception.
 */
export async function construireDepuisModele(
  modele: ModeleMetier,
  identite: { nom: string; description: string | null },
): Promise<Derivation | null> {
  try {
    const { racineDepot } = await import('./racine')
    const mm = (await import(
      /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/modele-metier.mjs`
    )) as { TABLE_GESTES: TableGestes }
    return documentDepuisModele(modele as never, mm.TABLE_GESTES, identite)
  } catch {
    // La table absente ne doit pas faire perdre la compréhension : l'appelant
    // retombe sur la lecture simple, et le DIT.
    return null
  }
}
