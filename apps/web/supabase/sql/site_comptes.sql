-- ============================================================================
-- LOT 10 — QUI ÊTES-VOUS SUR CE SITE ?
--
-- CE LOT NE TOUCHE PAS À `requireSiteOwner`. Cette garde existe, protège
-- 46 routes (mesuré), et répond à une AUTRE question : « ce site est-il à
-- vous ? ». Ici on répond à « qui êtes-vous SUR ce site ? ». C'est une
-- couche au-dessus, jamais un remplacement : confondre les deux donnerait
-- au premier fournisseur venu les droits du propriétaire.
--
-- LES RÔLES SONT UN VOCABULAIRE FERMÉ, et extensible par SQL seulement.
-- Le plan (§5, décision 4) note que la CPA doit encore trancher ses
-- validateurs et administrateurs. Poser trois rôles indiscutables et
-- laisser la base refuser le reste vaut mieux qu'inventer une hiérarchie
-- qu'elle devra défaire.
--
-- L'ÉTAT EST SÉPARÉ DU RÔLE. Un compte « fournisseur » peut être en
-- attente, actif ou suspendu. Mélanger les deux obligerait à inventer un
-- rôle « fournisseur_suspendu », et le jour où un rôle s'ajoute il faudrait
-- en inventer trois.
--
-- RIEN N'EST ACTIF À LA CRÉATION. `en_attente` est le défaut : un compte
-- qui s'activerait seul ferait entrer n'importe qui dans l'espace
-- fournisseur d'une centrale d'achats publique.
-- ============================================================================

create table if not exists public.site_comptes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,

  -- L'identité vient de l'authentification, pas d'une saisie. `auth.users`
  -- est la seule autorité sur « cette personne existe ».
  user_id uuid not null,

  -- Recopié pour pouvoir afficher et chercher sans jointure sur `auth`.
  -- Il peut DIVERGER si la personne change d'adresse : `user_id` reste la
  -- vérité, `email` n'est qu'un affichage.
  email text not null
    constraint site_comptes_email_chk check (position('@' in email) > 1),

  role text not null
    constraint site_comptes_role_chk
    check (role in ('fournisseur', 'structure', 'agent')),

  etat text not null default 'en_attente'
    constraint site_comptes_etat_chk
    check (etat in ('en_attente', 'actif', 'suspendu')),

  -- L'organisation que la personne représente. Facultatif : un agent de la
  -- Centrale n'en a pas.
  organisation text
    constraint site_comptes_orga_chk
    check (organisation is null or length(btrim(organisation)) between 1 and 300),

  -- La référence d'enregistrement fournisseur, quand elle existe. Elle
  -- rattache un compte au dossier qui l'a fait admettre.
  reference text
    constraint site_comptes_reference_chk
    check (reference is null or length(btrim(reference)) between 1 and 60),

  cree_le timestamptz not null default now(),
  maj_le  timestamptz not null default now(),

  -- UNE PERSONNE N'A QU'UN COMPTE PAR SITE. Deux comptes pour la même
  -- personne rendraient « quels sont ses droits ? » ambigu, et c'est
  -- l'ambiguïté qui se résout toujours du mauvais côté.
  constraint site_comptes_unique unique (site_id, user_id)
);

create index if not exists site_comptes_site_role_idx
  on public.site_comptes (site_id, role, etat);
create index if not exists site_comptes_user_idx
  on public.site_comptes (user_id);

-- ---------------------------------------------------------------------------
-- AUCUN PRIVILÈGE À PERSONNE.
--
-- Pas même en lecture à `authenticated`. Une politique RLS « je lis ma
-- propre ligne » paraîtrait raisonnable — mais elle ouvrirait la table à
-- toute session, et il suffirait d'une politique mal écrite pour que
-- quelqu'un lise la liste des fournisseurs d'une centrale d'achats.
--
-- Tout passe par une route serveur qui vérifie la session ET le site.
-- ---------------------------------------------------------------------------
alter table public.site_comptes enable row level security;
revoke all on table public.site_comptes from anon, authenticated;
grant  all on table public.site_comptes to   service_role;

-- AUCUNE VUE PUBLIQUE N'EST CRÉÉE, et c'est délibéré : il n'existe aucun
-- cas où le public doit lire la liste des comptes d'un site.

notify pgrst, 'reload schema';
