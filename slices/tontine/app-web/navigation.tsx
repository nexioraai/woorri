// GÉNÉRÉ — NE PAS ÉDITER (navigation WEB : l'adresse désigne l'écran).
import { ecranDeLAdresse, parametresDeLAdresse } from "./lib/runtime/navigation-web";
import type { AirScreenProps } from "./lib/runtime/air-runtime";
import { declarerRacines } from "./lib/runtime/racines-navigation";
import { navData } from "./nav.data";
import ScrMonTableauScreen from "./screens/scr_mon_tableau";
import ScrTontinesScreen from "./screens/scr_tontines";
import ScrMembresScreen from "./screens/scr_membres";
import ScrTransactionsScreen from "./screens/scr_transactions";
import ScrAnnuaireScreen from "./screens/scr_annuaire";
import ScrVerificationScreen from "./screens/scr_verification";
import ScrDisciplineScreen from "./screens/scr_discipline";
import ScrEncaissementScreen from "./screens/scr_encaissement";
import ScrSeanceScreen from "./screens/scr_seance";
import ScrParametresScreen from "./screens/scr_parametres";

declarerRacines(["scr_mon_tableau","scr_tontines","scr_membres","scr_transactions"]);

const ECRANS: Record<string, (p: AirScreenProps) => React.JSX.Element> = {
  "scr_mon_tableau": ScrMonTableauScreen,
  "scr_tontines": ScrTontinesScreen,
  "scr_membres": ScrMembresScreen,
  "scr_transactions": ScrTransactionsScreen,
  "scr_annuaire": ScrAnnuaireScreen,
  "scr_verification": ScrVerificationScreen,
  "scr_discipline": ScrDisciplineScreen,
  "scr_encaissement": ScrEncaissementScreen,
  "scr_seance": ScrSeanceScreen,
  "scr_parametres": ScrParametresScreen,
};

export function Navigation() {
  const courant = ecranDeLAdresse(navData.entryScreenId);
  // UNE ADRESSE INCONNUE REND L'ÉCRAN D'ENTRÉE, jamais une page vide : un
  // lien périmé ou mal recopié doit ramener quelque part, pas nulle part.
  const Ecran = ECRANS[courant] ?? ECRANS[navData.entryScreenId];
  if (Ecran === undefined) return null;
  // Les paramètres viennent de l'ADRESSE, comme l'écran : un lien vers une
  // fiche se partage et se recharge, ou ce n'est pas une application web.
  return <Ecran route={{ params: parametresDeLAdresse() }} />;
}
