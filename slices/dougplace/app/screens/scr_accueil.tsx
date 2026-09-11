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
import { AirHeader, AirList } from "../lib/runtime/air-runtime";
import { PrimaryNav } from "../lib/runtime/primary-nav";
import { primaryNav } from "../nav.data";
import type { AirScreenProps } from "../lib/runtime/air-runtime";
import { screenData } from "./scr_accueil.data";

export default function ScrAccueilScreen({ route }: AirScreenProps) {
  return (
    <ScreenShell testID="scr_accueil" title={screenData.title}>
      <AppShell
        avecEntete={false}
        navigation={<PrimaryNav destinations={primaryNav} currentScreenId="scr_accueil" />}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <AirHeader screen={screenData} blockId="blk_accueil_entete" />
          <AirList screen={screenData} blockId="blk_accueil_categories" itemId={route?.params?.itemId} />
          <AirList screen={screenData} blockId="blk_accueil_selection" itemId={route?.params?.itemId} />
          <AirList screen={screenData} blockId="blk_accueil_boutiques" itemId={route?.params?.itemId} />
        </ScrollView>
        </KeyboardAvoidingView>
      </AppShell>
    </ScreenShell>
  );
}
