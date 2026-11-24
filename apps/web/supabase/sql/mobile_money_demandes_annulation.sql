-- ANNULATION de mobile_money_demandes.sql. Refusée si une demande a déjà été
-- activée à la main : sa trace serait perdue (le registre, lui, la garde).
begin;
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'mm_demandes')
     and exists (select 1 from public.mm_demandes where etat = 'activee_main') then
    raise exception 'ANNULATION_REFUSEE: des demandes ont été activées à la main';
  end if;
end $$;
drop function if exists public.mm_ouvrir_demande(text, uuid, uuid, text, text, integer, integer, integer, integer);
drop table if exists public.mm_demandes;
notify pgrst, 'reload schema';
commit;
