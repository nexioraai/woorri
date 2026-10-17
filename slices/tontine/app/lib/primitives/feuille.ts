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
 * LE RÔLE DE FAMILLE DE CARACTÈRES — ET POURQUOI LE NATIF NE LE SERT PAS
 * ENCORE.
 *
 * ── CE QUE J'AI ESSAYÉ, ET LE CLIQUET QUI M'A ARRÊTÉ.
 *
 * Premier essai : `Platform.OS === "ios" ? "Georgia" : "serif"`. Le cliquet
 * 4 de `keyboard-a11y-locks` a rougi — il interdit tout `Platform.OS` dans le
 * code ÉMIS, et j'ai vérifié : le dépôt n'en contenait AUCUN avant moi. La
 * propriété est donc réelle et intacte, et elle vaut mieux que ce lot.
 *
 * CE QU'ELLE PROTÈGE, et ce n'est pas du zèle : un branchement d'exécution
 * ferait rendre les deux plateformes DIFFÉREMMENT. Or toute observation de ce
 * dépôt monte avec un stub `ios` — un comportement propre à Android ne serait
 * jamais regardé. C'est exactement la famille de défaut « vert et faux » que
 * neuf fichiers d'observation ont déjà coûtée ici.
 *
 * J'ai aussi écarté `Platform.select` : il ne contient pas le littéral que le
 * cliquet cherche, mais il fait la MÊME chose. Le contourner serait maquiller
 * le cliquet, pas le respecter.
 *
 * ── POURQUOI UN SEUL NOM NE SUFFIT PAS, ET C'EST MESURÉ.
 *
 * Aucun nom de police n'existe sur iOS ET Android à la fois. iOS porte
 * Georgia, Palatino, Menlo ; Android porte Noto Serif, Roboto et les alias
 * génériques `serif`/`monospace`. Et `fontFamily` du natif prend UN nom, pas
 * une pile : contrairement au web, il ne se dégrade pas. Un nom absent ne
 * lève pas — il retombe EN SILENCE sur la police système.
 *
 * Écrire « Georgia » ici, c'était donc livrer un serif sur iOS et la police
 * système sur Android, sans qu'aucun signal ne le dise. Une identité visuelle
 * qui n'existe que sur la moitié des appareils est une identité qu'on ne peut
 * pas promettre.
 *
 * ── CE QUI EST FAIT, ET CE QUI RESTE.
 *
 * Le natif rend donc `undefined` pour TOUS les rôles : la pile système, le
 * comportement exact d'avant les tokens 1.6.0, aucune régression. La cible WEB
 * sert le rôle pour de vrai — une pile CSS se dégrade, le navigateur prend la
 * première police présente, et il n'y a là aucun branchement de plateforme.
 *
 * CE QU'IL FAUDRAIT POUR SERVIR LE NATIF : embarquer un fichier de police
 * (`expo-font` est déjà installé, aucune dépendance nouvelle). Un `.ttf`
 * embarqué porte le MÊME nom sur les deux plateformes — donc aucun
 * branchement, et l'identité est garantie au lieu d'être espérée. Cela ajoute
 * un binaire au dépôt et engage une licence : c'est une décision du
 * propriétaire, pas un détail d'implémentation, et elle n'est pas prise ici.
 *
 * Le contrôle ⑥ d'EP-263 tient cet état EXACTEMENT tel qu'il est écrit : si
 * quelqu'un fait rendre un nom au natif sans embarquer de police, il rougit.
 */
export const familleDe = (role: "systeme" | "serif" | "mono"): string | undefined => {
  // Le role est LU — et deliberement non servi, voir ci-dessus. Le nommer
  // plutot que de l ignorer garde la signature identique a la couture web :
  // `styles.ts` est la MEME feuille pour les deux cibles.
  void role;
  return undefined;
};
