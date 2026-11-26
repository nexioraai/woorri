-- SEUL LE SERVEUR PUBLIE OU DÉPUBLIE UN SITE (2026-11-26).
--
-- LA FAILLE. `lot_g_final_field_level_authorization.sql` a donné au rôle
-- `authenticated` (le navigateur du propriétaire) le droit `UPDATE (published)`
-- sur `sites`. Le propriétaire pouvait donc mettre son site EN LIGNE sans
-- payer, par un simple appel PostgREST depuis son navigateur.
--
-- LA CORRECTION. Le droit est retiré à `authenticated`, `anon` et `public`.
-- Publier ou dépublier passe uniquement par le serveur (`service_role`) :
-- paiement par carte (webhook Stripe), paiement mobile money
-- (enregistrer_paiement_site), administrateur (site-publish-override).
-- Les autres colonnes éditables ne changent pas.
--
-- ORDRE OBLIGATOIRE : à appliquer APRÈS le déploiement du code qui retire
-- `published` de la sauvegarde du navigateur (SITE_FORBIDDEN_CLIENT_FIELDS,
-- src/lib/supabase-owned-site.ts). Avant ce code, la sauvegarde automatique
-- de l'éditeur (Navbar) renvoie toutes les colonnes, `published` compris, et
-- serait refusée EN ENTIER.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai.
-- Vérification : sites_publication_serveur_verification.sql.
-- Annulation : sites_publication_serveur_annulation.sql.

begin;

revoke update (published) on table public.sites from public, anon, authenticated;

commit;
