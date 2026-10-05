import { z } from "zod";
import {
  actionIdSchema,
  blockIdSchema,
  capabilityRefSchema,
  datasetIdSchema,
  entityIdSchema,
  fieldIdSchema,
  integrationIdSchema,
  projectIdSchema,
  relationIdSchema,
  routeIdSchema,
  ruleIdSchema,
  screenIdSchema,
  slotIdSchema,
  needIdSchema,
  rightIdSchema,
  roleIdSchema,
  testIdSchema,
} from "./ids.ts";

// 1.7.0 (E3.2, D-130) : `dataset.source` OPTIONNEL — seed | remote déclaré.
// 1.7.1 (E3.3, D-131) : provenance APLANIE (sourceKind/sourceIntegrationId/
//   sourceDomain/sourceRefreshSeconds) — l'union 1.7.0 dépassait la limite
//   réelle de grammaire de l'API (classe D-078) ; sémantique inchangée.
export const AIR_SCHEMA_VERSION = "1.31.0";

export const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
export const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

// BCP 47 restreint : langue[-Script][-RÉGION]. Le support RTL est un flag
// explicite (non-négociable #16), pas une déduction depuis la locale.
export const localeSchema = z
  .string()
  .regex(/^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?$/);

// Texte localisé : liste {locale, text} — représentation FERMÉE. L'API
// structured outputs REFUSE les objets à clés libres (additionalProperties
// doit être false, patternProperties non supporté) [mesuré 2026-08-27,
// campagne 2.4] : tout ce qui doit être émis par LLM est donc modélisé en
// tableaux de paires. Unicité des locales et couverture de la locale par
// défaut vérifiées par le validateur sémantique.
export const localizedTextSchema = z
  .array(z.strictObject({ locale: localeSchema, text: z.string().min(1) }))
  .min(1);

// Valeurs de configuration STRICTEMENT plates : liste {key, value} avec value
// obligatoire (primitive ou liste de primitives). L'AIR ne contient pas de
// comportement arbitraire ; la platitude est aussi une contrainte MESURÉE de
// l'API structured outputs (≤ 24 paramètres optionnels par schéma — les
// formes imbriquées optionnelles inlinées à chaque site dépassaient la
// limite). Unicité des clés vérifiée par le validateur sémantique ; un
// groupement se exprime par des clés pointées ("options.mode").
const jsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const jsonLeafSchema = z.union([jsonPrimitiveSchema, z.array(jsonPrimitiveSchema)]);
const configKeySchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/);
export const flatConfigSchema = z.array(
  z.strictObject({
    key: configKeySchema,
    value: jsonLeafSchema,
  }),
);
export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type FlatConfig = z.infer<typeof flatConfigSchema>;

const appLocalesSchema = z.strictObject({
  // Quatre réalités distinctes (non-négociable #16) : langue du demandeur ≠
  // langues de l'app ≠ langues du contenu.
  userLanguage: localeSchema,
  appLocales: z.array(localeSchema).min(1),
  defaultAppLocale: localeSchema,
  contentLocales: z.array(localeSchema).min(1),
  rtlSupported: z.boolean(),
});

/**
 * IDENTITÉ DU COMPTE DE DISTRIBUTION (1.9.0) — `DET-004`.
 *
 * Défaut MESURÉ, deux fois en une session : `app.json` est réécrit
 * INTÉGRALEMENT à chaque émission, et le gabarit n'émettait ni `owner` ni
 * `extra.eas.projectId`. La liaison au projet de build était donc refaite À LA
 * MAIN après chaque régénération — un écart manuel que le garde-fou de la
 * Phase 8 interdit explicitement, et qu'on oublie. Oublié, il produit un build
 * qui ne vise aucun projet, ou pire, le mauvais.
 *
 * La cause n'était pas l'émetteur : c'est que le document ne SAVAIT PAS
 * exprimer à quel compte il appartient. Même forme que `navigation.primary`
 * (1.6.0) et `icon` (1.8.0) — OPTIONNELLE, et la migration n'en invente
 * aucune : rattacher une app à un compte de distribution à la place de son
 * propriétaire serait décider pour lui.
 */
const appDistributionSchema = z.strictObject({
  /** Compte propriétaire chez le fournisseur de build. */
  owner: z.string().min(1).max(80),
  /** Identifiant de projet chez ce fournisseur. */
  projectId: z.string().min(1).max(80),
});

const appSchema = z.strictObject({
  name: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
  description: localizedTextSchema.optional(),
  locales: appLocalesSchema,
  /**
   * MARQUE EMBARQUÉE (1.17.0) — les OCTETS du logo, en base64.
   *
   * Mesuré sur appareil : l'icône de l'app était celle d'Expo par défaut, et
   * l'ouverture ne montrait aucune identité. Une URL ne conviendrait pas —
   * icône et écran de démarrage sont posés au moment du BUILD, pas au
   * runtime, et le chemin de compilation est ZÉRO RÉSEAU. Le document porte
   * donc l'image, comme il porte ses textes.
   *
   * OPTIONNEL : sans elle, l'artefact est celui de 1.16.0 au caractère près.
   */
  brandIconPngBase64: z.string().regex(/^[A-Za-z0-9+/]+=*$/).min(64).optional(),
  /**
   * DEVISE D'AFFICHAGE (1.27.0, EP-201) — le code ISO 4217 de la monnaie dans
   * laquelle l'application montre ses prix.
   *
   * FAIT MESURÉ AVANT CETTE MONTÉE : l'AIR ne portait AUCUNE devise. Un prix
   * s'affichait donc dans le format que le générateur avait écrit au fil du
   * texte — « 45 000 FCFA » ici, « 45000 » là — sans qu'aucune règle ne les
   * accorde, et sans que le moteur puisse formater quoi que ce soit.
   *
   * LE CODE, PAS LE SYMBOLE, ET C'EST TOUTE LA DIFFÉRENCE. « XAF » est une
   * donnée normalisée (ISO 4217) ; « FCFA » est un mot, qui varie selon la
   * langue et la région. Le document porte le CODE, le rendu en tire le
   * format — c'est la même frontière que partout ailleurs ici : le document
   * nomme, le moteur dessine.
   *
   * ET LE MOTEUR N'EN DÉDUIT AUCUN PAYS. La devise vient de la couche
   * d'élicitation, qui a pu la suggérer depuis un pays ; ce qui arrive au
   * document est le code seul. Aucune table pays→devise ne vit dans le
   * moteur, et le cliquet anti-secteur reste vérifiable.
   *
   * OPTIONNEL : une application qui ne montre aucun prix n'a pas de devise à
   * déclarer, et ne s'en voit imposer aucune.
   */
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  distribution: appDistributionSchema.optional(),
});

