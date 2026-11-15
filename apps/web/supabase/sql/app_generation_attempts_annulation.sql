-- ANNULATION de app_generation_attempts.sql
--
-- ATTENTION : retire la table ET SON CONTENU. Les tentatives écrites depuis la
-- pose sont perdues. Ni `app_generations` ni `app_generation_versions` ne
-- sont touchées.
--
-- Avant de lancer : compter ce qui serait perdu.
--   select count(*) from public.app_generation_attempts;
--
-- Idempotente : sans la table, ne fait rien.
-- Le code qui écrit ici ne fait pas échouer une génération si la table
-- manque, mais chaque génération partira en alerte « tentative non écrite » :
-- revenir aussi au code d'avant.

begin;

drop table if exists public.app_generation_attempts;
drop function if exists public.app_generation_attempts_refuser_mise_a_jour();

commit;
