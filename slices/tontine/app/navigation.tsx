// GÉNÉRÉ — NE PAS ÉDITER (navigation : verdict S1 D-026 — native-stack,
// config EXPLICITE émise depuis l'AIR, patron prouvé au banc V4).
import { NavigationContainer } from "@react-navigation/native";
import { NavigationNative } from "./lib/runtime/navigation-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { declarerRacines } from "./lib/runtime/racines-navigation";
import { theme } from "./lib/tokens";
import { navData } from "./nav.data";
import { useSessionProvider } from "./lib/runtime/session-provider";
import { premierEcranAccessible } from "./lib/runtime/acces";
import { accesData, candidatsEntree } from "./acces.data";
import ScrAnnuaireScreen from "./screens/scr_annuaire";
import ScrDisciplineScreen from "./screens/scr_discipline";
import ScrEncaissementScreen from "./screens/scr_encaissement";
import ScrMembresScreen from "./screens/scr_membres";
import ScrMonTableauScreen from "./screens/scr_mon_tableau";
import ScrParametresScreen from "./screens/scr_parametres";
import ScrSeanceScreen from "./screens/scr_seance";
import ScrTontinesScreen from "./screens/scr_tontines";
import ScrTransactionsScreen from "./screens/scr_transactions";
import ScrVerificationScreen from "./screens/scr_verification";

const Stack = createNativeStackNavigator();

// ── LA COUTURE DE NAVIGATION EST REMPLIE ICI, ET SEULEMENT ICI.
//
// Le runtime partagé (`air-runtime`) ne connaît plus React Navigation : il
// lit un CONTRAT que chaque cible remplit. Sans cet enrobage, le contrat
// resterait inerte — les écrans se monteraient, et aucun geste ne
// naviguerait. Un enrobage PAR ÉCRAN, parce que `useNavigation` de React
// Navigation ne répond qu'À L'INTÉRIEUR d'un écran.
// GÉNÉRIQUE SUR LES PROPS : un écran de détail reçoit les paramètres de sa
// route. Les ignorer ferait perdre l'identifiant de la fiche ouverte.
function avecNavigation<P extends object>(Ecran: React.ComponentType<P>) {
  return function EcranNavigable(props: P) {
    return (
      <NavigationNative>
        <Ecran {...props} />
      </NavigationNative>
    );
  };
}

// Les quatre pages principales sont des RACINES : y aller REMPLACE la pile.
// Sans cela `navigate` les empile, et l'en-tête natif dessine une flèche de
// retour qui fait défiler les onglets à l'envers — défaut vu sur appareil.
// Déclaré au chargement du module, donc avant tout rendu.
declarerRacines(["scr_membres","scr_mon_tableau","scr_tontines","scr_transactions"]);

export function Navigation() {
  const session = useSessionProvider();
  const droits = session.droits?.();
  const depart = premierEcranAccessible(accesData, candidatsEntree, droits, "scr_mon_tableau");
  return (
    <NavigationContainer>
      <Stack.Navigator key={depart} initialRouteName={depart}
        screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.color.light.bg } }}>
      <Stack.Screen name="scr_annuaire" component={avecNavigation(ScrAnnuaireScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_annuaire")!.title }} />
      <Stack.Screen name="scr_discipline" component={avecNavigation(ScrDisciplineScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_discipline")!.title }} />
      <Stack.Screen name="scr_encaissement" component={avecNavigation(ScrEncaissementScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_encaissement")!.title }} />
      <Stack.Screen name="scr_membres" component={avecNavigation(ScrMembresScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_membres")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_mon_tableau" component={avecNavigation(ScrMonTableauScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_mon_tableau")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_parametres" component={avecNavigation(ScrParametresScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_parametres")!.title }} />
      <Stack.Screen name="scr_seance" component={avecNavigation(ScrSeanceScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_seance")!.title }} />
      <Stack.Screen name="scr_tontines" component={avecNavigation(ScrTontinesScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_tontines")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_transactions" component={avecNavigation(ScrTransactionsScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_transactions")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_verification" component={avecNavigation(ScrVerificationScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_verification")!.title }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
