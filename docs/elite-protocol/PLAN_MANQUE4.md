# Manque 4 — la trace écrasée : état des lieux et plan

- **Date :** 2026-11-15.
- **Code observé :** `main` @ `9e46d9e6`, réparation de régénération et clé étrangère comprises.
- **Statut :** PLAN, **non validé**. Aucune ligne de code et aucune migration n'ont été écrites.
- **Pièces brutes :** `evidence/manque4-etat-des-lieux/`.
  - `observation-manque4.test.ts.txt` : l'essai, archivé en `.txt`. Son en-tête est recopié de la preuve du matin.
  - `releves.json` : les lignes brutes, avant et après, colonne par colonne.
  - `sortie-vitest.txt` : 5 scénarios sur 5 exécutés.
  - `commit-observe.txt`.
- **Méthode :** le même harnais que `PREUVE_REGENERATION.md`.
  - La vraie route `POST /api/generateur/direct` est appelée, avec une base en mémoire à état et un faux DeepSeek au niveau du réseau.
  - Aucun appel payant, aucune écriture en base réelle.
- **Niveau de preuve :** [OBSERVÉ-SIMULATION]. Le code réel s'exécute ; la base de production n'est pas en jeu.

---

## 1. État des lieux — ce qui est RÉELLEMENT écrasé aujourd'hui

Cinq suites ont été jouées. Chacune part d'une œuvre livrée par la vraie route, puis enchaîne les régénérations indiquées.

| Suite | Enchaînement | Ce qu'on observe |
|---|---|---|
| S1 | une régénération réussie | une ligne ; version 2 `regeneration` ajoutée ; `id` inchangé |
| S2 | une régénération non convergée | `document`, `statut` et `ok` inchangés ; **toutes les mesures** remplacées par celles de l'échec |
| S3 | un échec, **puis** une réussite | la trace de l'échec **disparaît entièrement** à la réussite |
| S4 | deux réussites | chaque réussite remplace la trace de la précédente |
| S5 | une erreur du fournisseur | la ligne de l'œuvre n'est pas touchée ; une **seconde ligne** `refusee` est insérée, sans lien avec l'œuvre |

### 1.1 Ce que la réparation a déjà couvert [OBSERVÉ-SIMULATION]

- `id` ne change plus (S1 à S5).
- Un échec ne vide plus `document`, et ne touche ni `statut` ni `ok` (S2, S3) : l'œuvre reste ouvrable.
- Les versions s'enchaînent sous le même identifiant (S1, S4 : rangs 1, 2, 3).

### 1.2 Ce qui est encore écrasé, à CHAQUE tentative [OBSERVÉ-SIMULATION]

Colonnes de `app_generations` remplacées par la dernière tentative, réussie ou échouée :
- `sections_acquises`, en bloc : `tours[]` (motif et source de chaque tour raté), `execution`, `vivacite`, `couverture`, `persistance`, `jetons`, `dernierTexte`, `deploiement`, `lectureBrief`, `configuration` ;
- `cout_usd`, `duree_ms`, `jetons_entree`, `jetons_sortie`, `tirages`, `diagnostics`.

**Preuve la plus nette (S3)**
- Après l'échec, la ligne porte 3 tours, `cout_usd 0.0226`, `diagnostics ["Non convergé en 3 tours."]`.
- Après la réussite suivante, elle porte 1 tour, `cout_usd 0.0075` et `diagnostics []`.
- Les 0,0226 $ et les trois tours ratés n'existent **plus nulle part**.

**Ce que garde `app_generation_versions`** (clés de `etat` : `forme`, `fichiers`, `nom`, `coutUsd`, `schema`, `politiques`)
- Le **produit** d'une réussite, pas sa **trace** : ni les tours, ni les juges, ni les jetons, ni la durée.
- **Rien** pour un échec.

### 1.3 Deux effets que la réparation a rendus visibles [OBSERVÉ-SIMULATION]

