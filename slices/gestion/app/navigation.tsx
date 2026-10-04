// GÉNÉRÉ — NE PAS ÉDITER (navigation : verdict S1 D-026 — native-stack,
// config EXPLICITE émise depuis l'AIR, patron prouvé au banc V4).
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { declarerRacines } from "./lib/runtime/racines-navigation";
import { theme } from "./lib/tokens";
import { navData } from "./nav.data";
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

// Les quatre pages principales sont des RACINES : y aller REMPLACE la pile.
// Sans cela `navigate` les empile, et l'en-tête natif dessine une flèche de
// retour qui fait défiler les onglets à l'envers — défaut vu sur appareil.
// Déclaré au chargement du module, donc avant tout rendu.
declarerRacines(["scr_conteneurs","scr_mouvements","scr_porte","scr_recherche","scr_scanner"]);

export function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="scr_parametres"
        screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.color.light.bg } }}>
      <Stack.Screen name="scr_anticipation" component={ScrAnticipationScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_anticipation")!.title }} />
      <Stack.Screen name="scr_charges" component={ScrChargesScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_charges")!.title }} />
      <Stack.Screen name="scr_clients" component={ScrClientsScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_clients")!.title }} />
      <Stack.Screen name="scr_conteneurs" component={ScrConteneursScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_conteneurs")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_dashboard" component={ScrDashboardScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_dashboard")!.title }} />
      <Stack.Screen name="scr_lieux" component={ScrLieuxScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_lieux")!.title }} />
      <Stack.Screen name="scr_mouvements" component={ScrMouvementsScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_mouvements")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_parametres" component={ScrParametresScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_parametres")!.title }} />
      <Stack.Screen name="scr_porte" component={ScrPorteScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_porte")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_recherche" component={ScrRechercheScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_recherche")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_rentabilite" component={ScrRentabiliteScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_rentabilite")!.title }} />
      <Stack.Screen name="scr_scanner" component={ScrScannerScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_scanner")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_ventes" component={ScrVentesScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_ventes")!.title }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
