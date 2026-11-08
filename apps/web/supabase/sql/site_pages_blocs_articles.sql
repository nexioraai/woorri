-- ============================================================================
-- LOT 7 — UN BLOC QUI LISTE LES ARTICLES D'UNE CATÉGORIE
--
-- POURQUOI UN BLOC ET PAS UN CAS PARTICULIER. `/actualites/communiques` doit
-- afficher les communiqués. Le câbler sur ce CHEMIN ne servirait que la CPA :
-- le site suivant nommera sa page autrement et n'aura rien. Un bloc sert les
-- 42 sites, et il se pose depuis l'éditeur comme les quatorze autres.
--
-- IL NE PORTE AUCUN CONTENU. Un bloc « articles » ne stocke pas d'articles :
-- il dit QUELLE catégorie montrer. Le fonds reste dans `site_blog_posts`, et
-- il n'y a toujours qu'UN endroit où écrire un article. Dupliquer le contenu
-- dans le bloc recréerait les deux éditeurs payés le 7 novembre.
--
-- `articles` REJOINT LE VOCABULAIRE EXISTANT. Ce fichier remplace la fonction
-- entière plutôt que d'ajouter à côté : une liste de types répartie sur
-- plusieurs fichiers finit par diverger, et c'est celle qu'on ne relit pas
-- qui accepte le mot de trop.
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
               'image','galerie','citation',
               'articles'   -- LOT 7 : la liste d'une catégorie d'articles
             )
     );
$$;

revoke all on function public.site_pages_blocs_valides(jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';
