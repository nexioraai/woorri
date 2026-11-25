-- VÉRIFICATION de sites_modifications_echues.sql. Deux instructions.
--
-- ① LECTURE. Attendu : declencheur = 1 | fonction = 1.
select (select count(*)::int from pg_trigger where tgname = 'sites_refuser_si_echu' and tgrelid = 'public.sites'::regclass) as declencheur,
       (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'site_modifications_permises') as fonction;

-- ② COMPORTEMENT, en UNE instruction, sur un site réel : sans échéance →
--    modifiable ; échéance future → modifiable ; échéance passée → NON ; et le
--    serveur peut toujours écrire. Une exception volontaire ANNULE TOUT.
--    Attendu : une erreur « VERIFICATION_OK : … ». Toute autre = un défaut.
do $$
declare
  v_site uuid;
  v_owner uuid;
begin
  select s.id, s.owner_id into v_site, v_owner from public.sites s
   where s.owner_id is not null and not exists (select 1 from public.site_abonnements a where a.site_id = s.id) order by s.id limit 1;
  if v_site is null then raise exception 'VERIFICATION_IMPOSSIBLE: aucun site sans échéance'; end if;
  if not public.site_modifications_permises(v_site) then raise exception 'DEFAUT: un site sans échéance est bloqué'; end if;
  insert into public.site_abonnements (site_id, owner_id, paye_jusqu_au) values (v_site, v_owner, now() + interval '3 days');
  update public.sites set subscription_status = 'mobile_money' where id = v_site;
  if not public.site_modifications_permises(v_site) then raise exception 'DEFAUT: une échéance future bloque'; end if;
  update public.site_abonnements set paye_jusqu_au = now() - interval '1 day' where site_id = v_site;
  if public.site_modifications_permises(v_site) then raise exception 'DEFAUT: une échéance passée laisse modifier'; end if;
  -- Passé à Stripe : l'ancienne échéance ne bloque plus.
  update public.sites set subscription_status = 'active' where id = v_site;
  if not public.site_modifications_permises(v_site) then raise exception 'DEFAUT: un site passé à Stripe reste bloqué'; end if;
  -- Le serveur (rôle de cette session) écrit toujours.
  update public.sites set published = published where id = v_site;
  raise exception 'VERIFICATION_OK : sans échéance oui, échéance future oui, échéance passée NON, passé à Stripe oui, le serveur écrit toujours — rien n''est gardé';
end $$;
