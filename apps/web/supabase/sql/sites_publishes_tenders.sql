-- ============================================================
-- `sites.publishes_tenders` -- CE QUE L'ORGANISATION FAIT, pas ce qu'elle a
-- en ligne cette semaine.
--
-- Lot A2 d3. Une seule colonne, un seul booleen, fail-closed.
--
-- ------------------------------------------------------------
-- POURQUOI UNE COLONNE, ET PAS `hidden_sections`. MESURE DU 2026-11-06.
-- ------------------------------------------------------------
-- La question a ete posee par le proprietaire : un mecanisme de visibilite de
-- sections EXISTE deja, « c'est peut-etre exactement la meme decision, deja
-- outillee ». Mesure avant de repondre :
--
--   43 sites lus · `hidden_sections` VIDE sur 33
--   vocabulaire reellement employe : Services (10) · Gallery (10) · Reviews (10)
--   la liste proposee dans /edit est CODEE EN DUR (`components/Navbar.tsx`)
--
-- `hidden_sections` est FAIL-OPEN : `hidden('X')` n'est vrai que si X est
-- DANS la liste. Une cle `AppelsOffres` absente vaut « section AFFICHEE ».
-- Consequences :
--   * aujourd'hui, les 43 sites afficheraient le menu ;
--   * semer la cle dans les 42 autres serait un SQL de DONNEES -- l'allee et
--     venue qu'on voulait eviter revient quand meme ;
--   * et un site cree DEMAIN naitrait avec le menu affiche.
--
-- Une capacite declaree doit etre fail-CLOSED. `hidden_sections` repond a
-- « faut-il masquer une section que ce site A ? » : elle PRESUPPOSE la
-- capacite, elle ne peut pas la declarer.
--
-- CE QUI EST REPRIS DU DEPOT, EN REVANCHE : le patron d'appairage
-- capacite ET non-masquee, deja en place pour la boutique --
-- `{hasShop && !hidden('Shop') && …}` (EditorialTheme:137). Ce lot n'invente
-- donc aucun mecanisme : `hidden_sections` garde son role (masquer), cette
-- colonne porte le sien (declarer).
--
-- ET POURQUOI PAS COPIER `products.length > 0`, qui sert de capacite a la
-- boutique : pour un marchand, « a des produits » tient lieu de « vend des
-- choses ». Pour des marches publics, NON -- arbitrage du proprietaire :
-- « la CPA passe des marches meme la semaine ou elle n'en publie aucun ».
-- Copier la forme ici reproduirait la deduction exacte qui a ete rejetee.
--
-- ------------------------------------------------------------
-- LE NOM : `publishes_tenders`, AU PRESENT D'HABITUDE.
-- ------------------------------------------------------------
-- « Ce site publie des appels d'offres » n'est PAS « ce site a des avis en ce
-- moment ». La distinction est dans le nom, et elle gouverne deux regles
-- separees :
--   * le LIEN DE MENU suit cette colonne -- la page reste atteignable a zero
--     avis, et les autres sites n'ont rien ;
--   * la SECTION D'ACCUEIL suit les avis REELS -- rien du tout a zero (loi
--     A2 ③ : « une section d'accueil VIDE est pire qu'une section absente »).
-- Le menu dit ce que l'organisation FAIT ; la section montre ce qu'elle a
-- PUBLIE.
--
-- Anglais, comme le reste de `sites` (`published`, `archived_at`,
-- `hidden_sections`, `primary_color`) -- la coherence LOCALE de la table
-- l'emporte sur celle du depot pour un nom de colonne.
--
-- ------------------------------------------------------------
-- CE QUE CETTE COLONNE N'EST PAS.
-- ------------------------------------------------------------
--   * elle ne dit PAS « cet organisme est public ». Un groupe industriel
--     prive passe des marches ; une bibliotheque municipale n'en passe aucun.
--     Cette facette-la a deja une source, fragile : `site.type` lu PAR MOTS
--     dans `JsonLd.tsx` (`t.includes('etablissement public')`) -- GEN-D023,
--     83 % juste. Ne pas la confondre avec celle-ci ;
--   * elle ne dit PAS si des photos d'agence conviennent (GEN-D028 P4). Cette
--     question a une issue -- l'option B, « emplacement visiblement vide pour
--     tous » -- qui ne demande AUCUNE propriete.
--
-- Trois facettes, trois questions, une seule colonne neuve : celle qui n'a ni
-- source ni contournement.
--
-- REJOUABLE SANS DANGER : une seule instruction, `if not exists`, aucune
-- ecriture de donnee, aucun privilege touche, aucune policy, aucune vue.
-- ============================================================

-- ------------------------------------------------------------
-- 0/2 -- CONSTAT AVANT. A LIRE, PAS A CROIRE.
-- ------------------------------------------------------------
-- ATTENDU : colonne = 0, sites = 43.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'sites'
       and column_name = 'publishes_tenders')          as colonne,
  (select count(*) from public.sites)                  as sites;

-- ------------------------------------------------------------
-- 1/2 -- LA COLONNE
-- ------------------------------------------------------------
-- `not null default false` : FAIL-CLOSED. Un site existant, un site cree
-- demain, un site cree par un chemin qu'on n'a pas prevu -- aucun n'annonce
-- une capacite que son proprietaire n'a pas cochee. C'est la raison meme pour
-- laquelle `hidden_sections` ne pouvait pas porter cette declaration.
alter table public.sites
  add column if not exists publishes_tenders boolean not null default false;

comment on column public.sites.publishes_tenders is
  'Cet organisme passe des marches publics. Present d''habitude : vrai meme '
  'la semaine ou aucun avis n''est publie. Pilote le LIEN DE MENU ; la '
  'SECTION d''accueil, elle, suit les avis reels. Ne dit rien du caractere '
  'public de l''organisme ni des images autorisees -- voir le fichier.';

-- ------------------------------------------------------------
-- 2/2 -- CONSTAT APRES. A LIRE LIGNE PAR LIGNE.
-- ------------------------------------------------------------
-- ATTENDU : boolean · NO · false · 43 sites, et TOUS a false.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'sites'
  and column_name = 'publishes_tenders';

-- ATTENDU : total = 43 · declarants = 0.
-- Si `declarants` est > 0 juste apres la pose, la valeur par defaut n'est pas
-- celle qu'on croit -- ARRETER et relire.
select count(*) as total, count(*) filter (where publishes_tenders) as declarants
from public.sites;
