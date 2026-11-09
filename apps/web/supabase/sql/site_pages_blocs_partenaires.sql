-- ============================================================================
-- LOT 15.5 — LE BANDEAU DES PARTENAIRES
--
-- EPSS affiche ses partenaires en bas de page : ministères, OMS, USAID.
-- Pour une centrale d'achats publique, dire avec qui l'on travaille est une
-- information, pas une décoration.
--
-- LE LOGO EST FACULTATIF, et c'est le point. Sans fichier, c'est le NOM qui
-- s'affiche dans une tuile : le bandeau fonctionne dès le premier jour, et
-- la Centrale téléverse ses logos quand elle les a. Exiger un logo aurait
-- rendu le bloc inutilisable jusqu'à ce que quelqu'un trouve les fichiers --
-- c'est-à-dire jamais.
--
-- LE NOM EST OBLIGATOIRE. Un logo sans nom est illisible au lecteur d'écran
-- et indéchiffrable pour qui ne connaît pas l'organisation.
-- ============================================================================

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
               'image','galerie','citation','articles','organigramme',
               'partenaires'   -- LOT 15.5 : avec qui l'organisation travaille
             )
     );
$$;

revoke all on function public.site_pages_blocs_valides(jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';
