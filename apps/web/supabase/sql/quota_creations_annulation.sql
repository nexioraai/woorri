-- ANNULATION de quota_creations.sql — à n'employer qu'avant que le code ne s'en serve.
begin;
drop function if exists public.solder_creation(uuid, uuid, text, uuid);
drop function if exists public.reserver_creation(uuid);
drop table if exists public.app_creations_reservees;
commit;
