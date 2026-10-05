// RÉSOLVEUR AIR → project.lock (Phase 4.1, D-026/D-027).
// Fonction PURE et DÉTERMINISTE : aucun accès fichier, réseau ou horloge —
// mêmes entrées ⇒ même lock, octet pour octet (non-négociable #2 ; la
// pureté du chemin de compilation est prouvée par le harnais V5 et le
// cliquet statique d'imports, 4.6).
// FAIL-CLOSED : document refusé net (LockResolutionError, diagnostics
// triés) si le schéma AIR, le validateur sémantique, le registre de
// capabilities ou le registre de blocs émettent le moindre diagnostic —
// jamais de lock partiel.
// Lectures consignées (D-027) :
//  - `resolved.capabilities[].version` = version du CONTRAT de capability
//    (registre 1.0.0) — la version EXACTE du paquet d'implémentation sera
//    figée à l'intégration réelle des implémentations (Phases 5+) ;
//  - `design.tokensVersion` ABSENT ⇒ résolu vers la version du train
//    (rôle du résolveur) ; présent et ≠ train ⇒ REFUS ;
//  - `resolved.providers` : VIDE de 4.1 à la Phase 9 ; RENSEIGNÉ depuis la
//    Phase 10 (§15, première abstraction provider) par le registre de
//    providers, qui dérive la classe canonique de la `capability` déclarée
//    par l'intégration — jamais de la chaîne libre `providerClass`, dont le
//    corpus gelé porte 40 valeurs distinctes pour une douzaine de classes
//    réelles. Le lock n'entre dans AUCUN hash d'artefact (le manifeste ne
//    contient que airHash/entries/merkleVersion/releaseTrain) : renseigner
//    ce champ ne peut donc pas modifier un projet compilé — propriété
//    vérifiée statiquement ET mesurée sur les 12 documents.
import {
  AIR_SCHEMA_VERSION,
  LOCK_SCHEMA_VERSION,
  canonicalJson,
  applyAirMigrations,
  projectAirSchema,
  projectLockSchema,
  sha256Hex,
  validateAir,
  type ProjectAir,
  type ProjectLock,
} from "@deribfy/air-schema";
import {
  CAPABILITIES,
  validateAirCapabilities,
} from "@deribfy/capability-registry";
import { getBlock, validateAirBlocks } from "@deribfy/blocks/registry";
import { selectProviders } from "@deribfy/provider-registry";
import { RELEASE_TRAIN_V1, type ReleaseTrain } from "./release-train.ts";

export interface LockDiagnostic {
  source: "schema" | "semantics" | "capabilities" | "blocks" | "resolver";
  code: string;
  path: string;
  message: string;
}

/**
 * PROTOCOLE DE DONNÉES DU MOTEUR (E3.3, D-132) — canonique et
 * SECTOR-AGNOSTIC : l'endpoint d'une cible distante est dérivé du contrat
 * seul (domaine déclaré + entité), JAMAIS d'une convention métier. L'AIR
 * reste neutre (ni chemin, ni URL) : la règle vit ICI, dans le résolveur —
 * « le provider concret est résolu dans le lock ». La réponse attendue est
 * le tableau JSON des instances `{id, values}` de l'entité.
 */
export function urlProtocoleDonnees(domaine: string, entityId: string): string {
  return `https://${domaine}/air/v1/entities/${entityId}/rows`;
}

