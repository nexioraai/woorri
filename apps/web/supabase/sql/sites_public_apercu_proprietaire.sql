-- ============================================================
-- `sites_public` : LE PROPRIÉTAIRE VOIT SON SITE NON PUBLIÉ. 2026-11-15.
--
-- LE DÉFAUT. L'aperçu d'un site non publié menait à des 404 : le menu pointe
-- vers /sites/<slug>/…, servi par le serveur qui lit `sites_public`, et cette
-- vue ne laisse passer QUE les sites publiés. L'aperçu n'avait pas de pages.
--
-- LE GESTE. Une seule condition change, dans une seule vue :
--     published = true
--  →  (published = true OR owner_id = auth.uid())
-- Les quatre vues dépendantes (pages, blog, catalogue, appels d'offres)
-- joignent `sites_public` : elles suivent sans être touchées.
--
-- UN ANONYME NE VOIT RIEN DE PLUS : pour lui `auth.uid()` est NULL.
--
-- LA DÉFINITION N'EST PAS RECOPIÉE À LA MAIN. Le 2026-11-07, la définition
-- versionnée annonçait 43 colonnes, la production en avait 47. Le bloc lit
-- donc la définition VIVANTE (`pg_get_viewdef`) et n'y change que la
-- condition. Il S'ARRÊTE, sans rien écrire, si :
--   · « published = true » n'apparaît pas exactement une fois ;
--   · la vue mentionne déjà `owner_id` (déjà appliqué) ;
--   · le nombre de colonnes change ;
--   · `security_invoker` n'est plus `false` ;
--   · la vue ne rend plus exactement les sites publiés non archivés
--     (l'éditeur SQL n'a pas d'utilisateur : auth.uid() y est NULL).
-- UNE SEULE INSTRUCTION (DO) : l'éditeur SQL ne garantit pas la continuité
-- de session ; une exception annule tout.
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
  select count(*) into occ from regexp_matches(avant, '(sites\.)?published = true', 'g');
  if occ <> 1 then
    raise exception 'ARRÊT : « published = true » trouvé % fois (attendu 1). Définition : %', occ, avant;
  end if;
  if avant ~ 'owner_id' then
    raise exception 'ARRÊT : la vue mentionne déjà owner_id (déjà appliqué ?). Définition : %', avant;
  end if;

  apres := regexp_replace(avant, '(sites\.)?published = true', '(\1published = true OR \1owner_id = auth.uid())');
  apres := regexp_replace(apres, ';\s*$', '');

  select count(*) into n_avant from information_schema.columns
   where table_schema = 'public' and table_name = 'sites_public';

  execute 'create or replace view public.sites_public with (security_invoker = false) as ' || apres;

  -- DEBT-073 : REVOKE puis GRANT, sinon les privilèges par défaut laissent l'écriture.
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
  raise notice 'APPLIQUÉ : % colonnes, % sites vus sans utilisateur. Nouvelle condition : %',
    n_apres, vus, substring(apres from '(?i)where.*$');
end $$;

-- ------------------------------------------------------------
-- CONSTAT APRÈS (à lancer séparément). ATTENDU : 2 lignes exactement,
-- anon · SELECT et authenticated · SELECT.
-- ------------------------------------------------------------
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'sites_public'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
