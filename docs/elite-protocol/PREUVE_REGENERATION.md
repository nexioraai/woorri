# Preuve — une régénération qui échoue efface-t-elle l'œuvre ?

- **Date :** 2026-11-15.
- **Code éprouvé :** `origin/main` @ `27e83891` (production).
- **Copie employée :** une copie détachée hors dépôt, dans le scratchpad de session. **Aucun fichier applicatif modifié.**
- **Pièces brutes :** `docs/elite-protocol/evidence/preuve-regeneration/` :
  - le test, archivé en `.txt` pour qu'aucun lanceur ne le ramasse ;
  - `releves.json` : tous les relevés, champ par champ ;
  - `sortie-vitest.txt` ;
  - `commit-essaye.txt`.
- **Chemins.** Ils sont relatifs à `apps/web/src/`.
  - `D` = `app/api/generateur/direct/route.ts`
  - `A` = `app/api/generateur/direct/[id]/route.ts`
  - `P` = `app/dashboard/page.tsx`
- **Étiquettes :**
  - **[LU]** lu dans le code ;
  - **[OBSERVÉ-SIMULATION]** observé à l'exécution des vraies poignées contre une base en mémoire ;
  - **UNKNOWN** non observé.

> **Niveau de preuve atteint : simulation** (voir D-018).
> - L'essai exécute le vrai code de `main`, mais contre une base **en mémoire**. Il prouve ce que fait le code.
> - Il ne prouve **pas** ce que fait la base de production, dont le schéma réel n'a pas été lu (§6).

---

## 1. Marche à suivre

### 1.1 Ce qui tourne réellement

Quatre poignées de `main`, appelées comme le ferait l'écran :
- `POST /api/generateur/direct` (`D:290`) ;
- `GET /api/generateur/direct/[id]` (`A:38`) : l'aperçu ;
- `GET /api/generateur/mes-applications` : les cartes du tableau de bord ;
- `GET /api/generateur/version` : l'historique.

L'adaptateur fournisseur réel `appelerFournisseur` tourne aussi, dans sa branche DeepSeek (`lib/apps/fournisseur.ts:238-263`). Les juges et l'assembleur réels tournent également.

### 1.2 Ce qui est remplacé (trois bords seulement)

1. **L'authentification :** un utilisateur fixe `u-1`.
2. **Supabase :** une base **en mémoire à état**. Les écritures d'une poignée sont relues par la suivante. Elle couvre `select`, `insert`, `update` et `delete`, avec les filtres `eq`, `neq` et `in`.
   - Elle n'applique **aucune contrainte** : clé étrangère, déclencheur, droit par colonne.
   - C'est fidèle au DDL **versionné** (§6), pas forcément à la production.
3. **Le réseau vers DeepSeek :** un `fetch` global qui rend une réponse au format `/chat/completions`. Tout autre hôte fait échouer l'essai.

Aucun appel payant. Aucune écriture en base réelle.

### 1.3 Déroulé de chaque scénario

1. Créer une œuvre neuve par la vraie route. Le faux modèle rend un code qui s'assemble, et l'œuvre est livrée.
2. Faire le relevé **AVANT**.
3. Régénérer : `POST ?id=<id>` avec `{ demande: '' }`, exactement ce qu'envoie l'écran (`P:205-209`).
4. Faire le relevé **APRÈS**.
5. Calculer le message d'écran en appliquant au corps rendu l'expression exacte de `P:210-213`.

### 1.4 Les trois scénarios, et pourquoi ils sont représentatifs

**A — Non-convergence.** Le modèle rend trois fois un code qui ne s'assemble pas (`{` non fermé).
- C'est la forme d'échec réellement mesurée en production : « Expected } but found EOF » (`lib/apps/fournisseur.ts:32-40`).
- Et « Non convergé en 3 tours » au premier tir direct (`D:779-783`).
- Le code suit le chemin `resultat.ok === false` (`D:739`, `D:749-776`, `D:881-894`).

**B — Erreur du fournisseur.** DeepSeek répond HTTP 503.
- C'est la forme d'une panne fournisseur réelle : un HTTP 400 « credit balance is too low » a été mesuré chez Anthropic le 2026-10-18 (`lib/apps/fournisseur.ts:4-12`).
- `appelerFournisseur` lève l'erreur (`fournisseur.ts:252`), et le code suit le chemin `catch` (`D:529-566`).

