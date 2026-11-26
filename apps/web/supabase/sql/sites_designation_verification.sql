-- VÉRIFICATION de sites_designation.sql. Une lecture.
-- Attendu : colonne = 1 | navigateur_ecrit = false | cpa = la Centrale | autres = 0
select (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'sites' and column_name = 'designation') as colonne,
       has_column_privilege('authenticated', 'public.sites', 'designation', 'UPDATE') as navigateur_ecrit,
       (select designation from public.sites where slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814') as cpa,
       (select count(*)::int from public.sites where designation is not null and slug <> 'centrale-pharmaceutique-d-achats-cpa-1793979506814') as autres;
