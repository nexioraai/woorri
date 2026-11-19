-- ============================================================================
-- LE TYPE DE CLIENT (CPA, 2026-11-19).
--
-- À exécuter dans l'éditeur SQL Supabase (projet nexiora-ai). Rejouable.
-- À APPLIQUER AVANT le déploiement qui l'emploie : l'inscription écrit cette
-- colonne.
--
-- « Parmi les clients, il y a des ONG aussi. » Un client reste un compte de
-- rôle `structure` (même espace, mêmes commandes, mêmes droits) ; ce qui
-- change, c'est ce qu'il EST : une structure sanitaire, ou une ONG. La
-- Division DDM le voit dans ses listes.
--
-- Le type n'existe que pour un client : un fournisseur ou un agent n'en a pas.
-- Les clients inscrits avant ce fichier restent sans type (NULL) — leur en
-- inventer un serait une information que personne n'a donnée.
-- ============================================================================

alter table public.site_comptes add column if not exists type_client text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_comptes_type_client_chk') then
    alter table public.site_comptes
      add constraint site_comptes_type_client_chk
      check (type_client is null or (role = 'structure' and type_client in ('sante', 'ong')));
  end if;
end $$;

notify pgrst, 'reload schema';

-- APRÈS — attendu : 1
select count(*) as colonne_type_client
  from information_schema.columns
 where table_schema = 'public' and table_name = 'site_comptes' and column_name = 'type_client';
