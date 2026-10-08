/**
 * LE DIALOGUE — EXERCER EP-136, QUI N'ATTENDAIT QUE ÇA.
 *
 * ── CE QUE J'AI TROUVÉ, ET CE QUE JE N'AI PAS ÉCRIT.
 *
 * Le dépôt possède `benchmarks/air-emission/elicitation.mjs` : la projection
 * interrogative des diagnostics, le gel de l'intention, l'addendum ordonné, la
 * stérilité d'une réponse, et deux cliquets AU CHARGEMENT qui refusent le
 * module si une question n'a pas de diagnostic ou l'inverse.
 *
 * Son propre en-tête le dit : « Cette passe pose la classification ; elle ne
 * l'exerce pas — aucun dialogue, aucune question. » Personne ne l'exerçait :
 * deux tests l'appellent, aucun code de production. Le propriétaire a demandé
 * que le système comprenne avant de construire ; la machine pour le faire
 * était là, posée, inutilisée.
 *
 * Je n'invente donc AUCUNE question. Les miennes seraient des devinettes de
 * produit ; celles d'EP-135 passent un critère écrit : « un humain peut-il y
 * répondre SANS connaître le fonctionnement interne du moteur ? ». Deux
 * diagnostics sur dix-neuf le passent, et c'est une mesure, pas une limite.
 *
 * ── CE QUI N'EST PAS UNE QUESTION, ET POURQUOI C'EST CAPITAL.
 *
 * Tout le reste est classé `faute_de_production` : la machine a mal travaillé.
 * Les transformer en questions ferait porter à l'utilisateur une erreur qui
 * n'est pas la sienne — EP-135 appelle ça « le pire résultat possible ». Ces
 * diagnostics-là ne sortent pas à l'écran comme des questions ; ils partent en
 * alerte, vers nous.
 */
import { racineDepot } from './racine'

export type Diagnostic = { code?: string; path?: string; message?: string }

export type Question = { code: string; destination: string; texte: string }

/** L'intention : un brief SCELLÉ, et ce qui a été répondu, dans l'ordre. */
export type Intention = {
  readonly brief: string
  readonly addendum: readonly {
    rang: number
    code: string
    destination: string
    question: string
    reponse: string
  }[]
}

type Elicitation = {
  elicitationDe: (
    d: Diagnostic[],
    o?: { interlocuteur?: boolean },
  ) => { statut: 'aucune_question' | 'questions' | 'refus'; questions: Question[] }
  perimetreDElicitation: (d: Diagnostic[]) => string[]
  reponseSterile: (avant: string[], apres: string[]) => boolean
  creerIntention: (brief: string) => Intention
  repondre: (i: Intention, r: { code: string; texte: string; reponse: string }) => Intention
  texteDIntention: (i: Intention) => string
}

/** Chargé paresseusement, comme les autres modules d'émission : ce fichier
 *  vit hors de `apps/web`, et ses cliquets s'exécutent au chargement. */
async function charger(): Promise<Elicitation> {
  return (await import(
    /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/elicitation.mjs`
  )) as Elicitation
}

/**
 * L'intention reconstruite depuis ce que le navigateur renvoie.
 *
 * ELLE EST REJOUÉE, PAS RECOPIÉE. Chaque réponse repasse par `repondre`, qui
 * REFUSE un code hors de la table des questions projetées. Recopier l'objet
 * reçu laisserait un client fabriquer un addendum arbitraire — et `rang` et
 * `destination` sont recalculés par le module, jamais crus sur parole.
 */
export async function intentionDepuis(brut: unknown): Promise<Intention | null> {
  const o = brut as { brief?: unknown; addendum?: unknown } | null
  if (o === null || typeof o !== 'object' || typeof o.brief !== 'string' || o.brief.trim() === '') {
    return null
  }
  const m = await charger()
  let intention = m.creerIntention(o.brief)
  if (!Array.isArray(o.addendum)) return intention
  for (const e of o.addendum as { code?: unknown; question?: unknown; reponse?: unknown }[]) {
    if (typeof e?.code !== 'string' || typeof e.reponse !== 'string') return null
    try {
      intention = m.repondre(intention, {
        code: e.code,
        texte: typeof e.question === 'string' ? e.question : '',
        reponse: e.reponse,
      })
    } catch {
      // Code inconnu de la projection : l'addendum est refusé EN ENTIER. Une
      // réponse à une question qui n'existe pas n'a pas de destination.
      return null
    }
  }
  return intention
}

/** Une intention neuve, pour un premier message. */
export async function premiereIntention(brief: string): Promise<Intention> {
  return (await charger()).creerIntention(brief)
}

/** Le texte que P0 lit : brief PUIS réponses. Le brief ne se réécrit jamais. */
export async function texteDe(intention: Intention): Promise<string> {
  return (await charger()).texteDIntention(intention)
}

/**
 * Ce qu'il faut demander avant de construire.
 *
 * `interlocuteur: true` parce qu'ici il y en a un — c'est toute la différence
 * avec la campagne, où `elicitationDe` dégrade en REFUS plutôt que de
 * supposer. L'écran est précisément l'interlocuteur qui manquait.
 */
export async function questionsPour(diagnostics: Diagnostic[]): Promise<Question[]> {
  const m = await charger()
  const r = m.elicitationDe(diagnostics, { interlocuteur: true })
  return r.statut === 'questions' ? r.questions : []
}

/** Les diagnostics qui ne sont PAS des questions : nos fautes, pas les siennes. */
export async function fautesDeProduction(diagnostics: Diagnostic[]): Promise<Diagnostic[]> {
  const m = await charger()
  const aDemander = new Set(m.perimetreDElicitation(diagnostics))
  return diagnostics.filter((d) => d.code !== undefined && !aDemander.has(d.code))
}

/**
 * Une réponse qui ne réduit pas le périmètre est STÉRILE.
 *
 * Sans ce test, le dialogue tournerait : la même question reviendrait
 * indéfiniment et l'utilisateur paierait un appel à chaque tour. On le DIT
 * plutôt que de boucler.
 */
export async function sterile(avant: string[], apres: string[]): Promise<boolean> {
  return (await charger()).reponseSterile(avant, apres)
}

/** Le périmètre encore ouvert — un ensemble, jamais un compte (EP-102). */
export async function perimetre(diagnostics: Diagnostic[]): Promise<string[]> {
  return (await charger()).perimetreDElicitation(diagnostics)
}
