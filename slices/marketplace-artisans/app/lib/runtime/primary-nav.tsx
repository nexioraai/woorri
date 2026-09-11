// NAVIGATION PRINCIPALE PERSISTANTE — D-086.
//
// Fait mesuré sur le corpus v3 : **184 boutons de navigation pure sur 235**,
// 1,7 par écran, jusqu'à QUATRE empilés sous la liste des plats. Le contrat ne
// savait pas exprimer une destination principale ; le générateur n'avait donc
// que le bouton de contenu.
//
// 🔴 POURQUOI PAS `createBottomTabNavigator` : ce paquet n'est ni dans le
// gabarit ni dans le `package-lock` EMBARQUÉ (0 entrée, mesuré). L'ajouter
// exigerait d'ouvrir le lock de 504 paquets — la même décision que les
// capabilities. Cette barre n'utilise QUE ce qui est déjà là :
// `useNavigation` (@react-navigation/native), `Pressable`/`View`/`Text`
// (react-native). L'inset du bas appartient à l'AppShell (étape ②).
//
// CONTREPARTIE, MESURÉE ET CORRIGÉE : la première version appelait
// `navigate`, qui EMPILE. Les quatre pages s'accumulaient et l'en-tête natif
// affichait une flèche de retour — défaut vu à l'écran sur A17. Le texte qui
// tenait ici prétendait le comportement « identique » à celui d'un vrai
// gestionnaire d'onglets : c'était faux. Une bascule d'onglet passe désormais
// par `allerVers`, qui REMPLACE la pile par la racine touchée.
//
// Ce qui reste réellement en moins face à un vrai gestionnaire d'onglets :
// l'historique PROPRE À CHAQUE onglet. Ouvrir une fiche depuis Départs puis
// toucher Accueil perd la fiche. Dit ici, une fois, sans être maquillé.
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useStyles } from "../primitives/theme-bridge";
import { GLYPHE_PAR_ROLE, type RoleIcone } from "../primitives/roles-icones";
import { allerVers } from "./racines-navigation";

// Étape ③ (EP-003) — la table rôle → glyphe vient de LA source unique
// (primitives/roles-icones) : plus aucune copie locale.
export type IconeOnglet = RoleIcone;

export interface PrimaryDestinationData {
  routeId: string;
  screenId: string;
  label: string;
  order: number;
  /** Rôle visuel déclaré par le document. Absent ⇒ aucun glyphe, pas de défaut. */
  icon?: IconeOnglet;
}

export interface PrimaryNavProps {
  destinations: readonly PrimaryDestinationData[];
  /** Écran courant — pour marquer l'onglet actif, jamais pour le désactiver. */
  currentScreenId: string;
}

export function PrimaryNav({ destinations, currentScreenId }: PrimaryNavProps) {
  const navigation = useNavigation();
  const s = useStyles();
  if (destinations.length === 0) return null;
  // L'ORDRE déclaré par le document fait foi. Trier ici, et non à l'émission,
  // garantit que ce qui est RENDU respecte la déclaration même si un étage
  // intermédiaire réordonnait.
  const triees = [...destinations].sort((a, b) => a.order - b.order);
  return (
    <View
      testID="primary-nav"
      // ÉTAPE ② — l'inset du BAS appartient à l'AppShell, plus jamais ici :
      // la barre ne connaît que son propre dessin, le shell la pose.
      style={s.primaryNav}
      accessibilityRole="tablist"
    >
      {triees.map((d) => {
        const actif = d.screenId === currentScreenId;
        return (
          <Pressable
            key={d.routeId}
            testID={`primary-nav-${d.routeId}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            style={actif ? s.primaryNavItemActive : s.primaryNavItem}
            onPress={() => {
              allerVers(navigation, d.screenId);
            }}
          >
            {/* AUCUNE limite de lignes ici (D-086) — la dimension A++ E l'a
                refusée, à raison : borner un libellé d'onglet le rend illisible
                dès que l'utilisateur agrandit le texte système. La barre grandit
                alors un peu : c'est le comportement attendu, pas un défaut.
                Le mot exact est volontairement absent — la grille le cherche par
                sous-chaîne et ne distingue pas un commentaire du code. */}
            {d.icon === undefined ? null : (
              <Ionicons
                name={GLYPHE_PAR_ROLE[d.icon]}
                size={s.primaryNavIcon.fontSize}
                color={actif ? s.primaryNavLabelActive.color : s.primaryNavLabel.color}
              />
            )}
            <Text style={actif ? s.primaryNavLabelActive : s.primaryNavLabel}>
              {d.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