/*
 * LA MÊME RESSOURCE, TROIS MÉTHODES — l'écriture n'invente aucun endpoint.
 *
 * ── CE QUI MANQUAIT, ET CE QUE ÇA COÛTAIT.
 *
 * Le moteur avait décidé un protocole NEUTRE pour la lecture (ci-dessus) et
 * JAMAIS pour l'écriture : l'application émise écrivait par le client Supabase
 * (`from(table).upsert(ligne)`). Un propriétaire qui exige un autre serveur —
 * mesuré le 2026-10-05 : un backend Spring Boot — n'avait donc rien à
 * implémenter pour les écritures, parce que rien n'était spécifié.
 *
 * ── POURQUOI PAS DE NOUVEL ENDPOINT.
 *
 * La collection `/air/v1/entities/{id}/rows` est DÉJÀ la ressource des lignes
 * d'une entité. Lire, c'est `GET` dessus ; créer ou remplacer une ligne, c'est
 * `POST` dessus ; supprimer, c'est `DELETE` sur la ligne. Inventer
 * `/create-row` aurait ajouté du vocabulaire là où HTTP en a déjà.
 *
 * `POST` et non `PUT` : le corps porte l'identifiant quand il existe, et le
 * serveur en décide quand il est absent. Un `PUT` promettrait que le client
 * connaît l'URL de la ligne AVANT qu'elle existe, ce qui est faux d'une
 * création.
 *
 * ── OÙ VIT LA DÉRIVATION DE L'URL DE LIGNE, ET POURQUOI PAS ICI.
 *
 * `urlDeLigne` vit dans `runtime/ecriture-http.ts`, et c'est la SEULE. Les
 * lignes n'existent pas à la compilation : le résolveur ne peut en énumérer
 * aucune, et une fonction posée ici n'aurait eu pour appelant que le test qui
 * la vérifie — exactement ce que le cliquet EP-161 refuse, à raison. Une
 * autorité que personne ne consomme n'en est pas une.
 */

/**
 * LES CINQ OPÉRATIONS DE SESSION — et pourquoi elles sont cinq, pas une.
 *
 * ── LE DÉFAUT, MESURÉ.
 *
 * `session-supabase.ts` appelle `client.auth.signInWithPassword`, `signUp`,
 * `resetPasswordForEmail`, `signOut` et `onAuthStateChange`. Ce sont les noms
 * d'UN fournisseur. Un serveur tiers ne peut pas les deviner, et le contrat de
 * session (`SessionProvider`) ne dit rien des endpoints — il décrit ce que
 * l'application a besoin de SAVOIR, pas comment elle l'apprend.
 *
 * ── LA FORME, ET CE QU'ELLE REFUSE DE DIRE.
 *
 *   · `POST   /air/v1/session`          ouvrir — rend l'identité et LES DROITS
 *   · `GET    /air/v1/session`          l'état courant, au démarrage
 *   · `DELETE /air/v1/session`          fermer
 *   · `POST   /air/v1/accounts`         créer un compte
 *   · `POST   /air/v1/password-resets`  demander une réinitialisation
 *
 * LES DROITS VIENNENT AVEC LA SESSION, et c'est une décision : les demander
 * séparément ferait exister un instant où l'identité est établie et les droits
 * inconnus. Le contrôle d'accès est fermé par défaut (1.28.0) — cet instant
 * afficherait un refus à quelqu'un qui a le droit, ce qui est le défaut
 * fondateur que le lot d'accès existe pour empêcher.
 *
 * `POST /password-resets` rend ACCEPTÉ ou REFUSÉ, jamais « ce compte existe » :
 * révéler l'existence d'une adresse est une fuite, et le contrat de session le
 * dit déjà (`reinitialiser`).
 *
 * AUCUNE FORME DE JETON N'EST IMPOSÉE ICI. Le serveur place ce qu'il veut dans
 * la réponse de `POST /session` ; l'application le renvoie tel quel. Choisir
 * entre un cookie et un en-tête à la place du propriétaire reviendrait à
 * décider de la sécurité de son serveur depuis un générateur d'écrans.
 */
export const OPERATIONS_SESSION = {
  ouvrir: { methode: "POST", chemin: "/air/v1/session" },
  etat: { methode: "GET", chemin: "/air/v1/session" },
  fermer: { methode: "DELETE", chemin: "/air/v1/session" },
  creerCompte: { methode: "POST", chemin: "/air/v1/accounts" },
  reinitialiser: { methode: "POST", chemin: "/air/v1/password-resets" },
} as const;

