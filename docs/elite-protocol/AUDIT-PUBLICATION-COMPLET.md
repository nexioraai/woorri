# AUDIT COMPLET — CE QUE LES DEUX PLATEFORMES EXIGENT

EP-146, 2026-09-13. Aucune dépense, aucun run, **aucun correctif**.

Remplace et complète `AUDIT-EXIGENCES-PUBLICATION.md` (EP-138), qui n'avait lu
du côté Google qu'un HUB — les exigences vivent dans les pages liées.

---

## ① Les pages, une par une

### Lues intégralement

| Page | Ce qu'elle apporte |
|---|---|
| App Store Review Guidelines | 1.5, 2.1, 2.5.1, 2.5.2, 3.1.1, 5.1.1 (i,ii,iv,v), 5.1.2 — déjà en EP-138 |
| Play — Suppression de compte (13327111) | in-app **et** lien web |
| Play — Confidentialité (9859455) | politique dans l'app **et** sur la fiche |
| Play — Data safety (10787469) | formulaire console, obligatoire pour toute app |
| Play — Permissions (12579724) | nécessité + demande contextuelle |
| **Play — User Data (10144311)** | **NOUVEAU — divulgation proéminente, consentement affirmatif, HTTPS** |
| **Play — Classification (9898843)** | **NOUVEAU — questionnaire obligatoire, retrait sans lui ; aucune exigence in-app** |
| **Play — Families (9893335)** | **NOUVEAU — audience déclarée en console ; exigences in-app CONDITIONNELLES** |
| **Play — Device and Network Abuse (9888379)** | **NOUVEAU — pas de code exécutable téléchargé, pas d'auto-modification** |
| **Play — Target API level (11926878)** | **NOUVEAU — API 36 depuis le 31 août 2026** |
| **Expo — Apple privacy manifests** | **NOUVEAU — canal réellement emprunté pour `PrivacyInfo.xcprivacy`** |
| Expo — app config | `usesNonExemptEncryption`, `infoPlist`, permissions Android |
| Expo — changelog SDK | « React Native for Android now targets Android 16 / API 36 » |

### Illisibles — rendu JavaScript, DIT et non supposé

| Page | Canal de remplacement |
|---|---|
| Apple — Adding a privacy manifest | **documentation Expo** (`ios.privacyManifests`) |
| Apple — `ITSAppUsesNonExemptEncryption` | documentation Expo (EP-144) |
| Apple HIG · m3.material.io | doc Material sur developer.android.com (EP-130) |

**Quatre pages Apple sur quatre ont été illisibles.** Le canal Expo est le
seul praticable, et il est légitime : c'est celui que le moteur emprunte
réellement, puisqu'il émet un `app.json`.

### Non ouvertes — dit franchement

Play Monetization · Play Ads · App Store Connect (exigences de fiche) ·
la liste énumérée des *required reason APIs* d'Apple, qu'Expo ne reproduit pas.

---

## ② Ce qui S'AJOUTE à l'audit EP-138

### A. Privacy manifests Apple — LACUNE, et la plus sérieuse

Obligatoires depuis 2024, **totalement absents d'EP-138**. Expo :

> « native code that calls into certain APIs that Apple considers sensitive »
> — dont « accessing UserDefaults, file timestamp, system boot time, disk
> space, and active keyboard »

Configuration : `expo.ios.privacyManifests` → `NSPrivacyAccessedAPITypes`.

**Le moteur n'en produit aucun.** Or l'application générée embarque du
stockage local (donc `UserDefaults`) par `offline_storage` et par les
bibliothèques du train. Une application sans manifeste de confidentialité,
ou dont le manifeste ne couvre pas les API utilisées, est refusée au dépôt.

### B. Divulgation proéminente — LACUNE, et elle CONTREDIT une décision posée

> « an in-app disclosure of your data access, collection, use, and sharing »
> qui « **must be displayed in the normal usage of the app and not require the
> user to navigate into a menu or settings** » ; le consentement exige « affirmative
> user action » ; et elle « **cannot only be placed in a privacy policy or terms
> of service** ».
> — *Play, User Data (10144311)*

