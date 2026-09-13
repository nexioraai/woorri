# AUDIT — CE QUE LES PLATEFORMES EXIGENT POUR PUBLIER

EP-138, 2026-09-12. Aucune dépense, aucun run, **aucun correctif** : cette
passe établit la liste, elle ne la comble pas.

Motif : sept passes de présentation ont posé des exigences. Avant de payer un
run pour les vérifier, la liste doit être complète — sinon on paie deux fois.
EP-137 avait lu les App Store Review Guidelines ; **Google Play n'avait jamais
été consulté.**

---

## Sources réellement lues

| Source | État |
|---|---|
| App Store Review Guidelines (developer.apple.com) | **lue** — 2.1, 2.5.1, 2.5.2, 3.1.1, 5.1.1(i)(ii)(iv)(v), 5.1.2 |
| Play — Suppression de compte (answer/13327111) | **lue** |
| Play — Politique de confidentialité (answer/9859455) | **lue** |
| Play — Data safety (answer/10787469) | **lue** |
| Play — Permissions (answer/12579724) | **lue** |
| Play — Developer Policy Center (play.google/developer-content-policy) | **lue** — HTML, pas JavaScript ; mais c'est un HUB : les exigences vivent dans les pages liées |
| Play — contact développeur | **lue par recherche**, pas en page unique : exigence de FICHE et de COMPTE, jamais d'app |
| Play — classification de contenu (answer/9898843) | **NON LUE dans cette passe** — référencée par le hub, non ouverte |
| Apple HIG · m3.material.io | **illisibles** (rendu JavaScript) — constaté en EP-130, inchangé |

Toute ligne ci-dessous cite sa source. Aucune n'est supposée.

---

## ① GOOGLE PLAY — jamais consulté jusqu'ici

**La découverte de cet audit : Play est PLUS STRICT qu'Apple sur la
suppression de compte.**

> « provide users with an in-app path to delete their app accounts and
> associated data; **and** provide a web link resource where users can
> request app account deletion »
> — *Play, answer/13327111*

Apple exige la suppression **dans l'app** (5.1.1(v)). Play exige **les deux** :
dans l'app ET un lien web. EP-137 a posé le genre `account_delete` — il couvre
la moitié de l'exigence Play.

Confidentialité :

> « You must link to a privacy policy on your app's store listing page **and
> within your app** » — pour les apps à permissions ou données sensibles ; et
> « regardless of your app's access to sensitive permissions or data » pour
> les apps destinées aux enfants.
> — *Play, answer/9859455*

Data safety :

> « All developers that have an app published on Google Play must complete the
> Data safety form » — *déclaré dans Play Console*, pas implémenté dans l'app.
> — *Play, answer/10787469*

Permissions :

> « You may only request permissions and APIs that access sensitive
> information that are necessary to implement current features or services in
> your app » et « Request permissions … in context (via incremental requests),
> so that users understand why »
> — *Play, answer/12579724*

---

## ② APPLE — ce qui manquait à EP-137

EP-137 avait cité 5.1.1(i), 1.5 et 5.1.1(v). Trois exigences **structurelles**
supplémentaires ont été trouvées, dont une majeure :

> **5.1.1(iv)** — « Apps may not require users to enter personal information
> to function, except when directly relevant to the core functionality of the
> app or required by law. … you must provide access without a login or via
> another mechanism. »

**C'est une exigence sur la FORME DU PARCOURS, et elle est mesurable sur un
document** : une application dont l'écran d'entrée exige de se connecter la
viole. Le moteur ne la juge pas.

> **5.1.1(ii)** — « Ensure your purpose strings clearly and completely
> describe your use of the data. »

> **3.1.1** — « If you want to unlock features or functionality within your
> app … you must use in-app purchase. »

> **2.1(a)** — « include demo account info (and turn on your back-end
> service!) if your app includes a login. »

> **2.5.2** — « Apps should be self-contained in their bundles … nor may they
> download, install, or execute code which introduces or changes features. »

---

## ③ LA CONFRONTATION — le livrable

### Colonne 1 — LE MOTEUR LE PRODUIT DÉJÀ

| Exigence | Source | Ce que le moteur fait |
|---|---|---|
| Surface de confidentialité dans l'app | Apple 5.1.1(i) · Play answer/9859455 | `purpose: "privacy_policy"` (EP-137), exigé par le juge |
| Moyen de contact dans l'app | Apple 1.5 | `purpose: "contact"` (EP-137) |
| Suppression de compte dans l'app | Apple 5.1.1(v) · Play answer/13327111 | `purpose: "account_delete"` (EP-137), conditionnel comme la guideline |
| Purpose strings des permissions | Apple 5.1.1(ii) | `emit-manifests` écrit les `NS*UsageDescription` depuis les raisons LOCALISÉES de l'AIR — et **refuse net** une permission induite sans raison déclarée |
| Permissions limitées au nécessaire | Play answer/12579724 | dérivées des capacités déclarées (`inducedPermissionsFor`) : nécessaires **par construction**, jamais listées à la main |
| IAP pour le contenu digital | Apple 3.1.1 | `commerceClass: digital ⇒ payments.iap` (EP-044), `commerceConstraint` au registre |
| Pas de code téléchargé/exécuté | Apple 2.5.2 | aucun chargement de code distant ; `network.policy: deny_by_default` + `allowedDomains` |
| OS courant, versions épinglées | Apple 2.5.1 | `native.minIosVersion` / `minAndroidSdk`, plancher du train de version |

