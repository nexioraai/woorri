# Plan — décision 3 : le type d'application (personnelle, outil interne, vitrine)

- **Date :** 2026-11-16.
- **Statut :** PLAN **VALIDÉ** le 2026-11-16, avec les deux décisions du §7. **Rien ne commence** avant que le lot `feat/chemin-visible` soit éprouvé en production et que le propriétaire ait rendu son verdict.
- **Code lu :** `main` @ `662bfea8`.
- **Origine :** décision 3 du propriétaire. Le générateur transforme toute demande en site vitrine : un accueil public, un espace de gestion séparé et une déconnexion, même pour un carnet de dépenses personnel. « Il impose un moule. »

---

## 1. Où et comment le type est décidé

**À la lecture de la demande (`lire-brief`), par le même mécanisme qu'`ARGENT_DANS_APP`, qui existe et fonctionne déjà :**

| Étape | Aujourd'hui pour l'argent | Demain pour le type |
|---|---|---|
| la consigne de lecture demande une clé | `ARGENT_DANS_APP : "aucun" \| "paiements" \| "produits"`, avec la règle « ce que l'application fait, tu le COMPRENDS » (`consigne-lire-brief.ts:25-49`) | `TYPE_APPLICATION : "personnelle" \| "interne" \| "vitrine"`, avec la même règle et des exemples (« suivre mes dépenses » → personnelle ; « gérer les stocks de mon équipe » → interne ; « présenter mon restaurant et prendre des réservations » → vitrine) |
| la clé est filtrée contre un registre à choix fermés | `QUESTIONS_DE_CONFIGURATION.ARGENT_DANS_APP` (`benchmarks/air-emission/elicitation.mjs:220-234`), filtrée dans `lire-brief/route.ts:172-178` | une entrée `TYPE_APPLICATION`, structure `type_application`, trois choix |
| elle devient configuration | `deduites` → `/avant` → `configuration.encaissement` | `configuration.type_application` |
| la route la reçoit | `route.ts:434-438` (toute clé texte, bornée) | inchangé |
| elle agit sur la génération | `precisionsStructurelles` (`avant-de-depenser.ts:172`) | **elle choisit la branche de la consigne** (§2) |

**Ce qui n'est pas mesuré :** la fiabilité de la lecture du type. Pour l'argent, elle a été corrigée après un défaut réel (2026-11-03). Pour le type, aucun essai n'existe. À éprouver sur un petit corpus de demandes réelles, sans générer, avec une lecture `flash` à environ 0,001 $ chacune, avant de brancher (§5, étape 2).

## 2. Ce qui change dans la consigne, par type

Tout se passe dans le **bloc base** (`entites-declarees.ts:362`, `blocBase`), qui ne s'applique qu'aux œuvres à tables. **Sans table, rien ne change** : il n'y a ni connexion ni gestion à organiser.

| | **personnelle** | **interne** | **vitrine** |
|---|---|---|---|
| Ce qu'on voit sans compte | l'écran de connexion, rien d'autre | l'écran de connexion, rien d'autre | la face publique, en lecture seule |
| Après connexion | **tout**, dans une seule navigation : liste, ajout, modification, retrait, totaux | tout ; les rôles lus (`lectureBrief.roles`) peuvent restreindre des écrans | l'espace de gestion à `#gestion` |
| Espace de gestion séparé, `#gestion` | **non** | **non** | oui, avec le chemin visible (décision 2) |
| `lecturePublique` | **jamais** : les données sont privées | jamais | selon la face publique, comme aujourd'hui |
| En aperçu (sans base) | tout, directement, sans connexion | tout, directement | comme aujourd'hui |

- Les clauses « DEUX FACES » (`entites-declarees.ts:384-433`) ne s'appliquent plus qu'à la vitrine. Les deux autres types reçoivent un bloc court, « UNE SEULE FACE, DERRIÈRE LA CONNEXION ». La consigne raccourcit pour eux au lieu de s'allonger, ce qui aide les plafonds d'EP-319 et EP-360.
- **Les juges n'ont pas besoin de changer.**
  - Le juge des faces (J1) monte l'œuvre sans session, avec une base simulée. Une œuvre personnelle n'y montre que la connexion et n'interroge aucune table : zéro défaut, et c'est juste.
  - Le juge d'exécution tourne sans base (`url: ''`, D1). L'œuvre y montre tous ses écrans directement : il les parcourt en cliquant.
  - **À vérifier à l'écriture,** sur la sortie réelle des juges : aucun reproche « déclare-la publique » ne doit partir sur une œuvre personnelle.
