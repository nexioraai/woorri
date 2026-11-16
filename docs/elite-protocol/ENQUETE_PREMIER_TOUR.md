# Enquête — pourquoi le premier tour est refusé

- **Date :** 2026-11-16.
- **Statut :** requêtes prêtes, essayées sur table factice, **non lancées**. Aucune correction.
- **Mission :** trouver la cause, pas corriger.

## 0. Chiffres de référence (A1, export du propriétaire) [OBSERVÉ-PROD]

| œuvre | tables | tours | secondes | coût | jetons d'entrée | jetons de sortie | détail des tours |
|---|---|---|---|---|---|---|---|
| 4d480027 Suivi de stock | 2 | 2 | 255 | 0,0700 | 18 125 | 29 318 | 1 refusé 170 s / 2 accepté 85 s |
| bbf07fd6 Registre de ventes | 2 | 3 | 312 | 0,1168 | 42 568 | 44 798 | 1 refusé 178 s / 2 refusé 64 s / 3 accepté 71 s |
| b010d704 Atelier de réparation | 4 | 2 | 220 | 0,0910 | 23 272 | 38 188 | 1 refusé 133 s / 2 accepté 87 s |

- **Une vraie application coûte de 0,07 à 0,12 $ et prend 4 à 5 minutes**, mesuré.
- **L'anomalie 220 s contre 312 s est résolue :** c'est le nombre de tours. Le mécanisme, lu dans le code : chaque tour réécrit l'application entière (`boucle-directe.ts:897`, « rends TOUS les fichiers » ; `:496` et `:574-575`, les fichiers du tour seul).
- **Part du premier tour dans la durée :** 170/255 = 67 %, 178/312 = 57 %, 133/220 = 60 %. C'est **plus de la moitié** du temps.
- **Part dans le coût : INCONNU.** Le coût n'est pas stocké par tour (§3).

## 1. Une correction de prémisse

**« Deribfy n'a jamais produit une application acceptable du premier coup » est vrai pour ces trois œuvres, pas pour l'historique.** La mesure T4 du 2026-11-16 (`ENQUETE_TOURS_ET_DUREES.md`, générateur `main`) donne **8 acceptations sans reproche au tour 1 sur 72**, soit 11 %. Le premier tour est refusé **neuf fois sur dix** ; ce n'est pas toujours.

**Le carnet n'a pas une ligne par tour :** il a une ligne par **exécution**. Le motif de chaque tour est dans `trace.tours[]` (la trace est `sections_acquises`, `route.ts:958`). Les requêtes déplient ce tableau.

## 2. Requêtes (lecture seule, essayées sur table factice)

**B1 — Les tours des trois œuvres, avec leur motif.** À exporter en CSV : les motifs sont longs.

```sql
select left(a.generation_id::text, 8) as oeuvre, a.rang as tentative, a.issue,
       (t->>'rang')::int as tour, t->>'ok' as accepte,
       round(coalesce((t->>'ms')::numeric, 0) / 1000) as secondes,
       t->>'fichiers' as fichiers,
       coalesce(t->>'tronquee', 'false') as tronquee,
       left(coalesce(t->>'motif', '—'), 1500) as motif
from public.app_generation_attempts a,
     jsonb_array_elements(case when jsonb_typeof(a.trace->'tours') = 'array' then a.trace->'tours' else '[]'::jsonb end) t
where a.generation_id in ('4d480027-995e-43f3-9ba1-de323900fc1f',
                          'bbf07fd6-eed1-4989-a46e-9bac25fb5501',
                          'b010d704-f776-4cd5-8c57-247c95732c19')
order by a.debut_le, a.rang, (t->>'rang')::int;
```

**B2 — Tous les premiers tours du carnet, et les familles de leurs refus.** Le carnet n'existe que depuis le 2026-11-15 : l'échantillon est petit.

