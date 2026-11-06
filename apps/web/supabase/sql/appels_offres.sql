-- ============================================================
-- APPELS D'OFFRES -- AVIS DE MARCHE PUBLIES PAR UN SITE CLIENT.
--
-- Lot A2 du portail de la Centrale Pharmaceutique d'Achats (CPA). Dix-neuf
-- rubriques issues du standard OCDS + trois rubriques locales tchadiennes.
--
-- ------------------------------------------------------------
-- RECTIFICATION DATEE DU 2026-11-06 -- CE FICHIER CORRIGE DEUX DEFAUTS
-- QUE J'AI MOI-MEME INTRODUITS, ET LES NOMME.
-- ------------------------------------------------------------
--
-- (1) GEN-D032 -- LA TABLE N'A JAMAIS ETE UN FICHIER. Creee a la main dans
--     l'editeur SQL le 2026-11-06, elle n'existait qu'en base : `grep -rl
--     "appels_offres"` sur tout le depot ne rendait AUCUN fichier. Or tous
--     les cliquets SQL de la maison lisent des FICHIERS -- l'en-tete de
--     `sqlViewPrivileges.test.ts` le dit : « il ne lit pas la base, il lit
--     les FICHIERS de supabase/sql/, qui sont la seule source versionnee de
--     ce que le projet declare deployer ». Un objet hors fichier est donc
--     hors de portee de TOUS les controles, par construction. C'est
--     exactement la lacune que DEBT-074 nommait et que `site_blog_posts.sql`
--     avait fermee ; je l'avais rouverte. Ce fichier la referme.
--
-- (2) GEN-D031 -- L'INVARIANT DE VISIBILITE ETAIT UNE CONVENTION, PAS UN
--     INVARIANT. La premiere redaction donnait `grant select` a `anon` SUR
--     LA TABLE, avec une policy `using (publie = true)`. Quatorze controles
--     la declaraient verte. Aucun ne regardait le SITE.
--
--     MESURE DU 2026-11-06, site reel `eclat-style` (`published = false`,
--     non archive) : un avis `publie = true` rattache a ce site etait LU PAR
--     `anon`. Le blog du meme site, interroge au meme instant par le meme
--     client : ZERO ligne. Un avis de marche en preparation sur un site non
--     encore publie etait donc lisible par n'importe qui -- sur un portail
--     d'Etat, un motif d'annulation de procedure.
--
--     La cause n'est pas une clause oubliee, c'est l'ENDROIT ou l'invariant
--     vit. Une policy se recopie, donc s'oublie. Une vue jointe a
--     `sites_public` HERITE la clause « publie ET non archive », et comme
--     `sites_public` n'expose NI `published` NI `archived_at`, il devient
--     syntaxiquement impossible de la reecrire a la main en aval.
--
-- (3) Rectification deja appliquee le 2026-11-06, consignee ici : la table a
--     d'abord porte `site_slug text`, basculee en `site_id uuid` tant qu'elle
--     etait VIDE, sur decision du proprietaire -- « un identifiant ne change
--     jamais, un nom change ». `site_id` est en DERNIERE position parce
--     qu'elle a ete ajoutee apres coup ; l'ordre des colonnes d'une table
--     n'a aucun effet, et ce fichier reproduit l'ordre REELLEMENT deploye
--     plutot qu'un ordre plus joli qui mentirait.
--
-- ------------------------------------------------------------
-- POURQUOI UNE TRANSACTION, ALORS QU'AUCUN DES 50 AUTRES FICHIERS N'EN A.
-- ------------------------------------------------------------
-- Mesure : `grep -il "^begin;" supabase/sql/*.sql` -> 0 / 50. Les fichiers
-- de la maison sont PUREMENT ADDITIFS (`if not exists` partout, aucun DROP) :
-- une interruption les laisse dans un etat partiel mais jamais dangereux.
-- Celui-ci RETIRE un privilege et une policy avant de poser leur
-- remplacement. Entre les deux existe un instant ou la table est fermee et
-- la vue absente : la lecture publique rendrait ZERO ligne SANS AUCUNE
-- ERREUR -- un site vide qui ne se plaint pas. C'est precisement le silence
-- que ce projet traque. La transaction supprime cet instant.
--
-- ------------------------------------------------------------
-- REJOUABLE SANS DANGER. `if not exists` sur la table et l'index,
-- `create or replace` sur la vue, contraintes posees sous condition
-- d'absence reelle (`pg_constraint`), policies retirees par DECOUVERTE et
-- non par nom suppose. Aucune ecriture de donnee. Le rejouer sur une base
-- deja a jour est un no-op.
--
-- NE JAMAIS poser `FORCE ROW LEVEL SECURITY` ici : le proprietaire cesserait
-- de contourner la RLS et la vue rendrait ZERO ligne a tout visiteur.
--
-- CE QUE CETTE TABLE N'EST PAS :
--   * `site_blog_posts` -- articles editoriaux. Meme patron exactement, meme
--     raison ; un avis de marche n'est pas un article et ses dix-neuf
--     rubriques sont normees par l'OCDS ;
--   * une table de la PLATEFORME -- rien ici n'appartient a Deribfy. Chaque
--     ligne appartient a un site client, par `site_id`.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0/6 -- CONSTAT AVANT. A LIRE, PAS A CROIRE.
-- ------------------------------------------------------------
-- ATTENDU au 2026-11-06, avant application : lignes = 0, contraintes = 3
-- (pkey, etat_check, reference_unique), policies = 1, vue = 0.
-- Si `lignes` est > 0, ARRETER et relire : les bornes du bloc 2 n'ont jamais
-- ete exercees sur des donnees existantes.
select
  (select count(*) from public.appels_offres)                                as lignes,
  (select count(*) from pg_constraint
     where conrelid = 'public.appels_offres'::regclass)                      as contraintes,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'appels_offres')            as policies,
  (select count(*) from pg_views
     where schemaname = 'public' and viewname = 'appels_offres_public')      as vue;

-- ------------------------------------------------------------
-- 1/6 -- TABLE
-- ------------------------------------------------------------
-- Les dix-neuf rubriques OCDS, puis les trois rubriques locales
-- (`local_*`), puis l'etat de publication. Toutes les rubriques autres que
-- l'identite de l'avis sont NULLABLES : un avis se publie souvent avant
-- d'etre complet, et un champ vide doit pouvoir se distinguer d'un champ
-- renseigne a vide -- c'est la regle « une absence et un refus ne doivent
-- pas se ressembler ».
create table if not exists public.appels_offres (
  id                   uuid primary key default gen_random_uuid(),

  -- IDENTITE DE L'AVIS. `reference` est la reference humaine telle que la
  -- CPA l'ecrit (« 004/AONO/CENAME/2025 ») ; `reference_slug` est sa forme
  -- d'ADRESSE (« 004-aono-cename-2025 »), et c'est elle qui PORTE l'URL.
  reference            text not null,
  reference_slug       text not null,

  -- TROIS ETATS, ET TROIS SEULEMENT. `preparation` n'est jamais public.
  etat                 text not null
    constraint appels_offres_etat_check
    check (etat = any (array['preparation', 'ouvert', 'attribue'])),

  objet                text not null,
  description          text,
  methode              text,
  methode_detail       text,
  valeur               numeric,
  devise               text,

  -- `timestamptz` ET NON `date` : la loi du lot A2 est que la liste affiche
  -- la date ET L'HEURE limite. Une `date` seule rendrait l'heure
  -- inexprimable, et un soumissionnaire qui depose a 15 h sur une echeance
  -- de 10 h perd son marche.
  remise_le            timestamptz,
  questions_avant      timestamptz,
  ouverture_plis       timestamptz,

  criteres_elim        text,
  criteres_notes       text,
  soumission           text,
  allotissement        text,

  -- LES TROIS RUBRIQUES LOCALES. Hors OCDS, exigees par la pratique
  -- tchadienne : prix du dossier, caution de soumission, duree de validite
  -- des offres.
  local_prix_dossier   text,
  local_caution        text,
  local_validite_jours integer,

  -- LE CANAL LEGAL. Un portail ne remplace pas la publication officielle ;
  -- il y renvoie. Sert aussi a remplir honnetement une section vide.
  canal_officiel_url   text,
  document_url         text,

  publie               boolean not null default false,
  cree_le              timestamptz not null default now(),

  -- EN DERNIERE POSITION : voir la rectification (3) de l'en-tete.
  -- `on delete cascade` : les avis d'un site supprime disparaissent avec
  -- lui. Mesure du 2026-11-06 : un `site_id` vers un site inexistant est
  -- refuse en `23503`, un `site_id` nul en `23502`.
  site_id              uuid not null references public.sites(id) on delete cascade,

  constraint appels_offres_reference_unique unique (site_id, reference_slug)
);

-- ------------------------------------------------------------
-- 2/6 -- LES TROIS BORNES MANQUANTES
-- ------------------------------------------------------------
-- MESURE DU 2026-11-06 -- CE QUE LA TABLE DEPLOYEE ACCEPTAIT :
--   * `reference_slug` = « Z Z/É! »  -> ACCEPTE. Et cette valeur PART DANS
--     L'URL. Une adresse ne se borne pas dans l'application seule : c'est la
--     seule borne qui survive a la suppression d'une validation applicative
--     (lecon reprise de `site_blog_posts.sql`) ;
--   * `objet` = trois espaces        -> ACCEPTE ;
--   * `reference` = chaine vide      -> ACCEPTE, bien que NOT NULL. `NOT
--     NULL` n'arrete pas la chaine vide ; seul `btrim` le fait.
--
-- La table est VIDE (bloc 0) : ces contraintes se posent sans validation de
-- donnees existantes, donc sans verrou long et sans risque de rejet. C'est
-- le bon moment, et il ne reviendra pas.
--
-- `ADD CONSTRAINT IF NOT EXISTS` n'existe pas en PostgreSQL : l'absence se
-- verifie dans `pg_constraint`, sinon un rejeu echouerait en `42710`.
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'appels_offres_reference_slug_chk') then
    alter table public.appels_offres add constraint appels_offres_reference_slug_chk
      check (reference_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
             and length(reference_slug) <= 120);
    raise notice 'posee : appels_offres_reference_slug_chk';
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'appels_offres_reference_chk') then
    alter table public.appels_offres add constraint appels_offres_reference_chk
      check (length(btrim(reference)) between 1 and 200);
    raise notice 'posee : appels_offres_reference_chk';
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'appels_offres_objet_chk') then
    alter table public.appels_offres add constraint appels_offres_objet_chk
      check (length(btrim(objet)) between 1 and 500);
    raise notice 'posee : appels_offres_objet_chk';
  end if;
end $$;

-- ------------------------------------------------------------
-- 3/6 -- INDEX
-- ------------------------------------------------------------
-- L'ordre de la liste publique : les avis d'un site, publies, echeance la
-- plus proche d'abord. `nulls last` : un avis sans echeance ne doit pas
-- ouvrir la liste.
create index if not exists appels_offres_site_publie_remise_idx
  on public.appels_offres (site_id, publie, remise_le nulls last);

-- ------------------------------------------------------------
-- 4/6 -- RLS ET PRIVILEGES
-- ------------------------------------------------------------
-- AUCUNE POLICY N'EST CREEE, ET C'EST UNE DECISION, PAS UN OUBLI.
--   * `anon` / `authenticated` n'ont AUCUN grant -> PostgREST rend 401 AVANT
--     d'evaluer la moindre policy (mesure : 42501) ;
--   * `service_role` possede BYPASSRLS : une policy d'ecriture serait
--     contournee a chaque appel reel des routes serveur, donc decorative ;
--   * la lecture publique passe par la VUE du bloc 5.
-- Meme patron que `site_blog_posts.sql` et `design_uploads.sql`.
alter table public.appels_offres enable row level security;

-- LES POLICIES SE RETIRENT PAR DECOUVERTE, JAMAIS PAR NOM SUPPOSE. Je ne me
-- fie pas a mon souvenir du nom que j'ai donne a la policy du 2026-11-06 :
-- un `drop policy if exists` sur un nom errone reussirait SANS RIEN FAIRE et
-- la policy survivrait a son propre retrait. Meme principe que le role
-- DECOUVERT de `views_privileges_hardening.sql`.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'appels_offres'
  loop
    execute format('drop policy %I on public.appels_offres', p.policyname);
    raise notice 'policy retiree : %', p.policyname;
  end loop;
end $$;

-- REVOKE PUIS GRANT, DANS CET ORDRE, ET SUR LA TABLE AUSSI. Supabase pose
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES` : tout objet neuf de
-- `public` nait ouvert. Un `grant select` seul n'annule rien -- il AJOUTE.
revoke all on table public.appels_offres from anon, authenticated;
grant  all on table public.appels_offres to   service_role;

-- ------------------------------------------------------------
-- 5/6 -- VUE PUBLIQUE
-- ------------------------------------------------------------
-- `security_invoker = false` : la vue s'execute avec les droits de son
-- proprietaire, la RLS de la table n'est jamais consultee. Sans cela elle
-- rendrait zero ligne -- un GRANT sans policy est un zero silencieux
-- (DEBT-071).
--
-- JOINTURE SUR `sites_public`, JAMAIS SUR `sites`. C'est TOUT le correctif
-- de GEN-D031 : l'invariant « site publie ET non archive » est HERITE et non
-- recopie, et comme `sites_public` n'expose ni `published` ni `archived_at`,
-- il est syntaxiquement impossible de le reecrire ici a la main.
--
-- `publie` N'EST PAS EXPOSEE : toute ligne rendue par cette vue est publiee
-- par construction. Exposer la colonne inviterait un lecteur a refiltrer, et
-- un lecteur qui refiltre finit par croire que c'est LUI qui protege.
create or replace view public.appels_offres_public
with (security_invoker = false) as
select
  a.id, a.site_id, s.slug as site_slug,
  a.reference, a.reference_slug, a.etat, a.objet, a.description,
  a.methode, a.methode_detail, a.valeur, a.devise,
  a.remise_le, a.questions_avant, a.ouverture_plis,
  a.criteres_elim, a.criteres_notes, a.soumission, a.allotissement,
  a.local_prix_dossier, a.local_caution, a.local_validite_jours,
  a.canal_officiel_url, a.document_url, a.cree_le
from public.appels_offres a
join public.sites_public s on s.id = a.site_id
where a.publie = true;

-- REVOKE PUIS GRANT. `ON TABLES` couvre AUSSI les vues : c'est le defaut
-- DEBT-073, qui a rendu `sites_public` ecrivable par `anon` pendant cinq
-- jours sans qu'aucun controle puisse le voir.
revoke all    on public.appels_offres_public from anon, authenticated;
grant  select on public.appels_offres_public to   anon, authenticated;

commit;

-- ------------------------------------------------------------
-- 6/6 -- CONSTAT APRES. A LIRE LIGNE PAR LIGNE.
-- ------------------------------------------------------------
-- ATTENDU : contraintes = 6 · policies = 0 · vue = 1 · invoker = false
select
  (select count(*) from pg_constraint
     where conrelid = 'public.appels_offres'::regclass)                  as contraintes,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'appels_offres')        as policies,
  (select count(*) from pg_views
     where schemaname = 'public' and viewname = 'appels_offres_public')  as vue,
  (select c.reloptions::text from pg_class c
     where c.relname = 'appels_offres_public')                           as invoker;

-- ATTENDU : AUCUNE LIGNE. Si une ligne apparait, `anon` ou `authenticated`
-- garde un privilege sur la TABLE et la vue ne protege plus rien.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'appels_offres'
  and grantee in ('anon', 'authenticated');

-- ATTENDU : exactement deux lignes, `anon` SELECT et `authenticated` SELECT.
-- Tout INSERT / UPDATE / DELETE ici est le defaut DEBT-073.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'appels_offres_public'
order by grantee, privilege_type;
