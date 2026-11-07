-- ============================================================
-- `site_pages` -- LES ADRESSES D'UN SITE. Lot 1 du plan CPA.
--
-- ------------------------------------------------------------
-- POURQUOI UNE TABLE, ET PAS LA COLONNE `pages`. MESURE DU 2026-11-07.
-- ------------------------------------------------------------
-- La colonne `sites.pages` existe. Relevé sur les 43 sites : 127 valeurs,
-- **toutes des CHAINES** (« Home », « About »…) -- des noms de section, pas
-- des adresses. 34 sites en portent.
--
-- En changer la forme casserait ces 34 sites. Et une colonne JSON ne peut
-- porter ni unicité, ni borne de format, ni index -- or un chemin part dans
-- l'URL : il lui faut les trois.
--
-- ------------------------------------------------------------
-- LE DEFAUT QUE CE LOT FERME.
-- ------------------------------------------------------------
-- `src/app/sites/[slug]/[...rest]/page.tsx` contient aujourd'hui :
--     export default function SiteCatchAll() { notFound() }
-- TOUT chemin inconnu meurt. Le moteur sert SIX formes d'adresse. Le site
-- institutionnel de la CPA en demande 58 ; EPSS, la centrale éthiopienne
-- équivalente, en sert 29 rien que dans son menu.
--
-- Relevé de base pris AVANT ce lot : 63 mesures sur les 9 sites servis --
-- 27 × HTTP 200, 36 × HTTP 404 (`/tmp/routage-avant.json`,
-- `scripts/releve-routage.mjs`). Après, les 27 doivent être IDENTIQUES.
--
-- ------------------------------------------------------------
-- MEME PATRON QUE `site_blog_posts` ET `appels_offres`.
-- ------------------------------------------------------------
--   * `anon` / `authenticated` n'ont AUCUN grant sur la table -> PostgREST
--     rend 401 AVANT d'évaluer la moindre policy ;
--   * AUCUNE POLICY, et c'est une décision : `service_role` possède BYPASSRLS,
--     une policy d'écriture serait décorative ;
--   * la lecture publique passe par la VUE, jointe à `sites_public`, qui
--     n'expose ni `published` ni `archived_at` -- l'invariant « page publiée
--     ET site publié ET site non archivé » devient SYNTAXIQUEMENT
--     irréécrivable en aval.
--
-- NE JAMAIS poser `FORCE ROW LEVEL SECURITY` : le propriétaire cesserait de
-- contourner la RLS et la vue rendrait ZERO ligne à tout visiteur.
--
-- REJOUABLE SANS DANGER : `if not exists` partout, `create or replace` sur la
-- vue, aucune écriture de donnée, aucune policy existante touchée.
-- ============================================================

-- ------------------------------------------------------------
-- 0/5 -- CONSTAT AVANT. ATTENDU : table = 0, vue = 0.
-- ------------------------------------------------------------
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'site_pages')         as table_la,
  (select count(*) from pg_views
     where schemaname = 'public' and viewname = 'site_pages_public')  as vue_la;

