# Enquête — pourquoi le générateur livre des œuvres incomplètes

- **Ouverte :** 2026-11-16, sur instruction du propriétaire. Les manques 1 à 3 sont reportés.
- **Statut :** CLOS le 2026-11-16. Les temps 1, 2 et 3 sont rédigés, et R10–R12 (§4) sont mesurées (§1.3). La conclusion est au §5 ; l'ordre recommandé des corrections et les questions ouvertes sont au §6. Aucune correction n'a été faite : la suite est la décision du propriétaire.
- **Règles :** aucune correction, aucune migration, aucun changement de code, aucune génération payante. « Régénérer » et la génération neuve restent fermés.
- **Niveaux :** [OBSERVÉ-PROD] vient d'un résultat de requête du propriétaire ; [LU-CODE] vient de la lecture du dépôt (`main` @ `bb3255ed`) ; [UNKNOWN] n'est pas mesuré.

---

## 0. Avertissement de lecture, établi AVANT toute mesure [LU-CODE]

Le diagnostic « Application PARTIELLEMENT éprouvée : 10 sur 12 (83 %) des controles des 2 ecran(s) atteint(s) » ne mesure **pas** ce qu'il semble dire.

| Ce qu'on lit | Ce que le code mesure | Source |
|---|---|---|
| « 10 sur 12 » | 10 contrôles **ouverts et jugés** par le juge d'exécution, sur 12 contrôles **découverts** | `juge-execution.ts:66-72` (`ecransVisites`, `ecransDecouverts` : les noms disent « écrans », les commentaires disent « contrôles ») |
| « 12 » | seulement les contrôles des écrans que le juge a **atteints**. Ceux d'un écran jamais ouvert ne comptent nulle part | `portee-epreuve.ts:50-59` |
| « 2 ecran(s) atteint(s) » | les écrans que le **juge** a pu ouvrir, pas les écrans que l'œuvre **contient** | `juge-execution.ts:74`, `portee-epreuve.ts:60-62` |
| « ne se monte pas » | faux dès qu'il y a **une** erreur, même si l'application s'est affichée | `juge-execution.ts:238` (`monte && erreurs.length === 0`) |

Deux conséquences pour l'enquête :

1. **« L'œuvre livrée ne contient que deux écrans » n'est pas établi par ce diagnostic.** Il établit que le juge en a atteint deux. Le troisième peut être absent du code (H-A ou H-B), ou présent mais inatteignable pour le juge. La requête R9 tranche ce cas.
2. **Le taux est un taux d'exploration du juge, pas un taux de couverture de la demande.** Une œuvre à 23 % n'est pas forcément aux trois quarts vide : le juge a peut-être cessé d'explorer. Ce qui compare la demande à l'œuvre, c'est la **couverture** (`juge-couverture.ts`, statuts `couverte`, `nommee`, `declaree-hors-perimetre`, `absente`, `declaree-mais-centrale`, `:28-60`). D'où la requête R8.

## 1. Temps 1 — mesurer sur l'existant

Toutes les requêtes sont en **lecture seule** (`select` uniquement). Elles se lancent une par une dans l'éditeur SQL de nexiora-ai, branche main. Elles ont été essayées sur une table factice locale de même forme, y compris pour les lignes sans mesure, sans lecture du brief, et pour un juge indisponible : les 9 s'exécutent sans erreur. Cet essai prouve la syntaxe, pas les chiffres.

Population : `moteur = 'direct'`. Les œuvres de l'ancien moteur (`air`) n'ont ni juge d'exécution, ni tours, ni couverture.

### R1 — L'inventaire : combien d'œuvres par moteur et par statut.

```sql
select moteur, statut, count(*) as oeuvres,
       min(created_at)::date as premiere, max(created_at)::date as derniere
from public.app_generations
group by moteur, statut
order by moteur, statut;
```

**Ce que tu regardes :** Le nombre d'œuvres `direct / livree`. C'est la population de toutes les requêtes suivantes ; les œuvres de l'ancien moteur n'ont pas de juge d'exécution.

### R2 — La distribution des taux de contrôles atteints sur les œuvres livrées.

```sql
select case
         when jsonb_typeof(sections_acquises->'execution') is distinct from 'object' then '0 · aucune mesure'
         when sections_acquises->'execution' ? 'indisponible' then '1 · juge indisponible'
         when coalesce((sections_acquises->'execution'->>'ecransDecouverts')::int, 0) = 0 then '2 · aucun controle trouve'
         else '3 · ' || lpad((floor(10.0 * (sections_acquises->'execution'->>'ecransVisites')::int
                                      / (sections_acquises->'execution'->>'ecransDecouverts')::int) * 10)::int::text, 3, ' ') || ' %'
       end as tranche_taux,
       count(*) as oeuvres
from public.app_generations
where moteur = 'direct' and statut = 'livree'
group by 1
order by 1;
```

**Ce que tu regardes :** Combien d'œuvres sont dans chaque tranche de 10 %. Et surtout les lignes « 0 · aucune mesure », « 1 · juge indisponible », « 2 · aucun contrôle trouvé » : ce sont des œuvres livrées sans aucune mesure de taux.

### R3 — Une ligne par œuvre livrée : taille de la demande, écrans prévus, écrans atteints, contrôles, montage, tours, coût.