// CONDITION DE VISIBILITÉ (AIR 1.1.0, D-044 — DET-017 volet 2).
// Défaut mesuré avant cette évolution : 19 écrans sur 50 portaient un bloc
// `empty_state` À CÔTÉ d'une `list` possédant déjà son état vide, et le bloc
// était rendu SANS condition — un état vide s'affichait donc pendant que des
// données étaient présentes, observé sur appareil (Phase 8 puis Phase 10).
// La cause n'était pas le document : le schéma n'offrait AUCUN moyen
// d'exprimer une condition.
//
// Forme volontairement FERMÉE : pas de langage d'expression, deux prédicats
// seulement, adossés à la notion que le registre manipule déjà — le bloc
// `list` dérive son état de `items.length === 0`. Étendre ce vocabulaire
// sera une évolution consciente, pas une improvisation d'un LLM.
const blockVisibilitySchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.enum(["entity_empty", "entity_not_empty"]),
    entityId: entityIdSchema,
  }),
  /**
   * VISIBILITÉ SELON LA SESSION (1.11.0, Phase 4) — le seul prédicat qui
   * n'interroge pas les DONNÉES mais l'ÉTAT DE SESSION.
   *
   * Fait mesuré avant cette montée : `visibleWhen` ne connaissait que
   * `entity_empty`/`entity_not_empty`. Un écran de compte ne pouvait donc PAS
   * montrer « connexion » à un visiteur et « mon profil » à un utilisateur
   * connecté — l'authentification était structurellement inexprimable, quelle
   * que soit l'implémentation derrière. `authorization` dans `air.rules` le
   * concédait déjà : « elles supposent une identité, que le moteur n'a pas ».
   *
   * Aucun `entityId` : la session n'est pas une entité du document. Forme
   * FERMÉE comme les deux premiers prédicats — deux valeurs, pas un langage.
   */
  z.strictObject({
    kind: z.enum([
      "session_authenticated",
      "session_anonymous",
      /**
       * EN ATTENTE DE CONFIRMATION (1.14.0) — le compte est créé, la session
       * ne l'est pas : le serveur attend un clic dans un e-mail.
       *
       * Fait mesuré sur appareil : sans ce troisième état, une inscription
       * RÉUSSIE retombait sur « anonyme » — rien ne bougeait à l'écran et le
       * parcours ressemblait à une panne. L'app ne pouvait pas dire ce
       * qu'elle savait.
       */
      "session_pending_confirmation",
    ]),
  }),
]);

const blockInstanceSchema = z.strictObject({
  id: blockIdSchema,
  // Clé du registre de Smart Blocks — la version exacte est résolue dans le
  // lock, jamais choisie par le LLM.
  blockType: z.string().regex(/^[a-z][a-z0-9_]*$/),
  // ORDRE DE DÉCLARATION SIGNIFICATIF POUR L'ÉMISSION (D-019 / 2.4-H) :
  // la grammaire structured outputs suit cet ordre ; `props` déclarée avant
  // `entityId` créait une trajectoire légale qui forcloait les props sur les
  // blocs portant les deux (cause racine prouvée par la matrice X1-X4 :
  // X3' 7/7 identique ×2). `props` reste EN DERNIER — aligné sur l'ordre
  // d'émission naturel mesuré du modèle. Ne pas réordonner sans re-dérouler
  // le cycle de preuve D-018.
  entityId: entityIdSchema.optional(),
  /** Rendu conditionnel (1.1.0) — absent = toujours visible (comportement 1.0.0). */
  visibleWhen: blockVisibilitySchema.optional(),
  props: flatConfigSchema.optional(),
});