EP-145 a posé `privacy_consent` comme une surface de l'espace compte, et
EP-137 range ces surfaces **dans le compte, jamais dans la barre**. Google
exige exactement l'inverse pour celle-ci : elle doit apparaître **dans l'usage
normal**, pas derrière un menu. **La place du consentement est à reprendre.**

### C. Target API level — PRODUIT DE FAIT, NON GARDÉ

API 36 exigé depuis le 31 août 2026 — donc **en vigueur aujourd'hui**. Mesuré :
le moteur pose `minSdkVersion` et **jamais** `targetSdkVersion` ; le target
vient du train Expo, qui cible Android 16/API 36. L'exigence est donc
satisfaite **par le train**, pas par une décision du moteur, et **aucun
cliquet ne garantit qu'elle le reste**. Même forme que `network.policy`
(EP-141) : appliqué de fait, jamais parce que quelque chose le demande.

### D. Auto-modification et code téléchargé — NON VÉRIFIÉ

> « may not modify, replace, or update itself using any method other than
> Google Play's update mechanism » · « may not download executable code (such
> as dex, JAR, .so files) » — *Play, Device and Network Abuse*

Apple 2.5.2 dit la même chose. **Le moteur embarque `expo-updates` dans chaque
application générée.** Les deux politiques visent le code exécutable natif, et
le JavaScript interprété fait l'objet d'exceptions que **je n'ai pas lues**.
**NON VÉRIFIÉ — ni satisfait, ni violé : inconnu.**

### E. Familles — NON VÉRIFIABLE par construction

Les exigences in-app (écran d'âge neutre, rappel de sécurité, interdiction de
transmettre AAID/IMEI) ne s'appliquent **que** si l'application cible les
enfants. Le moteur n'a **aucune notion d'audience** (mesuré en EP-144 : zéro
occurrence d'âge). Il ne peut donc ni savoir si ces règles s'appliquent, ni
les honorer. À déclarer au propriétaire.

---

## ③ Ce qui SE CORRIGE dans l'audit EP-138

| Ligne d'EP-138 | Correction |
|---|---|
| « politique réseau : produite » | **faux** — appliquée de fait par `allowedDomains` ; corrigé en EP-141/142 |
| « classification : console » | confirmé, **et vérifié à la source** : aucune exigence in-app |
| liste des lacunes : 6 | **portée à 9** — privacy manifests, divulgation proéminente, target API |
| « colonne 3 : 7 obligations » | inchangée dans son principe, livrée depuis EP-143 |

---

## ④ LA LISTE FINALE

### Produit et gardé par un cliquet

Surfaces de confidentialité, contact, suppression (EP-137/142) · purpose
strings depuis les raisons localisées, avec refus si absente · permissions
limitées au nécessaire, dérivées des capacités · IAP pour le digital ·
déclaration d'export dérivée (EP-144) · absence de clé de traçage (EP-144) ·
accès sans connexion (EP-139/140) · divulgation des tiers et consentement
(EP-145) · obligations du propriétaire livrées (EP-143).

### Produit de fait, NON gardé

Target API 36 (par le train Expo) · HTTPS et cryptographie moderne (par
`allowedDomains` et le schéma d'URL).

### LACUNES — le moteur pourrait, et ne le fait pas

1. **Privacy manifests** (`PrivacyInfo.xcprivacy`) — aucun n'est produit.
2. **Divulgation proéminente** — la surface existe, sa PLACE est fausse.
3. **Target API** — satisfait sans être commandé ni vérifié.

### Relève du propriétaire — déjà livré dans `PUBLICATION.md`

Texte des politiques · adresse web de suppression · coordonnées de compte ·
formulaire Data safety · questionnaire de classification · **déclaration
d'audience (Families)** · compte de démonstration · comptes et certificats.

### NON VÉRIFIÉ — jamais supposé satisfait

`expo-updates` face aux clauses d'auto-modification · la liste énumérée des
*required reason APIs* · les exigences de fiche App Store Connect · Play
Monetization et Ads.

---

## Ce que cet audit change pour le run

Trois lacunes à combler, **en une seule passe** comme demandé. La deuxième —
la place de la divulgation — n'est pas un ajout mais une **correction** d'une
décision déjà prise et déjà testée : c'est celle qui coûtera le plus.

Aucune de ces lignes n'est traitée ici.
