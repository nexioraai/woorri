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

**Relevé du 2026-11-16 (propriétaire, éditeur SQL, nexiora-ai main) :** sur `moteur = 'direct'`, `statut = 'livree'`, `fournisseur = 'deepseek'` → 8 œuvres, coût moyen 0,0521 $, maximum 0,1545 $, durée moyenne 121 s.

Note du propriétaire : 16,0338 $ vaut environ 100 fois ce maximum. Cela confirme que cette génération suivait un autre chemin que le moteur direct sur DeepSeek, et **renforce** l'hypothèse de l'option 2, **sans l'établir**. Le point reste ouvert et non traité.

## 5 bis. Constat consigné, NON traité : des œuvres « livrées » qui ne fonctionnent pas

Relevé par le propriétaire le 2026-11-16 (éditeur SQL, `app_generations`, les 5 dernières œuvres) [OBSERVÉ-PROD] :

| Œuvre | Nom | Créée (UTC) | Statut | Premier diagnostic |
|---|---|---|---|---|
| `ef085fa7` | carnet de dépenses | 2026-11-16 08:20 | `livree` | PARTIELLEMENT éprouvée : 10 sur 12 (**83 %**). Second diagnostic : « L'application ne se monte pas (simulateur) : Cannot read properties of undefined (reading 'valeur') » |
| `66bdab46` | Conterak | 2026-11-15 00:05 | `livree` | PARTIELLEMENT éprouvée : 24 sur 67 (**36 %**) |
| `edd1a7f9` | Conterak | 2026-11-14 18:21 | `livree` | « 1 écran(s) en repli (écrits par Deribfy, le modèle refusé trois fois) » ; son taux n'est pas visible sur la capture |
| `414773cd` | Conterak | 2026-11-14 18:14 | `livree` | PARTIELLEMENT éprouvée : 48 sur 144 (**33 %**) |
| `ad6017df` | CONTERAK | 2026-11-14 18:06 | `livree` | PARTIELLEMENT éprouvée : 25 sur 111 (**23 %**) |

Une œuvre peut être marquée `livree` alors que ses propres diagnostics disent qu'elle **ne se monte pas**.

Questions posées, **sans réponse ici** :
1. À partir de quel seuil une œuvre doit-elle être refusée plutôt que livrée ?
2. La personne doit-elle être avertie qu'une œuvre n'est que partiellement éprouvée ?

Ce constat rejoint la liste des chantiers à part.

## 5 ter. Chantiers à part, dans l'ordre où ils ont été consignés

1. La purge à 30 jours.
2. Le DDL de `journal.ts` aligné sur la base.
3. `ai_usage_log` (nom de modèle écrit en dur).
4. La génération à 16 $ (§5).
5. L'écran qui abandonne une génération réussie (`DEFAUT_ABANDON_ECRAN.md`, 2026-11-16).
6. Des œuvres « livrées » qui ne se montent pas (§5 bis).
7. **Confidentialité d'une application personnelle (2026-11-16).** Le juge des faces exige qu'une table lue sans connexion soit déclarée lisible par tout visiteur : reproche de `juge-faces.ts:123` (« DES TABLES SONT INTERROGÉES AVANT TOUTE CONNEXION… Déclare-la publique »), et loi écrite dans la consigne, `entites-declarees.ts:425-432` (« UNE PAGE PUBLIQUE LIT UNE TABLE DÉCLARÉE PUBLIQUE. TOUJOURS. »). Pour un carnet de dépenses personnel sans comptes, cela exposerait les dépenses à n'importe qui. C'est une question de confidentialité à trancher par le propriétaire, pas un réglage. Relevé dans `EXPERIENCE_UNE_VRAIE_APPLI.md` §5.2.

La suite prévue reste les manques 1 à 3.

## 4. UNKNOWN

- ~~La taille réelle de `sections_acquises` en production.~~ Relevée le 2026-11-15 (§2.1). La taille **brute** (non compressée) reste non mesurée : `select max(octet_length(sections_acquises::text)) from public.app_generations;`
- L'affichage réel de `/admin/applications` sur une ligne incohérente (§1.3.1) : déduit, pas vu. Rendu sans objet par §6, puisqu'en échec la ligne n'est plus touchée.
- Le coût d'un tir de preuve réel.

---

## 6. Réalisation (2026-11-15) — code et migration prêts, NON appliqués en production

Branche `feat/tentatives-generation`, non poussée.

### 6.1 Ce qui a été écrit