**C — Témoin : régénération réussie.** Ajouté parce que l'essai A a révélé que l'**identifiant** de la ligne change (§3). C sépare ce qui revient à l'échec de ce qui revient à toute régénération.

**Ce qui est artificiel :** seulement le **déclencheur**, un faux modèle ou un faux 503. Les chemins de code empruntés sont ceux d'un échec réel.

---

## 2. Relevés

Valeurs de `releves.json` du dernier passage : 3/3, `Test Files 1 passed (1)`. Dans chaque scénario, l'identifiant d'origine est noté **`ID0`**.

### 2.1 AVANT (identique dans A, B et C)

**Ligne `app_generations` `ID0`**
- `statut: livree`, `ok: true`, `moteur: direct`, `fournisseur: deepseek`, `nom: Facture SNE`, `version_courante: 1`.
- `cout_usd: 0.0075`, `jetons_entree: 1200`, `jetons_sortie: 3400`, `tirages: 1`, `diagnostics: []`.
- `document` contient `fichiers` (6), `schema`, `politiques`, `entites` et `configuration`. Les 6 fichiers sont `index.tsx`, `calcul.ts` et `systeme/{jetons,argent,ui,donnees}`.
- `sections_acquises` contient `configuration`, `lectureBrief`, `deploiement`, `tours` (1 tour, ok), `jetons`, `execution`, `vivacite`, `couverture`, `persistance` et `dernierTexte` (null).

**`app_generation_versions`**
- 1 ligne : `generation_id = ID0`, `rang 1`, `etape livraison`, 6 fichiers.

**Aperçu** `GET /direct/ID0`
- HTTP 200, `text/html`, 11 894 caractères.

**Carte** (`mes-applications`)
- `statut livree`, `revoyable: true`, 6 fichiers.

**Historique** `GET /version?id=ID0`
- `versions: [{ rang 1, restaurable: true }]`, `courante: 1`.

### 2.2 APRÈS — scénario A (non-convergence)

**Régénération**
- 3 appels au fournisseur. HTTP 200 (réponse en flux).
- Corps : `{ ok: false, error: "Non convergé en 3 tours. Le code produit ne s'est pas assemblé (3 essai(s), 0 s).", motif: …, tours: [3 tours, chacun avec motif et source], coutUsd: 0.022572 }`.

**Ligne `app_generations` `ID0` : n'existe plus.**
- Une seule ligne en base, avec un **nouvel identifiant** (`ID1`).
- Elle porte `statut: refusee`, `ok: false`, `document: null`, `diagnostics: ["Non convergé en 3 tours."]`, et la même `demande` et le même `nom`.

**`app_generation_versions`**
- Inchangée : `generation_id = ID0`, rang 1, 6 fichiers.
- **Aucune ligne `app_generations` ne porte plus `ID0`.**

**Aperçu**
- `GET /direct/ID0` : HTTP **404**, « Cette application est introuvable. ».

**Cartes**
- Une seule : `ID1`, `statut refusee`, `revoyable: false`.

**Historique**
- De `ID0` : `{ error: "application inconnue" }`.
- De `ID1` : `{ versions: [], courante: 0 }`.

**Message d'écran** (`P:213`) : « Non convergé en 3 tours. Le code produit ne s'est pas assemblé (3 essai(s), 0 s). »

### 2.3 APRÈS — scénario B (erreur du fournisseur)

**Régénération**
- 1 appel. HTTP 200.
- Corps : `{ ok: false, error: "503 {\"error\":{\"message\":\"Service unavailable\"}}" }`.

**Ligne `ID0` : intacte, champ par champ identique à AVANT.**

**Une nouvelle ligne `ID2` est insérée**
- `statut: refusee`, `ok: false`, `document: null`, sans `nom`.
- `diagnostics: ["la construction a ete interrompue — 503 …"]`.

**`app_generation_versions`** : inchangée.

**Aperçu** `GET /direct/ID0` : HTTP 200, même HTML.

**Cartes** : deux.
- `ID0` : `livree`, `revoyable: true`.
- `ID2` : `refusee`, `revoyable: false`, `nom: null`.

**Historique**
- De `ID0` : inchangé.
- De `ID2` : vide.

**Message d'écran** : « 503 {"error":{"message":"Service unavailable"}} ».

### 2.4 APRÈS — scénario C (témoin, régénération réussie)

**Régénération**
- Corps `ok: true`. Message d'écran : « Nouvelle version créée. ».

