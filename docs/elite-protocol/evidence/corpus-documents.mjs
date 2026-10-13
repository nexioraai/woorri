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
    // ── L'AGENT ET SON CONNECTEUR, MESURES COMME LE RESTE (2026-10-13).
    //
    // MEME TROU, MEME REMEDE QUE LE SERVEUR NEUTRE JUSTE AU-DESSUS. Mesure du
    // 2026-10-13 : ZERO document du corpus ne declare `apis` ni `agent`. Tout
    // le connecteur d'API, la porte de l'agent, son cerveau et son ecran
    // etaient prouves par des tests — et par AUCUNE gate. Un lot prouve par
    // ses seuls tests reste « emis et suppose bon » : rien ne verifiait que
    // l'application COMPILE, se REND, et se CONSTRUISE avec un agent dedans.
    //
    // ET POURQUOI UNE VARIANTE, PAS UN DOCUMENT NEUF. La raison est ecrite
    // au-dessus et vaut ici mot pour mot : un document fabrique pour
    // l'occasion n'aurait mesure que ma capacite a ecrire un cas qui passe.
    // Celui-ci est un document REEL du corpus ; seules les cles de l'agent
    // sont ajoutees.
    [
      "boutique-mode-agent",
      R + "packages/golden-corpus/corpus-v3/boutique-mode.air.json",
      (doc) => {
        const ecran = (doc.screens ?? [])[0];
        if (ecran === undefined) return undefined; // aucun ecran : rien a mesurer
        // ── UNE IDENTITE VERIFIEE, SINON L'AGENT EST INERTE.
        //
        // TOUTES les routes de l'agent exigent un appelant verifiable. Mesure
        // du 2026-10-13 : l'integration d'authentification de ce document
        // porte la cle `baseUrl`, pas `url` — la resolution ne la reconnait
        // donc pas, et l'application tombait sur la session LOCALE, qui ne
        // produit aucun jeton. Chaque appel de l'agent aurait ete refuse 403 :
        // emis, et inerte.
        //
        // L'identite est verifiee par un service DECLARE, pas par le serveur
        // emis — celui-ci VERIFIE un jeton, il n'en delivre pas. C'est la
        // meme forme que la variante du serveur neutre juste au-dessus.
        const intg = (doc.integrations ?? []).find((i) => i.capability === "auth");
        if (intg === undefined) return undefined; // pas d'auth : rien a mesurer
        const domaineAuth = "api.exemple-auth.com";
        intg.config = [
          { key: "url", value: "https://" + domaineAuth },
          { key: "provider", value: "air_http" },
        ];
        // Le serveur est EMIS : c'est lui qui porte les routes de l'agent.
        // Son domaine entre dans la politique reseau — le validateur l'exige,
        // et une application qui parle a un hote que sa propre politique
        // interdit ne joint rien.
        const domaine = "api.boutique-mode.app";
        doc.backend = { kind: "genere", stack: "fastify", domain: domaine };
        const domaineApi = "api.exemple-service.com";
        doc.network = {
          ...doc.network,
          allowedDomains: [
            ...(doc.network?.allowedDomains ?? []),
            domaineApi,
            domaineAuth,
          ],
        };
        doc.apis = [
          {
            id: "api_service",
            name: "Service de messages",
            domain: domaineApi,
            auth: {
              kind: "header_secret",
              headerName: "X-Api-Key",
              secretEnvName: "SERVICE_API_KEY",
            },
            operations: [
              {
                id: "apiop_envoyer_message",
                name: "Envoyer un message au client",
                method: "POST",
                path: "/v1/messages",
                sends: ["destinataire", "texte"],
                returns: [{ key: "identifiant", type: "string" }],
              },
              {
                // Le CERVEAU. Il n'est PAS dans les pouvoirs de l'agent :
                // reflechir n'est pas agir, et le validateur le refuse.
                id: "apiop_interpreter_demande",
                name: "Interpreter une demande",
                method: "POST",
                path: "/v1/comprendre",
                sends: ["mots", "catalogue"],
                returns: [
                  { key: "operation", type: "string" },
                  { key: "valeurs", type: "string" },
                ],
              },
            ],
          },
        ];
        doc.agent = {
          allowedOperations: ["apiop_envoyer_message"],
          // VRAI, pas `false` : c'est le chemin le plus long — le serveur rend
          // une intention signee, et l'ecran doit demander l'accord. Mesurer
          // le chemin court n'aurait pas mesure le chemin qui compte.
          confirmBeforeAct: true,
          brain: {
            operationId: "apiop_interpreter_demande",
            wordsInput: "mots",
            catalogueInput: "catalogue",
            choiceOutput: "operation",
            inputsOutput: "valeurs",
          },
        };
        // LE BLOC, SUR UN VRAI ECRAN. Sans lui, on mesurerait un document qui
        // declare un agent que personne ne voit : le bouton est precisement ce
        // que le proprietaire a demande.
        ecran.blocks = [
          ...(ecran.blocks ?? []),
          {
            blockType: "agent",
            id: "blk_accueil_agent",
            props: [
              { key: "label", value: "Assistant" },
              { key: "placeholder", value: "Que voulez-vous faire ?" },
              // Les deux libelles ENSEMBLE : le schema refuse un seul bouton.
              { key: "confirmLabel", value: "Confirmer" },
              { key: "cancelLabel", value: "Annuler" },
            ],
          },
        ];
        return doc;
      },
    ],
  ].filter(([, p]) => existsSync(p));
}
