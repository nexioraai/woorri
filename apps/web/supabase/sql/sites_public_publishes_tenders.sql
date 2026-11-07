-- ============================================================
-- `sites_public` + `publishes_tenders` -- LE CINQUIEME GESTE. GEN-D043.
--
-- ------------------------------------------------------------
-- POURQUOI CE FICHIER EXISTE. MESURE DU 2026-11-07.
-- ------------------------------------------------------------
-- La colonne `sites.publishes_tenders` etait posee, typee, projetee, et le
-- `GRANT UPDATE` colonne repare. La case de /edit l'ecrivait : la base disait
-- `true` a 09:31:22Z. Et le lien de menu n'apparaissait toujours pas.
--
--   anon -> sites_public.publishes_tenders
--   42703 — column sites_public.publishes_tenders does not exist
--
-- La page publique lit par `fetchSite`, qui interroge la VUE `sites_public`.
-- Sa definition porte une LISTE DE COLONNES EXPLICITE. La colonne n'y etait
-- pas, et ne pouvait pas y etre : la vue est anterieure.
--
-- IL FAUT DONC CINQ GESTES, PAS QUATRE :
--   ① ALTER TABLE           bruyant
--   ② le type TypeScript    bruyant
--   ③ la projection         SILENCIEUX -- rend `undefined`
--   ④ le GRANT UPDATE       SILENCIEUX, et casse TOUTES les ecritures
--   ⑤ la VUE PUBLIQUE       ce fichier
--
-- ------------------------------------------------------------
-- D'OU VIENT LA LISTE DE COLONNES CI-DESSOUS.
-- ------------------------------------------------------------
-- De `pg_get_viewdef('public.sites_public')` EXECUTE EN PRODUCTION le
-- 2026-11-07, et de nulle part ailleurs. `sites_public_view.sql` du depot en
-- annonce 43 ; la vue en sort 47. Le fichier versionne etait PERIME.
--
-- Recopier 43 colonnes aurait SUPPRIME les quatre dernieres -- `updated_at`,
-- `encaisse_en_ligne`, `logo_url` -- et casse les 9 sites servis.
--
-- LA 46e N'EST PAS UNE COLONNE, C'EST UNE EXPRESSION :
--   payment_account_id IS NOT NULL AS encaisse_en_ligne
-- Elle est reproduite telle quelle, a sa place. PostgreSQL refuse toute
-- omission ou reordonnancement dans un `CREATE OR REPLACE VIEW` : l'ajout ne
-- peut se faire qu'EN FIN. `publishes_tenders` est donc la 48e.
--
-- ------------------------------------------------------------
-- `security_invoker = false` EST REPOSE EXPLICITEMENT, ET C'EST VITAL.
-- ------------------------------------------------------------
-- `pg_get_viewdef` N'AFFICHE PAS les options `WITH`. Le relevé de production
-- ne pouvait donc pas la montrer. Le cliquet `siteFreshness.test.tsx` l'a
-- deja mesure : « CREATE OR REPLACE VIEW peut changer `security_invoker` …
-- la vitrine publique, servie par le client anon, aurait recu ZERO LIGNE sur
-- chaque site ». L'omettre ici serait le meme defaut, en pire.
--
-- `FROM public.sites` plutot que `FROM sites` : MEME OBJET, schema explicite.
-- `pg_get_viewdef` elide le schema quand il est dans le `search_path` ; le
-- qualifier ne change pas la vue et la rend independante du `search_path`.
--
-- ------------------------------------------------------------
-- REJOUABLE SANS DANGER : `create or replace`, un `revoke`/`grant` idempotent,
-- aucune ecriture de donnee, aucune policy, aucune table touchee.
-- ============================================================

-- ------------------------------------------------------------
-- 0/5 -- CONSTAT AVANT. ATTENDU : 47 colonnes, et `publishes_tenders` ABSENTE.
-- ------------------------------------------------------------
select count(*) as colonnes_de_la_vue,
       bool_or(column_name = 'publishes_tenders') as deja_la
