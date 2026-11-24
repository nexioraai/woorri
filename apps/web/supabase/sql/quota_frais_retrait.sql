-- LE RETRAIT DANS LE PRIX MOBILE MONEY (2026-11-23).
--
-- Décision du propriétaire : UN SEUL prix mobile money, le même pour Airtel et
-- Moov, calculé avec le taux d'encaissement le plus élevé ET le retrait (sortie
-- de l'argent du solde MoneRails) :
--   prix ÷ (1 − retrait) × (1 + reversement) ÷ (1 − encaissement le plus haut),
--   arrondi à la centaine supérieure.
--
-- Ce fichier ajoute la clé `frais_retrait_pct` (même forme que les autres
-- taux : 0 à 99.99) et la RÈGLE à 4, à ton nom, par `regler_quota` (historisé).
-- Tant qu'elle manquait, le code nouveau ne proposait AUCUN montant : il exige
-- les six réglages, tout ou rien.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS
-- pwa_arret.sql (la contrainte reprend toutes ses clés ; une clé oubliée ferait
-- échouer la transaction entière, sans rien changer).
-- Vérification : quota_frais_retrait_verification.sql.
-- Annulation : quota_frais_retrait_annulation.sql.

begin;

alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte',
  'mobile_money', 'moyens_paiement_manuel',
  'frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct',
  'frais_reversement_pct', 'arrondi_frais_xaf',
  'pwa_arret',
  'frais_retrait_pct'));

alter table public.quota_reglages drop constraint if exists quota_reglages_frais_check;
alter table public.quota_reglages add constraint quota_reglages_frais_check check (
  case
    when cle in ('frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct', 'frais_reversement_pct', 'frais_retrait_pct')
      then valeur = '' or valeur ~ '^[0-9]{1,2}(\.[0-9]{1,2})?$'
    when cle = 'arrondi_frais_xaf'
      then valeur = '' or (case when valeur ~ '^[0-9]{1,5}$' then valeur::integer between 1 and 10000 else false end)
    else true
  end);

insert into public.quota_reglages (cle, valeur) values ('frais_retrait_pct', '') on conflict (cle) do nothing;

-- La valeur, à ton nom, historisée (sans effet si elle vaut déjà 4).
select public.regler_quota('frais_retrait_pct', '4', 'Youssouf')
 where (select valeur from public.quota_reglages where cle = 'frais_retrait_pct') <> '4';

commit;