const screenSchema = z.strictObject({
  id: screenIdSchema,
  title: localizedTextSchema,
  /**
   * LE DROIT QUI OUVRE CET ÉCRAN (1.28.0) — OPTIONNEL : un écran sans droit
   * déclaré est ouvert à tous, ce qui est le comportement de toutes les
   * versions antérieures. L'absence n'est donc jamais une fermeture surprise.
   */
  requiredRightId: rightIdSchema.optional(),
  /**
   * CHROME DE L'ÉCRAN (1.15.0) — la barre d'onglets est-elle rendue ici ?
   *
   * Fait mesuré sur appareil : la barre était posée sur TOUS les écrans dès
   * que le document déclarait une navigation principale. Un écran d'accueil
   * produit affichait donc quatre onglets à un visiteur non connecté — une
   * faute que toute application de référence évite.
   *
   * OPTIONNEL, défaut `true` : un document existant est inchangé. Le seul
   * usage légitime de `false` est un écran HORS du parcours principal
   * (accueil produit, connexion) ; le validateur refuse de masquer la barre
   * sur un écran qui EST une destination principale — sinon l'onglet
   * deviendrait inatteignable depuis lui-même.
   */
  showsPrimaryNav: z.boolean().optional(),
  /**
   * EN-TÊTE NATIF (1.16.0) — la barre de titre de la navigation est-elle
   * rendue ici ?
   *
   * Mesuré à l'écran : sur un accueil produit portant une MARQUE, le titre de
   * route s'affichait AU-DESSUS du logo — deux identités empilées, là où
   * toute application de référence n'en montre qu'une.
   *
   * OPTIONNEL, défaut `true` : un document existant est inchangé.
   */
  showsScreenTitle: z.boolean().optional(),
  /**
   * PRÉSENTATION (1.17.0) — `card` (défaut) ou `sheet`.
   *
   * Une FEUILLE se superpose au parcours au lieu de le remplacer : elle monte
   * du bas, et l'on en sort sans « revenir en arrière ». C'est la forme
   * attendue d'une étape qui interrompt — connexion, réglages — par
   * opposition à une destination, qui EST le parcours.
   *
   * OPTIONNEL : sans déclaration, l'écran reste une carte poussée.
   */
  presentation: z.enum(["card", "sheet"]).optional(),
  /**
   * GENRE D'ÉCRAN (1.23.0, EP-137) — ce qu'un écran EST, quand ce n'est pas
   * le modèle métier qui le dit.
   *
   * Les écrans ordinaires se dérivent du besoin : une liste de produits
   * existe parce qu'un parcours la traverse. Certains écrans n'ont AUCUNE
   * existence métier et doivent pourtant être là — parce que c'est une
   * APPLICATION, pas parce que le domaine les demande. Une politique de
   * confidentialité ne se déduit d'aucun modèle ; elle est exigée par les
   * plateformes (App Store Review Guidelines 5.1.1(i) : « All apps must
   * include a link to their privacy policy … within the app in an easily
   * accessible manner »).
   *
   * Ce champ les NOMME structurellement, pour qu'un juge les reconnaisse
   * sans lire un titre — un jugement fondé sur du texte serait fragile et
   * traduisible.
   *
   * LISTE LITTÉRALE, ET SOUS CLIQUET : ce paquet ne peut dépendre d'aucun
   * autre (même règle que les rôles d'icônes), donc la table qui porte le
   * FONDEMENT de chaque genre vit ailleurs, et un test refuse toute
   * divergence entre les deux.
   *
   * OPTIONNEL AU SCHÉMA, EXIGÉ PAR LA GATE — même motif qu'`intent` : le
   * rendre requis forcerait la migration à inventer un genre pour chaque
   * écran des documents existants. Le fail-closed vit dans le juge.
   */
  purpose: z
    .enum([
      "privacy_policy",
      "terms",
      "help",
      "contact",
      "settings",
      "account_create",
      "account_delete",
      // 1.24.0 (EP-145) — le consentement au partage avec des tiers.
      // Apple 5.1.2(i) exige de l'obtenir AVANT le partage ; il n'existe que
      // si un partage existe, ce qui se DÉRIVE des intégrations.
      "privacy_consent",
      // 1.25.0 (EP-147) — le RETRAIT du consentement (5.1.1(ii)).
      "consent_withdraw",
      // 1.26.0 (EP-191) — LA RACINE DE L'ESPACE COMPTE, et non l'une de ses
      // sous-surfaces. Les autres genres nomment ce qui VIT dans le compte
      // (`account_create`, `account_delete`, `settings`…) ; celui-ci nomme le
      // LIEU qui les héberge — la destination que la barre inférieure doit
      // atteindre et que le compilateur doit intituler « Compte ».
      //
      // POURQUOI AU DOCUMENT, ET NON EN OPTION DU COMPILATEUR. EP-180 avait
      // posé la règle « le compilateur pose les primitives » en lisant une
      // option `ecransDIdentite`. MESURÉ EN EP-190 ⑤ : AUCUN des 9 sites
      // d'appel réels ne passait cette option. Le compilateur posait donc
      // « Accueil » — dérivé d'`entryScreenId`, TOUJOURS présent au document —
      // et ne posait JAMAIS « Compte ». Le défaut a survécu à QUATRE runs
      // (« Annonces », « Mon compte », « Mon espace ») et c'est lui que
      // Youssouf a vu sur son téléphone.
      //
      // UN PARAMÈTRE QUE NEUF APPELANTS SUR NEUF OUBLIENT N'EST PAS UN
      // PARAMÈTRE : c'est une branche morte qui se croit vivante. Le genre
      // vit donc AU DOCUMENT, là où `entryScreenId` vit déjà — le seul
      // endroit qu'aucun appelant ne peut oublier de transmettre, puisqu'il
      // EST l'entrée. C'est la doctrine que ce schéma énonce plus bas :
      // le DOCUMENT nomme, le moteur dessine.
      "account_home",
    ])
    .optional(),
  /**
   * LIBELLÉ DE FERMETURE (1.18.0) — le mot que porte le contrôle qui referme
   * une feuille.
   *
   * Mesuré à l'écran (SM-A175F) : une feuille montait du bas et RIEN n'y
   * annonçait comment en sortir. iOS fournit le glissement vers le bas ;
   * Android ne fournit rien pour une pile native — seul le bouton matériel,
   * qu'aucun pixel n'indique. Le moteur peut donc dessiner un signe de
   * fermeture, mais il ne peut pas le NOMMER : écrire « Fermer » dans le
   * moteur serait du texte de langue naturelle produit par le compilateur
   * (F3), et ce texte partirait tel quel dans toutes les langues.
   *
   * Le DOCUMENT le nomme, le moteur le dessine. Sans déclaration, le contrôle
   * est rendu avec son seul rôle d'accessibilité — la fermeture reste
   * possible et visible, mais elle n'est pas ANNONCÉE. Aucune valeur par
   * défaut n'est inventée.
   *
   * N'a de sens que sur `presentation: "sheet"` : le validateur refuse la
   * déclaration ailleurs, plutôt que de l'ignorer en silence.
   */
  dismissLabel: localizedTextSchema.optional(),
  blocks: z.array(blockInstanceSchema).min(1),
});

/**
 * NAVIGATION PRINCIPALE (1.6.0, D-086) — le RÉSULTAT ARCHITECTURAL, pas la
 * catégorie qui l'a produit.
 *
 * Fait mesuré : `routes` n'était qu'un registre PLAT d'écrans. Aucune notion de
 * destination principale. Le seul moyen d'exprimer « on peut aller au panier »
 * était donc un `button` dans le CORPS de l'écran — mesuré sur le corpus v3 :
 * **184 boutons de navigation pure sur 235, soit 1,7 par écran**, jusqu'à
 * quatre empilés sous la liste des plats.
 *
 * 🔴 L'AIR NE CONNAÎT AUCUNE CATÉGORIE MÉTIER. Ni « restaurant », ni
 * « boutique », ni « réservation ». Déduire l'archétype est un raisonnement du
 * GÉNÉRATEUR ; le contrat porte sa conclusion — quelles destinations sont
 * principales, dans quel ordre — jamais l'étiquette qui a servi à la produire.
 * Sinon le compilateur devrait connaître les métiers, et le moteur cesserait
 * d'être agnostique.
 *
 * Bornes 3–5 : en deçà une barre n'a pas lieu d'être, au-delà elle devient
 * illisible sur un écran de téléphone.
 */
const primaryNavigationSchema = z.strictObject({
  destinations: z
    .array(
      z.strictObject({
        routeId: routeIdSchema,
        /** Libellé de l'onglet — DONNÉE du document, jamais texte moteur (F3). */
        label: localizedTextSchema,
        /** Position dans la barre, à partir de 0. Unique, contiguë. */
        order: z.number().int().min(0).max(4),
        /**
         * ICÔNE D'ONGLET (1.8.0) — OPTIONNELLE et FERMÉE.
         *
         * Fermée parce qu'une icône doit être RENDABLE : le moteur doit savoir
         * dessiner ce que le document nomme. Un nom libre, ou une URL, ferait
         * revenir la classe de défaut que `D-088` a corrigée — un document qui
         * promet ce que le moteur ne rend pas. Chaque valeur est associée à un
         * glyphe embarqué, sans aucun accès réseau : le cliquet zéro-réseau du
         * chemin de compilation reste tenu.
         *
         * Optionnelle parce qu'un document 1.7.1 n'en porte pas et que la
         * migration n'en INVENTE aucune : choisir l'icône d'un onglet à la
         * place du document serait décider de son identité visuelle.
         */
        icon: z
          .enum([
            "accueil",
            "recherche",
            "liste",
            "billet",
            "panier",
            "calendrier",
            "carte",
            "compte",
            "favoris",
            "message",
            "reglages",
          ])
          .optional(),
      }),
    )
    .min(3)
    .max(5),
});

