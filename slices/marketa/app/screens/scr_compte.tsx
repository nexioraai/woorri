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
import { AirButton, AirEmptyState, AirHeader } from "../lib/runtime/air-runtime";
import { PrimaryNav } from "../lib/runtime/primary-nav";
import { primaryNav } from "../nav.data";
import { screenData } from "./scr_compte.data";

export default function ScrCompteScreen() {
  return (
    <ScreenShell testID="scr_compte" title={screenData.title}>
      <AppShell
        avecEntete={true}
        navigation={<PrimaryNav destinations={primaryNav} currentScreenId="scr_compte" />}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <AirHeader screen={screenData} blockId="blk_compte_header" />
          <AirEmptyState screen={screenData} blockId="blk_compte_invite" />
          <AirButton screen={screenData} blockId="blk_compte_connexion" />
          <AirButton screen={screenData} blockId="blk_compte_inscription" />
          <AirEmptyState screen={screenData} blockId="blk_compte_confirmation" />
          <AirButton screen={screenData} blockId="blk_compte_profil" />
          <AirButton screen={screenData} blockId="blk_compte_deconnexion" />
        </ScrollView>
        </KeyboardAvoidingView>
      </AppShell>
    </ScreenShell>
  );
}
