-- ════════════════════════════════════════════════════════════════════
-- LES ŒUVRES APPARTIENNENT À `deribfy_oeuvres` (2026-11-18).
-- À appliquer sur la base DES ŒUVRES, par le propriétaire, APRÈS
-- `compte_oeuvre.sql` (le filet d'abord, la porte ensuite).
-- ════════════════════════════════════════════════════════════════════
--
-- ── LE DÉFAUT, MESURÉ EN PRODUCTION.
--
-- La publication (`poser-oeuvre.ts`) créait schémas et tables en tant que
-- `postgres`. La retouche migre comme `deribfy_migrateur`, qui hérite de
-- `deribfy_oeuvres` — c'est le dessin de `garde-migration.sql`. Or
-- `ALTER TABLE … ADD COLUMN` exige d'être propriétaire :
--   « must be owner of table produit » (pharma, cas 3, 2026-11-18).
-- Les 30 tables et les 10 schémas des 10 œuvres publiées appartenaient à
-- `postgres` : AUCUNE retouche ajoutant une donnée n'a jamais pu passer.
--
-- ── CE QUI NE CHANGE PAS.
--
-- Les gardes ne regardent que `session_user = 'deribfy_migrateur'` : un
-- propriétaire peut détruire, le migrateur en reste empêché (étage 1,
-- `sql_drop` ; déclencheur `truncate`). Les droits accordés et les
-- politiques suivent la table (Postgres les reporte au nouveau
-- propriétaire). La sécurité par ligne FORCÉE reste forcée.
--
-- ── COUPURE : AUCUNE ATTENTE EN FILE.
--
-- Changer un propriétaire prend un verrou exclusif sur la table, le temps
-- de l'instruction. Si une requête longue tient déjà une table, on
-- n'attend pas plus de 3 s : la transaction ÉCHOUE et rien n'est changé,
-- plutôt que d'empiler les requêtes de l'application derrière nous.
-- Relancer suffit.
--
-- ── LA GARDE `truncate` D'ABORD — SANS ELLE, LA PROPRIÉTÉ OUVRIRAIT UNE PORTE.
--
-- MESURÉ EN PRODUCTION : 0 table d'œuvre sur 30 portait le déclencheur
-- `deribfy_sans_truncate` que `garde-migration.sql` demande de poser, et
-- aucun code ne le posait. Sans conséquence tant que `deribfy_oeuvres`
-- n'était pas propriétaire (pas le droit de vider une table). Propriétaire,
-- il l'aurait — mesuré sur un Postgres jetable : `truncate` ACCEPTÉ.
--
-- `deribfy_garder_tables(schéma)` pose la garde sur chaque table qui ne
-- l'a pas, et rend le nombre de tables ENCORE sans garde (0 attendu). Une
-- seule fonction, trois appelants : ce fichier, la publication, et la
-- migration d'une retouche qui crée une table. Le migrateur n'a pas le
-- droit d'exécuter la fonction de refus (révoqué à tous) : c'est donc
-- celle-ci, propriété de `postgres`, qui la pose pour lui.
--
-- ── TOUT OU RIEN, ET REJOUABLE.
--
-- Une transaction. Les schémas sont lus au catalogue (`oeuvre_…`), jamais
-- listés à la main : une œuvre publiée entre-temps est couverte.
-- Relancé, il ne change rien : le propriétaire est déjà le bon.
begin;
set local lock_timeout = '3s';

create or replace function public.deribfy_garder_tables(p_schema text) returns integer
language plpgsql security definer set search_path = '' as $fn$
declare
  t record;
  restantes integer;
begin
  if p_schema !~ '^oeuvre_[a-z0-9_]+$'
     or not exists (select 1 from pg_catalog.pg_namespace where nspname = p_schema) then
    raise exception 'deribfy_garder_tables : schéma refusé (%)', p_schema;
  end if;
  for t in
    select k.oid, k.relname
      from pg_catalog.pg_class k
      join pg_catalog.pg_namespace s on s.oid = k.relnamespace
     where s.nspname = p_schema and k.relkind = 'r'
       and not exists (select 1 from pg_catalog.pg_trigger g
                        where g.tgrelid = k.oid and g.tgname = 'deribfy_sans_truncate')
  loop
    execute format(
      'create trigger deribfy_sans_truncate before truncate on %I.%I '
      'for each statement execute function public.deribfy_refus_truncate()',
      p_schema, t.relname);
  end loop;
  select count(*) into restantes
    from pg_catalog.pg_class k
    join pg_catalog.pg_namespace s on s.oid = k.relnamespace
   where s.nspname = p_schema and k.relkind = 'r'
     and not exists (select 1 from pg_catalog.pg_trigger g
                      where g.tgrelid = k.oid and g.tgname = 'deribfy_sans_truncate');
  return restantes;
end;
$fn$;
revoke all on function public.deribfy_garder_tables(text) from public, anon, authenticated;
grant execute on function public.deribfy_garder_tables(text) to deribfy_oeuvres;

do $$
declare
  s record;
  t record;
begin
  for s in
    select nspname from pg_catalog.pg_namespace
     where nspname ~ '^oeuvre_[a-z0-9_]+$' order by nspname
  loop
    -- La garde AVANT la propriété, dans la même transaction.
    if public.deribfy_garder_tables(s.nspname) <> 0 then
      raise exception 'garde truncate incomplète sur %', s.nspname;
    end if;
    execute format('alter schema %I owner to deribfy_oeuvres', s.nspname);
    for t in
      select c.relname, c.relkind
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = s.nspname and c.relkind in ('r', 'p', 'S', 'v', 'm')
       order by c.relname
    loop
      execute format(
        case t.relkind
          when 'S' then 'alter sequence %I.%I owner to deribfy_oeuvres'
          when 'v' then 'alter view %I.%I owner to deribfy_oeuvres'
          when 'm' then 'alter materialized view %I.%I owner to deribfy_oeuvres'
          else 'alter table %I.%I owner to deribfy_oeuvres'
        end,
        s.nspname, t.relname);
    end loop;
  end loop;
end $$;

commit;

-- VÉRIFICATIONS (lecture seule, une instruction chacune) — 0 ligne attendue :
--   select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname like 'oeuvre\_%' and c.relkind = 'r'
--      and not exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = 'deribfy_sans_truncate');
--
--   select n.nspname, c.relname, pg_get_userbyid(c.relowner)
--     from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname like 'oeuvre\_%' and c.relkind in ('r','p','S','v','m')
--      and pg_get_userbyid(c.relowner) <> 'deribfy_oeuvres';