1. **Une ligne incohérente après un échec (S2).** `statut livree`, `ok true` et `document` sont ceux de la version réussie, mais `cout_usd`, `tirages`, `diagnostics` et `sections_acquises` sont ceux de l'échec.
   - Avant la réparation, l'échec effaçait tout, donc la ligne était cohérente, mais vide.
   - Aujourd'hui, `/admin/applications`, qui lit `sections_acquises` (`admin/applications/page.tsx:34`), montrerait une œuvre livrée avec le journal d'un échec. Je ne l'ai pas observé à l'écran : [DÉDUIT].
2. **La dépense sous-comptée.**
   - Le coût d'une tentative échouée ne survit que jusqu'à la tentative suivante.
   - Le coût de la génération initiale ne reste que dans `app_generation_versions.cout_usd` du rang 1.
   - Une somme de `app_generations.cout_usd` est donc un plancher.

### 1.4 Hors du chemin « Régénérer », pour mémoire, non traité

- `retoucher/route.ts:243` et `:698` mettent à jour `document` et `version_courante` seulement. Une retouche n'écrase pas la trace, mais elle n'en laisse pas non plus dans `app_generations`. Son coût va dans la version.
- La suite S5 est inchangée, comme décidé : la carte `refusee` sans nom.

### 1.5 Ce qui reste du manque 4

- **Couvert par la réparation :** l'identifiant, l'effacement de l'œuvre, la promesse de l'écran.
- **Pas couvert :** **l'historique des tentatives**. C'était le cœur du manque 4 (`ETUDE_LANGSMITH.md` §2e) : « Rien des tentatives échouées, ni des tours, ni des verdicts ».

---

## 2. Plan

### 2.1 La forme : une ligne par tentative (option H1 de l'étude)

Une nouvelle table, **`app_generation_attempts`**, porte une ligne par exécution de la boucle, réussie ou non : génération initiale comme régénération.

Elle est **écrite une fois, jamais mise à jour** : c'est un journal en ajout seul. `app_generations` reste l'état courant de l'œuvre.

**Conservé par tentative**

| Colonne | Pourquoi |
|---|---|
| `id`, `generation_id` (clé étrangère → `app_generations.id`, RESTRICT, comme les versions) | rattacher sans ambiguïté |
| `rang` (UNIQUE avec `generation_id`), `nature` (`generation` / `regeneration`) | l'ordre et l'origine |
| `debut_le`, `fin_le` | **manquent aujourd'hui** : la ligne n'a aucune date de dernière écriture (§8 de la preuve) |
| `issue` (`livree` / `non_convergee` / `erreur_fournisseur` / `ecriture_echouee`) | ce qui s'est passé, lisible sans parser le JSON |
| `version_rang` (nul si échec) | le lien vers le produit dans `app_generation_versions` |
| `fournisseur`, `deploiement` (commit servi) | la comparaison réparer → regénérer |
| `cout_usd`, `duree_ms`, `jetons_entree`, `jetons_sortie`, `tirages`, `diagnostics` | la mesure de **cette** tentative |
| `trace` (jsonb) : le contenu actuel de `sections_acquises` (tours, juges, `dernierTexte`) | la trace complète, telle qu'elle est déjà construite |

**Non conservé, avec la raison**
- `document`, `fichiers`, `schema`, `politiques` : déjà dans `app_generation_versions` pour une réussite. Pour un échec, la source des tours ratés est déjà dans `trace.tours[].source`.
- `owner_id`, `demande`, `nom` : portés par l'œuvre, sans intérêt à les dupliquer.
- `battement`, `jeton_travailleur`, `reprises` : la mécanique asynchrone, pas la trace.

**Taille :** une `trace` simulée pèse environ 1,5 Ko. Relevé de production du 2026-11-15 18:05 (propriétaire) : **75 lignes, moyenne 15 059 octets, maximum 54 140 octets** (`pg_column_size`). Requête :

```sql
select count(*), avg(pg_column_size(sections_acquises))::int as moy, max(pg_column_size(sections_acquises)) as maxi
from public.app_generations;
```

