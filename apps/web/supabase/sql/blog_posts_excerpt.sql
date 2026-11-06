-- ============================================================
-- `blog_posts.excerpt` -- UNE COLONNE AJOUTEE PAR ERREUR QUI A REPARE UN
-- DEFAUT REEL. GEN-D033.
--
-- Applique a la main dans l'editeur SQL Supabase le 2026-11-06. Ce fichier
-- est ecrit APRES coup, et il existe surtout pour dire la VERITE sur un
-- geste qui, sans lui, passerait pour une amelioration deliberee.
--
-- ------------------------------------------------------------
-- RECTIFICATION DATEE DU 2026-11-06 -- JE ME SUIS TROMPE DE TABLE.
-- ------------------------------------------------------------
-- Je voulais ajouter des colonnes au blog MULTI-TENANT des sites clients.
-- J'ai fait appliquer mon SQL a `blog_posts`, qui est le blog de la
-- PLATEFORME Deribfy. Le diagnostic etait faux de bout en bout : la table
-- visee etait `site_blog_posts`, et la mesure du 2026-11-06 montre qu'elle
-- portait DEJA les douze colonnes voulues, `excerpt` comprise, depuis
-- `site_blog_posts.sql`. Il n'y avait rien a y ajouter.
--
-- CINQ COLONNES ont ete posees sur `blog_posts` ce jour-la. QUATRE ont ete
-- retirees le meme jour, sans laisser de trace : `site_slug`, `site_id`,
-- `published_at`, `updated_at`. Elles n'appartenaient pas a cette table --
-- le blog de la plateforme n'a aucune notion de site. Mesure apres retrait :
-- `blog_posts` porte 8 colonnes (id, title, slug, content, cover_image,
-- published, created_at, excerpt).
--
-- `excerpt` A ETE GARDEE, et ce fichier explique pourquoi ce n'etait pas
-- une indulgence.
--
-- ------------------------------------------------------------
-- CE QUE CETTE COLONNE REPARE, ET QUE PERSONNE NE MESURAIT.
-- ------------------------------------------------------------
-- `src/app/blog/[slug]/page.tsx:23` fait une PROJECTION ETROITE :
--
--     .select("title, excerpt, content, cover_image")
--
-- MESURE DU 2026-11-06 : PostgREST rend `42703` sur une colonne inexistante.
-- Il ne la rend pas nulle -- IL REFUSE LA REQUETE ENTIERE. Verifie en
-- nommant une colonne inventee sur cette table meme.
--
-- Donc tant que `excerpt` n'existait pas, `article` valait `null`, et
-- `generateMetadata` renvoyait pour CHAQUE article publie :
--     title  : « Article introuvable — Deribfy »
--     robots : { index: false, follow: false }
--
-- Le CORPS de la page, lui, fait son propre `select("*")` : l'article
-- s'affichait normalement. Un article lisible dont l'en-tete declarait
-- qu'il n'existait pas, et qui demandait aux moteurs de ne pas l'indexer.
--
-- MESURE A L'ECRAN, 2026-11-06, apres l'ajout :
--   https://www.deribfy.com/blog/creer-un-site-dropshipping-rapidement
--   HTTP 200 · <title>Creer un site dropshipping rapidement : le guide
--   complet pour entrepreneurs — Blog Deribfy</title> · robots: index,
--   follow · 0 occurrence de `noindex`.
--
-- CE QUE JE NE PEUX PAS PROUVER : l'etat d'AVANT. Je n'ai aucune
-- observation de l'ecran anterieure a l'ajout. Le mecanisme (`42703`) est
-- MESURE ; l'etat d'avant en est DEDUIT. La distinction reste ecrite ici
-- plutot que lissee.
--
-- ------------------------------------------------------------
-- POURQUOI LA COLONNE RESTE NULLABLE, ET SANS VALEUR PAR DEFAUT.
-- ------------------------------------------------------------
-- La page a un repli en cascade : `excerpt ?? content`, puis une borne a
-- 157 caracteres. Une valeur par defaut vide romprait ce repli -- une chaine
-- vide n'est pas `null`, elle produirait une description VIDE la ou le
-- contenu sait en fournir une. Mesure du 2026-11-06 : `excerpt` est `null`
-- sur les 2 articles publies, et les deux pages ont une description issue du
-- contenu.
--
-- REJOUABLE SANS DANGER : une seule instruction, `if not exists`, aucune
-- ecriture de donnee, aucun privilege touche, aucune policy. La lecture
-- publique de cette table est reglee par `blog_posts_public_read.sql` et
-- n'est pas modifiee ici.
--
-- CE QUE CE FICHIER N'EST PAS :
--   * `site_blog_posts.sql` -- blog MULTI-TENANT des sites clients, rattache
--     par `site_id`, lecture publique par vue. C'est la table que je visais ;
--   * un correctif de la CLASSE. Rien ne compare encore les colonnes nommees
--     dans un `.select()` aux colonnes reelles de la base. Un `42703` ne
--     casse pas l'ecran : il vide une variable, et un repli le masque.
--     `contextResolvesRealColumns.test.ts` le fait pour UNE route. Voir
--     GEN-D033, classe laissee OUVERTE.
-- ============================================================

alter table public.blog_posts
  add column if not exists excerpt text;

-- ------------------------------------------------------------
-- CONSTAT. A LIRE, PAS A CROIRE.
-- ------------------------------------------------------------
-- ATTENDU : 8 colonnes, et `excerpt` presente, nullable, sans defaut.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'blog_posts'
order by ordinal_position;

-- ATTENDU : AUCUNE LIGNE. Les quatre colonnes retirees le 2026-11-06 ne
-- doivent pas revenir : elles importaient une notion de SITE dans le blog de
-- la plateforme, qui n'en a pas.
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'blog_posts'
  and column_name in ('site_id', 'site_slug', 'published_at', 'updated_at');
