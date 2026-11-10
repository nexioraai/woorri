-- ============================================================================
-- LOT 14.3 — LE JOURNAL D'AUDIT : QUI A FAIT QUOI, ET QUAND.
--
-- ── POURQUOI IL EXISTE.
--
-- Activer un fournisseur, le qualifier, retenir une offre, publier un avis,
-- répondre à une réclamation : chacun de ces gestes engage la Centrale dans
-- un marché public. Sans journal, la seule trace est l'état final — on sait
-- QU'un fournisseur est qualifié, jamais QUI l'a qualifié ni QUAND.
--
-- ── IL NE SE RÉÉCRIT PAS.
--
-- Un journal qu'on peut modifier n'est pas un journal. Le déclencheur
-- REFUSE toute mise à jour et toute suppression — y compris au rôle de
-- service, y compris à nous. C'est la forme « impossibilité plutôt que
-- règle » de ce dépôt : aucune route ne PEUT effacer une entrée, même par
-- erreur.
--
-- ── IL N'EST LISIBLE QUE PAR LE PROPRIÉTAIRE DU SITE, VIA UNE ROUTE.
--
-- Aucun privilège à `anon` ni `authenticated`. Un fournisseur ne doit pas
-- lire qu'un concurrent a été qualifié la veille.
-- ============================================================================

select (select count(*) from information_schema.tables
          where table_schema = 'public' and table_name = 'journal_audit') as table_deja_la;

create table if not exists public.journal_audit (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  le timestamptz not null default now(),
  -- QUI. L'adresse, pas l'identifiant : un journal se relit des années
  -- plus tard, et une adresse se lit sans jointure sur `auth`.
  acteur text not null,
  -- AGIT-IL COMME ADMINISTRATEUR DE LA PLATEFORME, PAS COMME PROPRIÉTAIRE ?
  -- Une intervention de notre équipe sur le site de la Centrale doit se
  -- distinguer d'un geste de la Centrale elle-même.
  via_admin boolean not null default false,
  action text not null
    constraint journal_audit_action_chk check (action ~ '^[a-z_]+\.[a-z_]+$'),
  cible text not null,
  details jsonb not null default '{}'::jsonb
);

create index if not exists journal_audit_site_idx on public.journal_audit (site_id, le desc);

-- ── IL NE SE RÉÉCRIT PAS. Même au service. Même par nous.
create or replace function public.journal_audit_immuable()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'journal_audit est en ajout seul : ni modification ni suppression'
    using errcode = '42501';
end; $$;

-- PostgreSQL accorde EXECUTE à PUBLIC par défaut, et Supabase y ajoute
-- `anon` et `authenticated`. Le cliquet `rpcVersioning` l'a rappelé : même
-- une fonction de déclencheur se ferme explicitement.
revoke all on function public.journal_audit_immuable() from public, anon, authenticated;

drop trigger if exists journal_audit_immuable on public.journal_audit;
create trigger journal_audit_immuable
  before update or delete on public.journal_audit
  for each row execute function public.journal_audit_immuable();

alter table public.journal_audit enable row level security;
revoke all on table public.journal_audit from anon, authenticated;
grant select, insert on table public.journal_audit to service_role;

notify pgrst, 'reload schema';

select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'journal_audit')    as colonnes,
  (select count(*) from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'journal_audit'
       and grantee in ('anon', 'authenticated'))                       as privileges_publics,
  (select count(*) from pg_trigger where tgname = 'journal_audit_immuable') as declencheur;