| Fichier | Rôle |
|---|---|
| `apps/web/supabase/sql/app_generation_attempts.sql` | la migration (SHA-256 `fb18a5cc…94fa`) |
| `apps/web/supabase/sql/app_generation_attempts_annulation.sql` | son annulation (SHA-256 `256b4ad0…a539`) |
| `apps/web/src/lib/apps/tentatives.ts` | nom, colonnes, issues, borne de la trace, construction et écriture d'une ligne |
| `apps/web/src/app/api/generateur/direct/route.ts` | une tentative par issue ; en échec de régénération, la ligne de l'œuvre n'est plus touchée |
| `apps/web/src/app/api/admin/applications/route.ts` + `admin/applications/page.tsx` | le lecteur : les tentatives de chaque œuvre ; si la table manque, la page le dit |
| `src/lib/apps/__tests__/tentatives.test.ts` | cliquet : colonnes du module = colonnes du SQL, issues, ajout seul, aucune réécriture de l'existant, borne |
| `src/app/api/generateur/direct/__tests__/tentatives-comportement.test.ts` | **test permanent** : les 5 suites de l'état des lieux, plus S0 et S6 |
| `src/app/api/generateur/direct/__tests__/route.test.ts` | son double connaît la nouvelle table |

### 6.2 Écarts au plan validé, à arbitrer s'ils ne conviennent pas

1. **L'issue `erreur_fournisseur` s'appelle `interrompue`.** Le chemin `catch` attrape toute exception de la boucle, pas seulement le fournisseur : le nom ne doit pas affirmer une cause qu'il ne connaît pas.
2. **Deux colonnes du manque 1, pas une** : `consigne` et `consigne_empreinte`, comme au §2.3. Toutes deux sont nulles et non écrites.
3. **La génération initiale écrit aussi sa tentative** (`nature generation`). C'est nécessaire pour que la première exécution d'une œuvre ne soit pas la seule sans trace.
4. **La table refuse les mises à jour par déclencheur**, et non par droits : la clé de service contourne la RLS et les droits ordinaires. La **suppression** reste possible : la rétention appartient au chantier de la purge.
5. **Une œuvre neuve dont l'écriture est refusée n'a pas de tentative** : elle n'a pas de ligne à laquelle se rattacher (clé étrangère). Son alerte reste sa trace, comme avant.

### 6.3 Preuves

**Le critère du propriétaire** [OBSERVÉ-SIMULATION] : après un échec suivi d'une réussite, il existe 2 tentatives de régénération ; la première garde ses 3 tours et `cout_usd 0.0226`.
- Test permanent S3 au vert.
- Relevé à l'identique de l'état des lieux : `evidence/manque4-etat-des-lieux/releves-apres.json`.