/** L'URL d'une opération de session, sur le serveur déclaré par l'intégration. */
export function urlProtocoleSession(
  base: string,
  operation: keyof typeof OPERATIONS_SESSION,
): string {
  // `base` arrive du `config.url` de l'intégration d'authentification — déjà
  // une URL complète. On retire une barre finale pour ne pas produire `//air`,
  // qui est une URL VALIDE et un chemin différent : certains serveurs la
  // servent, d'autres rendent 404, et le défaut ne se voit qu'en production.
  return `${base.replace(/\/+$/, "")}${OPERATIONS_SESSION[operation].chemin}`;
}

export interface CibleRemoteResolue {
  readonly datasetId: string;
  readonly entityId: string;
  readonly integrationId: string;
  readonly url: string;
  readonly refreshSeconds?: number;
}

/**
 * Cibles distantes d'un document, triées par datasetId (déterminisme).
 * PURE : ne lit que l'AIR validé — les champs de provenance sont garantis
 * cohérents par le schéma 1.7.1 (superRefine) et le validateur (intégration
 * existante, domaine autorisé). Fail-closed défensif malgré tout.
 */
export function resoudreCiblesRemote(air: ProjectAir): readonly CibleRemoteResolue[] {
  return air.datasets
    .filter((d) => d.sourceKind === "remote")
    .map((d) => {
      if (d.sourceIntegrationId === undefined || d.sourceDomain === undefined) {
        throw new LockResolutionError([
          {
            source: "resolver",
            code: "REMOTE_SOURCE_INCOHERENTE_AT_RESOLVE",
            path: `datasets.${d.id}`,
            message: `provenance distante incomplète sur "${d.id}" — état théoriquement impossible après parse 1.7.1`,
          },
        ]);
      }
      return {
        datasetId: d.id,
        entityId: d.entityId,
        integrationId: d.sourceIntegrationId,
        url: urlProtocoleDonnees(d.sourceDomain, d.entityId),
        ...(d.sourceRefreshSeconds === undefined ? {} : { refreshSeconds: d.sourceRefreshSeconds }),
      };
    })
    .sort((a, b) => (a.datasetId < b.datasetId ? -1 : a.datasetId > b.datasetId ? 1 : 0));
}

export class LockResolutionError extends Error {
  readonly diagnostics: readonly LockDiagnostic[];

  constructor(diagnostics: readonly LockDiagnostic[]) {
    super(
      `résolution refusée (fail-closed) : ${diagnostics.length} diagnostic(s) — ` +
        diagnostics
          .slice(0, 3)
          .map((d) => `${d.source}:${d.code}@${d.path}`)
          .join(" · "),
    );
    this.name = "LockResolutionError";
    this.diagnostics = diagnostics;
  }
}

const byCodeUnit = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const capabilityById = new Map(CAPABILITIES.map((c) => [c.id, c]));

/**
 * Normalise un document AIR : MIGRE s'il déclare une version antérieure, puis
 * le rend au parseur. Point d'entrée UNIQUE du chemin de compilation — sans
 * lui, les 12 documents 1.0.0 du corpus gelé seraient refusés par le schéma
 * 1.1.0, et surtout le lock et l'émission risqueraient de travailler sur
 * deux versions différentes du même document.
 *
 * Le mécanisme existait depuis la Phase 2, testé mais JAMAIS câblé : cette
 * évolution de contrat l'active pour la première fois (D-044).
 */
export function normalizeAir(input: unknown): unknown {
  const declared = (input as { airSchemaVersion?: unknown } | null)?.airSchemaVersion;
  if (typeof declared !== "string" || declared === AIR_SCHEMA_VERSION) return input;
  try {
    // Étape STRUCTURELLE uniquement : la validation reste celle du résolveur,
    // qui produit des diagnostics précis (schéma, sémantique, capabilities,
    // blocs). Valider ici ferait s'effondrer toute erreur en « migration
    // échouée » — précision perdue, donc refusé.
    return applyAirMigrations(input);
  } catch (error) {
    throw new LockResolutionError([
      {
        source: "schema",
        code: "AIR_MIGRATION_FAILED",
        path: "airSchemaVersion",
        message: String(error instanceof Error ? error.message : error).slice(0, 160),
      },
    ]);
  }
}

