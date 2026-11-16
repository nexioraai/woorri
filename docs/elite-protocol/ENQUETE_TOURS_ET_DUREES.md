# Enquête — les tours et les durées du générateur

- **Ouverte :** 2026-11-16, sur instruction du propriétaire. Règle : aucune réponse sans démonstration ; UNKNOWN plutôt que vraisemblable.
- **Statut :** REQUÊTES PRÊTES, NON LANCÉES. Les réponses aux questions 1, 3 et 4 attendent leurs résultats. La question 2 est déjà en partie établie par le code et l'historique git (§2).
- **Règles :** aucune correction, aucune modification de code, aucune génération payante. Les deux portes restent fermées.
- **Niveaux :** [OBSERVÉ-PROD] = résultat de requête du propriétaire ; [LU-CODE] = dépôt, `main` @ `5badf72a` ; [GIT] = historique ; [UNKNOWN] = non établi.

---

## 0. Périmètre et cadrage

### 0.1 Un seul générateur à la fois

Toutes les requêtes ne portent que sur le générateur `main`. Un tour de V4 se reconnaît à sa clé `passe` (`etape-v3:generation.ts:337`), qu'un tour de `main` n'a jamais (`boucle-directe.ts:690`, `:719`). Les requêtes excluent toute œuvre dont un tour porte `passe`. C'est un critère tiré de la donnée elle-même, valable aussi pour les œuvres antérieures à l'enregistrement du déploiement.

### 0.2 La comparaison de départ mélange les deux générateurs [OBSERVÉ-PROD]

« 216 signes en 504 s, 26 028 signes en 70–80 s » compare le carnet (`main`, production) à des Conterak produits par **V4 en preview** (R10 de `ENQUETE_QUALITE_GENERATEUR.md` : 66bdab46, 414773cd, edd1a7f9). V4 écrit quatre écrans en parallèle (`etape-v3:generation.ts:272`, `PARALLELISME_V4 = 4`) : ses durées ne se comparent pas à celles de `main`. Le seul Conterak produit par `main` en production, ad6017df, a duré **294 157 ms** (capture du propriétaire, `app_generations`, 5 dernières lignes). La question 1 se pose donc sur `main` seul, avec T1.

### 0.3 Ce que les données peuvent et ne peuvent pas séparer [LU-CODE]

- `duree_ms` couvre la boucle entière : chronomètre lancé à `route.ts:531`, arrêté à `:656`, juste après `boucleEcriture`.
- Le `ms` d'un tour couvre **ensemble** l'appel à DeepSeek, la lecture, l'assemblage et tous les juges (`boucle-directe.ts:386` → `:690` / `:719`).
- **Aucune latence de DeepSeek n'est enregistrée à part** : `fournisseur.ts` ne contient aucun chronomètre.
- Seul le juge d'exécution de la version **acceptée** a sa durée stockée (`sections_acquises.execution.ms`, `juge-execution.ts:87`). Le juge des faces, l'assemblage et les juges des tours refusés n'en ont pas.

**Conséquence :** on peut décomposer une durée en tours et en « hors tours », et retirer le juge d'exécution du dernier tour. **On ne peut pas séparer l'attente de DeepSeek du temps de mon code sur les tours refusés : UNKNOWN avec les données actuelles.** Le débit en jetons de sortie par seconde (T1, T2) n'en est qu'un indicateur : il inclut le temps de mon code.

### 0.4 L'heure de pointe [LU-CODE]

Pointe DeepSeek : du lundi au vendredi, 01:00–04:00 et 06:00–10:00 UTC (`fournisseur.ts:126-131`, `estPointe`). Les requêtes classent une œuvre selon l'heure de **fin** (`created_at`, posé à l'insertion de fin, `PLAN_MANQUE4.md` §6.8). Une génération à cheval sur une frontière peut être mal classée. Les tentatives portent l'heure de début, mais seulement depuis le 2026-11-15.

---

## 1. Requêtes (lecture seule, à lancer une par une)

Essayées sur une table factice locale contenant le carnet, une œuvre refusée puis acceptée au tour 2, une œuvre jamais acceptée, une œuvre acceptée au tour 1 et une œuvre V4 à exclure. Les six s'exécutent, l'œuvre V4 est bien exclue, et chaque classement tombe dans la bonne case. Cela prouve la syntaxe et la logique, pas les chiffres.

