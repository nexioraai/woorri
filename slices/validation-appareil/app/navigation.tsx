// GÉNÉRÉ — NE PAS ÉDITER (navigation : verdict S1 D-026 — native-stack,
// config EXPLICITE émise depuis l'AIR, patron prouvé au banc V4).
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FermerFeuille } from "./lib/runtime/fermer-feuille";
import { declarerRacines } from "./lib/runtime/racines-navigation";
import { navData } from "./nav.data";
import ScrAccueilScreen from "./screens/scr_accueil";
import ScrBienvenueScreen from "./screens/scr_bienvenue";
import ScrBilletDetailScreen from "./screens/scr_billet_detail";
import ScrBilletsScreen from "./screens/scr_billets";
import ScrCompteScreen from "./screens/scr_compte";
import ScrConnexionScreen from "./screens/scr_connexion";
import ScrDepartDetailScreen from "./screens/scr_depart_detail";
import ScrDepartsScreen from "./screens/scr_departs";
import ScrInscriptionScreen from "./screens/scr_inscription";
import ScrOubliScreen from "./screens/scr_oubli";
import ScrPaiementScreen from "./screens/scr_paiement";
import ScrParametresScreen from "./screens/scr_parametres";
import ScrReservationScreen from "./screens/scr_reservation";

const Stack = createNativeStackNavigator();

// Les quatre pages principales sont des RACINES : y aller REMPLACE la pile.
// Sans cela `navigate` les empile, et l'en-tête natif dessine une flèche de
// retour qui fait défiler les onglets à l'envers — défaut vu sur appareil.
// Déclaré au chargement du module, donc avant tout rendu.
declarerRacines(["scr_accueil","scr_billets","scr_compte","scr_departs"]);

export function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="scr_bienvenue">
      <Stack.Screen name="scr_accueil" component={ScrAccueilScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_accueil")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_bienvenue" component={ScrBienvenueScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_bienvenue")!.title, headerShown: false }} />
      <Stack.Screen name="scr_billet_detail" component={ScrBilletDetailScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_billet_detail")!.title }} />
      <Stack.Screen name="scr_billets" component={ScrBilletsScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_billets")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_compte" component={ScrCompteScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_compte")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_connexion" component={ScrConnexionScreen}
        options={{ title: "", presentation: "modal", headerBackVisible: false, headerShadowVisible: false, headerRight: () => <FermerFeuille testID="fermer-scr_connexion" label="Fermer" /> }} />
      <Stack.Screen name="scr_depart_detail" component={ScrDepartDetailScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_depart_detail")!.title }} />
      <Stack.Screen name="scr_departs" component={ScrDepartsScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_departs")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_inscription" component={ScrInscriptionScreen}
        options={{ title: "", presentation: "modal", headerBackVisible: false, headerShadowVisible: false, headerRight: () => <FermerFeuille testID="fermer-scr_inscription" label="Fermer" /> }} />
      <Stack.Screen name="scr_oubli" component={ScrOubliScreen}
        options={{ title: "", presentation: "modal", headerBackVisible: false, headerShadowVisible: false, headerRight: () => <FermerFeuille testID="fermer-scr_oubli" label="Fermer" /> }} />
      <Stack.Screen name="scr_paiement" component={ScrPaiementScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_paiement")!.title }} />
      <Stack.Screen name="scr_parametres" component={ScrParametresScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_parametres")!.title, presentation: "modal", headerBackVisible: false, headerShadowVisible: false, headerRight: () => <FermerFeuille testID="fermer-scr_parametres" label="Fermer" /> }} />
      <Stack.Screen name="scr_reservation" component={ScrReservationScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_reservation")!.title }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
