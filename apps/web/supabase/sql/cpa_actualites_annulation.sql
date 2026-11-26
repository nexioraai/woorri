-- ANNULATION de cpa_actualites.sql : le module s'éteint, Agenda et Communiqués reviennent hors menu, sans parent.
begin;
delete from public.site_pages
 where chemin = 'actualites'
   and site_id = (select id from public.sites where slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814');
update public.site_pages set parent = null, menu = false, maj_le = now()
 where chemin in ('actualites/communiques', 'actualites/evenements')
   and site_id = (select id from public.sites where slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814');
commit;