### T1 — Une ligne par œuvre du générateur `main` : durée, tours, millisecondes par tour, ce qui reste hors des tours, jetons, débit.

```sql
with g as (
  select id, statut, created_at, length(demande) as signes, duree_ms, tirages,
         jetons_entree, jetons_sortie, sections_acquises as s
  from public.app_generations
  where moteur = 'direct'
    and jsonb_typeof(sections_acquises->'tours') = 'array'
    and not exists (select 1 from jsonb_array_elements(sections_acquises->'tours') e where e ? 'passe')
)
select left(g.id::text, 8) as oeuvre,
       g.statut,
       to_char(g.created_at at time zone 'UTC', 'MM-DD Dy HH24:MI') as fin_utc,
       case when extract(isodow from g.created_at at time zone 'UTC') <= 5
             and (extract(hour from g.created_at at time zone 'UTC') between 1 and 3
               or extract(hour from g.created_at at time zone 'UTC') between 6 and 9)
            then 'pointe' else 'creuse' end as tarif_a_la_fin,
       g.signes,
       g.duree_ms,
       g.tirages as tours,
       (select sum((e->>'ms')::bigint) from jsonb_array_elements(g.s->'tours') e) as ms_dans_les_tours,
       g.duree_ms - (select sum((e->>'ms')::bigint) from jsonb_array_elements(g.s->'tours') e) as ms_hors_tours,
       (select string_agg((e->>'ms'), ' / ' order by (e->>'rang')::int) from jsonb_array_elements(g.s->'tours') e) as ms_par_tour,
       (g.s->'execution'->>'ms')::bigint as ms_juge_execution_final,
       g.jetons_entree,
       g.jetons_sortie,
       round(g.jetons_sortie::numeric
             / nullif((select sum((e->>'ms')::bigint) from jsonb_array_elements(g.s->'tours') e), 0) * 1000, 1)
         as jetons_sortie_par_seconde
from g
order by g.created_at;
```

**Ce que tu regardes :** `ms_par_tour` (le carnet : 260 712 au tour 1 d'après R9), `ms_hors_tours` (s'il est petit, toute la durée est dans les tours), `jetons_sortie_par_seconde` selon `tarif_a_la_fin`. Si le tableau est trop large : Export → CSV.

### T2 — Le débit (jetons de sortie par seconde passée dans les tours), heure de pointe face à heure creuse.

```sql
with g as (
  select id, created_at, jetons_sortie, sections_acquises as s
  from public.app_generations
  where moteur = 'direct'
    and jsonb_typeof(sections_acquises->'tours') = 'array'
    and not exists (select 1 from jsonb_array_elements(sections_acquises->'tours') e where e ? 'passe')
    and jetons_sortie > 0
), m as (
  select case when extract(isodow from created_at at time zone 'UTC') <= 5
               and (extract(hour from created_at at time zone 'UTC') between 1 and 3
                 or extract(hour from created_at at time zone 'UTC') between 6 and 9)
              then 'pointe' else 'creuse' end as tarif,
         jetons_sortie,
         (select sum((e->>'ms')::bigint) from jsonb_array_elements(s->'tours') e) as ms
  from g
)
select tarif, count(*) as oeuvres,
       round(avg(jetons_sortie)) as jetons_sortie_moyens,
       round(avg(ms) / 1000) as secondes_moyennes_dans_les_tours,
       round(sum(jetons_sortie)::numeric / nullif(sum(ms), 0) * 1000, 1) as jetons_par_seconde,
       round(min(jetons_sortie::numeric / nullif(ms, 0) * 1000), 1) as min_jps,
       round(max(jetons_sortie::numeric / nullif(ms, 0) * 1000), 1) as max_jps
from m
group by tarif
order by tarif;
```

**Ce que tu regardes :** Si `jetons_par_seconde` est nettement plus bas en pointe, avec des min/max qui ne se recouvrent pas, l'heure joue sur la latence. S'ils se recouvrent, l'heure n'explique pas l'écart.

### T3 — L'issue de chaque œuvre de `main` : acceptée au tour 1, refusée puis acceptée **avant** le tour 3, acceptée de force au tour 3, ou jamais acceptée.

