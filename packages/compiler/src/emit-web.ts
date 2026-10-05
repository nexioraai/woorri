// ════════════════════════════════════════════════════════════════════
//  L'ÉMETTEUR WEB — LA MÊME APPLICATION, UNE AUTRE ENVELOPPE.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI IL EXISTE, ET CE QU'IL NE FAIT PAS.
//
// Un cahier des charges réel — une tontine camerounaise — demande une PWA.
// Le compilateur n'émettait que du React Native. L'AIR, lui, n'a jamais parlé
// de plateforme : il décrit des entités, des écrans, des gestes et des droits.
//
// Cet émetteur ne REFAIT donc presque rien. Les écrans, les données d'écran,
// la navigation logique, le modèle d'accès, les slots : tout cela sort de
// `emitProject` et n'est pas touché. Seule change l'ENVELOPPE — ce qui monte
// l'application, et ce qui la construit.
//
// ── CE QUI DIFFÈRE, ET POURQUOI C'EST SI PEU.
//
//   · le point d'entrée : `createRoot` du DOM au lieu de `registerRootComponent`
//     d'Expo ;
//   · la racine : `NavigationWeb` au lieu de `NavigationContainer` ;
//   · les primitives : `@deribfy/primitives-web` au lieu du paquet natif ;
//   · le gabarit : Vite au lieu d'Expo.
//
// Tout le reste est PARTAGÉ. Si cette liste s'allongeait, c'est que du
// comportement de plateforme aurait fui hors de ces quatre endroits.
//
// ── POURQUOI VITE, ET NON NEXT.
//
// Le cahier demande une PWA « optimisée pour le marché camerounais » :
// partageable par un lien, installable, sans magasin. Vite produit des fichiers
// STATIQUES — un hébergement suffit, aucun serveur Node à tenir, ce qui compte
// quand l'hébergement se paie en devises fortes et que la connexion est
// irrégulière. Next apporterait un rendu serveur dont cette application n'a pas
// l'usage : ses données viennent déjà d'une API.

import type { ProjectAir } from "@deribfy/air-schema";

/** Ce que l'enveloppe web ajoute à ce que `emitProject` a déjà produit. */
export interface EnveloppeWeb {
  readonly files: ReadonlyMap<string, string>;
}

const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";

/**
 * Le point d'entrée du navigateur.
 *
 * `StrictMode` est posé : il monte deux fois chaque composant en développement
 * et révèle les effets qui ne se nettoient pas. Un abonnement laissé ouvert à
 * chaque navigation est le défaut le plus courant d'une application web, et le
 * plus silencieux — la page ralentit, rien ne casse.
 */
const ENTREE = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const racine = document.getElementById("racine");
if (racine === null) throw new Error("ELEMENT_RACINE_ABSENT");
createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

/**
 * La page qui porte l'application.
 *
 * `viewport-fit=cover` et la couleur de thème viennent du natif : une PWA
 * installée occupe l'écran entier, encoche comprise. Sans eux, l'application
 * s'affiche dans un cadre blanc une fois posée sur l'écran d'accueil — ce qui
 * la fait ressembler à une page web ouverte, pas à une application.
 */
const page = (air: ProjectAir): string => `<!doctype html>
<html lang="${air.app.locales.defaultAppLocale}"${air.app.locales.rtlSupported ? ' dir="auto"' : ""}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${air.app.name}</title>
    <link rel="manifest" href="./manifest.webmanifest" />
  </head>
  <body>
    <div id="racine"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
`;

/**
 * Le manifeste qui rend l'application INSTALLABLE.
 *
 * C'est ce qui distingue une PWA d'un site : sans lui, le navigateur ne propose
 * jamais « ajouter à l'écran d'accueil ». `display: standalone` retire la barre
 * d'adresse une fois installée.
 *
 * AUCUNE ICÔNE N'EST DÉCLARÉE, et c'est délibéré : en annoncer une que le
 * document ne porte pas ferait promettre un fichier absent, et le navigateur
 * refuserait l'installation entière plutôt que de l'ignorer.
 */
const manifeste = (air: ProjectAir): string =>
  json({
    name: air.app.name,
    short_name: air.app.name,
    start_url: "./",
    display: "standalone",
    lang: air.app.locales.defaultAppLocale,
    ...(air.app.locales.rtlSupported ? { dir: "auto" } : {}),
  });

/**
 * La racine de l'application web.
 *
 * Elle reprend l'ordre des fournisseurs du natif — thème, données, formulaires,
 * navigation — parce que cet ordre porte des dépendances réelles : le thème
 * avant tout (les primitives le lisent), les données avant les écrans.
 */
