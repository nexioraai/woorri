-- ANNULATION de quota_frais_retrait.sql : retire la clé et rend les contraintes
-- d'avant (celles de pwa_arret.sql et quota_frais_mobile_money.sql). Le code du
-- prix unique, sans ce réglage, ne propose alors AUCUN montant mobile money.
begin;
delete from public.quota_reglages where cle = 'frais_retrait_pct';
alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte',
  'mobile_money', 'moyens_paiement_manuel',
  'frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct',
  'frais_reversement_pct', 'arrondi_frais_xaf',
  'pwa_arret'));
alter table public.quota_reglages drop constraint if exists quota_reglages_frais_check;
alter table public.quota_reglages add constraint quota_reglages_frais_check check (
  case
    when cle in ('frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct', 'frais_reversement_pct')
      then valeur = '' or valeur ~ '^[0-9]{1,2}(\.[0-9]{1,2})?$'
    when cle = 'arrondi_frais_xaf'
      then valeur = '' or (case when valeur ~ '^[0-9]{1,5}$' then valeur::integer between 1 and 10000 else false end)
    else true
  end);
commit;
