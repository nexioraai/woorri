-- LOT 4b — LA PHOTO, LA GALERIE ET LA CITATION ENTRENT AU VOCABULAIRE.
--
-- Le proprietaire l'a dit a l'ecran : des pages sans image restent pauvres,
-- quelle que soit la qualite du texte. EPSS illustre chaque page de rubrique.
--
-- `alt` est EXIGE cote lecture (blocs.ts) : une image sans texte de
-- remplacement est invisible aux lecteurs d'ecran, et la page vise WCAG 2.2 AA.
-- La base, elle, ne garde que le vocabulaire : une seule verite par niveau.
create or replace function public.site_pages_blocs_valides(b jsonb)
returns boolean language sql immutable set search_path = public, pg_temp as $$
  select jsonb_typeof(b) = 'array'
     and jsonb_array_length(b) <= 120
     and not exists (
       select 1 from jsonb_array_elements(b) as e
       where jsonb_typeof(e) <> 'object'
          or jsonb_typeof(e -> 'type') is distinct from 'string'
          or (e ->> 'type') not in (
               'titre','texte','liste','etapes','frise','chiffres','tableau',
               'documents','questions','encadre','liens','appel',
               'image','galerie','citation'
             )
     );
$$;

revoke all on function public.site_pages_blocs_valides(jsonb) from public, anon, authenticated;
notify pgrst, 'reload schema';
