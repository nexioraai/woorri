-- ANNULATION de sites_public_apercu_admin.sql : retire « OR est_admin_plateforme() » de la vue.
-- À lancer AVANT sites_public_apercu_proprietaire_annulation.sql si l'on veut tout défaire.
do $$
declare
  avant   text := pg_get_viewdef('public.sites_public'::regclass, true);
  apres   text;
  occ     int;
  n_avant int;
  n_apres int;
  motif   text := ' OR (public\.)?est_admin_plateforme\(\)';
begin
  select count(*) into occ from regexp_matches(avant, motif, 'g');
  if occ <> 1 then
    raise exception 'ARRÊT : « OR est_admin_plateforme() » trouvé % fois (attendu 1). Définition : %', occ, avant;
  end if;
  apres := regexp_replace(regexp_replace(avant, motif, ''), ';\s*$', '');
  select count(*) into n_avant from information_schema.columns where table_schema = 'public' and table_name = 'sites_public';
  execute 'create or replace view public.sites_public with (security_invoker = false) as ' || apres;
  revoke all    on public.sites_public from anon, authenticated;
  grant  select on public.sites_public to   anon, authenticated;
  select count(*) into n_apres from information_schema.columns where table_schema = 'public' and table_name = 'sites_public';
  if n_apres <> n_avant then raise exception 'ARRÊT : % colonnes avant, % après.', n_avant, n_apres; end if;
  drop function public.est_admin_plateforme();
  perform pg_notify('pgrst', 'reload schema');
  raise notice 'ANNULÉ. Condition : %', substring(apres from '(?i)where.*$');
end $$;
