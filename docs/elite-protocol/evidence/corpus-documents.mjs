// ════════════════════════════════════════════════════════════════════
//  LA LISTE DES DOCUMENTS MESURÉS — UNE SEULE, POUR LES DEUX CIBLES.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI ELLE EST SORTIE DES GATES.
//
// `gate-app-compile` et `gate-app-web` portaient chacune SA liste. Mesuré le
// 2026-10-05, quelques heures après la naissance de la seconde : 31 documents
// d'un côté, 29 de l'autre. `dougplace` et la variante du serveur neutre
// n'étaient mesurées QUE sur le natif.
//
// C'est la divergence annoncée dans `embed-lib.ts` et payée ici : « deux
// listes auraient divergé au premier fichier ajouté ». Elle a mis quatre
// heures.
//
// Une cible qui compile un document que l'autre ignore ne se voit pas : les
// deux gates sont vertes, et l'écart ne se découvre qu'en lisant les deux
// fichiers côte à côte.
//
// ── LA FORME D'UNE ENTRÉE.
//
//   [nom, chemin]                  — le document tel qu'il est
//   [nom, chemin, transformer]     — une VARIANTE : même document, une
//                                    configuration changée. Le transformateur
//                                    rend `undefined` quand la variante ne
//                                    s'applique pas au document, et la gate
//                                    l'IGNORE en le disant.
import { existsSync, readdirSync } from "node:fs";

/** Les documents à mesurer, pour une racine de dépôt donnée. */
export function documentsDuCorpus(R) {
  return [
    // v3 (généré par emit-v3) EN PLUS de v2 : le corpus gelé reste mesuré, et
    // le nouveau doit franchir exactement les mêmes gates.
    ...readdirSync(R + "packages/golden-corpus/corpus-v2")
      .filter((f) => f.endsWith(".air.json"))
      .map((f) => [f.replace(".air.json", ""), R + "packages/golden-corpus/corpus-v2/" + f]),
    ...(existsSync(R + "packages/golden-corpus/corpus-v3")
      ? readdirSync(R + "packages/golden-corpus/corpus-v3")
          .filter((f) => f.endsWith(".air.json"))
          .map((f) => [
            "v3-" + f.replace(".air.json", ""),
            R + "packages/golden-corpus/corpus-v3/" + f,
          ])
      : []),
    ["slice-conteneurs", R + "slices/conteneurs/air/suivi-conteneurs.air.json"],
    ["resto-riche", R + "slices/resto-riche/chez-nous.air.json"],
    // L'application du propriétaire. Elle n'était dans AUCUNE gate native
    // jusqu'au 2026-10-05 — seule la gate web la compilait — alors que c'est
    // celle qui compte le plus. Son chemin natif reposait sur une sonde
    // lancée à la main.
    ["tontine", R + "slices/tontine/tontine.air.json"],
    // Document de référence de plusieurs cliquets d'émission
    // (`app-shell.test.ts`), et pourtant hors de toutes les gates. C'est elle
    // qui a révélé que les chips de filtre montraient l'identifiant d'une
    // référence au lieu du nom déclaré au document — quatre fuites sur
    // `scr_catalogue`, corrigées dans `air-runtime` en branchant les options
    // sur le résolveur UNIQUE. Une dette trouvée puis laissée dehors revient.
    ["dougplace", R + "slices/dougplace/dougplace.air.json"],
    // ── LE SERVEUR NEUTRE, MESURÉ COMME LE RESTE.
    //
    // Le générateur sait émettre une application qui parle le protocole du
    // moteur (`/air/v1/...`) à un serveur quelconque, au lieu du client
    // Supabase. AUCUN document du corpus ne déclare ce protocole : sans cette
    // variante, le chemin neutre resterait « émis et supposé bon ».
    //
    // Le document est celui du corpus et SEULE sa configuration
    // d'authentification change — un document fabriqué pour l'occasion
    // n'aurait mesuré que ma capacité à écrire un cas qui passe.
    [
      "boutique-mode-serveur-neutre",
      R + "packages/golden-corpus/corpus-v3/boutique-mode.air.json",
      (doc) => {
        const intg = (doc.integrations ?? []).find((i) => i.capability === "auth");
        if (intg === undefined) return undefined; // pas d'auth : rien à mesurer
        intg.config = [
          { key: "url", value: "https://api.exemple.com" },
          { key: "provider", value: "air_http" },
        ];
        return doc;
      },
    ],
  ].filter(([, p]) => existsSync(p));
}
