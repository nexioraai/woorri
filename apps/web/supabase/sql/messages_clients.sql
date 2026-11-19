-- ============================================================================
-- LE FIL DE MESSAGES ENTRE CHAQUE CLIENT ET LA DIVISION DDM (CPA, 2026-11-19).
--
-- À exécuter dans l'éditeur SQL Supabase (projet nexiora-ai). Rejouable.
--
-- « La DDM communique avec tous les clients : elle clique sur un client et
-- échange avec lui — envoi, réception. » Un FIL par client : chaque message
-- dit de qui il vient (`client` ou `centrale`) et quand le destinataire l'a lu.
--
-- Le client ne lit que SON fil ; la DDM (agents du service `ddm`) et le
-- propriétaire du site lisent tous les fils. Rien n'est lisible directement :
-- tout passe par les routes du site, qui vérifient qui demande.
-- ============================================================================

create table if not exists public.messages_clients (
  id uuid primary key default gen_random_uuid(),
  site_id   uuid not null references public.sites(id)        on delete cascade,
  -- Le CLIENT à qui appartient le fil (compte `structure`).
  compte_id uuid not null references public.site_comptes(id) on delete cascade,
  de text not null constraint messages_clients_de_chk check (de in ('client', 'centrale')),
  -- Qui a écrit côté Centrale (adresse de l'agent), pour le journal du fil.
  auteur text,
  texte text not null constraint messages_clients_texte_chk check (length(btrim(texte)) between 1 and 4000),
  cree_le timestamptz not null default now(),
  -- Lu par le DESTINATAIRE (le client pour un message de la Centrale, et
  -- inversement). NULL tant qu'il ne l'a pas ouvert : c'est le « non lu ».
  lu_le timestamptz
);

create index if not exists messages_clients_fil_idx on public.messages_clients (site_id, compte_id, cree_le);

alter table public.messages_clients enable row level security;
revoke all on table public.messages_clients from anon, authenticated;
grant  all on table public.messages_clients to   service_role;

notify pgrst, 'reload schema';

-- APRÈS — attendu : 1 · 0
select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'messages_clients') as table_presente,
  (select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'messages_clients'
     and grantee in ('anon', 'authenticated')) as privileges_publics;
