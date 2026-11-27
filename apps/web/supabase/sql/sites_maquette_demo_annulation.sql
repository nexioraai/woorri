-- ANNULATION de sites_maquette_demo.sql : la colonne disparaît (le bandeau et la case avec).
begin;
revoke update (maquette_demo) on table public.sites from authenticated;
alter table public.sites drop column if exists maquette_demo;
commit;
