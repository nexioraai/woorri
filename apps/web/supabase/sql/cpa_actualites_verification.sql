-- VÉRIFICATION de cpa_actualites.sql. Une lecture.
-- Attendu : 3 lignes —
--   actualites              | (vide)     | Actualités  | true | true
--   actualites/communiques  | actualites | Communiqués | true | true
--   actualites/evenements   | actualites | Agenda      | true | true
select p.chemin, p.parent, p.titre, p.menu, p.publie
  from public.site_pages p join public.sites s on s.id = p.site_id
 where s.slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814'
   and (p.chemin = 'actualites' or p.chemin like 'actualites/%')
 order by p.chemin;
