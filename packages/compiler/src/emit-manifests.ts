// MANIFESTES / PERMISSIONS / CONFIG NATIVE (4.4, D-029 — lecture A3 de
// D-026) : émission d'`app.json` et du manifeste canonique de permissions
// depuis l'AIR et le REGISTRE (agrégation transitive `inducedPermissionsFor`
// de 2.3). AUCUNE implémentation de capability (Phases 5+). Sorties §6 :
// manifestes (permissions), config native (air.native appliqué par
// max(plancher du train, exigence) via expo-build-properties — D-029).
// Textes iOS (NS*UsageDescription) : depuis les raisons LOCALISÉES
// déclarées dans l'AIR (données, jamais texte moteur — F3) ; permission
// induite sans raison déclarée = refus net (défense en profondeur derrière
// validateAirCapabilities).
import { canonicalJson, type ProjectAir } from "@deribfy/air-schema";
import { inducedPermissionsFor } from "@deribfy/capability-registry";
import { EmitError } from "./emit-project.ts";
import type { ReleaseTrain } from "./release-train.ts";

type Localized = readonly { locale: string; text: string }[];

function resolveLocalized(title: Localized, locale: string, where: string): string {
  const exact = title.find((t) => t.locale === locale);
  if (exact !== undefined) return exact.text;
  const base = locale.split("-")[0] ?? locale;
  const prefixed = title.find((t) => t.locale.split("-")[0] === base);
  if (prefixed !== undefined) return prefixed.text;
  throw new EmitError("EMIT_LOCALE_UNRESOLVED", where, locale);
}

// Identité de PREVIEW déterministe (D-013 : preview sous compte Deribfy ;
// l'identité BYO arrive en Phase 12 par le canal App Identity).
export function previewIdentity(slug: string): { ios: string; android: string } {
  const androidLeaf = (/^[0-9]/.test(slug) ? "x" : "") + slug.replace(/-/g, "_");
  return {
    ios: `com.deribfy.preview.${slug}`,
    android: `com.deribfy.preview.${androidLeaf}`,
  };
}

const versionGte = (a: string, b: string): boolean => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
};

/**
 * EP-144 ① — QUI, DANS CE QUE L'APPLICATION EMBARQUE, RELÈVERAIT D'UN
 * CHIFFREMENT NON EXEMPTÉ.
 *
 * La règle américaine d'export exempte le chiffrement STANDARD — celui du
 * système et de TLS — et vise les cryptographies propres. La réponse dépend
 * donc de ce que l'application EMBARQUE, pas d'une humeur : elle se dérive.
 *
 * PARTITION EXHAUSTIVE, SOUS CLIQUET (motif EP-135) : chaque capacité du
 * registre est classée. Une capacité NEUVE ne peut pas entrer sans qu'une
 * décision soit prise ici — c'est ce qui empêche la réponse de vieillir en
 * silence, et c'est plus sûr qu'une liste d'exceptions.
 *
 * LIMITE DITE : la page Apple qui définit la clé est rendue en JavaScript et
 * n'a pas pu être lue (même constat qu'Apple HIG depuis EP-130). La source
 * citée est la documentation Expo, qui est le canal réellement emprunté par
 * le moteur puisqu'il émet un `app.json`.
 */
export const CHIFFREMENT_PROPRE_PAR_CAPACITE: Readonly<Record<string, boolean>> = {
  analytics: false,
  auth: false,
  barcode_scan: false,
  biometrics: false,
  calendar: false,
  camera: false,
  deep_links: false,
  external_contact: false,
  geolocation: false,
  maps: false,
  media_upload: false,
  offline_storage: false,
  "payments.iap": false,
  "payments.psp": false,
  push_notifications: false,
  share: false,
};