```sql
with t as (
  select a.generation_id, (e->>'rang')::int as tour, (e->>'ok')::boolean as ok, coalesce(e->>'motif', '') as motif,
         coalesce((e->>'tronquee')::boolean, false) as tronquee
  from public.app_generation_attempts a,
       jsonb_array_elements(case when jsonb_typeof(a.trace->'tours') = 'array' then a.trace->'tours' else '[]'::jsonb end) e
  where not exists (select 1 from jsonb_array_elements(a.trace->'tours') x where x ? 'passe')
), premiers as (select * from t where tour = 1),
familles as (
  select p.generation_id,
         upper(trim(regexp_replace(split_part(trim(b), E'\n', 1), '\s*[—:].*$', ''))) as famille
  from premiers p, unnest(string_to_array(p.motif, E'\n\n')) as b
  where not p.ok and trim(b) <> ''
)
select '1 · premiers tours' as quoi, null::text as famille,
       count(*) as nombre, count(*) filter (where not ok) as refuses, count(*) filter (where tronquee) as tronques
from premiers
union all
select '2 · familles des refus du tour 1', famille, count(distinct generation_id), null, null
from familles group by famille
order by 1, 3 desc;
```

**B3 — La même mesure sur tout l'historique du générateur `main`** (`app_generations`, moteur `direct`, sans V4). C'est l'élargissement demandé.

```sql
with t as (
  select a.id, (e->>'rang')::int as tour, (e->>'ok')::boolean as ok, coalesce(e->>'motif', '') as motif,
         coalesce((e->>'tronquee')::boolean, false) as tronquee
  from public.app_generations a,
       jsonb_array_elements(case when jsonb_typeof(a.sections_acquises->'tours') = 'array' then a.sections_acquises->'tours' else '[]'::jsonb end) e
  where a.moteur = 'direct' and not exists (select 1 from jsonb_array_elements(a.sections_acquises->'tours') x where x ? 'passe')
), premiers as (select * from t where tour = 1),
familles as (
  select p.id,
         upper(trim(regexp_replace(split_part(trim(b), E'\n', 1), '\s*[—:].*$', ''))) as famille
  from premiers p, unnest(string_to_array(p.motif, E'\n\n')) as b
  where not p.ok and trim(b) <> ''
)
select '1 · premiers tours' as quoi, null::text as famille,
       count(*) as nombre, count(*) filter (where not ok) as refuses, count(*) filter (where tronquee) as tronques
from premiers
union all
select '2 · familles des refus du tour 1', famille, count(distinct id), null, null
from familles group by famille
order by 1, 3 desc;
```

**Lecture :**
- **Une famille présente dans la plupart des premiers tours refusés** désigne une cause commune, qu'une phrase de consigne ou une garde de bibliothèque pourrait viser.
- **Des familles dispersées** donnent une réponse toute autre : pas de levier unique.
- **Réserve :** la famille est la première ligne de chaque reproche. Deux reproches de même titre portant sur des choses différentes y sont confondus. Un échec d'assemblage tombe dans une seule famille, « LA CONSTRUCTION A ÉCHOUÉ » ; B1 donne son détail.

## 3. Question annexe : le premier jet de l'Atelier a-t-il été bâclé ? **INCONNU**

- **Les jetons de sortie ne sont pas stockés par tour.** Un tour ne garde que `rang`, `fichiers`, `ok`, `motif`, `ms`, `tronquee` et `source` (écritures `boucle-directe.ts:824`, `:836`, `:865`). La ligne de l'œuvre et la tentative ne portent que des totaux.
- **Ce que les totaux montrent :** l'Atelier a produit **plus** de jetons de sortie au total (38 188) que « Suivi de stock » (29 318), avec le même nombre de tours. Ses tours sont plus courts (133 s et 87 s, contre 170 s et 85 s). Cela ne dit pas que son premier jet était court : la part de chaque tour n'est pas séparable.
- **Ce qui trancherait :** les jetons et le coût **par tour**. C'est le **manque 2** du chantier de la trace (`PLAN_MANQUE4.md` §2.3), reporté. Les réponses brutes ne sont gardées que pour les tours refusés (`source`, bornée), sans leurs jetons.

---

## 4. Résultats de B1 et B3 (2026-11-16) [OBSERVÉ-PROD]

