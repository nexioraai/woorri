// GÉNÉRÉ — NE PAS ÉDITER (code structurel d'écran : ScreenShell + blocs,
// contrainte 3.4 ; les points d'insertion de Code Slots arrivent en Phase 9).
// DÉFILEMENT (D-031-R47 puis DET-006/D-039) : un écran SANS bloc list
// reste une page défilante ; un écran AVEC bloc list confie le
// défilement à la liste virtualisée elle-même, bornée par Section fill.
// SHELL (étape ②, EP-002) : status bar, safe area et zones persistantes
// appartiennent à AppShell — cet écran ne touche JAMAIS à la safe area.
import { KeyboardAvoidingView, ScrollView } from "react-native";
import { ScreenShell } from "../lib/primitives";
import { AppShell } from "../lib/runtime/app-shell";
import { AirButton, AirHeader, AirSpacer } from "../lib/runtime/air-runtime";
import { screenData } from "./scr_bienvenue.data";

export default function ScrBienvenueScreen() {
  return (
    <ScreenShell testID="scr_bienvenue" title={screenData.title}>
      <AppShell
        avecEntete={false}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <AirHeader screen={screenData} blockId="blk_bienvenue_entete" />
          <AirSpacer screen={screenData} blockId="blk_bienvenue_espace" />
          <AirButton screen={screenData} blockId="blk_bienvenue_inscription" />
          <AirButton screen={screenData} blockId="blk_bienvenue_connexion" />
          <AirButton screen={screenData} blockId="blk_bienvenue_visiteur" />
        </ScrollView>
        </KeyboardAvoidingView>
      </AppShell>
    </ScreenShell>
  );
}
