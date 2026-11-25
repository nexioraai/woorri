-- APRÈS L'ÉCHÉANCE, LES MODIFICATIONS D'UN SITE S'ARRÊTENT (lot L5, 2026-11-25).
--
-- Règle du propriétaire (2026-11-18, docs/ECHEANCES.md) : à l'échéance, le
-- site RESTE en ligne et ses clients continuent de s'en servir ; seules les
-- modifications s'arrêtent, jusqu'au paiement. L'éditeur écrit le site
-- DEPUIS LE NAVIGATEUR (rôle `authenticated`, colonnes autorisées une à une) :
-- seule la base peut l'arrêter.
--
--   site_modifications_permises(site) : faux seulement pour un site ENCORE
--   publié par le mobile money (`subscription_status = 'mobile_money'`) dont
--   l'échéance (`site_abonnements`) est PASSÉE ;
--   un déclencheur refuse alors toute modification faite par le propriétaire
--   (`authenticated`). Le serveur (`service_role`) — webhooks, tâches,
--   paiement qui le remet à jour — n'est jamais arrêté.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS
-- sites_mobile_money.sql (n° 7). Vérification : sites_modifications_echues_verification.sql.
-- Annulation : sites_modifications_echues_annulation.sql.

begin;

create or replace function public.site_modifications_permises(p_site uuid)
returns boolean language sql stable security definer set search_path = public as $$
  -- Seulement un site ENCORE publié par le mobile money : passé à Stripe, une
  -- ancienne échéance mobile money ne le bloque pas.
  select not exists (
    select 1 from public.site_abonnements a join public.sites s on s.id = a.site_id
     where a.site_id = p_site and a.paye_jusqu_au <= now() and s.subscription_status = 'mobile_money')
$$;

create or replace function public.sites_refuser_si_echu()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user = 'authenticated' and not public.site_modifications_permises(old.id) then
    raise exception 'SITE_ECHU: l''abonnement de ce site est arrivé à échéance — renouvelez-le pour reprendre les modifications. Le site reste en ligne.';
  end if;
  return new;
end $$;

drop trigger if exists sites_refuser_si_echu on public.sites;
create trigger sites_refuser_si_echu before update on public.sites
  for each row execute function public.sites_refuser_si_echu();

revoke all on function public.sites_refuser_si_echu() from public, anon, authenticated;
revoke all on function public.site_modifications_permises(uuid) from public, anon;
grant execute on function public.site_modifications_permises(uuid) to authenticated, service_role;

commit;