**Ligne `ID0` : n'existe plus.**
- Une seule ligne, avec un **nouvel identifiant** `ID3` : `livree`, `revoyable: true`.

**`app_generation_versions`** : deux lignes.
- L'ancienne : `ID0`, rang 1, orpheline.
- Une nouvelle : `ID3`, **rang 1**, `etape livraison`. Ce n'est pas un `rang 2 regeneration`.

**Aperçu**
- `GET /direct/ID0` : 404.
- L'œuvre se voit sous `ID3`.

**Historique**
- De `ID3` : une seule version.
- **La version précédente n'y figure pas.**

---

## 3. Cause, lue dans le code

1. **Chaque génération fabrique un identifiant neuf** : `const idOeuvre = randomUUID()` (`D:606`).
2. Cet identifiant est mis dans la charge écrite : `id: idOeuvre` (`D:632`). Il a été ajouté par le commit `3d4663aa` (2026-11-02), selon `git log -S`.
3. **La régénération fait un `update` avec cette charge**, filtré sur l'**ancien** identifiant (`D:811-817`). Elle réécrit donc la clé primaire : `id` est une clé primaire, `lib/apps/journal.ts:409-410`.
4. En échec, la charge porte `document: null` (`D:749-776`). Les versions ne s'écrivent qu'en succès (`D:832`).
5. En succès, la version est rangée sous `ecrit.data.id`, le **nouvel** identifiant (`D:846-852`). Son rang repart donc de 1.
6. **Le DDL versionné ne déclare aucune clé étrangère** de `app_generation_versions.generation_id` vers `app_generations.id` (`lib/apps/journal.ts:683-709`). Rien n'empêche donc ce changement de clé.
7. Le chemin `catch` (scénario B) ne fait pas d'`update` : il fait un **`insert`** d'une ligne neuve (`D:546-555`). D'où une deuxième carte, et l'original intact.

---

## 4. Constat sur trois plans

### 4.1 Ce que contient la base [OBSERVÉ-SIMULATION]

**A — non-convergence.**
- La ligne d'origine est **réécrite sous un autre identifiant**, sans document, au statut `refusee`.
- Toute sa trace (tours, verdicts, lecture du cahier, commit, coût, jetons) est remplacée par celle de l'échec.
- Les fichiers de l'œuvre **existent toujours**, dans `app_generation_versions`, mais **rattachés à un identifiant qui ne désigne plus aucune ligne**.

**B — erreur du fournisseur.**
- La ligne d'origine est **intacte**.
- Une ligne `refusee` sans nom est **ajoutée**.

**C — réussite.**
- Même changement d'identifiant que A.
- L'historique est **coupé en deux** : l'ancienne version est orpheline, la nouvelle repart au rang 1.

### 4.2 Ce que l'utilisateur peut encore ouvrir

**A**
- L'aperçu de l'œuvre est **impossible** (404).
- La carte restante est `revoyable: false`. Elle n'affiche que « Aucun fichier conservé » (`P:855-861`).
- Les boutons « Ouvrir dans l'atelier », « Revoir », « Publier », « Télécharger » et « **Historique** » ne sont rendus que si `revoyable` est vrai (`P:799-838`).
- Même si l'historique était atteint, celui de `ID1` est vide.
- **Aucun chemin de l'interface ne mène aux fichiers conservés sous `ID0`.**

**B**
- Tout reste ouvrable. S'y ajoute une carte vide sans nom.

**C**
- La nouvelle œuvre est ouvrable.
- La version précédente n'est **plus atteignable par l'interface**, puisque l'historique de `ID3` ne la contient pas.
- [DÉDUIT] L'écran appelle ensuite `voirVersions(a)` avec l'objet carte d'avant (`P:220`), donc l'ancien identifiant, qui rend « application inconnue » (`app/api/generateur/version/route.ts:67`).

### 4.3 Ce que l'écran affiche

- **Avant de lancer** (A, B et C), la boîte de confirmation dit : « La version actuelle est conservée : si le résultat vous plaît moins, vous revenez dessus en un clic, gratuitement. » (`P:195-196`).
- **Après l'échec A :** le message est celui de la route, « Non convergé en 3 tours. Le code produit ne s'est pas assemblé… ».
- **Après l'échec B :** le message brut du fournisseur, « 503 {"error":…} ».
- **Après la réussite C :** « Nouvelle version créée. ».