```sql
with g as (
  select id, statut, tirages, diagnostics, sections_acquises as s
  from public.app_generations
  where moteur = 'direct'
    and jsonb_typeof(sections_acquises->'tours') = 'array'
    and not exists (select 1 from jsonb_array_elements(sections_acquises->'tours') e where e ? 'passe')
), t as (
  select g.id, g.statut, g.diagnostics, (e->>'rang')::int as rang, (e->>'ok')::boolean as ok,
         max((e->>'rang')::int) over (partition by g.id) as dernier
  from g, jsonb_array_elements(g.s->'tours') e
), o as (
  select id, statut, diagnostics, dernier,
         min(rang) filter (where ok) as rang_accepte
  from t group by id, statut, diagnostics, dernier
)
select case
         when rang_accepte = 1 then '1 · accepte au tour 1'
         when rang_accepte is not null and rang_accepte < 3 then '2 · refuse puis accepte AVANT le dernier tour (sans aucun reproche)'
         when rang_accepte is not null and diagnostics::text ilike '%ne se monte pas%' then '3 · accepte au tour 3 alors qu il ne se monte pas'
         when rang_accepte is not null then '4 · accepte au tour 3 (defauts restants non separables)'
         else '5 · aucun tour accepte (non converge ou interrompu)'
       end as issue,
       count(*) as oeuvres,
       count(*) filter (where statut = 'livree') as dont_livrees,
       string_agg(distinct dernier::text, ',') as rangs_max_vus
from o
group by 1
order by 1;
```

**Ce que tu regardes :** La ligne `2 ·` : c'est la preuve directe que les tours servent. Une acceptation au tour 2 signifie qu'**aucun** reproche ne restait (`boucle-directe.ts:684`). La ligne `4 ·` est ambiguë par construction : au tour 3, tout est accepté.

### T4 — Le sort de chaque tour selon son rang.

```sql
with g as (
  select id, sections_acquises as s
  from public.app_generations
  where moteur = 'direct'
    and jsonb_typeof(sections_acquises->'tours') = 'array'
    and not exists (select 1 from jsonb_array_elements(sections_acquises->'tours') e where e ? 'passe')
), t as (
  select g.id, (e->>'rang')::int as rang, (e->>'ok')::boolean as ok,
         coalesce((e->>'tronquee')::boolean, false) as tronquee
  from g, jsonb_array_elements(g.s->'tours') e
)
select rang,
       count(*) as tours_joues,
       count(*) filter (where ok) as acceptes,
       count(*) filter (where ok and rang < 3) as acceptes_sans_reproche,
       count(*) filter (where ok and rang = 3) as acceptes_forces_au_tour_3,
       count(*) filter (where not ok) as refuses,
       count(*) filter (where tronquee) as tronques
from t
group by rang
order by rang;
```

**Ce que tu regardes :** `acceptes_sans_reproche` aux rangs 1 et 2 face aux `refuses` : le taux de réussite réel par rang. Au rang 3, une acceptation est forcée et ne prouve rien. `tronques` : les réponses coupées par la limite de jetons.

### T5 — Chaque paire « tour refusé → tour suivant » : le tour suivant est-il accepté, son motif est-il identique mot pour mot, mêmes familles de reproches, en partie, ou entièrement différentes ?

```sql
with g as (
  select id, sections_acquises as s
  from public.app_generations
  where moteur = 'direct'
    and jsonb_typeof(sections_acquises->'tours') = 'array'
    and not exists (select 1 from jsonb_array_elements(sections_acquises->'tours') e where e ? 'passe')
), t as (
  select g.id, (e->>'rang')::int as rang, (e->>'ok')::boolean as ok, coalesce(e->>'motif', '') as motif
  from g, jsonb_array_elements(g.s->'tours') e
), c as (
  select id, rang, ok, motif,
         array(select distinct upper(left(trim(b), 28)) from unnest(string_to_array(motif, E'\n\n')) as b
               where trim(b) <> '' order by 1) as familles
  from t
), p as (
  select id, rang, ok, motif, familles,
         lag(motif) over (partition by id order by rang) as motif_prec,
         lag(familles) over (partition by id order by rang) as familles_prec,
         lag(ok) over (partition by id order by rang) as ok_prec
  from c
)
select case
         when ok then 'a · le tour suivant est accepte'
         when motif = motif_prec then 'b · motif IDENTIQUE mot pour mot'
         when familles = familles_prec then 'c · memes familles de reproches, texte different'
         when familles && familles_prec then 'd · familles en partie communes'
         else 'e · familles entierement differentes'
       end as paire_tour_n_vers_n_plus_1,
       count(*) as paires,
       count(*) filter (where not ok and exists (select 1 from unnest(familles) f where not (f = any(familles_prec)))) as dont_famille_nouvelle
from p
where motif_prec is not null and ok_prec is false
group by 1
order by 1;
```

