-- ANNULATION de stripe_cycle_de_vie.sql : retire la fonction et le journal des
-- avis. Les lignes d'annulation déjà écrites au registre RESTENT (ajout seul) ;
-- une appli dépubliée le reste (on la republie au paiement suivant).
-- Sans la fonction, un remboursement ou une contestation d'appli rend 500 :
-- Stripe renvoie l'avis pendant 3 jours, puis abandonne.
begin;
drop function if exists public.annuler_paiement_stripe(text, text, numeric);
drop table if exists public.stripe_avis_traites;
notify pgrst, 'reload schema';
commit;