### Colonne 2 — LACUNES : le moteur POURRAIT, et ne le fait pas

| Lacune | Source | Pourquoi c'est une lacune, pas une impossibilité |
|---|---|---|
| **L'app doit être utilisable SANS connexion** | Apple 5.1.1(iv) | **La plus importante.** C'est une propriété du PARCOURS, entièrement mesurable sur un modèle : si aucun chemin n'atteint le cœur de l'app sans `s_identifier`, l'app est refusable. Le moteur a tout pour le juger — il ne le fait pas. |
| **Lien web de suppression de compte** | Play answer/13327111 | Play exige l'in-app **et** un lien web. Le contrat porte déjà des URL (`logoUri`, `network.allowedDomains`) : un champ le porterait. |
| **Âge minimum / classification de contenu** | Play (hub → answer/9898843, non lue) · Apple 1.1.x | **Mesuré : aucun concept d'âge, de classification ni de public cible dans le moteur** (`ageRating`, `contentRating`, `minimumAge` : zéro occurrence). Un document décrit ce que fait l'app ; rien ne dit pour qui. |
| **Déclaration de chiffrement / export** | Apple (`ITSAppUsesNonExemptEncryption`) | **Mesuré : absent.** C'est une clé de manifeste — exactement ce que `emit-manifests` sait écrire. |
| **Traçage (ATT)** | Apple 5.1.2 (`NSUserTrackingUsageDescription`) | **Mesuré : absent.** Le registre porte `analytics` sans jamais poser la question du traçage. |
| Consentement au partage avec des tiers | Apple 5.1.2(i) | le contrat sait dire `dataCollected`, jamais « partagé avec qui » |

### Colonne 3 — CE QUE DERIBFY NE PROMETTRA JAMAIS

Aussi important que la colonne 2 : ce que le propriétaire de l'application
devra faire lui-même, et que le moteur ne doit pas prétendre couvrir.

| Hors portée | Source | Pourquoi |
|---|---|---|
| **Le TEXTE des politiques** (confidentialité, conditions) | Apple 5.1.1 · Play answer/9859455 | le moteur garantit la SURFACE et son accessibilité ; le contenu engage juridiquement le propriétaire. Déjà dit dans le prompt : « tu ne rédiges pas leur texte » |
| Formulaire **Data safety** | Play answer/10787469 | rempli dans Play Console. `compliance.dataCollected` en porte la MATIÈRE, mais la déclaration est un acte de console |
| **Questionnaire de classification** | Play answer/9898843 | console |
| Contact développeur de la FICHE et du COMPTE | Play (vérifié par recherche) | exigence de compte, pas d'app — distincte du contact dans l'app (Apple 1.5), qui, lui, est produit |
| Lien de politique sur la fiche du magasin | Play answer/9859455 | métadonnée de fiche |
| **Compte de démonstration pour la revue** | Apple 2.1(a) | le propriétaire fournit des identifiants réels et un back-end allumé |
| Comptes développeur, certificats, signatures | — | hors moteur |

---

## ④ CE QUI RELÈVE DU CODE, PAS DE L'ÉCRAN

Mesuré dans le dépôt, pas supposé :

| Sujet | État |
|---|---|
| Permissions déclarées au manifeste | **PRODUIT** — dérivées des capacités, avec refus si la raison manque |
| Textes de permission par locale | **PRODUIT** — `permissions[].reason` localisé |
| Versions minimales d'OS | **PRODUIT** — `native` + plancher du train |
| Politique réseau | **PRODUIT** — `deny_by_default` + domaines autorisés |
| Chiffrement / export | **ABSENT** — aucune occurrence |
| Traçage / ATT | **ABSENT** — aucune occurrence |
| Âge / classification | **ABSENT** — aucune occurrence |

---

## Ce que cet audit change pour la suite

1. **Une exigence structurelle majeure est découverte** : l'accès sans
   connexion (Apple 5.1.1(iv)). Elle est jugeable sur le MODÈLE, pas sur la
   présentation — et aucune des sept passes ne l'a vue.
2. **Play est plus strict qu'Apple** sur la suppression de compte : l'exigence
   posée en EP-137 est à moitié satisfaite.
3. **Trois sujets de manifeste sont absents** (chiffrement, traçage, âge) alors
   que le moteur écrit déjà des manifestes — ce sont des lacunes, pas des
   impossibilités.
4. **La colonne 3 est stable** : le texte des politiques, les déclarations de
   console et les comptes développeur ne relèveront jamais du moteur. Cela doit
   être DIT à l'utilisateur de Deribfy, pas découvert au moment du refus.

Aucune de ces lignes n'est traitée ici. Chacune est une passe, sur GO.
