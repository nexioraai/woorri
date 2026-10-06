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
// Le verrou de dépendances du gabarit web, scellé depuis un `npm install`
// RÉEL sur le `package.json` émis — voir `template-web/LISEZ-MOI.md`.
import { EMBEDDED_TEMPLATE_WEB } from "./embedded-template-web.generated.ts";

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
 * ── POURQUOI L'ENCOCHE EST TRAITÉE DANS CETTE PAGE, ET NULLE PART AILLEURS.
 *
 * `viewport-fit=cover` fait occuper l'écran ENTIER à une PWA installée —
 * encoche et barre de gestes comprises. Sans rembourrage, le haut de
 * l'application passe SOUS l'heure du système.
 *
 * Le natif obtient ces marges en NOMBRES (`useSafeAreaInsets`) ; le web ne les
 * connaît qu'en CSS, résolues au moment du rendu. C'est pourquoi la couture
 * `plateforme-web` rend des zéros : la marge est déjà posée ici, et les
 * additionner la doublerait sur un iPhone.
 *
 * ⚠️ CETTE EXPLICATION VIT ICI, PAS DANS LA PAGE ÉMISE. Mesuré le 2026-10-05
 * sur le vrai build Vite : les quatorze lignes de commentaire partaient dans
 * `dist/index.html` — 546 octets servis à CHAQUE visiteur, qui expliquent le
 * moteur à quelqu'un qui ne le lira jamais, et qui nomment des modules
 * internes au passage. Le mainteneur lit ce fichier ; l'utilisateur reçoit la
 * page.
 */

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
    <style>
      /* Zones sûres de l'appareil — voir PUBLICATION.md. */
      html, body { margin: 0; height: 100%; }
      #racine {
        min-height: 100%;
        display: flex;
        flex-direction: column;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }
    </style>
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
    'import { ecranDeLAdresse, parametresDeLAdresse } from "./lib/runtime/navigation-web";',
    'import type { AirScreenProps } from "./lib/runtime/air-runtime";',
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
    // LE TYPE DIT LA VÉRITÉ : un écran REÇOIT sa route. Le typer `() => Element`
    // compilait sur le natif par hasard et refusait de compiler ici — c'est la
    // gate web qui l'a dit, et elle avait raison : un écran de détail sans son
    // `itemId` s'affiche vide.
    "const ECRANS: Record<string, (p: AirScreenProps) => React.JSX.Element> = {",
    ...routes.map((r) => `  ${JSON.stringify(r.screenId)}: ${pascal(r.screenId)}Screen,`),
    "};",
    "",
    "export function Navigation() {",
    "  const courant = ecranDeLAdresse(navData.entryScreenId);",
    "  // UNE ADRESSE INCONNUE REND L'ÉCRAN D'ENTRÉE, jamais une page vide : un",
    "  // lien périmé ou mal recopié doit ramener quelque part, pas nulle part.",
    "  const Ecran = ECRANS[courant] ?? ECRANS[navData.entryScreenId];",
    "  if (Ecran === undefined) return null;",
    "  // Les paramètres viennent de l'ADRESSE, comme l'écran : un lien vers une",
    "  // fiche se partage et se recharge, ou ce n'est pas une application web.",
    "  return <Ecran route={{ params: parametresDeLAdresse() }} />;",
    "}",
    "",
  ];
  return l.join("\n");
};

/**
 * CE QUE VOTRE HÉBERGEUR ATTEND — la note de publication, version web.
 *
 * Le natif en émet une, tournée vers les magasins : comptes développeur,
 * captures, politique de confidentialité. Rien de cela ne s'applique ici, et la
 * laisser passer telle quelle enverrait le propriétaire remplir des formulaires
 * d'Apple pour une page web. Une PWA se publie autrement — et elle se publie
 * en trois commandes, ce qui mérite d'être dit aussi clairement.
 */