**B1, les trois œuvres, motif du tour 1 :**
- Suivi de stock : « tables lues avant connexion » (`article`, `mouvement_stock`).
- Registre de ventes : construction échouée, `[UNRESOLVED_IMPORT] './systeme/ui'` depuis `composants/Gestion.tsx` (un chemin relatif faux depuis un sous-dossier) ; puis tour 2 refusé pour « tables lues avant connexion ».
- Atelier : « jetons inexistants » (`var(--ombre)`) et « réglages inconnus » (`<GrilleTableau lignes=…>` dans Clients, Véhicules et Réparations).

**Trois motifs différents.** Le seul commun à deux œuvres est « tables lues avant connexion ».

**B3 : 76 premiers tours, 68 refusés.** Mais B3 était FAUX DANS SA CONSTRUCTION (§5).

## 5. Pourquoi B3 sous-compte, et ce qu'il mélangeait [LU-CODE]

- **Les motifs préfixés `[écran] …` ne viennent pas du générateur `main`.** Ils viennent du générateur par écran de l'**étape 3c** (`boucle-ecrans.ts:137`, branche `etape-3c-2`, absente de `main`, essayé en preview le 2026-11-13). Il aplatit les tentatives de **chaque écran** en « tours » : `rang: t.rang` par écran, et motif `[${e.nom}] …`.
- Ses tours n'ont pas de clé `passe` (elle est née avec V4, `08780633`). Ils passaient donc le filtre « sans V4 ».
- **Conséquence :** une génération 3c apporte **plusieurs « tour 1 »** (un par écran). Le dénominateur de 76 et les familles sont **tous deux contaminés**. Retirer le préfixe ne suffit pas : il faut **exclure** ces générations.
- **Second défaut de B3 :** le découpage sur les lignes vides éclatait un message d'assemblage (son cadre ANSI contient des lignes vides) en fausses familles (`[31M[PARSE_ERROR]…`).

**B4 corrige les deux :**
- générateur `main` seul : aucun tour `passe`, aucun motif `[…`, un seul tour par rang ;
- chaque famille est reconnue par **le titre fixe** que les juges écrivent, relevé dans le code ;
- pour chaque famille, le nombre de premiers tours dont c'est la **SEULE** cause de refus (question c).

Essayé sur une table factice : V4 et 3c exclus, un refus à deux familles n'est compté « seule cause » pour aucune des deux.

```sql
with g as (
  -- Générateur MAIN seul : aucun tour V4 (« passe »), aucun motif par écran (étape 3c, « [écran] … »),
  -- un seul tour par rang.
  select a.id, a.sections_acquises->'tours' as tours
  from public.app_generations a
  where a.moteur = 'direct'
    and jsonb_typeof(a.sections_acquises->'tours') = 'array'
    and not exists (select 1 from jsonb_array_elements(a.sections_acquises->'tours') x
                    where x ? 'passe' or coalesce(x->>'motif', '') ~ '^\[')
    and (select count(*) = count(distinct x->>'rang') from jsonb_array_elements(a.sections_acquises->'tours') x)
), premier as (
  select g.id, (e->>'ok')::boolean as ok, coalesce(e->>'motif', '') as motif
  from g, jsonb_array_elements(g.tours) e
  where (e->>'rang')::int = 1
), familles(famille, motif_re) as (values
  ('construction (assemblage, syntaxe, import)', '^La construction a échoué'),
  ('réponse tronquée',                           'Ta réponse a été coupée'),
  ('aucun fichier',                              'Aucun fichier reçu'),
  ('paquets interdits',                          '^Paquets interdits'),
  ('ne se monte pas',                            'APPLICATION NE SE MONTE PAS'),
  ('jetons inexistants',                         'JETONS QUI N.EXISTENT PAS'),
  ('réglages inconnus des pièces',               'RÉGLAGES QUE LES COMPOSANTS FOURNIS'),
  ('devise',                                     'LA DEVISE DU CLIENT EST'),
  ('contrôles morts',                            'CONTRÔLES MORTS'),
  ('contrôles sans nom',                         'CONTRÔLES SANS NOM LISIBLE'),
  ('données en mémoire / sans table',            'VIVENT EN MÉMOIRE|VEUT SE SOUVENIR ET N.A AUCUNE TABLE'),
  ('tables lues avant connexion',                'TABLES SONT INTERROGÉES AVANT TOUTE CONNEXION'),
  ('chargement = vide',                          'CHARGEMENT QUI ÉCHOUE REND LE MÊME'),
  ('exigences muettes',                          'EXIGENCES DU CAHIER SONT MUETTES'),
  ('déclaration refusée',                        'DÉCLARATION DONNEES.json A ÉTÉ REFUSÉE')
), refus as (
  select p.id, f.famille
  from premier p join familles f on p.motif ~ f.motif_re
  where not p.ok
), par_gen as (
  select p.id, count(r.famille) as n_familles, min(r.famille) as seule
  from premier p left join refus r on r.id = p.id
  where not p.ok group by p.id
)
select '0 · premiers tours (générateur main)' as famille,
       count(*) as generations, count(*) filter (where not ok) as refusees, null::bigint as seule_cause
from premier
union all
select f.famille,
       (select count(distinct r.id) from refus r where r.famille = f.famille),
       null,
       (select count(*) from par_gen pg where pg.n_familles = 1 and pg.seule = f.famille)
from familles f
union all
select 'aucune famille reconnue', (select count(*) from par_gen where n_familles = 0), null, null
order by 2 desc nulls last;
```