const navigationSchema = z.strictObject({
  entryScreenId: screenIdSchema,
  /**
   * OPTIONNELLE : un document 1.5.0 n'en porte pas, et la migration n'en
   * invente aucune — choisir les destinations principales à la place du
   * document serait décider de son architecture.
   */
  primary: primaryNavigationSchema.optional(),
  routes: z
    .array(
      z.strictObject({
        id: routeIdSchema,
        screenId: screenIdSchema,
        title: localizedTextSchema.optional(),
      }),
    )
    .min(1),
});

export const fieldTypeSchema = z.enum([
  "string",
  "text",
  "number",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "enum",
  "reference",
  "asset",
  "json",
]);

const fieldSchema = z.strictObject({
  id: fieldIdSchema,
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  type: fieldTypeSchema,
  required: z.boolean(),
  unique: z.boolean().optional(),
  // Exigé ssi type=enum / type=reference — cohérence vérifiée par le
  // validateur sémantique (un schéma zod ne voit pas les autres champs).
  enumValues: z.array(z.string().min(1)).min(1).optional(),
  referencesEntityId: entityIdSchema.optional(),
  /**
   * LES PASSAGES D'ÉTAT PERMIS (1.30.0) — sur un champ `enum`, et lui seul.
   *
   * ── CE QU'UNE ÉNUMÉRATION NE DIT PAS.
   *
   * `statut: EN_ATTENTE | SEQUESTRE_BLOQUE | PAYOUT_SUCCES | ECHEC` énumère
   * quatre valeurs et ne dit RIEN de leur ordre. Rien n'empêche de repasser un
   * décaissement réussi en attente, ni de le bloquer après coup. Mesuré sur le
   * cahier des charges d'une tontine : le mot « séquestre » écrit dans une
   * colonne ne séquestre rien.
   *
   * Déclarer les transitions dit ce qui SUCCÈDE À QUOI. Le validateur refuse
   * alors une valeur inatteignable — un état qu'aucune transition ne mène est
   * un état mort, donc une promesse qui ne se tiendra jamais.
   *
   * ── CE QUE CECI NE DIT PAS, ET QU'IL FAUT DIRE.
   *
   * L'automate dit quels passages sont PERMIS. Il ne dit pas QUAND un passage a
   * lieu de lui-même — « le séquestre se libère à l'échéance du tour » suppose
   * une horloge, et une horloge vit sur le serveur. Prétendre le contraire
   * ferait croire qu'une application déverrouille des fonds toute seule.
   */
  /**
   * UN CHAMP QUI EST LE RÉSULTAT D'AUTRES LIGNES (1.31.0) — OPTIONNEL.
   *
   * ── LE MÊME BESOIN DANS LES DEUX MÉTIERS.
   *
   * SGD : « le stock n'est jamais stocké : il se calcule en rejouant les
   * mouvements d'entrée et de sortie ». Un stock ÉCRIT diverge de son
   * historique sans que rien ne le signale.
   *
   * Tontine : « les primes d'enchères s'accumulent pendant toute la durée du
   * cycle » — une cagnotte écrite à la main se désaccorde des transactions qui
   * la composent.
   *
   * ── DEUX OPÉRATIONS, ET PAS UNE DE PLUS.
   *
   * `sum` et `count` sur une relation déclarée. C'est peu, et c'est voulu : un
   * langage d'expressions arbitraires au contrat rendrait le document
   * incalculable — il faudrait l'évaluer pour savoir ce qu'il dit. Ces deux-là
   * se traduisent sans ambiguïté en SQL, donc le serveur les tient vraiment.
   *
   * ── CE QUE CELA NE COUVRE PAS, ET QU'IL FAUT DIRE.
   *
   * Un TAUX sur une durée — « 2 % par jour de retard » — n'est pas une
   * agrégation : il suppose une horloge et une multiplication. Un PARTAGE —
   * « 70 % au groupe, 30 % à la plateforme » — non plus. Ces règles restent au
   * serveur, avec le reste de l'argent.
   *
   * ── ET IL NE SE STOCKE JAMAIS.
   *
   * Le validateur refuse qu'une action l'écrive : un champ dérivé qu'on peut
   * écrire est un champ qui finira par contredire ce dont il dérive, et c'est
   * exactement le défaut que SGD a payé.
   */
  derived: z
    .discriminatedUnion("kind", [
      z.strictObject({
        kind: z.literal("count"),
        /** La relation qui mène aux lignes à compter. */
        relationId: relationIdSchema,
      }),
      z.strictObject({
        kind: z.literal("sum"),
        relationId: relationIdSchema,
        /** Le champ à sommer, sur l'entité au bout de la relation. */
        fieldId: fieldIdSchema,
      }),
    ])
    .optional(),
  transitions: z
    .array(z.strictObject({ from: z.string().min(1), to: z.string().min(1) }))
    .min(1)
    .optional(),
  /**
   * CHAMP D'AFFICHAGE DE LA RÉFÉRENCE (1.4.0, D-064).
   *
   * `referencesEntityId` disait vers QUOI pointer, jamais QUOI MONTRER. Un champ
   * `reference` s'affichait donc en identifiant brut — mesuré : 6 occurrences au
   * corpus, et `relationTraversal: false` le concédait. Deviner « le premier
   * champ texte de la cible » aurait été une convention, c'est-à-dire une
   * supposition ; le document le déclare.
   *
   * OPTIONNEL : sans lui, l'identifiant brut reste affiché — comportement 1.3.0
   * inchangé, et la migration n'invente aucune cible.
   */
  referenceDisplayFieldId: fieldIdSchema.optional(),
  /**
   * LIBELLÉ D'AFFICHAGE DU CHAMP (1.10.0, DET-032).
   *
   * `name` est un identifiant machine (`^[a-z][a-z0-9_]*$`) et c'est LUI qui
   * était rendu : titres de filtres et libellés de formulaires affichaient
   * `statut` ou `passager_nom`. Jugé par le propriétaire sur appareil réel
   * (SM-A175F, 2026-09-05) : des codes machine à l'écran. Même philosophie
   * que D-064 : deviner une capitalisation ou une traduction serait une
   * convention, c'est-à-dire une supposition — le document DÉCLARE.
   *
   * OPTIONNEL : sans lui, `name` reste affiché — comportement 1.9.0 inchangé,
   * la migration n'invente aucun libellé.
   */
  label: localizedTextSchema.optional(),
  /**
   * LIBELLÉS DES VALEURS D'ENUM (1.10.0, DET-032).
   *
   * Les valeurs d'enum sont des codes (`a_l_heure`) et fuyaient telles
   * quelles jusqu'aux chips de filtre et aux badges. Clé = valeur d'enum
   * déclarée dans `enumValues` (cohérence vérifiée par le validateur
   * sémantique) ; valeur = texte localisé. Le FILTRAGE et les données
   * continuent de porter le code — seul l'AFFICHAGE change.
   *
   * OPTIONNEL, et partiel autorisé : une valeur sans libellé s'affiche brute.
   *
   * 1.19.0 — LISTE DE PAIRES, plus un dictionnaire ouvert. Mesuré : l'API de
   * sorties structurées REFUSE désormais tout `additionalProperties` ouvert
   * (400, campagne du 2026-09-09) — le générateur ne pouvait donc plus émettre
   * de libellés DU TOUT. Le dictionnaire était de toute façon une entorse à la
   * philosophie du contrat, énoncée plus haut : listes plates {key, value},
   * précisément pour cette API. Migration RÉELLE 1.18 → 1.19.
   */
  enumLabels: z
    .array(z.strictObject({ value: z.string().min(1), label: localizedTextSchema }))
    .min(1)
    .optional(),
  /**
   * VALEURS DE DÉMO (1.20.0) — jugé à l'écran sur la première app 100 %
   * générée : les fixtures du moteur fabriquaient « nom 17 », « nom 20 » —
   * des valeurs machine dans une interface qui se veut premium. Le moteur ne
   * peut pas inventer du contenu métier (il ne connaît pas le secteur) ; le
   * DOCUMENT le déclare. Le générateur de fixtures les cycle en boucle,
   * déterministe comme avant. Champs texte uniquement — les nombres, dates
   * et enums ont déjà des formes plausibles.
   */
  demoValues: z.array(z.string().min(1)).min(1).max(24).optional(),
  /**
   * UNITÉ D'AFFICHAGE (1.21.0) — « 160 000 FCFA », pas « 622.44 ».
   *
   * Jugé sur captures de référence (propriétaire, 2026-09-10) : les deux
   * marketplaces de référence affichent le prix EN VEDETTE avec sa monnaie ;
   * le moteur affichait la valeur brute. L'unité est une DONNÉE du document
   * (monnaie, kg, km…) — le moteur formate le nombre (séparateurs de la
   * locale), il n'invente jamais l'unité (F3).
   */
  unit: z.string().min(1).max(12).optional(),
  /**
   * CHAMP SENSIBLE (1.12.0, Phase 4) — saisi, JAMAIS conservé.
   *
   * Fait mesuré avant cette montée : tout champ d'entité devient une COLONNE
   * et reçoit une valeur de démo (`sql-gen`). Déclarer un mot de passe comme
   * un champ ordinaire aurait donc créé une colonne `mot_de_passe` et l'aurait
   * SEMÉE — précisément ce qu'aucune application ne doit faire.
   *
   * Les deux propriétés sont VOLONTAIREMENT COUPLÉES dans un seul drapeau :
   * saisie masquée ET absence de persistance. Les séparer permettrait de
   * déclarer « masqué mais stocké » — la combinaison dangereuse. Ici elle est
   * inexprimable par construction.
   *
   * Le secret vit chez le fournisseur d'identité (`auth.users`), jamais dans
   * les tables de l'app.
   */
  sensitive: z.boolean().optional(),
});

