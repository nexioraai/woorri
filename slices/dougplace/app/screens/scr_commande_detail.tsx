// GÉNÉRÉ — NE PAS ÉDITER (code structurel d'écran : ScreenShell + blocs,
// contrainte 3.4 ; les points d'insertion de Code Slots arrivent en Phase 9).
// DÉFILEMENT (D-031-R47 puis DET-006/D-039) : un écran SANS bloc list
// reste une page défilante ; un écran AVEC bloc list confie le
// défilement à la liste virtualisée elle-même, bornée par Section fill.
// SHELL (étape ②, EP-002) : status bar, safe area et zones persistantes
// appartiennent à AppShell — cet écran ne touche JAMAIS à la safe area.
import { ScreenShell } from "../lib/primitives";
import { AppShell } from "../lib/runtime/app-shell";
import { AirDetailHeader, AirHeader, AirList, AirScreenLifecycle } from "../lib/runtime/air-runtime";
import { PrimaryNav } from "../lib/runtime/primary-nav";
import { primaryNav } from "../nav.data";
import type { AirScreenProps } from "../lib/runtime/air-runtime";
import { screenData } from "./scr_commande_detail.data";

export default function ScrCommandeDetailScreen({ route }: AirScreenProps) {
  return (
    <ScreenShell testID="scr_commande_detail" title={screenData.title}>
      <AirScreenLifecycle screen={screenData} />
      <AppShell
        avecEntete={false}
        navigation={<PrimaryNav destinations={primaryNav} currentScreenId="scr_commande_detail" />}
      >
        <AirDetailHeader screen={screenData} blockId="blk_commande_entete" itemId={route?.params?.itemId} />
        <AirHeader screen={screenData} blockId="blk_commande_suivi" />
        <AirList screen={screenData} blockId="blk_commande_paiement" itemId={route?.params?.itemId} />
      </AppShell>
    </ScreenShell>
  );
}
