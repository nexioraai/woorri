-- ============================================================================
-- LOT 7 — LES ARTICLES ONT UNE CATÉGORIE
--
-- CE LOT N'ÉCRIT PAS UN DEUXIÈME SYSTÈME D'ACTUALITÉS. Le moteur en a déjà
-- un, complet et servi : `site_blog_posts`, sa vue publique, ses écrans
-- `/blog` et `/blog/[post]`, et ses tests. Mesuré : `/blog` répond 200 sur
-- cpa-tchad.deribfy.app.
--
-- En construire un second serait refaire le piège des DEUX ÉDITEURS payé le
-- 7 novembre : deux endroits qui promettent la même chose, et le client qui
-- ne peut pas deviner lequel prendre. Il a créé une page dans le mauvais et
-- ne l'a jamais vue.
--
-- LE VRAI MANQUE, MESURÉ : aucune catégorie. Une centrale d'achats publie
-- des COMMUNIQUÉS (rappel de lot, changement de calendrier) et des
-- ÉVÉNEMENTS (rencontre fournisseurs, journée qualité). Tout arrive
-- aujourd'hui dans le même tas, et on ne peut pas servir `/actualites/
-- communiques` sans mélanger les deux.
--
-- LE VOCABULAIRE EST FERMÉ, comme pour les blocs : la base refuse une
-- catégorie inconnue. Une catégorie libre deviendrait vingt orthographes de
-- « communiqué », et le filtre d'écran n'en trouverait aucune.
--
-- `article` EST LE DÉFAUT, et c'est ce qui protège les 41 autres sites : un
-- marchand garde son blog sans rien changer, une centrale a ses communiqués.
-- Même moteur, même éditeur, une vue filtrée en plus.
-- ============================================================================

alter table public.site_blog_posts
  add column if not exists categorie text not null default 'article';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_blog_posts_categorie_chk') then
    alter table public.site_blog_posts
      add constraint site_blog_posts_categorie_chk
      check (categorie in ('article', 'communique', 'evenement'));
  end if;
end $$;

comment on column public.site_blog_posts.categorie is
  'LOT 7 — vocabulaire FERMÉ. « article » est le défaut : les sites existants ne changent pas.';

-- L'index qui porte le tri réellement employé par l'écran : les articles
-- d'une catégorie, du plus récent au plus ancien. Sans lui, chaque page
-- d'actualités balaierait tout le fonds du site.
create index if not exists site_blog_posts_categorie_idx
  on public.site_blog_posts (site_id, categorie, published_at desc);

-- La vue publique : `categorie` s'ajoute EN FIN de liste, ce qui autorise le
-- `create or replace` sans supprimer la vue — donc sans perdre ses droits.
-- `security_invoker = false` est REPOSÉ : `pg_get_viewdef` ne montre pas les
-- options `with`, et s'y fier ferait croire qu'elles survivent au replace.
create or replace view public.site_blog_posts_public
with (security_invoker = false) as
select
  p.id, p.site_id, s.slug as site_slug, p.slug, p.title, p.excerpt, p.content,
  p.cover_image, p.published_at, p.updated_at,
  p.categorie
from public.site_blog_posts p
join public.sites_public s on s.id = p.site_id
where p.published = true
  and p.published_at is not null
  and p.published_at <= now();

revoke all    on public.site_blog_posts_public from anon, authenticated;
grant  select on public.site_blog_posts_public to   anon, authenticated;

notify pgrst, 'reload schema';
