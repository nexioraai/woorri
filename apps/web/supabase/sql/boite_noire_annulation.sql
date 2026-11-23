-- Annulation de boite_noire.sql : retire la fonction de purge, le déclencheur et la table (et ce qu'elle contient).
begin;
drop function if exists public.purger_boite_noire();
drop trigger if exists app_boite_noire_ajout_seul on public.app_boite_noire;
drop function if exists public.app_boite_noire_refuser_mise_a_jour();
drop table if exists public.app_boite_noire;
notify pgrst, 'reload schema';
commit;
