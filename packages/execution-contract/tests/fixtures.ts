// Fixtures MINIMALES et NEUTRES — aucun vocabulaire métier (cliquet
// `agnostic.test.ts` le vérifie mécaniquement). Les identifiants sont
// délibérément abstraits : un test qui parlerait de restaurants ou de
// conteneurs ferait entrer un domaine dans le paquet.
import { AIR_SCHEMA_VERSION, type ProjectAir } from "@deribfy/air-schema";

const HASH = "0".repeat(64);

export const L = (text: string): { locale: string; text: string }[] => [
  { locale: "fr-FR", text },
];

// Les valeurs de `flatConfig` sont MUTABLES dans le schéma AIR : le helper
// doit produire exactement ce type, sinon chaque site d'appel porterait un
// cast — et un cast dans une fixture masque les vraies erreurs de contrat.
export const P = (
  record: Readonly<Record<string, string | number | boolean | string[]>>,
): { key: string; value: string | number | boolean | string[] }[] =>
  Object.entries(record).map(([key, value]) => ({ key, value }));

export const entity = (id: string, fieldCount = 2): ProjectAir["entities"][number] => ({
  id,
  name: id.slice(4),
  fields: Array.from({ length: fieldCount }, (_, i) => ({
    id: `fld_${id.slice(4)}_f${i}`,
    name: `f${i}`,
    type: "string" as const,
    required: i === 0,
  })),
});

export const dataset = (
  id: string,
  entityId: string,
  rowCount: number,
): ProjectAir["datasets"][number] => ({ id, entityId, contentHash: HASH, rowCount });

/** AIR valide MINIMAL — surchargeable champ par champ. */
export function air(overrides: Partial<ProjectAir> = {}): ProjectAir {
  return {
    airSchemaVersion: AIR_SCHEMA_VERSION,
    projectId: "prj_t",
    app: {
      name: "T",
      slug: "t-app",
      locales: {
        userLanguage: "fr-FR",
        appLocales: ["fr-FR"],
        defaultAppLocale: "fr-FR",
        contentLocales: ["fr-FR"],
        rtlSupported: false,
      },
    },
    screens: [
      {
        id: "scr_a",
        title: L("A"),
        blocks: [{ id: "blk_a_h", blockType: "header", props: P({ title: "A" }) }],
      },
    ],
    navigation: { entryScreenId: "scr_a", routes: [{ id: "nav_a", screenId: "scr_a" }] },
    entities: [],
    relations: [],
    datasets: [],
    actions: [],
    rules: [],
    slots: [],
    capabilities: [],
    permissions: [],
    design: { theme: "t_theme" },
    integrations: [],
    network: { policy: "deny_by_default", allowedDomains: [] },
    native: { minIosVersion: "16.4", minAndroidSdk: 26 },
    compliance: {
      commerceClass: "none",
      accountDeletionRequired: false,
      dataCollected: [],
    },
    expectedTests: [],
    ...overrides,
  };
}

// ── `requis` — LE NARROWING QUI SE VÉRIFIE, À LA PLACE DU `!` QUI AFFIRME.
//
// `expr!` dit au compilateur « crois-moi » et ne laisse AUCUNE trace à
// l'exécution : quand l'hypothèse est fausse, le test casse plus loin, sur un
// symptôme (`Cannot read properties of undefined`) qui ne nomme ni la valeur
// ni l'endroit. Le lint du moteur l'interdit depuis le premier commit
// (`packages/README.md`) — cette règle n'est pas décorative, elle interdit
// d'affirmer sans vérifier, ce qui est exactement le protocole de preuve.
//
// `requis` échoue AU POINT de l'hypothèse et la NOMME. Sur le chemin nominal
// — la valeur est présente — les deux formes rendent rigoureusement la même
// chose : la substitution ne change aucun test qui passait.
export function requis<T>(valeur: T | null | undefined, quoi: string): T {
  if (valeur === null || valeur === undefined) {
    throw new Error(`valeur requise absente : ${quoi}`);
  }
  return valeur;
}