from information_schema.columns
where table_schema = 'public' and table_name = 'sites_public';

-- ------------------------------------------------------------
-- 1/5 -- LA VUE : les 47 colonnes mesurees, PLUS publishes_tenders en 48e.
-- ------------------------------------------------------------
create or replace view public.sites_public
with (security_invoker = false) as
select
  id,
  slug,
  name,
  slogan,
  type,
  mode,
  custom_domain,
  primary_color,
  hero_title,
  hero_subtitle,
  about,
  services,
  testimonials,
  gallery,
  products,
  contact,
  menu,
  team,
  hours,
  social_links,
  address,
  pages,
  cta,
  theme,
  hero_image,
  lang,
  faq,
  whyus,
  mission,
  vision,
  geo_lat,
  geo_lng,
  area_served,
  price_range,
  hidden_sections,
  section_label,
  sections,
  created_at,
  dropship_type,
  pod_designs,
  product_families,
  cj_margin_percent,
  cj_round_mode,
  shipping_flat,
  updated_at,
  payment_account_id is not null as encaisse_en_ligne,
  logo_url,
  publishes_tenders
from public.sites
where published = true and archived_at is null;

-- ------------------------------------------------------------
-- 2/5 -- LES PRIVILEGES, REPOSES SANS CONDITION.
-- ------------------------------------------------------------
-- Releve d'AVANT, mesure en production le 2026-11-07 : exactement
-- `anon · SELECT` et `authenticated · SELECT`, rien d'autre.
--
-- REVOKE PUIS GRANT, DANS CET ORDRE -- DEBT-073. Supabase pose
-- `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES`, et `ON TABLES` couvre
-- AUSSI les vues : un `GRANT SELECT` seul laisserait INSERT/UPDATE/DELETE en
-- place. C'est le defaut qui a rendu `sites_public` ecrivable par `anon`
-- pendant cinq jours.
--
-- Inconditionnel plutot que conditionnel : restaurer exactement l'etat mesure
-- vaut mieux que de tester s'il a survecu. L'operation est idempotente.
revoke all    on public.sites_public from anon, authenticated;
grant  select on public.sites_public to   anon, authenticated;

-- PostgREST sert depuis un CACHE DE SCHEMA. Une vue modifiee et non
-- rechargee reste INATTEIGNABLE par tout client -- PGRST205, la famille
-- « ca existe en base et personne ne peut l'atteindre ».
notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- 3/5 -- CONSTAT APRES : LA VUE. ATTENDU : 48 · true.
-- ------------------------------------------------------------
select count(*) as colonnes_de_la_vue,
       bool_or(column_name = 'publishes_tenders') as deja_la
from information_schema.columns
where table_schema = 'public' and table_name = 'sites_public';

-- ------------------------------------------------------------
-- 4/5 -- CONSTAT APRES : LES PRIVILEGES. ATTENDU : exactement 2 lignes,
--        `anon · SELECT` et `authenticated · SELECT`.
-- ------------------------------------------------------------
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'sites_public'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- ------------------------------------------------------------
-- 5/5 -- CONSTAT APRES : LES TROIS VUES DEPENDANTES REPONDENT-ELLES ENCORE ?
-- ------------------------------------------------------------
-- Les trois joignent `sites_public` pour HERITER l'invariant « site publie ET
-- non archive ». Un REPLACE rate les emporterait toutes les trois -- et avec
-- elles le blog, le catalogue et le portail des marches.
-- ATTENDU : trois nombres, aucun en erreur.
select
  (select count(*) from public.appels_offres_public)          as avis_publics,
  (select count(*) from public.site_blog_posts_public)        as articles_publics,
  (select count(*) from public.catalog_products_public_view)  as produits_publics;

-- ATTENDU : 9 sites servis, et 1 seul declarant -- la CPA.
select count(*) as sites_servis,
       count(*) filter (where publishes_tenders) as declarants
from public.sites_public;
