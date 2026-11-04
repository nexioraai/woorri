-- ════════════════════════════════════════════════════════════════════
-- G · LE RÔLE QUI MIGRE NE DÉTIENT PAS LE POUVOIR DE DÉTRUIRE
-- Appliqué sur la base DES ŒUVRES le 2026-11-04. Rejouable tel quel.
-- ════════════════════════════════════════════════════════════════════
--
-- ── POURQUOI UN PRIVILÈGE RETIRÉ, ET PAS UNE RÈGLE ÉCRITE.
--
-- Observation documentée : un agent ajoute souvent `--force` après qu'un
-- push a échoué sur une invite à laquelle il ne sait pas répondre. Sur
-- Cursor, l'agent a reconnu « DO NOT RUN ANYTHING » puis a exécuté quand
-- même. Une règle écrite dans une consigne n'est pas une garde.
--
-- ── L'OBSTACLE QUE LA LITTÉRATURE NE MENTIONNE PAS.
--
-- En Postgres, `ALTER TABLE … ADD COLUMN` exige d'être PROPRIÉTAIRE, et
-- un propriétaire peut TOUJOURS `DROP`. Un rôle « qui ne détient pas le
-- droit de détruire » et qui peut quand même ajouter une colonne
-- n'existe pas par les droits seuls.
--
-- Les DÉCLENCHEURS D'ÉVÉNEMENT, eux, tournent DANS LE MOTEUR, et un rôle
-- qui n'en est pas propriétaire ne peut pas les lever. Mesuré :
-- `drop event trigger` → « must be owner of event trigger ».
--
-- ── SESSION_USER, JAMAIS CURRENT_USER.
--
-- `set role deribfy_oeuvres` change `current_user` en un mot, et une
-- garde posée dessus serait levée par l'instruction même qu'elle doit
-- arrêter. `session_user` ne change pas. Mesuré dans les deux
-- situations : avant et après `set role`, tout est refusé.

-- ── LES DEUX RÔLES ───────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'deribfy_oeuvres') then
    create role deribfy_oeuvres nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'deribfy_migrateur') then
    create role deribfy_migrateur login;
  end if;
end $$;

alter role deribfy_migrateur nocreaterole nocreatedb nobypassrls inherit;
-- Le mot de passe se pose à la main, et ne transite par aucun fichier
-- versionné : il vit dans `OEUVRES_DATABASE_URL_MIGRATEUR`.

-- ── L'HÉRITAGE SE FIGE AU MOMENT DU `grant` (Postgres 16+).
--
-- DÉFAUT MESURÉ : `alter role … inherit` posé APRÈS l'appartenance ne la
-- change pas. Le migrateur recevait « permission denied for schema »
-- alors que son rôle était bien `inherit`. L'option se porte sur
-- l'APPARTENANCE, pas sur le rôle.
grant deribfy_oeuvres to deribfy_migrateur with inherit true;
grant deribfy_oeuvres to postgres;
grant create on database postgres to deribfy_oeuvres;
grant anon, authenticated to deribfy_oeuvres;

-- ── ÉTAGE 1 · LE MOTEUR VOIT CE QUI DISPARAÎT ───────────────────────
--
-- `sql_drop` attrape, mesuré : table · schema · table column. Les
-- politiques NE sont PAS dans la liste : les retirer avant de les
-- reposer est le geste normal d'une migration, et il ne détruit aucune
-- donnée. Un DÉCLENCHEUR retiré, en revanche, est une garde levée.
create or replace function public.deribfy_refus_destruction() returns event_trigger
language plpgsql security definer as $fn$
declare o record;
begin
  if session_user <> 'deribfy_migrateur' then return; end if;
  for o in select object_type, object_identity from pg_event_trigger_dropped_objects() loop
    if o.object_type in (
      'table', 'schema', 'table column', 'view', 'materialized view',
      'sequence', 'trigger', 'function'
    ) then
      raise exception 'DERIBFY: destruction refusee — % « % »', o.object_type, o.object_identity
        using hint = 'ce role ne detruit rien : les donnees d''un client ne se suppriment pas par une migration.';
    end if;
  end loop;
end
$fn$;
drop event trigger if exists deribfy_sans_destruction;
create event trigger deribfy_sans_destruction on sql_drop
  execute function public.deribfy_refus_destruction();