const entitySchema = z.strictObject({
  id: entityIdSchema,
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  /**
   * CETTE ENTITÉ NE SE RÉÉCRIT PAS (1.30.0) — OPTIONNEL.
   *
   * ── DEUX MÉTIERS, LE MÊME BESOIN.
   *
   * SGD : « annuler un mouvement, c'est en écrire un INVERSE, jamais effacer le
   * premier ». Un stock écrit diverge de son historique sans que rien ne le
   * signale ; un mouvement effacé fait mentir la comptabilité dès la première
   * erreur corrigée.
   *
   * Tontine : les transactions portent des cotisations, des enchères et des
   * décaissements. Modifier une ligne d'argent déjà passée n'est pas une
   * correction, c'est une réécriture de l'histoire.
   *
   * Déclarée `true`, le validateur REFUSE toute action qui modifie ou efface
   * une ligne de cette entité. La seule correction possible devient l'écriture
   * d'une ligne NOUVELLE — ce que la comptabilité appelle une contre-passation,
   * et ce que les deux métiers font déjà à la main.
   *
   * Absent vaut `false` : aucune entité existante ne se fige par surprise.
   */
  appendOnly: z.boolean().optional(),
  fields: z.array(fieldSchema).min(1),
});

const relationSchema = z.strictObject({
  id: relationIdSchema,
  fromEntityId: entityIdSchema,
  toEntityId: entityIdSchema,
  kind: z.enum(["one_to_one", "one_to_many", "many_to_many"]),
});

// Le contenu initial est généré AVANT compilation et stocké hors AIR, adressé
// par hash — la compilation reste pure (ARCHITECTURE §1).
/**
 * PROVENANCE D'UN DATASET (1.7.1, E3.3/D-131) — forme APLANIE, sémantique
 * E3.2/D-130 INCHANGÉE. L'union fermée 1.7.0 (seed | remote) était refusée
 * par l'API réelle à TOUS les niveaux de l'échelle (« compiled grammar is
 * too large », classe D-078) : la partie `donnees` était au bord de la
 * limite et l'union l'a fait franchir — prouvé par sonde différentielle
 * même-jour (1.6.0 acceptée · union refusée · forme plate acceptée au
 * niveau nominal). Champs PLATS optionnels + cohérence par superRefine :
 * la forme plate n'accepte QUE ce que l'union acceptait, plus l'absence
 * totale (comportement historique au caractère près). `remote` DÉCLARE une
 * provenance — la CONSOMMATION est l'affaire du runtime (adaptateur E3.3/
 * D-132, fait d'enveloppe `liveData`) : AUCUNE présence syntaxique ne vaut
 * preuve de vivacité — les instruments exigent la trace ET le moteur a dû
 * prouver la sienne au rendu. Fail-closed au validateur : intégration
 * existante + domaine autorisé.
 */
