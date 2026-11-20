-- L'INTERRUPTEUR DU PAIEMENT PAR CARTE DES APPLIS (2026-11-20).
--
-- Décision du propriétaire : « Mets-le derrière un réglage, éteint par défaut,
-- que je pourrai allumer d'abord pour un seul compte d'essai, puis pour tous. »
--
-- Le code (`abonnementCarteOuvert`, lib/payments/abonnement-appli.ts) lit la
-- clé `abonnement_carte` :
--   absente ou vide          → ÉTEINT (le bouton ne s'affiche pas, la route
--                              d'abonnement répond 403 avant toute action) ;
--   une liste séparée par des virgules (identifiants de compte ou adresses
--                              courriel) → allumé pour ces comptes seuls ;
--   'tous'                   → allumé pour tous.
--
-- Ce fichier ajoute la clé, VIDE (éteint). L'allumer se fait ensuite, au nom du
-- propriétaire, par `regler_quota('abonnement_carte', '<courriel>', '<son nom>')`
-- — historisé comme les autres réglages. `regler_quota` n'est pas modifié : il
-- accepte toute clé présente dans la table.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, après
-- quota_lot_xaf.sql. Annulation : quota_abonnement_carte_annulation.sql.

begin;

alter table public.quota_reglages drop constraint if exists quota_reglages_cle_check;
alter table public.quota_reglages add constraint quota_reglages_cle_check check (cle in (
  'modifications_incluses', 'modifications_gratuites', 'duree_jours',
  'lot_taille', 'lot_prix_usd', 'prix_mensuel_xaf', 'lot_prix_xaf',
  'numero_airtel', 'numero_moov', 'motif_paiement', 'abonnement_carte'));

insert into public.quota_reglages (cle, valeur) values ('abonnement_carte', '') on conflict (cle) do nothing;

commit;
