// FERMER UNE FEUILLE — le contrôle que la plateforme ne fournit pas.
//
// Mesuré à l'écran (SM-A175F, 2026-09-09) : la feuille de connexion montait du
// bas et RIEN n'y indiquait comment en sortir. Aucun en-tête, aucun signe —
// seul le bouton retour matériel, qu'aucun pixel n'annonce. La demande du
// propriétaire, capture Apple à l'appui, était explicite : « tu peux tirer vers
// le bas pour fermer ou cliqué x en haut à droite ». Le glissement vers le bas
// est fourni par iOS et par lui seul ; le ✕ est fourni ici, et vaut sur LES
// DEUX plateformes.
//
// F3 — le moteur DESSINE le signe, le document le NOMME. Aucun mot n'est écrit
// ici : `dismissLabel` vient de l'AIR (1.18.0). Sans déclaration, le contrôle
// garde son rôle d'accessibilité et reste visible et actionnable, mais il n'est
// pas ANNONCÉ au lecteur d'écran — une lacune ÉNONCÉE, pas comblée par un mot
// que le compilateur aurait choisi à la place du document.
//
// Cible tactile PLEINE (`tapTarget`, 48 dp) : un contrôle discret n'est pas un
// contrôle petit. Contrainte A, la même que pour tout le reste.
import { Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useStyles } from "../primitives/theme-bridge";

export interface FermerFeuilleProps {
  /** Mot déclaré par le document. Absent ⇒ aucun libellé inventé. */
  label?: string;
  testID?: string;
}

export function FermerFeuille({ label, testID }: FermerFeuilleProps) {
  const navigation = useNavigation();
  const s = useStyles();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={s.fermerFeuille}
      onPress={() => {
        (navigation.goBack as () => void)();
      }}
    >
      <Ionicons
        name="close"
        size={s.fermerFeuilleIcone.fontSize}
        color={s.fermerFeuilleIcone.color}
      />
    </Pressable>
  );
}