**Lecture de `seule_cause` :** c'est le nombre de générations qui auraient été **acceptées au tour 1** si cette famille n'existait pas. C'est un minimum : une génération à deux familles n'est comptée nulle part.

## 6. Le message du juge du contrat : les noms sans les types [LU-CODE + MESURÉ]

- **D'où vient la liste :** `reprocheContrat` (`juge-contrat.ts:255-270`) écrit « Ses réglages : `${d.acceptes.join(', ')}` ». `acceptes` sort de `signaturesDe` (`juge-contrat.ts:108-148`), qui lit les signatures des pièces dans le source de `systeme/ui.tsx`.
- **Le type y est disponible.** `signaturesDe` lit déjà le bloc de type de chaque pièce (`type.matchAll(/([A-Za-z_$][\w$]*)\??\s*:\s*([^;\n]*)/gu)`) pour reconnaître les listes. Le texte du type (`t[2]`) est sous la main, puis jeté. Mesuré sur la bibliothèque : `GrilleTableau(colonnes: number, children: React.ReactNode, enfants: React.ReactNode)`.
- **Ce que coûterait de l'ajouter :**
  - **dans le message du juge seulement :** quelques dizaines de signes par pièce fautive, **seulement quand un défaut existe**. Aucun coût sur une génération sans défaut, rien dans la consigne ;
  - **dans la consigne pour toutes les pièces :** les 15 signatures typées font 2 235 signes. Beaucoup plus, et contraire à la décision ouverte sur la croissance de la consigne ;
  - **un défaut à régler en passant :** le texte de type porte parfois des fragments de commentaires (`tendance). */` dans `CarteDeChiffre`). Il faudrait les nettoyer.
- **Une asymétrie du juge, constatée :** il contrôle déjà un cas de type, une liste attendue reçue comme un texte (`nature !== 'inconnu'`, « attend une LISTE »). Il ne contrôle **pas** l'inverse : un nombre attendu reçu comme une liste (`colonnes={[…]}`). C'est exactement le tour 2 de l'Atelier. Ce cas est statique, donc visible sans données.

**Aucune correction ici.**

---

## 7. Résultat de B4 (2026-11-16) [OBSERVÉ-PROD, export du propriétaire]

**Générateur `main` : 46 premiers tours, 41 refusés (89 %).**

| famille | générations touchées au tour 1 | seule cause |
|---|---|---|
| construction (assemblage, syntaxe, import) | 13 | **13** |
| ne se monte pas | 11 | 3 |
| données en mémoire / sans table | 9 | 0 |
| exigences muettes | 9 | 3 |
| jetons inexistants | 8 | 2 |
| tables lues avant connexion | 7 | 1 |
| chargement = vide | 6 | 0 |
| réglages inconnus des pièces | 4 | 1 |
| contrôles sans nom | 4 | 0 |
| contrôles morts | 2 | 1 |
| aucune famille reconnue | 0 | — |

- **Somme des « seule cause » : 24 premiers tours** refusés pour une seule famille. **17** l'ont été pour deux familles ou plus.
- **Aucune famille n'explique à elle seule la moitié des refus.** La première, la construction, en explique **13 sur 41, soit 32 %**. Selon la règle posée par le propriétaire, aucune n'est traitée.
- **Chiffre utile malgré tout :** sans la construction, 13 générations de plus auraient été acceptées au tour 1, soit **18 sur 46 au lieu de 5**.

