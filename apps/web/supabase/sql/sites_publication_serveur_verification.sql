-- VÉRIFICATION de sites_publication_serveur.sql. Deux instructions.
--
-- ① LECTURE. Attendu : navigateur_publie = false | navigateur_modifie_le_nom = true | serveur_publie = true.
--    (has_column_privilege voit aussi un éventuel droit sur la table entière.)
select has_column_privilege('authenticated', 'public.sites', 'published', 'UPDATE') as navigateur_publie,
       has_column_privilege('authenticated', 'public.sites', 'name', 'UPDATE') as navigateur_modifie_le_nom,
       has_column_privilege('service_role', 'public.sites', 'published', 'UPDATE') as serveur_publie;

-- ② COMPORTEMENT, en UNE instruction : sous le rôle du navigateur, écrire
--    `published` est REFUSÉ par la base ; écrire `name` passe ; sous le rôle du
--    serveur, écrire `published` passe. `where false` : AUCUNE ligne n'est
--    touchée — la base vérifie le droit avant de chercher les lignes.
--    Attendu : une erreur « VERIFICATION_OK : … ». Toute autre = un défaut.
do $$
declare
  v_refus boolean := false;
begin
  set local role authenticated;
  begin
    update public.sites set published = true where false;
  exception when insufficient_privilege then v_refus := true;
  end;
  if not v_refus then raise exception 'DEFAUT: le navigateur peut encore publier'; end if;
  update public.sites set name = name where false;
  reset role;
  set local role service_role;
  update public.sites set published = published where false;
  reset role;
  raise exception 'VERIFICATION_OK : le navigateur ne publie plus, il modifie toujours le nom, le serveur publie — rien n''est touché';
end $$;