- **Le point 7, la confidentialité, se règle de lui-même pour les types personnelle et interne :** plus aucune lecture publique imposée. Il reste ouvert pour la vitrine seulement.

**Les comptes :** une œuvre a aujourd'hui un compte pour son propriétaire, créé par Deribfy et montré dans le tableau de bord (`IdentifiantsOeuvre.tsx`). Une application personnelle n'en demande pas plus. Un **outil interne à plusieurs comptes** demande de créer des comptes pour l'équipe : ce n'est **pas** dans ce plan. Proposé : la première version d'« interne » se contente du compte du propriétaire, comme « personnelle », et les comptes d'équipe deviennent un chantier à part. **À trancher par le propriétaire.**

## 3. Si le type est mal deviné

- **Le type est annoncé avant de payer, et se corrige d'un clic.** L'écran montre déjà, avant la génération, ce que Deribfy a compris (`precisionsStructurelles`). Il dirait par exemple : « Application **personnelle** : vous seul, après connexion. [Changer] ». Les trois choix sont fermés, comme pour l'argent.
- **Après la génération, le corriger veut dire régénérer :** la structure de l'application change. « Régénérer » est fermé ; la correction doit donc se faire **avant**. C'est pourquoi l'annonce avant de payer n'est pas un confort.
- **Si la lecture ne trouve pas de type** (clé omise), deux choix :
  - (a) garder le comportement d'aujourd'hui, la vitrine, et l'annoncer ;
  - (b) **(recommandé)** proposer « personnelle » quand aucun visiteur ni client n'est nommé dans la demande, et l'annoncer.
  
  **À trancher.**

## 4. Les œuvres déjà générées

**Rien ne change pour elles.** Aucune migration, aucune réécriture. Leur code est déjà produit ; la consigne n'agit qu'à la prochaine génération. Une œuvre sans `type_application` dans sa configuration est une vitrine, ce qu'elle est de fait.

## 5. Ordre d'exécution, après validation

1. Le registre et la consigne de lecture (`elicitation.mjs`, `consigne-lire-brief.ts`). Un commit, avec un test sur des demandes types.
2. **Mesure de la lecture, avant tout branchement :** 10 à 20 demandes réelles du dépôt (corpus `asso`, carnet, Conterak, pharmacie, etc.). On lit le type rendu, sans générer. Coût : moins de 0,05 $. Les résultats te sont montrés avant de continuer.
3. Les trois branches du bloc base (`entites-declarees.ts`), les cliquets EP-370, EP-319 et EP-360 adaptés. Un commit.
4. L'annonce et la correction avant de payer (`avant-de-depenser.ts`, écran de conversation). Un commit.
5. `npm run verifier`, puis push et déploiement **sur ton accord**.
6. **Preuve en production, selon la règle de preuve :** le carnet de dépenses généré **depuis l'interface**.
   - **Attendu :** pas d'accueil public, pas d'espace de gestion séparé. On se connecte, puis tout est là.
   - **Coût estimé :** de 0,10 à 0,20 $.
   - **Le verdict est le tien.**

## 6. Hors du périmètre

- La couverture et ses 19 familles (piste `lectureBrief.ecrans`).
- Les comptes d'équipe d'un outil interne (§2).
- « Régénérer ».
- Les chantiers à part : purge, `journal.ts`, `ai_usage_log`, 16 $, abandon d'écran. Le point 7 n'est réglé que pour les deux nouveaux types.

## 7. Décisions du propriétaire (2026-11-16)

1. **Type non devinable : « personnelle » par défaut, pas « vitrine ».** Raison du propriétaire : une vitrine expose des données au public. Dans le doute, le choix sûr est celui qui n'expose rien. Un utilisateur qui voulait une vitrine le dira et la changera en un clic ; un utilisateur dont les données privées se retrouvent publiques par défaut, c'est un incident.
2. **Outil interne :** une première version avec le seul compte du propriétaire. Les comptes d'équipe (invitations, rôles, permissions) deviennent un chantier à part, qui ne doit pas retarder le reste.

## 8. Lien consigné : la décision 3 rend « Régénérer » nécessaire

Un type mal deviné et repéré **après** la génération ne se corrige qu'en régénérant (§3) : la structure de l'application change. L'annonce avant de payer réduit le cas sans le supprimer. **La décision 3 rend donc la réouverture de « Régénérer » nécessaire, pas seulement souhaitable.** Aujourd'hui, cette réouverture est prévue après les manques 1 à 3 (`PLAN_MANQUE4.md`) ; ce lien doit peser dans leur ordre.