export interface ResolveOptions {
  /**
   * Substitution de provider par classe canonique (§15). Le document AIR
   * n'est PAS modifié : c'est tout l'intérêt de l'abstraction — changer de
   * fournisseur ne doit jamais exiger de retoucher la source de vérité.
   * Fail-closed : classe non requise ou provider hors registre = refus.
   */
  readonly providerOverrides?: Readonly<Record<string, string>>;
}

export function resolveLock(
  input: unknown,
  train: ReleaseTrain = RELEASE_TRAIN_V1,
  options: ResolveOptions = {},
): ProjectLock {
  // 1. Schéma strict (fail-closed) — airSchemaVersion est un literal du
  //    schéma : un document d'une autre version d'AIR échoue ici.
  const parsed = projectAirSchema.safeParse(normalizeAir(input));
  if (!parsed.success) {
    throw new LockResolutionError(
      parsed.error.issues.map((issue) => ({
        source: "schema",
        code: issue.code.toUpperCase(),
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }
  const air: ProjectAir = parsed.data;

  // 2. Les trois validateurs déterministes (sémantique, capabilities,
  //    blocs) — le moindre diagnostic est un refus.
  const diagnostics: LockDiagnostic[] = [
    ...validateAir(air).map((d) => ({
      source: "semantics" as const,
      code: d.code,
      path: d.path,
      message: d.message,
    })),
    ...validateAirCapabilities(air).map((d) => ({
      source: "capabilities" as const,
      code: d.code,
      path: d.path,
      message: d.message,
    })),
    ...validateAirBlocks(air).map((d) => ({
      source: "blocks" as const,
      code: d.code,
      path: d.path,
      message: d.message,
    })),
  ];

  // 3. Compatibilité tokens <-> train (D-027, assoupli par D-039-R2).
  //
  // AVANT : egalite stricte. Consequence demontree le 2026-08-29 : les tokens
  // ne pouvaient JAMAIS evoluer, car les 12 documents du corpus GELE epinglent
  // 1.0.0 et leur provenance-modele interdit de les retoucher. Ce n'etait donc
  // pas une garantie de securite mais un verrou d'evolution.
  //
  // MAINTENANT : compatibilite semver bornee, fail-closed sur les deux bords —
  //   (a) MAJEURE differente        => REFUS  TOKENS_MAJOR_MISMATCH
  //   (b) train ANTERIEUR au document => REFUS TOKENS_TRAIN_OLDER
  //   (c) meme majeure, train >= doc  => ACCEPTE
  //
  // La compatibilite n'est PAS supposee depuis le numero : elle est VERIFIEE
  // mecaniquement par le cliquet de surface du paquet design-tokens
  // (tests/major-surface-ratchet.test.ts), qui refuse toute suppression de cle
  // ou tout changement de type a l'interieur d'une majeure. Un changement
  // reellement incompatible ne peut donc pas se glisser dans une mineure.
  // Les changements de VALEUR restent, eux, detectes par deux cliquets de hash
  // independants : designTokensSourcesHash du train, et le rootHash de tout
  // projet compile.
  const tokensVersion = air.design.tokensVersion;
  if (tokensVersion !== undefined && tokensVersion !== train.designTokensVersion) {
    const parse = (v: string): number[] => v.split(".").map((n) => Number(n));
    const doc = parse(tokensVersion);
    const trn = parse(train.designTokensVersion);
    const wellFormed =
      doc.length === 3 && trn.length === 3 && [...doc, ...trn].every(Number.isInteger);
    const [docMajor = -1, docMinor = -1, docPatch = -1] = doc;
    const [trnMajor = -2, trnMinor = -2, trnPatch = -2] = trn;
    if (!wellFormed) {
      diagnostics.push({
        source: "resolver",
        code: "TOKENS_VERSION_MALFORMED",
        path: "design.tokensVersion",
        message: `version de tokens non semver: document ${tokensVersion}, train ${train.designTokensVersion}`,
      });
    } else if (docMajor !== trnMajor) {
      diagnostics.push({
        source: "resolver",
        code: "TOKENS_MAJOR_MISMATCH",
        path: "design.tokensVersion",
        message: `majeure incompatible : le document exige les tokens ${tokensVersion}, le train ${train.id} embarque ${train.designTokensVersion}`,
      });
    } else if (
      docMinor > trnMinor ||
      (docMinor === trnMinor && docPatch > trnPatch)
    ) {
      diagnostics.push({
        source: "resolver",
        code: "TOKENS_TRAIN_OLDER",
        path: "design.tokensVersion",
        message: `train anterieur au document : le document exige les tokens ${tokensVersion}, le train ${train.id} embarque ${train.designTokensVersion}`,
      });
    }
  }

  if (diagnostics.length > 0) {
    throw new LockResolutionError(diagnostics);
  }

  // 4. Blocs : types DISTINCTS utilisés, triés par point de code.
  //    L'allowlist a déjà été prouvée par validateAirBlocks — la relecture
  //    ici est une défense en profondeur (jamais un lock sur un type
  //    inconnu, même si les validateurs évoluaient).
  const blockTypes = [
    ...new Set(air.screens.flatMap((s) => s.blocks.map((b) => b.blockType))),
  ].sort(byCodeUnit);
  const blocks = blockTypes.map((blockType) => {
    const definition = getBlock(blockType);
    if (definition === undefined) {
      throw new LockResolutionError([
        {
          source: "resolver",
          code: "BLOCK_UNKNOWN_AT_RESOLVE",
          path: `blocks.${blockType}`,
          message: `blockType hors registre au moment de la résolution : ${blockType}`,
        },
      ]);
    }
    return {
      blockType,
      version: definition.version,
      // Intégrité de l'artefact de bloc que le compilateur copiera (D-007) :
      // liée au scellé des sources du registre gelé porté par le train.
      integrity: sha256Hex(
        canonicalJson({
          blockType,
          registryVersion: train.blockRegistryVersion,
          sourcesHash: train.blocksSourcesHash,
          version: definition.version,
        }),
      ),
    };
  });

  // 5. Capabilities : triées par référence, résolues contre le registre.
  const capabilities = [...air.capabilities]
    .sort((a, b) => byCodeUnit(a.capability, b.capability))
    .map((entry) => {
      const definition = capabilityById.get(entry.capability);
      if (definition === undefined) {
        throw new LockResolutionError([
          {
            source: "resolver",
            code: "CAPABILITY_UNKNOWN_AT_RESOLVE",
            path: `capabilities.${entry.capability}`,
            message: `capability hors registre au moment de la résolution : ${entry.capability}`,
          },
        ]);
      }
      return {
        capability: entry.capability,
        implementation: definition.implementation.package,
        version: definition.version,
      };
    });

  // 6. Lock complet, revalidé contre le schéma gelé 1.0.0 (fail-closed en
  //    sortie aussi : un lock non conforme ne sort jamais d'ici).
  const remoteData = resoudreCiblesRemote(air);
  return projectLockSchema.parse({
    lockSchemaVersion: LOCK_SCHEMA_VERSION,
    airSchemaVersion: air.airSchemaVersion,
    airHash: sha256Hex(canonicalJson(air)),
    resolved: {
      blocks,
      capabilities,
      providers: selectProviders(air, options.providerOverrides ?? {}),
      // ABSENT (pas []) sans provenance distante : les locks historiques
      // restent byte-identiques (patron additif 1.7.1).
      ...(remoteData.length === 0 ? {} : { remoteData }),
      releaseTrain: { id: train.id, version: train.version },
      toolchain: { ...train.toolchain },
    },
  });
}