**L'écran contredit la base**
- **A.** La confirmation promet « La version actuelle est conservée… vous revenez dessus en un clic ». La base montre que la version actuelle n'est plus atteignable : aperçu 404, aucun bouton, historique vide. Les fichiers existent en base, mais aucun clic n'y mène.
- **C.** La même promesse est contredite : la version précédente n'est plus dans l'historique de l'œuvre, donc « vous revenez dessus en un clic » est faux.

**Mon constat d'origine est réfuté sur un point**
- L'ÉTUDE_LANGSMITH (§2e) annonçait que l'écran affichait « votre version actuelle n'a pas bougé ». **Ce n'est pas observé**, ni dans A ni dans B.
- La route rend un `error`, et `P:213` l'affiche de préférence.
- Ce message par défaut ne paraîtrait que si le corps rendu ne portait ni `error` ni `motif`, par exemple une connexion coupée. Ce cas n'a pas été essayé : **UNKNOWN**.

---

## 5. Conclusion

> **Mise à jour du 2026-11-15** : le schéma de production a été relevé (§6). Il n'oppose ni clé étrangère ni déclencheur. Une seule exception : une contrainte CHECK, pour les œuvres publiées.

### Échec par non-convergence (A) : **VÉRIFIÉ en simulation**, et possible en production pour une œuvre non publiée (§6)

Le défaut existe, et il est **plus large** que l'hypothèse de départ :
- l'œuvre n'est pas seulement retirée de la ligne : la ligne elle-même change d'identifiant ;
- les fichiers survivent en base, mais l'utilisateur ne peut plus les ouvrir par l'interface ;
- la promesse de la boîte de confirmation est contredite.

### Échec du fournisseur (B) : **NON VÉRIFIÉ**

Le défaut ne se produit pas : l'œuvre est intacte. Effet observé à la place : une carte `refusee` sans nom s'ajoute.

### Message « votre version actuelle n'a pas bougé » : **NON VÉRIFIÉ**

Il n'est affiché dans aucun des deux échecs essayés.

### Observation hors hypothèse (C) : **VÉRIFIÉ en simulation**

Avec le code éprouvé (`27e83891`), toute régénération, **même réussie**, change l'identifiant et coupe l'historique des versions. **Ce n'est vrai que du code postérieur au commit `3d4663aa`** : avant lui, l'identifiant ne changeait pas (§8). C'est consigné ici parce que c'est la même cause (§3, points 1 à 3). Ce n'est pas une conclusion sur le défaut demandé.

---

## 6. Schéma réel de production — relevé du 2026-11-15

Les trois requêtes ci-dessous ont été lancées par le propriétaire dans le projet Supabase **nexiora-ai** (branche `main`, PRODUCTION), une par une, entre 12:41 et 12:42, heure de Toronto. Captures d'écran à l'appui.

### 6.1 Résultats bruts

**Requête 1 — contraintes. 7 lignes.**

