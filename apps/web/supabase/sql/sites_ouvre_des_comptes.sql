-- ============================================================================
-- LOT 11 — UN SITE DÉCLARE S'IL OUVRE DES COMPTES.
--
-- ── LE DÉFAUT QUE CETTE COLONNE EMPÊCHE.
--
-- Les écrans d'accès (`/connexion`, `/inscription`, `/mot-de-passe-oublie`,
-- `/espace-client`) sont des routes MOTEUR : écrites une fois, elles
-- existent sur LES 42 SITES. Un visiteur d'une boutique de fleurs pourrait
-- créer un accès et demander son « rattachement » — à un fleuriste qui n'a
-- jamais entendu parler de ça, et qui recevrait des demandes illisibles.
--
-- ── MÊME FORME QUE `publishes_tenders`, ET C'EST VOULU.
--
-- Booléen, `default false`, écrivable colonne par colonne. Inventer une
-- deuxième forme pour la même question — « ce site a-t-il telle
-- capacité ? » — donnerait deux façons de répondre, et c'est celle qu'on ne
-- regarde pas qui finit par mentir.
--
-- ── `false` PAR DÉFAUT : RIEN NE S'OUVRE TOUT SEUL.
--
-- Les 42 sites restent exactement comme ils sont. Un site n'ouvre ses
-- comptes que si quelqu'un l'a décidé, jamais parce qu'une migration est
-- passée.
--
-- ── CE FICHIER NE TOUCHE PAS À `sites_public`, ET C'EST DÉLIBÉRÉ.
--
-- Premier jet : il recréait la vue pour y ajouter la colonne. Pour cela il
-- fallait réécrire ses 48 colonnes ET sa clause `where` — que je n'avais pas
-- relue en base. Une vue recréée sur une définition périmée EFFACE en
-- silence tout ce qui a été ajouté entre-temps, pour les 42 sites à la fois.
-- Le gain ne valait pas ce risque : les quatre écrans lisent la capacité
-- côté serveur avec le rôle de service, qui voit la table directement.
-- ============================================================================

-- AVANT — l'état réel, pour pouvoir comparer après.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'sites'
       and column_name = 'ouvre_des_comptes')  as colonne_deja_la,
  (select count(*) from public.sites)          as sites;

alter table public.sites
  add column if not exists ouvre_des_comptes boolean not null default false;

comment on column public.sites.ouvre_des_comptes is
  'Ce site ouvre des comptes a des tiers (structures, fournisseurs). Pilote '
  'l''existence des ecrans /connexion, /inscription, /mot-de-passe-oublie et '
  '/espace-client, qui rendent 404 quand il est faux. Ne dit RIEN des droits '
  'accordes : un compte nait toujours en attente, et seul le proprietaire '
  'l''active.';

-- L'ÉCRITURE, COLONNE PAR COLONNE. `grant update (colonne)` et non
-- `grant update` : le propriétaire change cette capacité, il ne gagne pas le
-- droit de réécrire la table.
grant update (ouvre_des_comptes) on table public.sites to authenticated;

notify pgrst, 'reload schema';

-- APRÈS — la preuve, dans la même exécution.
select
  (select bool_or(column_name = 'ouvre_des_comptes')
     from information_schema.columns
     where table_schema = 'public' and table_name = 'sites')   as colonne_posee,
  (select count(*) from public.sites where ouvre_des_comptes)  as sites_ouverts;
