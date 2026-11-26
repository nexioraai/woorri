-- ANNULATION de cpa_actualites_encadres.sql : les deux encadrés reviennent, au même rang (3e bloc), texte identique.
begin;
update public.site_pages p
   set blocs = jsonb_insert(p.blocs, '{2}', '{"ton": "info", "type": "encadre", "texte": "Les communiqués sont publiés par la Centrale depuis l''espace d''édition. Aucun n''est inventé ici : une annonce fausse sur un site d''établissement public est plus grave qu''une page vide.", "titre": "Cette page attend ses premiers communiqués"}'::jsonb),
       maj_le = now()
 where p.site_id = (select id from public.sites where slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814')
   and p.chemin = 'actualites/communiques'
   and not exists (select 1 from jsonb_array_elements(p.blocs) b where b->>'titre' = 'Cette page attend ses premiers communiqués');
update public.site_pages p
   set blocs = jsonb_insert(p.blocs, '{2}', '{"ton": "info", "type": "encadre", "texte": "Les événements sont publiés par la Centrale depuis l''espace d''édition.", "titre": "Cette page attend ses premiers événements"}'::jsonb),
       maj_le = now()
 where p.site_id = (select id from public.sites where slug = 'centrale-pharmaceutique-d-achats-cpa-1793979506814')
   and p.chemin = 'actualites/evenements'
   and not exists (select 1 from jsonb_array_elements(p.blocs) b where b->>'titre' = 'Cette page attend ses premiers événements');
commit;
