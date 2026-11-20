-- ANNULATION de quota_lot_xaf.sql : remet quota_modifications.sql tel quel
-- (rejouer ce fichier rétablit les deux fonctions d'origine), puis retire la clé.
-- À n'employer qu'avant tout paiement de lot en FCFA.
begin;
delete from public.quota_reglages where cle = 'lot_prix_xaf';
-- Puis rejouer supabase/sql/quota_modifications.sql (idempotent) pour les fonctions.
commit;
