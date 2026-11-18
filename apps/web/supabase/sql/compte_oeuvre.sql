-- ════════════════════════════════════════════════════════════════════
-- LE FILET QUI VOIT — compter les lignes d'une œuvre AU TRAVERS de la
-- sécurité par ligne (2026-11-18). À appliquer sur la base DES ŒUVRES.
-- ════════════════════════════════════════════════════════════════════
--
-- ── LE DÉFAUT, MESURÉ EN PRODUCTION.
--
-- Les 30 tables des 10 œuvres publiées ont `force row level security`.
-- Le migrateur comptait donc SOUS la sécurité par ligne, et voyait zéro :
--   produit de pharma, compté comme `postgres`          : 4
--   le même, compté comme `deribfy_oeuvres`             : 0
-- L'écran disait « Vous n'avez encore rien saisi : il n'y a rien à
-- conserver » à une pharmacie qui avait 4 produits, 3 clients, 2 ventes.
-- Et le contrôle d'après-migration comparait 0 à 0 : le filet contre la
-- perte de données ne pouvait RIEN voir.
--
-- ── CE QUE LA FONCTION REND, ET RIEN D'AUTRE.
--
-- Des NOMBRES : une ligne par table (`cible` = la table), une ligne par
-- colonne (`cible` = « table.colonne », valeurs non nulles). Aucune valeur,
-- aucune ligne de donnée. Même principe que `deribfy_compte_utilisateurs`.
--
-- ── POURQUOI ELLE VOIT, ET POURQUOI C'EST BORNÉ.
--
-- `security definer` : elle s'exécute avec les droits de son propriétaire
-- (`postgres`, qui passe la sécurité par ligne — mesuré ci-dessus). Elle
-- n'accepte qu'un schéma `oeuvre_…` qui existe, et ne lit que le
-- catalogue de CE schéma. `search_path` vide : aucun objet ne peut être
-- substitué par un homonyme.
--
-- Rejouable : `create or replace`. Une transaction : tout ou rien.
begin;

create or replace function public.deribfy_compte_oeuvre(p_schema text)
returns table (cible text, n bigint)
language plpgsql security definer stable set search_path = '' as $fn$
declare
  t record;
  c record;
begin
  if p_schema !~ '^oeuvre_[a-z0-9_]+$'
     or not exists (select 1 from pg_catalog.pg_namespace where nspname = p_schema) then
    raise exception 'deribfy_compte_oeuvre : schéma refusé (%)', p_schema;
  end if;
  for t in
    select k.oid, k.relname
      from pg_catalog.pg_class k
      join pg_catalog.pg_namespace s on s.oid = k.relnamespace
     where s.nspname = p_schema and k.relkind = 'r'
     order by k.relname
  loop
    cible := t.relname;
    execute format('select count(*) from %I.%I', p_schema, t.relname) into n;
    return next;
    for c in
      select a.attname
        from pg_catalog.pg_attribute a
       where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
       order by a.attnum
    loop
      cible := t.relname || '.' || c.attname;
      execute format('select count(%I) from %I.%I', c.attname, p_schema, t.relname) into n;
      return next;
    end loop;
  end loop;
end;
$fn$;

revoke all on function public.deribfy_compte_oeuvre(text) from public, anon, authenticated;
grant execute on function public.deribfy_compte_oeuvre(text) to deribfy_oeuvres;

commit;
