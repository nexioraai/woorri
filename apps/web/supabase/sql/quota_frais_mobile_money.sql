-- LES FRAIS MOBILE MONEY, PAYÉS PAR LE CLIENT (2026-11-21).
--
-- Décision du propriétaire : il ne reçoit jamais moins que `prix_mensuel_xaf`
-- net. Le client paie les frais du prestataire. Le code calcule :
--   total = arrondi au `arrondi_frais_xaf` SUPÉRIEUR de
--           prix_mensuel_xaf × (1 + reversement) ÷ (1 − encaissement de l'opérateur)
--
-- Ce fichier AJOUTE quatre réglages, VIDES — tant qu'un seul est vide, aucun
-- paiement mobile money n'est proposé. Le propriétaire les règle ensuite, à
-- son nom, par `regler_quota` (historisé) : quota_frais_mobile_money_valeurs.sql.
--
-- Il ne touche NI `regler_quota`, NI `enregistrer_paiement` : la forme des
-- valeurs est gardée par une contrainte de TABLE, qui refuse aussi bien un
-- `regler_quota` qu'une écriture directe. Vide = permis (c'est « non réglé »).
--   pourcentages : 0 à 99.99, point décimal, 2 décimales au plus (« 3.5 »)
--   arrondi      : entier de 1 à 10 000
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, APRÈS
-- quota_moyens_paiement.sql (sa contrainte reprend toutes ses clés).
-- Vérification : quota_frais_mobile_money_verification.sql.
-- Annulation : quota_frais_mobile_money_annulation.sql.

begin;

alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte',
  'mobile_money', 'moyens_paiement_manuel',
  'frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct',
  'frais_reversement_pct', 'arrondi_frais_xaf'));

-- CASE imbriqué : Postgres ne garantit pas l'ordre d'un AND, le cast n'est
-- évalué que si la forme est déjà bonne.
alter table public.quota_reglages drop constraint if exists quota_reglages_frais_check;
alter table public.quota_reglages add constraint quota_reglages_frais_check check (
  case
    when cle in ('frais_encaissement_airtel_pct', 'frais_encaissement_moov_pct', 'frais_reversement_pct')
      then valeur = '' or valeur ~ '^[0-9]{1,2}(\.[0-9]{1,2})?$'
    when cle = 'arrondi_frais_xaf'
      then valeur = '' or (case when valeur ~ '^[0-9]{1,5}$' then valeur::integer between 1 and 10000 else false end)
    else true
  end);

insert into public.quota_reglages (cle, valeur) values
  ('frais_encaissement_airtel_pct', ''),
  ('frais_encaissement_moov_pct', ''),
  ('frais_reversement_pct', ''),
  ('arrondi_frais_xaf', '')
on conflict (cle) do nothing;

commit;
