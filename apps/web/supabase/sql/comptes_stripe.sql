-- UN CLIENT STRIPE PAR COMPTE DERIBFY — pour les applications (décision 7A, 2026-11-20).
--
-- MESURÉ le 2026-11-19 : `api/checkout` crée un client Stripe par SITE, sans
-- chercher celui qui existe (6 fiches pour le propriétaire). Les applis, elles,
-- naissent avec UNE fiche par compte, retrouvée avant d'en créer une. Les sites
-- et les domaines gardent leur fonctionnement : on ne touche pas à un paiement
-- qui marche (le reprendre est une décision à part).
--
-- Personne d'autre que la clé de service. Idempotent.
-- À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai / main, AVANT le code qui l'emploie.
-- Annulation : comptes_stripe_annulation.sql.

begin;

create table if not exists public.comptes_stripe (
  owner_id     uuid primary key,
  customer_id  text not null unique check (customer_id like 'cus_%'),
  cree_le      timestamptz not null default now()
);

alter table public.comptes_stripe enable row level security;
revoke all on public.comptes_stripe from anon, authenticated, public;
grant select, insert on public.comptes_stripe to service_role;

commit;
