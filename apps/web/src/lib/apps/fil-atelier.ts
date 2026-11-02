/**
 * LE FIL DE L'ATELIER — un fil qui se souvient, pas un formulaire qui oublie.
 *
 * ── CE QU'IL N'A PAS FALLU CONSTRUIRE.
 *
 * Aucune table de conversation. L'historique des versions porte déjà les
 * trois choses qu'un échange doit montrer : ce que la personne a demandé
 * (l'étape, écrite dans SES mots), ce que Deribfy a fait, et quelle version
 * ça a créée (le rang). Inventer une table de messages aurait créé une
 * SECONDE vérité à côté des versions — et deux vérités divergent toujours.
 *
 * ── POURQUOI UNE FONCTION PURE ET PAS DU JSX.
 *
 * Trois règles vivent ici, et chacune a un cas limite :
 *
 * ① LE RANG 1 N'A PAS D'ÉTAPE DE RETOUCHE : sa demande est la demande
 *    d'origine de l'œuvre, celle qui a tout déclenché.
 * ② UNE ÉTAPE DE RETOUCHE PORTE LES MOTS DE LA PERSONNE derrière son
 *    préfixe. Il faut les lui rendre, sans le préfixe — sinon le fil
 *    afficherait « modifiée : mets les boutons en vert » comme si c'était
 *    notre phrase, et plus la sienne.
 * ③ LES AUTRES ÉTAPES NE SONT PAS DES DEMANDES. Dix lignes rattrapées
 *    portent `pipeline` ; une régénération rejoue la demande d'origine.
 *    Elles n'ont pas de demande à elles, et le fil ne doit pas en inventer.
 *
 * Dans du JSX, ces trois cas seraient devenus trois ternaires imbriqués que
 * personne n'aurait pu éprouver. Ici, un cliquet les tient.
 */
import { PREFIXE_RETOUCHE } from './retouche'

/** Une version, telle que la route d'historique la rend. */
export type VersionLue = {
  readonly rang: number
  readonly etape: string | null
  readonly creeIl: string
  readonly coutUsd: number
}

export type Echange = {
  readonly rang: number
  /** Ce que la personne a demandé, dans ses mots. `null` = pas une demande. */
  readonly demande: string | null
  /** Ce que Deribfy a fait, dit à la première personne du produit. */
  readonly fait: string
  readonly coutUsd: number
  readonly creeIl: string
}

/**
 * CE QUE DERIBFY A FAIT — et on ne dit QUE ce qu'on sait.
 *
 * On ne stocke pas la liste des fichiers touchés par une retouche passée :
 * le fil ne peut donc pas annoncer « 3 fichiers modifiés » sur une version
 * d'hier. Il dit « j'ai modifié l'application », ce qui est vrai, plutôt
 * qu'un compte qu'il devrait deviner.
 */
function faitDe(rang: number, etape: string | null): string {
  if (rang === 1) return 'J’ai créé votre application.'
  if (etape !== null && etape.startsWith(PREFIXE_RETOUCHE)) return 'J’ai modifié votre application.'
  if (etape === 'pipeline') return 'J’ai produit cette version.'
  if (etape === null || etape === '') return 'J’ai produit cette version.'
  return `J’ai produit cette version (${etape}).`
}

/**
 * LE FIL, DU PLUS ANCIEN AU PLUS RÉCENT.
 *
 * L'ordre est celui d'une conversation : on lit vers le bas, le dernier
 * échange est en bas, près du champ de saisie. L'historique de la route
 * arrive dans l'autre sens — c'est ici qu'on le retourne, une fois.
 */
export function echangesDe(
  demandeOrigine: string,
  versions: readonly VersionLue[],
): readonly Echange[] {
  return [...versions]
    .sort((a, b) => a.rang - b.rang)
    .map((v) => ({
      rang: v.rang,
      demande:
        v.rang === 1
          ? demandeOrigine
          : v.etape !== null && v.etape.startsWith(PREFIXE_RETOUCHE)
            ? v.etape.slice(PREFIXE_RETOUCHE.length)
            : null,
      fait: faitDe(v.rang, v.etape),
      coutUsd: v.coutUsd,
      creeIl: v.creeIl,
    }))
}

/**
 * L'HEURE D'UN ÉCHANGE, COURTE — et jamais « Invalid Date » à l'écran.
 *
 * Une date illisible vaut mieux absente que fausse : la ligne perd son
 * horodatage, le fil garde son sens.
 */
export function heureCourte(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
