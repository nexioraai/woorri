-- VÉRIFICATION de cpa_actualites_encadres.sql. Une lecture.
-- Attendu : 2 lignes —
--   actualites/communiques | encadres_attente = 0 | nb_blocs = 6
--   actualites/evenements  | encadres_attente = 0 | nb_blocs = 5
select p.chemin,
       (select count(*)::int from jsonb_array_elements(p.blocs) b where b->>'titre' like 'Cette page attend%') as encadres_attente,
       jsonb_array_length(p.blocs) as nb_blocs
  from public.site_pages p join public.sites s on s.id = p.site_id
 where s.slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814'
   and p.chemin in ('actualites/communiques', 'actualites/evenements')
 order by p.chemin;