**Rétention :** aucune purge dans ce chantier, car la purge à 30 jours est un chantier à part. Je le consigne pour lui : les tentatives d'une œuvre supprimée resteront, comme ses versions aujourd'hui.

### 2.2 Ce qui change dans la route `D` (seul fichier applicatif écrivain)

1. Après l'écriture de la ligne de l'œuvre, **insérer la tentative**, dans les quatre issues. L'erreur est lue (`{ error }`) et part en alerte, comme les autres écritures depuis la réparation.
2. **En échec, la ligne de l'œuvre n'est plus touchée du tout** sur une œuvre existante. Cela ferme l'incohérence du §1.3. La ligne de l'œuvre porte alors toujours les mesures de la tentative qui a produit son `document` courant.
3. Le chemin `catch` (S5) écrit lui aussi une tentative `erreur_fournisseur` rattachée à l'œuvre.
   - **Décision à toi :** garder ou retirer, dans ce même lot, l'insertion de la carte `refusee` orpheline. Sans décision, je la garde, ce qui ne change rien à ce que tu avais demandé.

### 2.3 Où logeront les manques 1 à 3, sans déplacement ultérieur

Tous trois se rangent **par tour**. Les tours vivent dans `trace.tours[]`, donc dans la tentative.

| Manque | Emplacement |
|---|---|
| 1. Prompt système | une colonne `consigne` (texte) et `consigne_empreinte` sur la tentative : une consigne par exécution, pas par tour |
| 2. Jetons et coût par tour | des champs ajoutés à chaque entrée de `trace.tours[]` ; les totaux restent en colonnes |
| 3. Réflexion du modèle | `trace.tours[].reflexion`, bornée |

**Recommandation :** créer les colonnes `consigne` et `consigne_empreinte` **dans la même migration**, nullables et non écrites. Les manques 1 à 3 n'auront alors **aucune migration** à faire.

### 2.4 L'existant (75 œuvres, 51 versions) : rien n'est réécrit

- Aucun rétro-remplissage : la table naît vide.
- Les 75 lignes gardent leur `sections_acquises` actuelle, c'est-à-dire la trace de leur dernière tentative connue.
- Les lecteurs **retombent sur la ligne de l'œuvre** quand une œuvre n'a aucune tentative.
- La migration ne contient **aucun `update` ni `delete`** sur `app_generations` ou `app_generation_versions`.

### 2.5 Où vit le DDL : tu dois trancher

`journal.ts` est hors périmètre. Le DDL vit donc dans un fichier SQL, plus son annulation, dans `apps/web/supabase/sql/`, comme la clé étrangère.

Le nom de table et ses colonnes vivent dans un **module neuf** (`lib/apps/tentatives.ts`), avec un cliquet colonnes ↔ insert. `journal.ts` n'est pas touché.

### 2.6 La preuve observable que la trace n'est plus écrasée

1. **Simulation, sans coût.** Rejouer **ces cinq mêmes suites**, avec le même harnais, sur le code modifié.
   - Critère S3 : 2 tentatives. La 1ʳᵉ garde ses 3 tours, `cout_usd 0.0226` et `non_convergee`. La 2ᵉ est `livree` avec `version_rang 2`. La ligne de l'œuvre n'a **pas** changé pendant l'échec.
   - Ces suites deviennent un **cliquet permanent** dans la suite, sous l'allowlist `src/app/api/generateur/**`.
2. **Migration éprouvée en local**, sur un Postgres jetable, comme la clé étrangère.
   - Création, idempotence, refus d'une tentative orpheline, refus de supprimer une œuvre qui a des tentatives.
   - Comptes de `app_generations` et des versions inchangés.
3. **Production.**
   - **Avant :** tu poses la migration toi-même. Les comptes restent à 75 / 51.
   - **Après :** une génération neuve faite **par l'interface**. La requête `select … from app_generation_attempts where generation_id = …` rend 1 ligne `livree`.
   - La preuve **sur une régénération réelle** demande le bouton. Sa réouverture est ta décision, donc cette preuve est rendue séparément, après elle.
   - Le coût du tir est à annoncer avant, et il faut ton feu vert.

