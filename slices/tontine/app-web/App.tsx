// GÉNÉRÉ — NE PAS ÉDITER (racine d'app WEB : thème + données + navigation).
import { ThemeRoot } from "./lib/primitives";
import { DataRoot } from "./lib/runtime/data-provider";
import { FormStateRoot } from "./lib/runtime/form-state";
import { NavigationWeb } from "./lib/runtime/navigation-web";
import { buildDemoProvider } from "./lib/runtime/demo-provider";
import { demoData } from "./demo.data";
import { navData } from "./nav.data";
import { Navigation } from "./navigation";
import { SessionRoot } from "./lib/runtime/session-provider";
import { creerSessionLocale } from "./lib/runtime/session-locale";
const provider = buildDemoProvider(demoData);
const session = creerSessionLocale();
export default function App() {
  return (
    <ThemeRoot>
      <DataRoot provider={provider}>
      <SessionRoot provider={session}>
        <FormStateRoot>
          <NavigationWeb ecranDEntree={navData.entryScreenId}>
            <Navigation />
          </NavigationWeb>
        </FormStateRoot>
      </SessionRoot>
      </DataRoot>
    </ThemeRoot>
  );
}
