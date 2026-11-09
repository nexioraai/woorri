-- ============================================================================
-- LOT 15.13 — LES PARTENAIRES SONT UNE SECTION DE L'ACCUEIL.
--
-- ── CE QUI ÉTAIT MAL PLACÉ.
--
-- Le lot 15.5 en avait fait un BLOC de page, posé sur `/qui-sommes-nous`.
-- Mesuré à l'écran par le propriétaire le 2026-11-09 : personne ne descend
-- une sous-page pour voir avec qui travaille la Centrale. Sur EPSS, la
-- section est sur l'ACCUEIL, juste avant le pied — c'est là qu'on la
-- rencontre sans la chercher.
--
-- ── POURQUOI UNE COLONNE, ET PAS UN BLOC DÉPLACÉ.
--
-- L'accueil n'est pas une page déclarée : c'est le THÈME. Et un thème est
-- SYNCHRONE — il ne peut pas lire la base. Les sections de l'accueil
-- (galerie, équipe, témoignages, FAQ) sont toutes des colonnes de `sites` ;
-- les partenaires en deviennent une, par la même porte que les autres.
--
-- ── `[]` PAR DÉFAUT : AUCUN DES 42 SITES NE GAGNE UNE SECTION.
--
-- Une section qui apparaîtrait sur quarante et un sites parce qu'une
-- migration est passée serait un changement que personne n'a demandé.
--
-- ── ET LE BLOC RESTE.
--
-- `site_pages_blocs` connaît toujours `partenaires` : un site qui veut une
-- liste de partenaires au milieu d'une sous-page le peut encore. La colonne
-- sert l'ACCUEIL ; le bloc sert les pages. Deux endroits, deux usages, et
-- aucun des deux ne remplace l'autre.
-- ============================================================================

-- AVANT — l'état réel, pour pouvoir comparer après.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'sites'
       and column_name = 'partenaires') as colonne_deja_la,
  (select count(*) from public.sites)   as sites;

alter table public.sites
  add column if not exists partenaires jsonb not null default '[]'::jsonb;

comment on column public.sites.partenaires is
  'Les partenaires affiches sur l''ACCUEIL, juste avant Contact. Tableau '
  'd''objets {nom, logo?, url?}. `nom` seul suffit : sans logo le monogramme '
  'tient la tuile. Vide par defaut : aucun des 42 sites ne gagne une section '
  'parce qu''une migration est passee.';

-- L'ÉCRITURE, COLONNE PAR COLONNE. Le propriétaire modifie ses partenaires,
-- il ne gagne pas le droit de réécrire la table.
grant update (partenaires) on table public.sites to authenticated;

notify pgrst, 'reload schema';

-- APRÈS — la preuve, dans la même exécution.
select
  (select bool_or(column_name = 'partenaires') from information_schema.columns
     where table_schema = 'public' and table_name = 'sites')          as colonne_posee,
  (select count(*) from public.sites
     where jsonb_array_length(partenaires) > 0)                       as sites_avec_partenaires;