const datasetSchema = z
  .strictObject({
    id: datasetIdSchema,
    entityId: entityIdSchema,
    contentHash: sha256Schema,
    rowCount: z.number().int().min(0),
    sourceKind: z.enum(["seed", "remote"]).optional(),
    sourceIntegrationId: integrationIdSchema.optional(),
    sourceDomain: z
      .string()
      .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/)
      .optional(),
    sourceRefreshSeconds: z.number().int().min(5).max(3600).optional(),
  })
  .superRefine((d, ctx) => {
    const remoteFields =
      d.sourceIntegrationId !== undefined ||
      d.sourceDomain !== undefined ||
      d.sourceRefreshSeconds !== undefined;
    if (d.sourceKind === undefined && remoteFields) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceKind"],
        message: "champs source* sans sourceKind : provenance incohérente refusée",
      });
    }
    if (d.sourceKind === "seed" && remoteFields) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceKind"],
        message:
          'sourceKind "seed" = source locale : sourceIntegrationId/sourceDomain/sourceRefreshSeconds interdits',
      });
    }
    if (d.sourceKind === "remote") {
      if (d.sourceIntegrationId === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["sourceIntegrationId"],
          message: 'sourceKind "remote" exige sourceIntegrationId (fail-closed)',
        });
      }
      if (d.sourceDomain === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["sourceDomain"],
          message: 'sourceKind "remote" exige sourceDomain (fail-closed)',
        });
      }
    }
  });

const actionTriggerSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("ui"),
    blockId: blockIdSchema,
    /**
     * RÔLE (1.21.0) — un bloc peut porter DEUX gestes : son geste principal
     * (appui sur la ligne, soumission du formulaire) et un geste SECONDAIRE
     * (« Voir plus » d'un en-tête de section — patron des deux références
     * marketplace fournies par le propriétaire). Absent = "primary" ; deux
     * actions de même rôle sur un bloc restent une ambiguïté refusée.
     */
    role: z.enum(["primary", "secondary"]).optional(),
  }),
  z.strictObject({
    kind: z.literal("lifecycle"),
    event: z.enum(["app_start", "screen_open", "screen_close"]),
    screenId: screenIdSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal("data"),
    entityId: entityIdSchema,
    event: z.enum(["created", "updated", "deleted"]),
  }),
]);

// Fermé par construction : pas de comportement arbitraire dans l'AIR — le
// spécifique-domaine passe par une capability ou un Code Slot (§1/§4).
// Source d'une entrée de slot — union FERMÉE. Aucune expression arbitraire :
// un slot reçoit des données du document, jamais un calcul improvisé.
const slotInputSourceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("entity_rows"), entityId: entityIdSchema }),
  z.strictObject({ kind: z.literal("literal"), value: jsonLeafSchema }),
]);

const slotPortNameSchema = z.string().regex(/^[a-z][a-zA-Z0-9]*$/);

const slotBindingSchema = z.strictObject({
  // TOTALITÉ EXIGÉE par le validateur : chaque entrée déclarée par le slot doit
  // être liée. Une entrée manquante produirait un `undefined` silencieux dans du
  // code d'auteur — le défaut que ce chantier passe son temps à traquer.
  inputs: z.array(z.strictObject({ port: slotPortNameSchema, source: slotInputSourceSchema })),
  // Une sortie alimente la prop d'un bloc. Cible fermée : le slot ne peut
  // écrire nulle part ailleurs.
  outputs: z
    .array(
      z.strictObject({
        port: slotPortNameSchema,
        blockId: blockIdSchema,
        prop: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
      }),
    )
    .min(1),
});

const actionEffectSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("capability"),
    capability: capabilityRefSchema,
    method: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
    params: flatConfigSchema.optional(),
    /**
     * ÉCRAN SUIVANT (1.22.0, EP-064) — où aller UNE FOIS l'appel HONORÉ.
     *
     * Défaut MESURÉ sur la première traversée réelle du pipeline (campagne
     * EP-061, re-jugée R6) : la navigation post-connexion était ENTIÈREMENT
     * morte — 8 arcs prescrits inexécutables. Le générateur avait porté cette
     * intention dans un PARAM (`thenScreenId`) que rien ne lisait, parce que
     * l'effet `capability` n'offrait AUCUNE place au « et ensuite ».
     *
     * Même contrat que la mutation (D-070) : OPTIONNEL, et la navigation n'a
     * lieu QUE SI le fournisseur a HONORÉ l'appel (`invoke` rend true) — un
     * refus garde l'utilisateur sur place, jamais d'écran de confirmation
     * mensonger.
     */
    thenScreenId: screenIdSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal("slot"),
    slotId: slotIdSchema,
    /**
     * LIAISON DU SLOT (1.3.0, D-058) — d'où viennent ses entrées, où vont ses
     * sorties.
     *
     * Fait mesuré : sur 152 promesses mortes du corpus, **44 visaient un slot**.
     * Le compilateur ÉMET pourtant leur code et l'Oracle en refuse les
     * exfiltrations — mais rien ne les APPELAIT, parce que `{kind:"slot",
     * slotId}` nommait un slot sans dire ce qu'on lui donne ni ce qu'on fait de
     * son résultat. **Le câblage était inexprimable**, exactement comme
     * l'intention l'était avant 1.2.0.
     *
     * OPTIONNELLE au schéma : les 12 documents gelés n'en portent pas, et la
     * migration s'interdit d'en inventer. Sans liaison, le slot n'est PAS
     * invoqué — et la gate de fidélité le dit.
     */
    binding: slotBindingSchema.optional(),
  }),
  z.strictObject({ kind: z.literal("navigate"), screenId: screenIdSchema }),
  z.strictObject({
    kind: z.literal("mutation"),
    entityId: entityIdSchema,
    operation: z.enum(["create", "update", "delete"]),
    /**
     * D'OÙ VIENT L'INSTANCE À ÉCRIRE (1.13.0, VOLET 1).
     *
     * `route` (défaut) — la ligne ouverte : l'écran de détail la transporte.
     * `session` — la ligne de la PERSONNE CONNECTÉE. Un écran de profil n'a
     * pas d'`itemId` : son instance est l'identité, pas une navigation.
     *
     * Fait mesuré avant cette montée : `update` exigeait un `saisie.id` que
     * RIEN ne fournissait — 65 contrôles sur 27 applications étaient donc
     * pressables et inertes, sans le dire. « Enregistrer mes informations » en
     * faisait partie.
     *
     * `session` sans identité établie = aucune écriture. On n'écrit jamais la
     * ligne de quelqu'un d'autre parce qu'on ne sait pas qui on est.
     */
    instanceFrom: z.enum(["route", "session"]).optional(),
    /**
     * ÉCRAN SUIVANT (1.5.0, D-070) — où aller UNE FOIS l'écriture faite.
     *
     * Défaut trouvé en INSPECTANT l'application émise : un effet d'action est
     * UNIQUE. Un formulaire ne pouvait donc pas « enregistrer PUIS confirmer » —
     * il fallait choisir. Toutes les vitrines choisissaient `navigate`, si bien
     * que **« Valider » changeait d'écran sans rien enregistrer**, et la gate de
     * fidélité laissait passer : sa cible était bien vivante.
     *
     * OPTIONNEL : sans lui, l'écriture a lieu et l'utilisateur reste sur place —
     * comportement 1.4.0 inchangé. La navigation N'A LIEU QUE SI L'ÉCRITURE A
     * RÉUSSI : une règle qui refuse la saisie doit garder l'utilisateur sur son
     * formulaire, jamais l'envoyer sur un écran de confirmation mensonger.
     */
    thenScreenId: screenIdSchema.optional(),
  }),
]);