### Les trois premières familles

**1. Construction : 13 générations, 13 en seule cause.**
- **a) Évitable ? En partie.** B3 en montrait des fragments :
  - des erreurs de syntaxe JSX (`[PARSE_ERROR]` : « Unexpected token », « Did you mean `{'>'}` », « Unterminated string », « Expected `>` ») : des fautes de frappe du modèle ;
  - un chemin d'import faux (`[UNRESOLVED_IMPORT] './systeme/ui'` depuis `composants/`).
  
  La répartition exacte est **INCONNUE** : B5 la donne.
- **b) Une garde ?**
  - Pour le **chemin d'import**, oui : l'assembleur pourrait résoudre `systeme/…` depuis n'importe quel sous-dossier. La faute deviendrait impossible, sans consigne.
  - Pour la **syntaxe**, pas de garde qui l'empêche. C'est une faute d'écriture, que le tour suivant corrige déjà.
- **c)** 13, soit le plafond de ce qu'une garde sur la construction peut rendre. Elle ne rendrait que **la part « import »** de ces 13, inconnue avant B5.

**2. Ne se monte pas : 11 générations, 3 en seule cause.**
- **a) Mélangé.** Une partie de ces refus venait de **D1**, le juge qui ne posait pas `window.DERIBFY_BASE` : c'est un faux refus de l'instrument, corrigé ce jour (`1f84a310`, en production depuis 14:59:31 UTC le 2026-11-16). Le carnet de dépenses du matin en était un. B5 sépare les refus avant et après ce déploiement.
- **b) Déjà traité pour la part D1.** Pour le reste (des API retirées comme `ReactDOM.render`, des erreurs de rendu), une garde dépend du cas.
- **c)** 3 au plus.

**3. Ex æquo, 9 chacune :**
- **données en mémoire : seule cause 0.** La supprimer ne rendrait **aucun** premier tour, car elle n'est jamais seule.
- **exigences muettes : seule cause 3.** C'est le juge de couverture, dont les familles sont des mots (`ENQUETE_QUALITE_GENERATEUR.md`). Une part de ces refus peut venir de l'instrument : **INCONNU**.

### B5 — le détail des deux premières familles, avant et après D1 (essayée sur table factice)