/**
 * EP-147 ② — LE MANIFESTE DE CONFIDENTIALITÉ (`PrivacyInfo.xcprivacy`).
 *
 * Obligatoire depuis 2024, et le moteur n'en produisait aucun. Expo :
 * « native code that calls into certain APIs that Apple considers sensitive »
 * — dont « accessing UserDefaults, file timestamp, system boot time, disk
 * space, and active keyboard ». Il se déclare en `expo.ios.privacyManifests`.
 *
 * SE DÉRIVE-T-IL DES CAPACITÉS ? EN PARTIE SEULEMENT, et c'est le point.
 * Deux sources se superposent :
 *  · un SOCLE, touché par toute application React Native — le stockage de
 *    préférences (`UserDefaults`) est utilisé par le train lui-même, quelles
 *    que soient les capacités déclarées. Ne pas le déclarer serait mentir par
 *    omission ;
 *  · ce que les CAPACITÉS ajoutent, sous partition exhaustive (même patron
 *    qu'EP-144) — une capacité neuve ne peut pas entrer sans décision.
 *
 * Les codes de raison sont ceux d'Apple (`CA92.1` : accès aux seules données
 * de l'app ; `C617.1` : affichage à l'utilisateur). LIMITE DITE : la liste
 * énumérée des *required reason APIs* n'a pas pu être lue à la source (page
 * Apple en JavaScript, EP-146) ; ce qui est déclaré ici est ce qu'Expo
 * documente, et rien de plus.
 */
export const API_SENSIBLES_SOCLE: readonly { readonly type: string; readonly raisons: readonly string[] }[] = [
  { type: "NSPrivacyAccessedAPICategoryUserDefaults", raisons: ["CA92.1"] },
];

export const API_SENSIBLES_PAR_CAPACITE: Readonly<Record<string, readonly string[]>> = {
  analytics: [],
  auth: [],
  barcode_scan: [],
  biometrics: [],
  calendar: [],
  camera: [],
  deep_links: [],
  external_contact: [],
  geolocation: [],
  maps: [],
  media_upload: [],
  // Le stockage hors ligne écrit des fichiers : leur horodatage est une API
  // à raison requise.
  offline_storage: ["NSPrivacyAccessedAPICategoryFileTimestamp"],
  "payments.iap": [],
  "payments.psp": [],
  push_notifications: [],
  share: [],
};

const RAISON_PAR_TYPE: Readonly<Record<string, readonly string[]>> = {
  NSPrivacyAccessedAPICategoryUserDefaults: ["CA92.1"],
  NSPrivacyAccessedAPICategoryFileTimestamp: ["C617.1"],
};

export function manifesteConfidentialite(air: ProjectAir): {
  NSPrivacyAccessedAPITypes: { NSPrivacyAccessedAPIType: string; NSPrivacyAccessedAPITypeReasons: readonly string[] }[];
} {
  const types = new Set(API_SENSIBLES_SOCLE.map((a) => a.type));
  for (const c of air.capabilities) {
    for (const t of API_SENSIBLES_PAR_CAPACITE[c.capability] ?? []) types.add(t);
  }
  return {
    NSPrivacyAccessedAPITypes: [...types].sort().map((type) => ({
      NSPrivacyAccessedAPIType: type,
      NSPrivacyAccessedAPITypeReasons: RAISON_PAR_TYPE[type] ?? [],
    })),
  };
}

export function utiliseChiffrementNonExempte(air: ProjectAir): boolean {
  return air.capabilities.some(
    (c) => CHIFFREMENT_PROPRE_PAR_CAPACITE[c.capability] === true,
  );
}

