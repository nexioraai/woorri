-- ============================================================================
-- LOT 16 — L'ASSISTANT DE SITE : SON INTERRUPTEUR ET SON COMPTEUR.
--
-- ── `assistant_actif`, FAUX PAR DÉFAUT.
-- Chaque question coûte. Sans interrupteur, les 42 sites gagneraient une
-- bulle payante parce qu'une migration est passée.
--
-- ── LE COMPTEUR NE GARDE PAS L'ADRESSE EN CLAIR.
-- `ip_hache` est un hachage salé côté serveur : assez pour compter, pas pour
-- retrouver qui a demandé. Les lignes de plus d'un jour sont effacées par la
-- route à chaque question — le compteur ne devient pas un historique.
--
-- ── IL NE GARDE PAS LA QUESTION.
-- On compte, on n'archive pas. Ce qui part chez DeepSeek est dit au
-- visiteur ; ce qui reste chez nous, c'est une heure et une empreinte.
-- ============================================================================

select (select count(*) from information_schema.columns
          where table_schema='public' and table_name='sites' and column_name='assistant_actif') as interrupteur_deja_la;

alter table public.sites add column if not exists assistant_actif boolean not null default false;
grant update (assistant_actif) on table public.sites to authenticated;

create table if not exists public.assistant_questions (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  ip_hache text not null,
  pose_le timestamptz not null default now()
);
create index if not exists assistant_questions_site_idx on public.assistant_questions (site_id, pose_le);
create index if not exists assistant_questions_ip_idx on public.assistant_questions (site_id, ip_hache, pose_le);

alter table public.assistant_questions enable row level security;
revoke all on table public.assistant_questions from anon, authenticated;
grant all on table public.assistant_questions to service_role;

notify pgrst, 'reload schema';

select
  (select bool_or(column_name='assistant_actif') from information_schema.columns
     where table_schema='public' and table_name='sites')                         as interrupteur,
  (select count(*) from information_schema.role_table_grants
     where table_schema='public' and table_name='assistant_questions'
       and grantee in ('anon','authenticated'))                                  as privileges_publics,
  (select count(*) from public.sites where assistant_actif)                      as sites_actifs;
