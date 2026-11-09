-- ============================================================================
-- LOT 4 — LE CORPS D'UNE PAGE DEVIENT STRUCTURÉ
--
-- CE FICHIER EST LA SEULE VÉRITÉ DU VOCABULAIRE. Les fichiers `..._images.sql`
-- et suivants sont des MIGRATIONS à exécuter ; celui-ci décrit l'état COURANT,
-- et c'est lui que lit le cliquet `blocsDePage.test.tsx`. Tout ajout de type
-- se fait ICI en plus de sa migration, sinon le cliquet rougit.
--
-- LE DÉFAUT, MESURÉ. Une page déclarée ne savait rendre qu'UN bloc de texte
-- brut (`[...rest]/page.tsx`, whiteSpace: pre-wrap). Mesuré sur les 30 pages
-- de la CPA : corps moyen 242 caractères, et aucun moyen de faire mieux —
-- pas de sous-titre, pas de liste, pas de tableau, pas de frise, pas de
-- chiffres clés, pas de document à télécharger.
--
-- Mesuré sur epss.gov.et/epss/about/history, le modèle retenu : 12 titres,
-- 8 paragraphes, 6 listes, 5 repères de frise, 3 blocs de chiffres,
-- 2 boutons d'action, 1 bloc de contact. Notre moteur savait faire 1 des 7.
--
-- LE VOCABULAIRE EST FERMÉ, ET C'EST LE POINT DE SÉCURITÉ. Un corps libre en
-- HTML rendrait `dangerouslySetInnerHTML` inévitable et transformerait
-- l'éditeur d'un client en console d'injection. Ici la base REFUSE un type
-- inconnu : l'interdiction reste une IMPOSSIBILITÉ, pas une consigne.
--
-- Le `default '[]'` fait que les 30 pages existantes et les 41 autres sites
-- restent valides sans migration de données.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. LE VOCABULAIRE, EN UNE SEULE DÉFINITION
--    `immutable` est exigé pour qu'une CHECK puisse l'appeler.
-- ---------------------------------------------------------------------------
create or replace function public.site_pages_blocs_valides(b jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_typeof(b) = 'array'
     and jsonb_array_length(b) <= 120
     and not exists (
       select 1
       from jsonb_array_elements(b) as e
       where jsonb_typeof(e) <> 'object'
          or jsonb_typeof(e -> 'type') is distinct from 'string'
          or (e ->> 'type') not in (
               'titre',      -- un sous-titre de section
               'texte',      -- un paragraphe
               'liste',      -- une liste à puces
               'etapes',     -- une marche à suivre numérotée
               'frise',      -- des repères datés
               'chiffres',   -- des chiffres clés
               'tableau',    -- un tableau en-têtes + lignes
               'documents',  -- des pièces à télécharger
               'questions',  -- des questions dépliables
               'encadre',    -- un encadré d'avertissement
               'liens',      -- des pages liées
               'appel',      -- un bouton d'action
               'image',      -- une photo, avec son texte de remplacement
               'galerie',    -- plusieurs photos
               'citation',   -- une citation attribuée
               'articles',   -- LOT 7 : la liste d'une catégorie d'articles
               'organigramme', -- LOT 4 : un arbre de fonctions
               'partenaires'  -- LOT 15.5 : avec qui l'organisation travaille
             )
     );
$$;

-- PostgreSQL accorde EXECUTE a PUBLIC par defaut sur toute fonction neuve.
-- Le patron maison l'annule et ne re-accorde rien : cette fonction n'est
-- appelee que par la CHECK, jamais par un client. Le cliquet
-- `rpcVersioning.test.ts` exige ce REVOKE sur les TROIS roles.
revoke all on function public.site_pages_blocs_valides(jsonb) from public, anon, authenticated;

comment on function public.site_pages_blocs_valides(jsonb) is
  'LOT 4 — le vocabulaire FERMÉ du corps structuré. Tout type hors liste est refusé par la base, pas par le code.';

-- ---------------------------------------------------------------------------
-- 2. LA COLONNE
-- ---------------------------------------------------------------------------
alter table public.site_pages
  add column if not exists blocs jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_pages_blocs_chk') then
    alter table public.site_pages
      add constraint site_pages_blocs_chk
      check (public.site_pages_blocs_valides(blocs));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_pages_blocs_taille_chk') then
    alter table public.site_pages
      add constraint site_pages_blocs_taille_chk
      check (pg_column_size(blocs) <= 200000);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. LA VUE PUBLIQUE — `blocs` s'ajoute EN FIN de liste, ce qui autorise le
--    `create or replace` sans supprimer la vue (et donc sans perdre ses droits).
--    `security_invoker = false` est REPOSÉ : `pg_get_viewdef` ne montre pas les
--    options `with`, et une relecture seule ferait croire qu'elles survivent.
-- ---------------------------------------------------------------------------
create or replace view public.site_pages_public
with (security_invoker = false) as
select p.id, p.site_id, s.slug as site_slug, p.chemin, p.parent, p.titre,
       p.chapeau, p.corps, p.ordre, p.menu, p.cree_le, p.maj_le,
       p.blocs
from public.site_pages p
join public.sites_public s on s.id = p.site_id
where p.publie = true;

revoke all    on public.site_pages_public from anon, authenticated;
grant  select on public.site_pages_public to   anon, authenticated;

notify pgrst, 'reload schema';