const actionSchema = z.strictObject({
  /**
   * LE DROIT QU'EXIGE CETTE ACTION (1.28.0). Un écran peut être ouvert à tous
   * et porter un geste qui ne l'est pas : dans SGD, inventaire, vente et
   * transfert sont trois droits distincts sur le MÊME écran de scan — ils ne
   * font pas la même chose au stock. Sans ce champ, le droit ne pouvait
   * s'accrocher qu'à l'écran, donc aux trois à la fois.
   */
  requiredRightId: rightIdSchema.optional(),
  id: actionIdSchema,
  name: z.string().min(1),
  trigger: actionTriggerSchema,
  effect: actionEffectSchema,
});

const ruleAssertionSchema = z.strictObject({
  fieldId: fieldIdSchema,
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "matches", "required"]),
  value: jsonLeafSchema.optional(),
});

const ruleSchema = z.strictObject({
  id: ruleIdSchema,
  description: z.string().min(1),
  kind: z.enum(["validation", "authorization"]),
  entityId: entityIdSchema,
  assertions: z.array(ruleAssertionSchema).min(1),
});

// Un slot est du code écrit par LLM sous influence potentielle du prompt
// utilisateur (injection indirecte) : signature typée + imports en allowlist
// ici ; gardes AST et sandbox sans secrets côté compilateur (§4).
const slotPortSchema = z.strictObject({
  name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
  type: fieldTypeSchema,
});

const slotSchema = z.strictObject({
  id: slotIdSchema,
  description: z.string().min(1),
  inputs: z.array(slotPortSchema),
  outputs: z.array(slotPortSchema),
  allowedImports: z.array(z.string()),
});

// ══════════════════════════════════════════════════════════════
//  CONTRÔLE D'ACCÈS (1.28.0) — QUI A LE DROIT DE VOIR QUOI.
//
// ── POURQUOI CE BLOC EXISTE, et ce qu'il a coûté de ne pas l'avoir.
//
// Mesure du 2026-10-04 : l'AIR d'un système de gestion réel — SGD, en
// production — a été écrit, puis compilé. Le modèle de données passe sans
// difficulté : 15 entités, 9 relations, 73 fichiers émis. Mais NEUF besoins sur
// quatorze sont sortis `unexpressible`, et TROIS tenaient au même trou.
//
// `permissions` décrit les permissions de l'APPAREIL — caméra, iOS/Android,
// `requiredByCapability`. Rien à voir avec les droits d'une personne. Et
// `rules.kind = "authorization"` porte sur les CHAMPS d'une entité : elle sait
// dire « ce champ doit valoir ceci », jamais « cet écran demande ce droit ».
//
// CE QUE CE TROU A PRODUIT DANS LA VRAIE VIE. Dans SGD, dix-sept routes
// écrivaient avec la clé qui traverse les politiques de la base — l'application
// était elle-même la porte ouverte. Et un employé sans le droit du tableau de
// bord ne pouvait pas entrer DU TOUT : ni par la page de connexion, ni par
// l'application installée sur son téléphone, qui ouvrait sur ce même écran. Le
// défaut a survécu à sa propre correction parce qu'il habitait deux fichiers.
//
// LE PROPRIÉTAIRE NE PEUT PAS LE VOIR : il voit tout. C'est la raison pour
// laquelle un contrôle de ce genre doit vivre dans le FORMAT, et être vérifié à
// la compilation — pas découvert sur le téléphone d'un employé.
// ══════════════════════════════════════════════════════════════

const rightSchema = z.strictObject({
  id: rightIdSchema,
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: localizedTextSchema,
});

const roleSchema = z.strictObject({
  id: roleIdSchema,
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: localizedTextSchema,
  /**
   * LE RÔLE QUI VOIT TOUT, déclaré et non déduit.
   *
   * Dans SGD le propriétaire ne figure sur aucune liste blanche : sa liste de
   * droits pourrait être vide, il resterait propriétaire. Exprimer cela en lui
   * accordant TOUS les droits un par un serait une liste à tenir à jour — et
   * la première section ajoutée demain lui serait fermée sans que personne le
   * remarque.
   */
  grantsAllRights: z.boolean().optional(),
  rightIds: z.array(rightIdSchema),
});

const accessSchema = z.strictObject({
  rights: z.array(rightSchema),
  roles: z.array(roleSchema).min(1),
  /**
   * CE QU'UN COMPTE REÇOIT QUAND RIEN N'A ÉTÉ ACCORDÉ.
   *
   * Exigé, et c'est le point : sans rôle par défaut, un compte créé hors de
   * l'application n'aurait AUCUN statut, et chaque écran déciderait seul s'il
   * le laisse entrer. C'est ainsi qu'un compte sans profil traversait SGD
   * jusqu'à ce que `exigerProfil` soit posé sur les trente-trois routes.
   */
  defaultRoleId: roleIdSchema,
  /**
   * AGIR AU NOM D'UN AUTRE (1.29.0) — OPTIONNEL.
   *
   * ── LE DÉFAUT QUE CE BLOC FERME, et un seul métier pouvait le révéler.
   *
   * 1.28.0 sait dire « cette personne a ce droit ». Il ne sait pas dire « AU
   * NOM DE QUI ». SGD ne pouvait pas le montrer : un employé y agit toujours
   * pour lui-même.
   *
   * Mesuré le 2026-10-05 sur le cahier des charges d'une tontine camerounaise :
   * « tout membre ne possédant pas de smartphone est rattaché à un mandataire.
   * Le membre remet la somme en espèces ; le mandataire saisit la transaction
   * et crédite le séquestre. Lors du tour de gain, le décaissement est versé au
   * mandataire, qui remet la somme contre signature d'un reçu de décharge. »
   *
   * Sans ce bloc, la colonne « mandataire » existe dans les données et RIEN ne
   * l'autorise ni ne l'encadre — et un reçu qui ne porte qu'un seul nom ne
   * prouve rien.
   *
   * ── POURQUOI UNE LISTE BLANCHE DE DROITS, ET NON UN DRAPEAU.
   *
   * « Ce mandataire peut tout faire pour moi » serait une procuration générale,
   * que personne ne signe en connaissance de cause. Les droits délégables sont
   * donc ÉNUMÉRÉS : cotiser pour un autre, oui ; vérifier sa propre identité au
   * nom d'un autre, jamais.
   */
  delegation: z
    .strictObject({
      /** L'entité qui porte les PERSONNES — celles qui délèguent et reçoivent. */
      subjectEntityId: entityIdSchema,
      /**
       * Le champ qui dit QUI est le mandataire de qui.
       *
       * Il vit sur `subjectEntityId` et pointe vers elle : le mandataire d'une
       * personne est une personne. Le validateur le vérifie — une délégation
       * qui pointerait ailleurs désignerait n'importe quoi.
       */
      holderFieldId: fieldIdSchema,
      /** Les droits qui peuvent s'exercer POUR UN AUTRE. Jamais tous. */
      delegatableRightIds: z.array(rightIdSchema).min(1),
    })
    .optional(),
});

