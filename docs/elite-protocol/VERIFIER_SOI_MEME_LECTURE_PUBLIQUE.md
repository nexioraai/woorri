# Vérifier soi-même ce qu'une application publiée laisse lire (2026-11-16)

Objectif : savoir par soi-même, sans croire Deribfy, qui peut lire chaque table d'une application publiée.

## 1. Deux projets Supabase, pas un

| Projet | Identifiant | Rôle | Où l'identifiant apparaît (mesuré le 2026-11-16) |
|---|---|---|---|
| `nexiora-ai` (org « nexioraai's Org ») | `lefumezaxfsttigpmzhr` | **Deribfy lui-même** : comptes, générations (`app_generations`) | dans le JavaScript servi par www.deribfy.com (variable `NEXT_PUBLIC_SUPABASE_URL`, `src/lib/supabase-admin.ts:4`) |
| `deribfy-bus-intercites` (org « supabase-bench-test ») | `psxbilpmnojtlzosokzz` | **les applications publiées** : un schéma `oeuvre_<id>` par application | dans la page servie par une.deribfy.app (`DERIBFY_BASE.url`) ; variable `OEUVRES_SUPABASE_URL` (`src/lib/apps/base-oeuvres.ts:57`) |

Les deux ne se mélangent pas, par construction (`base-oeuvres.ts:19-34`). Les tables des applications **ne sont pas** dans `nexiora-ai`. C'est pourquoi les deux essais faits dans `nexiora-ai` ont rendu « No rows returned ».

Les noms des projets viennent de la note du 2026-11-14 (`deribfy-projets-supabase`). Les identifiants, eux, ont été remesurés aujourd'hui.

## 2. L'éditeur SQL du bon projet

https://supabase.com/dashboard/project/psxbilpmnojtlzosokzz/sql/new

## 3. La requête

Elle fonctionne en lecture seule et ne contient aucun nom deviné : elle liste elle-même les schémas `oeuvre_…` et leurs tables. Mesuré le 2026-11-16 : **22 lignes**.

```sql
select
  n.nspname as schema_application,
  c.relname as table_name,
  case
    when has_table_privilege('anon', c.oid, 'SELECT')
     and exists (select 1 from pg_policies p
                 where p.schemaname = n.nspname and p.tablename = c.relname
                   and 'anon' = any (p.roles) and p.cmd in ('SELECT', 'ALL'))
      then 'TOUT LE MONDE (anon, sans compte)'
    when has_table_privilege('authenticated', c.oid, 'SELECT')
      then 'comptes de l''application seulement (authenticated)'
    else 'personne'
  end as qui_peut_lire,
  has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE') as sans_compte_peut_ecrire
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname like 'oeuvre\_%' and c.relkind in ('r', 'p', 'v', 'm')
order by 1, 2;
```

**Comment lire le résultat.**

- Si une ligne dit « TOUT LE MONDE », n'importe qui, sans compte, peut télécharger toute cette table.
- Si elle dit « comptes de l'application seulement », il faut un compte de **cette** application. La politique vérifie `app_metadata.oeuvre` (`politiques-donnees.ts:252-255`).
- `sans_compte_peut_ecrire` doit toujours valoir `false`.

**Résultat du 2026-11-16 à 23 h UTC** : 22 tables dans 8 applications. Les 22 sont réservées aux comptes de l'application, et aucune n'est modifiable sans compte.

L'œuvre `425a49a4`, celle de l'avertissement, n'y figure pas. Le schéma ne se crée qu'à la publication (`publier/route.ts`, `poserOeuvre`), et elle n'a jamais été publiée.

## 4. La mesure sans session, à relancer depuis un Mac

Ces commandes n'utilisent que la clé publiable, qui est écrite dans la page publiée. Aucun compte n'est nécessaire.

```sh
# 1) ce que la page publiée donne elle-même : adresse, clé, schéma
curl -s https://une.deribfy.app/ | grep -oE '"(url|clePubliable|schema)":"[^"]+"' | sort -u

# 2) lire chaque table sans compte (remplacer client par vehicule, reparation, piece)
curl -s -w ' [HTTP %{http_code}]\n' \
  -H 'apikey: sb_publishable_K4FN2A0b0A4tN6modZQmOg_Hw3siu10' \
  -H 'Accept-Profile: oeuvre_3b96d2e7_ca46_40d3_86c0_a084cd6ea99e' \
  'https://psxbilpmnojtlzosokzz.supabase.co/rest/v1/client?select=*'

# 3) essayer d'écrire sans compte
curl -s -w ' [HTTP %{http_code}]\n' -X POST \
  -H 'apikey: sb_publishable_K4FN2A0b0A4tN6modZQmOg_Hw3siu10' \
  -H 'Content-Profile: oeuvre_3b96d2e7_ca46_40d3_86c0_a084cd6ea99e' \
  -H 'Content-Type: application/json' \
  -d '{"description":"essai sans compte"}' \
  'https://psxbilpmnojtlzosokzz.supabase.co/rest/v1/reparation'
```

**Réponses brutes du 2026-11-16, 23:40 UTC.**

1. La commande 1 rend :
   - `"url":"https://psxbilpmnojtlzosokzz.supabase.co"`
   - `"clePubliable":"sb_publishable_K4FN2A0b0A4tN6modZQmOg_Hw3siu10"`
   - `"schema":"oeuvre_3b96d2e7_ca46_40d3_86c0_a084cd6ea99e"`
2. La commande 2 rend, pour chacune des quatre tables :
   `{"code":"42501",…,"message":"permission denied for table <table>"} [HTTP 401]`
3. La commande 3 rend :
   `{"code":"42501",…,"hint":"…GRANT INSERT ON …reparation TO anon;","message":"permission denied for table reparation"} [HTTP 401]`

**Comment lire.**

- Une réponse `[HTTP 200]` suivie de `[...]` contenant des lignes veut dire que la table est lisible par tout le monde.
- Une réponse `42501 permission denied` veut dire que personne ne la lit sans compte.

Si une page publiée de Deribfy est refusée par le réseau, les commandes 2 et 3 fonctionnent quand même. Elles n'appellent que supabase.co, avec les valeurs ci-dessus.
