-- ANNULATION de sites_public_apercu_proprietaire.sql : remet « published = true » seul.
-- Même méthode : définition vivante, une seule instruction, arrêt si la forme est inattendue.
do $$
declare
  avant   text := pg_get_viewdef('public.sites_public'::regclass, true);
  apres   text;
  occ     int;
  n_avant int;
  n_apres int;
  motif   text := '\(+(sites\.)?published = true OR (sites\.)?owner_id = auth\.uid\(\)\)+';
begin
  select count(*) into occ from regexp_matches(avant, motif, 'g');
  if occ <> 1 then
    raise exception 'ARRÊT : condition propriétaire trouvée % fois (attendu 1). Définition : %', occ, avant;
  end if;
  apres := regexp_replace(regexp_replace(avant, motif, '\1published = true'), ';\s*$', '');
  select count(*) into n_avant from information_schema.columns where table_schema = 'public' and table_name = 'sites_public';
  execute 'create or replace view public.sites_public with (security_invoker = false) as ' || apres;
  revoke all    on public.sites_public from anon, authenticated;
  grant  select on public.sites_public to   anon, authenticated;
  select count(*) into n_apres from information_schema.columns where table_schema = 'public' and table_name = 'sites_public';
  if n_apres <> n_avant then raise exception 'ARRÊT : % colonnes avant, % après.', n_avant, n_apres; end if;
  perform pg_notify('pgrst', 'reload schema');
  raise notice 'ANNULÉ. Condition : %', substring(apres from '(?i)where.*$');
end $$;