Version du 2026-11-16, soir : elle ajoute la CIBLE de chaque import non résolu (`systeme/…` ou un composant de l'œuvre) et la signature de D1 (`reading 'url'`). La correction dans l'assembleur ne vaut que pour la part « import » ; la cible dit laquelle on peut résoudre sans deviner.

```sql
with g as (
  select a.id, a.created_at, a.sections_acquises->'tours' as tours
  from public.app_generations a
  where a.moteur = 'direct'
    and jsonb_typeof(a.sections_acquises->'tours') = 'array'
    and not exists (select 1 from jsonb_array_elements(a.sections_acquises->'tours') x
                    where x ? 'passe' or coalesce(x->>'motif', '') ~ '^\[')
    and (select count(*) = count(distinct x->>'rang') from jsonb_array_elements(a.sections_acquises->'tours') x)
), premier as (
  select g.id, g.created_at, coalesce(e->>'motif', '') as motif
  from g, jsonb_array_elements(g.tours) e
  where (e->>'rang')::int = 1 and not (e->>'ok')::boolean
)
select case when motif ~ '^La construction a échoué' then 'construction'
            when motif ~ 'APPLICATION NE SE MONTE PAS' then 'ne se monte pas' end as famille,
       coalesce(substring(motif from '\[([A-Z_]{3,})\]') ||
                  coalesce(' → ' || substring(motif from 'Could not resolve ''([^'']+)'''), ''),
                left(regexp_replace(substring(motif from 'APPLICATION NE SE MONTE PAS[^\n]*\n- ([^\n]*)'), '\s+', ' ', 'g'), 90),
                '(sans code)') as detail,
       count(*) filter (where motif ~ 'reading .url.') as signature_d1,
       count(*) filter (where created_at <  '2026-11-16 14:59:31+00') as avant_d1,
       count(*) filter (where created_at >= '2026-11-16 14:59:31+00') as apres_d1
from premier
where motif ~ '^La construction a échoué' or motif ~ 'APPLICATION NE SE MONTE PAS'
group by 1, 2
order by 1, 3 desc, 2;
```

**Décision du propriétaire (2026-11-16) :** le seuil « la moitié des refus » est abandonné. La construction sera traitée, **pour sa seule moitié mécanique** (les imports), dans l'**assembleur** et jamais dans la consigne, une fois chiffrée par B5.

---

## 8. Résultat de B5 (2026-11-16, soir) [OBSERVÉ-PROD]

**Construction (13) :** sans code 6 · `PARSE_ERROR` 6 · `UNRESOLVED_IMPORT → ./systeme/ui` 1. Un import sur treize : **la piste de l'assembleur est abandonnée**, sur décision du propriétaire.

**Ne se monte pas (11) :**

| détail | refus | origine |
|---|---|---|
| `reading 'url'` (signature de D1) | 5 | **notre instrument** : le juge ne posait pas `DERIBFY_BASE`, corrigé (`1f84a310`) |
| `supabaseUrl is required` | 2 | **le modèle** (a, ci-dessous) |
| `navigator.locks.request` refusé en origine opaque | 1 | **le modèle** (b, ci-dessous) |
| `Pastille is not defined`, `formaterIndex is not defined`, `object is not iterable` | 3 | le modèle |

### a) « supabaseUrl is required » : une faute réelle du modèle, pas un artefact

- **Rejoué avec le vrai assembleur et le vrai juge actuel**, qui pose la base vide comme l'aperçu :
  - `const base = createClient(b.url, …)` sans garde → **ne monte pas**, `import : supabaseUrl is required.` ;
  - avec la garde que la consigne écrit mot pour mot (`const enBase = b.url !== '' && window.origin !== 'null'`, `const base = enBase ? createClient(…) : null`, `entites-declarees.ts:367-378`) → **monte**, aucune erreur.
- **Dans le vrai aperçu de Deribfy, l'URL est aussi vide** (`pageAutonome`, `boucle-directe.ts`). L'application aurait planté **sous les yeux de l'utilisateur**. Le juge reproduit ici la réalité ; il ne fabrique rien.
- **Nuance de date :** ces 2 refus sont **antérieurs** à D1. Le juge d'alors ne posait pas `DERIBFY_BASE`, et le modèle devait donc lire la base avec une valeur de repli (`?.` ou `??`). L'issue dans l'aperçu réel aurait été la même.

### b) `navigator.locks` refusé : la reproduction voulue de l'aperçu, à ne pas lever

- Le juge pose `navigator.locks` **exprès, refusant** (`juge-execution-enfant.mjs:112-146`, mesuré le 2026-11-05). Dans un cadre `sandbox="allow-scripts"` sans `allow-same-origin`, l'API existe et refuse (pile Safari `request@[native code]`). C'est ce que rencontre l'utilisateur dans l'aperçu.
- **La lever rendrait le juge menteur : ce serait D1 à l'envers.** Le modèle *peut* éviter ce refus : il vient du SDK Supabase créé dans l'aperçu, et la garde de la consigne (`window.origin !== 'null'`) l'empêche.
- **Nombre :** 1 refus.

### Le taux réel de refus au tour 1

- **Ce ne sont pas 8 artefacts sur 11 : c'en sont 5**, ceux de D1.
- Ces 5 générations n'ont pas forcément été refusées **pour D1 seul**. B4 donne « seule cause : ne se monte pas » = **3**, toutes sous-causes confondues. **Au plus 3** des 41 refus disparaissent donc grâce à la correction de D1.
- **Taux réel au tour 1 : au moins 38 sur 46, soit 83 %**, contre 89 % mesuré. **Pas 72 %.**
- Le chiffre exact entre 83 % et 89 % est **INCONNU**. Il faudrait savoir, pour chacune des 5, si D1 était sa seule famille.

**Aucune correction.** La suite est la génération de l'Atelier lancée par le propriétaire : elle teste d'un coup la consigne du matin et le contrôle de type du juge.

