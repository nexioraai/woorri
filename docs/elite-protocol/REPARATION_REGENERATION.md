# Réparation — défaut de régénération

- **Date :** 2026-11-15.
- **Branche :** `fix/regeneration-identifiant`, partie de `origin/main` @ `27e83891` (production).
- **Non poussée, non déployée.**
- **Migration :** écrite et éprouvée sur un Postgres local jetable. **Non appliquée en production.**
- **Bouton « Régénérer » :** toujours fermé. Ni `apps/web/src/app/dashboard/page.tsx` ni la variable `NEXT_PUBLIC_GENERATION_ASYNC` n'ont été touchés.
- **Preuve d'origine :** `PREUVE_REGENERATION.md`. **Pièces brutes :** `evidence/reparation-regeneration/`.

**Chemins.** Ils sont relatifs à `apps/web/src/`.
- `D` = `app/api/generateur/direct/route.ts`.
- `D@main:N` = ligne N **avant** réparation (`27e83891`).
- `D:N` = ligne N **après** réparation (cette branche).
- `P` = `app/dashboard/page.tsx` (inchangé).

**Étiquettes.**
- **[LU]** lu dans le code.
- **[OBSERVÉ-SIMULATION]** vraies poignées, base en mémoire, faux fournisseur.
- **[OBSERVÉ-LOCAL]** Postgres 17.11 local jetable.
- **UNKNOWN** non observé.

---

## Étape 1 — Pourquoi l'UUID neuf existait

**Ce que dit le code** [LU]
- L'identifiant est tiré à `D@main:606` : `const idOeuvre = randomUUID()`.
- Il est introduit par le commit `3d4663aa` (2026-11-02), « La porte vérifie l'APPARTENANCE ».
- Le commentaire `D@main:596-605` et le message de commit le justifient : *« L'IDENTIFIANT SE DÉCIDE AVANT L'INSERTION. La porte le cite, donc il faut le connaître avant d'émettre les politiques. »*

**Il a un usage légitime, et pas un seul** [LU]

| Où | Usage |
|---|---|
| `D@main:607` | `emettrePolitiquesSql(entitesCourantes, idOeuvre)` : les politiques RLS de l'œuvre **cuisent** cet identifiant. Un jeton doit porter `app_metadata.oeuvre = <id>` pour lire ou écrire les données de l'œuvre. |
| `lib/apps/base-de-l-oeuvre.ts:49` | `schema: nomSchemaOeuvre(idOeuvre)` : le **nom du schéma** de la base publiée dérive de l'identifiant (`lib/apps/poser-oeuvre.ts:71`). |
| `lib/apps/compte-oeuvre.ts:72-75, 174, 205, 219, 256, 269` | L'adresse du compte de l'œuvre et la revendication `app_metadata.oeuvre` des comptes en dérivent. |
| `app/api/generateur/publier/route.ts:337`, `app/api/generateur/retoucher/route.ts:223, 620`, `app/api/generateur/compte/route.ts:185` | Ces trois routes emploient **l'identifiant de la ligne** comme identifiant de l'œuvre. |
| `D@main:899` | L'identifiant est rendu au client (`id: ecrit.data?.id`). |

**Conclusion de l'étape 1**
- Le besoin réel est : *connaître l'identifiant de l'œuvre avant d'émettre ses politiques*.
- Pour une **œuvre neuve**, il faut le tirer, et c'est légitime.
- Pour une **régénération**, l'identifiant de l'œuvre existe déjà : c'est `idExistant` (`D@main:334`).

**Le tirer à nouveau causait un second dommage, jamais observé mais lisible** [DÉDUIT]
- Les politiques de la nouvelle version auraient nommé un identifiant neuf.
- Les comptes déjà ouverts sur l'œuvre portent l'ancien (`compte-oeuvre.ts:205-219`).
- La porte de l'œuvre régénérée serait donc **fermée à tous ses utilisateurs existants**.

