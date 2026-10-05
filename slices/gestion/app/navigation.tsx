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
import ScrAnticipationScreen from "./screens/scr_anticipation";
import ScrChargesScreen from "./screens/scr_charges";
import ScrClientsScreen from "./screens/scr_clients";
import ScrConteneursScreen from "./screens/scr_conteneurs";
import ScrDashboardScreen from "./screens/scr_dashboard";
import ScrLieuxScreen from "./screens/scr_lieux";
import ScrMouvementsScreen from "./screens/scr_mouvements";
import ScrParametresScreen from "./screens/scr_parametres";
import ScrPorteScreen from "./screens/scr_porte";
import ScrRechercheScreen from "./screens/scr_recherche";
import ScrRentabiliteScreen from "./screens/scr_rentabilite";
import ScrScannerScreen from "./screens/scr_scanner";
import ScrVentesScreen from "./screens/scr_ventes";

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
declarerRacines(["scr_conteneurs","scr_mouvements","scr_porte","scr_recherche","scr_scanner"]);

export function Navigation() {
  const session = useSessionProvider();
  const droits = session.droits?.();
  const depart = premierEcranAccessible(accesData, candidatsEntree, droits, "scr_parametres");
  return (
    <NavigationContainer>
      <Stack.Navigator key={depart} initialRouteName={depart}
        screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.color.light.bg } }}>
      <Stack.Screen name="scr_anticipation" component={avecNavigation(ScrAnticipationScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_anticipation")!.title }} />
      <Stack.Screen name="scr_charges" component={avecNavigation(ScrChargesScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_charges")!.title }} />
      <Stack.Screen name="scr_clients" component={avecNavigation(ScrClientsScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_clients")!.title }} />
      <Stack.Screen name="scr_conteneurs" component={avecNavigation(ScrConteneursScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_conteneurs")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_dashboard" component={avecNavigation(ScrDashboardScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_dashboard")!.title }} />
      <Stack.Screen name="scr_lieux" component={avecNavigation(ScrLieuxScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_lieux")!.title }} />
      <Stack.Screen name="scr_mouvements" component={avecNavigation(ScrMouvementsScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_mouvements")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_parametres" component={avecNavigation(ScrParametresScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_parametres")!.title }} />
      <Stack.Screen name="scr_porte" component={avecNavigation(ScrPorteScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_porte")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_recherche" component={avecNavigation(ScrRechercheScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_recherche")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_rentabilite" component={avecNavigation(ScrRentabiliteScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_rentabilite")!.title }} />
      <Stack.Screen name="scr_scanner" component={avecNavigation(ScrScannerScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_scanner")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_ventes" component={avecNavigation(ScrVentesScreen)}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_ventes")!.title }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
