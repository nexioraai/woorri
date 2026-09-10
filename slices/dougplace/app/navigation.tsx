// GÉNÉRÉ — NE PAS ÉDITER (navigation : verdict S1 D-026 — native-stack,
// config EXPLICITE émise depuis l'AIR, patron prouvé au banc V4).
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { declarerRacines } from "./lib/runtime/racines-navigation";
import { theme } from "./lib/tokens";
import { navData } from "./nav.data";
import ScrAccueilScreen from "./screens/scr_accueil";
import ScrAdresseLivraisonScreen from "./screens/scr_adresse_livraison";
import ScrBienvenueScreen from "./screens/scr_bienvenue";
import ScrCatalogueScreen from "./screens/scr_catalogue";
import ScrCommandeDetailScreen from "./screens/scr_commande_detail";
import ScrCommandesScreen from "./screens/scr_commandes";
import ScrCompteScreen from "./screens/scr_compte";
import ScrConnexionScreen from "./screens/scr_connexion";
import ScrInscriptionScreen from "./screens/scr_inscription";
import ScrMotDePasseOublieScreen from "./screens/scr_mot_de_passe_oublie";
import ScrPaiementScreen from "./screens/scr_paiement";
import ScrPanierScreen from "./screens/scr_panier";
import ScrProduitDetailScreen from "./screens/scr_produit_detail";
import ScrVendeurDetailScreen from "./screens/scr_vendeur_detail";

const Stack = createNativeStackNavigator();

// Les quatre pages principales sont des RACINES : y aller REMPLACE la pile.
// Sans cela `navigate` les empile, et l'en-tête natif dessine une flèche de
// retour qui fait défiler les onglets à l'envers — défaut vu sur appareil.
// Déclaré au chargement du module, donc avant tout rendu.
declarerRacines(["scr_accueil","scr_catalogue","scr_commandes","scr_compte","scr_panier"]);

export function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="scr_bienvenue"
        screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.color.light.bg } }}>
      <Stack.Screen name="scr_accueil" component={ScrAccueilScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_accueil")!.title, headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="scr_adresse_livraison" component={ScrAdresseLivraisonScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_adresse_livraison")!.title }} />
      <Stack.Screen name="scr_bienvenue" component={ScrBienvenueScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_bienvenue")!.title, headerShown: false }} />
      <Stack.Screen name="scr_catalogue" component={ScrCatalogueScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_catalogue")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_commande_detail" component={ScrCommandeDetailScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_commande_detail")!.title, headerShown: false }} />
      <Stack.Screen name="scr_commandes" component={ScrCommandesScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_commandes")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_compte" component={ScrCompteScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_compte")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_connexion" component={ScrConnexionScreen}
        options={{ title: "", presentation: "modal" }} />
      <Stack.Screen name="scr_inscription" component={ScrInscriptionScreen}
        options={{ title: "", presentation: "modal" }} />
      <Stack.Screen name="scr_mot_de_passe_oublie" component={ScrMotDePasseOublieScreen}
        options={{ title: "", presentation: "modal" }} />
      <Stack.Screen name="scr_paiement" component={ScrPaiementScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_paiement")!.title }} />
      <Stack.Screen name="scr_panier" component={ScrPanierScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_panier")!.title, gestureEnabled: false }} />
      <Stack.Screen name="scr_produit_detail" component={ScrProduitDetailScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_produit_detail")!.title, headerShown: false }} />
      <Stack.Screen name="scr_vendeur_detail" component={ScrVendeurDetailScreen}
        options={{ title: navData.routes.find((x) => x.screenId === "scr_vendeur_detail")!.title, headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
