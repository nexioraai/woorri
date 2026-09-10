// GÉNÉRÉ — NE PAS ÉDITER (racine d'app : thème + données + navigation).
// S7 (D-026) : tokens scellés 1.0.0, design.theme transporté sans effet.
// Provider demo (D-030) : fixtures déterministes compilées (demo.data).
import { ThemeRoot } from "./lib/primitives";
import { DataRoot } from "./lib/runtime/data-provider";
import { FormStateRoot } from "./lib/runtime/form-state";
import { buildDemoProvider } from "./lib/runtime/demo-provider";
import { CapabilityRoot } from "./lib/runtime/capability-provider";
import { SessionRoot } from "./lib/runtime/session-provider";
import { creerCapabilitesAuthVerifiee } from "./lib/runtime/capabilites-auth";
import { createClient } from "@supabase/supabase-js";
import { creerSessionSupabase } from "./lib/runtime/session-supabase";
import { armerLectureProfil } from "./lib/runtime/lecture-profil";
import { demoData } from "./demo.data";
import { Navigation } from "./navigation";

const provider = buildDemoProvider(demoData);
// Session VÉRIFIÉE : le document déclare OÙ vérifier l'identité.
// La clé anonyme est publiable par conception (protégée par RLS) —
// c'est ce qui ship dans tout client Supabase ; aucun secret ici.
const clientAuth = createClient("https://api.koro-artisans.app", "provisionne_par_le_pipeline");
const session = creerSessionSupabase(clientAuth);
const capabilities = creerCapabilitesAuthVerifiee(session);

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