| table | contrainte | type | définition |
|---|---|---|---|
| app_generations | app_generations_en_cours_verrouillee | c | `CHECK (((statut <> 'en_cours'::text) OR ((battement IS NOT NULL) AND (jeton_…` (tronqué à l'écran) |
| app_generations | app_generations_livree_a_document | c | `CHECK (((statut <> 'livree'::text) OR (document IS NOT NULL)))` |
| app_generations | app_generations_pkey | p | `PRIMARY KEY (id)` |
| app_generations | app_generations_publie_a_document | c | `CHECK (((publication_jeton IS NULL) OR (document IS NOT NULL)))` |
| app_generations | app_generations_statut_valide | c | `CHECK ((statut = ANY (ARRAY['en_attente'::text, 'en_cours'::text, 'livree'::text, …` (tronqué à l'écran) |
| app_generation_versions | app_generation_versions_pkey | p | `PRIMARY KEY (id)` |
| app_generation_versions | app_generation_versions_rang_unique | u | `UNIQUE (generation_id, rang)` |

**Requête 2 — déclencheurs non internes sur `app_generations` :** 0 ligne.

**Requête 3 — versions dont la génération n'existe plus :** 0 ligne.

### 6.2 Ce qu'on en tire

**1. Aucune clé étrangère** (aucune ligne de type `f`) **et aucun déclencheur.**
- Rien, dans le schéma réel, ne s'oppose à ce qu'un `update` réécrive `app_generations.id`.
- Et rien ne relie `app_generation_versions.generation_id` à cette ligne.
- **L'UNKNOWN sur le schéma est levé** : le mécanisme vérifié en simulation (§3, §5) est **possible en production**.

**2. Une réserve que la simulation ne couvrait pas : les œuvres publiées.** [LU dans le relevé + DÉDUIT]
- La base en mémoire n'appliquait aucune contrainte CHECK. La production en a une qui touche le scénario A : `app_generations_publie_a_document`, soit `publication_jeton IS NULL OR document IS NOT NULL`.
- Pour une œuvre **publiée** (jeton non nul), la charge d'échec de A porte `document: null` (`D:749-776`). Postgres refuserait donc tout l'`update`.
- La route ne lit pas `ecrit.error` après l'écriture (`D:808-817`). [DÉDUIT] Résultat attendu dans ce cas : la ligne d'origine reste **intacte**, et l'échec n'est **consigné nulle part** en base. C'est la même perte de trace sous une autre forme.
- C'est **non observé**. Le défaut A tel que vérifié vaut donc pour les œuvres **non publiées**. Pour les publiées : UNKNOWN.
- Le scénario C (réussite) n'est pas touché par cette contrainte, puisque `document` y est non nul.

**3. Les deux CHECK tronqués à l'écran** (`en_cours_verrouillee`, `statut_valide`)
- D'après leur début lisible, ils ne portent ni sur `id` ni sur `generation_id`.
- `statut_valide` doit admettre `refusee`, que la route écrit, mais la liste complète n'est pas lue : UNKNOWN mineur.
- Pour le confirmer sans troncature : `select conname, pg_get_constraintdef(oid) from pg_constraint where conname in ('app_generations_en_cours_verrouillee','app_generations_statut_valide');`

**4. Aucun orphelin constaté à ce jour** (requête 3).
- Ce n'est **pas** « le défaut ne se produit pas en production ».
- Le bouton « Régénérer » est fermé depuis le 2026-11-14 (`P:840-851`), et le nombre de régénérations réelles est inconnu, possiblement nul.
- Précision du 2026-11-15 (§8) : le défaut n'a été servi en production qu'à partir du 2026-11-03. Les régénérations antérieures, dont celles de l'œuvre `fa0ede2c…` (2026-11-02), ont gardé leur identifiant.

**5. Conséquence opérationnelle.**
- Le risque est **gelé par la fermeture du bouton, pas écarté**.
- [DÉDUIT de §3 et §6.2.1] Toute réouverture de « Régénérer » avant réparation produira des versions orphelines, sur les régénérations réussies (C) comme sur les échecs par non-convergence d'œuvres non publiées (A).

**6. Note sans conclusion.**
- La contrainte `UNIQUE (generation_id, rang)` n'empêche pas la coupure d'historique.
- Les versions repartent au rang 1 sous le nouvel identifiant (§2.4), ce qui ne viole aucune unicité.

**Niveau de preuve après ce relevé**
- Le **mécanisme** est vérifié en simulation.
- Le **schéma réel** est vérifié : il ne l'empêche pas, sauf pour une œuvre publiée en échec.
- **Une occurrence réelle** n'a pas été observée : 0 orphelin, bouton fermé.

---

## 7. Ce qui reste UNKNOWN

1. ~~Le comportement de la base de production.~~ **Levé le 2026-11-15** (§6), à l'exception des œuvres publiées (§6.2.2). Texte d'origine conservé ci-dessous.
   - L'essai suppose que la vraie table accepte qu'un `update` réécrive `id`.
   - Le DDL versionné le permet (`lib/apps/journal.ts:409-410`, `683-709`, aucune clé étrangère).
   - Mais le schéma **réel** de production (clés étrangères ajoutées à la main, déclencheurs, droits par colonne) **n'a pas été lu**.
   - Si une contrainte refusait l'`update`, A et C se comporteraient autrement. L'écriture échouerait, la route ne lève pas sur `ecrit.error` (`D:808-817`), et l'effet serait à mesurer.
   - **Moyen de lever ce point sans rien écrire ni dépenser** : une lecture seule dans le projet Supabase qui porte `app_generations`. Elle est à lancer par le propriétaire ; je ne l'ai pas lancée.
     ```sql
     -- 1. Contraintes réelles des deux tables
     select conrelid::regclass as table_, conname, pg_get_constraintdef(oid)
     from pg_constraint
     where conrelid in ('public.app_generations'::regclass, 'public.app_generation_versions'::regclass);
     -- 2. Déclencheurs sur app_generations
     select tgname, pg_get_triggerdef(oid) from pg_trigger
     where tgrelid = 'public.app_generations'::regclass and not tgisinternal;
     -- 3. Traces déjà présentes : versions dont la génération n'existe plus
     select v.generation_id, v.rang, v.etape, v.cree_le
     from public.app_generation_versions v
     left join public.app_generations g on g.id = v.generation_id
     where g.id is null
     order by v.cree_le desc;
     ```
     Des versions orphelines datées après le 2026-11-02 seraient une observation **en conditions réelles** que des régénérations ont déjà re-clé des œuvres. Leur absence ne réfuterait rien, car le bouton est fermé depuis le 2026-11-14.
2. Le message affiché quand le corps de la réponse n'est pas lisible : connexion coupée, ou fonction tuée à 900 s (`D:61`).
3. Le comportement de l'atelier (`app/atelier/[id]/page.tsx`) sur une œuvre re-clé. Il n'a pas été exécuté : il lit `GET /direct/[id]` (`atelier/[id]/page.tsx:164`), et l'on s'attend donc au même 404, mais ce n'est pas observé.
4. L'effet sur une œuvre **publiée**. `publication_slug` et `publication_jeton` vivent sur la même ligne et suivent donc la ligne re-clé ; la page publique n'a pas été essayée.
5. La reproduction en production. Elle est impossible sans rouvrir la génération, et elle serait payante ; elle n'est pas demandée.

---

## 8. Requalification — la période réelle du défaut (2026-11-15, soir)

**Déclencheur.** Le propriétaire a relevé en production l'œuvre `fa0ede2c-8db9-40eb-9fad-8ed174c14bfe`. Elle porte 8 versions sous **un seul** identifiant, dont deux `regeneration` (rangs 2 et 4, 2026-11-02 01:26 et 01:45 UTC). Une seconde œuvre, `56dbd09d…`, en porte 3. Cela semblait contredire le scénario C.

**Verdict : il n'y a pas de contradiction. Le scénario C est confirmé pour le code éprouvé, mais il doit être daté.** Le texte de §5 laissait croire que le défaut était de tout temps. Il ne l'était pas.

### 8.1 Le commit d'introduction [LU, git]

- `git log -S randomUUID -- D` donne un seul commit : **`3d4663aa`**, daté du **2026-11-02 15:43:45 -0500, soit 20:43 UTC**. Titre : « La porte verifie l'APPARTENANCE ».
- Ce commit ajoute `const idOeuvre = randomUUID()` et met `id: idOeuvre` dans la charge `ligne`. Le but est de cuire l'identifiant dans la politique RLS avant l'insertion.
- Il n'a pas distingué la régénération : la même `ligne` part dans le `update(...).eq('id', idExistant)`.
- **Le code d'avant** (`3d4663aa^`), passage d'écriture `:536-655` : la `ligne` ne porte **pas** de champ `id`. Le `update` ne réécrivait donc pas la clé primaire, et les versions restaient sous le même identifiant.
- C'est **exactement** ce que montre `fa0ede2c…` : 8 versions entre le 2026-11-01 23:49 et le 2026-11-02 11:11 UTC, toutes antérieures à `3d4663aa`.

### 8.2 La période réelle en production

**Début** [LU, git + message de commit]
- `3d4663aa` est sur `main`, en historique linéaire.
- Le commit `623cc05b` (2026-11-03 09:37 -0500) dit : « Quatre deploiements de suite ont echoue. La production a continue de servir `aec3e20` ».
- Or `aec3e20` (2026-11-02 13:08 -0500) **ne contient pas** `3d4663aa` (`git merge-base --is-ancestor` : faux).
- Le défaut n'a donc pu être servi **qu'à partir du déploiement de `623cc05b`**, soit le **2026-11-03 vers 14:37 UTC** au plus tôt. L'heure exacte du déploiement réussi n'a pas été relevée sur Vercel : **UNKNOWN** à la minute près.

**Fin**
- Le bouton est masqué par `27e83891` (2026-11-14 19:55 -0500, soit 2026-11-15 00:55 UTC). Fin de l'exposition **par l'écran**.
- La route elle-même acceptait encore `?id=` jusqu'au déploiement de `e233a4b` le 2026-11-15. Seul un appel direct authentifié aurait pu l'atteindre entre-temps : non observé, **UNKNOWN**.

**Durée** : environ **11,4 jours**, du 2026-11-03 ≈14:37 UTC au 2026-11-15 00:55 UTC.

### 8.3 Combien de régénérations ont pu le subir

**Ce qui est établi** [DÉDUIT du relevé §6, 0 orphelin]
- Aucune régénération **réussie** d'une œuvre **qui avait déjà des versions** n'a eu lieu pendant la fenêtre.
- La raison : elle aurait laissé ses anciennes versions sous l'ancien identifiant, donc orphelines.

**Ce que le 0 orphelin ne couvre pas**
1. Une œuvre **sans version** : les versions existent depuis `5574cbb5`, le 2026-11-01. Une régénération réussie d'une telle œuvre la re-clé sans laisser d'orphelin.
2. Un échec par non-convergence (A) d'une œuvre sans version : re-clé, `document` vidé, aucun orphelin non plus.

**Signature mesurable du cas 1** [DÉDUIT]
- `created_at` n'est pas dans la charge, donc un `update` le conserve.
- Une œuvre re-clé par une régénération réussie porte donc une version **rang 1, `livraison`**, créée longtemps après sa propre `created_at`.

Requête de lecture seule, **à lancer par le propriétaire** (non lancée) :

```sql
-- Régénérations re-clées : rang 1 « livraison » écrit bien après la naissance de la ligne
select g.id, g.created_at, v.cree_le, v.cree_le - g.created_at as ecart
from public.app_generations g
join public.app_generation_versions v on v.generation_id = g.id and v.rang = 1
where v.cree_le - g.created_at > interval '10 minutes'
order by v.cree_le;
-- Régénérations SAINES pendant la fenêtre (attendu : 0 si le défaut était servi)
select count(*) from public.app_generation_versions
where etape = 'regeneration'
  and cree_le between '2026-11-03 14:30+00' and '2026-11-15 01:00+00';
```

Le **nombre** de régénérations pendant la fenêtre reste **UNKNOWN** tant que ces deux requêtes n'ont pas été lancées.

### 8.3 bis Résultats en production (propriétaire, 2026-11-15 17:47 Toronto)

**Requête des œuvres re-clées : 8 lignes.**

| id | created_at | cree_le (rang 1) | écart |
|---|---|---|---|
| 56dbd09d-4ebc-46a6-ac37-4762cfb43847 | 2026-10-14 12:11:28+00 | 2026-10-14 12:31:13+00 | 00:19:45 |
| b3a37d92-5653-429f-94a1-47c629f4e97c | 2026-10-15 08:48:11+00 | 2026-10-15 09:01:18+00 | 00:13:06 |
| 38071852-5578-46a3-8e10-5420ca16e0d3 | 2026-10-15 20:51:09+00 | 2026-10-15 21:03:18+00 | 00:12:09 |
| fe0f539b-a09f-4071-b699-6117789bfcdc | 2026-10-15 21:32:58+00 | 2026-10-15 22:01:19+00 | 00:28:20 |
| 6560ff75-f45f-4c20-b5d6-8a2df2c0e887 | 2026-10-15 22:30:12+00 | 2026-10-15 22:58:18+00 | 00:28:05 |
| bac4579f-c124-4548-8641-9fd179eb6d48 | 2026-10-19 21:14:17+00 | 2026-10-19 21:42:56+00 | 00:28:38 |
| fa0ede2c-8db9-40eb-9fad-8ed174c14bfe | 2026-11-01 23:28:01+00 | 2026-11-01 23:49:47+00 | 00:21:45 |
| d09d921d-e82f-4661-9c12-df06a63358cc | 2026-11-01 23:14:08+00 | 2026-11-01 23:50:18+00 | 00:36:09 |

**Requête des régénérations saines pendant la fenêtre :** `count = 0`.
- Contrôle de cohérence : sans le filtre de dates, le compte serait au moins 2, à cause des rangs 2 et 4 de `fa0ede2c`. Le 0 montre donc que le filtre a bien porté.

**Limite de la première requête** (relevée par le propriétaire)
- Le seuil de 10 minutes capture aussi le **temps de génération normal** : la ligne naît, puis sa version de rang 1 s'écrit à la livraison, 12 à 36 minutes plus tard.
- Les 8 lignes **ne sont donc pas des œuvres re-clées** : ce sont des générations ordinaires.
- Ce qui tranche, ce sont les dates. La plus récente est du 2026-11-01 23:50 UTC, soit environ 21 h avant `3d4663aa`, et deux jours avant sa mise en production. **Aucune ligne ne tombe dans la fenêtre** (2026-11-03 ≈14:37 → 2026-11-15 00:55 UTC).

### 8.3 ter Ce qui est établi, et l'angle mort restant

| Cas pendant la fenêtre | Signature en base | Couvert par | Résultat |
|---|---|---|---|
| Régénération **réussie**, œuvre avec ou sans versions | une version rang 1 `livraison` écrite après la naissance de la ligne, puisque `created_at` est conservé | requête des re-clées | **0** dans la fenêtre [OBSERVÉ-PROD] |
| Échec par non-convergence (A), œuvre **avec** versions | versions orphelines | relevé §6 (0 orphelin) + clé étrangère posée sans refus | **0** [OBSERVÉ-PROD] |
| Échec par non-convergence (A), œuvre **sans** version | ligne re-clé, `refusee`, `document` vide, **aucune version** | **aucune des requêtes** | **UNKNOWN** |

La requête des régénérations saines ne ferme aucun angle mort. Elle confirme seulement qu'aucune régénération n'a suivi le chemin sain pendant la fenêtre, ce qui était attendu.

**L'angle mort restant**
- Ce sont les œuvres nées **avant** l'arrivée des versions (`5574cbb5`, 2026-11-02 00:19 UTC) et qui portent aujourd'hui `refusee` sans aucune version.
- La table n'a pas de colonne de dernière modification. Pour une telle ligne, on ne distingue donc pas un échec d'origine d'un échec de régénération.
- La requête ci-dessous liste les candidates. **Si elle rend 0 ligne, le cas est fermé** et le nombre d'utilisateurs affectés est établi à **0**. Si elle rend des lignes, il faut les examiner une à une (`nom`, `diagnostics`, `sections_acquises`).

```sql
select g.id, g.created_at, g.nom, g.statut, g.diagnostics
from public.app_generations g
where g.created_at < '2026-11-02 00:20+00'
  and g.statut = 'refusee'
  and not exists (select 1 from public.app_generation_versions v where v.generation_id = g.id)
order by g.created_at;
```

**Verdict d'étape :**
- **0** régénération réussie a subi le défaut, **0** échec sur une œuvre versionnée [OBSERVÉ-PROD].
- L'échec sur une œuvre sans version reste **UNKNOWN**, en attente de la requête ci-dessus.
- Le dossier est clos sous cette seule réserve.

### 8.4 bis Le dernier angle mort est fermé (propriétaire, 2026-11-15 18:05 Toronto)

**Requête des œuvres anciennes `refusee` sans version : 1 ligne.**

| id | created_at | nom | statut | diagnostics |
|---|---|---|---|---|
| c0fdab64-7241-471b-a54e-78eeaaa0af6f | 2026-10-10 22:36:57.25418+00 | Cahier des charges | refusee | `["SCHEMA"]` |

**Requête complémentaire sur cette ligne** (18:07) : `jamais_livree = true`, `taille_document = NULL`, `cout_usd = 16.0338`, `duree_ms = 3173933`.

**Lecture**
- `document` est nul : l'œuvre n'a **jamais été livrée**.
- La régénération suppose une livraison antérieure : le bouton n'apparaît que sur une œuvre qui a des fichiers.
- Ce n'est donc pas une re-clé. C'est une **première génération échouée le 2026-10-10**, trois semaines avant `3d4663aa`.

**Verdict final**
- Les trois cas du tableau §8.3 ter sont couverts par des observations de production.
- **Le nombre d'utilisateurs affectés par le défaut de régénération est établi à 0** [OBSERVÉ-PROD].
- **Le dossier est clos.**

**Constat séparé, renvoyé à un chantier à part, NON traité ici :** la même ligne montre une génération de 53 minutes (3 173 933 ms) qui a coûté 16,0338 $ pour aucun document. Voir `PLAN_MANQUE4.md` §5.

### 8.4 Effet sur la réparation déployée [LU]

- **Aucun changement nécessaire.** La réparation (`idOeuvre = idExistant !== '' ? idExistant : randomUUID()`, `REPARATION_REGENERATION.md`) rétablit pour la régénération le comportement d'avant `3d4663aa` : l'identifiant reste le même.
- Elle garde ce que `3d4663aa` voulait : un identifiant connu **avant** d'émettre la porte, pour une œuvre neuve.
- La clé étrangère RESTRICT posée le 2026-11-15 interdit désormais à la base de laisser repasser la même régression.

