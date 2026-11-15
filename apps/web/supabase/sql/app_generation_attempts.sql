-- TENTATIVES DE GÉNÉRATION : une ligne par exécution, jamais réécrite.
--
-- ── POURQUOI (manque 4, 2026-11-15).
--
-- Observé sur le code réparé (docs/elite-protocol/PLAN_MANQUE4.md §1) :
-- chaque tentative réécrivait la trace de la précédente sur la ligne de
-- l'œuvre (`sections_acquises`, `cout_usd`, `duree_ms`, jetons, `tirages`,
-- `diagnostics`). Un échec suivi d'une réussite : la trace et le coût de
-- l'échec n'existaient plus nulle part.
--
-- Décisions du propriétaire (2026-11-15) :
--   - une table en AJOUT SEUL : « une trace qu'on peut réécrire n'est pas une
--     trace » — la base REFUSE toute mise à jour (déclencheur ci-dessous) ;
--   - la colonne du manque 1 (`consigne`) est posée DÈS MAINTENANT, nulle et
--     non écrite, pour qu'aucune migration ne suive ;
--   - ce DDL vit ici, hors de `lib/apps/journal.ts`. Le nom et les colonnes
--     vivent dans `src/lib/apps/tentatives.ts`, tenus égaux à ce fichier par
--     le cliquet `src/lib/apps/__tests__/tentatives.test.ts`.
--
-- ── L'EXISTANT N'EST PAS TOUCHÉ.
--
-- La table naît VIDE. Aucun `update`, aucun `delete`, aucun rétro-remplissage
-- sur `app_generations` ni `app_generation_versions`.
--
-- ── ORDRE DE DÉPLOIEMENT : CETTE MIGRATION D'ABORD, LE CODE ENSUITE.
--
-- Le code qui écrit ici ne fait pas échouer une génération si la table manque,
-- mais chaque génération partirait alors en alerte « tentative non écrite ».
--
-- ── SÛRETÉ.
--
-- Idempotente : chaque instruction est un no-op au 2e passage.
-- Annulation : app_generation_attempts_annulation.sql.
-- NON APPLIQUÉE EN PRODUCTION. L'application est la décision du propriétaire.

begin;

create table if not exists public.app_generation_attempts (
  id                  uuid primary key default gen_random_uuid(),
  cree_le             timestamptz not null default now(),

  -- À QUELLE ŒUVRE. RESTRICT dans les deux sens, comme les versions
  -- (app_generation_versions_fk_generation.sql) : l'identifiant d'une œuvre
  -- ne change jamais, et une tentative payée ne s'efface pas en silence.
  generation_id       uuid not null
                        references public.app_generations (id)
                        on update restrict
                        on delete restrict,
  rang                integer not null check (rang >= 1),
  nature              text not null check (nature in ('generation', 'regeneration')),
  issue               text not null
                        check (issue in ('livree', 'non_convergee', 'interrompue', 'ecriture_echouee')),

  -- QUAND. La ligne de l'œuvre n'a aucune date de dernière écriture : c'est
  -- ce qui a laissé un angle mort dans PREUVE_REGENERATION.md §8.
  debut_le            timestamptz not null,
  fin_le              timestamptz not null,

  -- LE PRODUIT, s'il y en a un : le rang dans app_generation_versions.
  version_rang        integer,

  fournisseur         text,
  deploiement         jsonb,

  -- LA MESURE DE CETTE TENTATIVE, et d'elle seule.
  cout_usd            numeric(10,4) not null default 0,
  duree_ms            integer not null default 0,
  jetons_entree       integer not null default 0,
  jetons_sortie       integer not null default 0,
  tirages             integer not null default 0,
  diagnostics         text[] not null default '{}',

  -- LA TRACE : ce que `sections_acquises` porte aujourd'hui (tours, juges,
  -- brut du dernier essai), bornée par le code (LIMITE_TRACE_OCTETS) ; la
  -- borne, si elle a mordu, se DIT.
  trace               jsonb not null default '{}'::jsonb,
  trace_tronquee      boolean not null default false,

  -- MANQUE 1 (le prompt système) : posé maintenant, écrit plus tard.
  consigne            text,
  consigne_empreinte  text,

  constraint app_generation_attempts_rang_unique unique (generation_id, rang),
  constraint app_generation_attempts_fin_apres_debut check (fin_le >= debut_le)
);

create index if not exists app_generation_attempts_par_date
  on public.app_generation_attempts (cree_le desc);

-- ── AJOUT SEUL : LA BASE REFUSE TOUTE MISE À JOUR.
--
-- Une politique RLS ne suffirait pas : la clé de service la contourne. Un
-- déclencheur s'applique à TOUS les rôles. La suppression reste possible :
-- la purge (chantier à part) décidera de la rétention.
create or replace function public.app_generation_attempts_refuser_mise_a_jour()
returns trigger
language plpgsql
as $$
begin
  raise exception 'app_generation_attempts est en ajout seul : une tentative ne se modifie pas (id %).', old.id;
end;
$$;

-- PostgreSQL accorde EXECUTE à PUBLIC, et Supabase à `anon` et
-- `authenticated`, sur toute fonction née dans `public` : on le retire aux
-- trois (patron M2-09, cliquet rpcVersioning). Le déclencheur, lui,
-- s'exécute quel que soit l'appelant.
revoke all on function public.app_generation_attempts_refuser_mise_a_jour() from public, anon, authenticated;

drop trigger if exists app_generation_attempts_ajout_seul on public.app_generation_attempts;
create trigger app_generation_attempts_ajout_seul
  before update on public.app_generation_attempts
  for each row execute function public.app_generation_attempts_refuser_mise_a_jour();

-- ── FERMÉE À TOUT LE MONDE SAUF AU SERVEUR.
--
-- Privilèges par défaut d'un projet Supabase : toute table créée est lisible
-- et modifiable par `anon` et `authenticated`. Une trace porte des demandes
-- de clients et le code produit : elle n'a rien à faire dans un navigateur.
revoke all on public.app_generation_attempts from anon, authenticated, public;
alter table public.app_generation_attempts enable row level security;
alter table public.app_generation_attempts force row level security;
-- Aucune politique : sans politique permissive, la RLS refuse. Seule la clé
-- de service, qui contourne la RLS, écrit et lit ici.

commit;
