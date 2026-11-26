-- UNE DEMANDE MOBILE MONEY DE SITE POINTE UN SITE QUI EXISTE (2026-11-26).
--
-- `mm_demandes.site_id` (mobile_money_demandes_sites.sql, n° 8) n'avait pas de
-- clé étrangère : une demande pouvait viser un site inexistant. La clé est
-- ajoutée SANS suppression en cascade : un site n'est jamais supprimé dans
-- Deribfy (archivé par archive_sites_if_no_blocking_orders), et l'historique
-- des paiements ne doit jamais disparaître avec lui — même règle que
-- `site_paiements.site_id`.
--
-- Si une demande existante pointe un site inexistant, l'ajout échoue et RIEN
-- n'est changé (une seule transaction) : envoie-moi le message.
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS n° 8.
-- Vérification : mobile_money_demandes_site_cle_verification.sql.
-- Annulation : mobile_money_demandes_site_cle_annulation.sql.

begin;

alter table public.mm_demandes drop constraint if exists mm_demandes_site_id_fkey;
alter table public.mm_demandes add constraint mm_demandes_site_id_fkey
  foreign key (site_id) references public.sites(id);

commit;
