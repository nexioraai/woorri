-- LES MOYENS DE PAIEMENT À LA MAIN, EN RÉGLAGE (2026-11-21).
--
-- Décision du propriétaire : il n'a pas encore de numéro mobile money pour
-- RECEVOIR. Le bandeau « Publier demande l'abonnement » et la réponse 402 ne
-- promettent donc que ce qu'il encaisse : WhatsApp et espèces. La liste devient
-- un réglage, pour remettre « Airtel Money » sans redéployer :
--   regler_quota('moyens_paiement_manuel', 'espèces, Airtel Money', '<votre nom>')
-- Vide ou absente, le code affiche « espèces » seulement.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, APRÈS
-- quota_abonnement_carte.sql et mobile_money_interrupteur.sql (sa contrainte
-- reprend toutes leurs clés). Annulation : quota_moyens_paiement_annulation.sql.

begin;

alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte',
  'mobile_money', 'moyens_paiement_manuel'));

insert into public.quota_reglages (cle, valeur) values ('moyens_paiement_manuel', 'espèces') on conflict (cle) do nothing;

commit;
