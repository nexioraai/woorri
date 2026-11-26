-- RETIRER LES ENCADRÉS D'ATTENTE DES PAGES COMMUNIQUÉS ET AGENDA DE LA CPA (2026-11-26).
--
-- Les deux encadrés « Cette page attend ses premiers communiqués / événements »
-- tenaient la place d'une liste qui n'existait pas. Le module Actualités montre
-- maintenant la vraie liste (et « Aucune publication pour l'instant. » tant
-- qu'elle est vide) : ils deviennent faux au premier communiqué publié.
-- SEULS ces deux blocs partent ; tous les autres blocs, leur ordre et leurs
-- textes restent identiques. Idempotent.
-- À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai.
-- Vérification : cpa_actualites_encadres_verification.sql.
-- Annulation : cpa_actualites_encadres_annulation.sql.

begin;

update public.site_pages p
   set blocs = (
         select coalesce(jsonb_agg(b order by i), '[]'::jsonb)
           from jsonb_array_elements(p.blocs) with ordinality as t(b, i)
          where not (b->>'type' = 'encadre' and b->>'titre' in ('Cette page attend ses premiers communiqués', 'Cette page attend ses premiers événements'))),
       maj_le = now()
 where p.site_id = (select id from public.sites where slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814')
   and p.chemin in ('actualites/communiques', 'actualites/evenements')
   and exists (select 1 from jsonb_array_elements(p.blocs) b
                where b->>'type' = 'encadre' and b->>'titre' like 'Cette page attend ses premiers%');

commit;
