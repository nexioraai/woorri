-- ANNULATION de quota_abonnement_carte.sql. Sans la clé, le code lit « éteint ».
begin;
delete from public.quota_reglages where cle = 'abonnement_carte';
alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement'));
commit;
