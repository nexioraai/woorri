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
import { comprendre, depenseAutorisee, construireDepuisModele } from './comprendre'
import { emettreSansIa, lireLaPhrase } from './emission'
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
 * Le document d'une demande.
 *
 * Avec le jeton de dépense, P0 lit et la structure vient du métier. Sans lui,
 * la lecture simple — qui annonce sa pauvreté. Dans les deux cas, `parIA` sort
 * et l'interface le montre : laisser croire qu'une IA a lu quand c'est une
 * expression régulière serait un mensonge qu'on ne rattrape pas.
 */
export async function documentPour(
  intention: Intention,
): Promise<Resultat | Questions | { erreur: string }> {
  const texteLu = await texteDe(intention)

  if (!depenseAutorisee()) {
    const repli = emettreSansIa(texteLu)
    if (!repli.ok) return { erreur: repli.raison }
    return { document: repli.document, compris: repli.compris, parIA: false, texteLu }
  }

  const lu = await comprendre(texteLu)

  if (lu.ok) {
    const nom = lireLaPhrase(intention.brief).nom
    const derive = await construireDepuisModele(lu.modele, {
      nom,
      description: intention.brief.slice(0, 200),
    })
    if (derive !== null) {
      return { document: derive.document, compris: derive.compris, parIA: true, texteLu }
    }
    // P0 a compris, mais son modèle ne porte aucun concept de données : il
    // n'y a pas d'application à en tirer. On le dit plutôt que de servir un
    // squelette qui ferait croire le contraire.
    const repli = emettreSansIa(texteLu)
    if (!repli.ok) return { erreur: repli.raison }
    return {
      document: repli.document,
      compris: repli.compris,
      parIA: false,
      texteLu,
      echecIA: 'La demande a été lue, mais rien de concret n’en ressort — précisez ce que l’application manipule.',
      detailTechnique: 'modèle valide sans concept de données : aucune entité à dériver',
    }
  }

  // ── LE REFUS SE PARTAGE EN DEUX, ET C'EST TOUTE LA DIFFÉRENCE (EP-135).
  //
  // Jusqu'ici, tout refus du juge devenait « lecture indisponible » et on
  // servait quand même la lecture simple — c'est-à-dire qu'on CONSTRUISAIT
  // sans avoir compris. Or le juge classe ce qu'il refuse : ce que l'humain
  // seul peut trancher (`intention_manquante`) et ce que la machine a raté
  // (`faute_de_production`).
  //
  // Les premiers deviennent des QUESTIONS, et rien n'est construit tant
  // qu'elles sont ouvertes. Les seconds ne lui sont jamais montrés comme des
  // questions : lui faire porter une erreur de machine est, de l'aveu même
  // d'EP-135, « le pire résultat possible ».
  const diagnostics: Diagnostic[] = lu.diagnostics ?? []
  const questions = await questionsPour(diagnostics)
  if (questions.length > 0) {
    return {
      questions,
      perimetre: await perimetre(diagnostics),
      texteLu,
      ...(lu.coutUsd === undefined ? {} : { coutUsd: lu.coutUsd }),
    }
  }

  const repli = emettreSansIa(texteLu)
  if (!repli.ok) return { erreur: repli.raison }
  const nos = await fautesDeProduction(diagnostics)
  return {
    document: repli.document,
    compris: repli.compris,
    parIA: false,
    texteLu,
    echecIA: direALUtilisateur(diagnostics),
    // Ce qui part en alerte, c'est NOTRE part — pas une question deguisee.
    detailTechnique:
      nos.length > 0
        ? `${lu.raison} · ${String(nos.length)} defaut(s) de production : ${nos
            .map((d) => d.code ?? '?')
            .join(', ')}`
        : lu.raison,
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