```sql
select left(id::text, 8) as oeuvre,
       to_char(created_at, 'MM-DD HH24:MI') as quand,
       length(demande) as signes,
       case when jsonb_typeof(sections_acquises->'lectureBrief'->'ecrans') = 'array'
            then jsonb_array_length(sections_acquises->'lectureBrief'->'ecrans') end as ecr_prevus,
       (sections_acquises->'execution'->>'ecransDistincts')::int as ecr_atteints,
       (sections_acquises->'execution'->>'ecransVisites')::int as ctl_vus,
       (sections_acquises->'execution'->>'ecransDecouverts')::int as ctl_trouves,
       sections_acquises->'execution'->>'monteDansSimulateur' as monte,
       tirages as tours,
       (document->'fichiers') ? 'PERIMETRE.md' as perimetre,
       round(cout_usd, 4) as cout
from public.app_generations
where moteur = 'direct' and statut = 'livree'
order by created_at;
```

**Ce que tu regardes :** `ecr_prevus` (écrans listés par la lecture de la demande, vide si la lecture n'était pas enregistrée à l'époque) face à `ecr_atteints` (écrans que le juge a pu ouvrir). Et `monte = false` sur des lignes livrées. Si le tableau est trop large pour une capture : Export → CSV, puis colle le texte.

### R4 — Le lien entre la taille de la demande et le taux obtenu.

```sql
with t as (
  select length(demande) as signes,
         case when coalesce((sections_acquises->'execution'->>'ecransDecouverts')::int, 0) > 0
              then (sections_acquises->'execution'->>'ecransVisites')::numeric
                   / (sections_acquises->'execution'->>'ecransDecouverts')::int end as taux
  from public.app_generations
  where moteur = 'direct' and statut = 'livree'
)
select case when signes < 500 then '1 · moins de 500'
            when signes < 2000 then '2 · 500 a 2 000'
            when signes < 8000 then '3 · 2 000 a 8 000'
            else '4 · 8 000 et plus' end as taille_demande,
       count(*) as oeuvres,
       count(taux) as mesurees,
       round(100 * avg(taux)) as taux_moyen_pct,
       round(100 * min(taux)) as taux_min_pct,
       round(100 * max(taux)) as taux_max_pct,
       round(corr(signes, taux)::numeric, 2) as correlation_dans_la_tranche
from t
group by 1
union all
select '5 · TOUTES', count(*), count(taux), round(100 * avg(taux)), round(100 * min(taux)),
       round(100 * max(taux)), round(corr(signes, taux)::numeric, 2)
from t
order by 1;
```

**Ce que tu regardes :** Le taux moyen par tranche de taille, et la corrélation de la ligne « TOUTES » : proche de −1, plus la demande est grande, plus le taux baisse ; proche de 0, aucun lien. Attention aux tranches à très peu d'œuvres (colonne `mesurees`).

### R5 — Le taux selon le nombre de tours.

```sql
with t as (
  select tirages,
         case when coalesce((sections_acquises->'execution'->>'ecransDecouverts')::int, 0) > 0
              then (sections_acquises->'execution'->>'ecransVisites')::numeric
                   / (sections_acquises->'execution'->>'ecransDecouverts')::int end as taux,
         length(demande) as signes
  from public.app_generations
  where moteur = 'direct' and statut = 'livree'
)
select tirages as tours, count(*) as oeuvres, count(taux) as mesurees,
       round(100 * avg(taux)) as taux_moyen_pct, round(avg(signes)) as signes_moyens
from t
group by tirages
order by tirages;
```

**Ce que tu regardes :** Si les œuvres à 2 ou 3 tours ont un meilleur taux que celles à 1 tour. C'est une CORRÉLATION seulement : le taux n'est mesuré qu'une fois, sur la version acceptée (aucun taux par tour n'est stocké). Comparer aussi `signes_moyens` : si les œuvres à 3 tours ont des demandes bien plus longues, la comparaison est faussée.

### R6 — Pourquoi les tours sont refusés.

```sql
select statut, left(coalesce(tour->>'motif', '(sans motif)'), 90) as motif_du_tour_refuse, count(*) as tours
from public.app_generations g,
     jsonb_array_elements(case when jsonb_typeof(g.sections_acquises->'tours') = 'array'
                               then g.sections_acquises->'tours' else '[]'::jsonb end) as tour
where g.moteur = 'direct' and (tour->>'ok')::boolean is false
group by 1, 2
order by 1, 3 desc;
```

**Ce que tu regardes :** Les motifs les plus fréquents. Ils disent ce que la boucle corrige : de l'assemblage, des jetons, ou des écrans manquants.

### R7 — La fréquence de chaque diagnostic, par statut.

```sql
select statut,
       count(*) as oeuvres,
       count(*) filter (where diagnostics::text ilike '%ne se monte pas%') as ne_se_monte_pas,
       count(*) filter (where diagnostics::text ilike '%PARTIELLEMENT%') as partiellement,
       count(*) filter (where diagnostics::text ilike '%n a PAS ete eprouvee%') as pas_eprouvee,
       count(*) filter (where diagnostics::text ilike '%jeton(s) inexistant%') as jetons_inexistants,
       count(*) filter (where diagnostics::text ilike '%sans action%') as controles_morts,
       count(*) filter (where diagnostics::text ilike '%Couverture partielle%') as couverture_partielle,
       count(*) filter (where diagnostics::text ilike '%DONNEES NON CONSERVEES%') as donnees_perdues,
       count(*) filter (where diagnostics::text ilike '%en repli%') as ecrans_en_repli
from public.app_generations
where moteur = 'direct'
group by statut
order by statut;
```

