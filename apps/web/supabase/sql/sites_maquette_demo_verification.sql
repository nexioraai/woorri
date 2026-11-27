-- VÉRIFICATION de sites_maquette_demo.sql. Une lecture.
-- Attendu : colonne = 1 | navigateur_ecrit = true | allumes = 0
select (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'sites' and column_name = 'maquette_demo') as colonne,
       has_column_privilege('authenticated', 'public.sites', 'maquette_demo', 'UPDATE') as navigateur_ecrit,
       (select count(*)::int from public.sites where maquette_demo) as allumes;
