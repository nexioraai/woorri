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
import { AirButton, AirForm, AirHeader } from "../lib/runtime/air-runtime";
import type { AirScreenProps } from "../lib/runtime/air-runtime";
import { screenData } from "./scr_connexion.data";

export default function ScrConnexionScreen({ route }: AirScreenProps) {
  return (
    <ScreenShell testID="scr_connexion" title={screenData.title}>
      <AppShell
        avecEntete={true}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <AirHeader screen={screenData} blockId="blk_connexion_entete" />
          <AirForm screen={screenData} blockId="blk_connexion_form" itemId={route?.params?.itemId} />
          <AirButton screen={screenData} blockId="blk_connexion_oubli" />
          <AirButton screen={screenData} blockId="blk_connexion_vers_inscription" />
        </ScrollView>
        </KeyboardAvoidingView>
      </AppShell>
    </ScreenShell>
  );
}