**Ce que tu regardes :** `ne_se_monte_pas` sur la ligne `livree` : le nombre d'œuvres livrées dont le diagnostic dit qu'elles ne se montent pas. Puis les autres colonnes : ce que le générateur SAIT au moment où il livre.

### R8 — Les exigences de la demande et leur statut final, sur toutes les œuvres livrées.

```sql
select e->>'statut' as statut_exigence, e->>'source' as source, count(*) as exigences,
       count(distinct g.id) as oeuvres
from public.app_generations g,
     jsonb_array_elements(case when jsonb_typeof(g.sections_acquises->'couverture'->'exigences') = 'array'
                               then g.sections_acquises->'couverture'->'exigences' else '[]'::jsonb end) as e
where g.moteur = 'direct' and g.statut = 'livree'
group by 1, 2
order by 1, 2;
```

**Ce que tu regardes :** Le nombre d'exigences `absente` (ni dans l'application ni déclarées hors périmètre) et `nommee` (mentionnées dans le code, sur aucun écran atteint). `source = demande` : termes tirés de la demande elle-même ; `famille` : familles d'exigences reconnues.

### R9 — Le cas du 16 novembre, en entier.

```sql
select 'demande' as quoi, demande as valeur
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
union all
select 'lecture du brief', sections_acquises->'lectureBrief'->>'resultat'
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
union all
select 'ecrans prevus (lecture)', (sections_acquises->'lectureBrief'->'ecrans')::text
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
union all
select 'ecrans atteints (juge)', (sections_acquises->'execution'->'ecrans')::text
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
union all
select 'erreurs (juge)', (sections_acquises->'execution'->'erreurs')::text
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
union all
select 'fichiers produits', (select string_agg(k, ', ' order by k) from jsonb_object_keys(document->'fichiers') k)
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
union all
select 'PERIMETRE.md', document->'fichiers'->>'PERIMETRE.md'
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
union all
select 'exigences (couverture)', (sections_acquises->'couverture'->'exigences')::text
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
union all
select 'tours', (sections_acquises->'tours')::text
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6';
```

**Ce que tu regardes :** La ligne `ecrans prevus (lecture)` : le formulaire d'ajout y figure-t-il ? C'est le test direct de H-A pour ce cas. Puis `ecrans atteints (juge)`, `fichiers produits`, `PERIMETRE.md` (ce que le modèle déclare ne pas livrer) et `erreurs (juge)`. Pour lire une cellule longue : double-clic, comme pour tes captures précédentes.

### Mesures impossibles ou partielles avec les données actuelles

- **Le nombre d'écrans DEMANDÉS** n'existe pas en base sous forme comptable. La demande est du texte libre. Le seul compte stocké est `lectureBrief.ecrans`, c'est-à-dire ce que **l'étape de lecture** a extrait de la demande. C'est précisément l'étape mise en cause par H-A : il ne peut pas servir d'étalon contre lui-même. Pour un étalon indépendant, il faut lire les demandes, à la main ou par un modèle, ce qui est payant ; je peux lire moi-même un échantillon de demandes si tu les exportes. La lecture n'est en outre enregistrée que pour les œuvres récentes : `ecr_prevus` vide dans R3 = **UNKNOWN**, pas zéro.
- **Le nombre d'écrans PRODUITS** n'est pas comptable non plus. Le modèle range ses écrans librement dans ses fichiers (`boucle-directe.ts`, consigne de format : `index.tsx`, `composants/…`), sans convention qui les rendrait comptables en SQL. Le juge donne les écrans **atteints**, borne inférieure des écrans produits.
- **L'effet d'un tour supplémentaire sur le taux** n'est pas mesurable directement : un tour stocke son rang, son nombre de fichiers, son verdict et son motif de refus, mais **aucun taux** (`boucle-directe.ts:161-176`). Le taux n'est mesuré que sur la version acceptée. R5 ne donne qu'une corrélation.

### 1.1 Résultats [OBSERVÉ-PROD, captures du propriétaire, 2026-11-16]

- **R1 :** `air` refusee 1 · `air` supprimee 23 · `direct` livree **9** (2026-11-05 → 11-16) · `direct` supprimee 43. La génération à 16,03 $ du 10 octobre est une œuvre `air` : l'hypothèse de l'option 2 du §5 de `PLAN_MANQUE4.md` est confirmée par les données.
- **R2 :** 10 % : 1 · 20 % : 1 · 30 % : 5 · 80 % : 1 · 100 % : 1.
- **R3 :**

| œuvre | quand | signes | écr. prévus | écr. atteints | ctl vus | ctl trouvés | monte | tours | PERIMETRE | coût |
|---|---|---|---|---|---|---|---|---|---|---|
| d3ece28a | 11-05 04:14 | 61 | NULL | 2 | 2 | 2 | true | 2 | true | 0,0301 |
| 07dfe7c8 | 11-14 12:03 | 22 866 | 16 | 16 | **48** | 248 | true | 30 | false | 0,0529 |
| fcc4f126 | 11-14 14:12 | 26 028 | 19 | 11 | **48** | 147 | true | 42 | false | 0,0397 |
| d410c06d | 11-14 17:46 | 26 028 | 19 | 11 | **48** | 146 | true | 39 | false | 0,0355 |
| ad6017df | 11-14 18:06 | 26 028 | 9 | 6 | 25 | 111 | true | 3 | true | 0,1545 |
| 414773cd | 11-14 18:14 | 26 028 | 19 | 11 | **48** | 144 | true | 39 | false | 0,0359 |
| edd1a7f9 | 11-14 18:21 | 26 028 | 19 | 9 | 22 | 60 | true | 39 | false | 0,0354 |
| 66bdab46 | 11-15 00:05 | 26 028 | 19 | 10 | 24 | 67 | true | 37 | false | 0,0327 |
| ef085fa7 | 11-16 08:20 | 216 | 3 | 2 | 10 | 12 | **false** | 3 | false | 0,1856 |