-- ── ÉTAGE 2 · LE MOTEUR VOIT LES RÉÉCRITURES ────────────────────────
--
-- `table_rewrite` attrape, mesuré : `alter column … type` ET
-- `add column … default gen_random_uuid()`. C'est la SECONDE garde sur
-- le défaut volatile, indépendante de la liste blanche de M2 — et
-- celle-là, aucun texte ne la trompe.
create or replace function public.deribfy_refus_reecriture() returns event_trigger
language plpgsql security definer as $fn$
begin
  if session_user <> 'deribfy_migrateur' then return; end if;
  raise exception 'DERIBFY: reecriture de table entiere refusee sur « % »',
    pg_event_trigger_table_rewrite_oid()::regclass
    using hint = 'une reecriture bloque lectures ET ecritures sur des donnees reelles.';
end
$fn$;
drop event trigger if exists deribfy_sans_reecriture;
create event trigger deribfy_sans_reecriture on table_rewrite
  execute function public.deribfy_refus_reecriture();

-- ── ÉTAGE 3 · LE TEXTE, ET C'EST LE PLUS FAIBLE DES TROIS ───────────
--
-- `rename` et `set not null` ne produisent NI `sql_drop` NI
-- `table_rewrite` — mesuré — et `ddl_command_start` ne distingue pas les
-- sous-commandes d'un `ALTER TABLE` : les sept formes essayées portent
-- toutes le même tag. Postgres n'offre rien d'autre.
--
-- CET ÉTAGE LIT LA REQUÊTE. Il est la DEUXIÈME ligne derrière la liste
-- blanche de M2, pas la première — et il est écrit ici pour que
-- quiconque le lise sache lequel des trois peut être trompé.
create or replace function public.deribfy_refus_alter() returns event_trigger
language plpgsql security definer as $fn$
declare q text;
begin
  if session_user <> 'deribfy_migrateur' then return; end if;
  q := lower(regexp_replace(current_query(), '\s+', ' ', 'g'));
  if q ~ 'rename' or q ~ 'set not null' or q ~ 'drop column'
     or q ~ 'alter column .* type ' then
    raise exception 'DERIBFY: cette forme d''ALTER TABLE est refusee a ce role'
      using hint = 'seul « add column if not exists » est permis.';
  end if;
end
$fn$;
drop event trigger if exists deribfy_alter_borne;
create event trigger deribfy_alter_borne on ddl_command_start
  when tag in ('ALTER TABLE') execute function public.deribfy_refus_alter();

-- ── ÉTAGE 4 · TRUNCATE, QUE RIEN D'AUTRE NE VOIT ────────────────────
--
-- MESURE DU 2026-11-04 : `truncate` ne déclenche AUCUN des quatre
-- événements. La ligne a réellement disparu pendant la mesure —
-- « lignes encore là : 0 ». Et le propriétaire d'une table peut toujours
-- la vider : aucun `revoke` ne l'en empêche.
--
-- Seul un déclencheur DE TABLE l'attrape. Il est posé PAR LA PLATEFORME
-- sur chaque table d'œuvre, jamais émis dans le SQL de l'œuvre : le zip
-- téléchargé doit rester portable, et `public.deribfy_*` n'existe pas
-- chez la personne qui le dézippe.
create or replace function public.deribfy_refus_truncate() returns trigger
language plpgsql security definer as $fn$
begin
  if session_user = 'deribfy_migrateur' then
    raise exception 'DERIBFY: truncate refuse sur « % »', tg_table_name;
  end if;
  return null;
end
$fn$;

-- À POSER SUR CHAQUE TABLE CRÉÉE, par `poserOeuvre` et par la migration :
--
--   create trigger deribfy_sans_truncate before truncate on <table>
--     for each statement execute function public.deribfy_refus_truncate();
--
-- Le retirer est refusé par l'étage 1 (`trigger` est dans sa liste).

-- ════════════════════════════════════════════════════════════════════
-- LA BATTERIE, MESURÉE CONNECTÉ COMME `deribfy_migrateur`
-- ════════════════════════════════════════════════════════════════════
--   ✓ ACCEPTÉ  create table · add column
--   ✓ refusé   drop column · alter column type · set not null · rename
--   ✓ refusé   add column à défaut volatile   (table_rewrite)
--   ✓ refusé   drop table · drop schema       (sql_drop)
--   ✓ refusé   TRUNCATE                       (déclencheur de table)
--   ✓ refusé   SET ROLE deribfy_oeuvres puis TRUNCATE
--   ✓ refusé   drop trigger (retirer la garde)
--   ✓ refusé   drop event trigger (lever la garde)
--   lignes encore là après la batterie : 1
-- ════════════════════════════════════════════════════════════════════
