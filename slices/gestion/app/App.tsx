// GÉNÉRÉ — NE PAS ÉDITER (racine d'app : thème + données + navigation).
// S7 (D-026) : tokens scellés 1.0.0, design.theme transporté sans effet.
// Provider demo (D-030) : fixtures déterministes compilées (demo.data).
import { ThemeRoot } from "./lib/primitives";
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
  );
}