- **R4 :** moins de 500 signes : 2 œuvres, 92 % en moyenne ; 8 000 et plus : 7 œuvres, 30 % (corrélation dans la tranche +0,73) ; toutes : 9 œuvres, 44 %, corrélation **−0,95**.
- **R5 :** 2 tours → 100 % (61 signes) · 3 → 53 % (2 œuvres) · 30 → 19 % · 37 → 36 % · 39 → 34 % (3) · 42 → 33 %.
- **R6 :** 79 lignes ; en tête : « ne se monte pas » 12, jetons inexistants 7, contrôles sans nom 6, paquets non embarqués 4, exigences muettes 4.
- **R7 :** livree 9 : ne se monte pas 1, partiellement 8, couverture partielle 1, données perdues 1, écrans en repli **3**. Supprimee 43 : 4, 23, 8, 10, 1.
- **R8 :** couverture mesurée sur 2 à 3 œuvres seulement. Absentes : 3 (demande) + 2 (famille) ; couvertes : 16 + 3 ; hors périmètre déclaré : 2 ; déclarée mais centrale : 4 ; nommée : 1.
- **R9 (carnet ef085fa7) :** lecture `reussie` ; écrans prévus : « liste des dépenses avec date, libellé et montant », « formulaire d'ajout », « total du mois en cours » ; 2 écrans atteints ; erreur du juge « espace de gestion — console : Cannot read properties of undefined (reading 'valeur') » ; fichiers : `index.tsx` + des fichiers `systeme/` (écrits par Deribfy, `boucle-directe.ts:457-474`) ; `PERIMETRE.md` NULL ; premier tour refusé : « L'APPLICATION NE SE MONTE PAS ».

### 1.2 Trois faits qui changent la lecture de ces chiffres

1. **Deux générateurs, pas un.** Le diagnostic « écran(s) en repli (écrits par Deribfy, le modèle refusé trois fois) » n'existe **que** sur la branche `etape-v3` (générateur V4, commit `08780633` du 2026-11-14, **absent de `main`**, `git merge-base --is-ancestor` négatif). Sur `main`, la boucle est bornée à 3 tours (`boucle-directe.ts:251`) : 30 à 42 tours y sont impossibles. Les œuvres du 14 et du 15 novembre (30–42 tours, replis) ont donc très probablement été produites par V4, et d3ece28a et le carnet par `main`. [LU-CODE + DÉDUIT ; confirmation : R10]
2. **Le nombre 48 est le plafond du juge, pas une mesure de l'œuvre.** Le juge d'exécution s'arrête après `BUDGET_VISITES` clics : **48** sur `etape-v3` (`juge-execution-enfant.mjs:236`, « 24 → 48 le 2026-11-13 »), **24** par montage sur `main` (`:233`, commenté « borne de COÛT, pas de vérité »). Quatre œuvres sur neuf ont exactement 48 contrôles vus : le juge a épuisé son budget. Leur « taux » vaut donc **48 / contrôles trouvés** par construction : 48/248 = 19 %, 48/146 = 33 %. Il mesure la taille de l'application face à un budget fixe. [LU-CODE + OBSERVÉ-PROD]
3. **L'échantillon est petit et concentré.** 9 œuvres, dont **6 sur le même cahier** (26 028 signes, Conterak). La taille de la demande, le générateur (V4 ou `main`) et le cahier se recouvrent presque exactement. La corrélation de −0,95 ne peut pas séparer ces trois causes. [OBSERVÉ-PROD + DÉDUIT] *Corrigé par R10 (§1.3) : ce n'est pas « les 7 grandes par V4 », mais 6 grandes par V4 et 1 grande (ad6017df) par `main`.*

---

### 1.3 Résultats de R10, R11, R12 [OBSERVÉ-PROD, captures du propriétaire, 2026-11-16]

**R10 — le code qui a produit chaque œuvre livrée :**

| œuvre | quand | environnement | branche | commit | tours | écrans en repli |
|---|---|---|---|---|---|---|
| 07dfe7c8 | 11-14 12:03 | preview | etape-v3 | fd49fe1 | 30 | — |
| fcc4f126 | 11-14 14:12 | preview | etape-v3 | 2b0730b | 42 | 1 |
| d410c06d | 11-14 17:46 | preview | etape-v3 | 2b0730b | 39 | 1 |
| **ad6017df** | 11-14 18:06 | **production** | **main** | db1314b | 3 | — |
| 414773cd | 11-14 18:14 | preview | etape-v3 | 2b0730b | 39 | — |
| edd1a7f9 | 11-14 18:21 | preview | etape-v3 | 52a6d95 | 39 | 1 |
| 66bdab46 | 11-15 00:05 | preview | etape-v3 | e9d1bf7 | 37 | — |
| **ef085fa7** | 11-16 08:20 | **production** | **main** | be091da | 3 | — |

