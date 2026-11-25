-- ANNULATION de mobile_money_demandes_sites.sql. Refusée s'il existe une
-- demande de site : on ne perd jamais une trace de paiement.
begin;
do $$ begin
  if exists (select 1 from public.mm_demandes where site_id is not null) then
    raise exception 'ANNULATION_REFUSEE: des demandes de site existent';
  end if;
end $$;
drop function if exists public.mm_ouvrir_demande_site(text, uuid, uuid, text, text, integer, integer, integer, integer);
drop index if exists public.mm_demandes_une_ouverte_site;
alter table public.mm_demandes drop constraint if exists mm_demandes_une_cible;
alter table public.mm_demandes alter column app_id set not null;
alter table public.mm_demandes drop column if exists site_id;
notify pgrst, 'reload schema';
commit;
