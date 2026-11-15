-- ANNULATION de app_generation_versions_fk_generation.sql
--
-- Retire la clé étrangère app_generation_versions.generation_id →
-- app_generations.id. Aucune donnée n'est touchée : seule la contrainte part.
-- Idempotente : sans la contrainte, ne fait rien.
--
-- À n'employer que si la contrainte empêche un geste légitime — et alors le
-- consigner : sans elle, la base laisse de nouveau changer l'identifiant
-- d'une œuvre qui a des versions (PREUVE_REGENERATION.md).

begin;

alter table public.app_generation_versions
  drop constraint if exists app_generation_versions_generation_fk;

commit;