La ligne de d3ece28a n'est pas visible sur la capture (le tableau défile à partir de 07dfe7c8) : sa provenance n'est **pas relevée**.

**Ce que R10 établit :**
- les **six** œuvres à 30–42 tours viennent toutes d'`etape-v3`, **en preview**. Le §1.2 point 1 est confirmé ;
- **ces taux (19, 33, 34, 36 %) ne décrivent pas ce que reçoivent les utilisateurs.** Ce sont des essais d'un générateur **en pause**, jamais fusionné dans `main`, dans un environnement qui n'est pas la production. *Toute lecture future des diagnostics « PARTIELLEMENT éprouvée » de ces six œuvres doit partir de là* ;
- **une grande demande est bien passée en production :** ad6017df (Conterak, 26 028 signes, `main`, 3 tours), à 23 % : 25 contrôles vus sur 111, 6 écrans atteints sur 9 prévus. Sur `main`, le juge a 24 clics par montage (§1.2), donc 25 visites ne disent pas à elles seules si le plafond a mordu : **UNKNOWN** ;
- **les œuvres livrées en production sont donc ad6017df, ef085fa7, et peut-être d3ece28a.** C'est sur elles, pas sur les six autres, que se juge ce que les utilisateurs reçoivent.

**R11 — les trois tours du carnet :**

| tour | accepté | fichiers | motif |
|---|---|---|---|
| 1 | false | 1 | L'APPLICATION NE SE MONTE PAS — dans un navigateur SIMULÉ, elle échoue… |
| 2 | false | 1 | L'APPLICATION NE SE MONTE PAS — dans un navigateur SIMULÉ, elle échoue… |
| 3 | true | 1 | — |

« — » au tour 3 ne veut pas dire que le défaut a disparu. Un tour **accepté** n'enregistre jamais de motif (`boucle-directe.ts:690`), et l'œuvre livrée porte encore `monte = false` et « L'application ne se monte pas » dans ses diagnostics (R3, R9).

**R12 — le code du carnet (`index.tsx`, 24 973 signes) :** 5 `<input`, 2 `<form`, 2 `onSubmit`, 20 occurrences de « ajout », 1 `.insert(`, 36 occurrences de « valeur ».

**Ce que R12 établit :** le formulaire d'ajout **a été écrit**, avec des champs, deux formulaires, deux gestionnaires de soumission et une insertion en base. H-A est définitivement écartée pour ce cas : le modèle a compris la demande **et** l'a réalisée.

**Ce que R12 n'établit pas :**
- ce sont des comptes de chaînes, pas une exécution. Ils montrent que le formulaire est dans le code, pas qu'il s'affiche ;
- l'erreur « reading 'valeur' » est imputée par le juge à l'**espace de gestion** (R9 : « espace de gestion — console »), c'est-à-dire au second montage (`boucle-directe.ts:513-516`). Les 36 occurrences de « valeur » ne localisent pas la ligne fautive. Que ce plantage soit la cause pour laquelle le formulaire n'est pas atteint est **plausible, non prouvé** : le formulaire peut aussi vivre dans la partie gestion, ou être atteignable mais non compté comme écran distinct (§2.4).

## 2. Temps 2 — ce que dit le code

Code lu : `main` @ `bb3255ed` pour le générateur en production ; `origin/etape-v3` @ `0c51f505` pour V4 (en pause depuis le 2026-11-14, non fusionné).

### 2.1 Le seuil de livraison : **il n'en existe aucun.** [LU-CODE]

- **Route :** `statut: resultat.ok ? 'livree' : 'refusee'` (`route.ts:739` sur `main`, `:681` sur `etape-v3`). La seule question posée est « le générateur a-t-il rendu ok ».
- **Générateur `main` :** `ok: true` dès qu'une version **s'assemble** et que, soit aucun reproche ne reste, soit c'est le **dernier tour** (`boucle-directe.ts:684-705`). Le commentaire le dit : « Au dernier tour, les défauts restants ne REFUSENT pas l'œuvre — ils l'ACCOMPAGNENT » (`:687-689`). Une œuvre qui ne se monte pas, à jetons inexistants ou à exigences absentes est **livrée** au troisième tour.
- **Le taux d'exploration n'est même pas un reproche.** Aucune des branches `reproches.push` (`:575-683`) ne porte sur `ecransVisites` / `ecransDecouverts`. Le taux n'est calculé qu'**après coup**, pour le texte du diagnostic (`route.ts:747-757`). Il ne décide rien, à aucun tour.
- **Générateur V4 :** `ok: v.ok` (`generation.ts:333`), c'est-à-dire « l'assemblage a réussi ». Ni le juge d'exécution (`:307-311`), ni la couverture, ni les replis n'entrent dans `ok`. Un écran que le modèle rate trois fois est **remplacé par un écran de Deribfy** (`repli`, `:331`) et l'œuvre reste livrable.
- **Seuls refus possibles :** sur `main`, au dernier tour, une réponse tronquée, sans fichiers, à paquets interdits ou qui ne s'assemble pas (`:433-455`, `:706-708`, puis `:740-745`) ; sur V4, un échec d'assemblage.

Une œuvre à 10 % est donc livrée, et une œuvre qui ne se monte pas aussi : le carnet l'a été.

