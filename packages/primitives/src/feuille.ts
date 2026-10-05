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
