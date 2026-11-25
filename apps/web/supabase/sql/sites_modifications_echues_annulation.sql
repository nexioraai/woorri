-- ANNULATION de sites_modifications_echues.sql : les modifications ne s'arrêtent plus à l'échéance.
begin;
drop trigger if exists sites_refuser_si_echu on public.sites;
drop function if exists public.sites_refuser_si_echu();
drop function if exists public.site_modifications_permises(uuid);
commit;
