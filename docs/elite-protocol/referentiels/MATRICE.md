# MATRICE DE COUVERTURE — le moteur face aux référentiels externes

> **Ce document ne sert à rien s'il mentit une seule fois.** Chaque ligne
> « couvert » porte une PREUVE : un test nommé, une ligne de portail, une clé
> du format, ou une mesure datée. Jamais un `grep` — mesuré le 2026-10-12, le
> mot « Inv**aria**nts » a fait passer le registre pour accessible.
>
> Les lignes « non mesuré » sont honnêtes et attendues : une matrice qui
> prétend tout savoir dès le premier jour ne se lit plus.

## Pourquoi six sources et pas une

Une seule autorité est un seul point de vue. Mesuré le 2026-10-12 : les trois
sources de sécurité désignent le même endroit, deux sources indépendantes
désignent l'accessibilité, et **aucune** ne mentionne le PDF ni les
graphiques — que seul un cahier des charges réel a révélés.

Les référentiels couvrent ce que **tout le monde** exige. Les cahiers couvrent
ce que **ce marché** exige. Il faut les deux ; ce document ne porte que les
premiers.

| Source | Version | Taille | Nature |
|---|---|---|---|
| OWASP ASVS | 5.0 (mai 2025) | 17 chapitres, ~350 exigences | sécurité web/API |
| OWASP MASVS | 2.1.0 | 8 catégories, 24 contrôles | sécurité mobile |
| Apple / Google Play | 2026 | 5 portes de conformité | obligation de mise en marché |
| EN 301 549 | 2 sept. 2026 | WCAG 2.2 niveau AA | obligation légale UE (EAA) |
| WebCoderBench | janv. 2026 | 9 perspectives, 24 métriques | qualité des apps générées |
| Gartner LCAP | 2026 | 6 capacités | plateforme |
| Supabase / Firebase | 2026 | socle technique | capacités de plateforme |

## Légende

- 🟢 **couvert** — une preuve nommée, vérifiable aujourd'hui
- 🟡 **partiel** — une partie seulement, et on dit laquelle
- 🔴 **absent** — mesuré absent
- ⚪ **non mesuré** — pas encore regardé ; ne pas lire comme « absent »

---

## 1. OWASP ASVS 5.0 — par chapitre

| # | Chapitre | État | Preuve / manque |
|---|---|---|---|
| V1 | Encoding and Sanitization | 🟢 | Mesuré sur **1 831 fichiers / 198 866 lignes émises** : **0** `dangerouslySetInnerHTML`, **0** `eval`, **0** `new Function`. Aucun chemin d'injection HTML brute. Mesure l'ABSENCE des constructions dangereuses, pas l'encodage de chaque sortie |
| V2 | Validation and Business Logic | 🟢 | 160 règles de validation émises et appliquées ; portail vivant, refus 422 nommant la règle, 3 configurations |
| V3 | Web Frontend Security | 🟡 | **Aucun fichier HTML n'est émis** (vérifié : l'entrée est `App.tsx`). La CSP appartient donc à la coquille hôte, pas au code généré — et elle n'y est pas mesurée |
| V4 | API and Web Service | 🟡 | contrat `/air/v1/entities/<id>/rows` émis et démarré ; en-têtes de sécurité non mesurés |
| V5 | File Handling | 🟢 | Le serveur refuse une référence `asset` hors de `network.allowedDomains`. **29 documents sur 31 contrôlés, sur LES DEUX piles** (mesuré). Chemin relatif accepté, URL illisible refusée. Trois cliquets. L'empreinte de fichier reste hors de portée : le fichier ne passe pas par le serveur |
| V6 | Authentication | 🟡 | **DÉLÉGUÉ PAR CONCEPTION, pas bloqué** — j'avais écrit « bloqué », c'était faux. Mesuré : **24 documents sur 31** désignent un serveur d'authentification TIERS, 3 Supabase, 4 aucun. Notre serveur n'a donc jamais eu à posséder les comptes ; il doit VÉRIFIER le jeton, ce qu'il fait (V9). Reste non couvert : les 3 documents Supabase et la création de compte |
| V7 | Session Management | 🟡 | même raison que V6 : la session est tenue par le fournisseur déclaré ; le serveur lit un jeton vérifié à chaque requête |
| V8 | Authorization | 🟢 | filtres de visibilité en SQL depuis les règles du document ; fermé par défaut ; portail vivant — ligne écrite, invisible |
| V9 | Self-contained Tokens | 🟢 | `src/appelant.ts` — HS256, algorithme imposé, `exp` exigé, comparaison à temps constant ; jeton mal signé refusé (prouvé) |
| V10 | OAuth and OIDC | 🔴 | aucun |
| V11 | Cryptography | 🟡 | HMAC pour les jetons ; aucun chiffrement au repos exprimable |
| V12 | Secure Communication | 🟢 | TLS par défaut dès que l'hôte n'est pas local, certificat vérifié ; test l'interdit de régresser |
| V13 | Configuration | 🟡 | aucun secret dans les fichiers émis (test) ; durcissement non mesuré |
| V14+ | Data Protection · Malicious Code · Business Logic · WebRTC | ⚪ | non mesuré |

