// LA COUTURE DE NAVIGATION, REMPLIE PAR REACT NAVIGATION (cible native).
//
// Ce fichier est le SEUL du runtime à connaître `@react-navigation/native`.
// Son jumeau web remplit le même contrat avec l'historique du navigateur.
import type { PropsWithChildren } from "react";
import { useNavigation as useNavigationRN } from "@react-navigation/native";
import { NavigationRoot, type Navigateur } from "./navigation-contrat.tsx";

/**
 * Branche le navigateur de React Navigation sur le contrat.
 *
 * `useNavigation` de React Navigation rend un objet dont la forme est plus
 * large que le contrat ; on ne le RECOPIE pas — on le passe tel quel, et le
 * typage se charge de n'en exposer que les deux gestes déclarés.
 */
export function NavigationNative({ children }: PropsWithChildren) {
  const nav = useNavigationRN() as unknown as Navigateur;
  return <NavigationRoot navigateur={nav}>{children}</NavigationRoot>;
}
