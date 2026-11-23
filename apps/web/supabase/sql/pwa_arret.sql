-- L'ARRÊT D'URGENCE DE L'INSTALLATION DES APPLIS (2026-11-22).
--
-- Un seul réglage : quota_reglages.pwa_arret. Vide (le défaut) = marche
-- normale. « oui » = toutes les applis publiées servent un service worker qui
-- efface son cache et se désinstalle, ne servent plus de manifeste, et leur
-- page ne propose plus l'installation (code : lib/apps/appli-servie.ts).
--
-- Ce fichier ajoute la clé à la liste permise (la liste de
-- quota_frais_mobile_money.sql, mesurée identique aux 17 clés en production
-- le 2026-11-22, plus « pwa_arret ») et pose la ligne, VIDE.
-- Si une clé existante manquait à la liste, la contrainte refuserait de se
-- poser et la transaction entière serait annulée : rien ne change.
-- Vérification : pwa_arret_verification.sql. Annulation : pwa_arret_annulation.sql.
begin;

alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte',
  'mobile_money', 'moyens_paiement_manuel',
  'frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct',
  'frais_reversement_pct', 'arrondi_frais_xaf',
  'pwa_arret'));

insert into public.quota_reglages (cle, valeur) values ('pwa_arret', '') on conflict (cle) do nothing;

commit;