### 2.2 La boucle de tours [LU-CODE]

**Générateur `main` (`boucleEcriture`, `boucle-directe.ts:325-746`) :**

| | |
|---|---|
| Entrée | un message : configuration + demande entière (`:381-383`) |
| Un tour | **un** appel qui doit rendre **toute** l'application, tous fichiers (`:387`) |
| Maximum | `TOURS_MAX = 3` (`:251`, `:385`) |
| Arrêt | acceptation (`:684-705`), ou 3 tours épuisés → `ok: false`, « Non convergé en 3 tours » (`:740-745`) |
| Ce qui passe au tour suivant | la réponse **entière** du modèle, puis le motif (tous les reproches concaténés) et « Corrige et rends TOUS les fichiers » (`:735-737`). L'historique **s'accumule** : au tour 3, le modèle relit la demande, ses deux réponses et les deux motifs. |
| Correction ou regénération ? | **regénération complète** à chaque tour, par choix explicite (« Pas de correctif partiel », `:721-725`) |
| Le motif est-il réinjecté ? | **Oui**, tel quel (`:737`). |

Le carnet suit exactement ce chemin : tour 1 refusé (« ne se monte pas »), puis livré au tour 3 alors que l'espace de gestion plantait encore (`monte = false`, R3).

**Générateur V4 (`genererApplication`, `etape-v3:generation.ts:221-345`) :**
- un appel **par écran**, quatre en parallèle (`:272`, `PARALLELISME_V4 = 4`, `:48`), en deux passes A et B ;
- un écran refusé trois fois passe en repli (`:331`) ;
- **les « tours » stockés sont la somme des tentatives de tous les écrans, plus les traductions** (`:336-340`).

**Conséquence pour R5 :** « 39 ou 42 tours aboutissent à 33–34 % » ne décrit pas une boucle qui tourne 39 fois sans converger. C'est environ 19 écrans × 2 passes. La conclusion « la boucle ne converge pas » n'est **pas établie** par R5 : ni le nombre de tours ni le taux ne mesurent ce qu'ils semblent mesurer (§1.2).

### 2.3 Taille de la demande et dégradation : les causes mécaniques [LU-CODE + DÉDUIT]

1. **Le dénominateur grandit, le numérateur est plafonné.** Le juge ouvre au plus 48 contrôles (V4) ou 24 par montage (`main`), mais compte **tous** ceux qu'il aperçoit (`juge-execution-enfant.mjs:344-346`). Plus l'application est grande, plus le taux baisse, **même si elle est parfaite**. Cette cause suffit à produire une corrélation négative.
2. **Le générateur change avec la taille** dans cet échantillon : 6 des 7 grandes demandes sont passées par V4 (R10, §1.3). Les deux générateurs n'ont ni le même découpage, ni le même budget de juge, ni la même règle de livraison.
3. **Sur `main` seulement, un seul appel par tour pour toute l'application,** plafonné à 65 536 jetons de sortie (`fournisseur.ts:185`), avec un historique qui s'allonge à chaque tour. Une grande demande y pousse vers la troncature, qui est détectée et refusée (`boucle-directe.ts:434-437`). Dans cet échantillon, aucune grande demande n'est passée par `main` : **non mesuré**.
4. **Sur V4, la taille se découpe par écran.** Un appel ne voit pas toute l'application ; la longueur du cahier pèse sur le plan et la fiche de chaque écran, pas sur un appel unique. Effet sur la qualité : **UNKNOWN**.

**Verdict sur l'intuition « plus la demande grossit, plus le résultat se dégrade » : NI CONFIRMÉE NI INFIRMÉE.** Le −0,95 s'explique entièrement par le plafond du juge et par le changement de générateur. Pour la tester, il faut une mesure qui ne dépende pas de la taille : écrans prévus présents dans le code, rapportés aux écrans prévus.

### 2.4 Pourquoi un écran prévu n'est pas atteint

Trois cas à départager : (a) pas écrit ; (b) écrit, mais non relié à la navigation ; (c) relié, mais le juge ne l'ouvre pas.

- **(c) est établi pour au moins 3 œuvres V4** (fcc4f126, d410c06d, 414773cd : 48 contrôles vus, plafond atteint, 11 écrans sur 19). Le juge s'est arrêté avant d'avoir tout ouvert : leurs écrans manquants peuvent exister. [LU-CODE + OBSERVÉ-PROD]
- **Une autre forme de (c) est probable pour V4 :** le juge parcourt l'application **sans session**. Sur V4, chaque écran a un accès (`acces`, `generation.ts:281`, `:309`) ; un écran réservé à un rôle connecté n'est pas atteignable par un visiteur. Pour edd1a7f9 et 66bdab46 (22 et 24 visites, sous le plafond), l'exploration s'est arrêtée d'elle-même, faute de nouveaux contrôles (`juge-execution-enfant.mjs:316`). [DÉDUIT, non prouvé]
- **(a) est établi pour une partie des écrans V4 :** un écran en **repli** a été raté trois fois par le modèle et remplacé par Deribfy. R7 en compte sur 3 œuvres livrées ; le nombre par œuvre sort de R10. [OBSERVÉ-PROD]
- **Carnet (`main`) : UNKNOWN.** Il a un seul fichier écrit par le modèle, `index.tsx`. L'écran « formulaire d'ajout » peut y être absent (a), présent mais sans navigation (b), ou présent dans le même écran que la liste. Dans ce dernier cas, le juge ne compte pas d'écran de plus : l'écran s'identifie par son contenu rendu (`juge-execution-enfant.mjs:269-286`). L'espace de gestion a aussi planté au montage (R9), ce qui interrompt l'exploration de cette partie. R11 et R12 tranchent.

