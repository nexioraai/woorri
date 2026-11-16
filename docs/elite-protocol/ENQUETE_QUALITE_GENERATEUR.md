# Enquête — pourquoi le générateur livre des œuvres incomplètes

- **Ouverte :** 2026-11-16, sur instruction du propriétaire. Les manques 1 à 3 sont reportés.
- **Statut :** TEMPS 1 EN COURS. Les requêtes sont prêtes et en attente des résultats du propriétaire. Les temps 2 et 3 ne sont pas rédigés.
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
