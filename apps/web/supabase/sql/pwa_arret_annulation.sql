-- Annulation de pwa_arret.sql : retire la ligne, puis remet la liste d'avant.
begin;
delete from public.quota_reglages where cle = 'pwa_arret';
alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte',
  'mobile_money', 'moyens_paiement_manuel',
  'frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct',
  'frais_reversement_pct', 'arrondi_frais_xaf'));
commit;
