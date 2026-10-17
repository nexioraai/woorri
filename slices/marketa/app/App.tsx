// GÉNÉRÉ — NE PAS ÉDITER (racine d'app : thème + données + navigation).
// THÈME (2026-10-17) : design.theme choisit un MONDE VISUEL dans le
// catalogue fermé — palette complète, rayons, famille de caracteres. La
// mention « transporté sans effet » était vraie jusque-là : le nom
// n'était haché qu'en une rotation de teinte, 2 jetons sur 12.
// Provider demo (D-030) : fixtures déterministes compilées (demo.data).
import { ThemeRoot } from "./lib/primitives";
import { PoliceRoot } from "./lib/runtime/polices";
import { DataRoot } from "./lib/runtime/data-provider";
import { FormStateRoot } from "./lib/runtime/form-state";
import { buildDemoProvider } from "./lib/runtime/demo-provider";
import { CapabilityRoot } from "./lib/runtime/capability-provider";
import { SessionRoot } from "./lib/runtime/session-provider";
import { creerCapabilitesAuth } from "./lib/runtime/capabilites-auth";
import { creerSessionLocale } from "./lib/runtime/session-locale";
import { demoData } from "./demo.data";
import { Navigation } from "./navigation";

const provider = buildDemoProvider(demoData);
// Session LOCALE : identité DÉCLARÉE par la personne, non vérifiée
// par un serveur — équivalent de demo.data pour l'identité. Le
// document ne déclare aucune intégration d'authentification.
const session = creerSessionLocale();
const capabilities = creerCapabilitesAuth(session);

export default function App() {
  return (
    <PoliceRoot>
    <ThemeRoot>
      <SessionRoot provider={session}>
      <CapabilityRoot provider={capabilities}>
      <DataRoot provider={provider}>
        <FormStateRoot>
          <Navigation />
        </FormStateRoot>
      </DataRoot>
      </CapabilityRoot>
      </SessionRoot>
    </ThemeRoot>
    </PoliceRoot>
  );
}