**Ce que tu regardes :** La proportion de `b ·` (motif identique) et de `c ·` (mêmes familles) : le tour suivant n'a rien corrigé. `dont_famille_nouvelle` : le tour suivant a fait apparaître un reproche qui n'existait pas avant (il a cassé autre chose).

### T6 — Les familles de reproches qui apparaissent au tour suivant sans exister au tour précédent.

```sql
with g as (
  select id, sections_acquises as s
  from public.app_generations
  where moteur = 'direct'
    and jsonb_typeof(sections_acquises->'tours') = 'array'
    and not exists (select 1 from jsonb_array_elements(sections_acquises->'tours') e where e ? 'passe')
), t as (
  select g.id, (e->>'rang')::int as rang, (e->>'ok')::boolean as ok, coalesce(e->>'motif', '') as motif
  from g, jsonb_array_elements(g.s->'tours') e
), c as (
  select id, rang, ok,
         array(select distinct upper(left(trim(b), 28)) from unnest(string_to_array(motif, E'\n\n')) as b
               where trim(b) <> '') as familles
  from t
), p as (
  select id, rang, ok, familles,
         lag(familles) over (partition by id order by rang) as familles_prec,
         lag(ok) over (partition by id order by rang) as ok_prec
  from c
)
select f as famille_apparue_au_tour_suivant, count(*) as fois
from p, unnest(p.familles) as f
where p.ok_prec is false and not p.ok and not (f = any(p.familles_prec))
group by f
order by 2 desc;
```

**Ce que tu regardes :** Ce qu'une regénération casse en réparant autre chose.

---

## 2. Question 2 — pourquoi trois tours : ce qui est déjà établi [LU-CODE + GIT]

- **La ligne :** `export const TOURS_MAX = 3` (`boucle-directe.ts:251`). La boucle s'en sert par défaut (`:371`, `const toursMax = o.toursMax ?? TOURS_MAX`). La route ne passe jamais `toursMax` (`grep` : aucune occurrence dans `api/generateur/direct/route.ts`). La valeur en production est donc 3.
- **Le commit :** `47837412`, 2026-10-18 17:53 (heure de Toronto), « L'autre architecture de D-001, mise à l'épreuve — l'IA écrit le code, le compilateur lui répond ». La constante y vaut déjà 3 (ligne 79 du fichier à ce commit). **Aucun commit ne l'a modifiée depuis** (`git log -G'TOURS_MAX = '` ne renvoie que ce commit).
- **Justification écrite :** aucune. Ni la ligne, ni le message du commit, ni le code de ce commit ne disent pourquoi 3.
- **Contrainte de durée :** à l'introduction, la route avait `maxDuration = 300` (`47837412:route.ts:37`). Elle est passée à **900** le 2026-10-19 (`534b7e7b`, « Le modèle écrivait bien. C'est ma borne qui coupait »), et `TOURS_MAX` est resté à 3.
- **Combien de tours tiennent dans 900 s :** le calcul se fera sur les durées réelles par tour de T1. Une seule donnée est déjà mesurée : le carnet a passé **260 712 ms** dans son tour 1 (R9). À cette durée, 900 / 260,7 = **3,45** : 3 tours tiennent, pas 4. Une seule mesure ne fait pas une règle ; T1 donnera la distribution.
- **Contrainte de jetons :** `max_tokens` = 65 536 **par appel** (`fournisseur.ts:185`). Elle borne chaque tour, pas leur nombre.

**Verdict provisoire :** le 3 n'est justifié nulle part dans le code ni l'historique. S'il est **aussi** une contrainte, c'est par la durée, et cela se démontre avec T1.
