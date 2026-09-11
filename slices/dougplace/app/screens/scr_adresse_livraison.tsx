// GÉNÉRÉ — NE PAS ÉDITER (code structurel d'écran : ScreenShell + blocs,
// contrainte 3.4 ; les points d'insertion de Code Slots arrivent en Phase 9).
// DÉFILEMENT (D-031-R47 puis DET-006/D-039) : un écran SANS bloc list
// reste une page défilante ; un écran AVEC bloc list confie le
// défilement à la liste virtualisée elle-même, bornée par Section fill.
// SHELL (étape ②, EP-002) : status bar, safe area et zones persistantes
// appartiennent à AppShell — cet écran ne touche JAMAIS à la safe area.
import { ScreenShell } from "../lib/primitives";
import { AppShell } from "../lib/runtime/app-shell";
import { AirForm, AirHeader, AirList } from "../lib/runtime/air-runtime";
import type { AirScreenProps } from "../lib/runtime/air-runtime";
import { screenData } from "./scr_adresse_livraison.data";

export default function ScrAdresseLivraisonScreen({ route }: AirScreenProps) {
  return (
    <ScreenShell testID="scr_adresse_livraison" title={screenData.title}>
      <AppShell
        avecEntete={true}
      >
        <AirHeader screen={screenData} blockId="blk_adresse_entete" />
        <AirList screen={screenData} blockId="blk_adresse_liste" itemId={route?.params?.itemId} />
        <AirForm screen={screenData} blockId="blk_adresse_form" itemId={route?.params?.itemId} />
      </AppShell>
    </ScreenShell>
  );
}
