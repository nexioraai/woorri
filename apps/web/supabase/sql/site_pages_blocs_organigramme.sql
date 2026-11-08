-- ============================================================================
-- LOT 4 — UN ORGANIGRAMME EST UN ARBRE, PAS UNE LISTE
--
-- POURQUOI UN DIX-SEPTIÈME TYPE. Mesuré avant d'écrire : la gouvernance de
-- la CPA est déjà décrite sur trois pages, en TABLEAUX. Ce qui manque n'est
-- pas l'information — c'est la forme : un tableau ne montre pas qui dépend
-- de qui.
--
-- Et aucun bloc existant ne porte de PROFONDEUR. Forcer un arbre dans une
-- liste produirait exactement le défaut relevé le 8 novembre sur le menu du
-- téléphone : trente entrées à plat, décalées par des tirets, au lieu d'une
-- hiérarchie.
--
-- LA PROFONDEUR EST BORNÉE À QUATRE NIVEAUX. Conseil d'administration →
-- direction générale → directions → services. Au-delà, un organigramme ne
-- se lit plus sur un téléphone, et personne ne le consulte.
--
-- LE JSON RESTE PLAT. Chaque entrée porte son `parent`, exactement comme
-- `site_pages` : un arbre imbriqué en JSON ne se valide pas en SQL sans
-- récursion, et une contrainte qu'on ne peut pas écrire simplement est une
-- contrainte qu'on écrit mal.
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
               'image','galerie','citation','articles',
               'organigramme'   -- LOT 4 : un arbre de fonctions
             )
     );
$$;

revoke all on function public.site_pages_blocs_valides(jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';
