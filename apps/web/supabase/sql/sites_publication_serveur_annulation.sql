-- ANNULATION de sites_publication_serveur.sql : rend au navigateur le droit de publier (la faille revient).
begin;
grant update (published) on table public.sites to authenticated;
commit;
