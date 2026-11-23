-- LA BOÎTE NOIRE DES GÉNÉRATIONS ET DES MODIFICATIONS (2026-11-23).
--
-- Une ligne par création, régénération ou modification : la demande, la
-- lecture du cahier, la consigne exacte et la réponse brute de chaque tour, les
-- décisions du code, les contrôles, les mesures, la livraison, et l'analyse
-- phrase par phrase (code : src/lib/apps/boite-noire.ts).
--
--   · AJOUT SEUL : la base refuse toute mise à jour (déclencheur) ;
--   · SERVICE SEUL : ni anon ni authenticated ne lisent ni n'écrivent ; la
--     lecture passe par les routes /api/admin/boite-noire (fondateur seul) ;
--   · CONSERVATION : 90 jours (garder_jusqu_au, posé par le code) ;
--     purger_boite_noire() efface ce qui a dépassé, appelée par la tâche
--     quotidienne purge-supprimees ;
--   · TAILLE : le code borne chaque ligne à 3 Mio ; la base refuse au-delà
--     de 4 Mio, au cas où.
-- Vérification : boite_noire_verification.sql. Annulation : boite_noire_annulation.sql.
begin;

create table if not exists public.app_boite_noire (
  id               uuid primary key default gen_random_uuid(),
  cree_le          timestamptz not null default now(),
  generation_id    uuid,
  nature           text not null check (nature in ('generation', 'regeneration', 'retouche')),
  compte           uuid,
  issue            text not null,
  debut_le         timestamptz not null,
  fin_le           timestamptz not null,
  etapes           jsonb not null default '[]'::jsonb,
  analyse_phrases  jsonb,
  tronquee         boolean not null default false,
  taille_octets    integer not null default 0 check (taille_octets >= 0 and taille_octets <= 4194304),
  garder_jusqu_au  timestamptz not null
);
create index if not exists app_boite_noire_par_date on public.app_boite_noire (cree_le desc);
create index if not exists app_boite_noire_par_generation on public.app_boite_noire (generation_id);

create or replace function public.app_boite_noire_refuser_mise_a_jour()
returns trigger language plpgsql as $$
begin
  raise exception 'app_boite_noire est en ajout seul : une boîte noire ne se modifie pas (id %).', old.id;
end $$;
revoke all on function public.app_boite_noire_refuser_mise_a_jour() from public, anon, authenticated;
drop trigger if exists app_boite_noire_ajout_seul on public.app_boite_noire;
create trigger app_boite_noire_ajout_seul before update on public.app_boite_noire
  for each row execute function public.app_boite_noire_refuser_mise_a_jour();

alter table public.app_boite_noire enable row level security;
revoke all on public.app_boite_noire from anon, authenticated, public;
grant select, insert on public.app_boite_noire to service_role;

create or replace function public.purger_boite_noire()
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  delete from public.app_boite_noire where garder_jusqu_au < now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.purger_boite_noire() from public, anon, authenticated;
grant execute on function public.purger_boite_noire() to service_role;

notify pgrst, 'reload schema';

commit;