**Lequel domine : UNKNOWN.** Ce qui est établi, c'est que « écrans atteints » mesure une **borne inférieure** des écrans écrits, et que l'écart avec les écrans prévus mélange les trois cas.

### 2.5 `PERIMETRE.md` [LU-CODE]

- **Rôle :** la consigne de `main` (règle 11, `boucle-directe.ts:156-159`) demande au modèle de lister ce qu'il ne livre pas. Le juge de couverture le lit : une exigence qui y figure passe en « déclarée hors périmètre » (`juge-couverture.ts:185`, `:230-242`).
- **Quand il est exigé :** **seulement** quand la couverture trouve des exigences absentes, par le reproche « Couvre-les, ou déclare-les dans PERIMETRE.md » (`boucle-directe.ts:669-683`). Ce reproche ne part **qu'aux tours 1 et 2** : au dernier, rien n'est renvoyé.
- **Pourquoi NULL pour le carnet :** ses diagnostics ne portent pas « Couverture partielle » (R7). La couverture n'a donc trouvé aucune exigence absente : le formulaire était soit couvert à ses yeux, par les mots du code et les écrans atteints (`juge-couverture.ts:28-60`), soit hors de ses familles. Rien n'a demandé le fichier. Le modèle, lui, pensait tout livrer.
- **Sur V4 :** `PERIMETRE.md` n'a pas de rôle dans `genererApplication`. Les valeurs `true` de ad6017df et d3ece28a ne s'interprètent pas de la même façon. [LU-CODE]

---

## 3. Temps 3 — diagnostic

| Hypothèse | Verdict | Ce qui l'établit | Ce qui manque |
|---|---|---|---|
| **H-A** · perte à la conception | **ÉCARTÉE pour le carnet** ; **NON ÉTABLIE ailleurs** | R9 : la lecture listait les 3 écrans, formulaire compris. Sur V4, les 19 écrans lus deviennent des routes du plan (`generation.ts:256`) : rien n'est perdu entre lecture et plan. | Si ces 19 écrans couvrent tout le cahier : aucun étalon indépendant. Lire le cahier Conterak (je peux le faire gratuitement s'il est exporté). |
| **H-B** · perte à l'exécution | **RETENUE, mais pas « massive » au sens des taux** | Carnet : l'espace de gestion plante, et 3 tours ne l'ont pas réparé (R9, R3). V4 : des écrans en repli sur 3 œuvres livrées (R7). | L'ampleur. Les taux de 19 à 36 % mesurent surtout le budget du juge (§1.2), et les 30–42 tours ne sont pas 30–42 essais (§2.2). Combien d'écrans manquent vraiment : R10 (replis par œuvre), R11 et R12 (carnet). |
| **H-C** · perte à la décision | **RETENUE, établie sans réserve** | Aucun seuil dans aucun des deux générateurs (§2.1). `main` livre au dernier tour quels que soient les défauts ; V4 livre dès que ça s'assemble. Le taux d'exploration ne décide rien, nulle part. | Rien pour l'établir. Le seuil à poser est une décision du propriétaire, hors de cette enquête. |

**Proportions :** non chiffrables avec ces données. Il faudrait compter, par œuvre, les écrans prévus présents dans le code. Le taux du juge ne le permet pas, et il n'existe pas d'autre mesure aujourd'hui.

### 3.1 À quel endroit précis la qualité se perd-elle ?

1. **À la décision de livrer — c'est certain.** `boucle-directe.ts:684-705` sur `main`, `generation.ts:333` sur V4. Rien ne refuse une œuvre incomplète ou qui ne se monte pas : le défaut est mesuré, écrit dans les diagnostics, puis livré. C'est le seul endroit où la perte est établie pour **toutes** les œuvres.
2. **Dans l'instrument de mesure lui-même.** Le taux « PARTIELLEMENT éprouvée » ne distingue pas un écran absent d'un écran que le juge n'a pas eu le temps ou le droit d'ouvrir : plafond de 24 ou 48 clics, parcours sans session. Il donne des chiffres alarmants sur des applications peut-être complètes, et il ne peut pas prouver qu'une application est complète. Tant qu'il mesure le budget du juge plutôt que l'œuvre, aucun seuil posé dessus ne serait juste.
3. **À l'exécution, sur des cas précis et mesurés :** l'espace de gestion du carnet qui plante, que trois regénérations complètes n'ont pas réparé ; les écrans V4 ratés trois fois puis remplacés. Leur part dans le total reste **UNKNOWN**.

La conception (H-A) n'est mise en cause par aucune donnée disponible.

### 3.2 Ce que cette enquête n'a pas fait

Aucun code modifié, aucune migration, aucune génération. Les deux portes restent fermées (`NEXT_PUBLIC_GENERATION_ASYNC="0"`, `NEXT_PUBLIC_REGENERATION_OUVERTE` absente de Production et de Preview, relu le 2026-11-16).

## 4. Requêtes complémentaires (lecture seule, essayées sur table factice)

### R10 — quel code a produit chaque œuvre, et combien d'écrans en repli