export function emitAppJson(air: ProjectAir, train: ReleaseTrain): string {
  const locale = air.app.locales.defaultAppLocale;
  const capabilityIds = air.capabilities.map((c) => c.capability);
  const induced = inducedPermissionsFor(capabilityIds);
  const identity = previewIdentity(air.app.slug);

  // Textes d'usage iOS depuis les raisons déclarées de l'AIR.
  const declaredByKey = new Map(
    air.permissions
      .filter((p) => p.platform === "ios")
      .map((p) => [p.permission, p]),
  );
  const infoPlist: Record<string, string> = {};
  for (const permission of induced.filter((p) => p.platform === "ios")) {
    const declared = declaredByKey.get(permission.permission);
    if (declared === undefined) {
      throw new EmitError(
        "EMIT_PERMISSION_REASON_MISSING",
        `permissions.${permission.permission}`,
        permission.requiredByCapability,
      );
    }
    infoPlist[permission.permission] = resolveLocalized(
      declared.reason,
      locale,
      `permissions.${permission.permission}`,
    );
  }

  const androidPermissions = induced
    .filter((p) => p.platform === "android")
    .map((p) => p.permission);

  // native.minAndroidSdk / minIosVersion sont REQUIS par le schéma AIR
  // (fait vérifié — le lint type-checked l'a démontré) : pas de repli.
  const minSdkVersion = Math.max(
    train.platformFloors.androidMinSdk,
    air.native.minAndroidSdk,
  );
  const deploymentTarget = versionGte(
    train.platformFloors.iosDeploymentTarget,
    air.native.minIosVersion,
  )
    ? train.platformFloors.iosDeploymentTarget
    : air.native.minIosVersion;

  const expo: Record<string, unknown> = {
    android: {
      package: identity.android,
      permissions: androidPermissions,
      predictiveBackGestureEnabled: false,
      // DET-016 (D-039, dimension A étendue) : pendant ANDROID de
      // l'ajustement clavier. `automaticallyAdjustKeyboardInsets` est
      // iOS-seulement — VÉRIFIÉ sur RN 0.86.3, déclarée dans
      // `ScrollViewPropsIOS`, aucune implémentation Android. Android exige
      // donc que la FENÊTRE se redimensionne à l'apparition du clavier,
      // faute de quoi le contenu est simplement recouvert. Déclaré ici, au
      // manifeste (territoire D-029), et non dans le code : le code généré
      // reste identique sur les deux plateformes, sans `Platform.OS`.
      softwareKeyboardLayoutMode: "resize",
    },
    ios: {
      bundleIdentifier: identity.ios,
      supportsTablet: false,
      // EP-144 ① — DÉCLARATION D'EXPORT, DÉRIVÉE DES CAPACITÉS.
      // `ios.config.usesNonExemptEncryption` « sets `ITSAppUsesNonExemptEncryption`
      // in the standalone ipa's Info.plist » (docs.expo.dev, app config). Sans
      // elle, chaque dépôt réclame une réponse manuelle à l'éditeur.
      // Elle n'est PAS écrite en dur : elle se DÉRIVE de ce que l'application
      // embarque — voir `CHIFFREMENT_PROPRE_PAR_CAPACITE`.
      config: { usesNonExemptEncryption: utiliseChiffrementNonExempte(air) },
      // EP-147 ② — le manifeste de confidentialité, DÉRIVÉ.
      privacyManifests: manifesteConfidentialite(air),
      ...(Object.keys(infoPlist).length > 0 ? { infoPlist } : {}),
    },
    name: air.app.name,
    newArchEnabled: true,
    orientation: "portrait",
    // MARQUE (1.17.0) — icône de l'app ET écran de démarrage, tirés du MÊME
    // fichier que la marque affichée dans l'app. Sans cela, l'icône était
    // celle d'Expo et l'ouverture ne montrait aucune identité : trois images
    // différentes pour une seule application.
    ...(air.app.brandIconPngBase64 === undefined
      ? {}
      : {
          icon: "./assets/marque.png",
          splash: {
            image: "./assets/marque.png",
            resizeMode: "contain",
            backgroundColor: "#FFFFFF",
          },
        }),
    plugins: [
      [
        "expo-build-properties",
        {
          android: { minSdkVersion,
          // EP-147 ③ — LE MOTEUR DÉCIDE, il ne constate pas.
          //
          // Google exige API 36 depuis le 31 août 2026 (answer/11926878). Le
          // train Expo cible déjà Android 16/API 36 — mais par hasard, du
          // point de vue du moteur : rien ne le commandait, et rien
          // n'alerterait si une version future du train régressait. C'est la
          // forme exacte de `network.policy` (EP-141) : appliqué de fait.
          //
          // ENTRE CONSTATER ET DÉCIDER, ON DÉCIDE : la valeur est posée ICI,
          // elle vient du train (aucun nombre en dur), et un cliquet exige
          // qu'elle atteigne le minimum de la plateforme. Constater aurait
          // laissé l'application dépendre d'un choix qui n'est pas le sien.
          targetSdkVersion: train.androidTargetSdk,
        },
          ios: { deploymentTarget },
        },
      ],
    ],
    // deep links : schéma émis ssi la capability est déclarée (D-029).
    ...(capabilityIds.includes("deep_links") ? { scheme: air.app.slug } : {}),
    // PLATEFORMES EXPLICITES (Phase 11) — sans cette ligne, la liste est
    // DEVINÉE par la résolution de modules : dans le monorepo, react-native-web
    // est résolvable depuis un parent et « web » apparaissait — mais seulement
    // sur la machine locale, pas sur le serveur de build. L'empreinte
    // d'exécution divergeait donc selon l'ENDROIT où l'on calculait (mesuré,
    // builds 33d9b538/164f0bfc : diff serveur « platforms »). Le moteur émet
    // ce que le document cible ; il ne laisse pas l'environnement décider.
    platforms: ["android", "ios"],
    slug: air.app.slug,
    userInterfaceStyle: "light",
    version: "1.0.0",
    // DET-004 — la liaison au projet de build est DÉCLARÉE par le document,
    // plus recopiée à la main après chaque régénération. Absente, les clés
    // restent absentes et l'`app.json` émis est identique à ce qu'il était :
    // aucun compte n'est inventé pour un document qui n'en nomme pas.
    ...(air.app.distribution === undefined
      ? {}
      : {
          owner: air.app.distribution.owner,
          extra: { eas: { projectId: air.app.distribution.projectId } },
          // LIVRAISON SANS RECONSTRUCTION (Phase 11) — l'adresse est DÉRIVÉE
          // du projet déclaré, jamais saisie à part : deux sources pour la
          // même liaison finiraient par diverger, et une app irait chercher
          // ses mises à jour chez quelqu'un d'autre.
          updates: { url: `https://u.expo.dev/${air.app.distribution.projectId}` },
          // EMPREINTE NATIVE COMME VERSION D'EXÉCUTION. Une livraison
          // n'atteint QUE les builds dont la surface native est identique :
          // c'est la plateforme elle-même qui refuse, en plus du routeur du
          // dépôt. Deux gardes indépendantes valent mieux qu'une promesse —
          // et celle-ci tient même si le routeur se trompe.
          runtimeVersion: { policy: "fingerprint" },
        }),
  };
  return canonicalJson({ expo }) + "\n";
}

// Manifeste CANONIQUE de permissions — artefact d'audit consommé par
// l'Oracle (§9 : diff permissions/manifestes vs AIR) et le Compliance
// Generator (§18, Phase 12 — purposeKeys).
export function emitPermissionsManifest(air: ProjectAir): string {
  const capabilityIds = air.capabilities.map((c) => c.capability);
  const manifest = {
    declared: [...air.permissions]
      .map((p) => ({
        permission: p.permission,
        platform: p.platform,
        reason: p.reason,
        requiredByCapability: p.requiredByCapability,
      }))
      .sort((a, b) =>
        a.platform === b.platform
          ? a.permission < b.permission
            ? -1
            : 1
          : a.platform < b.platform
            ? -1
            : 1,
      ),
    induced: inducedPermissionsFor(capabilityIds),
    native: air.native,
  };
  return canonicalJson(manifest) + "\n";
}
