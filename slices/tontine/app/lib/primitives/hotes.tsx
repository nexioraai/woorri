// LES COMPOSANTS HÔTES, CÔTÉ NATIF — le pendant exact de `primitives-web`.
//
// ── POURQUOI CE FICHIER EXISTE.
//
// Mesuré le 2026-10-05, en branchant la cible web : deux fichiers d'interface
// du runtime — `app-shell` et `primary-nav` — importaient `View`, `Text` et
// `Pressable` DIRECTEMENT de React Native. C'est la règle D-023 contournée :
// le visuel passe par les primitives, qui sont remplaçables par cible.
//
// Trois importations, et l'enveloppe de l'application n'était plus portable.
//
// Les deux paquets exposent désormais le MÊME vocabulaire d'hôtes — `Vue`,
// `Texte`, `Geste` — et un fichier d'interface peut s'écrire une seule fois
// pour les deux cibles. Ici ils ne sont qu'un renommage ; côté web, ils rendent
// du HTML. C'est toute la différence, et elle est enfermée dans ces deux
// fichiers.
export { View as Vue, Text as Texte, Pressable as Geste } from "react-native";

// ── LES DEUX CONTENEURS D'ÉCRAN.
//
// Un écran SANS bloc liste est une page défilante qui laisse la place au
// clavier (D-031-R47). Le générateur émettait ces deux conteneurs depuis
// `react-native` DIRECTEMENT dans chaque écran — mesuré le 2026-10-05 par la
// gate web : 29 applications sur 29 en portaient au moins un, jusqu'à neuf
// fichiers pour une seule. Les faire passer par les primitives les rend
// remplaçables comme tout le reste du visuel.
export { ScrollView as Defilement, KeyboardAvoidingView as EviteLeClavier } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

/**
 * UN SIGNE — un glyphe du vocabulaire fermé.
 *
 * Mesuré le 2026-10-05 : `primary-nav` importait Ionicons DIRECTEMENT, et
 * c'était le dernier paquet de plateforme dans un fichier d'interface. Côté
 * web, la police embarquée n'existe pas : le signe y est rendu décoratif et
 * vide, et la limite est dite dans `primitives-web/src/hotes.tsx`.
 *
 * `name` est une CHAÎNE et non le type d'Ionicons : le type appartient au
 * paquet natif, et l'exposer ici l'imposerait au web. La table rôle → glyphe
 * (`roles-icones`) reste la seule source des valeurs admises.
 */
export function Signe({
  name,
  size,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name as ComponentProps<typeof Ionicons>["name"]} size={size} color={color} />;
}
