-- CLÉ ÉTRANGÈRE : app_generation_versions.generation_id → app_generations.id
--
-- ── POURQUOI (2026-11-15).
--
-- Défaut prouvé : une régénération réécrivait la clé primaire de
-- `app_generations` (docs/elite-protocol/PREUVE_REGENERATION.md). Les
-- versions restaient rattachées à l'ancien identifiant, que plus aucune
-- ligne ne portait — et la base a laissé faire : relevé de production du
-- 2026-11-15, AUCUNE clé étrangère entre les deux tables, aucun déclencheur.
-- Le code est réparé (fix/regeneration-identifiant) ; cette contrainte fait
-- que la base refuse d'elle-même la prochaine variante du même accident.
--
-- ── LE COMPORTEMENT CHOISI : RESTRICT, À LA MISE À JOUR COMME À LA SUPPRESSION.
--
-- ON UPDATE RESTRICT — changer l'identifiant d'une œuvre qui a des versions
-- est EXACTEMENT le défaut. `cascade` l'aurait rendu silencieux (les versions
-- auraient suivi) au lieu de le rendre impossible. L'identifiant d'une œuvre
-- est cuit dans sa porte, son schéma publié et ses comptes : il ne doit
-- jamais changer, et la base doit le dire.
--
-- ON DELETE RESTRICT, et pas CASCADE — le produit ne supprime JAMAIS une
-- ligne d'œuvre : la suppression est douce (statut « supprimee ») et la
-- purge ne vide que `document`, la ligne restant comme pierre tombale
-- (app/api/cron/purge-supprimees/route.ts). Une suppression physique est donc
-- un geste manuel ou un accident. Chaque version est une œuvre PAYÉE :
-- `cascade` les effacerait en silence avec leur parent, sans retour possible.
-- RESTRICT oblige à supprimer les versions d'abord, explicitement.
-- (Les tirs qui suppriment leurs lignes d'essai — src/tirs/*.tir.ts — les
-- insèrent directement, sans version : ils ne sont pas touchés.)
--
-- ── SÛRETÉ.
--
-- 1. Les orphelins sont RE-COMPTÉS dans la transaction (relevé du
--    2026-11-15 : zéro). S'il y en a, la migration s'arrête avec leur nombre
--    et NE POSE RIEN : ces lignes sont des œuvres payées, on ne les efface
--    pas pour faire passer une contrainte. (Postgres refuserait de toute
--    façon de valider la clé ; le comptage rend le refus lisible.)
-- 2. Idempotente : relancée, elle ne fait rien de plus.
-- 3. Aucune donnée n'est lue pour être réécrite : seul le schéma change.
--
-- ── ANNULATION : app_generation_versions_fk_generation_annulation.sql
--
-- NON APPLIQUÉE EN PRODUCTION. L'application est la décision du propriétaire.

begin;

do $$
declare
  orphelins bigint;
begin
  select count(*) into orphelins
  from public.app_generation_versions v
  left join public.app_generations g on g.id = v.generation_id
  where g.id is null;

  if orphelins > 0 then
    raise exception
      'MIGRATION ARRÊTÉE : % version(s) orpheline(s) dans app_generation_versions. Rien n''a été posé.',
      orphelins;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'app_generation_versions_generation_fk'
      and conrelid = 'public.app_generation_versions'::regclass
  ) then
    alter table public.app_generation_versions
      add constraint app_generation_versions_generation_fk
      foreign key (generation_id)
      references public.app_generations (id)
      on update restrict
      on delete restrict;
  end if;
end $$;

commit;