-- ------------------------------------------------------------
-- 1/5 -- TABLE
-- ------------------------------------------------------------
create table if not exists public.site_pages (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites(id) on delete cascade,

  -- LE CHEMIN, SANS BARRE INITIALE : « qui-sommes-nous/missions ».
  --
  -- La borne est POSEE ICI et pas seulement dans l'application : c'est la
  -- seule qui survive à la suppression d'une validation applicative, et cette
  -- valeur PART DANS L'URL.
  --
  -- Segments minuscules séparés par `/`, profondeur libre, 200 caractères.
  -- Ni barre initiale, ni barre finale, ni double barre, ni point -- un `.`
  -- ferait passer un chemin pour un fichier.
  chemin     text not null
    constraint site_pages_chemin_chk
    check (chemin ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'
           and length(chemin) <= 200),

  -- LE PARENT, POUR LE FIL D'ARIANE ET LE MENU. `null` = premier niveau.
  -- C'est un CHEMIN, pas un identifiant : une page se déplace en changeant
  -- son chemin, et ses enfants suivent sans migration.
  parent     text,

  titre      text not null
    constraint site_pages_titre_chk check (length(btrim(titre)) between 1 and 200),
  chapeau    text,
  corps      text,

  -- `ordre` gouverne le menu. Egalité possible : le tri secondaire est le
  -- titre, pour que l'ordre d'affichage soit DETERMINISTE. Un menu qui change
  -- d'ordre entre deux chargements est un menu qu'on ne peut pas mémoriser.
  ordre      integer not null default 0,

  -- `menu` : la page figure-t-elle dans la navigation ? Une page peut être
  -- publiée et hors menu (mentions légales, pages d'un troisième niveau
  -- atteintes depuis leur parent).
  menu       boolean not null default true,

  publie     boolean not null default false,
  cree_le    timestamptz not null default now(),
  maj_le     timestamptz not null default now(),

  -- L'INVARIANT CENTRAL. Unique DANS le site, jamais globalement : deux
  -- acheteurs doivent pouvoir publier « nos-missions » sans se voir.
  constraint site_pages_chemin_unique unique (site_id, chemin)
);

-- ------------------------------------------------------------
-- 2/5 -- INDEX
-- ------------------------------------------------------------
-- La résolution d'un chemin est sur le CHEMIN CHAUD de chaque requête
-- entrante : elle doit toucher un index, jamais balayer la table.
create index if not exists site_pages_site_publie_idx
  on public.site_pages (site_id, publie);

-- L'ordre du menu, déterministe.
create index if not exists site_pages_menu_idx
  on public.site_pages (site_id, publie, menu, ordre, titre);

-- ------------------------------------------------------------
-- 3/5 -- RLS ET PRIVILEGES
-- ------------------------------------------------------------
alter table public.site_pages enable row level security;

revoke all on table public.site_pages from anon, authenticated;
grant  all on table public.site_pages to   service_role;

-- ------------------------------------------------------------
-- 4/5 -- VUE PUBLIQUE
-- ------------------------------------------------------------
-- `security_invoker = false` : la vue s'exécute avec les droits de son
-- propriétaire ; sans cela elle rendrait zéro ligne -- un GRANT sans policy
-- est un zéro silencieux (DEBT-071).
--
-- JOINTURE SUR `sites_public`, JAMAIS SUR `sites`. `publie` n'est PAS
-- exposée : toute ligne rendue est publiée par construction, et un lecteur
-- qui refiltre finit par croire que c'est LUI qui protège.
create or replace view public.site_pages_public
with (security_invoker = false) as
select
  p.id, p.site_id, s.slug as site_slug,
  p.chemin, p.parent, p.titre, p.chapeau, p.corps,
  p.ordre, p.menu, p.cree_le, p.maj_le
from public.site_pages p
join public.sites_public s on s.id = p.site_id
where p.publie = true;

-- REVOKE PUIS GRANT. `ON TABLES` couvre AUSSI les vues -- DEBT-073.
revoke all    on public.site_pages_public from anon, authenticated;
grant  select on public.site_pages_public to   anon, authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- 5/5 -- CONSTAT APRES.
-- ------------------------------------------------------------
-- ATTENDU : contraintes = 5 (pkey, FK, chemin_chk, titre_chk, chemin_unique)
--           vue = 1 · invoker = {security_invoker=false}
select
  (select count(*) from pg_constraint where conrelid = 'public.site_pages'::regclass) as contraintes,
  (select count(*) from pg_views where schemaname='public' and viewname='site_pages_public') as vue,
  (select c.reloptions::text from pg_class c where c.relname='site_pages_public') as invoker;

-- ATTENDU : AUCUNE LIGNE. Un privilège d'anon sur la TABLE et la vue ne
-- protège plus rien.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='site_pages'
  and grantee in ('anon','authenticated');

-- ATTENDU : exactement 2 lignes -- anon SELECT, authenticated SELECT.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='site_pages_public'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;

-- ATTENDU : 0 page -- la table est neuve.
select count(*) as pages from public.site_pages_public;
