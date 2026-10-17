import type { Graisse, Graisses } from "./contracts.ts";
// LA COUTURE DE LA FEUILLE DE STYLES — un seul mot de React Native.
//
// ── POURQUOI UNE COUTURE, ET NON UNE SECONDE FEUILLE.
//
// `styles.ts` est la source unique des jetons appliqués (D-021). En portant la
// cible web, j'ai d'abord écrit une feuille web qui réexportait la commune :
// une fois émise, l'importation devenait circulaire — le fichier se serait
// réexporté lui-même. Le vrai problème était ailleurs : la feuille n'avait
// besoin de React Native que pour UN appel.
//
// `StyleSheet.create` enregistre les déclarations et rend des identifiants que
// le moteur natif sait résoudre. Le web n'en a aucun usage : `versCss` consomme
// les objets tels quels. Isoler cet appel ici garde UNE feuille pour les deux
// cibles — et une feuille unique est la seule façon de garantir qu'un jeton
// ajouté se voie des deux côtés le même jour.
import { StyleSheet } from "react-native";

/** Enregistre une feuille auprès du moteur natif. */
export const creerFeuille = StyleSheet.create;

/**
 * LA POLICE D'UN RÔLE DE TEXTE — CÔTÉ NATIF, AVEC SA FACE EMBARQUÉE.
 *
 * ── CE QUI A ÉTÉ ESSAYÉ, REFUSÉ, PUIS RÉSOLU.
 *
 * Premier essai : `Platform.OS === "ios" ? "Georgia" : "serif"`. Le cliquet 4
 * de `keyboard-a11y-locks` a rougi — il interdit tout `Platform.OS` dans le
 * code ÉMIS, et j'ai vérifié que le dépôt n'en contenait AUCUN avant moi. Ce
 * qu'il protège est réel : un branchement d'exécution ferait rendre les deux
 * plateformes différemment, et TOUTE observation de ce dépôt monte avec un
 * stub `ios`. `Platform.select` a été écarté aussi : littéral différent, même
 * effet, ç'aurait été maquiller le cliquet.
 *
 * Deuxième état, livré puis dépassé : le natif ne servait PAS le rôle. Une
 * identité visuelle présente sur la moitié des appareils n'en est pas une.
 * Jugement du propriétaire, 2026-10-17 : « il faut surtout pas oublier native,
 * on fait les 2 pour ne pas en oublier une ».
 *
 * État actuel : la face est EMBARQUÉE dans l'application
 * (`assets/polices/DeribfySerif-*.ttf`) et chargée au démarrage. Un fichier
 * embarqué porte le même nom sur les deux plateformes — aucun branchement, et
 * l'identité est garantie au lieu d'être espérée.
 *
 * ── POURQUOI CETTE FONCTION REND AUSSI LA GRAISSE, ET POURQUOI C'EST L'UN OU
 *    L'AUTRE.
 *
 * Android ne SYNTHÉTISE pas : demander `fontWeight: "700"` sur une famille qui
 * n'a qu'une face Regular rend du Regular. Chaque graisse est donc une FACE
 * portant son propre nom de famille, et on la désigne NOMMÉMENT — sans poser
 * `fontWeight`, qui n'aurait rien à faire là et pourrait déclencher une
 * seconde synthèse par-dessus une face déjà grasse.
 *
 * Pour le rôle `systeme`, l'inverse : aucune famille — ce qui laisse la pile
 * système, SF ou Roboto, le meilleur rendu possible — et la graisse passe par
 * `fontWeight`, exactement comme avant les tokens 1.6.0.
 */
/**
 * ── LA GRAISSE VIENT DU JETON, PAS DE CETTE FONCTION (correction du jour).
 *
 * J'avais écrit `"600"` et `"700"` en littéral ici. L'Oracle l'a vu — sa
 * dimension D mesure « zéro style en dur » et elle est passée à
 * `non_conforme` : « 1 valeur(s) en dur : lib/primitives/feuille.ts:
 * typographie fontWeight=700 ». Il avait raison, et c'est exactement le genre
 * de valeur que les jetons existent pour porter.
 *
 * Cette couture décide LAQUELLE des deux propriétés poser — famille nommée OU
 * graisse — ce qui est une connaissance de plateforme. La VALEUR de la graisse
 * n'en est pas une : elle arrive de la feuille, qui lit les jetons.
 */
export interface StyleDePolice {
  readonly fontFamily?: string;
  readonly fontWeight?: Graisse;
}



export const styleDePolice = (
  role: "systeme" | "serif" | "mono",
  poids: "regular" | "semibold" | "bold",
  graisses: Graisses,
): StyleDePolice => {
  // ── `mono` N'A PAS DE FACE EMBARQUÉE, ET C'EST DÉLIBÉRÉ.
  //
  // Aucun thème du catalogue ne le demande. Embarquer un fichier que personne
  // n'emploie serait le jeton « au cas où » que DET-023 a écarté. Le cliquet
  // EP-263 exige qu'un rôle EMPLOYÉ ait sa face : le jour où un thème prendra
  // `mono`, il rougira — plutôt que de retomber en silence, ici, sur la police
  // système.
  if (role !== "serif") {
    return poids === "regular" ? {} : { fontWeight: graisses[poids] };
  }
  const face = poids === "bold" ? "Bold" : poids === "semibold" ? "SemiBold" : "Regular";
  return { fontFamily: `DeribfySerif-${face}` };
};
