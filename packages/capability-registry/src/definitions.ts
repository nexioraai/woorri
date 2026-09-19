import { z } from "zod";
import type { CapabilityDefinition } from "./schema.ts";
import { capabilityDefinitionSchema } from "./schema.ts";

// REGISTRE v1 — 15 capabilities cœur — GELÉ (D-020, revue propriétaire du
// 2026-08-27). Le gel porte sur les CONTRATS, pas sur le catalogue : tout
// AJOUT compatible = décision consignée + édition consciente du cliquet +
// version MINEURE ; tout retrait/renommage/changement de contrat = RUPTURE
// (décision + migration d'AIR éventuelle + version MAJEURE). Critère
// d'inclusion v2 et candidates futures : DECISIONS.md D-020.
// Invariants mécaniques, verrouillés par les cliquets de registre :
//   impact none  ⇒ profils [core, standard, extended] · OTA ✓ · rebuild ✗
//   impact light ⇒ profils [standard, extended]       · OTA ✗ · rebuild ✓
//   impact heavy ⇒ profils [extended]                 · OTA ✗ · rebuild ✓
// Les versions ci-dessous sont la résolution PAR DÉFAUT ; la version exacte
// de chaque app est figée dans son project.lock.

const RAW_DEFINITIONS: CapabilityDefinition[] = [
  {
    id: "analytics",
    version: "1.0.0",
    title: "Analytics produit",
    description:
      "Événements d'usage anonymisés pour le pilotage produit de l'app générée.",
    implementation: { kind: "provider_service", package: "posthog-react-native", version: "^4" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: { infoPlistKeys: [], androidManifestPermissions: [], entitlements: [] },
    inducedPermissions: [],
    cost: { model: "usage_based", notes: "gratuit au volume v1 ; facturation à l'événement au-delà" },
    nativeFootprint: { impact: "light", nativeModules: ["posthog-react-native"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: [
      "toute collecte doit être déclarée dans compliance.dataCollected de l'AIR",
    ],
    conflicts: [],
    provenance: { source: "community_vetted", reference: "https://posthog.com/docs/libraries/react-native" },
    buildFootprint: { estimatedSizeKb: 350, buildTimeImpact: "low" },
  },
  {
    id: "auth",
    version: "1.0.0",
    title: "Authentification utilisateurs finaux",
    description:
      "Comptes des utilisateurs finaux de l'app générée (email/OTP), adossés au projet Supabase provisionné par app.",
    implementation: { kind: "provider_service", package: "@supabase/supabase-js", version: "^2" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true }, android: { supported: true } },
    compatibleRuntimeProfiles: ["core", "standard", "extended"],
    nativeConfig: { infoPlistKeys: [], androidManifestPermissions: [], entitlements: [] },
    inducedPermissions: [],
    cost: { model: "usage_based", notes: "inclus dans le projet Supabase provisionné (tenancy par app)" },
    nativeFootprint: { impact: "none", nativeModules: [] },
    otaCompatible: true,
    requiresRebuild: false,
    commerceConstraint: "none",
    constraints: [
      "suppression de compte OBLIGATOIRE (store policy) — câblée avec compliance.accountDeletionRequired",
    ],
    conflicts: [],
    provenance: { source: "first_party", reference: "docs/mobile-generation/ARCHITECTURE.md §7" },
    buildFootprint: { estimatedSizeKb: 120, buildTimeImpact: "none" },
  },
  {
    id: "barcode_scan",
    version: "1.0.0",
    title: "Lecture de codes-barres / QR",
    description:
      "Scan de codes (produits, tickets, QR) via le flux caméra — dépend de la capability camera.",
    implementation: { kind: "expo_module", package: "expo-camera", version: "~17" },
    dependencies: { capabilities: ["camera"], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["core", "standard", "extended"],
    nativeConfig: { infoPlistKeys: [], androidManifestPermissions: [], entitlements: [] },
    inducedPermissions: [],
    cost: { model: "free", notes: "aucun coût direct" },
    nativeFootprint: { impact: "none", nativeModules: [] },
    otaCompatible: true,
    requiresRebuild: false,
    commerceConstraint: "none",
    constraints: [
      "l'empreinte native vient de la dépendance camera — ce nœud n'ajoute que du JS",
    ],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/camera/" },
    buildFootprint: { estimatedSizeKb: 40, buildTimeImpact: "none" },
  },
  {
    id: "biometrics",
    version: "1.0.0",
    title: "Authentification biométrique",
    description: "Face ID / Touch ID / empreinte pour déverrouiller des actions sensibles.",
    implementation: { kind: "expo_module", package: "expo-local-authentication", version: "~17" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: {
      infoPlistKeys: ["NSFaceIDUsageDescription"],
      androidManifestPermissions: ["android.permission.USE_BIOMETRIC"],
      entitlements: [],
    },
    inducedPermissions: [
      { platform: "ios", permission: "NSFaceIDUsageDescription", purposeKey: "permission.biometrics" },
      { platform: "android", permission: "android.permission.USE_BIOMETRIC", purposeKey: "permission.biometrics" },
    ],
    cost: { model: "free", notes: "aucun coût direct" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-local-authentication"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: [],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/local-authentication/" },
    buildFootprint: { estimatedSizeKb: 150, buildTimeImpact: "low" },
  },
  {
    id: "calendar",
    version: "1.0.0",
    title: "Calendrier de l'appareil",
    description:
      "Lecture/écriture d'événements dans le calendrier (réservations, rendez-vous).",
    implementation: { kind: "expo_module", package: "expo-calendar", version: "~15" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: {
      infoPlistKeys: ["NSCalendarsFullAccessUsageDescription"],
      androidManifestPermissions: ["android.permission.READ_CALENDAR", "android.permission.WRITE_CALENDAR"],
      entitlements: [],
    },
    inducedPermissions: [
      { platform: "ios", permission: "NSCalendarsFullAccessUsageDescription", purposeKey: "permission.calendar" },
      { platform: "android", permission: "android.permission.READ_CALENDAR", purposeKey: "permission.calendar" },
      { platform: "android", permission: "android.permission.WRITE_CALENDAR", purposeKey: "permission.calendar" },
    ],
    cost: { model: "free", notes: "aucun coût direct" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-calendar"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: [],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/calendar/" },
    buildFootprint: { estimatedSizeKb: 180, buildTimeImpact: "low" },
  },
  {
    id: "camera",
    version: "1.0.0",
    title: "Caméra",
    description: "Prise de photo/vidéo dans l'app (produits, justificatifs, avatars).",
    implementation: { kind: "expo_module", package: "expo-camera", version: "~17" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["extended"],
    nativeConfig: {
      infoPlistKeys: ["NSCameraUsageDescription", "NSMicrophoneUsageDescription"],
      androidManifestPermissions: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"],
      entitlements: [],
    },
    inducedPermissions: [
      { platform: "ios", permission: "NSCameraUsageDescription", purposeKey: "permission.camera" },
      { platform: "ios", permission: "NSMicrophoneUsageDescription", purposeKey: "permission.microphone" },
      { platform: "android", permission: "android.permission.CAMERA", purposeKey: "permission.camera" },
      { platform: "android", permission: "android.permission.RECORD_AUDIO", purposeKey: "permission.microphone" },
    ],
    cost: { model: "free", notes: "aucun coût direct" },
    nativeFootprint: { impact: "heavy", nativeModules: ["expo-camera"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: ["validation finale sur appareil physique exigée (non-négociable #20)"],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/camera/" },
    buildFootprint: { estimatedSizeKb: 900, buildTimeImpact: "medium" },
  },
  {
    id: "deep_links",
    version: "1.0.0",
    title: "Liens profonds / universels",
    description:
      "Ouverture directe d'un écran depuis une URL (partages, campagnes, QR).",
    implementation: { kind: "expo_module", package: "expo-linking", version: "~8" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: {
      infoPlistKeys: [],
      androidManifestPermissions: [],
      entitlements: ["com.apple.developer.associated-domains"],
    },
    inducedPermissions: [],
    cost: { model: "free", notes: "aucun coût direct" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-linking"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: [
      "les universal links iOS exigent le domaine associé — configuration résolue au build, jamais en OTA",
    ],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/linking/" },
    buildFootprint: { estimatedSizeKb: 60, buildTimeImpact: "none" },
  },
  {
    id: "geolocation",
    version: "1.0.0",
    title: "Géolocalisation",
    description: "Position de l'utilisateur (livraison, points de vente proches).",
    implementation: { kind: "expo_module", package: "expo-location", version: "~19" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: {
      infoPlistKeys: ["NSLocationWhenInUseUsageDescription"],
      androidManifestPermissions: ["android.permission.ACCESS_FINE_LOCATION"],
      entitlements: [],
    },
    inducedPermissions: [
      { platform: "ios", permission: "NSLocationWhenInUseUsageDescription", purposeKey: "permission.location" },
      { platform: "android", permission: "android.permission.ACCESS_FINE_LOCATION", purposeKey: "permission.location" },
    ],
    cost: { model: "free", notes: "aucun coût direct" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-location"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: ["suivi en arrière-plan HORS périmètre v1 (audit store spécifique)"],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/location/" },
    buildFootprint: { estimatedSizeKb: 250, buildTimeImpact: "low" },
  },
  {
    id: "maps",
    version: "1.0.0",
    title: "Cartes",
    description: "Affichage de cartes et de marqueurs (points de vente, livraisons).",
    implementation: { kind: "react_native_module", package: "react-native-maps", version: "^2" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["extended"],
    nativeConfig: { infoPlistKeys: [], androidManifestPermissions: [], entitlements: [] },
    inducedPermissions: [],
    cost: {
      model: "usage_based",
      notes: "fond de carte Apple/Google gratuit aux volumes v1 ; clés API par app via le Provisioner",
    },
    nativeFootprint: { impact: "heavy", nativeModules: ["react-native-maps"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: ["la position utilisateur sur la carte requiert la capability geolocation"],
    conflicts: [],
    provenance: { source: "community_vetted", reference: "https://github.com/react-native-maps/react-native-maps" },
    buildFootprint: { estimatedSizeKb: 1200, buildTimeImpact: "high" },
  },
  {
    id: "media_upload",
    version: "1.0.0",
    title: "Import de médias",
    description: "Sélection de photos/vidéos de la galerie et envoi vers le stockage de l'app.",
    implementation: { kind: "expo_module", package: "expo-image-picker", version: "~17" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: {
      infoPlistKeys: ["NSPhotoLibraryUsageDescription"],
      androidManifestPermissions: ["android.permission.READ_MEDIA_IMAGES"],
      entitlements: [],
    },
    inducedPermissions: [
      { platform: "ios", permission: "NSPhotoLibraryUsageDescription", purposeKey: "permission.photo_library" },
      { platform: "android", permission: "android.permission.READ_MEDIA_IMAGES", purposeKey: "permission.photo_library" },
    ],
    cost: { model: "usage_based", notes: "stockage facturé via le projet Supabase provisionné" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-image-picker"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: [],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/imagepicker/" },
    buildFootprint: { estimatedSizeKb: 300, buildTimeImpact: "low" },
  },
  {
    id: "offline_storage",
    version: "1.0.0",
    title: "Stockage hors-ligne",
    description: "Base locale SQLite pour le mode hors-ligne et le cache structuré.",
    implementation: { kind: "expo_module", package: "expo-sqlite", version: "~16" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: { infoPlistKeys: [], androidManifestPermissions: [], entitlements: [] },
    inducedPermissions: [],
    cost: { model: "free", notes: "aucun coût direct" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-sqlite"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: ["chiffrement au repos (SQLCipher) HORS périmètre v1 — consigné comme dette"],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
    buildFootprint: { estimatedSizeKb: 400, buildTimeImpact: "low" },
  },
  {
    id: "payments.iap",
    version: "1.0.0",
    title: "Achats intégrés (IAP)",
    description:
      "Biens et services DIGITAUX consommés dans l'app — passage OBLIGATOIRE par les achats intégrés des stores.",
    implementation: { kind: "react_native_module", package: "react-native-purchases", version: "^9" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["extended"],
    nativeConfig: {
      infoPlistKeys: [],
      androidManifestPermissions: ["com.android.vending.BILLING"],
      entitlements: ["com.apple.developer.in-app-payments"],
    },
    inducedPermissions: [],
    cost: { model: "usage_based", notes: "commission stores 15-30 % + grille RevenueCat au-delà du palier gratuit" },
    nativeFootprint: { impact: "heavy", nativeModules: ["react-native-purchases"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "digital",
    constraints: ["produits déclarés dans App Store Connect / Play Console par le compte BYO du client"],
    conflicts: ["payments.psp"],
    provenance: { source: "community_vetted", reference: "https://www.revenuecat.com/docs/getting-started/installation/reactnative" },
    buildFootprint: { estimatedSizeKb: 800, buildTimeImpact: "medium" },
  },
  {
    // EP-201 G — LE PAIEMENT QUI SE CONCLUT HORS DE L'APPLICATION.
    //
    // FAIT MESURÉ AVANT CETTE ENTRÉE : le registre ne connaissait que DEUX
    // façons d'encaisser — les achats intégrés des stores, et un PSP par
    // carte. Une boutique dont l'acheteur paie par transfert téléphonique
    // puis envoie sa preuve au vendeur n'avait AUCUNE capacité à déclarer :
    // elle se voyait donc attribuer un PSP dont elle n'a pas l'usage, ou
    // rien du tout.
    //
    // CE QUE CETTE CAPACITÉ EST, ET CE QU'ELLE N'EST PAS. Elle N'INTÈGRE
    // AUCUN opérateur : aucune clé d'API, aucun module natif, aucun appel
    // réseau. Elle déclare que l'application MONTRE une coordonnée
    // d'encaissement portée par les données et OUVRE un canal de contact
    // vers elle. Le transfert lui-même a lieu hors de l'application, entre
    // deux personnes, exactement comme un paiement de la main à la main.
    //
    // POURQUOI AUCUN OPÉRATEUR N'EST NOMMÉ ICI. Le nommer ferait entrer une
    // connaissance régionale dans le moteur — et le cliquet anti-secteur
    // l'interdit. La coordonnée vient du DOCUMENT, saisie par le marchand à
    // l'élicitation ; le moteur ne sait ni quel opérateur la sert, ni dans
    // quel pays. C'est la même frontière que partout : le document nomme,
    // le moteur dessine.
    //
    // ELLE N'EST DONC PAS EN CONFLIT AVEC `payments.psp` : un marchand peut
    // parfaitement offrir les deux. C'est l'humain qui choisit, jamais une
    // déduction faite depuis son pays.
    id: "payments.offapp_transfer",
    version: "1.0.0",
    title: "Paiement par transfert, conclu hors application",
    description:
      "L'application AFFICHE une coordonnée d'encaissement portée par les données et OUVRE un canal de contact vers elle. Aucun opérateur intégré, aucun appel réseau : le transfert a lieu hors de l'application, comme un paiement de la main à la main.",
    // `expo-linking` et rien d'autre : ouvrir un canal, composer un numéro.
    // La capacité n'apporte AUCUN module de paiement.
    implementation: { kind: "expo_module", package: "expo-linking", version: "~8" },
    dependencies: { capabilities: ["external_contact"], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: { infoPlistKeys: [], androidManifestPermissions: [], entitlements: [] },
    inducedPermissions: [],
    cost: { model: "free", notes: "aucun coût direct — l'application n'encaisse rien elle-même" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-linking"] },
    otaCompatible: false,
    requiresRebuild: true,
    // Même classe que le PSP : un bien physique ou un service consommé hors
    // de l'application. Les stores n'exigent leurs achats intégrés que pour
    // le numérique consommé DANS l'app (3.1.1) — ce n'est pas le cas ici.
    commerceConstraint: "physical_or_offapp",
    constraints: [
      "la coordonnée d'encaissement vient du DOCUMENT, jamais du moteur : aucune valeur par défaut n'est inventée",
      "Android 11+ exige que les schémas d'URI visés soient déclarés en <queries> au manifeste, sinon l'ouverture échoue silencieusement",
      "l'application ne confirme AUCUN paiement : elle ne le voit pas passer. Toute promesse de confirmation automatique serait fausse",
    ],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/linking/" },
    buildFootprint: { estimatedSizeKb: 60, buildTimeImpact: "none" },
  },
  {
    id: "payments.psp",
    version: "1.0.0",
    title: "Paiement PSP (biens physiques / hors app)",
    description:
      "Encaissement par PSP (Stripe) — RÉSERVÉ aux biens physiques ou services consommés hors de l'app (guideline 3.1.1).",
    implementation: { kind: "react_native_module", package: "@stripe/stripe-react-native", version: "^0.50" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["extended"],
    nativeConfig: { infoPlistKeys: [], androidManifestPermissions: [], entitlements: [] },
    inducedPermissions: [],
    cost: { model: "usage_based", notes: "commission PSP par transaction (grille Stripe)" },
    nativeFootprint: { impact: "heavy", nativeModules: ["@stripe/stripe-react-native"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "physical_or_offapp",
    constraints: [
      "clés PSP par app via le Vault — JAMAIS dans l'AIR ni dans un binaire",
      "Apple Pay optionnel : entitlement merchant ajouté par le Policy Gate au cas par cas",
    ],
    conflicts: ["payments.iap"],
    provenance: { source: "community_vetted", reference: "https://github.com/stripe/stripe-react-native" },
    buildFootprint: { estimatedSizeKb: 1100, buildTimeImpact: "high" },
  },
  {
    id: "push_notifications",
    version: "1.0.0",
    title: "Notifications push et locales programmées",
    // Clarification D-020 : le contrat couvre les DEUX voies — push distant
    // (APNs/FCM) ET notifications locales programmées sur l'appareil
    // (rappels) — l'implémentation expo-notifications est commune.
    description:
      "Notifications transactionnelles push (commande, réservation, statut) ET notifications locales programmées sur l'appareil (rappels).",
    implementation: { kind: "expo_module", package: "expo-notifications", version: "~0.32" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: {
      infoPlistKeys: [],
      androidManifestPermissions: ["android.permission.POST_NOTIFICATIONS"],
      entitlements: ["aps-environment"],
    },
    inducedPermissions: [
      { platform: "android", permission: "android.permission.POST_NOTIFICATIONS", purposeKey: "permission.notifications" },
    ],
    cost: { model: "free", notes: "push Expo gratuit aux volumes v1" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-notifications"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: ["credentials APNs/FCM portés par le compte BYO du client (App Identity)"],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/notifications/" },
    buildFootprint: { estimatedSizeKb: 350, buildTimeImpact: "low" },
  },
  {
    // EP-134 — LE PENDANT SORTANT DE `deep_links`.
    //
    // `deep_links` est ENTRANT : « ouverture directe d'un écran depuis une
    // URL ». Rien ne couvrait le sens inverse — quitter l'application pour
    // joindre quelqu'un. C'est ce que la règle 26 du prompt promettait
    // (« prise de contact quand le commerce fonctionne ainsi ») sans que ni
    // geste ni capacité ne sache l'exprimer.
    //
    // LE CANAL EST NOMMÉ ICI, ET NULLE PART AILLEURS. C'est le seul étage où
    // il a le droit de l'être : une capacité déclare ce que la plateforme
    // fournit. Le GESTE, lui, ne connaît aucun canal — sans quoi il serait un
    // template déguisé (EP-005). Aucune région, aucun service nommé : les
    // canaux sont des schémas d'URI standards, et l'application qui les
    // servira est le choix de l'appareil, jamais du moteur.
    id: "external_contact",
    version: "1.0.0",
    title: "Contact externe",
    description:
      "Ouverture d'un canal de contact vers un destinataire porté par les données (appel, message, courriel), via les schémas d'URI du système.",
    implementation: { kind: "expo_module", package: "expo-linking", version: "~8" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: { infoPlistKeys: [], androidManifestPermissions: [], entitlements: [] },
    inducedPermissions: [],
    cost: { model: "free", notes: "aucun coût direct" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-linking"] },
    otaCompatible: false,
    requiresRebuild: true,
    // Une prise de contact n'est PAS un fait de commerce : un support client
    // en use autant qu'une vente hors application. La lier à une classe
    // commerce en ferait une capacité de vente — elle ne l'est pas.
    commerceConstraint: "none",
    constraints: [
      "Android 11+ exige que les schémas visés soient déclarés en <queries> au manifeste, sinon l'ouverture échoue silencieusement.",
      "Le système peut n'avoir aucune application pour un schéma donné : l'ouverture doit être vérifiée avant d'être promise.",
    ],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/linking/" },
    buildFootprint: { estimatedSizeKb: 60, buildTimeImpact: "none" },
  },
  {
    id: "share",
    version: "1.0.0",
    title: "Partage système",
    description: "Partage de contenus via la feuille de partage native.",
    implementation: { kind: "expo_module", package: "expo-sharing", version: "~14" },
    dependencies: { capabilities: [], nativeModules: [] },
    platforms: { ios: { supported: true, minOsVersion: "15.1" }, android: { supported: true, minSdk: 24 } },
    compatibleRuntimeProfiles: ["standard", "extended"],
    nativeConfig: { infoPlistKeys: [], androidManifestPermissions: [], entitlements: [] },
    inducedPermissions: [],
    cost: { model: "free", notes: "aucun coût direct" },
    nativeFootprint: { impact: "light", nativeModules: ["expo-sharing"] },
    otaCompatible: false,
    requiresRebuild: true,
    commerceConstraint: "none",
    constraints: [],
    conflicts: [],
    provenance: { source: "expo_sdk", reference: "https://docs.expo.dev/versions/latest/sdk/sharing/" },
    buildFootprint: { estimatedSizeKb: 80, buildTimeImpact: "none" },
  },
];

// Parse fail-closed AU CHARGEMENT : un registre qui ne passe pas son propre
// schéma n'existe pas. Trié par id — sortie déterministe.
export const CAPABILITIES: readonly CapabilityDefinition[] = z
  .array(capabilityDefinitionSchema)
  .parse(RAW_DEFINITIONS)
  .sort((a, b) => (a.id < b.id ? -1 : 1));

// GEL v1 (D-020, 2026-08-27) : toute évolution passe par le cliquet.
// EP-134 — version MINEURE : AJOUT compatible (`external_contact`), selon la
// règle d'évolution post-gel D-020. Aucune capacité retirée ni renommée.
export const CAPABILITY_REGISTRY_VERSION = "1.1.0";