**Ce que tu regardes :** `branche` et `environnement`. Si les œuvres à 30–42 tours portent `etape-v3` (environnement `preview`), le §1.2 point 1 est confirmé. Puis `ecrans_en_repli` par œuvre.

```sql
select left(id::text, 8) as oeuvre,
       to_char(created_at, 'MM-DD HH24:MI') as quand,
       sections_acquises->'deploiement'->>'environnement' as environnement,
       sections_acquises->'deploiement'->>'branche' as branche,
       left(sections_acquises->'deploiement'->>'commit', 8) as commit_code,
       tirages as tours,
       (regexp_match(diagnostics::text, '([0-9]+) écran\(s\) en repli'))[1] as ecrans_en_repli
from public.app_generations
where moteur = 'direct' and statut = 'livree'
order by created_at;
```

### R11 — les trois tours du carnet

**Ce que tu regardes :** le motif de chaque tour refusé, et si le tour accepté (le 3ᵉ) est celui qui ne se montait plus.

```sql
select (t->>'rang')::int as rang,
       t->>'ok' as accepte,
       t->>'fichiers' as fichiers,
       left(coalesce(t->>'motif', '—'), 300) as motif
from public.app_generations g,
     jsonb_array_elements(case when jsonb_typeof(g.sections_acquises->'tours') = 'array'
                               then g.sections_acquises->'tours' else '[]'::jsonb end) as t
where g.id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
order by 1;
```

### R12 — le formulaire d'ajout existe-t-il dans le code du carnet ?

**Ce que tu regardes :** `balises_input`, `onsubmit` et `appels_insert` à 0 : le formulaire n'a pas été écrit, cas (a) du §2.4. Au-dessus de 0 : il existe, cas (b) ou (c). `mot_valeur` localise l'erreur « reading 'valeur' ».

```sql
with f as (
  select coalesce(document->'fichiers'->>'index.tsx', '') as x
  from public.app_generations where id = 'ef085fa7-5272-48e2-a93d-acc5b62be8c6'
)
select length(x) as signes_index,
       (length(x) - length(replace(x, '<input', ''))) / 6 as balises_input,
       (length(x) - length(replace(x, '<form', ''))) / 5 as balises_form,
       (length(x) - length(replace(x, 'onSubmit', ''))) / 8 as onsubmit,
       (length(x) - length(replace(lower(x), 'ajout', ''))) / 5 as mot_ajout,
       (length(x) - length(replace(x, '.insert(', ''))) / 8 as appels_insert,
       (length(x) - length(replace(x, 'valeur', ''))) / 6 as mot_valeur
from f;
```

---

## 5. Conclusion

**Le générateur n'est pas aveugle. Il voit le défaut, le nomme, et tente deux fois de le réparer. Mais la règle du dernier tour transforme un échec détecté en livraison.**

Le carnet du 16 novembre en est la démonstration complète, et la seule en production mesurée de bout en bout :
1. le modèle a compris la demande (R9 : les trois écrans prévus) et l'a écrite, formulaire compris (R12) ;
2. le juge a vu que l'application ne se montait pas, et l'a dit au modèle deux fois, dans les mêmes termes (R11, tours 1 et 2) ;
3. deux regénérations complètes n'ont pas réparé le défaut (H-B, établie pour ce cas) ;
4. au tour 3, le défaut était toujours là, et l'œuvre a été acceptée parce que c'était le dernier tour (`boucle-directe.ts:684-705`) ;
5. elle est partie chez l'utilisateur avec le statut `livree` (`route.ts:739`), ses diagnostics stockés en base et montrés à personne.

**Un défaut qui résiste à deux corrections part automatiquement chez l'utilisateur avec l'étiquette « livrée ».** C'est H-C, et c'est H-C qui rend H-B visible pour l'utilisateur. Sans elle, l'échec d'exécution resterait un refus ; avec elle, il devient un produit.

**Ce que cette enquête ne permet pas d'affirmer :**
- que la qualité se dégrade avec la taille de la demande. Les taux sur grandes demandes viennent pour 6 sur 7 d'un générateur en pause, en preview, et sont plafonnés par le budget du juge ;
- quelle part des défauts relève de l'exécution plutôt que de la mesure. L'instrument ne sépare pas un écran absent d'un écran non ouvert.

## 6. Recommandations — consignées, NON décidées, NON faites

### 6.1 Ordre recommandé des corrections

1. **D'abord réparer l'instrument de mesure.** Le taux d'exploration ne distingue pas un écran absent d'un écran que le juge n'a pas pu ouvrir (plafond de clics, parcours sans session, §1.2 et §2.4).
2. **Ensuite seulement, poser un seuil de refus.** Un seuil posé sur l'instrument actuel refuserait des œuvres au hasard : surtout les grandes, et des applications peut-être complètes.

Inverser cet ordre reviendrait à remplacer une livraison aveugle par un refus aveugle.

### 6.2 Questions ouvertes, sans réponse ici

1. **Quand le dernier tour échoue encore,** que doit-il se passer : refuser, livrer en avertissant l'utilisateur, ou accorder des tours supplémentaires ?
2. **Trois tours suffisent-ils, et cela se mesure-t-il ?** Aujourd'hui, un tour ne stocke pas de mesure comparable d'un tour à l'autre (§2.2) : on ne sait pas si le tour 2 a rapproché le résultat du but.
3. **L'utilisateur doit-il voir les diagnostics** qui existent déjà en base et que personne ne lui montre ?