## 2. OWASP MASVS 2.1 — par catégorie

| Catégorie | État | Preuve / manque |
|---|---|---|
| MASVS-STORAGE | 🟡 | champs `sensitive` jamais conservés ni rendus (test) ; chiffrement du stockage non exprimable |
| MASVS-CRYPTO | 🟡 | voir ASVS V11 |
| MASVS-AUTH | 🟡 | voir ASVS V6/V7 — délégué au fournisseur déclaré |
| MASVS-NETWORK | 🟢 | voir ASVS V12 |
| MASVS-PLATFORM | 🟢 | Mesuré sur les **31 manifestes émis** : **78 permissions déclarées**, **0 sans être induite** par une capacité du registre, **0 sans raison rédigée** pour l'utilisateur. Une permission de trop est un défaut — il n'y en a aucune. Le manifeste calcule lui-même `declared` et `induced` côte à côte, avec `requiredByCapability` |
| MASVS-CODE | 🟡 | **Hors de portée du générateur** : vérifié, **aucun `package.json` n'est émis** — le projet est une app Expo dont les dépendances viennent du gabarit hôte. L'épinglage des versions ne se décide donc pas ici. Non mesuré sur le gabarit |
| MASVS-RESILIENCE | ⚪ | non mesuré |
| MASVS-PRIVACY | 🟡 | `dataCollected` déclaré au format ; cliquets de partage tiers existants |

## 3. Obligations de mise en marché — 2026

| Obligation | État | Preuve / manque |
|---|---|---|
| Suppression de compte **dans** l'app (Apple 5.1.1(v), Play) | 🟡 | `compliance.accountDeletionRequired` au format ; l'émission du parcours n'est pas mesurée |
| Déclaration Data Safety | 🟡 | `compliance.dataCollected` au format |
| API cible Android 36 | 🟡 | le format déclare le MINIMUM (`minAndroidSdk`), pas la cible |
| Consentement IA (Apple 5.1.2(i)) | 🟡 | Mesuré : **aucun des 31 documents n'intègre d'IA** — l'obligation ne s'applique donc à aucun aujourd'hui. NON VÉRIFIÉ pour le jour où un document en intégrera une : rien ne garantit que le consentement serait émis |
| Manifeste de confidentialité iOS | 🟡 | Mesuré : **0 fichier `PrivacyInfo.xcprivacy` émis**, mais **31 documents sur 31** portent la déclaration d'API sensibles (`NSPrivacyAccessedAPI`). La donnée existe donc ; le fichier est produit par l'outil de construction, pas par l'émetteur — **non mesuré à cet endroit-là** |

## 4. EN 301 549 → WCAG 2.2 AA — **obligation légale UE**

> **CORRECTION DU 2026-10-12.** J'avais écrit « absent — 0 clé au format ».
> C'était faux de la manière qui compte : ça laissait croire que les apps
> générées sont inaccessibles. Mesuré ensuite dans le runtime embarqué :
> **118 `accessibilityLabel`** et **26 `accessibilityRole`**, dont **46
> libellés venus du DOCUMENT** (`f.label`, `title`, `search.placeholder`) et
> **zéro en dur**. L'accessibilité n'est pas au format parce qu'elle n'a pas
> à y être : le nom accessible EST le libellé que le document déclare déjà.

| Exigence | État | Preuve / manque |
|---|---|---|
| Noms accessibles des composants | 🟢 | 118 `accessibilityLabel` au runtime, 46 alimentés par le document, 0 en dur |
| Rôles accessibles | 🟢 | 26 `accessibilityRole` au runtime |
| Texte de remplacement des images (WCAG 1.1.1, niveau A) | 🟡 | Mesuré : **chaque `<Image>` du runtime porte un `accessibilityLabel`** — alimenté par le TITRE de l'élément dans un cas, par une propriété que l'appelant fournit dans l'autre. Jamais une chaîne en dur. NON VÉRIFIÉ : que tous les appelants la fournissent effectivement. 29 documents sur 31 portent des champs `asset` |
| **Contraste 4.5:1** (WCAG 1.4.3, AA) | 🟢 | Calculé sur les jetons émis des **31 documents** : **186 paires, 0 sous 4,5:1**. Paires évaluées : texte/fond, texte/surface, atténué/fond, atténué/surface, surPrimaire/primaire, erreur/fond. Ne couvre pas toutes les combinaisons possibles — seulement celles que les composants utilisent |
| **Cibles de pointeur ≥ 24 px** (WCAG 2.5.8, AA) | 🟢 | Mesuré sur les **31 documents** : `tapTarget` = **48 px** minimum, `controlHeight` = **54 px** — le double de l'exigence. Les 24 usages de `minHeight` passent tous par ces jetons, aucun nombre en dur |
| Focus visible (WCAG 2.4.11) | ⚪ | 4 occurrences liées au focus dans le runtime ; ni comptées suffisantes ni insuffisantes — non mesuré |
| Langue déclarée (WCAG 3.1.1, niveau A) | 🟡 | La langue **est** déclarée au document (`defaultAppLocale`, `userLanguage`, `rtlSupported`). Aucun fichier HTML n'étant émis, la balise `lang` dépend de la coquille hôte — non mesurée là |

