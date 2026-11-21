-- LES VALEURS DES FRAIS MOBILE MONEY — à lancer par le PROPRIÉTAIRE, à son nom.
--
-- Taux mesurés par le propriétaire dans le tableau de bord MoneRails, MODE
-- TEST, le 2026-11-21 (à confirmer par le premier vrai paiement et le premier
-- vrai reversement) : encaissement Airtel 7 %, Moov 5 %, reversement 3,5 %
-- (ajouté au montant reversé), arrondi au 100 FCFA supérieur.
--
-- Chaque ligne passe par `regler_quota` : historisée dans
-- quota_reglages_historique, signée « Youssouf ». Rien n'est à remplacer.
-- À lancer APRÈS quota_frais_mobile_money.sql.

select public.regler_quota('frais_encaissement_airtel_pct', '7', 'Youssouf');
select public.regler_quota('frais_encaissement_moov_pct', '5', 'Youssouf');
select public.regler_quota('frais_reversement_pct', '3.5', 'Youssouf');
select public.regler_quota('arrondi_frais_xaf', '100', 'Youssouf');
