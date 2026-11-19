-- UNE APPLI GRATUITE PAR COMPTE — la réservation d'une création (étape ②, 2026-11-19).
--
-- Plan : docs/elite-protocol/PLAN_QUOTA_ACTIVATION.md, décision 2 : « une appli
-- gratuite par compte ; une deuxième appli = un second abonnement ».
--
-- ── POURQUOI UNE TABLE DE PLUS.
--
-- Mesuré : la route de création n'écrit sa ligne dans `app_generations` qu'À LA
-- FIN, après plusieurs minutes de travail payé. Compter les applis au début ne
-- voit donc pas une création EN COURS : deux créations lancées ensemble
-- passeraient toutes les deux. La réservation se pose au lancement, sous un
-- verrou par compte, et se solde à la fin : `livree` (l'appli existe) ou
-- `liberee` (la création a échoué — elle ne compte pas).
--
-- ── LA RÈGLE.
--
-- Une création est permise si le compte n'a AUCUNE appli non payée : ni une
-- appli livrée, non supprimée, dont l'abonnement n'est pas en cours, ni une
-- création réservée il y a moins de 30 minutes et pas encore soldée. Une appli
-- payée ne bloque rien : abonner son appli libère la place pour une suivante.
-- Les comptes exemptés ne passent jamais par ici (code, `sansQuota`).
--
-- Idempotent. Annulation : quota_creations_annulation.sql.
-- À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, APRÈS quota_modifications.sql.

begin;

create table if not exists public.app_creations_reservees (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null,
  cree_le      timestamptz not null default now(),
  -- null = en cours ; puis 'livree' ou 'liberee', une seule fois.
  issue        text check (issue in ('livree', 'liberee')),
  solde_le     timestamptz,
  app_id       uuid
);

create index if not exists app_creations_reservees_ouvertes
  on public.app_creations_reservees (owner_id) where issue is null;

-- Rend l'identifiant de la réservation, ou NULL si le compte a déjà une appli
-- non payée (ou une création en cours).
create or replace function public.reserver_creation(p_owner uuid)
returns uuid language plpgsql set search_path = public as $$
declare v_occupees integer; v_id uuid;
begin
  -- Un verrou PAR COMPTE, le temps de compter et d'écrire : deux créations
  -- simultanées du même compte se suivent ici.
  perform pg_advisory_xact_lock(hashtextextended('creation:' || p_owner::text, 0));
  select
    (select count(*) from public.app_generations g
       left join public.app_compteurs c on c.app_id = g.id
      where g.owner_id = p_owner and g.statut = 'livree'
        and not (coalesce(c.statut, 'gratuite') = 'abonnee' and c.paye_jusqu_au > now()))
    +
    (select count(*) from public.app_creations_reservees r
      where r.owner_id = p_owner and r.issue is null and r.cree_le > now() - interval '30 minutes')
  into v_occupees;
  if v_occupees > 0 then
    return null;
  end if;
  insert into public.app_creations_reservees (owner_id) values (p_owner) returning id into v_id;
  return v_id;
end $$;

-- Solde une réservation, une seule fois : 'livree' (avec l'appli) ou 'liberee'.
create or replace function public.solder_creation(p_id uuid, p_owner uuid, p_issue text, p_app uuid)
returns boolean language plpgsql set search_path = public as $$
declare v_n integer;
begin
  if p_issue not in ('livree', 'liberee') then
    raise exception 'CREATION_ISSUE: %', p_issue;
  end if;
  update public.app_creations_reservees
     set issue = p_issue, solde_le = now(), app_id = p_app
   where id = p_id and owner_id = p_owner and issue is null;
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;

alter table public.app_creations_reservees enable row level security;
revoke all on public.app_creations_reservees from anon, authenticated, public;
revoke all on function public.reserver_creation(uuid) from public, anon, authenticated;
revoke all on function public.solder_creation(uuid, uuid, text, uuid) from public, anon, authenticated;
grant select, insert, update on public.app_creations_reservees to service_role;
grant execute on function public.reserver_creation(uuid), public.solder_creation(uuid, uuid, text, uuid) to service_role;

commit;
