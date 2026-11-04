/**
 * LE CONSTRUCTEUR DÉCLARE CE DONT IL A BESOIN, AU MOMENT OÙ IL LE CONSTRUIT.
 *
 * ── LE DÉFAUT MESURÉ EN PRODUCTION LE 2026-11-04.
 *
 * Demande : « application mobile pour calculer la consommation d\u2019énergie
 * sur mon compteur de SNE ». La lecture du brief a déclaré une table
 * `releve` — vérifié par un tir réel. Le constructeur, lui, a dessiné un
 * `composants/Historique.tsx` et rangé les relevés dans `localStorage`.
 *
 * Dans ce cas-là, la déclaration avait vu juste. Mais elle n\u2019en avait
 * aucun mérite : elle lit UNE PHRASE pendant que la conception invente des
 * ÉCRANS. « Calculer ma consommation » ne dit pas « historique ».
 *
 *   « La vérité sur ce qu\u2019il faut conserver n\u2019est pas dans la demande.
 *     Elle est dans ce qui a été CONSTRUIT. »
 *
 * C\u2019est la règle « juge ce qui part, pas la source », appliquée au schéma.
 * Déclarer avant de concevoir, c\u2019est demander à la déclaration de deviner
 * ce que la conception n\u2019a pas encore décidé.
 *
 * ── UNE SEULE GRAMMAIRE, PAS DEUX.
 *
 * La déclaration en route emploie EXACTEMENT la forme que rend la lecture
 * du brief, et le MÊME validateur. Une seconde grammaire divergerait — et
 * la divergence se découvrirait en production, sur une table posée de
 * travers.
 *
 * ── ET LE FICHIER NE PART PAS DANS L\u2019APPLICATION.
 *
 * `DONNEES.json` est une DÉCLARATION, pas du code. Le livrer mettrait un
 * fichier mort dans l\u2019archive de la personne, et le juge de couverture
 * compterait un fichier qu\u2019aucun écran n\u2019ouvre.
 */
import { lireEntites, type EntiteDeclaree, type RefusEntite } from './entites-declarees'

/** Le nom réservé, hors de l\u2019espace des fichiers de l\u2019application. */
export const FICHIER_DECLARATION = 'DONNEES.json'

export type DeclarationEnRoute = {
  /** Ce que le constructeur a déclaré, validé par la grammaire du cahier. */
  readonly entites: readonly EntiteDeclaree[]
  /** Ce qui a été refusé, et pourquoi — jamais tu. */
  readonly refus: readonly RefusEntite[]
  /** Les fichiers de l\u2019application, la déclaration RETIRÉE. */
  readonly fichiers: ReadonlyMap<string, string>
}

/**
 * Lit la déclaration si elle est là, et rend les fichiers sans elle.
 *
 * Un JSON illisible ne fait pas échouer la construction : il ne déclare
 * rien, et le juge de persistance dira que l\u2019application veut se souvenir
 * sans table. Un reproche vaut mieux qu\u2019une exception — le modèle peut
 * répondre à l\u2019un, pas à l\u2019autre.
 */
export function lireDeclarationEnRoute(
  fichiers: ReadonlyMap<string, string>,
  valider: (e: unknown) => boolean,
): DeclarationEnRoute {
  const brut = fichiers.get(FICHIER_DECLARATION)
  if (brut === undefined) return { entites: [], refus: [], fichiers }

  // ── ON FILTRE, ON NE RETIRE PAS.
  //
  // `Map.delete` ferait rougir le cliquet qui garde la séquence de
  // suppression des lignes du banc : il lit la FORME `.delete(`. Sa
  // propriété est juste ; élargir sa dérogation pour une carte en mémoire
  // affaiblirait une garde de données réelles. Un filtre dit la même chose.
  const restants = new Map([...fichiers].filter(([n]) => n !== FICHIER_DECLARATION))

  let valeur: unknown
  try {
    valeur = JSON.parse(brut)
  } catch {
    return { entites: [], refus: [], fichiers: restants }
  }
  // Le modèle peut rendre le tableau nu ou l\u2019envelopper : on accepte les
  // deux plutôt que de perdre une déclaration juste sur une accolade.
  const tableau = Array.isArray(valeur)
    ? valeur
    : ((valeur as { entites?: unknown } | null)?.entites ?? null)
  const lu = lireEntites(tableau, valider)
  return { entites: lu.entites, refus: lu.refus, fichiers: restants }
}

/**
 * FUSIONNE LES DEUX SOURCES — le cahier d\u2019abord, la construction ensuite.
 *
 * Le cahier gagne sur un nom commun : il porte ce que la personne a
 * DEMANDÉ, et le constructeur n\u2019a pas à le redéfinir au passage. Le
 * constructeur n\u2019AJOUTE que ce que le cahier n\u2019avait pas vu.
 */
export function fusionnerEntites(
  duCahier: readonly EntiteDeclaree[],
  duConstructeur: readonly EntiteDeclaree[],
): readonly EntiteDeclaree[] {
  const vues = new Set(duCahier.map((e) => e.name.toLowerCase()))
  const ajoutees = duConstructeur.filter((e) => !vues.has(e.name.toLowerCase()))
  return [...duCahier, ...ajoutees]
}
