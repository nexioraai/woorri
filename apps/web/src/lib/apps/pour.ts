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

export type Resultat = {
  readonly document: ProjectAir
  readonly compris: string[]
  readonly parIA: boolean
  readonly echecIA?: string
}

/**
 * Le document d'une demande.
 *
 * Avec le jeton de dépense, P0 lit et la structure vient du métier. Sans lui,
 * la lecture simple — qui annonce sa pauvreté. Dans les deux cas, `parIA` sort
 * et l'interface le montre : laisser croire qu'une IA a lu quand c'est une
 * expression régulière serait un mensonge qu'on ne rattrape pas.
 */
export async function documentPour(demande: string): Promise<Resultat | { erreur: string }> {
  if (depenseAutorisee()) {
    const lu = await comprendre(demande)
    if (lu.ok) {
      const nom = lireLaPhrase(demande).nom
      const derive = await construireDepuisModele(lu.modele, { nom, description: demande.slice(0, 200) })
      if (derive !== null) {
        return { document: derive.document, compris: derive.compris, parIA: true }
      }
      // P0 a compris, mais son modèle ne porte aucun concept de données : il
      // n'y a pas d'application à en tirer. On le dit plutôt que de servir un
      // squelette qui ferait croire le contraire.
      const repli = emettreSansIa(demande)
      if (!repli.ok) return { erreur: repli.raison }
      return {
        document: repli.document,
        compris: repli.compris,
        parIA: false,
        echecIA: 'La demande a été lue, mais rien de concret n’en ressort — précisez ce que l’application manipule.',
      }
    }
    const repli = emettreSansIa(demande)
    if (!repli.ok) return { erreur: repli.raison }
    return { document: repli.document, compris: repli.compris, parIA: false, echecIA: lu.raison }
  }

  const repli = emettreSansIa(demande)
  if (!repli.ok) return { erreur: repli.raison }
  return { document: repli.document, compris: repli.compris, parIA: false }
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
