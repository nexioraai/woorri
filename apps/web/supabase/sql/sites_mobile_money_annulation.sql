-- ANNULATION de sites_mobile_money.sql. Refusée s'il existe un paiement de
-- site : le registre ne se perd jamais. Les réglages restent (leur historique aussi).
begin;
do $$ begin
  if exists (select 1 from public.site_paiements) then
    raise exception 'ANNULATION_REFUSEE: des paiements de site existent';
  end if;
end $$;
drop function if exists public.enregistrer_paiement_site(text, text, text, uuid, uuid, numeric, text, text, numeric);
drop table if exists public.site_paiements;
drop table if exists public.site_abonnements;
notify pgrst, 'reload schema';
commit;
