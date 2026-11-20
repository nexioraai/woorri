-- ANNULATION de comptes_stripe.sql — avant que le code ne s'en serve seulement.
-- Les fiches Stripe elles-mêmes restent chez Stripe : seule la correspondance part.
begin;
drop table if exists public.comptes_stripe;
commit;
