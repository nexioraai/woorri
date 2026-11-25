-- LES DEMANDES MOBILE MONEY D'UN SITE (lot L5, 2026-11-25).
--
-- `mm_demandes` ne connaissait que les applis (`app_id` obligatoire). Une
-- demande vise désormais UNE cible : une appli OU un site, jamais les deux,
-- jamais aucune. Le même verrou qu'une appli : une seule demande ouverte par
-- site, tenue par un index unique ; `mm_ouvrir_demande_site` est la copie
-- exacte de `mm_ouvrir_demande`, pour un site.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS
-- sites_mobile_money.sql (n° 7). Vérification :
-- mobile_money_demandes_sites_verification.sql. Annulation :
-- mobile_money_demandes_sites_annulation.sql.

begin;

alter table public.mm_demandes add column if not exists site_id uuid;
alter table public.mm_demandes alter column app_id drop not null;
alter table public.mm_demandes drop constraint if exists mm_demandes_une_cible;
alter table public.mm_demandes add constraint mm_demandes_une_cible check (num_nonnulls(app_id, site_id) = 1);
create unique index if not exists mm_demandes_une_ouverte_site on public.mm_demandes (site_id) where ferme_le is null and site_id is not null;

create or replace function public.mm_ouvrir_demande_site(
  p_fournisseur text, p_site uuid, p_owner uuid, p_operateur text, p_telephone_masque text,
  p_montant integer, p_prix integer, p_frais integer, p_attente_s integer)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_autre record;
begin
  update public.mm_demandes
     set ferme_le = now(),
         raison = coalesce(raison, 'verrou libéré : plus de ' || p_attente_s || ' s sans issue')
   where site_id = p_site and ferme_le is null and cree_le < now() - make_interval(secs => p_attente_s);
  begin
    insert into public.mm_demandes (fournisseur, site_id, owner_id, operateur, telephone_masque, montant, prix, frais)
    values (p_fournisseur, p_site, p_owner, p_operateur, p_telephone_masque, p_montant, p_prix, p_frais)
    returning id into v_id;
  exception when unique_violation then
    select id, cree_le into v_autre from public.mm_demandes where site_id = p_site and ferme_le is null;
    return jsonb_build_object('statut', 'deja_ouverte', 'id', v_autre.id, 'cree_le', v_autre.cree_le);
  end;
  return jsonb_build_object('statut', 'ouverte', 'id', v_id);
end $$;

revoke all on function public.mm_ouvrir_demande_site(text, uuid, uuid, text, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.mm_ouvrir_demande_site(text, uuid, uuid, text, text, integer, integer, integer, integer) to service_role;

notify pgrst, 'reload schema';

commit;
