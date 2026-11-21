-- L'INTERRUPTEUR DU PAIEMENT MOBILE MONEY DES APPLIS (2026-11-21, MODE TEST).
--
-- Même règle que `abonnement_carte` (quota_abonnement_carte.sql) :
--   absente ou vide → ÉTEINT ; une liste de comptes (identifiants ou courriels)
--   → ces comptes seuls ; 'tous' → tout le monde.
-- Ce fichier ajoute la clé `mobile_money`, VIDE. L'allumer pour un compte
-- d'essai : regler_quota('mobile_money', '<courriel>', '<votre nom>').
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, APRÈS
-- quota_abonnement_carte.sql. Annulation : mobile_money_interrupteur_annulation.sql.

begin;

alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte',
  'mobile_money'));

insert into public.quota_reglages (cle, valeur) values ('mobile_money', '') on conflict (cle) do nothing;

commit;