**Avant / après, mêmes suites, même harnais** (colonnes de la ligne de l'œuvre changées par la régénération)

| Suite | Avant (`releves.json`) | Après (`releves-apres.json`) | Tentatives après |
|---|---|---|---|
| S2 échec | `cout_usd`, `diagnostics`, `duree_ms`, jetons, `sections_acquises`, `tirages` | **aucune** | 2 : `livree` puis `non_convergee`, 3 tours, 0,0226 $ |
| S3 échec puis réussite | l'échec effacé par la réussite | échec : **aucune** ; réussite : `duree_ms`, `sections_acquises`, `version_courante` | 3 ; l'échec garde 3 tours et 0,0226 $ |
| S5 boucle qui jette | aucune ; carte `refusee` ajoutée | aucune ; carte `refusee` **gardée** | 2 : `livree` puis `interrompue`, rattachée à l'œuvre |

**Allègement de S4 (avant le push).** Le contrôle de marge (`verifier-marge-tests.mjs`) a refusé S4 : 1 939 ms pour un plafond de 1 667 ms, dû à trois assemblages réels.
- L'œuvre de départ de S4 est désormais **ensemencée** (ligne, version 1, tentative 1).
- Les **deux régénérations**, sujet du cas, passent toujours par la vraie route.
- Durées mesurées ensuite, en ms : S0 710 · S1 1 288 · S2 651 · S3 1 287 · S4 1 290 · S5 645 · S6 1 287.

**Les tests mordent** (mutations, toutes restaurées, octet pour octet) :
- route d'avant restaurée → 7 tests sur 7 rouges ;
- ligne de l'œuvre de nouveau écrite en échec → S2 et S3 rouges ;
- colonne ajoutée au SQL seul → cliquet ① rouge.

**Migration éprouvée en local** [OBSERVÉ-LOCAL] : Postgres 17.11 jetable, schéma = DDL versionné de `journal.ts` + la clé des versions posée en production. Sortie : `essai-migration-tentatives.txt`.
- La table naît vide. Relance sans erreur.
- **Empreinte md5 ligne à ligne de l'existant identique** avant migration, après migration et après annulation.
- Mise à jour d'une tentative : **refusée** par le déclencheur.
- Refusés : tentative sans œuvre, rang en double, fin avant début, issue ou nature inconnue, rang 0.
- Changer l'identifiant ou supprimer une œuvre qui a des tentatives : **refusé par la clé des tentatives**. L'essai est discriminant, sur une œuvre sans version. Témoin : sans tentative, la même suppression passe.
- Rôle `anon` sous privilèges par défaut à la Supabase : lecture et écriture refusées. RLS active et forcée.
- Suppression d'une tentative : acceptée. Annulation idempotente ; ré-application après annulation : table vide.
- 0 « ÉCHEC DE L'ESSAI ».

**Vérification** : `npm run verifier` → exit 0, 30 étapes en succès, seul rouge `socle/npx eslint .` (absorbé, préexistant). `npx tsc --noEmit` propre ; `rm -rf .next && npm run build` → exit 0.

Les cinq cliquets du dépôt qui ont mordu en cours de route ont été satisfaits **sans abaisser aucun seuil** :
- `rpcVersioning` : révocation sur la fonction du déclencheur ;
- `postgrestProjectionFidelity` : le double du test ⑧ vérifie la projection et le filtre ;
- `travailleur-isolation` : le nom de la table des œuvres vient de `journal.ts` ;
- `ep364` : `motifTexte`.

### 6.4 Ordre d'application, et ce qui reste à prouver

1. **Le propriétaire applique** `app_generation_attempts.sql` dans `nexiora-ai / main`. Les comptes de contrôle restent à 75 / 51 (blocs SQL fournis séparément).
2. **Ensuite seulement**, le code est poussé et déployé. Dans l'ordre inverse, chaque génération partirait en alerte « tentative non écrite ».
3. **Preuve en production** : une génération neuve faite par l'interface, puis `select … from app_generation_attempts where generation_id = …` doit rendre 1 ligne `generation / livree / version_rang 1`. Coût du tir à annoncer avant ; feu vert requis.
4. La preuve sur une **régénération réelle** attend la réouverture du bouton, décision du propriétaire.

### 6.5 Application en production — 2026-11-15 [OBSERVÉ-PROD, captures du propriétaire]

Projet `nexiora-ai`, branche `main` (PRODUCTION). Appliquée **par le propriétaire** ; je n'ai rien appliqué.

**Première pose (18:58 – 19:00, heure de Toronto)**

| Bloc | Résultat |
|---|---|
| 1 (avant) | `75 \| 51 \| NULL` |
| 2 (migration) | `Success. No rows returned` |
| 3a | 7 lignes, les 7 contraintes attendues |
| 3b | `1 \| true \| true \| 0` |
| 3c | 0 ligne |
| 3d | `75 \| 51` |

**Puis, par erreur, l'annulation (19:01)** : `drop table` + `drop function` → `Success`.
- La table était vide (bloc 3b, 0 ligne) : **rien n'a été perdu**.
- `app_generations` et `app_generation_versions` ne sont pas concernées.

**Contrôle de propreté (19:07)** : `table_tentatives NULL · index_tentatives NULL · fonctions 0 · declencheurs 0 · oeuvres 75 · versions 51 · cle_versions 1`.
- La suppression n'a laissé **aucune trace**.
- La clé des versions, posée plus tôt dans la journée, est intacte.

**Seconde pose (19:08 – 19:10)**

| Bloc | Résultat |
|---|---|
| 2 (migration) | `Success. No rows returned` |
| 3a | 7 lignes, les 7 contraintes attendues |
| 3b | `1 \| true \| true \| 0` |
| 3c | 0 ligne |
| 3d | `75 \| 51` |

**Verdict :**
- la table `app_generation_attempts` est **en place en production**, vide, ajout seul, fermée au navigateur [OBSERVÉ-PROD] ;
- l'existant est inchangé (75 / 51 à chaque relevé) ;
- le code peut être déployé, la migration l'ayant précédé.

### 6.6 Déploiement du code — 2026-11-15 [OBSERVÉ-PROD]

- `npm run verifier` : exit 0 (seul rouge `socle/npx eslint .`, absorbé).
  - Un premier passage était rouge sur `test_marge` (S4, allégé, §6.3).
  - Un deuxième était rouge sur `gestionMontee.test.ts` (1 690 ms, test étranger à ce lot, sensible à la charge). Il est vert au troisième, sans modification.
- Poussé : `main` = `feat/tentatives-generation` = `d9f4812e` (vérifié par `ls-remote`). Ordre respecté : migration d'abord, code ensuite.
- `https://www.deribfy.com/api/version` → `{"commit":"d9f4812"}` (≈ 19:46, heure de Toronto).
- Journaux Vercel de production, dernière heure : 0 ligne `level:error`, 0 ligne contenant « tentative ». `/admin/applications` répond 200.
- **Limite de cette absence d'alerte :** la génération est en pause (`NEXT_PUBLIC_GENERATION_ASYNC=0`), donc **aucune** génération n'a tourné. L'absence d'alerte ne prouve pas que l'écriture fonctionne : seule la preuve en production (§6.4.3) le fera.

**Non vérifié :**
- le rendu de `/admin/applications` avec des tentatives, sans session administrateur ;
- le comportement sous Postgres de production (version non relevée).

### 6.7 « Régénérer » séparé de la génération neuve — 2026-11-16 [OBSERVÉ-PROD]

Décision du propriétaire (option A) : « Régénérer » reçoit son propre interrupteur, pour pouvoir ouvrir la génération neuve le temps de la preuve (§6.4.3) sans le rouvrir.

- **Variable :** `NEXT_PUBLIC_REGENERATION_OUVERTE`, ouverte seulement par `1`. Elle est absente en production, donc fermée (vérifié par `vercel env ls production`).
- **Lecteurs :** le bouton du tableau de bord, et la route `POST /api/generateur/direct?id=…`, qui refuse en 409 avant la clé, le corps et tout appel payant. Avant ce lot, la route n'avait **aucun** verrou : la pause du 2026-11-14 ne fermait que le bouton.
- **Preuves :** scénario S7 et cliquet `lib/apps/__tests__/regeneration.test.ts`. En retirant le verrou serveur, S7 et ③ rougissent.
- **Défaut trouvé dans mes tests du manque 4 :** S2 et S3 dépendaient de l'horloge. Ils lisaient 0,0451 $ au lieu de 0,0226 $ le lundi à 07:31 UTC, heure de pointe DeepSeek où le tarif double. L'heure des scénarios est maintenant figée (`be091daf`).
- **Vérification complète :** `npm run verifier`, sortie 0 (seul rouge `eslint`, absorbé). Un passage intermédiaire a rougi sur `test_marge` (S7 à 1,9 s), corrigé en ensemençant l'œuvre de départ ; S7 tourne en 555 ms.
- **Déploiement :** `main` = `be091daf`. `/api/version` → `{"commit":"be091da"}` à 07:48:25 UTC.
- **Code servi au navigateur, lu dans les fichiers JavaScript de production :**
  - tableau de bord : `let F="1"===t.default.env.NEXT_PUBLIC_REGENERATION_OUVERTE`. La variable est absente au build, donc `F` vaut `false` et seul « Bientôt disponible » s'affiche ;
  - accueil : `let U=(0,$.modeAsyncActif)("0")`, donc le bouton « Application » est fermé.
- **Journaux Vercel de production, 15 minutes après le déploiement :** 0 erreur, 0 ligne « tentative ».

**Non vérifié :** l'écran connecté lui-même, faute de session dans cette vérification ; le refus 409 en production, faute de jeton.

### 6.8 PREUVE EN PRODUCTION — 2026-11-16 [OBSERVÉ-PROD, captures du propriétaire]

Le propriétaire a ouvert la génération neuve, lancé **une** génération par l'interface (« Test Manque 4 — carnet de dépenses »), puis refermé la génération neuve. « Régénérer » est resté fermé.

`app_generation_attempts` contient **exactement une ligne** :

| Colonne | Valeur |
|---|---|
| `generation_id` | `ef085fa7-5272-48e2-a93d-acc5b62be8c6` |
| `rang` | 1 |
| `nature` | `generation` |
| `issue` | `livree` |
| `debut_le` | 2026-11-16 08:11:53.509+00 |
| `fin_le` | 2026-11-16 08:20:17.701+00 |
| `cout_usd` | 0.1856 |
| `duree_ms` | 504 192 |
| `diagnostics` | « Application PARTIELLEMENT éprouvée : 10 sur 12 (83 %) des controles des 2 ecran(s) atteint(s) », « L'application ne se monte pas (simulateur) : Cannot read properties of undefined (reading 'valeur') » |

La ligne de l'œuvre dans `app_generations` : `id` identique, `nom` carnet de dépenses, `statut livree`, `created_at` 08:20:17.338814+00, `duree_ms` 503 683, `cout_usd` 0.1856.

**Le critère est rempli en production, plus seulement en simulation :** la tentative est écrite, avec son issue, ses heures de début et de fin, son coût, sa durée et ses diagnostics, et elle est liée à son œuvre.

**Non relevé sur ces captures :** `jetons_entree`, `jetons_sortie`, `version_rang`, `trace`, `trace_tronquee`. La requête du propriétaire ne les sélectionnait pas. La présence de la trace en production n'est donc pas encore observée.

**Coût :** 0,1856 $. C'est au-dessus de l'estimation annoncée (environ 0,05 $, pire observé 0,15 $), et sous le plafond prudent de 0,31 $. Le tir est parti à 08:11 UTC un lundi, en **heure de pointe** DeepSeek (06:00–10:00 UTC), où le tarif double.

**Éclaircissement demandé — `created_at` est posé à la livraison, pas au lancement.** [LU-CODE + OBSERVÉ-PROD]
- La route n'écrit jamais `created_at` : la colonne prend `default now()` (`journal.ts:411`).
- La ligne d'une œuvre neuve n'est insérée qu'**à la fin** du travail (`route.ts`, `insert(charge)` après la boucle).
- D'où `created_at` = 08:20:17.338, quelques centaines de millisecondes avant l'écriture de la tentative (08:20:17.701).
- L'heure de lancement n'existe **que** dans `debut_le` de la tentative.
- Pour une régénération, la ligne est mise à jour : `created_at` garde la date de la première génération.

**Deux découvertes au passage, consignées sans être traitées :**
- l'écran a abandonné alors que la génération réussissait (`DEFAUT_ABANDON_ECRAN.md`) ;
- l'œuvre est `livree` alors qu'elle ne se monte pas (§5 bis).

### 6.9 Incident — la génération neuve rouverte par un push de documentation (2026-11-16) [OBSERVÉ-PROD]

- **Cause :** après le tir, la génération neuve avait été refermée à l'écran, mais `NEXT_PUBLIC_GENERATION_ASYNC` valait encore `1` dans Vercel (lu par `vercel env pull`). Le push de documentation `bbcdc4ca` a déclenché un nouveau build, qui a figé `modeAsyncActif("1")`.
- **Ouverte à tous** d'environ 08:51 UTC (`/api/version` → `bbcdc4c`) à environ 10:10 UTC (redeploy du propriétaire, heure déduite de `vercel ls` : « 16m » à 10:26). « Régénérer » est resté fermé tout du long (variable absente, refus 409 de la route).
- **Fermeture vérifiée à 10:26 UTC :**
  - la variable Vercel vaut `0`, et `NEXT_PUBLIC_REGENERATION_OUVERTE` est absente ;
  - le code servi contient `U=(0,$.modeAsyncActif)("0")` et `let F="1"===…NEXT_PUBLIC_REGENERATION_OUVERTE`, ce qui ferme les deux portes ;
  - le moteur est `direct`, donc le suivi asynchrone est éteint.
- **Aucune génération pendant la fenêtre** [OBSERVÉ-PROD, requête du propriétaire, 2026-11-16] : `select id, owner_id, statut, cout_usd, created_at from public.app_generations where created_at between '2026-11-16 08:51:00+00' and '2026-11-16 10:15:00+00'` → **0 ligne**. La réouverture accidentelle n'a entraîné aucune génération : aucun coût, aucune œuvre produite par un tiers.
  - *Réserve :* `created_at` est posé à la **fin** du travail (§6.8). Une génération lancée juste avant la fermeture et terminée après 10:15 échapperait à cette requête. La vérification par l'heure de **lancement**, `select generation_id, issue, cout_usd, debut_le from public.app_generation_attempts where debut_le between '2026-11-16 08:51:00+00' and '2026-11-16 10:15:00+00';`, a été lancée par le propriétaire le 2026-11-16 → **0 ligne** [OBSERVÉ-PROD, capture]. **Réserve levée** : aucune génération n'a été lancée pendant la fenêtre, et aucune n'a été livrée après.
  - **Cette vérification n'était possible que grâce à `debut_le`.** `app_generations` seule ne pouvait pas y répondre : son `created_at` est posé à la fin du travail. C'est un premier usage concret du manque 4 en production.
  - *Limite connue, sans incidence ici :* une exécution tuée par la plateforme avant d'écrire, au-delà de `maxDuration = 900 s`, ne laisserait aucune tentative. Le seul cas possible était un lancement vers 10:00–10:10, et rien ne le signale.
- **Règle retenue :** avant tout push sur `main`, lire la valeur réelle des interrupteurs dans Vercel.