**La correction préserve donc l'usage :** une œuvre neuve tire un identifiant ; une régénération **réemploie** le sien. Aucune ligne n'est supprimée.

---

## Étape 2 — Les corrections (`D`, un seul fichier : +104 / −8)

### a) L'identifiant ne change plus

**`D:611-625`** : `const idOeuvre = idExistant !== '' ? idExistant : randomUUID()`
- La charge `id: idOeuvre` (`D:651`) porte désormais, en régénération, l'identifiant **déjà en place**.
- L'`update` ne réécrit donc plus la clé primaire.
- Les versions s'ajoutent sous ce même identifiant (`D:930-936`), donc au **rang suivant**, et non plus au rang 1.

**Une régénération qui échoue ne touche plus à l'œuvre** (`D:826-843`)
- En échec de régénération, la charge écrite **exclut** `document`, `statut` et `ok` (`COLONNES_DE_L_OEUVRE`, `D:839`).
- Seule la **trace** de la tentative est écrite : coût, durée, jetons, tours, diagnostics.
- Sans cela, l'identifiant aurait été stable, mais l'œuvre aurait quand même perdu `document` et serait passée en `refusee`. La promesse (c) restait fausse.

> **Choix à valider.** Que la trace de la tentative ratée **remplace** la trace précédente de la ligne est le défaut connu « Régénérer écrase la trace » (ETUDE_LANGSMITH.md §2e, trou 4). Il est **hors de ce chantier** et n'a pas été traité.
>
> Effet visible après réparation, scénario A (§3) : la ligne reste `livree` avec son document, mais ses colonnes de trace décrivent la tentative ratée (`cout_usd 0.0226`, `tirages 3`, `diagnostics ["Non convergé en 3 tours."]`).
>
> L'autre option, ne rien écrire du tout en cas d'échec, aurait effacé le coût de la tentative de la base. J'ai gardé le comportement de trace existant.

### b) Chaque écriture de la route est examinée

Inventaire des écritures de `D` et ce qui est fait de leur erreur rendue (`supabase-js` ne lève pas, il rend `{ error }`) :

| Écriture | Avant | Après |
|---|---|---|
| Ligne de l'œuvre, insert ou update | `D@main:808-817`, résultat jamais lu | `D:863-879`. `error` **ou zéro ligne touchée** donnent `console.error` + alerte (`etape: 'ecriture'`, coût inclus) + réponse `ok: false` : « Le résultat n'a pas pu être enregistré. Votre version actuelle n'a pas été modifiée. » (ou « Rien n'a été conservé. » pour une œuvre neuve). L'écran n'annonce plus une version qui n'existe pas. |
| Lecture des rangs avant la version | `D@main:843-847`, erreur ignorée, rang calculé sur `[]` | `D:928-930`. En erreur, **aucune** version n'est écrite (un rang faux écraserait l'histoire), puis journal + alerte. |
| Insertion de la version | `D@main:849-858`, `console.error` seul, le pointeur bougeait quand même | `D:940-942`. Journal + alerte, et **le pointeur ne bouge pas** vers un rang non écrit. |
| Déplacement du pointeur `version_courante` | `D@main:868-872`, jamais lu | `D:949-959`. Journal + alerte. |
| Purge des vieux rangs | `D@main:877`, jamais lue | `D:961-971`. Journal + alerte. |
| Trace de la boucle qui a jeté (chemin B) | `D@main:546-555`, `{ error }` jamais lu (le `catch` ne pouvait rien attraper) | `D:548-561`. `console.error`. **Comportement inchangé sinon**, comme demandé pour B. |

- Les écritures d'historique ne font **toujours pas** échouer la livraison. C'est la décision existante, inchangée (`D@main:829-831`) : l'œuvre est payée et écrite.
- La seule **lecture** non examinée de `D` est la sonde `GET` (`D:123-128`) : ce n'est pas une écriture, elle n'a pas été touchée.

### c) La promesse de la boîte de confirmation