const racine = (air: ProjectAir, avecSession: boolean): string => {
  const l: string[] = [
    "// GÉNÉRÉ — NE PAS ÉDITER (racine d'app WEB : thème + données + navigation).",
    'import { ThemeRoot } from "./lib/primitives";',
    'import { DataRoot } from "./lib/runtime/data-provider";',
    'import { FormStateRoot } from "./lib/runtime/form-state";',
    'import { NavigationWeb } from "./lib/runtime/navigation-web";',
    'import { buildDemoProvider } from "./lib/runtime/demo-provider";',
    'import { demoData } from "./demo.data";',
    'import { navData } from "./nav.data";',
    'import { Navigation } from "./navigation";',
  ];
  // ── LA SESSION SE MONTE, ELLE NE S'IMPORTE PAS SEULEMENT.
  //
  // J'avais écrit l'import sans l'enrobage. C'est EXACTEMENT le défaut payé sur
  // le natif au lot 1.28.0 : le modèle d'accès était émis et INERTE, parce que
  // `useSessionProvider` rendait la session anonyme faute de racine montée.
  // Un droit qu'on déclare et que personne ne lit est pire qu'absent.
  if (avecSession) {
    l.push(
      'import { SessionRoot } from "./lib/runtime/session-provider";',
      'import { creerSessionLocale } from "./lib/runtime/session-locale";',
    );
  }
  l.push("const provider = buildDemoProvider(demoData);");
  if (avecSession) l.push("const session = creerSessionLocale();");
  l.push(
    "export default function App() {",
    "  return (",
    "    <ThemeRoot>",
    "      <DataRoot provider={provider}>",
    ...(avecSession ? ["      <SessionRoot provider={session}>"] : []),
    "        <FormStateRoot>",
    "          <NavigationWeb ecranDEntree={navData.entryScreenId}>",
    "            <Navigation />",
    "          </NavigationWeb>",
    "        </FormStateRoot>",
    ...(avecSession ? ["      </SessionRoot>"] : []),
    "      </DataRoot>",
    "    </ThemeRoot>",
    "  );",
    "}",
    "",
  );
  return l.join("\n");
};

/**
 * La navigation web : UN SEUL écran monté à la fois, désigné par l'adresse.
 *
 * Le natif empile des écrans ; le web n'a pas de pile — il a une ADRESSE. Celle
 * qui fait foi est lue à chaque rendu, jamais recopiée dans un état parallèle
 * qui pourrait en diverger.
 *
 * ⚠️ CE QUI MANQUE, ET QUI EST DIT : pas d'animation de transition, et pas
 * d'historique propre à chaque onglet — exactement les deux manques que la
 * barre principale du natif consigne déjà. Les annoncer identiques des deux
 * côtés vaut mieux que de laisser croire à une parité qui n'existe pas.
 */
const navigation = (air: ProjectAir, pascal: (id: string) => string): string => {
  const routes = air.navigation.routes;
  const l: string[] = [
    "// GÉNÉRÉ — NE PAS ÉDITER (navigation WEB : l'adresse désigne l'écran).",
    'import { ecranDeLAdresse } from "./lib/runtime/navigation-web";',
    'import { declarerRacines } from "./lib/runtime/racines-navigation";',
    'import { navData } from "./nav.data";',
    ...routes.map((r) => `import ${pascal(r.screenId)}Screen from "./screens/${r.screenId}";`),
    "",
    `declarerRacines(${JSON.stringify(
      (air.navigation.primary?.destinations ?? [])
        .map((d) => routes.find((r) => r.id === d.routeId)?.screenId)
        .filter((x): x is string => x !== undefined),
    )});`,
    "",
    "const ECRANS: Record<string, () => React.JSX.Element> = {",
    ...routes.map((r) => `  ${JSON.stringify(r.screenId)}: ${pascal(r.screenId)}Screen,`),
    "};",
    "",
    "export function Navigation() {",
    "  const courant = ecranDeLAdresse(navData.entryScreenId);",
    "  // UNE ADRESSE INCONNUE REND L'ÉCRAN D'ENTRÉE, jamais une page vide : un",
    "  // lien périmé ou mal recopié doit ramener quelque part, pas nulle part.",
    "  const Ecran = ECRANS[courant] ?? ECRANS[navData.entryScreenId];",
    "  if (Ecran === undefined) return null;",
    "  return <Ecran />;",
    "}",
    "",
  ];
  return l.join("\n");
};

/** Le gabarit : Vite, et le strict nécessaire. */
const gabarit = (air: ProjectAir): ReadonlyMap<string, string> =>
  new Map([
    [
      "package.json",
      json({
        name: air.app.slug,
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { react: "^19.2.0", "react-dom": "^19.2.0" },
        devDependencies: {
          "@vitejs/plugin-react": "^5",
          typescript: "^5",
          vite: "^7",
        },
      }),
    ],
    [
      "vite.config.ts",
      `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// \`base\` RELATIVE : l'application doit fonctionner servie depuis un
// sous-dossier, ce qui est le cas de la plupart des hébergements simples.
// Une base absolue casse tous les chemins dès que l'URL n'est pas la racine.
export default defineConfig({ base: "./", plugins: [react()] });
`,
    ],
  ]);

/**
 * L'enveloppe web, à poser SUR ce que `emitProject` a produit.
 *
 * Les fichiers rendus ici REMPLACENT leurs équivalents natifs (`App.tsx`,
 * `navigation.tsx`, `package.json`) et en ajoutent quatre. Les écrans, les
 * données et la bibliothèque restent ceux de l'émission commune.
 */
export function enveloppeWeb(air: ProjectAir, pascal: (id: string) => string): EnveloppeWeb {
  const avecSession = air.access !== undefined;
  const files = new Map<string, string>([
    ["index.html", page(air)],
    ["index.tsx", ENTREE],
    ["manifest.webmanifest", manifeste(air)],
    ["App.tsx", racine(air, avecSession)],
    ["navigation.tsx", navigation(air, pascal)],
    ...gabarit(air),
  ]);
  return { files };
}