const capabilityRequestSchema = z.strictObject({
  capability: capabilityRefSchema,
  config: flatConfigSchema.optional(),
});

const permissionSchema = z.strictObject({
  platform: z.enum(["ios", "android", "both"]),
  permission: z.string().regex(/^[A-Za-z][A-Za-z0-9_.]*$/),
  reason: localizedTextSchema,
  requiredByCapability: capabilityRefSchema,
});

const designSchema = z.strictObject({
  theme: z.string().regex(/^[a-z][a-z0-9_]*$/),
  tokensVersion: semverSchema.optional(),
  overrides: flatConfigSchema.optional(),
});

const integrationSchema = z.strictObject({
  id: integrationIdSchema,
  // Classe neutre ("psp", "email"…) — le provider concret est résolu dans le
  // lock (multi-provider, non-négociable #12).
  providerClass: z.string().regex(/^[a-z][a-z0-9_]*$/),
  capability: capabilityRefSchema.optional(),
  // JAMAIS de secret ici (non-négociable #13) — vérifié par le validateur.
  config: flatConfigSchema.optional(),
});

const networkPolicySchema = z.strictObject({
  policy: z.literal("deny_by_default"),
  allowedDomains: z.array(z.string().regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/)),
});

const nativeRequirementsSchema = z.strictObject({
  minIosVersion: z.string().regex(/^\d+(\.\d+)?$/),
  minAndroidSdk: z.number().int().min(21),
});

const complianceSchema = z.strictObject({
  // digital ⇒ IAP obligatoire ; physical_or_offapp ⇒ PSP autorisé (§2).
  commerceClass: z.enum(["none", "digital", "physical_or_offapp"]),
  accountDeletionRequired: z.boolean(),
  dataCollected: z.array(
    z.enum([
      "contact_info",
      "identifiers",
      "usage_data",
      "location",
      "user_content",
      "purchases",
      "diagnostics",
    ]),
  ),
});

const expectedTestSchema = z.strictObject({
  id: testIdSchema,
  description: z.string().min(1),
  kind: z.enum(["deterministic", "e2e", "contract"]),
  // Id d'écran, d'action ou d'entité — existence vérifiée par le validateur.
  targetId: z.string().min(1),
});

// INTENTION DU CLIENT (AIR 1.2.0, D-056) — la racine mesurée en `APP-D004`.
//
// Fait fondateur : l'AIR portait 19 champs et AUCUN ne contenait la demande.
// « menu avec photos et prix » entrait dans un prompt et DISPARAISSAIT. Aucun
// artefact en aval ne savait ce qui avait été demandé, donc toute la
// vérification comparait l'artefact au document — jamais le document à la
// demande.
//
// `resolution` est REQUISE et FERMÉE : un besoin est soit rattaché à des nœuds
// du document, soit déclaré inexprimable AVEC MOTIF. Il n'existe pas de
// troisième issue, et surtout pas l'absence silencieuse — c'est précisément
// par elle que « avec photos » s'est évaporé dans 12 documents sur 13.
const needSchema = z.strictObject({
  id: needIdSchema,
  // Le besoin dans les termes du client, jamais reformulé en vocabulaire moteur.
  statement: z.string().min(1),
  resolution: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("satisfied"),
      // Nœuds du document qui portent ce besoin — existence vérifiée par le
      // validateur sémantique, jamais supposée.
      nodeIds: z.array(z.string().min(1)).min(1),
    }),
    z.strictObject({
      kind: z.literal("unexpressible"),
      // Pourquoi le document ne peut pas porter ce besoin. Un motif vide est
      // refusé : « inexprimable » sans raison serait un abandon déguisé.
      reason: z.string().min(1),
    }),
  ]),
});

export const intentSchema = z.strictObject({
  // La demande TELLE QU'ELLE A ÉTÉ FORMULÉE. Elle n'est pas une source de
  // vérité pour le moteur — elle est la source de vérité pour le JUGE.
  request: z.string().min(1),
  requestLocale: localeSchema,
  needs: z.array(needSchema).min(1),
});

export const projectAirSchema = z.strictObject({
  airSchemaVersion: z.literal(AIR_SCHEMA_VERSION),
  projectId: projectIdSchema,
  app: appSchema,
  screens: z.array(screenSchema).min(1),
  navigation: navigationSchema,
  entities: z.array(entitySchema),
  relations: z.array(relationSchema),
  datasets: z.array(datasetSchema),
  actions: z.array(actionSchema),
  rules: z.array(ruleSchema),
  slots: z.array(slotSchema),
  capabilities: z.array(capabilityRequestSchema),
  permissions: z.array(permissionSchema),
  /**
   * CONTRÔLE D'ACCÈS (1.28.0) — OPTIONNEL AU SCHÉMA.
   *
   * Le rendre requis forcerait la migration à FABRIQUER des rôles pour les
   * documents du corpus gelé : inventer un modèle d'accès que personne n'a
   * décidé, exactement ce que les migrations de ce dépôt s'interdisent. Un
   * document sans `access` se comporte comme avant — tout est ouvert.
   */
  access: accessSchema.optional(),
  design: designSchema,
  integrations: z.array(integrationSchema),
  network: networkPolicySchema,
  native: nativeRequirementsSchema,
  compliance: complianceSchema,
  expectedTests: z.array(expectedTestSchema),
  // OPTIONNEL AU SCHÉMA, EXIGÉ PAR LA GATE. Le rendre requis forcerait la
  // migration à FABRIQUER une intention pour les 12 documents du corpus gelé —
  // exactement ce que D-044 s'est interdit. Le fail-closed vit dans la gate de
  // fidélité (PHASE 10B), pas dans le schéma : un document sans intention ne
  // peut pas être certifié, mais il reste lisible.
  intent: intentSchema.optional(),
});

export type ProjectAir = z.infer<typeof projectAirSchema>;
export type AirScreen = ProjectAir["screens"][number];
export type AirEntity = ProjectAir["entities"][number];
export type AirAction = ProjectAir["actions"][number];