### 2.7 Réestimation [ESTIMÉ]

| Poste | Jours |
|---|---|
| Migration + annulation + essai Postgres local | 0,5 |
| Écriture dans `D` (quatre issues, erreurs lues, la ligne de l'œuvre non touchée en échec) | 0,5 à 0,75 |
| Module `tentatives.ts` + cliquet colonnes ↔ insert | 0,25 |
| Lecteur : `/admin/applications` liste les tentatives d'une œuvre | 0,5 |
| Cliquet de comportement (les 5 suites) + vérification complète | 0,25 à 0,5 |
| Rapport et pièces | 0,25 |
| **Total** | **2,25 à 2,75 j** |

L'étude disait 2 à 3 j. La réparation a retiré l'identifiant et l'effacement, mais ces deux points étaient petits.

Ce que le plan ajoute :
- les dates de début et de fin, qui manquent aujourd'hui ;
- la fin de l'incohérence de la ligne en échec ;
- les colonnes prêtes pour les manques 1 à 3.

Ce qui n'est pas compté : un écran utilisateur des tentatives. `mes-applications` n'est pas touché.

---

## 3. Décisions du propriétaire (2026-11-15)

1. Table de tentatives écrite une fois, jamais modifiée : **OUI**. « Une trace qu'on peut réécrire n'est pas une trace. »
2. En échec, la ligne de l'œuvre n'est plus touchée du tout : **OUI**.
3. La carte `refusee` sans nom du chemin `catch` : **GARDÉE** pour l'instant. Elle prévient l'utilisateur ; l'affichage des échecs sera repris quand la table existera.
4. Colonne du manque 1 (`consigne`) dans la même migration : **OUI**.
5. DDL dans un fichier SQL et un module neuf, hors de `journal.ts` : **OUI**.

Plan validé. La migration est éprouvée en local, **pas** appliquée en production : le propriétaire l'applique lui-même.

## 3 bis. Questions initialement posées

1. Valider la forme : une table de tentatives en ajout seul, avec les colonnes du §2.1.
2. En échec, la ligne de l'œuvre n'est plus touchée (§2.2.2) : oui ou non.
3. La carte `refusee` orpheline du chemin `catch` : la garder (par défaut) ou la retirer (§2.2.3).
4. Créer dès maintenant les colonnes du manque 1 (§2.3) : recommandé.
5. Le DDL hors de `journal.ts` (§2.5).

## 5. Point ouvert consigné, NON traité : une génération à 16 $

L'œuvre `c0fdab64-7241-471b-a54e-78eeaaa0af6f` (« Cahier des charges », 2026-10-10 22:36 UTC), relevée par le propriétaire le 2026-11-15 :
- `statut refusee`, `diagnostics ["SCHEMA"]`, `document` NULL : jamais livrée ;
- `duree_ms = 3 173 933`, soit environ 53 minutes ;
- `cout_usd = 16.0338`.

Pour comparaison : une génération réussie dure 70 à 80 s (chiffre du propriétaire), et l'échec simulé de cet état des lieux coûtait 0,0226 $.

Deux questions, **sans réponse ici** :
1. Existe-t-il un chemin où la génération boucle sans garde-fou de durée ou de coût ?
2. Le montant de 16,0338 $ est-il fiable ?
   - Le coût de la ligne est écrasé à chaque tentative (§1.2).
   - Un nom de modèle est écrit en dur dans `ai_usage_log` (`journal.ts:215`, `:353`).
   - La date précède `cf4f09cf`, donc le tarif est un plancher (`journal.ts`, commentaire de `cout_usd`).

Ce point rejoint la liste des chantiers à part.

## 4. UNKNOWN

- La taille réelle de `sections_acquises` en production (requête au §2.1).
- L'affichage réel de `/admin/applications` sur une ligne incohérente (§1.3.1) : déduit, pas vu.
- Le coût d'un tir de preuve réel.
