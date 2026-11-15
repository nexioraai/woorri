-- ============================================================
-- `sites_public` : L'ADMINISTRATEUR DE LA PLATEFORME VOIT AUSSI L'APERÇU.
-- 2026-11-15. À lancer APRÈS sites_public_apercu_proprietaire.sql.
--
-- POURQUOI. L'éditeur laisse entrer le propriétaire ET l'administrateur
-- (`requireSiteOwner`, `estAdmin`). La vue, elle, ne reconnaissait que
-- `owner_id = auth.uid()` : l'administrateur qui ouvre l'aperçu du site d'un
-- client (Goura Doula appartient à un autre compte) restait sur un 404.
--
-- LE GESTE.
--   ① une fonction `public.est_admin_plateforme()` : vrai si le JETON SIGNÉ
--     de la requête porte l'adresse d'un administrateur. Sa liste DOIT être
--     celle de `ADMIN_EMAILS` (src/lib/admin-emails.ts) — un test le vérifie
--     (src/lib/__tests__/apercuSql.test.ts) ;
--   ② dans la vue, `owner_id = auth.uid()` devient
--     `owner_id = auth.uid() OR public.est_admin_plateforme()`.
--
-- UN ANONYME NE VOIT RIEN DE PLUS : sans jeton, `auth.jwt()` est NULL.
-- Même méthode que le premier fichier : définition VIVANTE, une seule
-- instruction, arrêt sans rien écrire sur toute forme inattendue.
-- ============================================================

do $$
declare
  avant    text := pg_get_viewdef('public.sites_public'::regclass, true);
  apres    text;
  occ      int;
  n_avant  int;
  n_apres  int;
  vus      int;
  attendus int;
begin
  execute $f$
    create or replace function public.est_admin_plateforme() returns boolean
    language sql stable security invoker set search_path = ''
    as $c$
      select coalesce(lower(auth.jwt() ->> 'email') = any (array['issayamiyoussouf@gmail.com']), false)
    $c$
  $f$;
  revoke all on function public.est_admin_plateforme() from public;
  grant execute on function public.est_admin_plateforme() to anon, authenticated, service_role;

  select count(*) into occ from regexp_matches(avant, '(sites\.)?owner_id = auth\.uid\(\)', 'g');
  if occ <> 1 then
    raise exception 'ARRÊT : « owner_id = auth.uid() » trouvé % fois (attendu 1 — lancer d''abord sites_public_apercu_proprietaire.sql). Définition : %', occ, avant;
  end if;
  if avant ~ 'est_admin_plateforme' then
    raise exception 'ARRÊT : la vue appelle déjà est_admin_plateforme (déjà appliqué ?). Définition : %', avant;
  end if;

  apres := regexp_replace(avant, '((sites\.)?owner_id = auth\.uid\(\))', '\1 OR public.est_admin_plateforme()');
  apres := regexp_replace(apres, ';\s*$', '');

  select count(*) into n_avant from information_schema.columns
   where table_schema = 'public' and table_name = 'sites_public';

  execute 'create or replace view public.sites_public with (security_invoker = false) as ' || apres;

  revoke all    on public.sites_public from anon, authenticated;
  grant  select on public.sites_public to   anon, authenticated;

  select count(*) into n_apres from information_schema.columns
   where table_schema = 'public' and table_name = 'sites_public';
  if n_apres <> n_avant then
    raise exception 'ARRÊT : % colonnes avant, % après.', n_avant, n_apres;
  end if;
  if exists (select 1 from pg_class
              where oid = 'public.sites_public'::regclass
                and coalesce(reloptions, '{}') @> array['security_invoker=true']) then
    raise exception 'ARRÊT : security_invoker est passé à true.';
  end if;

  select count(*) into vus from public.sites_public;
  select count(*) into attendus from public.sites where published = true and archived_at is null;
  if vus <> attendus then
    raise exception 'ARRÊT : la vue rend % sites, attendu % (publiés non archivés).', vus, attendus;
  end if;

  perform pg_notify('pgrst', 'reload schema');
  raise notice 'APPLIQUÉ : % colonnes, % sites vus sans utilisateur. Condition : %',
    n_apres, vus, substring(apres from '(?i)where.*$');
end $$;

-- ------------------------------------------------------------
-- CONSTAT APRÈS (à lancer séparément). ATTENDU : une ligne,
-- applique = true, admin_sans_jeton = false.
-- ------------------------------------------------------------
select pg_get_viewdef('public.sites_public'::regclass, true) ~ 'est_admin_plateforme' as applique,
       public.est_admin_plateforme() as admin_sans_jeton;
