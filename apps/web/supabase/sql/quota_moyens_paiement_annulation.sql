-- ANNULATION de quota_moyens_paiement.sql. Sans la clé, le code affiche « espèces ».
begin;
delete from public.quota_reglages where cle = 'moyens_paiement_manuel';
alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte',
  'mobile_money'));
commit;
