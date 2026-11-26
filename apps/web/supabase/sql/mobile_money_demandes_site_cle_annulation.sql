-- ANNULATION de mobile_money_demandes_site_cle.sql : retire la clé étrangère.
begin;
alter table public.mm_demandes drop constraint if exists mm_demandes_site_id_fkey;
commit;
