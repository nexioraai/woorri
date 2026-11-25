-- LES SITES PAYÉS EN MOBILE MONEY — l'échéance et le registre (lot L5, 2026-11-25).
--
-- Décision du propriétaire : un site (Vitrine, Boutique ; jamais le
-- Dropshipping, carte seulement) se paie aussi par mobile money, au prix unique
-- tiré de son prix NET par la formule de l'appli :
--   Vitrine  6 000 net → 7 000 FCFA ;  Boutique 9 000 net → 10 500 FCFA.
-- Un paiement reçu met le site EN LIGNE et repousse son échéance (« payé
-- jusqu'au ») de `duree_jours`. À l'échéance, le site RESTE en ligne (règle du
-- 2026-11-18) : le rappel s'affiche au propriétaire ; la pause du jour 30 vient
-- avec le chantier « abonnement non renouvelé » (docs/ECHEANCES.md).
--
-- Ce fichier :
--   ① ajoute les réglages `prix_site_vitrine_xaf` (6000) et
--      `prix_site_boutique_xaf` (9000), à ton nom, historisés ;
--   ② crée `site_abonnements` (une ligne par site payé hors Stripe : son
--      échéance) et `site_paiements` (le registre, en ajout seul) — à part de
--      `sites`, dont les colonnes sont protégées une à une ;
--   ③ crée `enregistrer_paiement_site(...)`, la seule fonction qui écrit un
--      paiement de site : propriétaire vérifié, jamais le Dropshipping ni un
--      site archivé, une référence = un paiement (« déjà enregistré »).
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS
-- quota_frais_retrait.sql (n° 4). Vérification : sites_mobile_money_verification.sql.
-- Annulation : sites_mobile_money_annulation.sql.

begin;

-- ① LES DEUX PRIX NETS. La contrainte reprend TOUTES les clés existantes.
alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte',
  'mobile_money', 'moyens_paiement_manuel',
  'frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct',
  'frais_reversement_pct', 'arrondi_frais_xaf',
  'pwa_arret',
  'frais_retrait_pct',
  'prix_site_vitrine_xaf', 'prix_site_boutique_xaf'));

alter table public.quota_reglages drop constraint if exists quota_reglages_prix_site_check;
alter table public.quota_reglages add constraint quota_reglages_prix_site_check check (
  cle not in ('prix_site_vitrine_xaf', 'prix_site_boutique_xaf')
  or valeur = '' or (valeur ~ '^[0-9]{1,7}$' and valeur::integer > 0));

insert into public.quota_reglages (cle, valeur) values ('prix_site_vitrine_xaf', ''), ('prix_site_boutique_xaf', '')
  on conflict (cle) do nothing;
select public.regler_quota('prix_site_vitrine_xaf', '6000', 'Youssouf')
 where (select valeur from public.quota_reglages where cle = 'prix_site_vitrine_xaf') <> '6000';
select public.regler_quota('prix_site_boutique_xaf', '9000', 'Youssouf')
 where (select valeur from public.quota_reglages where cle = 'prix_site_boutique_xaf') <> '9000';

-- ② L'ÉCHÉANCE ET LE REGISTRE.
create table if not exists public.site_abonnements (
  site_id        uuid primary key references public.sites(id) on delete cascade,
  owner_id       uuid not null,
  paye_jusqu_au  timestamptz not null,
  mis_a_jour_le  timestamptz not null default now()
);

create table if not exists public.site_paiements (
  id          uuid primary key default gen_random_uuid(),
  cree_le     timestamptz not null default now(),
  owner_id    uuid not null,
  site_id     uuid not null references public.sites(id),
  source      text not null check (source in ('automatique', 'manuelle')),
  fournisseur text not null check (btrim(fournisseur) <> ''),
  reference   text not null check (btrim(reference) <> ''),
  objet       text not null check (objet in ('abonnement', 'annulation')),
  montant     numeric not null check (montant >= 0),
  devise      text not null check (devise ~ '^[A-Z]{3}$'),
  frais       numeric not null default 0 check (frais >= 0),
  jusqu_au    timestamptz,
  saisi_par   text not null check (btrim(saisi_par) <> ''),
  annule      uuid references public.site_paiements(id),
  unique (fournisseur, reference)
);

alter table public.site_abonnements enable row level security;
alter table public.site_paiements enable row level security;
revoke all on public.site_abonnements, public.site_paiements from public, anon, authenticated;
grant select, insert, update on public.site_abonnements to service_role;
grant select, insert on public.site_paiements to service_role;

-- ③ LA SEULE FONCTION QUI ÉCRIT UN PAIEMENT DE SITE.
create or replace function public.enregistrer_paiement_site(
  p_source text, p_fournisseur text, p_reference text, p_site uuid, p_owner uuid,
  p_montant numeric, p_devise text, p_saisi_par text, p_frais numeric default 0)
returns jsonb language plpgsql set search_path = public as $$
declare
  v_site record;
  v_ab public.site_abonnements%rowtype;
  v_existant public.site_paiements%rowtype;
  v_fin timestamptz;
begin
  if p_frais is null or p_frais < 0 or p_frais > p_montant then
    raise exception 'PAIEMENT_SITE_FRAIS: % pour un montant de %', p_frais, p_montant;
  end if;
  -- LE VERROU du site d'abord : deux avis simultanés se suivent ici.
  select id, owner_id, mode, archived_at into v_site from public.sites where id = p_site for update;
  if not found then raise exception 'PAIEMENT_SITE_INCONNU: %', p_site; end if;
  if v_site.owner_id is distinct from p_owner then raise exception 'PAIEMENT_SITE_ETRANGER: ce site n''appartient pas à ce compte'; end if;
  if v_site.mode = 3 then raise exception 'PAIEMENT_SITE_DROPSHIPPING: le dropshipping se paie par carte'; end if;
  if v_site.archived_at is not null then raise exception 'PAIEMENT_SITE_ARCHIVE: site archivé'; end if;

  select * into v_existant from public.site_paiements where fournisseur = p_fournisseur and reference = p_reference;
  if found then
    return jsonb_build_object('statut', 'deja_enregistre', 'site_id', v_existant.site_id, 'jusqu_au', v_existant.jusqu_au);
  end if;

  select * into v_ab from public.site_abonnements where site_id = p_site for update;
  v_fin := greatest(now(), coalesce(v_ab.paye_jusqu_au, now()))
           + make_interval(days => public.quota_reglage_entier('duree_jours'));

  insert into public.site_abonnements (site_id, owner_id, paye_jusqu_au, mis_a_jour_le)
  values (p_site, p_owner, v_fin, now())
  on conflict (site_id) do update set paye_jusqu_au = excluded.paye_jusqu_au, mis_a_jour_le = now();

  insert into public.site_paiements (owner_id, site_id, source, fournisseur, reference, objet, montant, devise, frais, jusqu_au, saisi_par)
  values (p_owner, p_site, p_source, p_fournisseur, p_reference, 'abonnement', p_montant, p_devise, p_frais, v_fin, p_saisi_par);

  -- EN LIGNE. `subscription_status` dit d'où vient la publication.
  update public.sites set published = true, subscription_status = 'mobile_money' where id = p_site;

  return jsonb_build_object('statut', 'enregistre', 'site_id', p_site, 'jusqu_au', v_fin);
end $$;

revoke all on function public.enregistrer_paiement_site(text, text, text, uuid, uuid, numeric, text, text, numeric) from public, anon, authenticated;
grant execute on function public.enregistrer_paiement_site(text, text, text, uuid, uuid, numeric, text, text, numeric) to service_role;

notify pgrst, 'reload schema';

commit;