const publication = (air: ProjectAir): string => {
  // `compliance.dataCollected` est OBLIGATOIRE au contrat : pas de repli ici,
  // le lint refuse à juste titre une garde sur une valeur toujours présente.
  const collecte = air.compliance.dataCollected;
  const l: string[] = [
    `# Mettre « ${air.app.name} » en ligne`,
    "",
    "Votre application web est générée. Elle produit des fichiers STATIQUES :",
    "n'importe quel hébergement sait les servir, aucun serveur à maintenir.",
    "",
    "## Les trois commandes",
    "",
    "```sh",
    "npm ci           # une fois — installe EXACTEMENT les versions du verrou",
    "npm run dev      # pour voir l'application sur votre machine",
    "npm run build    # produit le dossier `dist/` — c'est lui qu'on héberge",
    "```",
    "",
    "Déposez le contenu de `dist/` chez votre hébergeur. L'application",
    "fonctionne servie depuis un sous-dossier : aucun chemin n'est absolu.",
    "",
    "## Pourquoi `npm ci` et non `npm install`",
    "",
    "Ce projet porte un `package-lock.json`. `npm ci` installe EXACTEMENT les",
    "versions qui y sont inscrites — celles avec lesquelles le build a été",
    "vérifié. `npm install`, lui, RÉSOUT les versions au moment où vous le",
    "lancez : dans six mois il pourrait prendre une dépendance plus récente et",
    "casser votre build, sans que rien de votre côté ait changé.",
    "",
    "## Ce qu'il reste à faire, et que personne ne peut faire à votre place",
    "",
    "- **HTTPS est obligatoire.** Sans lui, le navigateur refuse l'installation",
    "  sur l'écran d'accueil, et l'application reste une page web ordinaire.",
    "- **Les icônes.** Le manifeste n'en déclare AUCUNE, délibérément : annoncer",
    "  un fichier absent ferait refuser l'installation entière. Ajoutez vos",
    "  icônes puis déclarez-les dans `manifest.webmanifest`.",
  ];
  if (collecte.length > 0) {
    l.push(
      `- **Une politique de confidentialité.** Cette application collecte : ${collecte.join(", ")}.`,
      "  Sur le web, aucun magasin ne vous la réclamera — la loi, elle, si.",
    );
  }
  l.push(
    "",
    "## Ce que la version web ne fait pas",
    "",
    "- **Pas de fonctionnement hors ligne.** Aucun service worker n'est généré :",
    "  en poser un sans stratégie de cache servirait une version périmée de",
    "  l'application sans jamais dire laquelle.",
    "- **Pas de notifications poussées.**",
    "- **Les signes (icônes) ne s'affichent pas.** La police du vocabulaire",
    "  fermé est embarquée côté natif ; côté web, elle n'est pas encore livrée.",
    "  Les libellés, eux, sont intacts.",
    "",
  );
  return l.join("\n");
};

/**
 * Le verrou scellé, au nom de CETTE application.
 *
 * On remplace le nom à DEUX endroits — la racine du document et l'entrée
 * `packages[""]` — parce que npm les lit tous les deux. N'en changer qu'un
 * laisse un projet qui se contredit lui-même.
 */
const verrou = (slug: string): string => {
  const brut = EMBEDDED_TEMPLATE_WEB["package-lock.json"];
  if (brut === undefined) {
    // Le gabarit est généré et scellé : son absence est un défaut du
    // compilateur, jamais un cas d'entrée. Refus net plutôt qu'un projet émis
    // sans verrou, qui ressemblerait à un projet normal.
    throw new Error("GABARIT_WEB_VERROU_ABSENT");
  }
  const lock = JSON.parse(brut) as {
    name?: string;
    packages?: Record<string, { name?: string }>;
  };
  lock.name = slug;
  const racine = lock.packages?.[""];
  if (racine !== undefined) racine.name = slug;
  return JSON.stringify(lock, null, 2) + "\n";
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
      // LE TSCONFIG N'EST PAS UN DÉTAIL DE CONFORT.
      //
      // Le natif reçoit le sien du gabarit Expo scellé. Le web n'avait AUCUN
      // tsconfig : l'application était émise, et rien — ni `tsc`, ni l'éditeur
      // du propriétaire — ne pouvait vérifier qu'elle tient. Le défaut que je
      // paie en boucle : produit, donc supposé bon.
      //
      // `allowImportingTsExtensions` est requis parce que la bibliothèque
      // embarquée importe `./contracts.ts` extension comprise, comme en natif.
      "tsconfig.json",
      json({
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          allowImportingTsExtensions: true,
          esModuleInterop: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["**/*.ts", "**/*.tsx"],
        // `vite.config.ts` est EXCLU, comme dans le gabarit officiel de Vite,
        // et la raison n'est pas un contournement : ce fichier ne tourne pas
        // dans le navigateur. Il est exécuté par Node AVANT le build, et il
        // n'a donc ni le même environnement (`lib: DOM` ne s'y applique pas)
        // ni le même cycle de vie que le code de l'application. Le typer avec
        // les mêmes réglages mélange deux programmes dans un seul contrat.
        exclude: ["node_modules", "dist", "vite.config.ts"],
      }),
    ],
    [".gitignore", "node_modules/\ndist/\n"],
    [
      // ── LE VERROU DE DÉPENDANCES — ET SON ABSENCE N'ÉTAIT PAS ANODINE.
      //
      // La cible native scelle le sien depuis l'origine ; la cible web n'en
      // émettait AUCUN, et la gate de compilation le déclarait comme sa
      // propre limite.
      //
      // Sans verrou, le propriétaire installe aujourd'hui une version et dans
      // six mois une autre : son `npm run build` peut casser sur une
      // dépendance transitive qu'il n'a pas choisie, sans explication, et sans
      // que rien de notre côté n'ait changé. Un générateur qui produit un
      // projet non reproductible produit un projet qui pourrit.
      //
      // LE NOM EST RÉÉCRIT, pas le contenu. Le verrou scellé porte un nom
      // neutre ; `package.json` porte le slug de l'application. `npm ci`
      // compare les DÉPENDANCES — mais laisser deux noms différents dans un
      // projet livré est le genre de détail qui fait douter du reste.
      "package-lock.json",
      verrou(air.app.slug),
    ],
    ["PUBLICATION.md", publication(air)],
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