La promesse est « La version actuelle est conservée : si le résultat vous plaît moins, vous revenez dessus en un clic, gratuitement » (`P:195-196`).

| Cas | Constat après réparation |
|---|---|
| **Échec (A)** | « Conservée » est **vrai**. Ligne `livree`, document intact, aperçu 200, carte ouvrable, historique intact (§3). |
| **Réussite (C)** | « Vous revenez dessus en un clic » est **vrai**. Après la régénération, l'historique propose le rang 1 comme restaurable, avec `courante: 2`. Le bouton « revenir à celle-ci » s'affiche donc (`P:885`). |
| **Échec fournisseur (B)** | « Conservée » est **vrai**, comme avant la réparation. |

**Le clic lui-même a été éprouvé à part** [OBSERVÉ-SIMULATION], dans un essai séparé, pour ne pas modifier l'essai identique : `evidence/reparation-regeneration/promesse-retour.test.ts.txt` et `promesse-retour.json`. Il exécute :
1. génération v1 ;
2. régénération réussie avec un code **différent** (v2 ≠ v1 dans l'aperçu) ;
3. `POST /api/generateur/version?id=…&rang=1`, le geste de `P:260-261`.

Résultat :
- HTTP 200, `{ ok: true, courante: 1 }` ;
- l'aperçu redevient **identique octet pour octet** à celui de la v1 ;
- l'historique garde les deux versions.

**Le texte du message n'a pas été modifié.**

**UNKNOWN**
- Le rendu réel du bouton dans un navigateur : l'écran n'a pas été exécuté, seule la condition `P:885` a été lue.
- Le comportement de l'atelier (`app/atelier/[id]/page.tsx`).

---

## Étape 3 — L'essai identique, rejoué

**Identité du test**
- Le fichier exécuté est la **copie octet pour octet** de `evidence/preuve-regeneration/preuve-regeneration.test.ts.txt`.
- SHA-256 `02d9db0aef2de586662e59f5b902f67628952c4c2b5bc45987b8fd55c42946b6`, identique des deux côtés, vérifié par `cmp`.
- Il a été placé au même chemin, exécuté, puis retiré de l'arbre.

**Résultat :** 3/3 passés, `Test Files 1 passed (1)` (`evidence/reparation-regeneration/sortie-vitest.txt`). Relevés : `evidence/reparation-regeneration/releves.json`.

**Comparaison, état APRÈS régénération.** Avant = `evidence/preuve-regeneration/releves.json` ; après = `evidence/reparation-regeneration/releves.json`.

### Scénario A — non-convergence

| Champ | AVANT réparation | APRÈS réparation |
|---|---|---|
| Identifiant d'origine encore présent | **non** (ligne re-clée) | **oui** |
| Lignes `app_generations` | 1, sous un nouvel identifiant | 1, même identifiant |
| `statut` / `ok` | `refusee` / `false` | `livree` / `true` |
| `document` | `null` | 6 fichiers |
| `version_courante` | (ligne disparue) | 1 |
| Versions sous l'identifiant d'origine | rang 1, **orpheline** | rang 1, rattachée |
| Aperçu `GET /direct/ID0` | **404** | **200** |
| Cartes | 1 : `refusee`, `revoyable: false` | 1 : `livree`, `revoyable: true` |
| Historique de `ID0` | « application inconnue » | `[rang 1 restaurable]`, `courante: 1` |
| Message d'écran | « Non convergé en 3 tours… » | identique |
| Trace de la ligne (`cout_usd`, `tirages`, `diagnostics`) | celle de l'échec | celle de l'échec : `0.0226`, `3`, `["Non convergé en 3 tours."]` (trou 4, hors chantier) |

### Scénario B — erreur du fournisseur

| Champ | AVANT | APRÈS |
|---|---|---|
| Ligne d'origine | intacte | intacte, valeurs identiques |
| Ligne ajoutée | 1, `refusee`, sans nom, `document: null` | identique |
| Aperçu | 200 | 200 |
| Cartes | `livree` + `refusee` | identique |
| Historique | rang 1, `courante: 1` | identique |
| Message d'écran | « 503 {…} » | identique |

### Scénario C — régénération réussie (témoin)

| Champ | AVANT | APRÈS |
|---|---|---|
| Identifiant d'origine encore présent | **non** | **oui** |
| Versions | `ID0`/rang 1 orpheline + `ID3`/rang 1 | `ID0` : rang 1 `livraison` **+ rang 2 `regeneration`** |
| `version_courante` | 1 (sous `ID3`) | **2** |
| Aperçu `GET /direct/ID0` | **404** | **200** |
| Historique de `ID0` | « application inconnue » | `[rang 1, rang 2]`, tous deux restaurables, `courante: 2` |
| Message d'écran | « Nouvelle version créée. » | identique |

### Verdicts

| Scénario | Verdict | Raison |
|---|---|---|
| **A** | **RÉPARÉ** [OBSERVÉ-SIMULATION] | Plus d'orphelin, plus de changement d'identifiant ; l'œuvre reste ouvrable et sa version actuelle est conservée. |
| **B** | **INCHANGÉ, comme attendu** [OBSERVÉ-SIMULATION] | Tous les champs relevés sont identiques à avant. Le chemin `catch` lit désormais l'erreur d'insertion, sans effet observable ici. |
| **C** | **RÉPARÉ** [OBSERVÉ-SIMULATION] | L'historique n'est plus coupé : rang 2 sous le même identifiant, retour au rang 1 éprouvé en un clic (§c). |

### Non-régression [OBSERVÉ-LOCAL]

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | silencieux |
| `npx eslint D` | 0 erreur. 1 avertissement **préexistant** (`EntiteDonnees` inutilisé, `D:40`), aucun nouveau. |
| `rm -rf .next && npm run build` | exit 0 |
| Tests existants de la route (`direct/__tests__/route.test.ts`) | 9/9 |
| Suite complète `apps/web` | `Test Files 483 passed (483)`, `Tests 6293 passed (6293)` |
| Gate `npm run verifier` (identique au CI) | exit 0, « ✅ aucune régression ». 29 étapes `success`. Seul rouge : `socle/npx eslint .`, **absorbé**, déjà rouge sur `main`. Durée 9,5 min. |

**Niveau de preuve**
- La correction est prouvée **en simulation**.
- Aucune régénération réelle n'a été lancée : le bouton est fermé, et le geste serait payant.

---

## Étape 4 — La clé étrangère

**Fichiers**
- `apps/web/supabase/sql/app_generation_versions_fk_generation.sql` : la migration.
- `apps/web/supabase/sql/app_generation_versions_fk_generation_annulation.sql` : son annulation.

**Ce qu'elle pose :** `app_generation_versions.generation_id → app_generations(id) ON UPDATE RESTRICT ON DELETE RESTRICT`.

**Pourquoi RESTRICT dans les deux sens**
- **À la mise à jour.** Changer l'identifiant d'une œuvre qui a des versions est *exactement* le défaut. `CASCADE` l'aurait rendu silencieux (les versions auraient suivi), au lieu de le rendre impossible. L'identifiant est cuit dans la porte, le schéma publié et les comptes : il ne doit jamais changer.
- **À la suppression.** Le produit ne supprime **jamais** physiquement une œuvre.
  - La suppression est douce : statut `supprimee`.
  - La purge ne vide que `document` et garde la ligne comme pierre tombale (`app/api/cron/purge-supprimees/route.ts:1-24` et `:56-61`).
  - Une suppression physique est donc un geste manuel ou un accident. Chaque version est une œuvre payée : `CASCADE` les effacerait en silence.
  - Les tirs qui suppriment leurs lignes d'essai (`tirs/*.tir.ts`) les insèrent directement, sans version [LU : aucune occurrence de `TABLE_VERSIONS` dans `src/tirs/`]. Ils ne sont pas touchés.

**Sûreté de la migration**
- Elle **re-compte les orphelins** dans sa transaction. S'il y en a, elle s'arrête avec leur nombre et **ne pose rien, n'efface rien**.
- Elle est idempotente.
- Elle ne réécrit aucune donnée.

**Essai local** [OBSERVÉ-LOCAL]
- Environnement : Postgres 17.11 jetable, port 5499, schéma = DDL versionné de `lib/apps/journal.ts` (extrait par `extraire-ddl.mts`).
- Sortie complète : `evidence/reparation-regeneration/essai-migration-local.txt`. Script : `essai-migration.sh.txt`.

| # | Essai | Résultat |
|---|---|---|
| 1 | Migration avec 1 orphelin présent | **arrêtée** : « MIGRATION ARRÊTÉE : 1 version(s) orpheline(s)… Rien n'a été posé. » Clé : aucune. Orphelin toujours là. |
| 2 | Migration sur base saine (1 œuvre, 2 versions) | appliquée : `FOREIGN KEY (generation_id) REFERENCES app_generations(id) ON UPDATE RESTRICT ON DELETE RESTRICT` |
| 3 | Relance | sans erreur, une seule clé |
| 4 | **Le défaut** : `update app_generations set id = gen_random_uuid()` sur une œuvre versionnée | **refusé** (`violates foreign key constraint`) |
| 5 | `delete` physique d'une œuvre versionnée | **refusé** |
| 6 | Insertion d'une version sans œuvre | **refusée** |
| 7 | Mise à jour ordinaire, nouvelle version, purge d'une version, suppression d'une œuvre **sans** version | **acceptées**. Données intactes : 1 œuvre, 2 versions. |
| 8 | Annulation, puis relance de l'annulation | clé retirée ; relance sans erreur ; données intactes ; le changement d'identifiant redevient possible (comportement d'avant). |
| 9 | Ré-application avec les orphelins créés au point 8 | **arrêtée** (2 orphelins), rien posé |

**Ordre de déploiement** [DÉDUIT]
- La clé doit être posée **après** le déploiement du code réparé, ou en même temps.
- Avec le code de `main` actuel et la clé posée, une régénération verrait son `update` refusé, et l'ancien code ne lit pas l'erreur.
- Le bouton étant fermé, le risque immédiat est nul.

**UNKNOWN**
- La version de Postgres en production : l'essai a tourné sous 17.11.
- Le temps de verrou en production : `ALTER TABLE … ADD CONSTRAINT` valide toutes les lignes sous verrou. Les tables sont petites (0 orphelin relevé), mais leur taille n'a pas été mesurée.

**Écart consigné, non corrigé**
- Le DDL versionné de `lib/apps/journal.ts` (`sqlVersionsPour`, `:683-709`) ne porte pas cette clé.
- `SQL_VERSIONS` (`journal.ts:716`) n'a aucun appelant [LU].
- Le fichier de migration est donc la seule source de cette contrainte, tant qu'on ne décide pas d'aligner le DDL.

---

## Ce qui n'a pas été fait (périmètre)

- Bouton « Régénérer » **non rouvert**.
- **Aucune** donnée réécrite en base. **Aucune** migration appliquée en production. **Aucun** déploiement, **aucun** push.
- Les quatre trous de la trace : **non traités**.
- Scénario B : la carte « refusee » sans nom ajoutée à côté de l'œuvre (`D:548-557`, chemin `catch`) est **inchangée**, comme demandé. Elle reste un comportement discutable, consigné ici.

## Constaté en passant (consigné, non corrigé)

- **La purge ne purge pas les versions.** `cron/purge-supprimees` vide `document` de la ligne (`:56-61`) mais ne touche pas `app_generation_versions`. Les fichiers d'une œuvre supprimée survivent donc dans l'historique au-delà des 30 jours annoncés (« les fichiers partent », `:2`) [LU].