## 5. WebCoderBench — 9 perspectives

| Perspective | État | Preuve / manque |
|---|---|---|
| Code Quality | 🟢 | lint + typecheck bloquants sur les apps émises (portails `app_compile`, `app_web`) |
| Visual Quality | ⚪ | non mesuré |
| Content Quality | ⚪ | non mesuré |
| Performance Quality | ⚪ | non mesuré |
| **Accessibility** | 🟡 | noms et rôles couverts (§4) ; contraste, cibles et focus non mesurés |
| Maintainability | 🟢 | Taux de commentaire mesuré sur les fichiers émis : **34 %** |
| Functional / Visual / Content Alignment | ⚪ | non mesuré |

## 6. Socle technique — Supabase / Firebase 2026

| Capacité | État | Preuve / manque |
|---|---|---|
| Base relationnelle | 🟢 | schéma SQL émis, appliqué au démarrage ; SQLite et Postgres réels prouvés |
| Stockage de fichiers | 🟡 | capacité `media_upload` au registre ; transformations non exprimables |
| **Temps réel** | 🔴 | **0 clé** au format |
| Fonctions serveur | 🟢 | deux piles émises et DÉMARRÉES (48/48 preuves) |
| **Recherche sémantique / vecteurs** | 🔴 | **0 clé** |
| Hors-ligne | 🟡 | capacité `offline_storage` au registre ; comportement non mesuré |

---

## Ce qui est BLOQUÉ par une décision du propriétaire

Vérifié le 2026-10-12, dépendance par dépendance — ces lignes ne peuvent pas
avancer sans qu'une convention soit ARBITRÉE, et l'inventer serait refaire
l'erreur du vocabulaire d'authentification.

| Ligne | Décision attendue |
|---|---|
| ASVS V6 (création de compte) | seulement pour les 3 documents Supabase : où déclarer le champ qui porte le rôle ? Mesuré : 3 documents sur 31 ont un champ qui y ressemble — aucune convention à reprendre |
| ASVS V10 (OAuth/OIDC) | aucun document ne le demande aujourd'hui |
| Temps réel | **AUCUN des 31 documents ne le demande** — ni Tontine, ni Conterak. La ligne vient d'une liste de fournisseur, pas d'un besoin démontré. Rien à faire aujourd'hui |
| Recherche sémantique | même constat : aucun besoin démontré |

## Ce qui peut avancer SANS décision

| Ligne | Action exacte |
|---|---|
| 16 lignes « non mesuré » | les mesurer une par une |
| 16 lignes « non mesuré » | les mesurer ; l'accessibilité a montré qu'une ligne non mesurée peut être déjà couverte |

## Progression

Le compte est RECALCULÉ depuis le tableau, jamais écrit à la main : j'ai
annoncé 9/12/9/16 au premier jet alors que le document disait 8/11/9/15.
Un chiffre tapé à la main se désaccorde du document qu'il résume.

| Date | Couvert | Partiel | Absent | Non mesuré | Lignes |
|---|---|---|---|---|---|
| 2026-10-12 · matrice créée | 8 | 11 | 9 | 15 | 43 |
| 2026-10-12 · accessibilité mesurée | 10 | 12 | 7 | 16 | 45 |
| 2026-10-12 · dépendances vérifiées | 10 | 12 | 7 | 16 | 45 |
| 2026-10-12 · ASVS V5 (Node) | 10 | 13 | 6 | 16 | 45 |
| 2026-10-12 · V5 parité Java + V6/V7 reclassés | 11 | 15 | 3 | 16 | 45 |
| 2026-10-12 · 4 lignes mesurées (V1, V3, langue, maintenabilité) | 13 | 17 | 3 | 12 | 45 |
| 2026-10-12 · contraste WCAG mesuré | 14 | 17 | 3 | 12 | 46 |
| 2026-10-12 · cibles de pointeur mesurées | 15 | 17 | 3 | 12 | 47 |
| 2026-10-12 · plateforme mesurée | 15 | 18 | 3 | 11 | 47 |
| 2026-10-12 · MASVS-CODE situé | 15 | 19 | 3 | 10 | 47 |
| 2026-10-12 · MASVS-PLATFORM fermé | 16 | 18 | 3 | 10 | 47 |
| 2026-10-12 · texte alternatif mesuré | 16 | 19 | 3 | 9 | 47 |
| 2026-10-12 · confidentialité iOS + consentement IA | 16 | 21 | 3 | 7 | 47 |
